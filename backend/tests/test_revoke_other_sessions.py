"""Lost phone: signing out every other device really ends those sessions."""
from fastapi.testclient import TestClient

from app.main import app
from core import workflow_models as M
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures


def test_other_devices_are_signed_out_and_the_pass_is_cancelled(harness):
    this_phone, factory, codes = harness
    user, headers = register(this_phone, codes, "lost@x.test")
    with factory() as db:
        account = db.get(M.Account, user["id"])
        account.profile = {**account.profile, "digitalIdSecret": "s", "digitalIdIssuedAt": 1.0}
        db.commit()

    old_phone = TestClient(app)
    try:
        login(old_phone, codes, "lost@x.test")
        assert old_phone.get("/api/auth/session").json()["user"]["id"] == user["id"]

        result = this_phone.post("/api/auth/sessions/revoke-others", headers=headers)
        assert result.status_code == 200, result.text
        assert result.json() == {"sessionsRevoked": 1, "passCancelled": True}

        assert old_phone.get("/api/auth/session").json()["user"] is None
        assert this_phone.get("/api/auth/session").json()["user"]["id"] == user["id"]
        with factory() as db:
            assert "digitalIdSecret" not in db.get(M.Account, user["id"]).profile
    finally:
        old_phone.close()


def test_it_needs_a_signed_in_session(harness):
    client, _factory, _codes = harness
    assert client.post("/api/auth/sessions/revoke-others").status_code in (401, 403)
