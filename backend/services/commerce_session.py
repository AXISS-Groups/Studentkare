"""The repository boundary for Rule L: commerce code runs as ``sk_commerce``.

``commerce_db`` is the FastAPI dependency the marketplace endpoints (catalogue,
cart, orders, order payments) use instead of ``workflow_db``. On Postgres, when
the grant matrix from core/rule_l.py is in force, it hands out a separate
session whose every transaction starts with ``SET LOCAL ROLE sk_commerce`` —
so a commerce query that reaches for a clinical table fails at Postgres with
``permission denied``, whatever the Python says. ``SET LOCAL`` ends with the
transaction, so the role never leaks onto a pooled (or PgBouncer) connection.

When the grants are not in force (SQLite, or a host where the migration could
not create the roles) it passes the ordinary session through, and
GET /api/ops/rule-l says so. Set ``RULE_L_REQUIRE_GRANTS=1`` to refuse commerce
requests instead (fail closed) once a deployment is known to have the roles.
"""
from __future__ import annotations

import logging
import os
import threading
import time

from fastapi import Depends, HTTPException
from sqlalchemy import event
from sqlalchemy.orm import Session

from core.rule_l import COMMERCE_ROLE, commerce_role_usable
from services.workflow_auth import workflow_db

logger = logging.getLogger(__name__)

_CACHE_SECONDS = 300.0
_cache: dict[str, tuple[float, bool]] = {}
_lock = threading.Lock()


def reset_cache() -> None:
    with _lock:
        _cache.clear()


def grants_required() -> bool:
    return os.getenv("RULE_L_REQUIRE_GRANTS", "").strip().lower() in {"1", "true", "yes"}


def _usable(bind) -> bool:
    key = bind.url.render_as_string(hide_password=True)
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < _CACHE_SECONDS:
            return hit[1]
    with bind.connect() as conn:
        usable = commerce_role_usable(conn)
    with _lock:
        if _cache.get(key, (0, None))[1] != usable:
            log = logger.info if usable else logger.warning
            log("[RULE L] commerce paths %s", f"run as {COMMERCE_ROLE}" if usable
                else f"run as the app role: {COMMERCE_ROLE} is not usable on this database")
        _cache[key] = (now, usable)
    return usable


def _enter_commerce_role(session, transaction, connection) -> None:
    connection.exec_driver_sql(f'SET LOCAL ROLE "{COMMERCE_ROLE}"')


def open_commerce_session(bind) -> Session:
    """A session bound to ``bind`` whose transactions run as sk_commerce."""
    session = Session(bind=bind, autoflush=False)
    event.listen(session, "after_begin", _enter_commerce_role)
    return session


def commerce_db(db: Session = Depends(workflow_db)):
    bind = db.get_bind()
    if bind.dialect.name == "postgresql" and _usable(bind):
        with open_commerce_session(bind) as session:
            yield session
        return
    if grants_required():
        raise HTTPException(503, "This service is unavailable: the commerce database role is not in force.")
    yield db
