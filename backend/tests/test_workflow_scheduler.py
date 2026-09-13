"""Durable workflow scheduler and honest agent-status regression tests."""
import time

from sqlalchemy import select
from fastapi.testclient import TestClient

from main import app
from core import workflow_models as M
from services.workflow_scheduler import ensure_scheduled_jobs, workflow_scheduler
from test_workflow_api import harness, register  # shared isolated-database fixture


def test_scheduled_jobs_are_durable_and_run_due(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    with factory() as db:
        result = ensure_scheduled_jobs(db)
        assert result["created"] >= 1
        assert result["interval_seconds"] == 7200
        job = db.scalar(select(M.ScheduledJob).where(M.ScheduledJob.key == "integration_health"))
        assert job is not None
        assert job.enabled is True
        assert job.last_status == "NEVER_RUN"

    # Run due jobs now; at least the integration health job runs to a real outcome.
    with factory() as db:
        outcomes = workflow_scheduler.run_due_jobs(db)
        assert "integration_health" in outcomes
        job = db.scalar(select(M.ScheduledJob).where(M.ScheduledJob.key == "integration_health"))
        assert job.last_status in ("SUCCESS", "FAILED")
        assert job.last_run_at > 0


def test_integration_health_never_claims_online_when_unconfigured(harness, monkeypatch):
    client, factory, codes = harness
    _, headers = register(client, codes)
    # Force no external providers so nothing can be reported as online.
    monkeypatch.setenv("OPENWA_BASE_URL", "")
    monkeypatch.setenv("POSTAL_API_URL", "")
    monkeypatch.setenv("POSTHOG_ENABLED", "false")
    monkeypatch.setenv("FIREBASE_ENABLED", "false")
    with factory() as db:
        summary = workflow_scheduler.run_job_now(db, "integration_health")["summary"]
    checks = summary["checks"]
    assert any(c["name"] == "messaging_openwa" for c in checks)
    for c in checks:
        # Never fabricate 'online' for something unconfigured/unreachable.
        if not c["configured"]:
            assert c["status"] != "online"


def test_agent_status_is_derived_not_fabricated(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    with factory() as db:
        ensure_scheduled_jobs(db)
        workflow_scheduler.run_job_now(db, "integration_health")
    res = client.get("/api/agents/live-status", headers=headers)
    assert res.status_code == 200
    agents = res.json()["agents"]
    assert len(agents) >= 1
    integration = next(a for a in agents if a["key"] == "integration_health")
    # Derived from the durable schedule, never hard-coded 'ACTIVE_ONLINE'.
    assert integration["status"] in ("OPERATIONAL", "FAILED", "SCHEDULED", "PAUSED")
    assert integration["intervalSeconds"] == 7200
