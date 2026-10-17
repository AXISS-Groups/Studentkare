"""A super admin resets another account's lost authenticator.

The reset removes the account's 2FA secret, ends its sessions and any second
step in flight, is audited with the reason (never the secret), and tells the
account holder. A role that must use 2FA comes back held until it re-enrols.
"""
import pytest
from fastapi.testclient import TestClient
from test_clinical_fulfilment import make_staff
from test_two_factor_enforcement import _enrol, _held
from test_two_factor_persisted import _code, _first_factor
from test_workflow_api import harness, login  # noqa: F401 — pytest fixtures

from app.main import app
from core import workflow_models as M
from services.integration_config import INTEGRATIONS_DB

REASON = "Lost phone, identity confirmed on a video call"


@pytest.fixture
def policy(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB["twofa"], "enforced_roles", ["SUPER_ADMIN"])


def _admin(client, codes):
    """A super admin who has 2FA on (the policy holds them otherwise) and a full session."""
    headers = login(client, codes, "root@example.test")
    secret = _enrol(client, headers)
    client.post("/api/auth/logout", headers=headers)
    step = _first_factor(client, codes, "root@example.test")
    done = client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)})
    assert done.status_code == 200, done.text
    return {"X-CSRF-Token": done.json()["csrfToken"]}


def _reset(client, headers, account_id, reason=REASON):
    return client.post(f"/api/ops/accounts/{account_id}/2fa/reset", json={"reason": reason}, headers=headers)


def test_reset_removes_2fa_ends_sessions_audits_and_notifies(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_staff(factory, "boss", "SUPER_ADMIN", "boss@example.test")

    # The target enrols and keeps a signed-in session on another device.
    target = TestClient(app)
    try:
        target_headers = login(target, codes, "boss@example.test")
        secret = _enrol(target, target_headers)
        assert target.get("/api/admin/integrations").status_code == 200
        pending = _first_factor(client, codes, "boss@example.test")
        assert pending["requires2FA"] is True

        headers = _admin(client, codes)
        listed = {i["id"]: i for i in client.get("/api/ops/accounts?limit=50").json()["items"]}
        assert listed["boss"]["twoFactorEnabled"] is True

        reset = _reset(client, headers, "boss")
        assert reset.status_code == 200, reset.text
        assert reset.json()["setupRequired"] is True and reset.json()["sessionsEnded"] >= 1
        assert secret not in reset.text

        # Their session is gone, and the second step that was in flight can't finish.
        assert target.get("/api/auth/session").json()["user"] is None
        late = client.post("/api/auth/2fa/challenge", json={"tempToken": pending["tempToken"], "token": _code(secret, 1)})
        assert late.status_code == 401
    finally:
        target.close()

    with factory() as db:
        assert db.get(M.TwoFactorSecret, "boss") is None
        assert db.query(M.TwoFactorPending).filter_by(account_id="boss").count() == 0
        assert db.query(M.Session).filter_by(account_id="boss").count() == 0
        audit = db.query(M.WorkflowAudit).filter_by(action="TWO_FACTOR_RESET").one()
        assert (audit.actor_id, audit.resource_id) == ("root", "boss")
        event = db.query(M.OpsEvent).filter_by(kind="TWO_FACTOR_RESET").one()
        assert REASON in event.summary and secret not in event.summary
        assert (event.actor_id, event.subject_id, event.severity) == ("root", "boss", "CRITICAL")
        notice = db.query(M.OutboxEvent).filter_by(event_type="TWO_FACTOR_RESET", account_id="boss").one()
        assert "reset" in notice.payload["summary"] and secret not in str(notice.payload)
        # The reason is for the audit trail, not the notification.
        assert REASON not in str(notice.payload)

    listed = {i["id"]: i for i in client.get("/api/ops/accounts?limit=50").json()["items"]}
    assert listed["boss"]["twoFactorEnabled"] is False


def test_an_enforced_role_signs_in_held_after_a_reset_until_it_re_enrols(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_staff(factory, "boss", "SUPER_ADMIN", "boss@example.test")
    target_headers = login(client, codes, "boss@example.test")
    _enrol(client, target_headers)
    client.post("/api/auth/logout", headers=target_headers)

    headers = _admin(client, codes)
    assert _reset(client, headers, "boss").status_code == 200
    client.post("/api/auth/logout", headers=headers)

    # Only the one-time code now, and the session is held to enrolment.
    step = _first_factor(client, codes, "boss@example.test")
    assert step.get("requires2FA") is not True
    assert step["user"]["twoFactorSetupRequired"] is True
    assert _held(client.get("/api/admin/integrations"))
    _enrol(client, {"X-CSRF-Token": step["csrfToken"]})
    assert client.get("/api/admin/integrations").status_code == 200


def test_reset_is_refused_on_yourself_without_a_reason_and_for_non_admins(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_staff(factory, "shop", "VENDOR", "shop@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    headers = _admin(client, codes)

    assert _reset(client, headers, "root").status_code == 403
    assert _reset(client, headers, "shop", reason="short").status_code == 422
    assert _reset(client, headers, "shop", reason=" " * 12).status_code == 422
    assert _reset(client, headers, "shop", reason="x" * 501).status_code == 422
    assert _reset(client, headers, "nobody").status_code == 404
    # Nothing to reset is said plainly, not reported as success.
    assert _reset(client, headers, "shop").status_code == 409
    with factory() as db:
        assert db.get(M.TwoFactorSecret, "root") is not None
        assert db.query(M.WorkflowAudit).filter_by(action="TWO_FACTOR_RESET").count() == 0
    client.post("/api/auth/logout", headers=headers)

    # Another role can't reach it at all.
    vendor = login(client, codes, "shop@example.test")
    assert _reset(client, vendor, "doc").status_code == 403
    client.post("/api/auth/logout", headers=vendor)
    assert client.post("/api/ops/accounts/doc/2fa/reset", json={"reason": REASON}).status_code in (401, 403)
