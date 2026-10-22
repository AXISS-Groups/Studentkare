"""Live-run audit #4: signing up asks the campus, so the campus queue sees the student.

Sign-up says "your account starts with campus verification pending", and the
student gives a university and roll number. That submission must be the same
request the campus reads (GET /ops/campus/pending), not a NOT_SUBMITTED status.
"""
import time

from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M


def _campus_admin(factory, university="Test University", identifier="campus-admin@example.test"):
    with factory() as db:
        db.add(M.Account(id=f"ca-{identifier}", identifier=identifier, channel="EMAIL", full_name="Campus Admin",
                         role="CAMPUS_ADMIN", active=True, profile={"university": university}, created_at=time.time(),
                         # The campus a super admin assigned (#224, audit C1); the profile grants no scope.
                         staff_campus=university))
        db.commit()


def test_signup_opens_a_pending_campus_verification_the_campus_queue_reads(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "fresh-student@example.test")
    status = client.get("/api/campus/verification", headers=headers).json()
    assert status["status"] == "PENDING"
    assert (status["university"], status["rollNumber"]) == ("Test University", "TEST-42")
    client.post("/api/auth/logout", headers=headers)

    _campus_admin(factory)
    admin = login(client, codes, "campus-admin@example.test")
    pending = client.get("/api/ops/campus/pending", headers=admin).json()["items"]
    assert [row["accountId"] for row in pending] == [user["id"]]
    decided = client.patch(f"/api/ops/campus/{user['id']}", headers=admin, json={"status": "VERIFIED"})
    assert decided.status_code == 200, decided.text


def test_another_campus_does_not_see_the_request(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "fresh-student2@example.test")
    client.post("/api/auth/logout", headers=headers)
    _campus_admin(factory, university="Other College", identifier="other-admin@example.test")
    admin = login(client, codes, "other-admin@example.test")
    assert client.get("/api/ops/campus/pending", headers=admin).json()["items"] == []
