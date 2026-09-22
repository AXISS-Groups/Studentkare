"""Bounded runtime jobs: isolated SQLite, no app startup or external delivery."""
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from services import integration_config
from services import workflow_scheduler as scheduler
from services.db_sql import Base


@pytest.fixture
def factory(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(integration_config, "INTEGRATIONS_DB", {})

    def no_network(*args, **kwargs):
        pytest.fail("Scheduler tests must not make external requests")

    monkeypatch.setattr(scheduler, "_probe", no_network)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.mark.parametrize("key", ["missing", "created", "interval_seconds"])
def test_unknown_manual_job_does_not_create_schedule_or_run(factory, key):
    with factory() as db:
        with pytest.raises(ValueError, match="Unknown job"):
            scheduler.workflow_scheduler.run_job_now(db, key)
    with factory() as db:
        assert db.scalar(select(M.ScheduledJob)) is None
        assert db.scalar(select(M.AgentRun)) is None


def test_manual_run_persists_summary_and_timestamps_in_new_session(factory, monkeypatch):
    ticks = iter([100.0, 101.0, 110.0])
    monkeypatch.setattr(scheduler, "now", lambda: next(ticks))
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
    with factory() as db:
        run = db.get(M.AgentRun, result["runId"])
        job = db.get(M.ScheduledJob, "reminder_reconcile")
        assert run.status == result["status"] == job.last_status == "SUCCESS"
        assert run.summary == result["summary"]
        assert run.started_at == 101.0
        assert run.finished_at == 110.0
        assert job.last_run_at == run.finished_at
        assert job.next_run_at == run.finished_at + 7200


def test_failure_rolls_back_work_and_persists_failed_run(factory, monkeypatch):
    def fail(key, db):
        db.add(M.OutboxEvent(id="partial", event_type="test", dedupe_key="partial"))
        db.flush()
        raise RuntimeError("handler failed")

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", fail)
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
    with factory() as db:
        run = db.get(M.AgentRun, result["runId"])
        assert run.status == "FAILED"
        assert run.error == result["error"] == "handler failed"
        assert run.summary == {}
        assert run.started_at <= run.finished_at
        assert db.get(M.OutboxEvent, "partial") is None
        assert db.get(M.ScheduledJob, "reminder_reconcile").last_error == run.error


def test_due_pass_limits_to_25_and_continues_after_failure(factory, monkeypatch):
    keys = {f"test_{index:02}": f"Test {index}" for index in range(30)}
    monkeypatch.setattr(scheduler, "PERIODIC_JOBS", keys)

    def execute(key, db):
        if key == "test_00":
            raise RuntimeError("first job failed")
        return {"summary": {"executed": key}}

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", execute)
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        first = scheduler.workflow_scheduler.run_due_jobs(db)
        assert len(first) == 25
        assert first["test_00"] == "FAILED"
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.AgentRun)) == 25
        second = scheduler.workflow_scheduler.run_due_jobs(db)
        assert len(second) == 5
        assert not (first.keys() & second.keys())
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.AgentRun)) == 30


def test_due_pass_ignores_paused_future_and_unregistered_jobs(factory):
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        for job in db.scalars(select(M.ScheduledJob)):
            job.enabled = False
        future = db.get(M.ScheduledJob, "reminder_reconcile")
        future.enabled = True
        future.next_run_at = time.time() + 3600
        db.add(M.ScheduledJob(key="not-allowed", name="Unknown", next_run_at=0))
        db.commit()
        assert scheduler.workflow_scheduler.run_due_jobs(db) == {}
        assert db.scalar(select(M.AgentRun)) is None


@pytest.mark.parametrize("configured", [False, True])
@pytest.mark.parametrize("attempts", [0, 3])
def test_outbox_never_fakes_delivery_and_preserves_inbox(factory, monkeypatch, configured, attempts):
    if configured:
        monkeypatch.setitem(integration_config.INTEGRATIONS_DB, "openwa", {
            "enabled": True, "base_url": "https://messaging.example.test", "api_key": "test-key",
        })
    with factory() as db:
        event_id = scheduler.enqueue(db, "reminder", "dedupe", {"text": "Reminder"}, "member")
        assert scheduler.enqueue(db, "reminder", "dedupe", {}, "member") == event_id
        # Even old attempt counters must not cause fabricated new attempts or delivery.
        db.get(M.OutboxEvent, event_id).attempts = attempts
        db.get(M.OutboxEvent, event_id).read_at = 123.0
        db.commit()
        for _ in range(2):
            result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
            assert result["status"] == "BLOCKED"
            assert result["summary"]["outbox"]["delivered"] == 0
            assert result["summary"]["outbox"]["messaging_available"] is True
    with factory() as db:
        event = db.get(M.OutboxEvent, event_id)
        assert event.status == "PENDING"
        assert event.attempts == attempts
        assert event.sent_at == 0
        assert event.read_at == 123.0
        assert event.payload == {"text": "Reminder"}
        assert event.last_error == "unhandled_event_type:reminder"
        assert db.scalar(select(func.count()).select_from(M.OutboxEvent)) == 1


