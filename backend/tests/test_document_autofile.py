"""Auto-filing of uploaded health records (docs/plans/tier1-document-autofile-2026-11-13.md)."""
import io
import time

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from test_workflow_api import harness, login, register  # noqa: F401 - harness is a fixture

from core import workflow_models as M
from services import document_classifier as classifier
from services import document_filing, document_ocr, workflow_api
from services.integration_config import INTEGRATIONS_DB

PDF = "application/pdf"
PNG = "image/png"
LONG_TEXT = "Complete blood count: hemoglobin 13.2 g/dL, platelet count normal. 12/05/2026"


# --- the classifier (pure) ---------------------------------------------------------

def test_file_name_decides_before_any_text():
    result = classifier.classify("cbc_report.pdf", "this is a discharge summary")
    assert (result.category, result.kind, result.source) == ("LAB", "blood", "filename")


def test_text_is_read_only_when_the_name_says_nothing():
    result = classifier.classify("IMG_0042.jpg", "Vaccination record: covishield dose 2")
    assert (result.category, result.kind, result.source) == ("VACCINE", "card", "ocr")


@pytest.mark.parametrize("text", ["the label says keep cool", "no beds available", "pyrexia of unknown origin",
                                  "read the report overleaf", "a bill is attached"])
def test_body_text_never_matches_short_or_ambiguous_tokens(text):
    assert not classifier.classify("IMG_0042.jpg", text).matched


@pytest.mark.parametrize("name", ["collaboration.pdf", "october.pdf", "techo.png", "Scan 12 Nov.pdf"])
def test_short_tokens_need_word_boundaries_in_a_file_name(name):
    assert not classifier.classify_file_name(name).matched


def test_separators_and_accents_normalise_identically():
    assert classifier.normalise_file_name("Rx-2026_Nov.pdf") == classifier.normalise_file_name("rx 2026 nov.pdf")
    assert classifier.normalise_file_name("Résumé__LAB.PDF") == "resume lab"
    assert classifier.classify_file_name("Rx-2026_Nov.pdf").kind == "prescription"


def test_camp_report_is_not_claimed_by_the_generic_report_rule():
    result = classifier.classify_file_name("camp_report.pdf")
    assert (result.category, result.kind) == ("CAMP_REPORT", "camp_report")


def test_a_stored_correction_wins_over_the_rules():
    result = classifier.classify("cbc_report.pdf", "", learned=("LAB", "urine"))
    assert (result.kind, result.source) == ("urine", "learned")


def test_a_suggestion_for_another_category_never_moves_the_record():
    suggestion = classifier.classify_file_name("prescription.pdf")
    assert classifier.kind_for("LAB", suggestion) == classifier.UNFILED
    assert classifier.kind_for("PRESCRIPTION", suggestion) == "prescription"


def test_every_rule_points_at_a_declared_kind():
    for rule in classifier.RULES:
        assert rule.kind in classifier.KINDS[rule.category]


# --- the reader --------------------------------------------------------------------

def _reader_on(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB, "document_ocr", {"enabled": True, "engine": "axiss-ocr",
                                                          "url": "http://ocr.test/ocr", "api_key": "sk-only-key",
                                                          "text_layers": "auto"})


def _png(width=40, height=20) -> bytes:
    from PIL import Image

    out = io.BytesIO()
    Image.new("RGB", (width, height), "white").save(out, format="PNG")
    return out.getvalue()


def test_reader_is_off_by_default_and_sends_nothing(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB, "document_ocr", {"enabled": False, "url": "http://ocr.test/ocr",
                                                          "api_key": "k"})
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("the service must not be called"))
    with pytest.raises(document_ocr.ReaderUnavailable) as raised:
        document_ocr.read_document(_png(), PNG)
    assert raised.value.state == document_ocr.NOT_CONFIGURED


def test_no_key_means_nothing_is_sent(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB, "document_ocr", {"enabled": True, "url": "http://ocr.test/ocr",
                                                          "api_key": ""})
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("the service must not be called"))
    assert document_ocr.status()["state"] == document_ocr.UNAVAILABLE
    with pytest.raises(document_ocr.ReaderUnavailable):
        document_ocr.read_document(_png(), PNG)


