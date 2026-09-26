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

    # Super-admin review queue contains the pending items.
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Admin", role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    admin_headers = login(client, codes, "admin@example.test")
    queue = client.get("/api/ops/intake/review", headers=admin_headers).json()["items"]
    assert len(queue) >= 1
    item = queue[0]
    assert client.patch(f"/api/ops/intake/review/{item['id']}", json={"approved": True, "correctedValue": "Dr. Sharma"}, headers=admin_headers).json()["status"] == "APPROVED"


def test_intake_never_invents_medication(harness):
    client, _, codes = harness
    user, headers = register(client, codes, "owner2@example.test")
    res = _upload(client, headers, b"No medication named in this document.", name="note.txt", mime="application/pdf")
    intake_id = res.json()["intakeId"]
    status = client.get(f"/api/intake/{intake_id}", headers=headers).json()
    meds = [f for f in status["fields"] if f["field"] == "medication"]
    # No fabricated medication entries.
    assert meds == []
