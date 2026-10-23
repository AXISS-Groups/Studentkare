"""Verify the actual versioned schema, not create_all's approximation.

Postgres-only. This used to point the migration at a SQLite file while being
gated on a reachable Postgres, so it skipped everywhere except CI and then
failed there: SQLite cannot ALTER constraints (7c5d1e2a4b90). It now runs the
chain on a throwaway database on the CI server, so the downgrade it exercises
never touches the database the rest of the suite uses.
"""
import os
import subprocess
import sys
import uuid
from pathlib import Path

from postgres_support import psycopg_url, requires_postgres
from sqlalchemy import create_engine, text


@requires_postgres
def test_preventive_migration_upgrade_downgrade_and_metadata():
    backend = Path(__file__).resolve().parents[1]
    server_url = psycopg_url(os.environ["DATABASE_URL"])
    name = f"sk_preventive_{uuid.uuid4().hex[:12]}"
    admin = create_engine(server_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as db:
        db.execute(text(f'CREATE DATABASE "{name}"'))
    scratch_url = server_url.set(database=name).render_as_string(hide_password=False)
    script = """
from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text
from services.db_sql import engine, Base
from core import preventive_models

config = Config('config/alembic.ini')
config.set_main_option('script_location', 'alembic')
command.upgrade(config, 'fe83ff8b6dc6')
with engine.begin() as db:
    db.execute(text("INSERT INTO care_accounts (id, identifier, channel, full_name, role, active, profile, created_at) VALUES ('fixture', 'migration@example.test', 'EMAIL', 'Fixture', 'STUDENT', true, '{}', 1)"))
command.upgrade(config, 'head')
names = set(inspect(engine).get_table_names())
expected = {'care_preventive_providers', 'care_preventive_vaccines', 'care_preventive_preferences', 'care_preventive_report_reviews'}
assert expected <= names
with engine.connect() as db:
    for name in expected:
        assert db.execute(text('SELECT COUNT(*) FROM ' + name)).scalar() == 0
    context = MigrationContext.configure(db, opts={'include_object': lambda obj, name, kind, reflected, compare_to: name in expected if kind == 'table' else True})
    assert compare_metadata(context, Base.metadata) == []
command.downgrade(config, 'fe83ff8b6dc6')
assert not expected.intersection(inspect(engine).get_table_names())
with engine.connect() as db:
    assert db.execute(text("SELECT COUNT(*) FROM care_accounts WHERE id='fixture'")).scalar() == 1
command.upgrade(config, 'head')
assert expected <= set(inspect(engine).get_table_names())
"""
    env = {**os.environ, "DATABASE_URL": scratch_url,
           "PYTHONPATH": str(backend), "PYTHONDONTWRITEBYTECODE": "1"}
    try:
        result = subprocess.run([sys.executable, "-c", script], cwd=backend, env=env,  # noqa: S603 — a literal script run by this test, no external input
                                capture_output=True, text=True, timeout=120, check=False)
    finally:
        with admin.connect() as db:
            db.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()
    assert result.returncode == 0, result.stdout + result.stderr