def test_outbox_batch_cannot_exceed_25(factory):
    with factory() as db:
        db.add_all([M.OutboxEvent(id=f"event-{i}", event_type="test", dedupe_key=f"key-{i}") for i in range(30)])
        db.commit()
        result = scheduler._process_outbox(db, max_batch=1000)
        assert result["pending"] == 25
        assert result["delivered"] == result["failed"] == 0


@pytest.mark.parametrize("batch", [0, -1, True, 1.5])
def test_outbox_rejects_invalid_batch(factory, batch):
    with factory() as db:
        with pytest.raises(ValueError):
            scheduler._process_outbox(db, max_batch=batch)


def test_unregistered_dispatch_cannot_report_success(factory):
    with factory() as db:
        with pytest.raises(ValueError, match="Unknown job"):
            scheduler.workflow_scheduler._execute("unknown", db)


def test_invalid_handler_status_is_persisted_as_failure(factory, monkeypatch):
    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", lambda key, db: {"status": "MADE_UP"})
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
    with factory() as db:
        assert db.get(M.AgentRun, result["runId"]).status == "FAILED"


def test_failed_sql_flush_recovers_session_and_persists_failure(factory, monkeypatch):
    def invalid_row(key, db):
        db.add(M.OutboxEvent(id="invalid", dedupe_key="invalid"))  # Missing required event_type.

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", invalid_row)
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
    with factory() as db:
        assert db.get(M.AgentRun, result["runId"]).status == "FAILED"
        assert db.get(M.OutboxEvent, "invalid") is None


@pytest.mark.parametrize("http_status, healthy", [(200, True), (204, True), (401, False), (404, False), (500, False)])
def test_probe_only_reports_successful_http_responses(monkeypatch, http_status, healthy):
    import httpx
    from unittest.mock import MagicMock

    client = MagicMock()
    client.__enter__.return_value.get.return_value.status_code = http_status
    monkeypatch.setattr(httpx, "Client", lambda **kwargs: client)
    ok, latency, detail = scheduler._probe("https://service.example.test/health")
    assert ok is healthy
    assert latency >= 0
    assert detail == f"HTTP {http_status}"


def test_probe_connection_failure_is_unavailable(monkeypatch):
    import httpx

    def unavailable(**kwargs):
        raise RuntimeError("test connection refused")

    monkeypatch.setattr(httpx, "Client", unavailable)
    assert scheduler._probe("https://service.example.test/health") == (False, 0, "test connection refused")


def test_health_check_uses_read_only_probes_and_leaves_unverified_services_unknown(factory, monkeypatch):
    monkeypatch.setattr(integration_config, "INTEGRATIONS_DB", {
        "llm": {"enabled": True}, "firebase": {"enabled": True},
        "openwa": {"enabled": True, "base_url": "https://wa.example.test", "session_id": "test"},
        "postal": {"enabled": True, "api_url": "https://postal.example.test"},
        "posthog": {"enabled": True, "host": "https://analytics.example.test"},
    })
    probes = []

    def probe(url):
        probes.append(url)
        return True, 1.0, "HTTP 200"

    monkeypatch.setattr(scheduler, "_probe", probe)
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "integration_health")
    assert probes == ["https://wa.example.test/api/sessions/test", "https://analytics.example.test/"]
    checks = {check["name"]: check for check in result["summary"]["checks"]}
    assert checks["messaging_openwa"]["status"] == "online"
    assert checks["email_postal"]["status"] == "unknown"
    assert result["summary"]["overall"] == "degraded"


