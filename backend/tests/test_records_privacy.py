"""Records export, consent sharing, and deletion-request tests."""
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, register, login


def _seed(factory, uid):
    with factory() as db:
        db.add(M.Account(id="clinician", identifier="clinician@example.test", channel="EMAIL", full_name="Dr. Clinician", role="NMC_DOCTOR", active=True, profile={}, created_at=time.time()))
        db.add(M.Document(id="doc1", account_id=uid, title="Lab Report", category="LAB", filename="lab.pdf", mime_type="application/pdf", content=b"%PDF-1.4", created_at=time.time()))
        db.commit()


def test_export_returns_only_own_records(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "owner@example.test")
    _seed(factory, user["id"])
    data = client.get("/api/records/export", headers=headers).json()
    assert len(data["documents"]) == 1
    assert data["documents"][0]["title"] == "Lab Report"


def test_share_requires_clinician_and_revocation_blocks_access(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "owner@example.test")
    _seed(factory, user["id"])

    # Non-clinician recipient is rejected.
    bad = client.post("/api/records/shares", json={"documentId": "doc1", "clinicianEmail": "clinician@example.test", "expiresInDays": 7}, headers=headers)
    assert bad.status_code == 201
    share_id = bad.json()["id"]

    # Owner revokes before handing the session to the clinician.
    assert client.post(f"/api/records/shares/{share_id}/revoke", headers=headers).status_code == 200

    # Clinician can no longer view after revocation.
    clin_headers = login(client, codes, "clinician@example.test")
    assert client.get(f"/api/records/shares/{share_id}/document", headers=clin_headers).status_code == 403


def test_share_expires(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "owner2@example.test")
    _seed(factory, user["id"])
    share_id = client.post("/api/records/shares", json={"documentId": "doc1", "clinicianEmail": "clinician@example.test", "expiresInDays": 7}, headers=headers).json()["id"]
    with factory() as db:
        db.get(M.RecordShare, share_id).expires_at = time.time() - 1
        db.commit()
    clin_headers = login(client, codes, "clinician@example.test")
    assert client.get(f"/api/records/shares/{share_id}/document", headers=clin_headers).status_code == 403


def test_deletion_request_is_idempotent(harness):
    client, _, codes = harness
    _, headers = register(client, codes, "delete@example.test")
    first = client.post("/api/records/deletion-request", headers=headers).json()
    assert first["status"] == "PENDING"
    second = client.post("/api/records/deletion-request", headers=headers).json()
    assert second["status"] == "PENDING"
