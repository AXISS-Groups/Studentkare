"""Student passcode (founder decision 2026-10-22; plan tier1-canvas-wp03, amendment "passcode").

Covers set / change / reset, the 4-6-8 length rule, weak-passcode refusal, lockout and
how it ends, the new-device rule (a code first on every device), one answer for every
failure, the audit trail (never the passcode), the master switch, students only, the
authenticator still asked for, the device remembering email and phone after sign-in,
"forget this device", and lost-phone forgetting every other device.
"""
import secrets
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixture

from app.main import app
from core import workflow_models as M
from core.settings_registry import get_declaration
from core.settings_registry import setting as real_setting
from services import student_passcode as P
from services import team_accounts as T
from services import twofa_store

GOOD = "k7#Qm2"          # 6 characters, mixed, not personal
GOOD_8 = "Rv8!tq3Z"


def overrides(monkeypatch, **values):
    wanted = {key.replace("__", "."): value for key, value in values.items()}
    monkeypatch.setattr(P, "setting", lambda key, db=None: wanted[key] if key in wanted else real_setting(key, db))


def audits(factory, action=None):
    with factory() as db:
        rows = db.scalars(select(M.WorkflowAudit)).all()
    return [r for r in rows if action is None or r.action == action]


def set_code(client, headers, passcode, current=None):
    body = {"passcode": passcode, **({"currentPasscode": current} if current else {})}
    return client.put("/api/auth/passcode", headers=headers, json=body)


def passcode_in(client, passcode, identifier=None):
    body = {"passcode": passcode, **({"identifier": identifier} if identifier else {})}
    return client.post("/api/auth/passcode/sign-in", json=body)


def code_login(client, codes, identifier, channel="EMAIL"):
    assert client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": channel,
                                                    "intent": "LOGIN"}).status_code == 200
    response = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    assert response.status_code == 200, response.text
    return {"X-CSRF-Token": response.json()["csrfToken"]}


def sign_out(client, headers, **body):
    assert client.post("/api/auth/logout", headers=headers, json=body or None).status_code == 200


@pytest.fixture
def student(harness):  # noqa: F811
    """A registered student with a passcode, signed out but remembered on this device."""
    client, factory, codes = harness
    user, headers = register(client, codes)
    assert set_code(client, headers, GOOD).status_code == 200, "set"
    sign_out(client, headers, remember=True)
    return client, factory, codes, user


# --- the rules ------------------------------------------------------------------

@pytest.mark.parametrize("passcode", ["k7#Q", "k7#Qm2", "k7#Qm2!x"])
def test_four_six_and_eight_characters_are_accepted(passcode):
    P.check_passcode(passcode)


@pytest.mark.parametrize("passcode", ["k7#", "k7#Qm", "k7#Qm2!", "k7#Qm2!x9", ""])
def test_any_other_length_is_refused(passcode):
    with pytest.raises(P.PasscodeRefused) as refused:
        P.check_passcode(passcode)
    assert refused.value.code == "LENGTH"


def test_spaces_and_non_ascii_are_refused():
    for passcode in ("k7 #", "k7#é", "ab\tc"):
        with pytest.raises(P.PasscodeRefused) as refused:
            P.check_passcode(passcode)
        assert refused.value.code == "CHARACTERS"


@pytest.mark.parametrize(("passcode", "reason"), [
    ("0000", "COMMON"), ("1234", "COMMON"), ("123456", "COMMON"), ("12345678", "COMMON"),
    ("PassWord", "COMMON"), ("passw0rd", "COMMON"), ("Password", "COMMON"), ("qwerty", "COMMON"),
    ("aaaa", "REPEATED"), ("7777", "REPEATED"), ("abab", "REPEATED"), ("x9x9x9", "REPEATED"), ("k3$k3$k3", "REPEATED"),
    ("2345", "SEQUENCE"), ("8901", "SEQUENCE"), ("9876", "SEQUENCE"), ("defghi", "SEQUENCE"), ("zyxw", "SEQUENCE"),
    ("hjkl", "SEQUENCE"), ("poiuyt", "SEQUENCE"),
])
def test_weak_passcodes_are_refused(passcode, reason):
    with pytest.raises(P.PasscodeRefused) as refused:
        P.check_passcode(passcode)
    assert refused.value.code == "WEAK"
    assert refused.value.reason == reason


def test_the_students_own_phone_email_name_and_birth_date_are_refused():
    phone = M.Account(identifier="9876501234", full_name="Asha Rao", profile={"dob": "2004-05-12"})
    email = M.Account(identifier="asharao@example.test", full_name="Asha Rao", profile={})
    for passcode in ("5012", "765012", "98765012"):
        with pytest.raises(P.PasscodeRefused) as refused:
            P.check_passcode(passcode, phone)
        assert refused.value.reason == "PERSONAL"
    for passcode, account in (("12052004", phone), ("2004", phone), ("asha", email), ("Ashara", email)):
        with pytest.raises(P.PasscodeRefused):
            P.check_passcode(passcode, account)
    P.check_passcode(GOOD, phone)


