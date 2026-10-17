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


RULE_L_ALERT_KIND = "RULE_L_NOT_ENFORCED"


def is_production() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() == "production"


def rule_l_alert(db: Session) -> dict:
    """Compute the Rule L status and, in production, raise a CRITICAL ops-feed
    event when it is not enforced. Called at startup and by the integration
    health job. The alert carries the computed reasons; nothing is asserted.

    One open alert at a time: while an unacknowledged one exists another is not
    added, so the periodic job does not bury the feed; acknowledging re-arms it.
    """
    from sqlalchemy import select

    from core import workflow_models as M
    from core.rule_l import rule_l_status
    from services import ops_feed

    status = rule_l_status(db.connection())
    status["alerted"] = False
    if status["enforced"] or not is_production():
        return status
    logger.error("[RULE L] not enforced in production: %s", "; ".join(status["reasons"]))
    open_alert = db.scalar(select(M.OpsEvent.id).where(M.OpsEvent.kind == RULE_L_ALERT_KIND,
                                                       M.OpsEvent.acknowledged_at == 0).limit(1))
    if open_alert is None:
        ops_feed.publish(db, RULE_L_ALERT_KIND, "ACCOUNT", severity="CRITICAL",
                         summary=("Rule L commerce firewall is NOT enforced at the database: "
                                  + "; ".join(status["reasons"]))[:300],
                         resource_type="rule_l")
        db.commit()
        status["alerted"] = True
    return status


def commerce_db(db: Session = Depends(workflow_db)):
    bind = db.get_bind()
    if bind.dialect.name == "postgresql" and _usable(bind):
        with open_commerce_session(bind) as session:
            yield session
        return
    if grants_required():
        raise HTTPException(503, "This service is unavailable: the commerce database role is not in force.")
    yield db
