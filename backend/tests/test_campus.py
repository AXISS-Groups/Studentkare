"""Campus affiliation verification tests."""
import time

from fastapi.testclient import TestClient
from test_workflow_api import harness, login, register

from core import workflow_models as M


def _staff(factory):
    with factory() as db:
        db.add(M.Account(id="campusadmin", identifier="campus@example.test", channel="EMAIL", full_name="Campus Admin", role="CAMPUS_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()


def test_campus_verify_flow(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "student@example.test")

    # Student submits verification.
    status = client.get("/api/campus/verification", headers=headers).json()
    assert status["status"] == "NOT_SUBMITTED"
    sub = client.post("/api/campus/verification", json={"university": "Test University", "rollNumber": "S-42"}, headers=headers).json()
    assert sub["status"] == "PENDING"

    # A student cannot verify others.
    assert client.patch("/api/ops/campus/testuser", json={"status": "VERIFIED"}, headers=headers).status_code == 403

    # Staff verify.
    _staff(factory)
    staff_headers = login(client, codes, "campus@example.test")
    pending = client.get("/api/ops/campus/pending", headers=staff_headers).json()["items"]
    assert len(pending) == 1 and pending[0]["accountId"] == user["id"]

    ver = client.patch(f"/api/ops/campus/{user['id']}", json={"status": "VERIFIED"}, headers=staff_headers).json()
    assert ver["status"] == "VERIFIED"

    # Re-login as the student to confirm the verified flag persisted.
    student_headers = login(client, codes, "student@example.test")
    assert client.get("/api/campus/verification", headers=student_headers).json()["status"] == "VERIFIED"
    assert client.get("/api/auth/session", headers=student_headers).json()["user"]["isVerifiedStudent"] is True


def test_cannot_reverify_after_verified(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "student2@example.test")
    client.post("/api/campus/verification", json={"university": "Test", "rollNumber": "R1"}, headers=headers)
    _staff(factory)
    staff_headers = login(client, codes, "campus@example.test")
    client.patch(f"/api/ops/campus/{user['id']}", json={"status": "VERIFIED"}, headers=staff_headers)
    # Re-login as student and confirm re-submission is rejected.
    student_headers = login(client, codes, "student2@example.test")
    assert client.post("/api/campus/verification", json={"university": "Test", "rollNumber": "R2"}, headers=student_headers).status_code == 409
