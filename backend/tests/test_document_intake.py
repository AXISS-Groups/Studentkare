"""Document intake and review-queue tests."""
import time

from sqlalchemy import select
from test_workflow_api import harness, login, register

from core import workflow_models as M


def _upload(client, headers, content, name="report.txt", mime="application/pdf"):
    # Use a fake PDF header so the MIME check passes.
    return client.post("/api/health/documents", headers=headers, data={"title": "Lab Report", "category": "LAB"},
                       files={"file": (name, b"%PDF-1.4\n" + content, mime)})


def test_upload_queues_intake_and_review(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "owner@example.test")
    res = _upload(client, headers, b"Dr. Sharma 12/05/2026 Hemoglobin 12.0 g/dL Report")
    assert res.status_code == 201
    intake_id = res.json()["intakeId"]

    status = client.get(f"/api/intake/{intake_id}", headers=headers).json()
    assert status["extractor"] == "heuristic"
    # The provider "Sharma" must be extracted from text, not invented.
    fields = {f["field"]: f for f in status["fields"]}
    assert fields["provider"]["value"] == "Sharma"
    assert fields["document_date"]["value"] == "12/05/2026"


def _admin(client, factory, codes):
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Admin", role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    return login(client, codes, "admin@example.test")


def test_super_admin_queue_shows_operational_state_only(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "owner3@example.test")
    res = _upload(client, headers, b"Dr. Sharma 12/05/2026 Hemoglobin 12.0 g/dL Report Paracetamol")
    intake_id, document_id = res.json()["intakeId"], res.json()["id"]
    admin_headers = _admin(client, factory, codes)

    queue = client.get("/api/ops/intake/review", headers=admin_headers)
    assert queue.status_code == 200
    rows = [row for row in queue.json()["items"] if row["id"] == intake_id]
    assert len(rows) == 1
    # Only what the queue needs to operate: opaque id, kind, state, times.
    assert set(rows[0]) == {"id", "kind", "status", "createdAt", "processedAt"}
    assert rows[0]["kind"] == "LAB"
    assert rows[0]["status"] == "DRAFT"
    # Nothing read from, or naming, the student's document anywhere in the response.
    body = queue.text
    for secret in ("Sharma", "12/05/2026", "Hemoglobin", "Paracetamol", "Lab Report", document_id,
                   "provider", "document_date", "medication", "confidence", "value"):
        assert secret not in body


def test_super_admin_cannot_read_or_write_extracted_fields(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "owner4@example.test")
    res = _upload(client, headers, b"Dr. Sharma 12/05/2026 Report")
    intake_id, document_id = res.json()["intakeId"], res.json()["id"]
    admin_headers = _admin(client, factory, codes)
    with factory() as db:
        item_id = db.scalars(select(M.IntakeReviewItem.id).where(M.IntakeReviewItem.intake_id == intake_id,
                                                                 M.IntakeReviewItem.field == "provider")).first()
    assert item_id
    # The owner-only intake read and the document file stay closed to a super admin.
    assert client.get(f"/api/intake/{intake_id}", headers=admin_headers).status_code == 404
    assert client.get(f"/api/health/documents/{document_id}/file", headers=admin_headers).status_code == 404
    # The old per-field decision endpoint (which took a corrected value) is gone.
    decided = client.patch(f"/api/ops/intake/review/{item_id}", json={"approved": True, "correctedValue": "Dr. X"},
                           headers=admin_headers)
    assert decided.status_code in (404, 405)
    with factory() as db:
        item = db.get(M.IntakeReviewItem, item_id)
        assert (item.status, item.value, item.reviewed_by) == ("PENDING", "Sharma", "")
    # The owner still reads their own fields.
    headers = login(client, codes, "owner4@example.test")
    own = client.get(f"/api/intake/{intake_id}", headers=headers).json()
    assert {f["field"]: f["value"] for f in own["fields"]}["provider"] == "Sharma"


def test_queue_is_super_admin_only(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes, "owner5@example.test")
    assert client.get("/api/ops/intake/review", headers=headers).status_code == 403


def test_intake_never_invents_medication(harness):
    client, _, codes = harness
    user, headers = register(client, codes, "owner2@example.test")
    res = _upload(client, headers, b"No medication named in this document.", name="note.txt", mime="application/pdf")
    intake_id = res.json()["intakeId"]
    status = client.get(f"/api/intake/{intake_id}", headers=headers).json()
    meds = [f for f in status["fields"] if f["field"] == "medication"]
    # No fabricated medication entries.
    assert meds == []
