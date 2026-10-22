"""Audit L1: /auth/refresh needs the session's CSRF token and an allowed origin, and a
sign-in can't be kept alive by refreshing past auth.session_absolute_hours."""
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import settings_registry as R
from core import workflow_models as M

REFRESH = "/api/auth/refresh"


def test_refresh_without_the_csrf_token_is_refused(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes, "me@x.test")
    assert client.post(REFRESH).status_code == 403                                   # cross-site POST, no token
    assert client.post(REFRESH, headers={"X-CSRF-Token": "forged"}).status_code == 403
    assert client.post(REFRESH, headers={**headers, "Origin": "https://evil.example"}).status_code == 403
    ok = client.post(REFRESH, headers=headers)
    assert ok.status_code == 200 and ok.json()["csrfToken"] != headers["X-CSRF-Token"]


def test_refresh_keeps_the_sign_in_time_and_stops_at_the_absolute_lifetime(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "me@x.test")
    with factory() as db:
        signed_in = db.query(M.Session).filter_by(account_id=user["id"]).one().signed_in_at
    assert signed_in > 0
    headers = {"X-CSRF-Token": client.post(REFRESH, headers=headers).json()["csrfToken"]}
    with factory() as db:
        assert db.query(M.Session).filter_by(account_id=user["id"]).one().signed_in_at == signed_in
        # The sign-in was longer ago than the absolute lifetime.
        hours = R.get_declaration("auth.session_absolute_hours").default
        db.query(M.Session).filter_by(account_id=user["id"]).one().signed_in_at = signed_in - hours * 3600 - 1
        db.commit()
    assert client.post(REFRESH, headers=headers).status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None
