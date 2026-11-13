"""Personal-document consent gates, ownership and atomic withdrawal.

SQLite verifies service/API behavior here; real PostgreSQL tests separately
exercise transaction lock ordering. Service sessions deliberately disable
autoflush and retain cached objects, matching the production failure modes.
"""
import time
import uuid

import pytest
from sqlalchemy import create_engine, delete, event, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from test_workflow_api import harness, register

from core import workflow_models as M
from services import consent_ledger, embeddings, personal_document_rag, workflow_api
from services.db_sql import Base

OWNER = "rag-owner"
OTHER = "rag-other"
OWNER_DOCUMENT = "rag-owner-document"
OTHER_DOCUMENT = "rag-other-document"
PURPOSE = "DOCUMENT_AI_ANALYSIS"
QUESTION = "What does my report say?"
TEXT = "This synthetic report says observations were recorded at the visit."
FILE_CONTENT = b"synthetic document bytes"


def _account(account_id):
    return M.Account(
        id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
        full_name="Synthetic account", role="STUDENT", active=True,
        profile={}, created_at=time.time(),
    )


def _document(document_id, account_id):
    return M.Document(
        id=document_id, account_id=account_id, title="Synthetic report",
        category="LAB", filename="synthetic.pdf", mime_type="application/pdf",
        content=FILE_CONTENT, created_at=time.time(),
    )


def _seed_chunk(db, document_id=OWNER_DOCUMENT, account_id=OWNER):
    embedder = embeddings.local_embedder()
    db.add(M.PersonalDocumentChunk(
        id=uuid.uuid4().hex, document_id=document_id, account_id=account_id,
        ordinal=0, content=TEXT, embedder=embedder.name,
        vector=embedder.embed(QUESTION), created_at=time.time(),
    ))


def _change(factory, granted, account_id=OWNER):
    with factory() as db:
        consent_ledger.set_optional(db, account_id, account_id, PURPOSE, granted)
        db.commit()


def _chunk_rows(db, account_id=OWNER):
    return list(db.scalars(
        select(M.PersonalDocumentChunk).where(M.PersonalDocumentChunk.account_id == account_id)
    ).all())


def _consent_rows(db, account_id=OWNER):
    return [
        row for row in db.scalars(
            select(M.ConsentRecord).where(M.ConsentRecord.account_id == account_id)
        ).all()
        if row.purposes == [PURPOSE]
    ]


def _forbid_embedding(monkeypatch):
    def forbidden():
        pytest.fail("Consent denial must happen before embedding")
    monkeypatch.setattr(embeddings, "active_embedder", forbidden)


def _stub_extraction(monkeypatch):
    calls = []

    def extract(content, title, category, mime_type, preread=None):
        calls.append((content, title, category, mime_type))
        return {
            "draft": {
                "title": title, "category": category,
                "read": {"reader": "synthetic", "state": "OK"},
            },
            "fields": [], "text": TEXT,
        }

    monkeypatch.setattr(workflow_api, "extract_fields", extract)
    return calls


@pytest.fixture
def service_factory(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'rag.sqlite').as_posix()}")

    @event.listens_for(engine, "connect")
    def enforce_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(embeddings, "active_embedder", embeddings.local_embedder)
    with factory() as db:
        db.add_all([_account(OWNER), _account(OTHER)])
        db.flush()
        db.add_all([
            _document(OWNER_DOCUMENT, OWNER),
            _document(OTHER_DOCUMENT, OTHER),
            M.NotificationPreference(account_id=OWNER, document_ai_analysis_enabled=False),
            M.NotificationPreference(account_id=OTHER, document_ai_analysis_enabled=False),
        ])
        db.commit()
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.mark.parametrize("state", ["missing", "off", "on"])
def test_consent_requires_an_explicit_stored_grant(service_factory, state):
    if state == "on":
        _change(service_factory, True)
    elif state == "missing":
        with service_factory() as db:
            db.execute(delete(M.NotificationPreference).where(
                M.NotificationPreference.account_id == OWNER,
            ))
            db.commit()
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is (state == "on")
        assert personal_document_rag.consent_given(db, "missing-account") is False