def test_a_pdf_with_its_own_text_is_never_sent(monkeypatch):
    _reader_on(monkeypatch)
    monkeypatch.setattr(document_ocr, "embedded_pdf_text",
                        lambda content: (LONG_TEXT, document_ocr.Attempt(document_ocr.ENGINE_PDF_TEXT, ok=True)))
    monkeypatch.setattr(httpx, "post", lambda *a, **k: pytest.fail("the service must not be called"))
    result = document_ocr.read_document(b"%PDF-1.4", PDF)
    assert (result.text, result.engine) == (LONG_TEXT, document_ocr.ENGINE_PDF_TEXT)


def test_the_service_gets_the_key_and_a_generic_file_name(monkeypatch):
    _reader_on(monkeypatch)
    seen = {}

    def post(url, **kwargs):
        seen.update(url=url, **kwargs)
        return httpx.Response(200, json={"engine": "rapidocr", "pages": 1, "text": LONG_TEXT})

    monkeypatch.setattr(httpx, "post", post)
    result = document_ocr.read_document(_png(), PNG)
    assert result.text == LONG_TEXT and result.engine == document_ocr.ENGINE_SERVICE
    assert seen["url"] == "http://ocr.test/ocr"
    assert seen["headers"] == {"X-OCR-Key": "sk-only-key"}
    assert seen["files"]["file"][0] == "document.png"
    assert seen["data"] == {"text_layers": "auto"}


def test_a_sideways_page_is_retried_turned(monkeypatch):
    """The page reads as empty upright and as text once turned 90 degrees."""
    _reader_on(monkeypatch)
    upright = _png(40, 20)
    sizes = []

    def post(url, **kwargs):
        from PIL import Image

        size = Image.open(io.BytesIO(kwargs["files"]["file"][1])).size
        sizes.append(size)
        return httpx.Response(200, json={"pages": 1, "text": LONG_TEXT if size == (20, 40) else ""})

    monkeypatch.setattr(httpx, "post", post)
    result = document_ocr.read_document(upright, PNG)
    assert result.text == LONG_TEXT
    assert sizes == [(40, 20), (20, 40)]
    assert [(a.rotation, a.ok) for a in result.attempts] == [(0, False), (90, True)]


@pytest.mark.parametrize("failure, code", [
    (httpx.ReadTimeout("slow"), document_ocr.ERROR_TIMEOUT),
    (httpx.ConnectError("down"), document_ocr.ERROR_UNREACHABLE),
])
def test_a_service_failure_is_a_code_never_a_message(monkeypatch, failure, code):
    _reader_on(monkeypatch)

    def post(*_a, **_k):
        raise failure

    monkeypatch.setattr(httpx, "post", post)
    with pytest.raises(document_ocr.ReadFailed) as raised:
        document_ocr.read_document(_png(), PNG)
    assert [a.error_code for a in raised.value.attempts] == [code]
    assert "slow" not in str(raised.value) and "down" not in str(raised.value)


def test_a_bad_status_or_body_fails_without_guessing(monkeypatch):
    _reader_on(monkeypatch)
    monkeypatch.setattr(httpx, "post", lambda *a, **k: httpx.Response(401, json={"detail": "bad key"}))
    with pytest.raises(document_ocr.ReadFailed) as raised:
        document_ocr.read_document(b"%PDF-1.4 not really", PDF)
    assert raised.value.attempts[-1].error_code == document_ocr.ERROR_HTTP


# --- upload, dedupe, filing ----------------------------------------------------------

def _stub_reader(monkeypatch, text, engine=document_ocr.ENGINE_SERVICE, embedded=""):
    _reader_on(monkeypatch)
    monkeypatch.setattr(document_ocr, "read_document", lambda content, mime_type, **_options: document_ocr.ReadResult(
        text=text, engine=engine, embedded_text=embedded,
        attempts=[document_ocr.Attempt(engine, ok=True, pages=1, ms=12)]))


