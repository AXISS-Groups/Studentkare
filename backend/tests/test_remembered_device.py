"""Opt-in "remember me" at sign-out: a masked hint and a shortcut to a code, never a session."""
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M


def sign_out(client, headers, **body):
    response = client.post("/api/auth/logout", headers=headers, json=body or None)
    assert response.status_code == 200, response.text
    return response


def test_not_remembered_by_default(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    sign_out(client, headers)
    assert client.get("/api/auth/remembered").json() == {"remembered": False}
    with factory() as db:
        assert db.scalar(select(M.RememberedDevice)) is None


def test_remembered_device_shows_only_a_masked_hint(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    response = sign_out(client, headers, remember=True, lastRoute="records")
    assert "HttpOnly" in response.headers["set-cookie"]
    hint = client.get("/api/auth/remembered").json()
    assert hint == {"remembered": True, "targetMasked": "m•••@example.test", "channel": "EMAIL", "lastRoute": "records",
                    "passcode": False}
    # Remembering is not a session (guardrail 2).
    assert client.get("/api/auth/session").json()["user"] is None
    assert client.get("/api/health/readings").status_code == 401


def test_continue_as_still_needs_the_code(harness):
    client, _, codes = harness
    user, headers = register(client, codes)
    sign_out(client, headers, remember=True, lastRoute="health")
    sent = client.post("/api/auth/remembered/send")
    assert sent.status_code == 200, sent.text
    assert sent.json()["targetMasked"] == "m•••@example.test"
    assert client.get("/api/auth/session").json()["user"] is None
    assert client.post("/api/auth/otp/verify", json={"otp": "000000"}).status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None
    verified = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    assert verified.status_code == 200, verified.text
    assert verified.json()["user"]["id"] == user["id"]


def test_forget_and_a_later_no_both_clear_the_device(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    sign_out(client, headers, remember=True)
    assert client.post("/api/auth/remembered/forget").status_code == 200
    assert client.get("/api/auth/remembered").json() == {"remembered": False}
    assert client.post("/api/auth/remembered/send").status_code == 404

    client.post("/api/auth/otp/send", json={"identifier": "member@example.test", "channel": "EMAIL", "intent": "LOGIN"})
    headers = {"X-CSRF-Token": client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]}
    sign_out(client, headers, remember=True)
    client.post("/api/auth/otp/send", json={"identifier": "member@example.test", "channel": "EMAIL", "intent": "LOGIN"})
    headers = {"X-CSRF-Token": client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]}
    sign_out(client, headers, remember=False)
    assert client.get("/api/auth/remembered").json() == {"remembered": False}
    with factory() as db:
        assert db.scalar(select(M.RememberedDevice)) is None


def test_deactivated_account_is_not_offered(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    sign_out(client, headers, remember=True)
    with factory() as db:
        db.get(M.Account, user["id"]).active = False
        db.commit()
    assert client.get("/api/auth/remembered").json() == {"remembered": False}
    assert client.post("/api/auth/remembered/send").status_code == 404


def test_last_route_must_be_a_route_name(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    for bad in ("https://evil.example", "//evil.example", "/records", "../admin", "a" * 61):
        assert client.post("/api/auth/logout", headers=headers, json={"remember": True, "lastRoute": bad}).status_code == 422


def test_erasure_collects_the_remembered_device(harness):
    """DPDP erasure follows foreign keys; the remembered device must go with the account."""
    from services import erasure
    client, factory, codes = harness
    user, headers = register(client, codes)
    sign_out(client, headers, remember=True)
    with factory() as db:
        rows = erasure._collect(db, db.get(M.Account, user["id"]))
    assert len(rows.get("care_remembered_devices", [])) == 1