@pytest.mark.parametrize("state", ["missing", "off"])
def test_search_denies_before_loading_passages_or_embedding(service_factory, monkeypatch, state):
    with service_factory() as db:
        _seed_chunk(db)
        if state == "missing":
            db.execute(delete(M.NotificationPreference).where(
                M.NotificationPreference.account_id == OWNER,
            ))
        db.commit()
    _forbid_embedding(monkeypatch)
    engine = service_factory.kw["bind"]

    def forbid_passage_select(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("SELECT") and "care_personal_document_chunks" in statement:
            pytest.fail("Denied retrieval must not load document passages")

    event.listen(engine, "before_cursor_execute", forbid_passage_select)
    try:
        with service_factory() as db:
            assert personal_document_rag.search(db, OWNER, QUESTION) == []
    finally:
        event.remove(engine, "before_cursor_execute", forbid_passage_select)


@pytest.mark.parametrize("state", ["missing", "off"])
def test_denied_index_clears_only_owned_stale_passages_without_embedding(
    service_factory, monkeypatch, state,
):
    with service_factory() as db:
        _seed_chunk(db)
        _seed_chunk(db, OTHER_DOCUMENT, OTHER)
        if state == "missing":
            db.execute(delete(M.NotificationPreference).where(
                M.NotificationPreference.account_id == OWNER,
            ))
        db.commit()
    _forbid_embedding(monkeypatch)
    with service_factory() as db:
        assert personal_document_rag.index_document(db, OWNER_DOCUMENT, OWNER, TEXT) == 0
        db.commit()
    with service_factory() as db:
        assert _chunk_rows(db) == []
        assert len(_chunk_rows(db, OTHER)) == 1
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT


@pytest.mark.parametrize("account_id,document_id", [
    (OWNER, "missing-document"),
    (OWNER, OTHER_DOCUMENT),
    ("missing-account", OWNER_DOCUMENT),
])
def test_unowned_or_missing_document_cannot_replace_any_passages(
    service_factory, monkeypatch, account_id, document_id,
):
    _change(service_factory, True)
    _change(service_factory, True, OTHER)
    with service_factory() as db:
        _seed_chunk(db)
        _seed_chunk(db, OTHER_DOCUMENT, OTHER)
        db.commit()
    _forbid_embedding(monkeypatch)
    with service_factory() as db:
        assert personal_document_rag.index_document(db, document_id, account_id, TEXT) == 0
        db.commit()
    with service_factory() as db:
        assert len(_chunk_rows(db)) == 1
        assert len(_chunk_rows(db, OTHER)) == 1


def test_index_and_search_isolate_accounts_and_reindex_without_duplicates(service_factory):
    _change(service_factory, True)
    _change(service_factory, True, OTHER)
    with service_factory() as db:
        assert personal_document_rag.index_document(db, OWNER_DOCUMENT, OWNER, TEXT) == 1
        assert personal_document_rag.index_document(db, OTHER_DOCUMENT, OTHER, TEXT) == 1
        db.commit()
    replacement = f"{TEXT} Replacement wording."
    with service_factory() as db:
        assert personal_document_rag.index_document(db, OWNER_DOCUMENT, OWNER, replacement) == 1
        db.commit()
    with service_factory() as db:
        results = personal_document_rag.search(db, OWNER, replacement)
        assert {item["documentId"] for item in results} == {OWNER_DOCUMENT}
        assert results[0]["content"] == replacement
        assert len(_chunk_rows(db)) == 1
        other_results = personal_document_rag.search(db, OTHER, TEXT)
        assert {item["documentId"] for item in other_results} == {OTHER_DOCUMENT}
        assert other_results[0]["content"] == TEXT


def test_empty_reindex_removes_old_passages_and_empty_search_never_embeds(
    service_factory, monkeypatch,
):
    _change(service_factory, True)
    with service_factory() as db:
        _seed_chunk(db)
        db.commit()
    _forbid_embedding(monkeypatch)
    with service_factory() as db:
        assert personal_document_rag.index_document(db, OWNER_DOCUMENT, OWNER, "") == 0
        assert personal_document_rag.search(db, OWNER, "   ") == []
        db.commit()
    with service_factory() as db:
        assert _chunk_rows(db) == []


def test_search_and_gate_ignore_a_cached_grant_after_withdrawal(service_factory, monkeypatch):
    _change(service_factory, True)
    with service_factory() as stale:
        cached = stale.get(M.NotificationPreference, OWNER)
        assert cached.document_ai_analysis_enabled is True
        _change(service_factory, False)
        # Reproduce legacy/late-commit leftovers independently of the fixed writer.
        with service_factory() as db:
            _seed_chunk(db)
            db.commit()
        assert cached.document_ai_analysis_enabled is True
        _forbid_embedding(monkeypatch)
        assert personal_document_rag.consent_given(stale, OWNER) is False
        assert personal_document_rag.search(stale, OWNER, QUESTION) == []


def test_index_ignores_a_cached_grant_after_withdrawal(service_factory, monkeypatch):
    _change(service_factory, True)
    with service_factory() as stale:
        cached = stale.get(M.NotificationPreference, OWNER)
        _change(service_factory, False)
        assert cached.document_ai_analysis_enabled is True
        _forbid_embedding(monkeypatch)
        assert personal_document_rag.index_document(stale, OWNER_DOCUMENT, OWNER, TEXT) == 0
        stale.commit()
    with service_factory() as db:
        assert _chunk_rows(db) == []


@pytest.mark.parametrize("cached_state,current_state", [(False, True), (True, False)])
def test_consent_write_persists_even_when_cached_object_already_has_requested_value(
    service_factory, cached_state, current_state,
):
    _change(service_factory, cached_state)
    with service_factory() as stale:
        cached = stale.get(M.NotificationPreference, OWNER)
        assert cached.document_ai_analysis_enabled is cached_state
        _change(service_factory, current_state)
        assert cached.document_ai_analysis_enabled is cached_state
        consent_ledger.set_optional(stale, OWNER, OWNER, PURPOSE, cached_state)
        stale.commit()
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is cached_state
        assert bool([row for row in _consent_rows(db) if not row.withdrawn_at]) is cached_state


def test_regrant_refreshes_a_cached_ledger_and_preserves_withdrawn_record(service_factory):
    _change(service_factory, True)
    with service_factory() as stale:
        old = _consent_rows(stale)[0]
        old_id = old.id
        assert old.withdrawn_at == 0
        _change(service_factory, False)
        assert old.withdrawn_at == 0
        consent_ledger.set_optional(stale, OWNER, OWNER, PURPOSE, True)
        stale.commit()
    with service_factory() as db:
        rows = _consent_rows(db)
        assert len(rows) == 2
        old = next(row for row in rows if row.id == old_id)
        active = [row for row in rows if not row.withdrawn_at]
        assert old.withdrawn_at > 0
        assert len(active) == 1
        assert active[0].id != old_id


def test_withdrawal_is_idempotent_preserves_documents_and_other_account_and_audits(
    service_factory,
):
    _change(service_factory, True)
    _change(service_factory, True, OTHER)
    with service_factory() as db:
        _seed_chunk(db)
        _seed_chunk(db, OTHER_DOCUMENT, OTHER)
        db.commit()
    _change(service_factory, False)
    _change(service_factory, False)
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is False
        assert personal_document_rag.consent_given(db, OTHER) is True
        assert _chunk_rows(db) == []
        assert len(_chunk_rows(db, OTHER)) == 1
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT
        assert db.get(M.Document, OTHER_DOCUMENT).content == FILE_CONTENT
        rows = _consent_rows(db)
        assert len(rows) == 1 and rows[0].withdrawn_at > 0
        actions = list(db.scalars(
            select(M.WorkflowAudit.action).where(M.WorkflowAudit.actor_id == OWNER)
        ).all())
        assert actions.count(f"CONSENT_GIVEN_{PURPOSE}") == 1
        assert actions.count(f"CONSENT_WITHDRAWN_{PURPOSE}") == 1
        assert actions.count("DOCUMENT_AI_ANALYSIS_CLEARED") == 1


def test_regrant_creates_a_new_ledger_record_without_resurrecting_chunks(service_factory):
    _change(service_factory, True)
    with service_factory() as db:
        _seed_chunk(db)
        db.commit()
    _change(service_factory, False)
    _change(service_factory, True)
    with service_factory() as db:
        rows = _consent_rows(db)
        assert len(rows) == 2
        assert sum(not row.withdrawn_at for row in rows) == 1
        assert sum(bool(row.withdrawn_at) for row in rows) == 1
        assert personal_document_rag.consent_given(db, OWNER) is True
        assert _chunk_rows(db) == []
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT


def test_consent_and_cleanup_service_does_not_commit_before_caller(service_factory):
    _change(service_factory, True)
    with service_factory() as db:
        _seed_chunk(db)
        db.commit()
    with service_factory() as pending:
        consent_ledger.set_optional(pending, OWNER, OWNER, PURPOSE, False)
        with service_factory() as observer:
            assert personal_document_rag.consent_given(observer, OWNER) is True
            assert len(_chunk_rows(observer)) == 1
        pending.rollback()
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is True
        assert len(_chunk_rows(db)) == 1
        assert _consent_rows(db)[0].withdrawn_at == 0


def test_index_does_not_commit_or_publish_chunks_before_caller(service_factory):
    _change(service_factory, True)
    with service_factory() as pending:
        assert personal_document_rag.index_document(pending, OWNER_DOCUMENT, OWNER, TEXT) == 1
        pending.flush()
        with service_factory() as observer:
            assert _chunk_rows(observer) == []
        pending.rollback()
    with service_factory() as db:
        assert _chunk_rows(db) == []
        assert personal_document_rag.consent_given(db, OWNER) is True


def test_withdrawal_clears_pending_index_chunks_in_the_same_transaction(service_factory):
    _change(service_factory, True)
    with service_factory() as pending:
        ledger_id = _consent_rows(pending)[0].id
        assert personal_document_rag.index_document(pending, OWNER_DOCUMENT, OWNER, TEXT) == 1
        # No flush between indexing and withdrawal: production disables autoflush.
        assert any(isinstance(row, M.PersonalDocumentChunk) for row in pending.new)
        assert _chunk_rows(pending) == []
        consent_ledger.set_optional(pending, OWNER, OWNER, PURPOSE, False)
        pending.commit()
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is False
        assert _chunk_rows(db) == []
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT
        rows = _consent_rows(db)
        assert len(rows) == 1
        assert rows[0].id == ledger_id and rows[0].withdrawn_at > 0


def test_cleanup_failure_rolls_back_flag_passages_and_ledger_together(service_factory):
    _change(service_factory, True)
    with service_factory() as db:
        _seed_chunk(db)
        db.commit()
    engine = service_factory.kw["bind"]

    def fail_cleanup(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("DELETE") and "care_personal_document_chunks" in statement:
            raise OperationalError("synthetic cleanup failure", {}, RuntimeError("unavailable"))

    event.listen(engine, "before_cursor_execute", fail_cleanup)
    try:
        with service_factory() as db:
            with pytest.raises(OperationalError):
                consent_ledger.set_optional(db, OWNER, OWNER, PURPOSE, False)
            db.rollback()
    finally:
        event.remove(engine, "before_cursor_execute", fail_cleanup)
    with service_factory() as db:
        assert personal_document_rag.consent_given(db, OWNER) is True
        assert len(_chunk_rows(db)) == 1
        assert _consent_rows(db)[0].withdrawn_at == 0
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT


@pytest.mark.parametrize("operation", ["search", "index"])
def test_consent_lookup_failure_propagates_before_embedding(service_factory, monkeypatch, operation):
    _change(service_factory, True)
    engine = service_factory.kw["bind"]
    _forbid_embedding(monkeypatch)

    def fail_consent_select(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("SELECT") and "care_notification_preferences" in statement:
            raise OperationalError("synthetic consent lookup failure", {}, RuntimeError("unavailable"))

    event.listen(engine, "before_cursor_execute", fail_consent_select)
    try:
        with service_factory() as db:
            with pytest.raises(OperationalError):
                if operation == "search":
                    personal_document_rag.search(db, OWNER, QUESTION)
                else:
                    personal_document_rag.index_document(db, OWNER_DOCUMENT, OWNER, TEXT)
            db.rollback()
    finally:
        event.remove(engine, "before_cursor_execute", fail_consent_select)
    with service_factory() as db:
        assert _chunk_rows(db) == []


def test_privacy_api_withdrawal_clears_index_and_preserves_source_file(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "rag-api-owner@example.test")
    granted = client.post(
        f"/api/privacy/consents/{PURPOSE}", json={"granted": True}, headers=headers,
    )
    assert granted.status_code == 200, granted.text
    with factory() as db:
        db.add(_document(OWNER_DOCUMENT, user["id"]))
        db.flush()
        _seed_chunk(db, OWNER_DOCUMENT, user["id"])
        db.commit()
    withdrawn = client.post(
        f"/api/privacy/consents/{PURPOSE}", json={"granted": False}, headers=headers,
    )
    assert withdrawn.status_code == 200, withdrawn.text
    item = next(item for item in withdrawn.json()["optional"] if item["purpose"] == PURPOSE)
    assert item["on"] is False and item["withdrawnAt"]
    with factory() as db:
        assert _chunk_rows(db, user["id"]) == []
        assert db.get(M.Document, OWNER_DOCUMENT).content == FILE_CONTENT


@pytest.mark.parametrize("granted", [True, False])
def test_upload_api_indexes_owned_flushed_document_only_with_consent(harness, monkeypatch, granted):
    client, factory, codes = harness
    user, headers = register(client, codes, f"rag-api-upload-{granted}@example.test")
    consent = client.post(
        f"/api/privacy/consents/{PURPOSE}", json={"granted": granted}, headers=headers,
    )
    assert consent.status_code == 200, consent.text
    calls = _stub_extraction(monkeypatch)
    monkeypatch.setattr(workflow_api, "scan_file_for_viruses", lambda content, **kwargs: None)
    if granted:
        monkeypatch.setattr(embeddings, "active_embedder", embeddings.local_embedder)
    else:
        _forbid_embedding(monkeypatch)
    uploaded_content = b"%PDF-1.4\nsynthetic"
    response = client.post(
        "/api/health/documents", headers=headers,
        data={"title": "Synthetic report", "category": "LAB"},
        files={"file": ("synthetic.pdf", uploaded_content, "application/pdf")},
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert calls == [(uploaded_content, "Synthetic report", "LAB", "application/pdf")]
    with factory() as db:
        document = db.get(M.Document, result["id"])
        assert document.account_id == user["id"] and document.content == uploaded_content
        intake = db.get(M.DocumentIntake, result["intakeId"])
        assert intake.document_id == document.id and intake.account_id == user["id"]
        assert intake.status == "DRAFT" and intake.draft["draft"]["read"]["state"] == "OK"
        chunks = _chunk_rows(db, user["id"])
        assert len(chunks) == int(granted)
        if granted:
            assert chunks[0].document_id == document.id and chunks[0].content == TEXT


@pytest.mark.parametrize("granted", [True, False])
def test_process_intake_api_indexes_owned_document_only_with_consent(harness, monkeypatch, granted):
    client, factory, codes = harness
    user, headers = register(client, codes, f"rag-api-process-{granted}@example.test")
    consent = client.post(
        f"/api/privacy/consents/{PURPOSE}", json={"granted": granted}, headers=headers,
    )
    assert consent.status_code == 200, consent.text
    with factory() as db:
        db.add(_document(OWNER_DOCUMENT, user["id"]))
        db.commit()
        assert db.scalar(select(M.DocumentIntake).where(
            M.DocumentIntake.document_id == OWNER_DOCUMENT,
        )) is None
    calls = _stub_extraction(monkeypatch)
    if granted:
        monkeypatch.setattr(embeddings, "active_embedder", embeddings.local_embedder)
    else:
        _forbid_embedding(monkeypatch)
    response = client.post(f"/api/intake/{OWNER_DOCUMENT}/process", headers=headers)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "DRAFT" and result["fields"] == []
    assert calls == [(FILE_CONTENT, "Synthetic report", "LAB", "application/pdf")]
    with factory() as db:
        document = db.get(M.Document, OWNER_DOCUMENT)
        assert document.account_id == user["id"] and document.content == FILE_CONTENT
        intake = db.get(M.DocumentIntake, result["id"])
        assert intake.document_id == document.id and intake.account_id == user["id"]
        assert intake.status == "DRAFT" and intake.draft["draft"]["read"]["state"] == "OK"
        chunks = _chunk_rows(db, user["id"])
        assert len(chunks) == int(granted)
        if granted:
            assert chunks[0].document_id == document.id and chunks[0].content == TEXT


def test_ayush_api_refuses_revoked_consent_even_if_legacy_chunks_remain(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "rag-api-revoked@example.test")
    for granted in (True, False):
        response = client.post(
            f"/api/privacy/consents/{PURPOSE}", json={"granted": granted}, headers=headers,
        )
        assert response.status_code == 200, response.text
    with factory() as db:
        db.add(_document(OWNER_DOCUMENT, user["id"]))
        db.flush()
        _seed_chunk(db, OWNER_DOCUMENT, user["id"])
        db.commit()
    response = client.post(
        "/api/agents/ayush/ask", json={"question": QUESTION}, headers=headers,
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["outcome"] == "REFUSED_PERSONAL"
    assert result["answered"] is False and result["citations"] == []
    assert TEXT not in response.text and OWNER_DOCUMENT not in response.text


def test_ayush_api_refuses_when_consent_lookup_fails(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rag-api-unavailable@example.test")
    engine = factory.kw["bind"]

    def fail_consent_select(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("SELECT") and "care_notification_preferences" in statement:
            raise OperationalError("synthetic consent lookup failure", {}, RuntimeError("unavailable"))

    event.listen(engine, "before_cursor_execute", fail_consent_select)
    try:
        response = client.post(
            "/api/agents/ayush/ask", json={"question": QUESTION}, headers=headers,
        )
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["outcome"] == "REFUSED_PERSONAL"
        assert result["answered"] is False and result["citations"] == []
        assert "synthetic consent lookup failure" not in response.text
    finally:
        event.remove(engine, "before_cursor_execute", fail_consent_select)
