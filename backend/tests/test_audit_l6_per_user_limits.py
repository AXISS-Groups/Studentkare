"""Audit L6: Agent Ayush has a per-account limit and /inquiries a per-sender one."""
import time

from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import settings_registry as R
from core import workflow_models as M
from services import agent_ayush

INQUIRY = {"organization": "Some College", "email": "dean@college.example", "seats": 100, "consent": True}


def test_ayush_questions_are_limited_per_account(harness, monkeypatch):  # noqa: F811
    client, factory, codes = harness
    monkeypatch.setattr(agent_ayush, "ask", lambda db, question, **kw: {"answered": False})
    with factory() as db:
        db.merge(M.SettingOverride(key="ai.ayush_questions_per_account_per_hour", value=5, updated_by="t",
                                   updated_at=time.time()))
        db.commit()
    R.reset_cache()
    try:
        _user, headers = register(client, codes, "asker@x.test")
        statuses = [client.post("/api/agents/ayush/ask", headers=headers, json={"question": "hi"}).status_code
                    for _ in range(6)]
        assert statuses == [200] * 5 + [429]
    finally:
        R.reset_cache()


def test_inquiries_are_limited_per_email_and_per_network(harness):  # noqa: F811
    client, _factory, _codes = harness
    statuses = [client.post("/api/billing/inquiries", json=INQUIRY).status_code for _ in range(4)]
    assert statuses == [201, 201, 201, 429]
    # Other senders from the same network address, until its hourly ceiling (10
    # attempts, the four above included).
    more = [client.post("/api/billing/inquiries", json={**INQUIRY, "email": f"p{n}@x.example"}).status_code for n in range(7)]
    assert more == [201] * 6 + [429]
