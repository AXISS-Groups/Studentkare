"""B2B invites (plan tier1-auth-password-2026-10-22, amendment b).

Covers: a campus admin invites to their own campus only, a super admin to any; the
team campus and staff roles are out; contacts start unverified and nothing can sign
in to a pending account; values already in use are refused; the temporary password
is shown once and only hashes are stored; the link goes by the chosen channel; the
claim needs the temporary password, a new password of the student's own, an adult
birth date and consent, and only then opens a session; the link's contact is
verified by the claim; wrong temporary passwords lock; an expired, used or
cancelled link gets one answer; resend replaces both; cancel frees the values.
"""
import time

import pytest
from sqlalchemy import select
from test_team_accounts import seed
from test_workflow_api import (  # noqa: F401 — pytest fixture
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    login,
)

from core import workflow_models as M
from core.team_scope import TEAM_CAMPUS
from services import contact_store as C
from services import student_invites as I

CAMPUS = "Partner College"
PHONE = "9988776655"
NEW_PASSWORD = "Monsoon kettle 7!"


@pytest.fixture
def sent(monkeypatch):
    """Messages that would have gone out: (value, channel, text)."""
    messages = []
    monkeypatch.setattr(I, "dispatch_message", lambda value, channel, subject, text, db=None:
                        messages.append((value, channel, text)) or True)
    return messages


def campus_admin(client, factory, codes, campus=CAMPUS):
    _id, email = seed(factory, role="CAMPUS_ADMIN", profile={"university": campus})
    return login(client, codes, email)


def invite(client, headers, **over):
    body = {"fullName": "Ravi Kumar", "rollNumber": "PC-101", "email": "ravi@partner.test", "phone": PHONE,
            "sendBy": "EMAIL", **over}
    return client.post("/api/campus/invites", json=body, headers=headers)


def token_of(sent):
    return sent[-1][2].split("#token=")[1].split()[0]


def claim(client, token, temp, **over):
    body = {"token": token, "tempPassword": temp, "password": NEW_PASSWORD, "dob": "2002-02-02",
            "consent": SIGNUP_CONSENT, **over}
    return client.post("/api/auth/invite/claim", json=body)


def test_campus_admin_invites_to_their_own_campus(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    made = invite(client, headers, university="Some Other College")       # ignored: their own campus
    assert made.status_code == 201, made.text
    row = made.json()
    assert row["university"] == CAMPUS and row["status"] == "PENDING" and row["linkSent"] is True
    temp = row["tempPassword"]
    assert len(temp) == I.TEMP_LENGTH
    assert sent[-1][0] == "ravi@partner.test" and sent[-1][1] == "EMAIL"
    assert "/claim#token=" in sent[-1][2] and temp not in sent[-1][2]      # never in the same message
    with factory() as db:
        stored = db.scalar(select(M.StudentInvite))
        assert temp not in stored.temp_password_hash and token_of(sent) not in stored.token_hash
        account = db.get(M.Account, stored.account_id)
        assert account.profile["invitePending"] is True and account.role == "STUDENT"
        assert all(not c.verified_at for c in C.contacts_of(db, account.id))
    assert temp not in client.get("/api/campus/invites").text              # shown once


def test_nothing_signs_in_to_a_pending_account(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    invite(client, headers)
    client.post("/api/auth/logout", headers=headers)
    before = len(codes)
    # The same answer as any send (audit M5), but no code goes out (checked below).
    assert client.post("/api/auth/otp/send", json={"identifier": "ravi@partner.test", "channel": "EMAIL",
                                                   "intent": "LOGIN"}).status_code == 200
    assert client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP",
                                                   "intent": "LOGIN"}).status_code == 200
    assert len(codes) == before
    assert client.post("/api/auth/password/sign-in", json={"identifier": "ravi@partner.test",
                                                           "password": SIGNUP_PASSWORD}).status_code == 401


def test_super_admin_names_the_campus_and_the_team_campus_is_refused(harness, sent):  # noqa: F811
    client, factory, codes = harness
    _id, email = seed(factory, role="SUPER_ADMIN")
    headers = login(client, codes, email)
    assert invite(client, headers, university=None).status_code == 422
    assert invite(client, headers, university=TEAM_CAMPUS).status_code == 422
    assert invite(client, headers, university="Another College").json()["university"] == "Another College"


def test_other_roles_cant_invite(harness, sent):  # noqa: F811
    client, factory, codes = harness
    _id, email = seed(factory, role="VENDOR")
    assert invite(client, login(client, codes, email)).status_code == 403


def test_values_in_use_are_refused(harness, sent):  # noqa: F811
    client, factory, codes = harness
    seed(factory, identifier="ravi@partner.test")
    headers = campus_admin(client, factory, codes)
    taken = invite(client, headers)
    assert taken.status_code == 409 and taken.json()["detail"]["field"] == "EMAIL"
    assert invite(client, headers, email=None, sendBy="EMAIL").status_code == 422     # the link needs its contact


