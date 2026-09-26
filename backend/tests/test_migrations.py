"""Production migration runner tests (Postgres-only)."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = str(Path(__file__).resolve().parents[1])


def test_migration_runner_applies_schema():
    # Postgres-only: needs a reachable Postgres (CI provides
    # postgresql://ci:ci@localhost:5432/ci). Skips cleanly without one.
    url = os.environ.get("TEST_DATABASE_URL", "postgresql://ci:ci@localhost:5432/ci?sslmode=disable")
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"No reachable Postgres for migration test: {type(exc).__name__}")
    env = {**os.environ, "PYTHONPATH": BACKEND, "DATABASE_URL": url}
    result = subprocess.run([sys.executable, "-c", "from services.migrations import run_migrations; print(run_migrations())"],
                            cwd=BACKEND, env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert "applied" in result.stdout
    # Confirm care_* tables were created by the migration.
    from sqlalchemy import text as _text
    with engine.connect() as conn:
        count = conn.execute(_text(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name LIKE 'care_%'")).scalar()
    assert count >= 60


def test_production_lifespan_runs_migrations(monkeypatch):
    import asyncio
    from contextlib import nullcontext
    from unittest.mock import Mock

    from app import main
    from services import db_sql, integration_config, migrations, workflow_scheduler

    migrate = Mock()
    create_tables = Mock()
    monkeypatch.setattr(main, "APP_ENV", "production")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr(migrations, "run_migrations", migrate)
    monkeypatch.setattr(main, "create_all_tables", create_tables)
    monkeypatch.setattr(integration_config, "load_from_db", lambda: None)
    monkeypatch.setattr(db_sql, "SessionLocal", lambda: nullcontext(object()))
    monkeypatch.setattr(workflow_scheduler, "ensure_scheduled_jobs", lambda db: None)
    monkeypatch.setattr(workflow_scheduler.workflow_scheduler, "run_due_jobs", lambda db: [])

    async def start():
        async with main.lifespan(main.app):
            migrate.assert_called_once_with()

    asyncio.run(start())
    create_tables.assert_not_called()