def _upload(client, headers, body=b"one", name="report.pdf", category="LAB"):
    return client.post("/api/health/documents", headers=headers, data={"title": "My record", "category": category},
                       files={"file": (name, b"%PDF-1.4\n" + body, PDF)})


def _document(factory, document_id):
    with factory() as db:
        return db.get(M.Document, document_id)


def test_upload_files_by_name_and_keeps_provenance(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, LONG_TEXT)
    _user, headers = register(client, codes, "file1@example.test")
    res = _upload(client, headers, name="cbc_report.pdf")
    assert res.status_code == 201
    assert (res.json()["kind"], res.json()["matchedVia"], res.json()["duplicate"]) == ("blood", "filename", False)
    row = _document(factory, res.json()["id"])
    assert (row.category, row.doc_kind, row.classification_source) == ("LAB", "blood", "filename")
    assert (row.ocr_engine, row.ocr_text_len, row.kind_verified) == ("axiss-ocr", len(LONG_TEXT), False)
    assert len(row.checksum_sha256) == 64
    with factory() as db:
        jobs = db.scalars(select(M.OcrJob).where(M.OcrJob.document_id == row.id)).all()
    assert [(j.engine, j.ok, j.error_code) for j in jobs] == [("axiss-ocr", True, "")]
    listed = client.get("/api/health/documents", headers=headers).json()["items"][0]
    assert (listed["kind"], listed["matchedVia"], listed["kindVerified"]) == ("blood", "filename", False)


def test_text_files_a_record_whose_name_says_nothing(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, LONG_TEXT)
    _user, headers = register(client, codes, "file2@example.test")
    res = _upload(client, headers, name="IMG_0042.pdf")
    assert (res.json()["kind"], res.json()["matchedVia"]) == ("blood", "ocr")


def test_the_students_category_stands_and_a_disagreement_goes_to_review(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, "")
    _user, headers = register(client, codes, "file3@example.test")
    res = _upload(client, headers, name="prescription.pdf", category="LAB")
    row = _document(factory, res.json()["id"])
    assert (row.category, row.doc_kind) == ("LAB", classifier.UNFILED)
    fields = client.get(f"/api/intake/{res.json()['intakeId']}", headers=headers).json()["fields"]
    suggested = [f for f in fields if f["field"] == document_filing.FIELD_SUGGESTED_CATEGORY]
    assert [(f["value"], f["status"]) for f in suggested] == [("PRESCRIPTION", "PENDING")]


def test_the_same_bytes_twice_are_one_record(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, LONG_TEXT)
    _user, headers = register(client, codes, "file4@example.test")
    first = _upload(client, headers, name="cbc.pdf")
    again = _upload(client, headers, name="a different name.pdf")
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json() == {"id": first.json()["id"], "intakeId": first.json()["intakeId"], "duplicate": True}
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.Document)) == 1
    # Filed under another category it is a record of its own (category-keyed flows rely on that).
    assert _upload(client, headers, name="cbc.pdf", category="OTHER").status_code == 201
    # Another student's identical file is their own record.
    client.cookies.clear()
    _other, other_headers = register(client, codes, "file4b@example.test")
    assert _upload(client, other_headers, name="cbc.pdf").status_code == 201


def test_readings_that_disagree_on_the_date_go_to_review(harness, monkeypatch):  # noqa: F811
    client, _factory, codes = harness
    _stub_reader(monkeypatch, "Lab report dated 12/05/2026 hemoglobin", embedded="printed 01/01/2020")
    _user, headers = register(client, codes, "file5@example.test")
    res = _upload(client, headers)
    fields = client.get(f"/api/intake/{res.json()['intakeId']}", headers=headers).json()["fields"]
    conflict = [f for f in fields if f["field"] == document_filing.FIELD_DATE_CONFLICT]
    assert [(f["value"], f["status"]) for f in conflict] == [("", "PENDING")]


