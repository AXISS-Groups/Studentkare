"""Long-running worker loop and the cross-process job lease (SQLite, no network)."""
import os
import signal
import threading

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from test_workflow_scheduler_bounds import factory  # noqa: F401

from core import workflow_models as M
from scripts import workflow_worker as worker
from services import integration_config
from services import workflow_scheduler as scheduler
from services.db_sql import Base


def _runs(db, key=None):
    query = select(func.count()).select_from(M.AgentRun)
    if key:
        query = query.where(M.AgentRun.job_key == key)
    return db.scalar(query)


def test_held_lease_blocks_manual_and_scheduled_runs(factory, monkeypatch):  # noqa: F811
    calls = []
    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", lambda key, db: calls.append(key) or {})
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        job = db.get(M.ScheduledJob, "account_erasure")
        job.lease_owner, job.lease_expires_at = "other-replica/abc", scheduler.now() + 600
        db.commit()
        with pytest.raises(scheduler.JobBusyError):
            scheduler.workflow_scheduler.run_job_now(db, "account_erasure")
        results = scheduler.workflow_scheduler.run_due_jobs(db)
    assert "account_erasure" not in results
    assert "account_erasure" not in calls
    assert set(results) == set(scheduler.PERIODIC_JOBS) - {"account_erasure"}
    with factory() as db:
        assert _runs(db, "account_erasure") == 0
        assert db.get(M.ScheduledJob, "account_erasure").lease_owner == "other-replica/abc"


def test_expired_lease_is_reclaimed_and_released(factory):  # noqa: F811
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        job = db.get(M.ScheduledJob, "knowledge_freshness")
        job.lease_owner, job.lease_expires_at = "crashed-worker/abc", scheduler.now() - 1
        db.commit()
        assert scheduler.workflow_scheduler.run_job_now(db, "knowledge_freshness")["status"] == "SUCCESS"
    with factory() as db:
        job = db.get(M.ScheduledJob, "knowledge_freshness")
        assert (job.lease_owner, job.lease_expires_at) == ("", 0.0)


def test_lease_released_after_handler_failure(factory, monkeypatch):  # noqa: F811
    def fail(key, db):
        raise RuntimeError("handler failure")

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", fail)
    with factory() as db:
        assert scheduler.workflow_scheduler.run_job_now(db, "care_followup")["status"] == "FAILED"
    with factory() as db:
        assert db.get(M.ScheduledJob, "care_followup").lease_owner == ""


def test_scheduled_claim_skips_job_another_worker_just_finished(factory):  # noqa: F811
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        scheduler.workflow_scheduler.run_job_now(db, "knowledge_freshness", require_due=True)
        # A second worker that saw the job as due before the first finished.
        with pytest.raises(scheduler.JobBusyError):
            scheduler.workflow_scheduler.run_job_now(db, "knowledge_freshness", require_due=True)
        assert _runs(db, "knowledge_freshness") == 1


