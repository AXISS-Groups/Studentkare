"""Production migration runner tests (Postgres-only)."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = str(Path(__file__).resolve().parents[1])


def test_migration_runner_applies_schema(tmp_path):
    db = str(tmp_path / "migrations.db")
    env = {**os.environ, "PYTHONPATH": BACKEND, "DATABASE_URL": f"sqlite:///{db}"}
    result = subprocess.run([sys.executable, "-c", "import sys; sys.path.insert(0, [p for p in sys.path if 'site-packages' in p][0]); sys.path.insert(0, '/app'); from services.migrations import run_migrations; print(run_migrations())"],
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
