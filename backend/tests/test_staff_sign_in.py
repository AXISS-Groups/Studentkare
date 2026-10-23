"""Staff sign-in page (canvas AdminSignIn): POST /auth/otp/send with audience STAFF.

The staff page sends a code only to an active non-student account, by email,
and answers "no account" and "a student account" with the same refusal, so it
never tells anyone which emails belong to students. Nothing here can open a
session without the emailed code (guardrail 2).
"""
import secrets
import time

from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M


def seed(factory, *, role, active=True):
    email = f"{role.lower()}.{secrets.token_hex(4)}@example.test"
    with factory() as db:
        db.add(M.Account(id=f"acc_{secrets.token_hex(8)}", identifier=email, channel="EMAIL", full_name="Staff Person",
                         role=role, active=active, profile={}, created_at=time.time()))
        db.commit()
    return email


def send(client, identifier, **extra):
    body = {"identifier": identifier, "channel": "EMAIL", "intent": "LOGIN", "audience": "STAFF", **extra}
    return client.post("/api/auth/otp/send", json=body)


def test_staff_account_gets_a_code(harness):
    client, factory, codes = harness
    email = seed(factory, role="CAMPUS_ADMIN")
    sent = send(client, email)
    assert sent.status_code == 200, sent.text
    assert sent.json()["expiresInSeconds"] > 0
    assert len(codes) == 1


def test_student_account_is_refused_like_an_unknown_email(harness):
    client, factory, codes = harness
    student = seed(factory, role="STUDENT")
    staff_email = seed(factory, role="CAMPUS_ADMIN")
    refused_student = send(client, student)
    refused_unknown = send(client, f"nobody.{secrets.token_hex(4)}@example.test")
    assert codes == []
    real = send(client, staff_email)
    # The same answer as a real send (audit M5): nothing says which emails have accounts.
    assert refused_student.status_code == refused_unknown.status_code == real.status_code == 200
    assert set(refused_student.json()) == set(refused_unknown.json()) == set(real.json())
    assert len(codes) == 1
    assert client.get("/api/auth/session").json()["user"] is None


def test_inactive_staff_account_is_refused(harness):
    client, factory, codes = harness
    email = seed(factory, role="SUPER_ADMIN", active=False)
    refused = send(client, email)
    assert refused.status_code == 200 and refused.json()["success"] is True   # same shape, audit M5
    assert codes == []
    # The decoy challenge verifies like a wrong code: no session.
    assert client.post("/api/auth/otp/verify", json={"otp": "123456"}).status_code in (400, 401)
    assert client.get("/api/auth/session").json()["user"] is None


def test_staff_audience_is_email_and_sign_in_only(harness):
    client, factory, codes = harness
    email = seed(factory, role="VENDOR")
    assert send(client, email, channel="WHATSAPP").status_code == 422
    assert send(client, email, intent="SIGNUP").status_code == 422
    assert codes == []


def test_staff_code_still_required_and_wrong_code_opens_nothing(harness):
    client, factory, codes = harness
    email = seed(factory, role="NMC_DOCTOR")
    assert send(client, email).status_code == 200
    wrong = "000000" if codes[-1] != "000000" else "111111"
    refused = client.post("/api/auth/otp/verify", json={"otp": wrong})
    assert refused.status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_student_page_is_unchanged_for_students(harness):
    client, factory, codes = harness
    student = seed(factory, role="STUDENT")
    sent = client.post("/api/auth/otp/send", json={"identifier": student, "channel": "EMAIL", "intent": "LOGIN"})
    assert sent.status_code == 200, sent.text
    assert len(codes) == 1
