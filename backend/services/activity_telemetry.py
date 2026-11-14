"""
services.activity_telemetry — complete request coverage, without personal data.

The curated feed (``ops_feed``) carries the small number of events a person has to
act on. This carries everything else: every endpoint the API exposes, counted.

The reason the two are separate is a boundary, not a preference. A student
recording their blood pressure, logging a dose, or deleting a document is real
activity a platform operator may legitimately want to see the *volume* of — but the
event itself is that student's clinical record, and clinical data must not reach an
operational surface (Rule L). Counting solves both: the operator sees that
``POST /health/readings`` was called 47 times by students in the last hour with a
p-max latency of 120 ms, and cannot see whose reading it was or what it said.

What is recorded
    the matched **route template**, the method, the caller's role, the status class,
    a one-hour bucket, a count, total and max latency.

What is never recorded
    account ids, path parameter values, query strings, request bodies, responses,
    headers, or IP addresses. ``/health/readings/{reading_id}`` is stored with the
    placeholder intact — a row cannot identify whose reading was deleted.

Aggregation, not a log line per request, is what keeps this affordable: one row per
(hour, route, method, role, status class) however much traffic arrives.
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy import case, func, select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware

from core import workflow_models as M

# Probes and docs would dominate the table without telling anyone anything.
# Everything else is counted, including reads.
#
# These are exact paths, not prefixes: "/api/health" is the liveness probe, while
# "/api/health/readings" and "/api/health/documents" are real clinical endpoints
# that must be counted. A prefix match here would silently drop them.
IGNORED_PATHS = frozenset({"/api/health", "/api/persistence/status"})
IGNORED_PREFIXES = ("/docs", "/openapi", "/redoc", "/static")


def is_ignored(path: str) -> bool:
    return path in IGNORED_PATHS or path.startswith(IGNORED_PREFIXES)

HOUR = 3600


def session_factory():
    """Session used for counting.

    Telemetry writes in its own transaction on purpose: a counter must not be rolled
    back with a failed request, and a failed counter must not roll back a successful
    one. Indirected through a function so tests can point it at their own engine —
    middleware sits outside FastAPI's dependency overrides.
    """
    from services.db_sql import SessionLocal
    return SessionLocal()


def bucket_for(timestamp: float) -> int:
    return int(timestamp // HOUR)


def _status_class(status_code: int) -> str:
    return f"{status_code // 100}xx"


def record(db: Session, *, route: str, method: str, actor_role: str, status_code: int,
           latency_ms: float, at: float | None = None) -> None:
    """Fold one request into its counter. Never raises.

    One atomic upsert protects both row creation and increments across workers.
    Postgres is the production dialect; SQLite exercises the same operation in tests.
    """
    try:
        now = at if at is not None else time.time()
        bucket = bucket_for(now)
        status = _status_class(status_code)
        table = M.ActivityCounter.__table__
        dialect = db.get_bind().dialect.name
        if dialect == "postgresql":
            insert = postgres_insert
        elif dialect == "sqlite":
            insert = sqlite_insert
        else:
            raise ValueError("Unsupported counter database dialect")
        statement = insert(table).values(
            id=uuid.uuid4().hex, bucket=bucket,
            route=route[:table.c.route.type.length],
            method=method[:table.c.method.type.length],
            actor_role=(actor_role or "ANONYMOUS")[:table.c.actor_role.type.length],
            status_class=status, count=1, total_latency_ms=latency_ms,
            max_latency_ms=max(0.0, latency_ms), last_at=now,
        )
        incoming = statement.excluded
        db.execute(statement.on_conflict_do_update(
            index_elements=[table.c.bucket, table.c.route, table.c.method,
                            table.c.actor_role, table.c.status_class],
            set_={
                "count": table.c.count + incoming.count,
                "total_latency_ms": table.c.total_latency_ms + incoming.total_latency_ms,
                "max_latency_ms": case(
                    (table.c.max_latency_ms < incoming.max_latency_ms, incoming.max_latency_ms),
                    else_=table.c.max_latency_ms,
                ),
                "last_at": case((table.c.last_at < incoming.last_at, incoming.last_at),
                                else_=table.c.last_at),
            },
        ))
        db.commit()
    except Exception:  # noqa: BLE001 — telemetry must never affect the response
        try:
            db.rollback()
        except Exception:  # noqa: BLE001, S110 — a dead session has nothing to roll back
            pass


def summary(db, *, hours: int = 24, route_prefix: str = "", limit: int = 200) -> dict:
    """Ranked route/method rows and totals for the entire matching window."""
    since = bucket_for(time.time()) - max(0, hours - 1)
    count = func.sum(M.ActivityCounter.count)
    errors = func.sum(case(
        (M.ActivityCounter.status_class.in_(("4xx", "5xx")), M.ActivityCounter.count),
        else_=0,
    ))
    statement = select(
        M.ActivityCounter.route,
        M.ActivityCounter.method,
        count,
        func.sum(M.ActivityCounter.total_latency_ms),
        func.max(M.ActivityCounter.max_latency_ms),
        func.max(M.ActivityCounter.last_at),
        errors,
        # Window functions run over all grouped rows before LIMIT, in this same
        # database snapshot. A ranked subset must not become the window's total.
        func.sum(count).over().label("total_requests"),
        func.sum(errors).over().label("total_errors"),
    ).where(M.ActivityCounter.bucket >= since)
    if route_prefix.strip():
        statement = statement.where(M.ActivityCounter.route.startswith(route_prefix.strip()))
    rows = db.execute(
        statement.group_by(M.ActivityCounter.route, M.ActivityCounter.method)
        .order_by(count.desc(), M.ActivityCounter.route, M.ActivityCounter.method).limit(limit)
    ).all()

    items = []
    for route, method, count, total_latency, max_latency, last_at, error_count, _total, _errors in rows:
        count = int(count or 0)
        items.append({
            "route": route, "method": method, "count": count,
            "avgLatencyMs": round((total_latency or 0) / count, 1) if count else 0.0,
            "maxLatencyMs": round(max_latency or 0, 1),
            "errorCount": int(error_count or 0),
            "lastAt": last_at,
        })
    return {
        "items": items,
        "windowHours": hours,
        "totalRequests": int(rows[0].total_requests or 0) if rows else 0,
        "totalErrors": int(rows[0].total_errors or 0) if rows else 0,
    }


def by_role(db, *, hours: int = 24) -> dict:
    """Request volume per role — who is actually using the platform."""
    since = bucket_for(time.time()) - max(0, hours - 1)
    rows = db.execute(
        select(M.ActivityCounter.actor_role, func.sum(M.ActivityCounter.count))
        .where(M.ActivityCounter.bucket >= since)
        .group_by(M.ActivityCounter.actor_role)
    ).all()
    return {role: int(count or 0) for role, count in rows}


def hourly(db, *, hours: int = 24) -> list[dict]:
    """Request volume per hour, oldest first — the shape of the day."""
    since = bucket_for(time.time()) - max(0, hours - 1)
    rows = db.execute(
        select(M.ActivityCounter.bucket, func.sum(M.ActivityCounter.count))
        .where(M.ActivityCounter.bucket >= since)
        .group_by(M.ActivityCounter.bucket).order_by(M.ActivityCounter.bucket)
    ).all()
    return [{"hourStart": int(bucket) * HOUR, "count": int(count or 0)} for bucket, count in rows]


def _record_request(*, route: str, method: str, actor_role: str, status_code: int,
                    latency_ms: float) -> None:
    """Create, use and close the synchronous session entirely in the worker."""
    with session_factory() as db:
        record(db, route=route, method=method, actor_role=actor_role,
               status_code=status_code, latency_ms=latency_ms)


class ActivityTelemetryMiddleware(BaseHTTPMiddleware):
    """Counts every request. No endpoint has to opt in, so coverage cannot drift.

    Reads the route *template* from the matched route rather than the raw path, which
    is what keeps identifiers out of the table.
    """

    async def dispatch(self, request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        try:
            path = request.scope.get("path", "")
            if is_ignored(path):
                return response
            route = request.scope.get("route")
            # No matched route means a 404 on an unknown path; recording the raw
            # path there would put arbitrary caller-supplied text in the table.
            template = getattr(route, "path", None) or "<unmatched>"
            latency_ms = (time.perf_counter() - started) * 1000

            await run_in_threadpool(
                _record_request, route=template, method=request.method,
                actor_role=getattr(request.state, "actor_role", "") or "ANONYMOUS",
                status_code=response.status_code, latency_ms=latency_ms,
            )
        except Exception:  # noqa: BLE001, S110 — never let telemetry break a response
            pass
        return response
