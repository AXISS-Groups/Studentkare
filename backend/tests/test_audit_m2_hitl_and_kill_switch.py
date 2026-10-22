"""Audit M2: held AI actions and the medical audit trail are the super admin's alone,
and the AI kill switch is persisted in the settings registry and stops llm_gateway."""
import time

import pytest
from test_workflow_api import harness, login  # noqa: F401 — pytest fixtures

from core import settings_registry as R
from core import workflow_models as M
from services import llm_gateway


def staff(factory, account_id, role, kind=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@x.test", channel="EMAIL", full_name=account_id,
                         role=role, active=True, profile={}, created_at=time.time(), partner_kind=kind))
        db.commit()


@pytest.mark.parametrize(("role", "kind"), [("VENDOR", "PHARMACY"), ("NMC_DOCTOR", ""), ("CAMPUS_ADMIN", "")])
def test_partners_and_other_staff_cannot_read_or_release_held_actions(harness, role, kind):  # noqa: F811
    client, factory, codes = harness
    staff(factory, "someone", role, kind)
    headers = login(client, codes, "someone@x.test")
    assert client.get("/api/ops/approvals", headers=headers).status_code == 403
    assert client.post("/api/ops/approve-action", headers=headers, json={"actionId": "a"}).status_code == 403
    assert client.get("/api/v1/ops/audit-trail", headers=headers).status_code == 403


def test_the_super_admin_reads_them(harness):  # noqa: F811
    client, factory, codes = harness
    staff(factory, "root", "SUPER_ADMIN")
    headers = login(client, codes, "root@x.test")
    assert client.get("/api/ops/approvals", headers=headers).status_code == 200
    assert client.get("/api/v1/ops/audit-trail", headers=headers).status_code == 200


def test_the_kill_switch_is_persisted_and_stops_every_model_call(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    calls = []
    monkeypatch.setattr(llm_gateway, "_transport", lambda prompt, system, **kw: calls.append(prompt) or "ok")
    monkeypatch.setattr(llm_gateway, "is_configured", lambda: True)
    # setting() without a session reads through the app's own session factory.
    monkeypatch.setattr("services.db_sql.SessionLocal", factory)
    R.reset_cache()
    staff(factory, "root", "SUPER_ADMIN")
    headers = login(client, codes, "root@x.test")

    rule = next(iter(llm_gateway.CONSTITUTION_RULES))
    assert llm_gateway.invoke("hello there", rule_id=rule) == "ok"

    assert client.post("/api/v1/ops/kill-switch", headers=headers).status_code == 200
    with factory() as db:
        row = db.get(M.SettingOverride, "ai.kill_switch_active")
        assert row is not None and row.value is True                       # stored, not process memory
        assert db.query(M.SettingOverrideHistory).filter_by(key="ai.kill_switch_active").count() == 1
    # A fresh process (cache emptied) still sees it.
    R.reset_cache()
    with pytest.raises(llm_gateway.ModelUnavailable):
        llm_gateway.invoke("hello again", rule_id=rule)
    assert calls == ["hello there"]

    assert client.post("/api/v1/ops/kill-switch/reset", headers=headers).status_code == 200
    R.reset_cache()
    assert llm_gateway.invoke("back", rule_id=rule) == "ok"
    R.reset_cache()
