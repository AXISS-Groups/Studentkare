"""Skip, rather than fail, when a test needs a live Postgres that is absent.

A few tests verify the real versioned schema, which is Postgres-only by design
and cannot be approximated on SQLite. Without a server they used to fail, which
is indistinguishable from a broken migration — the one thing they exist to
detect. CI provides a Postgres service, so there they run for real.
"""
import os

import pytest
from sqlalchemy import create_engine, text

_REASON = "needs a live Postgres; set DATABASE_URL to a reachable server"


def _reachable() -> bool:
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("postgresql"):
        return False
    try:
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as db:
            db.execute(text("SELECT 1"))
        engine.dispose()
    except Exception:
        return False
    return True


requires_postgres = pytest.mark.skipif(not _reachable(), reason=_REASON)