def test_the_passcode_is_kept_only_as_the_team_pin_hash(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes)
    response = set_code(client, headers, GOOD_8)
    assert response.status_code == 200, response.text
    assert response.json() == {"hasPasscode": True, "length": 8, "updatedAt": response.json()["updatedAt"]}
    with factory() as db:
        row = db.get(M.StudentPasscode, user["id"])
    assert row.passcode_hash.startswith("scrypt$") and GOOD_8 not in row.passcode_hash
    assert T.verify_pin(GOOD_8, row.passcode_hash)
    status = client.get("/api/auth/passcode", headers=headers).json()
    assert status["hasPasscode"] is True and status["length"] == 8
    assert status["lengths"] == [4, 6, 8] and status["recommendedLength"] == 8
    assert "passcode" not in status and GOOD_8 not in str(status)


def test_a_weak_or_wrong_length_passcode_is_refused_with_a_reason(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    weak = set_code(client, headers, "1234")
    assert weak.status_code == 422 and weak.json()["detail"]["code"] == "PASSCODE_WEAK"
    assert weak.json()["detail"]["reason"] == "COMMON"
    short = set_code(client, headers, "k7#Qm")
    assert short.status_code == 422 and short.json()["detail"]["code"] == "PASSCODE_LENGTH"
    assert client.get("/api/auth/passcode", headers=headers).json()["hasPasscode"] is False


# --- set, change, reset, remove ---------------------------------------------------

def test_change_needs_the_current_passcode_once_the_code_sign_in_is_not_fresh(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    _user, headers = register(client, codes)
    assert set_code(client, headers, GOOD).status_code == 200
    later = time.time() + real_setting("auth.passcode_reset_window_minutes") * 60 + 5
    monkeypatch.setattr(P.time, "time", lambda: later)
    refused = set_code(client, headers, GOOD_8)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PASSCODE_PROOF_NEEDED
    assert set_code(client, headers, GOOD_8, current="wrong1").status_code == 403
    changed = set_code(client, headers, GOOD_8, current=GOOD)
    assert changed.status_code == 200, changed.text
    assert len(audits(factory, "STUDENT_PASSCODE_CHANGED")) == 1


def test_forgot_passcode_is_a_code_sign_in_then_a_new_one(student):
    client, factory, codes, user = student
    headers = code_login(client, codes, "member@example.test")
    status = client.get("/api/auth/passcode", headers=headers).json()
    assert status["replaceWithoutCurrentUntil"] is not None
    reset = set_code(client, headers, GOOD_8)
    assert reset.status_code == 200, reset.text
    assert len(audits(factory, "STUDENT_PASSCODE_RESET")) == 1
    sign_out(client, headers, remember=True)
    assert passcode_in(client, GOOD).status_code == 401
    assert passcode_in(client, GOOD_8).json()["user"]["id"] == user["id"]


def test_a_passcode_sign_in_never_counts_as_proven_with_a_code(student):
    client, _factory, _codes, _user = student
    signed = passcode_in(client, GOOD)
    headers = {"X-CSRF-Token": signed.json()["csrfToken"]}
    assert client.get("/api/auth/passcode", headers=headers).json()["replaceWithoutCurrentUntil"] is None
    assert set_code(client, headers, GOOD_8).status_code == 403
    # A refresh keeps it that way.
    refreshed = client.post("/api/auth/refresh", headers=headers)
    headers = {"X-CSRF-Token": refreshed.json()["csrfToken"]}
    assert set_code(client, headers, GOOD_8).status_code == 403
    assert set_code(client, headers, GOOD_8, current=GOOD).status_code == 200


def test_remove_turns_it_off(student):
    client, factory, codes, user = student
    headers = code_login(client, codes, "member@example.test")
    assert client.post("/api/auth/passcode/remove", headers=headers, json={}).json() == {"hasPasscode": False}
    with factory() as db:
        assert db.get(M.StudentPasscode, user["id"]) is None
    assert len(audits(factory, "STUDENT_PASSCODE_REMOVED")) == 1


# --- sign in ----------------------------------------------------------------------

def test_continue_as_with_a_passcode_signs_in_and_audits_it(student):
    client, factory, _codes, user = student
    hint = client.get("/api/auth/remembered").json()
    assert hint["remembered"] is True and hint["passcode"] is True
    signed = passcode_in(client, GOOD)
    assert signed.status_code == 200, signed.text
    assert signed.json()["user"]["id"] == user["id"]
    assert client.get("/api/auth/session").json()["user"]["id"] == user["id"]
    assert len(audits(factory, "STUDENT_PASSCODE_SIGN_IN")) == 1


def test_a_typed_id_works_on_the_same_device(student):
    client, _factory, _codes, user = student
    assert passcode_in(client, GOOD, identifier="Member@Example.test").json()["user"]["id"] == user["id"]


def test_a_new_device_needs_a_code_first(student):
    _client, factory, codes, user = student
    phone = TestClient(app)              # someone who knows only the email
    refused = passcode_in(phone, GOOD, identifier="member@example.test")
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PASSCODE_NEW_DEVICE
    assert phone.get("/api/auth/session").json()["user"] is None
    assert len(audits(factory, "STUDENT_PASSCODE_NEW_DEVICE_REFUSED")) == 1
    # One code sign-in on that device, then the passcode works there.
    sign_out(phone, code_login(phone, codes, "member@example.test"), remember=True)
    assert passcode_in(phone, GOOD).json()["user"]["id"] == user["id"]
    phone.close()


def test_a_new_device_answer_says_nothing_about_the_account(student):
    _client, _factory, _codes, _user = student
    stranger = TestClient(app)
    answers = [passcode_in(stranger, GOOD, identifier="member@example.test"),
               passcode_in(stranger, GOOD, identifier=f"nobody.{secrets.token_hex(3)}@example.test"),
               passcode_in(stranger, GOOD)]
    assert {a.status_code for a in answers} == {403}
    assert len({str(a.json()) for a in answers}) == 1
    stranger.close()


def test_every_failure_on_a_known_device_gets_the_same_answer(student, monkeypatch):
    client, factory, codes, user = student
    wrong = passcode_in(client, "Zz9!Zz9!")
    # No passcode set (removed): same answer as a wrong one.
    headers = code_login(client, codes, "member@example.test")
    client.post("/api/auth/passcode/remove", headers=headers, json={})
    sign_out(client, headers, remember=True)
    none_set = passcode_in(client, GOOD)
    assert wrong.status_code == none_set.status_code == 401
    assert wrong.json() == none_set.json()
    assert client.get("/api/auth/session").json()["user"] is None


def test_typing_another_account_on_a_remembered_device_is_the_new_device_answer(student):
    client, _factory, _codes, _user = student
    refused = passcode_in(client, GOOD, identifier="someone.else@example.test")
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PASSCODE_NEW_DEVICE


def test_lockout_after_max_tries_then_it_runs_out(student, monkeypatch):
    client, factory, _codes, user = student
    for _ in range(real_setting("auth.passcode_max_attempts")):
        assert passcode_in(client, "Zz9!Zz9!").status_code == 401
    assert len(audits(factory, "STUDENT_PASSCODE_LOCKED")) == 1
    assert passcode_in(client, GOOD).status_code == 401           # right passcode, but locked
    assert len(audits(factory, "STUDENT_PASSCODE_SIGN_IN_WHILE_LOCKED")) == 1
    later = time.time() + real_setting("auth.passcode_lockout_minutes") * 60 + 1
    monkeypatch.setattr(P.time, "time", lambda: later)
    assert passcode_in(client, GOOD).json()["user"]["id"] == user["id"]


def test_a_locked_passcode_is_unlocked_by_a_code_sign_in_and_a_new_passcode(student):
    client, factory, codes, user = student
    for _ in range(real_setting("auth.passcode_max_attempts")):
        passcode_in(client, "Zz9!Zz9!")
    headers = code_login(client, codes, "member@example.test")    # the code always works
    assert client.get("/api/auth/passcode", headers=headers).json()["locked"] is True
    assert set_code(client, headers, GOOD_8).status_code == 200
    with factory() as db:
        row = db.get(M.StudentPasscode, user["id"])
        assert row.failed_attempts == 0 and row.locked_until == 0
    sign_out(client, headers, remember=True)
    assert passcode_in(client, GOOD_8).status_code == 200


def test_rate_limits_per_account_and_address(student, monkeypatch):
    client, _factory, _codes, _user = student
    overrides(monkeypatch, auth__passcode_id_max_attempts=3, auth__passcode_max_attempts=10)
    statuses = [passcode_in(client, "Zz9!Zz9!").status_code for _ in range(4)]
    assert statuses == [401, 401, 401, 429]


def test_switch_off_refuses_everything_and_hides_the_hint(student, monkeypatch):
    client, _factory, codes, _user = student
    overrides(monkeypatch, auth__passcode_login_enabled=False)
    refused = passcode_in(client, GOOD)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.PASSCODE_DISABLED
    assert client.get("/api/auth/remembered").json()["passcode"] is False
    headers = code_login(client, codes, "member@example.test")
    assert set_code(client, headers, GOOD_8).status_code == 403
    assert client.get("/api/auth/passcode", headers=headers).json()["enabled"] is False
    assert get_declaration("auth.passcode_login_enabled").public is True


def test_staff_and_team_accounts_never_get_a_student_passcode(harness):  # noqa: F811
    client, factory, codes = harness
    with factory() as db:
        T.create_missing(db)
        account_id = f"acc_{secrets.token_hex(4)}"
        db.add(M.Account(id=account_id, identifier="campus.staff@example.test", channel="EMAIL", full_name="Staff",
                         role="CAMPUS_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    headers = code_login(client, codes, "campus.staff@example.test")
    refused = set_code(client, headers, GOOD)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == P.STUDENTS_ONLY
    assert client.get("/api/auth/passcode", headers=headers).json()["available"] is False
    # Staff aren't remembered, so no device knows them for a passcode either.
    assert client.get("/api/auth/remembered").json() == {"remembered": False}


def test_an_authenticator_is_still_asked_for_after_the_passcode(student):
    client, factory, _codes, user = student
    with factory() as db:
        twofa_store.start_setup(db, user["id"])
        twofa_store.get(db, user["id"]).enabled = True
        db.commit()
    signed = passcode_in(client, GOOD)
    assert signed.json()["requires2FA"] is True and signed.json()["user"] is None
    assert client.get("/api/auth/session").json()["user"] is None
    with factory() as db:
        assert db.scalar(select(M.TwoFactorPending)).first_factor == "PASSCODE"


def test_audit_rows_never_hold_a_passcode_or_a_typed_address(student):
    client, factory, codes, _user = student
    typed = f"someone.{secrets.token_hex(3)}@example.test"
    stranger = TestClient(app)
    passcode_in(stranger, "Zz9!Zz9!", identifier=typed)
    stranger.close()
    passcode_in(client, "Zz9!Zz9!")
    passcode_in(client, GOOD)
    text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in audits(factory))
    assert GOOD not in text and "Zz9!Zz9!" not in text and typed not in text
    assert {"STUDENT_PASSCODE_SET", "STUDENT_PASSCODE_SIGN_IN_FAILED", "STUDENT_PASSCODE_SIGN_IN",
            "STUDENT_PASSCODE_NEW_DEVICE_REFUSED"} <= {r.action for r in audits(factory)}


# --- the device remembers the last sign-in --------------------------------------

def test_the_device_remembers_an_email_after_signing_in(harness):  # noqa: F811
    client, _factory, codes = harness
    register(client, codes)
    hint = client.get("/api/auth/remembered").json()
    assert hint["remembered"] is True and hint["targetMasked"] == "m•••@example.test" and hint["channel"] == "EMAIL"


def test_the_device_remembers_a_phone_number_masked(harness):  # noqa: F811
    client, factory, codes = harness
    with factory() as db:
        db.add(M.Account(id="acc_phone", identifier="9876501234", channel="WHATSAPP", full_name="Phone Student",
                         role="STUDENT", active=True, profile={}, created_at=time.time()))
        db.commit()
    code_login(client, codes, "9876501234", channel="WHATSAPP")
    hint = client.get("/api/auth/remembered").json()
    assert hint["targetMasked"] == "+91 ••••••1234" and hint["channel"] == "WHATSAPP"
    assert "9876501234" not in str(hint)
    # Only an opaque token reaches the device.
    assert "9876501234" not in (client.cookies.get("sacare_remember") or "")


def test_forget_this_device_ends_the_passcode_there_too(student):
    client, _factory, _codes, _user = student
    assert client.post("/api/auth/remembered/forget").status_code == 200
    assert client.get("/api/auth/remembered").json() == {"remembered": False}
    assert passcode_in(client, GOOD, identifier="member@example.test").json()["detail"]["code"] == P.PASSCODE_NEW_DEVICE


def test_sign_out_without_remember_forgets_the_device(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    sign_out(client, headers)
    assert client.get("/api/auth/remembered").json() == {"remembered": False}


def test_lost_phone_makes_every_other_device_forget_the_account(student):
    client, _factory, codes, user = student
    lost = TestClient(app)
    sign_out(lost, code_login(lost, codes, "member@example.test"), remember=True)
    signed = passcode_in(lost, GOOD)
    assert signed.status_code == 200
    refreshed = lost.post("/api/auth/refresh", headers={"X-CSRF-Token": signed.json()["csrfToken"]})
    sign_out(lost, {"X-CSRF-Token": refreshed.json()["csrfToken"]}, remember=True)
    headers = code_login(client, codes, "member@example.test")
    assert client.post("/api/auth/sessions/revoke-others", headers=headers).status_code == 200
    assert lost.get("/api/auth/remembered").json() == {"remembered": False}
    assert passcode_in(lost, GOOD).json()["detail"]["code"] == P.PASSCODE_NEW_DEVICE
    assert client.get("/api/auth/remembered").json()["remembered"] is True   # this device still does
    lost.close()
    assert user["id"]