def test_a_campus_admin_sees_only_their_campus(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    mine = invite(client, headers).json()["id"]
    client.post("/api/auth/logout", headers=headers)
    other = campus_admin(client, factory, codes, campus="Elsewhere")
    assert client.get("/api/campus/invites").json()["items"] == []
    assert client.post(f"/api/campus/invites/{mine}/resend", headers=other).status_code == 404


def test_claim_opens_the_account(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    temp = invite(client, headers).json()["tempPassword"]
    client.post("/api/auth/logout", headers=headers)
    token = token_of(sent)
    looked = client.post("/api/auth/invite/lookup", json={"token": token})
    assert looked.status_code == 200
    assert looked.json()["firstName"] == "Ravi" and looked.json()["university"] == CAMPUS
    claimed = claim(client, token, temp)
    assert claimed.status_code == 200, claimed.text
    user = claimed.json()["user"]
    assert user["email"] == "ravi@partner.test"          # the link's contact, verified by the claim (D-B5)
    assert user["phone"] == ""                           # the other one stays to verify later
    with factory() as db:
        account = db.get(M.Account, user["id"])
        assert "invitePending" not in account.profile and account.profile["dob"] == "2002-02-02"
        assert db.scalar(select(M.ConsentRecord).where(M.ConsentRecord.account_id == account.id)) is not None
        assert db.get(M.AccountPassword, account.id) is not None
    client.post("/api/auth/logout", headers={"X-CSRF-Token": claimed.json()["csrfToken"]})
    assert client.post("/api/auth/password/sign-in", json={"identifier": "ravi@partner.test",
                                                           "password": NEW_PASSWORD}).status_code == 200
    # Used once: the link is gone.
    assert claim(client, token, temp).status_code == 404


@pytest.mark.parametrize(("over", "status"), [
    ({"dob": "2012-01-01"}, 422),                         # under 18
    ({"consent": {**SIGNUP_CONSENT, "purposes": []}}, 422),
    ({"password": "password123"}, 422),
])
def test_the_claim_needs_everything_of_the_students_own(harness, sent, over, status):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    temp = invite(client, headers).json()["tempPassword"]
    client.post("/api/auth/logout", headers=headers)
    assert claim(client, token_of(sent), temp, **over).status_code == status
    assert client.get("/api/auth/session").json()["user"] is None
    assert claim(client, token_of(sent), temp).status_code == 200     # nothing was spent


def test_the_new_password_must_differ_from_the_temporary_one(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    temp = invite(client, headers).json()["tempPassword"]
    client.post("/api/auth/logout", headers=headers)
    same = claim(client, token_of(sent), temp, password=temp)
    assert same.status_code == 422 and same.json()["detail"]["code"] == I.INVITE_SAME_PASSWORD


def test_wrong_temporary_passwords_lock(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    temp = invite(client, headers).json()["tempPassword"]
    client.post("/api/auth/logout", headers=headers)
    for _ in range(5):
        assert claim(client, token_of(sent), "wrongwrong12").status_code == 401
    assert claim(client, token_of(sent), temp).status_code == 401


def test_one_answer_for_unknown_expired_and_cancelled(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    first = invite(client, headers).json()
    first_token = token_of(sent)
    second = invite(client, headers, fullName="Meena", rollNumber="PC-2", email="meena@partner.test", phone=None).json()
    second_token = token_of(sent)
    with factory() as db:
        db.get(M.StudentInvite, first["id"]).expires_at = time.time() - 1
        db.commit()
    assert client.post(f"/api/campus/invites/{second['id']}/cancel", headers=headers).status_code == 200
    answers = [client.post("/api/auth/invite/lookup", json={"token": t}) for t in
               ("x" * 40, first_token, second_token)]
    assert {a.status_code for a in answers} == {404}
    assert len({str(a.json()) for a in answers}) == 1
    # Cancel freed the address: the student can sign up on their own now.
    with factory() as db:
        assert not C.contact_in_use(db, "meena@partner.test")


def test_resend_replaces_the_link_and_the_temporary_password(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    made = invite(client, headers).json()
    old_token, old_temp = token_of(sent), made["tempPassword"]
    again = client.post(f"/api/campus/invites/{made['id']}/resend", headers=headers)
    assert again.status_code == 200 and again.json()["tempPassword"] != old_temp
    client.post("/api/auth/logout", headers=headers)
    assert claim(client, old_token, again.json()["tempPassword"]).status_code == 404
    assert claim(client, token_of(sent), again.json()["tempPassword"]).status_code == 200


def test_whatsapp_link(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    assert invite(client, headers, email=None, sendBy="WHATSAPP").status_code == 201
    assert sent[-1][0] == PHONE and sent[-1][1] == "WHATSAPP"


def test_audit_never_holds_a_password_token_or_contact(harness, sent):  # noqa: F811
    client, factory, codes = harness
    headers = campus_admin(client, factory, codes)
    temp = invite(client, headers).json()["tempPassword"]
    client.post("/api/auth/logout", headers=headers)
    claim(client, token_of(sent), "wrongwrong12")
    claim(client, token_of(sent), temp)
    with factory() as db:
        text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in db.scalars(select(M.WorkflowAudit)).all())
    assert temp not in text and token_of(sent) not in text and "ravi@" not in text and NEW_PASSWORD not in text