def test_the_ocr_service_being_down_never_costs_the_upload(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _reader_on(monkeypatch)

    def post(*_a, **_k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(httpx, "post", post)
    _user, headers = register(client, codes, "file6@example.test")
    res = _upload(client, headers, name="IMG_1.pdf")
    assert res.status_code == 201
    row = _document(factory, res.json()["id"])
    assert row.doc_kind == classifier.UNFILED
    with factory() as db:
        jobs = db.scalars(select(M.OcrJob).where(M.OcrJob.document_id == row.id)).all()
    assert (False, document_ocr.ERROR_UNREACHABLE) in [(j.ok, j.error_code) for j in jobs]
    assert client.get(f"/api/intake/{res.json()['intakeId']}", headers=headers).json()["status"] == "FAILED"


def test_a_crash_inside_filing_never_costs_the_upload(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _reader_on(monkeypatch)

    def boom(*_a, **_k):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(document_ocr, "read_document", boom)
    _user, headers = register(client, codes, "file7@example.test")
    res = _upload(client, headers, name="cbc.pdf")
    assert res.status_code == 201
    assert _document(factory, res.json()["id"]).doc_kind == classifier.UNFILED


def test_the_virus_scan_still_refuses_a_prescription_when_it_cannot_run(harness, monkeypatch):  # noqa: F811
    """Filing is best-effort; the scan is a gate and stays fail-closed."""
    client, factory, codes = harness
    _stub_reader(monkeypatch, LONG_TEXT)

    def offline(content, *, allow_offline_bypass=True):
        if not allow_offline_bypass:
            raise HTTPException(500, "Security scanner is currently offline.")
        return True

    monkeypatch.setattr(workflow_api, "scan_file_for_viruses", offline)
    _user, headers = register(client, codes, "file8@example.test")
    assert _upload(client, headers, name="rx.pdf", category="PRESCRIPTION").status_code == 500
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.Document)) == 0


# --- corrections, reclassify, backfill -----------------------------------------------

def test_a_students_correction_is_remembered_for_the_same_file_name(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, "")
    _user, headers = register(client, codes, "fix1@example.test")
    first = _upload(client, headers, body=b"one", name="Report_Nov.pdf")
    assert first.json()["kind"] == "other_lab"
    fixed = client.patch(f"/api/health/documents/{first.json()['id']}/kind", headers=headers, json={"kind": "urine"})
    assert fixed.status_code == 200
    assert fixed.json() == {"id": first.json()["id"], "kind": "urine", "matchedVia": "manual", "kindVerified": True}
    with factory() as db:
        correction = db.scalars(select(M.DocumentLabelCorrection)).one()
    assert (correction.file_name_norm, correction.corrected_kind, correction.rule_said_kind) == \
        ("report nov", "urine", "other_lab")
    # The next import of that file name (different bytes) follows the student.
    second = _upload(client, headers, body=b"two", name="report-nov.pdf")
    assert (second.json()["kind"], second.json()["matchedVia"]) == ("urine", "learned")
    # In another category the correction does not apply.
    third = _upload(client, headers, body=b"three", name="report-nov.pdf", category="OTHER")
    assert third.json()["matchedVia"] != "learned"


def test_a_subfolder_from_another_category_is_refused(harness, monkeypatch):  # noqa: F811
    client, _factory, codes = harness
    _stub_reader(monkeypatch, "")
    _user, headers = register(client, codes, "fix2@example.test")
    doc = _upload(client, headers, name="cbc.pdf").json()["id"]
    for kind in ("prescription", "unfiled", "nonsense"):
        assert client.patch(f"/api/health/documents/{doc}/kind", headers=headers,
                            json={"kind": kind}).status_code == 422
    client.cookies.clear()
    _other, other_headers = register(client, codes, "fix2b@example.test")
    assert client.patch(f"/api/health/documents/{doc}/kind", headers=other_headers,
                        json={"kind": "urine"}).status_code == 404


def _legacy_document(factory, account_id, name, category="LAB", **extra):
    """A record stored before auto-filing: no subfolder yet."""
    doc_id = f"legacy-{name}"
    with factory() as db:
        db.add(M.Document(id=doc_id, account_id=account_id, title="Old", category=category, filename=name,
                          mime_type=PDF, content=b"%PDF-1.4 old", created_at=time.time(), **extra))
        db.commit()
    return doc_id


def test_reclassify_is_a_dry_run_by_default_and_idempotent(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "re1@example.test")
    doc = _legacy_document(factory, user["id"], "cbc_2024.pdf")
    dry = client.post(f"/api/health/documents/{doc}/reclassify", headers=headers).json()
    assert (dry["from"], dry["to"], dry["matchedVia"], dry["changed"], dry["applied"]) == \
        ("never_filed", "blood", "filename", True, False)
    assert _document(factory, doc).doc_kind == ""
    applied = client.post(f"/api/health/documents/{doc}/reclassify?apply=true", headers=headers).json()
    assert (applied["to"], applied["applied"]) == ("blood", True)
    assert _document(factory, doc).doc_kind == "blood"
    again = client.post(f"/api/health/documents/{doc}/reclassify?apply=true", headers=headers).json()
    assert (again["changed"], again["applied"]) == (False, False)


def test_a_verified_subfolder_survives_reclassify_and_backfill(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "re2@example.test")
    doc = _legacy_document(factory, user["id"], "cbc_2024.pdf", doc_kind="urine", kind_verified=True,
                           classification_source="manual")
    result = client.post(f"/api/health/documents/{doc}/reclassify?apply=true", headers=headers).json()
    assert (result["skipped"], result["applied"]) == ("verified", False)
    with factory() as db:
        document_filing.backfill(db, apply=True)
        db.commit()
    assert _document(factory, doc).doc_kind == "urine"


def test_reclassify_keeps_a_filing_the_rules_can_no_longer_better(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "re3@example.test")
    doc = _legacy_document(factory, user["id"], "IMG_9.pdf", doc_kind="blood", classification_source="ocr")
    result = client.post(f"/api/health/documents/{doc}/reclassify?apply=true", headers=headers).json()
    assert (result["skipped"], result["to"]) == ("no_better_match", "blood")


def _admin(client, factory, codes):
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Admin",
                         role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    return login(client, codes, "admin@example.test")


def test_backfill_dry_run_writes_nothing_and_matches_the_applied_run(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "bf1@example.test")
    names = [f"cbc_{n}.pdf" for n in range(6)] + ["holiday.pdf"]
    ids = [_legacy_document(factory, user["id"], name) for name in names]
    verified = _legacy_document(factory, user["id"], "cbc_mine.pdf", doc_kind="urine", kind_verified=True)
    admin_headers = _admin(client, factory, codes)

    dry = client.post("/api/ops/documents/reclassify-backfill", headers=admin_headers)
    assert dry.status_code == 200
    assert {k: dry.json()[k] for k in ("applied", "examined", "changed", "skipped")} == \
        {"applied": False, "examined": 8, "changed": 7, "skipped": 1}
    # One "never_filed->unfiled" is below the suppression threshold and is not shown.
    assert dry.json()["transitions"] == {"never_filed->blood": 6, "never_filed->unfiled": None}
    assert all(_document(factory, i).doc_kind == "" for i in ids)

    applied = client.post("/api/ops/documents/reclassify-backfill?apply=true", headers=admin_headers).json()
    assert {k: applied[k] for k in ("examined", "changed", "skipped", "transitions")} == \
        {k: dry.json()[k] for k in ("examined", "changed", "skipped", "transitions")}
    assert [_document(factory, i).doc_kind for i in ids] == ["blood"] * 6 + ["unfiled"]
    assert _document(factory, verified).doc_kind == "urine"

    second = client.post("/api/ops/documents/reclassify-backfill?apply=true", headers=admin_headers).json()
    assert (second["changed"], second["transitions"]) == (0, {})
    # Counts only: nothing that names a student's record.
    for secret in ids + names:
        assert secret not in dry.text
    assert client.post("/api/ops/documents/reclassify-backfill", headers=headers).status_code == 403


def test_deleting_a_record_removes_its_read_log(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _stub_reader(monkeypatch, LONG_TEXT)
    _user, headers = register(client, codes, "del1@example.test")
    doc = _upload(client, headers, name="cbc.pdf").json()["id"]
    assert client.delete(f"/api/health/documents/{doc}", headers=headers).status_code == 200
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.OcrJob)) == 0
