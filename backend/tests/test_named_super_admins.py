"""Named super admins and retiring the shared one (audit H3).

* Only a super admin creates one; it is audited and raised on the ops feed.
* A named super admin must set up an authenticator whatever the 2FA policy says.
* Its first sign-in through the authenticator step is recorded.
* The shared ``superadmin@`` is retired only from a named account, only after a
  named super admin signed in with TOTP; it is then disabled, signed out and can't
  be rotated back on.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_clinical_fulfilment import make_staff
from test_two_factor_enforcement import _enrol, _held
from test_two_factor_persisted import _code, _first_factor
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixture

from app.main import app
from core import workflow_models as M
from services import team_accounts as T
from services.integration_config import INTEGRATIONS_DB


@pytest.fixture
def no_policy(monkeypatch):
    # The policy names no role, so only the named-account rule can require 2FA.
    monkeypatch.setitem(INTEGRATIONS_DB["twofa"], "enforced_roles", [])


def _root(client, factory, codes):
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    return login(client, codes, "root@example.test")


def _create(client, headers, email="asha@example.test", name="Asha Rao"):
    return client.post("/api/ops/super-admins", json={"email": email, "fullName": name}, headers=headers)


def _named_signs_in_with_totp(codes, email="asha@example.test"):
    """The named person's own device: emailed code, held to set up TOTP, then a real TOTP sign-in."""
    device = TestClient(app)
    headers = login(device, codes, email)
    assert _held(device.get("/api/ops/accounts"))
    secret = _enrol(device, headers)
    device.post("/api/auth/logout", headers=headers)
    step = _first_factor(device, codes, email)
    assert step["requires2FA"] is True
    done = device.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)})
    assert done.status_code == 200, done.text
    return device, {"X-CSRF-Token": done.json()["csrfToken"]}


def test_create_named_super_admin_is_audited_and_needs_totp(harness, no_policy):
    client, factory, codes = harness
    headers = _root(client, factory, codes)
    made = _create(client, headers)
    assert made.status_code == 201, made.text
    item = made.json()["items"][0]
    assert item["fullName"] == "Asha Rao" and item["identifier"] == "asha@example.test"
    assert item["totpSignedInAt"] is None and item["twoFactorEnabled"] is False
    assert _create(client, headers).status_code == 409
    assert _create(client, headers, email="not-an-email").status_code == 422
    with factory() as db:
        account = db.scalar(select(M.Account).where(M.Account.identifier == "asha@example.test"))
        assert account.role == "SUPER_ADMIN" and account.is_team_account is False
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "NAMED_SUPER_ADMIN_CREATED")).actor_id == "root"
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "NAMED_SUPER_ADMIN_CREATED")).severity == "CRITICAL"

    # Even with no role in the policy, the named account is held until it has an authenticator.
    device, _ = _named_signs_in_with_totp(codes)
    device.close()
    with factory() as db:
        named = db.get(M.NamedSuperAdmin, account.id)
        assert named.totp_signed_in_at > 0
    assert client.get("/api/ops/super-admins").json()["items"][0]["totpSignedInAt"]


def test_only_a_super_admin_creates_one(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    assert _create(client, headers).status_code == 403
    assert client.get("/api/ops/super-admins").status_code == 403


def test_retire_shared_waits_for_a_totp_sign_in_then_disables_it_for_good(harness, no_policy):
    client, factory, codes = harness
    with factory() as db:
        T.create_missing(db)
    headers = _root(client, factory, codes)
    assert _create(client, headers).status_code == 201

    # The root account is not a named one: it can't retire.
    refused = client.post("/api/ops/super-admins/retire-shared", json={"confirm": "RETIRE"}, headers=headers)
    assert refused.status_code == 403

    device = TestClient(app)
    try:
        # Named, but nobody has signed in with TOTP yet.
        named_headers = login(device, codes, "asha@example.test")
        secret = _enrol(device, named_headers)
        early = device.post("/api/ops/super-admins/retire-shared", json={"confirm": "RETIRE"}, headers=named_headers)
        assert early.status_code == 409 and early.json()["detail"]["code"] == "NO_NAMED_SUPER_ADMIN_SIGNED_IN_WITH_TOTP"
        assert device.get("/api/ops/super-admins").json()["readyToRetire"] is False

        device.post("/api/auth/logout", headers=named_headers)
        step = _first_factor(device, codes, "asha@example.test")
        done = device.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)})
        named_headers = {"X-CSRF-Token": done.json()["csrfToken"]}
        assert device.get("/api/ops/super-admins").json()["readyToRetire"] is True

        # The confirmation word is required.
        assert device.post("/api/ops/super-admins/retire-shared", json={"confirm": "yes"}, headers=named_headers).status_code == 422
        retired = device.post("/api/ops/super-admins/retire-shared", json={"confirm": "RETIRE"}, headers=named_headers)
        assert retired.status_code == 200, retired.text
        assert retired.json()["shared"] == {"id": "team-superadmin", "identifier": T.TEAM_ACCOUNTS[0].identifier,
                                            "active": False, "retired": True}
    finally:
        device.close()

    with factory() as db:
        shared = db.get(M.Account, "team-superadmin")
        assert shared.active is False
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "TEAM_SUPERADMIN_RETIRED")) is not None
        # The CLI and the screen can't hand it out again.
        with pytest.raises(T.RetiredAccount):
            T.rotate(db, shared, T.CLI_ACTOR)
    rotate = client.post("/api/ops/team-accounts/team-superadmin/rotate", json={}, headers=headers)
    assert rotate.status_code == 409
    row = next(i for i in client.get("/api/ops/team-accounts").json()["items"] if i["id"] == "team-superadmin")
    assert row["retired"] is True and row["active"] is False
