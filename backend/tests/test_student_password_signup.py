"""Sign-up with both contacts and a password; students signing in with a password.

Plan tier1-auth-password-2026-10-22 (sections B to D), approved by the founder
2026-10-22. Covers: a weak or missing password is refused without spending the
sign-up; the other contact must be verified while its channel can deliver, and is
optional when it can't; that code is bound to the sign-up and its value must be
free; both contacts and the password are saved; a student signs in with the
password by email or by WhatsApp number; one answer for every failure; a new
device tells both contacts; staff can't use the student endpoint; setting and
changing your own password, and "forgot password" through a code sign-in.
"""
import pytest
from sqlalchemy import select
from test_team_accounts import (
    team,  # noqa: F401 — pytest fixture
    tid,  # noqa: F401
)
from test_workflow_api import (  # noqa: F401 — pytest fixture
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    login,
    verify_second_contact,
)

from core import workflow_models as M
from services import account_password as P
from services import contact_store as C

DETAILS = {"fullName": "Asha Rao", "dob": "2001-05-09", "university": "Test University", "rollNumber": "R-7",
           "consent": SIGNUP_CONSENT}
PHONE = "9123456780"


def start(client, codes, email="asha@example.test"):
    client.post("/api/auth/otp/send", json={"identifier": email, "channel": "EMAIL", "intent": "SIGNUP"})
    return {"X-CSRF-Token": client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]}


def create(client, headers, password=SIGNUP_PASSWORD):
    return client.post("/api/auth/signup", json={**DETAILS, "password": password}, headers=headers)


def password_in(client, identifier, password=SIGNUP_PASSWORD):
    return client.post("/api/auth/password/sign-in", json={"identifier": identifier, "password": password})


def signed_up(client, codes, email="asha@example.test", phone=PHONE):
    headers = start(client, codes, email)
    verify_second_contact(client, codes, headers, phone)
    created = create(client, headers)
    assert created.status_code == 201, created.text
    return created.json()["user"], {"X-CSRF-Token": created.json()["csrfToken"]}


# --- sign-up ------------------------------------------------------------------------

@pytest.mark.parametrize("password", ["short", "password12345", "asharao-2001", "aaaaaaaaaaaa"])
def test_a_weak_password_is_refused_and_the_sign_up_survives(harness, password):  # noqa: F811
    client, factory, codes = harness
    headers = start(client, codes)
    verify_second_contact(client, codes, headers, PHONE)
    refused = create(client, headers, password)
    assert refused.status_code == 422 and refused.json()["detail"]["code"].startswith("PASSWORD_")
    with factory() as db:
        assert db.scalar(select(M.Account).where(M.Account.identifier == "asha@example.test")) is None
    assert create(client, headers).status_code == 201


def test_no_password_no_account(harness):  # noqa: F811
    client, _factory, codes = harness
    headers = start(client, codes)
    verify_second_contact(client, codes, headers, PHONE)
    assert client.post("/api/auth/signup", json=DETAILS, headers=headers).status_code == 422


def test_the_other_contact_is_required_while_its_channel_delivers(harness):  # noqa: F811
    client, _factory, codes = harness
    headers = start(client, codes)
    refused = create(client, headers)
    assert refused.status_code == 422
    assert refused.json()["detail"] == {"code": "SECOND_CONTACT_REQUIRED", "channel": "WHATSAPP",
                                        "message": refused.json()["detail"]["message"]}
    verify_second_contact(client, codes, headers, PHONE)
    assert create(client, headers).status_code == 201


