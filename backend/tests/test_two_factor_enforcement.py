"""Roles that must use two-step sign-in are held to setting it up, and nothing else.

Policy: an account whose role is in `twofa.enforced_roles` and has not turned
2FA on still signs in, but the session only reaches 2FA status/setup/enable and
sign-out. Every other route answers 403 TWO_FACTOR_SETUP_REQUIRED until it is
on. A policy that can't be read is read as SUPER_ADMIN (fail closed).
"""
import pytest
from test_clinical_fulfilment import make_staff
from test_two_factor_persisted import _code, _first_factor
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import workflow_auth
from services.integration_config import INTEGRATIONS_DB

HELD = "TWO_FACTOR_SETUP_REQUIRED"


@pytest.fixture
def policy(monkeypatch):
    def set_roles(value):
        monkeypatch.setitem(INTEGRATIONS_DB["twofa"], "enforced_roles", value)
    set_roles(["SUPER_ADMIN"])
    return set_roles


def _held(response):
    return response.status_code == 403 and response.json()["detail"]["code"] == HELD


def _enrol(client, headers):
    setup = client.post("/api/auth/2fa/setup", headers=headers)
    assert setup.status_code == 200, setup.text
    secret = setup.json()["secret"]
    enabled = client.post("/api/auth/2fa/enable", json={"token": _code(secret, -1)}, headers=headers)
    assert enabled.status_code == 200, enabled.text
    return secret


def test_an_enforced_role_without_2fa_is_held_to_setup_until_it_is_on(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "boss", "SUPER_ADMIN", "boss@example.test")

    step = _first_factor(client, codes, "boss@example.test")
    assert step["user"]["twoFactorSetupRequired"] is True
    headers = {"X-CSRF-Token": step["csrfToken"]}
    assert client.get("/api/auth/session").json()["user"]["twoFactorSetupRequired"] is True

    # Nothing but the set-up flow: admin, member and consent routes all refuse.
    assert _held(client.get("/api/admin/integrations"))
    assert _held(client.get("/api/health/metrics"))
    assert _held(client.get("/api/auth/consents"))
    assert _held(client.post("/api/auth/sessions/revoke-others", headers=headers))
    assert client.get("/api/auth/2fa/status").json() == {"enabled": False, "required": True, "setupRequired": True}

    setup = client.post("/api/auth/2fa/setup", headers=headers)
    assert setup.status_code == 200, setup.text
    body = setup.json()
    assert body["otpauthUrl"].startswith("otpauth://totp/") and body["secret"] in body["otpauthUrl"]
    assert body["qrMatrix"] and set("".join(body["qrMatrix"])) <= {"0", "1"}
    assert setup.headers["cache-control"] == "no-store"

    assert client.post("/api/auth/2fa/enable", json={"token": "000000"}, headers=headers).status_code == 400
    assert _held(client.get("/api/admin/integrations"))
    assert client.post("/api/auth/2fa/enable", json={"token": _code(body["secret"], -1)}, headers=headers).status_code == 200

    # The same session is released the moment 2FA is on.
    assert client.get("/api/admin/integrations").status_code == 200
    assert client.get("/api/auth/session").json()["user"]["twoFactorSetupRequired"] is False
    with factory() as db:
        audit = db.query(M.WorkflowAudit).filter_by(action="TWO_FACTOR_ENABLED").one()
        assert audit.resource_id == "boss" and body["secret"] not in (audit.resource_id + audit.action)


def test_a_held_session_can_still_sign_out(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "boss2", "SUPER_ADMIN", "boss2@example.test")
    headers = login(client, codes, "boss2@example.test")
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/session").json()["user"] is None


