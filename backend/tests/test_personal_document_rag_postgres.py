"""Consent ordering on the real migrated PostgreSQL schema, using synthetic documents.

Events pause processing at observable boundaries; pg_blocking_pids proves that a
competing transaction actually waits. No timing-only race assertion substitutes
for a database lock, and no model or document reader is contacted.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
import uuid
from collections.abc import Callable, Iterator
from concurrent.futures import Future, ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from threading import Event, Lock

import pytest
from postgres_support import postgres_required, psycopg_url
from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from core import workflow_models as M
from services import consent_ledger, embeddings
from services import personal_document_rag as rag

PURPOSE = "DOCUMENT_AI_ANALYSIS"
PASSAGE = "Synthetic document passage about the fixture's testing procedure."
WAIT_SECONDS = 10
PAUSE_SECONDS = 30
BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def migrated_engine() -> Iterator[Engine]:
    """Owned scratch database; failed migrations are cleaned up as well as tests."""
    raw_url = next((os.environ[name] for name in ("DATABASE_URL", "TEST_DATABASE_URL")
                    if os.environ.get(name, "").startswith("postgresql")), None)
    if raw_url is None:
        if postgres_required():
            pytest.fail("REQUIRE_POSTGRES=1 but no PostgreSQL test URL is configured")
        pytest.skip("needs a live PostgreSQL server with pgvector")
    server_url = psycopg_url(raw_url)
    admin = create_engine(server_url, isolation_level="AUTOCOMMIT", poolclass=NullPool,
                          connect_args={"connect_timeout": 5})
    try:
        with admin.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        admin.dispose()
        if postgres_required():
            pytest.fail(f"REQUIRE_POSTGRES=1 but PostgreSQL is unreachable: {type(exc).__name__}")
        pytest.skip("no reachable PostgreSQL test server")
    name = f"rag_consent_{uuid.uuid4().hex[:12]}"
    created = False
    engine = None
    try:
        with admin.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{name}"'))  # noqa: S608 — owned UUID name
        created = True
        database_url = server_url.set(database=name)
        environment = {**os.environ, "APP_ENV": "testing", "PYTHONPATH": str(BACKEND),
                       "PYTHONDONTWRITEBYTECODE": "1", "OTEL_SDK_DISABLED": "true",
                       "DATABASE_URL": database_url.render_as_string(hide_password=False)}
        migration = subprocess.run(
            [sys.executable, "-m", "alembic", "-c", "config/alembic.ini", "upgrade", "head"],
            cwd=BACKEND, env=environment, capture_output=True, text=True, timeout=300,
            check=False, encoding="utf-8", errors="replace",  # noqa: S603 — fixed migration command
        )
        assert migration.returncode == 0, migration.stdout + migration.stderr
        engine = create_engine(database_url, poolclass=NullPool,
                               isolation_level="READ COMMITTED", connect_args={"connect_timeout": 5})
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")) == "vector"
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        try:
            if created:
                with admin.connect() as connection:
                    connection.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))  # noqa: S608 — owned UUID name
        finally:
            admin.dispose()


@pytest.fixture(autouse=True)
def local_embeddings(monkeypatch):
    local = embeddings.LocalHashingEmbedder()
    monkeypatch.setattr(embeddings, "active_embedder", lambda: local)
    monkeypatch.setattr(embeddings, "local_embedder", lambda: local)


@contextmanager
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine, autoflush=False, expire_on_commit=False) as db:
        # A broken locking implementation must fail instead of hanging CI.
        db.execute(text("SET LOCAL lock_timeout = '15s'"))
        db.execute(text("SET LOCAL statement_timeout = '30s'"))
        yield db


def document(account_id: str, document_id: str) -> M.Document:
    return M.Document(id=document_id, account_id=account_id, title="Synthetic fixture",
                      category="other", filename="fixture.txt", mime_type="text/plain",
                      content=b"Synthetic fixture only", created_at=time.time())


def seed(engine: Engine, *, preferences: bool = True) -> tuple[str, str]:
    account_id, document_id = uuid.uuid4().hex, uuid.uuid4().hex
    with session(engine) as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                         full_name="Synthetic Fixture", role="STUDENT", active=True,
                         profile={}, created_at=time.time()))
        db.flush()
        db.add(document(account_id, document_id))
        db.flush()
        if preferences:
            consent_ledger.set_optional(db, account_id, account_id, PURPOSE, True)
        db.commit()
    return account_id, document_id


def index_now(engine: Engine, owner: tuple[str, str], passage: str = PASSAGE) -> None:
    account_id, document_id = owner
    with session(engine) as db:
        assert rag.index_document(db, document_id, account_id, passage) == 1
        db.commit()


def change_now(engine: Engine, account_id: str, granted: bool) -> None:
    with session(engine) as db:
        consent_ledger.set_optional(db, account_id, account_id, PURPOSE, granted)
        db.commit()


def assert_revoked(engine: Engine, owner: tuple[str, str]) -> None:
    account_id, document_id = owner
    with session(engine) as db:
        assert db.scalar(select(M.NotificationPreference.document_ai_analysis_enabled)
                         .where(M.NotificationPreference.account_id == account_id)) is False
        assert db.scalars(select(M.PersonalDocumentChunk)
                          .where(M.PersonalDocumentChunk.account_id == account_id)).all() == []
        assert db.get(M.Document, document_id) is not None
        records = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.account_id == account_id)).all()
        assert not any(row.purposes == [PURPOSE] and not row.withdrawn_at for row in records)
        assert rag.search(db, account_id, PASSAGE) == []


def wait(event: Event) -> None:
    assert event.wait(WAIT_SECONDS), "worker did not reach the expected processing boundary"


def wait_for_blocker(engine: Engine, blocked: int, blocker: int, operation: Future) -> None:
    deadline = time.monotonic() + WAIT_SECONDS
    tick = Event()
    with engine.connect() as observer:
        while time.monotonic() < deadline:
            blockers = observer.scalar(text("SELECT pg_blocking_pids(:pid)"), {"pid": blocked})
            if blocker in blockers:
                return
            if operation.done():
                operation.result()  # propagate a worker failure rather than hiding it
                pytest.fail("competing transaction finished without waiting for the consent transaction")
            tick.wait(0.02)  # polling cadence; the assertion is PostgreSQL's observed blocker
    pytest.fail("PostgreSQL did not report the expected competing consent transaction")


def pause_index(monkeypatch, entered: Event, release: Event) -> None:
    original = rag._embed_all

    def paused(chunks: list[str]):
        entered.set()
        assert release.wait(PAUSE_SECONDS), "indexing fixture was not released"
        return original(chunks)

    monkeypatch.setattr(rag, "_embed_all", paused)


def pause_search(monkeypatch, entered: Callable[[], None], release: Event) -> None:
    local = embeddings.local_embedder()

    class PausedEmbedder:
        name = local.name
        dimensions = local.dimensions

        def embed(self, query: str) -> list[float]:
            entered()
            assert release.wait(PAUSE_SECONDS), "search fixture was not released"
            return local.embed(query)

    monkeypatch.setattr(embeddings, "active_embedder", PausedEmbedder)


def test_indexing_first_keeps_withdrawal_waiting_until_index_commit(migrated_engine, monkeypatch):
    owner = seed(migrated_engine)
    entered, release, withdrawing = Event(), Event(), Event()
    pids = {}
    pause_index(monkeypatch, entered, release)

    def index():
        with session(migrated_engine) as db:
            pids["index"] = db.scalar(text("SELECT pg_backend_pid()"))
            count = rag.index_document(db, owner[1], owner[0], PASSAGE)
            db.commit()
            return count

    def withdraw():
        with session(migrated_engine) as db:
            pids["withdraw"] = db.scalar(text("SELECT pg_backend_pid()"))
            withdrawing.set()
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, False)
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as workers:
        indexed = workers.submit(index)
        try:
            wait(entered)
            withdrawn = workers.submit(withdraw)
            wait(withdrawing)
            wait_for_blocker(migrated_engine, pids["withdraw"], pids["index"], withdrawn)
        finally:
            release.set()
        assert indexed.result(timeout=WAIT_SECONDS) == 1
        withdrawn.result(timeout=WAIT_SECONDS)
    assert_revoked(migrated_engine, owner)


@pytest.mark.parametrize("processing", ["index", "search"])
def test_stale_preloaded_grant_cannot_authorize_processing(migrated_engine, processing):
    owner = seed(migrated_engine)
    with session(migrated_engine) as cached:
        preference = cached.get(M.NotificationPreference, owner[0])
        assert preference.document_ai_analysis_enabled is True
        change_now(migrated_engine, owner[0], False)
        # Simulate a historical late commit: the retrieval gate must independently deny it.
        with session(migrated_engine) as writer:
            local = embeddings.local_embedder()
            writer.add(M.PersonalDocumentChunk(id=uuid.uuid4().hex, document_id=owner[1],
                                               account_id=owner[0], ordinal=0, content=PASSAGE,
                                               embedder=local.name, vector=local.embed(PASSAGE),
                                               created_at=time.time()))
            writer.commit()
        assert preference.document_ai_analysis_enabled is True  # retained ORM identity is stale
        if processing == "index":
            assert rag.index_document(cached, owner[1], owner[0], PASSAGE) == 0
            cached.commit()
        else:
            assert rag.search(cached, owner[0], PASSAGE) == []


@pytest.mark.parametrize("processing", ["index", "search"])
def test_withdrawal_first_denies_waiting_processing(migrated_engine, processing):
    owner = seed(migrated_engine)
    index_now(migrated_engine, owner)
    revoked, release, starting = Event(), Event(), Event()
    pids = {}

    def withdraw():
        with session(migrated_engine) as db:
            pids["withdraw"] = db.scalar(text("SELECT pg_backend_pid()"))
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, False)
            revoked.set()
            assert release.wait(PAUSE_SECONDS)
            db.commit()

    def process():
        with session(migrated_engine) as db:
            pids["process"] = db.scalar(text("SELECT pg_backend_pid()"))
            starting.set()
            result = (rag.index_document(db, owner[1], owner[0], PASSAGE) if processing == "index"
                      else rag.search(db, owner[0], PASSAGE))
            db.commit()
            return result

    with ThreadPoolExecutor(max_workers=2) as workers:
        withdrawal = workers.submit(withdraw)
        try:
            wait(revoked)
            operation = workers.submit(process)
            wait(starting)
            wait_for_blocker(migrated_engine, pids["process"], pids["withdraw"], operation)
        finally:
            release.set()
        withdrawal.result(timeout=WAIT_SECONDS)
        assert operation.result(timeout=WAIT_SECONDS) == (0 if processing == "index" else [])
    assert_revoked(migrated_engine, owner)


def test_search_first_can_finish_before_withdrawal(migrated_engine, monkeypatch):
    owner = seed(migrated_engine)
    index_now(migrated_engine, owner)
    reading, release, withdrawing = Event(), Event(), Event()
    pids = {}
    pause_search(monkeypatch, reading.set, release)

    def search():
        with session(migrated_engine) as db:
            pids["search"] = db.scalar(text("SELECT pg_backend_pid()"))
            passages = rag.search(db, owner[0], PASSAGE)
            db.commit()
            return passages

    def withdraw():
        with session(migrated_engine) as db:
            pids["withdraw"] = db.scalar(text("SELECT pg_backend_pid()"))
            withdrawing.set()
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, False)
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as workers:
        search_result = workers.submit(search)
        try:
            wait(reading)
            withdrawal = workers.submit(withdraw)
            wait(withdrawing)
            wait_for_blocker(migrated_engine, pids["withdraw"], pids["search"], withdrawal)
        finally:
            release.set()
        assert [row["content"] for row in search_result.result(timeout=WAIT_SECONDS)] == [PASSAGE]
        withdrawal.result(timeout=WAIT_SECONDS)
    assert_revoked(migrated_engine, owner)


def test_two_searches_can_read_concurrently(migrated_engine, monkeypatch):
    owner = seed(migrated_engine)
    index_now(migrated_engine, owner)
    first, second, release = Event(), Event(), Event()
    counter_lock = Lock()

    def reading():
        with counter_lock:
            (second if first.is_set() else first).set()

    pause_search(monkeypatch, reading, release)

    def search():
        with session(migrated_engine) as db:
            return rag.search(db, owner[0], PASSAGE)

    with ThreadPoolExecutor(max_workers=2) as workers:
        results = [workers.submit(search) for _ in range(2)]
        try:
            wait(first)
            wait(second)
        finally:
            release.set()
        assert all([row["content"] for row in result.result(timeout=WAIT_SECONDS)] == [PASSAGE]
                   for result in results)


def test_upload_foreign_key_lock_does_not_deadlock_with_withdrawal(migrated_engine, monkeypatch):
    owner = seed(migrated_engine)
    uploaded, withdrawing, index_requested, release = Event(), Event(), Event(), Event()
    pids = {}
    upload_id = uuid.uuid4().hex
    original = consent_ledger.clear_document_ai_chunks

    def paused_clear(db, account_id):
        withdrawing.set()
        assert release.wait(PAUSE_SECONDS)
        return original(db, account_id)

    monkeypatch.setattr(consent_ledger, "clear_document_ai_chunks", paused_clear)

    def upload():
        with session(migrated_engine) as db:
            pids["upload"] = db.scalar(text("SELECT pg_backend_pid()"))
            db.add(document(owner[0], upload_id))
            db.flush()  # PostgreSQL now holds the document FK's key-share account lock.
            uploaded.set()
            assert index_requested.wait(PAUSE_SECONDS)
            result = rag.index_document(db, upload_id, owner[0], PASSAGE)
            db.commit()
            return result

    def withdraw():
        with session(migrated_engine) as db:
            pids["withdraw"] = db.scalar(text("SELECT pg_backend_pid()"))
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, False)
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as workers:
        upload_result = workers.submit(upload)
        try:
            wait(uploaded)
            withdrawal = workers.submit(withdraw)
            # A FOR UPDATE account lock would wait here on the upload FK, creating
            # a cycle once the upload tries to index. The writer must reach this boundary.
            wait(withdrawing)
            index_requested.set()
            wait_for_blocker(migrated_engine, pids["upload"], pids["withdraw"], upload_result)
        finally:
            index_requested.set()
            release.set()
        withdrawal.result(timeout=WAIT_SECONDS)
        assert upload_result.result(timeout=WAIT_SECONDS) == 0
    assert_revoked(migrated_engine, owner)


def test_another_account_can_index_while_first_account_is_processing(migrated_engine, monkeypatch):
    owner, other = seed(migrated_engine), seed(migrated_engine)
    entered, release = Event(), Event()
    original = rag._embed_all

    def paused(chunks: list[str]):
        if chunks == [PASSAGE]:
            entered.set()
            assert release.wait(PAUSE_SECONDS)
        return original(chunks)

    monkeypatch.setattr(rag, "_embed_all", paused)

    def index():
        with session(migrated_engine) as db:
            count = rag.index_document(db, owner[1], owner[0], PASSAGE)
            db.commit()
            return count

    with ThreadPoolExecutor(max_workers=1) as workers:
        indexed = workers.submit(index)
        try:
            wait(entered)
            index_now(migrated_engine, other, PASSAGE + " Independent account.")
        finally:
            release.set()
        assert indexed.result(timeout=WAIT_SECONDS) == 1


def test_regrant_does_not_resurrect_deleted_passages(migrated_engine):
    owner = seed(migrated_engine)
    index_now(migrated_engine, owner)
    change_now(migrated_engine, owner[0], False)
    assert_revoked(migrated_engine, owner)
    change_now(migrated_engine, owner[0], True)
    with session(migrated_engine) as db:
        assert rag.search(db, owner[0], PASSAGE) == []
    replacement = PASSAGE + " Explicitly reindexed version."
    index_now(migrated_engine, owner, replacement)
    with session(migrated_engine) as db:
        assert [row["content"] for row in rag.search(db, owner[0], replacement)] == [replacement]


@pytest.mark.parametrize("first_granted", [True, False])
def test_missing_preferences_grant_and_withdrawal_are_ordered(migrated_engine, first_granted):
    owner = seed(migrated_engine, preferences=False)
    changed, release, starting = Event(), Event(), Event()
    pids = {}

    def first():
        with session(migrated_engine) as db:
            pids["first"] = db.scalar(text("SELECT pg_backend_pid()"))
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, first_granted)
            db.flush()
            changed.set()
            assert release.wait(PAUSE_SECONDS)
            db.commit()

    def second():
        with session(migrated_engine) as db:
            assert db.get(M.NotificationPreference, owner[0]) is None  # first insert is uncommitted
            pids["second"] = db.scalar(text("SELECT pg_backend_pid()"))
            starting.set()
            consent_ledger.set_optional(db, owner[0], owner[0], PURPOSE, not first_granted)
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as workers:
        first_change = workers.submit(first)
        try:
            wait(changed)
            second_change = workers.submit(second)
            wait(starting)
            wait_for_blocker(migrated_engine, pids["second"], pids["first"], second_change)
        finally:
            release.set()
        first_change.result(timeout=WAIT_SECONDS)
        second_change.result(timeout=WAIT_SECONDS)
    with session(migrated_engine) as db:
        preferences = db.scalars(select(M.NotificationPreference)
                                 .where(M.NotificationPreference.account_id == owner[0])).all()
        assert len(preferences) == 1
        assert preferences[0].document_ai_analysis_enabled is (not first_granted)
        records = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.account_id == owner[0])).all()
        active = [row for row in records if row.purposes == [PURPOSE] and not row.withdrawn_at]
        assert len(active) == (0 if first_granted else 1)
        assert db.scalars(select(M.PersonalDocumentChunk)
                          .where(M.PersonalDocumentChunk.account_id == owner[0])).all() == []
