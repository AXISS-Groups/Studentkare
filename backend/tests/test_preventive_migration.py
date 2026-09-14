"""Verify the actual versioned schema, not create_all's approximation."""
import os
from pathlib import Path
import subprocess
import sys


def test_preventive_migration_upgrade_downgrade_and_metadata(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    script = """
from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text
from services.db_sql import engine, Base
from core import preventive_models

config = Config('alembic.ini')
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
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{tmp_path / 'preventive.db'}",
           "PYTHONPATH": str(backend), "PYTHONDONTWRITEBYTECODE": "1"}
    result = subprocess.run([sys.executable, "-c", script], cwd=backend, env=env,
                            capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr
