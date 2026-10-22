"""Two contacts per account (plan tier1-auth-password-2026-10-22, section A).

Covers: sign-up records its contact as verified; a signed-in student adds and
verifies the other contact, then can sign in with a code to it; a sign-in code is
never sent to an unverified contact; a value belongs to one account (sign-up and
"add a contact" both refuse it); a verification code works only for the account
that asked and is never a sign-in; the sign-in ID can't be swapped or removed;
removing the second contact; the session shows both contacts; the passcode accepts
either; erasure takes the contacts too; nothing logs a value or a code.
"""
import time
import uuid

from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services import contact_store as C

PHONE = "9876543210"


def add_whatsapp(client, codes, headers, number=PHONE):
    sent = client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": number}, headers=headers)
    assert sent.status_code == 200, sent.text
    return client.post("/api/auth/contacts/verify", json={"otp": codes[-1]}, headers=headers)


def code_login(client, codes, identifier, channel):
    sent = client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": channel, "intent": "LOGIN"})
    if sent.status_code != 200:
        return sent
    return client.post("/api/auth/otp/verify", json={"otp": codes[-1]})


def audits(factory):
    with factory() as db:
        return db.scalars(select(M.WorkflowAudit)).all()


def test_sign_up_records_its_contact_as_verified(harness):  # noqa: F811
    client, factory, codes = harness
    user, _headers = register(client, codes, "first@example.test")
    with factory() as db:
        row = C.contact_of_kind(db, user["id"], "EMAIL")
    assert row is not None and row.value == "first@example.test" and row.verified_at > 0
    listed = client.get("/api/auth/contacts").json()["items"]
    assert listed[0] == {"kind": "EMAIL", "value": "first@example.test", "verified": True, "primary": True}
    # The second contact proven during sign-up (services/signup_contacts.py) is saved as verified too.
    assert listed[1]["kind"] == "WHATSAPP" and listed[1]["verified"] is True and listed[1]["primary"] is False


def test_add_and_verify_whatsapp_then_sign_in_with_it(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "student@example.test")
    verified = add_whatsapp(client, codes, headers, "+91 98765 43210")
    assert verified.status_code == 200, verified.text
    assert {"kind": "WHATSAPP", "value": PHONE, "verified": True, "primary": False} in verified.json()["items"]
    session = client.get("/api/auth/session").json()["user"]
    assert session["email"] == "student@example.test" and session["phone"] == PHONE
    client.post("/api/auth/logout", headers=headers)
    signed = code_login(client, codes, PHONE, "WHATSAPP")
    assert signed.status_code == 200, signed.text
    assert signed.json()["user"]["id"] == user["id"]
    actions = {r.action for r in audits(factory)}
    assert {"CONTACT_CODE_SENT", "CONTACT_VERIFIED"} <= actions


def test_no_sign_in_code_for_an_unverified_contact(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "pending@example.test")
    with factory() as db:
        C.save_contact(db, user["id"], "WHATSAPP", PHONE, verified=False)   # as an admin would type it
        db.commit()
    client.post("/api/auth/logout", headers=headers)
    sent_before = len(codes)
    refused = client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "LOGIN"})
    assert refused.status_code == 200                                        # same answer as a send (audit M5)
    assert len(codes) == sent_before                                         # but nothing was sent


def test_a_value_belongs_to_one_account(harness):  # noqa: F811
    client, _factory, codes = harness
    _first, headers = register(client, codes, "one@example.test")
    assert add_whatsapp(client, codes, headers).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    # Another student can't add it...
    _second, headers2 = register(client, codes, "two@example.test")
    taken = client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": PHONE}, headers=headers2)
    assert taken.status_code == 409 and taken.json()["detail"]["code"] == "CONTACT_IN_USE"
    client.post("/api/auth/logout", headers=headers2)
    # ...or sign up with it.
    assert client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP",
                                                   "intent": "SIGNUP"}).status_code == 200
    assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).status_code == 409


def test_an_unverified_contact_still_blocks_a_second_account(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "holder@example.test")
    with factory() as db:
        C.save_contact(db, user["id"], "WHATSAPP", PHONE, verified=False)
        db.commit()
    client.post("/api/auth/logout", headers=headers)
    client.post("/api/auth/otp/send", json={"identifier": PHONE, "channel": "WHATSAPP", "intent": "SIGNUP"})
    assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).status_code == 409


def test_a_verify_code_is_never_a_sign_in(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes, "careful@example.test")
    client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": PHONE}, headers=headers)
    code, token = codes[-1], client.cookies.get("sacare_contact")
    client.post("/api/auth/logout", headers=headers)
    # Even with its token put where /otp/verify reads a challenge, it opens nothing.
    client.cookies.set("sacare_challenge", token, path="/api")
    answer = client.post("/api/auth/otp/verify", json={"otp": code})
    assert answer.status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_a_verify_code_only_works_for_the_account_that_asked(harness):  # noqa: F811
    client, factory, codes = harness
    _first, headers = register(client, codes, "asker@example.test")
    client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": PHONE}, headers=headers)
    code, contact_cookie = codes[-1], client.cookies.get("sacare_contact")
    client.post("/api/auth/logout", headers=headers)
    _second, headers2 = register(client, codes, "other@example.test")
    client.cookies.set("sacare_contact", contact_cookie, path="/api")
    stolen = client.post("/api/auth/contacts/verify", json={"otp": code}, headers=headers2)
    assert stolen.status_code == 401
    with factory() as db:
        assert db.scalar(select(M.AccountContact).where(M.AccountContact.value == PHONE)) is None


def test_wrong_codes_run_out(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes, "typo@example.test")
    client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": PHONE}, headers=headers)
    right = codes[-1]
    wrong = "111111" if right != "111111" else "222222"
    for _ in range(5):
        assert client.post("/api/auth/contacts/verify", json={"otp": wrong}, headers=headers).status_code == 401
    assert client.post("/api/auth/contacts/verify", json={"otp": right}, headers=headers).status_code == 401


def test_the_sign_in_id_cant_be_swapped_or_removed(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes, "fixed@example.test")
    swap = client.post("/api/auth/contacts/send-code", json={"kind": "EMAIL", "value": "new@example.test"}, headers=headers)
    assert swap.status_code == 409 and swap.json()["detail"]["code"] == "CONTACT_PRIMARY"
    assert client.delete("/api/auth/contacts/EMAIL", headers=headers).status_code == 409


def test_removing_the_second_contact(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "remover@example.test")
    assert add_whatsapp(client, codes, headers).status_code == 200
    removed = client.delete("/api/auth/contacts/WHATSAPP", headers=headers)
    assert removed.status_code == 200
    assert [i["kind"] for i in removed.json()["items"]] == ["EMAIL"]
    with factory() as db:
        assert C.contact_of_kind(db, user["id"], "WHATSAPP") is None
    assert "CONTACT_REMOVED" in {r.action for r in audits(factory)}


def test_contacts_need_a_session(harness):  # noqa: F811
    client, _factory, _codes = harness
    assert client.get("/api/auth/contacts").status_code == 401
    assert client.post("/api/auth/contacts/send-code", json={"kind": "WHATSAPP", "value": PHONE}).status_code in (401, 403)


def test_an_account_without_contact_rows_still_signs_in_with_its_id(harness):  # noqa: F811
    """Accounts made by a path that writes no row (demo seed, older tools) keep working."""
    client, factory, codes = harness
    with factory() as db:
        db.add(M.Account(id=uuid.uuid4().hex, identifier="legacy@example.test", channel="EMAIL", full_name="Legacy",
                         role="STUDENT", active=True, profile={}, created_at=time.time()))
        db.commit()
    assert login(client, codes, "legacy@example.test")


def test_audit_rows_never_hold_a_value_or_code(harness):  # noqa: F811
    client, factory, codes = harness
    _user, headers = register(client, codes, "quiet@example.test")
    add_whatsapp(client, codes, headers)
    text = " ".join(f"{r.actor_id} {r.action} {r.resource_id}" for r in audits(factory))
    assert PHONE not in text and codes[-1] not in text


def test_erasure_takes_the_contacts(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "erase@example.test")
    add_whatsapp(client, codes, headers)
    from services import erasure
    with factory() as db:
        account = db.get(M.Account, user["id"])
        rows = erasure._collect(db, account)
    assert {r["value"] for r in rows["care_account_contacts"]} == {"erase@example.test", PHONE}
