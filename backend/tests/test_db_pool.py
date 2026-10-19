"""Connection pooling per environment (audit TD-21).

db_sql builds its engine at import, so each case imports it in a fresh process.
create_engine does not connect, so no database is needed.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
PROBE = (
    "import json; from services import db_sql as d; p = d.engine.pool; "
    "print(json.dumps({'cls': type(p).__name__, 'size': getattr(p, 'size', lambda: None)(), "
    "'overflow': getattr(p, '_max_overflow', None)}))"
)


def _pool(**env):
    full = {k: v for k, v in os.environ.items() if k not in {"USE_PGBOUNCER", "DB_POOL_SIZE", "DB_MAX_OVERFLOW"}}
    full.update({"DATABASE_URL": "postgresql://u:p@db.internal:5432/x", "APP_ENV": "production", **env})
    out = subprocess.run([sys.executable, "-c", PROBE], cwd=BACKEND, env=full,
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])


def test_direct_to_postgres_pools_in_process():
    assert _pool() == {"cls": "QueuePool", "size": 5, "overflow": 5}


def test_behind_pgbouncer_does_not_pool_twice():
    assert _pool(USE_PGBOUNCER="true")["cls"] == "NullPool"


@pytest.mark.parametrize("size,overflow,expected", [
    ("12", "3", (12, 3)),
    ("0", "-4", (1, 0)),      # clamped up
    ("500", "500", (50, 50)),  # clamped down
    ("lots", "", (5, 5)),     # malformed or empty -> default
])
def test_pool_settings_are_bounded(size, overflow, expected):
    pool = _pool(DB_POOL_SIZE=size, DB_MAX_OVERFLOW=overflow)
    assert (pool["size"], pool["overflow"]) == expected
