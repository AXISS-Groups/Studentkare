"""Finite worker entry point; all storage and time are test-controlled."""
import pytest
from sqlalchemy import func, select

from core import workflow_models as M
from scripts import workflow_worker as worker
from services import workflow_scheduler as scheduler
from test_workflow_scheduler_bounds import factory


def test_worker_once_seeds_and_persists_only_due_runs(factory, monkeypatch):
    sleeps = []
    monkeypatch.setattr(worker.time, "sleep", sleeps.append)
    results = worker.run_cycles(factory, max_cycles=1)
    assert len(results) == 1
    assert results[0].keys() == scheduler.PERIODIC_JOBS.keys()
    assert sleeps == []
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.AgentRun)) == len(scheduler.PERIODIC_JOBS)
        assert db.get(M.ScheduledJob, "document_intake_reconcile").last_status == "SKIPPED"


def test_worker_honors_max_cycles_and_sleeps_only_between_passes(factory, monkeypatch):
    sleeps = []
    monkeypatch.setattr(worker.time, "sleep", sleeps.append)
    results = worker.run_cycles(factory, max_cycles=100, sleep_seconds=2)
    assert len(results) == 100
    assert all(result == {} for result in results[1:])
    assert sleeps == [2] * 99
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.AgentRun)) == len(scheduler.PERIODIC_JOBS)


@pytest.mark.parametrize("cycles", [0, -1, 101, 1.5, True])
def test_worker_rejects_unbounded_or_invalid_cycles_before_opening_db(cycles):
    def no_db():
        pytest.fail("Invalid bounds must be rejected before opening a session")

    with pytest.raises(ValueError):
        worker.run_cycles(no_db, max_cycles=cycles)


@pytest.mark.parametrize("seconds", [0, -1, 7201, float("nan"), float("inf")])
def test_worker_rejects_invalid_sleep_before_opening_db(seconds):
    with pytest.raises(ValueError):
        worker.run_cycles(lambda: pytest.fail("Must not open DB"), max_cycles=2, sleep_seconds=seconds)


@pytest.mark.parametrize("args", [[], ["--max-cycles", "101"], ["--max-cycles", "0"],
                                  ["--once", "--max-cycles", "2"], ["--once", "--sleep-seconds", "nan"]])
def test_cli_requires_explicit_finite_valid_mode(args):
    with pytest.raises(SystemExit) as exc:
        worker.main(args)
    assert exc.value.code == 2


def test_cli_once_uses_configured_factory_and_emits_actual_results(factory, monkeypatch, capsys):
    from services import db_sql, integration_config

    monkeypatch.setattr(db_sql, "SessionLocal", factory)
    monkeypatch.setattr(integration_config, "load_from_db", lambda: None)
    assert worker.main(["--once"]) == 0
    output = capsys.readouterr().out
    assert '"document_intake_reconcile": "SKIPPED"' in output
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(M.AgentRun)) == len(scheduler.PERIODIC_JOBS)


def test_cli_returns_nonzero_for_persisted_handler_failure(factory, monkeypatch):
    from services import db_sql, integration_config

    monkeypatch.setattr(db_sql, "SessionLocal", factory)
    monkeypatch.setattr(integration_config, "load_from_db", lambda: None)

    def fail(key, db):
        raise RuntimeError("test handler failure")

    monkeypatch.setattr(scheduler.workflow_scheduler, "_execute", fail)
    assert worker.main(["--once"]) == 1
    with factory() as db:
        assert set(db.scalars(select(M.AgentRun.status))) == {"FAILED"}


def test_cli_stops_on_database_failure(factory, monkeypatch):
    from services import db_sql, integration_config

    monkeypatch.setattr(integration_config, "load_from_db", lambda: None)

    def unavailable():
        raise RuntimeError("test database unavailable")

    monkeypatch.setattr(db_sql, "SessionLocal", unavailable)
    assert worker.main(["--max-cycles", "2"]) == 1