def test_document_intake_reports_actual_backlog_without_extraction(factory):
    with factory() as db:
        db.add_all([
            M.DocumentIntake(id="queued", document_id="doc", account_id="member", status="QUEUED"),
            M.DocumentIntake(id="failed", document_id="doc", account_id="member", status="FAILED"),
        ])
        db.commit()
        result = scheduler.workflow_scheduler.run_job_now(db, "document_intake_reconcile")
    with factory() as db:
        assert result["status"] == "BLOCKED"
        assert result["summary"]["pending"] == 1
        assert result["summary"]["failed"] == 1
        assert result["summary"]["reconciled"] == 0
        assert db.get(M.DocumentIntake, "queued").status == "QUEUED"
        assert db.get(M.AgentRun, result["runId"]).status == "BLOCKED"


def test_knowledge_counts_only_active_reviewed_sources(factory):
    with factory() as db:
        db.add_all([
            M.KnowledgeSource(id="approved", title="Approved", reviewed=True, expires_at=1),
            M.KnowledgeSource(id="draft", title="Draft", reviewed=False, expires_at=1),
            M.KnowledgeSource(id="inactive", title="Inactive", reviewed=True, active=False, expires_at=1),
        ])
        db.commit()
        result = scheduler.knowledge_freshness_check(db)
        assert result["summary"] == {"sources": 1, "expired": 1, "expiring_soon": 0}


def test_followups_are_bounded_and_progress_past_existing_tasks(factory):
    with factory() as db:
        for i in range(30):
            db.add(M.Order(id=f"order-{i:02}", account_id="member", idempotency_key=str(i),
                           request_hash="hash", total_paise=1, delivery={}, created_at=1))
            db.add(M.OrderLine(id=f"line-{i}", order_id=f"order-{i:02}", item_id="item",
                               provider_id="provider", name="Item", kind="product", quantity=1,
                               price_paise=1, status="REQUESTED"))
        db.commit()
        result = scheduler.workflow_scheduler.run_job_now(db, "care_followup")
        assert result["summary"]["followups_created"] == 25
    with factory() as db:
        result = scheduler.workflow_scheduler.run_job_now(db, "care_followup")
        assert result["summary"]["followups_created"] == 5
        assert db.scalar(select(func.count()).select_from(M.FollowUpTask)) == 30
        assert set(db.scalars(select(M.OrderLine.status))) == {"REQUESTED"}


@pytest.fixture
def client(factory):
    from services.workflow_api import router
    from services.workflow_auth import SESSION_COOKIE, digest, workflow_db

    app = FastAPI()
    app.include_router(router)

    def database():
        with factory() as db:
            yield db

    app.dependency_overrides[workflow_db] = database
    with factory() as db:
        db.add(M.Account(id="admin", identifier="admin@example.test", channel="EMAIL",
                         full_name="Admin", role="SUPER_ADMIN", created_at=1))
        db.add(M.Session(token_hash=digest("test-session"), account_id="admin", csrf_token="csrf",
                         expires_at=time.time() + 600))
        db.commit()
    with TestClient(app) as client:
        client.cookies.set(SESSION_COOKIE, "test-session")
        yield client


def test_manual_endpoint_looks_up_registered_job_and_exposes_persisted_summary(client, factory):
    response = client.post("/api/ops/jobs/reminder_reconcile/run", headers={"X-CSRF-Token": "csrf"})
    assert response.status_code == 200
    result = response.json()
    with factory() as db:
        assert db.get(M.AgentRun, result["runId"]).summary == result["summary"]
    agents = client.get("/api/agents/live-status").json()["agents"]
    assert next(a for a in agents if a["key"] == "reminder_reconcile")["lastSummary"] == result["summary"]


@pytest.mark.parametrize("key", ["missing", "created", "interval_seconds"])
def test_manual_endpoint_unknown_is_404_without_run(client, factory, key):
    response = client.post(f"/api/ops/jobs/{key}/run", headers={"X-CSRF-Token": "csrf"})
    assert response.status_code == 404
    with factory() as db:
        assert db.get(M.ScheduledJob, key) is None
        assert db.scalar(select(M.AgentRun)) is None


def test_manual_endpoint_keeps_csrf_and_superadmin_checks(client, factory):
    assert client.post("/api/ops/jobs/reminder_reconcile/run").status_code == 403
    with factory() as db:
        db.get(M.Account, "admin").role = "STUDENT"
        db.commit()
    assert client.post("/api/ops/jobs/reminder_reconcile/run", headers={"X-CSRF-Token": "csrf"}).status_code == 403
    with factory() as db:
        assert db.scalar(select(M.AgentRun)) is None