def test_an_enrolled_enforced_role_signs_in_with_both_steps_and_has_full_access(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "boss3", "SUPER_ADMIN", "boss3@example.test")
    headers = login(client, codes, "boss3@example.test")
    secret = _enrol(client, headers)
    client.post("/api/auth/logout", headers=headers)

    step = _first_factor(client, codes, "boss3@example.test")
    assert step["requires2FA"] is True and step["user"] is None
    done = client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)})
    assert done.status_code == 200, done.text
    assert done.json()["user"]["twoFactorSetupRequired"] is False
    headers = {"X-CSRF-Token": done.json()["csrfToken"]}
    assert client.get("/api/admin/integrations").status_code == 200

    # The secret is never handed out again, and the role can't switch 2FA off.
    again = client.post("/api/auth/2fa/setup", headers=headers)
    assert again.status_code == 409 and secret not in again.text
    off = client.post("/api/auth/2fa/disable", json={"token": _code(secret, 1)}, headers=headers)
    assert off.status_code == 403 and off.json()["detail"]["code"] == "TWO_FACTOR_REQUIRED_FOR_ROLE"
    with factory() as db:
        assert db.get(M.TwoFactorSecret, "boss3").enabled is True


def test_a_role_outside_the_list_is_not_held_and_a_role_inside_it_is(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "shop", "VENDOR", "shop@example.test")
    make_staff(factory, "dean", "CAMPUS_ADMIN", "dean@example.test")

    login(client, codes, "shop@example.test")
    assert client.get("/api/auth/session").json()["user"]["twoFactorSetupRequired"] is False
    assert client.get("/api/health/metrics").status_code == 200

    policy(["SUPER_ADMIN", "CAMPUS_ADMIN"])
    login(client, codes, "dean@example.test")
    assert _held(client.get("/api/health/metrics"))


def test_turning_the_policy_on_holds_sessions_that_already_exist(harness, policy):
    client, factory, codes = harness
    make_staff(factory, "boss4", "SUPER_ADMIN", "boss4@example.test")
    policy([])
    login(client, codes, "boss4@example.test")
    assert client.get("/api/admin/integrations").status_code == 200
    policy(["SUPER_ADMIN"])
    assert _held(client.get("/api/admin/integrations"))


@pytest.mark.parametrize("broken", [None, 42, {"role": "SUPER_ADMIN"}, ["SUPER_ADMIN", 7], "missing", "no-section"])
def test_a_policy_that_cannot_be_read_holds_super_admin(harness, monkeypatch, broken):
    client, factory, codes = harness
    if broken == "no-section":
        monkeypatch.delitem(INTEGRATIONS_DB, "twofa")
    elif broken == "missing":
        monkeypatch.setitem(INTEGRATIONS_DB, "twofa", {"issuer": "StudentKare"})
    else:
        monkeypatch.setitem(INTEGRATIONS_DB["twofa"], "enforced_roles", broken)
    assert workflow_auth.two_factor_enforced_roles() == frozenset({"SUPER_ADMIN"})

    make_staff(factory, "boss5", "SUPER_ADMIN", "boss5@example.test")
    login(client, codes, "boss5@example.test")
    assert _held(client.get("/api/admin/integrations"))


def test_a_comma_separated_policy_is_read_as_a_list(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB["twofa"], "enforced_roles", " super_admin, CAMPUS_ADMIN ,")
    assert workflow_auth.two_factor_enforced_roles() == frozenset({"SUPER_ADMIN", "CAMPUS_ADMIN"})


def test_a_student_can_turn_2fa_on_and_off_with_a_code(harness, policy):
    client, factory, codes = harness
    _user, headers = register(client, codes, "learner@example.test")
    assert client.get("/api/auth/2fa/status").json() == {"enabled": False, "required": False, "setupRequired": False}
    secret = _enrol(client, headers)
    assert client.get("/api/auth/2fa/status").json()["enabled"] is True

    assert client.post("/api/auth/2fa/disable", json={"token": "000000"}, headers=headers).status_code == 400
    assert client.get("/api/auth/2fa/status").json()["enabled"] is True
    off = client.post("/api/auth/2fa/disable", json={"token": _code(secret)}, headers=headers)
    assert off.status_code == 200, off.text
    assert client.get("/api/auth/2fa/status").json()["enabled"] is False
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(action="TWO_FACTOR_DISABLED").count() == 1


def test_enable_needs_setup_first_and_a_csrf_token(harness, policy):
    client, factory, codes = harness
    _user, headers = register(client, codes, "learner2@example.test")
    assert client.post("/api/auth/2fa/enable", json={"token": "123456"}, headers=headers).status_code == 400
    assert client.post("/api/auth/2fa/setup").status_code == 403
