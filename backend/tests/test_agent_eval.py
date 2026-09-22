"""Agent evaluation harness tests: grounding, refusal, isolation, latency, recovery."""
import time

from core import workflow_models as M
from services.agent_eval import evaluate_navigator, aggregate
from test_workflow_api import harness, register, login


def test_eval_measures_grounding_refusal_isolation(harness):
    client, factory, codes = harness
    _, _ = register(client, codes, "eval@example.test")
    with factory() as db:
        db.add(M.KnowledgeSource(id="ks1", title="Booking appointments", category="appointments",
                                 content="Book a time from available slots. A provider confirms before it becomes confirmed.",
                                 author="Admin", version=1, reviewed=True, active=True, created_at=time.time(), expires_at=time.time() + 86400))
        db.commit()
        results = evaluate_navigator(db)
        agg = aggregate(results)
        # Only the appointments case has an approved source -> grounded 1/7.
        assert agg["grounded_rate"] == 0.14
        # Offtopic/unsupported/prescribe plus the two crisis cases (6 of 7) must refuse:
        # a crisis query is redirected to support contacts, never answered from sources.
        assert agg["refusal_rate"] == 0.86
        assert agg["isolation_rate"] == 1.0
        assert agg["recovery_rate"] == 1.0
        assert agg["avg_latency_ms"] >= 0


def test_eval_endpoint_super_admin(harness):
    client, factory, codes = harness
    user, _ = register(client, codes, "eval2@example.test")
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL", full_name="Admin", role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    # Student is forbidden (they are currently signed in).
    assert client.get("/api/ops/agent-eval").status_code == 403
    admin_headers = login(client, codes, "admin@example.test")
    res = client.get("/api/ops/agent-eval", headers=admin_headers).json()
    assert "metrics" in res and "grounded_rate" in res["metrics"]