def test_two_concurrent_workers_never_run_the_same_job_twice(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'lease.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(integration_config, "INTEGRATIONS_DB", {})
    with sessions() as db:
        scheduler.ensure_scheduled_jobs(db)

    started, release, calls = threading.Event(), threading.Event(), []

    def slow(key, db):
        calls.append(key)
        started.set()
        assert release.wait(10)
        return {}

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", slow)
    outcome = {}

    def first():
        with sessions() as db:
            outcome["first"] = scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")["status"]

    thread = threading.Thread(target=first)
    thread.start()
    try:
        assert started.wait(10)
        with sessions() as db, pytest.raises(scheduler.JobBusyError):
            scheduler.workflow_scheduler.run_job_now(db, "reminder_reconcile")
    finally:
        release.set()
        thread.join(10)
    assert outcome["first"] == "SUCCESS"
    assert calls == ["reminder_reconcile"]
    with sessions() as db:
        assert _runs(db, "reminder_reconcile") == 1
        assert db.get(M.ScheduledJob, "reminder_reconcile").lease_owner == ""
    engine.dispose()


def test_outbox_cadence_is_short_enough_for_sos_and_applies_immediately(factory):  # noqa: F811
    assert scheduler.JOB_INTERVAL_OVERRIDES["reminder_reconcile"] + scheduler.WORKER_POLL_SECONDS <= 60
    assert scheduler.LEASE_SECONDS > 25 * 25  # slowest bounded outbox pass
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        job = db.get(M.ScheduledJob, "reminder_reconcile")
        job.interval_seconds, job.next_run_at = 7200, scheduler.now() + 7000  # an old 2-hour schedule
        db.commit()
        scheduler.ensure_scheduled_jobs(db)
        job = db.get(M.ScheduledJob, "reminder_reconcile")
        assert job.interval_seconds == 45
        assert job.next_run_at <= scheduler.now() + 45


def test_loop_runs_due_jobs_until_stopped(factory):  # noqa: F811
    stop, outcomes = threading.Event(), []

    def on_pass(outcome):
        outcomes.append(outcome)
        if len(outcomes) == 2:
            stop.set()

    passes = scheduler.run_worker_loop(factory, stop, poll_seconds=0.01, on_pass=on_pass)
    assert passes == 2
    assert set(outcomes[0]) == set(scheduler.PERIODIC_JOBS)
    assert outcomes[1] == {}  # nothing due again yet
    with factory() as db:
        assert _runs(db) == len(scheduler.PERIODIC_JOBS)


def test_loop_survives_a_failed_pass(factory, caplog):  # noqa: F811
    stop, attempts = threading.Event(), []

    def flaky_sessions():
        attempts.append(1)
        if len(attempts) == 1:
            raise RuntimeError("postgresql://user:secret@db/x unreachable")
        return factory()

    passes = scheduler.run_worker_loop(flaky_sessions, stop, poll_seconds=0.01,
                                       on_pass=lambda outcome: stop.set())
    assert passes == 2
    assert "RuntimeError" in caplog.text
    assert "secret" not in caplog.text


def test_sigterm_sets_stop_event():
    stop = threading.Event()
    previous = signal.getsignal(signal.SIGTERM), signal.getsignal(signal.SIGINT)
    try:
        worker.install_stop_handlers(stop)
        os.kill(os.getpid(), signal.SIGTERM)
        assert stop.wait(5)
    finally:
        signal.signal(signal.SIGTERM, previous[0])
        signal.signal(signal.SIGINT, previous[1])


def test_cli_loop_exits_cleanly_on_sigterm(factory, monkeypatch, tmp_path, capsys):  # noqa: F811
    from services import db_sql

    monkeypatch.setattr(db_sql, "SessionLocal", factory)
    monkeypatch.setattr(integration_config, "load_from_db", lambda: None)
    heartbeat = tmp_path / "heartbeat"
    previous = signal.getsignal(signal.SIGTERM), signal.getsignal(signal.SIGINT)
    timer = threading.Timer(0.5, os.kill, (os.getpid(), signal.SIGTERM))
    try:
        timer.start()
        code = worker.main(["--loop", "--poll-seconds", "1", "--heartbeat-file", str(heartbeat)])
    finally:
        timer.cancel()
        signal.signal(signal.SIGTERM, previous[0])
        signal.signal(signal.SIGINT, previous[1])
    assert code == 0
    assert heartbeat.exists()
    assert '"stopped": true' in capsys.readouterr().out
    with factory() as db:
        assert _runs(db) == len(scheduler.PERIODIC_JOBS)


@pytest.mark.parametrize("args", [["--loop", "--poll-seconds", "0"], ["--loop", "--poll-seconds", "301"],
                                  ["--loop", "--once"], ["--loop", "--poll-seconds", "nan"]])
def test_cli_loop_rejects_invalid_arguments(args):
    with pytest.raises(SystemExit) as exc:
        worker.main(args)
    assert exc.value.code == 2


def test_cli_loop_fails_closed_when_config_cannot_load(factory, monkeypatch):  # noqa: F811
    from services import db_sql

    monkeypatch.setattr(db_sql, "SessionLocal", factory)

    def broken():
        raise RuntimeError("db down")

    monkeypatch.setattr(integration_config, "load_from_db", broken)
    previous = signal.getsignal(signal.SIGTERM), signal.getsignal(signal.SIGINT)
    try:
        assert worker.main(["--loop"]) == 1
    finally:
        signal.signal(signal.SIGTERM, previous[0])
        signal.signal(signal.SIGINT, previous[1])


# ── Urgent first, watchdog, metrics (audit TD-49, JOB-05) ─────────────────────

def test_urgent_delivery_runs_first_and_again_between_slow_jobs(factory, monkeypatch):  # noqa: F811
    order = []

    def execute(key, db):
        order.append(key)
        if key == "integration_health":
            # A slow job: by the time it finishes, delivery is due again.
            db.get(M.ScheduledJob, "reminder_reconcile").next_run_at = 0.0
        return {}

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", execute)
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        scheduler.workflow_scheduler.run_due_jobs(db)
    assert order[0] == "reminder_reconcile"
    after_slow = order.index("integration_health") + 1
    assert order[after_slow] == "reminder_reconcile"
    assert order.count("reminder_reconcile") == 2
    assert set(order) == set(scheduler.PERIODIC_JOBS)


def test_watchdog_exits_when_no_pass_completes():
    stop, exits = threading.Event(), []
    stale = [worker.time.monotonic() - 10]
    thread = worker.start_watchdog(stop, stale, 0.05, exit_process=exits.append)
    thread.join(2)
    stop.set()
    assert exits == [1]


def test_watchdog_stays_quiet_while_passes_complete():
    stop, exits = threading.Event(), []
    last = [worker.time.monotonic()]
    worker.start_watchdog(stop, last, 0.5, exit_process=exits.append)
    for _ in range(10):
        last[0] = worker.time.monotonic()
        stop.wait(0.05)
    stop.set()
    assert exits == []


def test_job_overdue_metric(factory, monkeypatch):  # noqa: F811
    from core import telemetry
    from services import db_sql

    if not telemetry.HAS_PROMETHEUS:
        pytest.skip("prometheus_client not installed")
    monkeypatch.setattr(db_sql, "SessionLocal", factory)
    with factory() as db:
        scheduler.ensure_scheduled_jobs(db)
        db.get(M.ScheduledJob, "reminder_reconcile").next_run_at = scheduler.now() - 600
        db.get(M.ScheduledJob, "account_erasure").next_run_at = scheduler.now() + 600
        db.commit()
    telemetry.update_job_metrics()
    gauge = telemetry.scheduled_job_overdue_seconds
    assert gauge.labels(job="reminder_reconcile")._value.get() >= 600
    assert gauge.labels(job="account_erasure")._value.get() == 0
