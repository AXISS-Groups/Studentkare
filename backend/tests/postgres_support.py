"""Skip, rather than fail, when a test needs a live Postgres that is absent.

A few tests verify the real versioned schema, which is Postgres-only by design
and cannot be approximated on SQLite. Without a server they used to fail, which
is indistinguishable from a broken migration — the one thing they exist to
detect. CI provides a Postgres service, so there they run for real.

The Postgres CI job sets REQUIRE_POSTGRES=1. There a missing server is a
failure, not a skip, so a misconfigured service cannot quietly turn the
Postgres-only tests into no-ops while the job still goes green.
"""
import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

_REASON = "needs a live Postgres; set DATABASE_URL to a reachable server"


def postgres_required() -> bool:
    return os.environ.get("REQUIRE_POSTGRES") == "1"


def psycopg_url(url: str):
    """The URL on the driver the app ships with.

    A bare postgresql:// URL makes SQLAlchemy load psycopg2, which is not in
    config/requirements.txt (the app uses psycopg 3, see services/db_sql.py).
    On CI the import failed, the check returned False, and the Postgres-only
    tests skipped on the one job that had a server.
    """
    return make_url(url).set(drivername="postgresql+psycopg")


def _reachable() -> bool:
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("postgresql"):
        return False
    try:
        engine = create_engine(psycopg_url(url), pool_pre_ping=True)
        with engine.connect() as db:
            db.execute(text("SELECT 1"))
        engine.dispose()
    except Exception:
        return False
    return True


# Under REQUIRE_POSTGRES=1 the marker never skips: the test runs and fails on
# the connection, which is the signal that job exists to give.
requires_postgres = pytest.mark.skipif(not postgres_required() and not _reachable(), reason=_REASON)