def test_the_other_contact_is_optional_when_its_channel_cant_deliver(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    from services import workflow_auth
    monkeypatch.setattr(workflow_auth, "available_channels", lambda db=None: ["EMAIL"])
    headers = start(client, codes)
    created = create(client, headers)
    assert created.status_code == 201, created.text
    with factory() as db:
        assert C.contact_of_kind(db, created.json()["user"]["id"], "WHATSAPP") is None


def test_both_contacts_and_the_password_are_saved(harness):  # noqa: F811
    client, factory, codes = harness
    user, _headers = signed_up(client, codes)
    assert user["email"] == "asha@example.test" and user["phone"] == PHONE
    with factory() as db:
        assert C.contact_of_kind(db, user["id"], "WHATSAPP").verified_at > 0
        stored = db.get(M.AccountPassword, user["id"]).password_hash
    assert SIGNUP_PASSWORD not in stored


def test_the_second_code_is_bound_to_this_sign_up(harness):  # noqa: F811
    client, _factory, codes = harness
    headers = start(client, codes, "one@example.test")
    client.post("/api/auth/signup/contact/send-code", json={"value": PHONE}, headers=headers)
    code, token = codes[-1], client.cookies.get("sacare_signup_contact")
    # A second sign-up in the same browser can't use the first one's code.
    other = start(client, codes, "two@example.test")
    client.cookies.set("sacare_signup_contact", token, path="/api")
    assert client.post("/api/auth/signup/contact/verify", json={"otp": code}, headers=other).status_code == 401
    # And it is never a sign-in.
    client.cookies.set("sacare_challenge", token, path="/api")
    assert client.post("/api/auth/otp/verify", json={"otp": code}).status_code == 401


def test_the_second_value_must_be_free(harness):  # noqa: F811
    client, _factory, codes = harness
    signed_up(client, codes, "first@example.test", PHONE)
    client.post("/api/auth/logout")
    headers = start(client, codes, "second@example.test")
    taken = client.post("/api/auth/signup/contact/send-code", json={"value": PHONE}, headers=headers)
    assert taken.status_code == 409 and taken.json()["detail"]["code"] == "CONTACT_IN_USE"


def test_the_second_code_needs_the_sign_up_and_its_csrf(harness):  # noqa: F811
    client, _factory, codes = harness
    assert client.post("/api/auth/signup/contact/send-code", json={"value": PHONE}).status_code == 401
    start(client, codes)
    assert client.post("/api/auth/signup/contact/send-code", json={"value": PHONE},
                       headers={"X-CSRF-Token": "bad"}).status_code == 403


# --- student password sign-in -----------------------------------------------------------

def test_sign_in_with_the_password_by_email_or_whatsapp(harness, monkeypatch):  # noqa: F811
    client, _factory, codes = harness
    told = []
    monkeypatch.setattr(P, "notify_new_sign_in", lambda db, account: told.append(account.id))
    user, headers = signed_up(client, codes)
    client.post("/api/auth/logout", json={"remember": True}, headers=headers)   # "Remember me on this device"
    by_email = password_in(client, "Asha@Example.test")
    assert by_email.status_code == 200, by_email.text
    assert by_email.json()["user"]["id"] == user["id"]
    assert told == []                                  # this device signed up: it is known
    client.post("/api/auth/logout", headers={"X-CSRF-Token": by_email.json()["csrfToken"]})
    client.cookies.clear()                             # a brand-new device
    by_phone = password_in(client, "+91 91234 56780")
    assert by_phone.status_code == 200
    assert told == [user["id"]]                        # both contacts are told


def test_every_failure_gets_the_same_answer(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = signed_up(client, codes)
    client.post("/api/auth/logout", headers=headers)
    with factory() as db:
        C.save_contact(db, user["id"], "WHATSAPP", PHONE, verified=False)
        db.commit()
    answers = [
        password_in(client, "nobody@example.test"),
        password_in(client, "asha@example.test", "Wrong-river 99"),
        password_in(client, PHONE),                       # an unverified contact
        password_in(client, "not an id"),
    ]
    assert {a.status_code for a in answers} == {401}
    assert len({str(a.json()) for a in answers}) == 1


def test_staff_cant_use_the_student_password_endpoint(team):
    client, factory, _codes, _pins = team
    with factory() as db:
        P.set_password(db, db.get(M.Account, "team-campus"), SIGNUP_PASSWORD, "test")
    assert password_in(client, tid("campus")).status_code == 401


def test_a_locked_password_still_leaves_codes(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = signed_up(client, codes)
    client.post("/api/auth/logout", headers=headers)
    for _ in range(5):
        password_in(client, "asha@example.test", "Wrong-river 99")
    assert password_in(client, "asha@example.test").status_code == 401
    assert login(client, codes, "asha@example.test")


def test_the_switch_off_refuses(harness, monkeypatch):  # noqa: F811
    client, _factory, codes = harness
    signed_up(client, codes)
    monkeypatch.setattr(P, "password_login_enabled", lambda db: False)
    assert password_in(client, "asha@example.test").status_code == 403


# --- Sign-in & security → Password ------------------------------------------------------

def test_change_needs_the_current_password_or_a_fresh_code_sign_in(harness, monkeypatch):  # noqa: F811
    client, _factory, codes = harness
    monkeypatch.setattr(P, "notify_new_sign_in", lambda db, account: None)
    _user, headers = signed_up(client, codes)
    client.post("/api/auth/logout", headers=headers)
    signed = password_in(client, "asha@example.test")
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    status = client.get("/api/auth/password").json()
    assert status["hasPassword"] is True and status["replaceWithoutCurrentUntil"] is None
    new = "Monsoon kettle 7!"
    refused = client.post("/api/auth/password", json={"password": new}, headers=headers)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PROOF_NEEDED
    assert client.post("/api/auth/password", json={"password": new, "currentPassword": SIGNUP_PASSWORD},
                       headers=headers).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    # Forgot it: sign in with a code, then a new one without the old.
    headers = login(client, codes, "asha@example.test")
    assert client.get("/api/auth/password").json()["replaceWithoutCurrentUntil"] is not None
    assert client.post("/api/auth/password", json={"password": "Cardamom lane 81"}, headers=headers).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    assert password_in(client, "asha@example.test", "Cardamom lane 81").status_code == 200


def test_a_weak_new_password_is_refused(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, _headers = signed_up(client, codes)
    headers = login(client, codes, "asha@example.test")
    weak = client.post("/api/auth/password", json={"password": "qwerty12345"}, headers=headers)
    assert weak.status_code == 422 and weak.json()["detail"]["code"] == "PASSWORD_WEAK"


def test_audit_never_holds_the_password(harness):  # noqa: F811
    client, factory, codes = harness
    signed_up(client, codes)
    password_in(client, "asha@example.test", "Wrong-river 99")
    with factory() as db:
        text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in db.scalars(select(M.WorkflowAudit)).all())
    assert SIGNUP_PASSWORD not in text and "Wrong-river" not in text and "asha@" not in text
