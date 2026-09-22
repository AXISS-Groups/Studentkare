"""
services.ops_feed — one activity stream, routed to the dashboards that need it.

Every surface publishes here: a student placing an order, a clinician issuing a
prescription, a pharmacy verifying one, a lab flagging a critical result, the crisis
gate firing. The super admin sees all of it; every other role sees its own slice of
the same stream, so there is one place to wire a new event into rather than a
notification path per dashboard.

Two rules the whole design rests on:

**The feed is a signal, not a data surface.** ``summary`` carries counts and states —
never a drug name, a test name, a diagnosis, or anything a student typed. Anyone who
needs the detail opens the underlying resource, which has its own access control.
This is what keeps clinical specifics off vendor and marketplace surfaces (Rule L)
without auditing every field for every audience.

**Publishing never breaks the action.** ``publish`` stages a row in the caller's
transaction and swallows its own failures. An order must not fail because the feed
did.
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy import func, select

from core import workflow_models as M

DOMAINS = {"MARKETPLACE", "CLINICAL", "PHARMACY", "LAB", "CAMPUS", "SAFETY", "ACCOUNT", "SUPPORT"}
SEVERITIES = {"INFO", "ATTENTION", "CRITICAL"}

# Which domains each role's dashboard is responsible for. A vendor is not listed:
# vendors are scoped by the provider they own, not by domain.
ROLE_DOMAINS: dict[str, set[str]] = {
    "SUPER_ADMIN": set(DOMAINS),
    "NMC_DOCTOR": {"CLINICAL", "LAB", "SAFETY"},
    "CAMPUS_ADMIN": {"CAMPUS", "SAFETY"},
}


def publish(db, kind: str, domain: str, *, summary: str, severity: str = "INFO",
            actor_id: str = "", actor_role: str = "", subject_id: str = "",
            provider_id: str = "", resource_type: str = "", resource_id: str = "") -> str | None:
    """Stage an event in the caller's transaction. Returns the id, or None if it could not.

    Deliberately does not commit: the event and the thing it describes land together
    or not at all, so the feed can never show an order that failed to save.
    """
    try:
        if domain not in DOMAINS or severity not in SEVERITIES:
            return None
        event_id = uuid.uuid4().hex
        db.add(M.OpsEvent(
            id=event_id, kind=kind[:48], domain=domain, severity=severity,
            actor_id=actor_id, actor_role=actor_role[:24], subject_id=subject_id,
            provider_id=provider_id, resource_type=resource_type[:32], resource_id=resource_id,
            summary=summary[:300], created_at=time.time(),
        ))
        return event_id
    except Exception:  # noqa: BLE001 — the feed must never break the action it describes
        return None


def notify(db, account_id: str, event_type: str, *, dedupe_key: str, summary: str,
           resource_type: str = "", resource_id: str = "", **extra) -> str | None:
    """Tell one person something happened, in the caller's transaction.

    ``publish`` routes to a dashboard; this reaches a human. They are separate on
    purpose: a super admin needs to see a dispense verified, but it is the student
    who needs telling. Both are staged together with the action so a notification
    can never describe something that failed to save.

    ``dedupe_key`` makes it idempotent — a retried request notifies once.
    """
    try:
        if not account_id:
            return None
        existing = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.dedupe_key == dedupe_key))
        if existing:
            return existing.id
        event_id = f"evt_{uuid.uuid4().hex[:16]}"
        db.add(M.OutboxEvent(
            id=event_id, event_type=event_type[:60], account_id=account_id,
            dedupe_key=dedupe_key[:120],
            payload={"summary": summary, "resourceType": resource_type,
                     "resourceId": resource_id, **extra},
            attempts=0, status="PENDING", created_at=time.time(),
        ))
        return event_id
    except Exception:  # noqa: BLE001 — never break the action being described
        return None


def announce(db, *, account_id: str, event_type: str, dedupe_key: str, summary: str,
             domain: str, severity: str = "INFO", actor_id: str = "", actor_role: str = "",
             provider_id: str = "", resource_type: str = "", resource_id: str = "") -> None:
    """Route to the dashboards and tell the person, in one call.

    Most actions need both. Keeping them in one helper means a new event cannot
    accidentally reach the ops feed while leaving the student uninformed.
    """
    publish(db, event_type, domain, summary=summary, severity=severity, actor_id=actor_id,
            actor_role=actor_role, subject_id=account_id, provider_id=provider_id,
            resource_type=resource_type, resource_id=resource_id)
    notify(db, account_id, event_type, dedupe_key=dedupe_key, summary=summary,
           resource_type=resource_type, resource_id=resource_id)


def _visible_statement(db, user: dict):
    """Build the query for what this role may see. Returns None when nothing is visible."""
    role = user.get("role", "")
    statement = select(M.OpsEvent)

    if role == "SUPER_ADMIN":
        return statement

    if role == "VENDOR":
        # A vendor sees only their own queues: events tagged with a provider they own,
        # or with their account id (the catalog stores provider_id as an account id).
        owned = list(db.scalars(select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"])).all())
        owned.append(user["id"])
        return statement.where(M.OpsEvent.provider_id.in_(owned))

    domains = ROLE_DOMAINS.get(role)
    if not domains:
        return None
    return statement.where(M.OpsEvent.domain.in_(sorted(domains)))


def feed(db, user: dict, *, domain: str = "", severity: str = "",
         unacknowledged_only: bool = False, limit: int = 50, offset: int = 0) -> dict:
    """The signed-in role's slice of the stream, most urgent and newest first."""
    statement = _visible_statement(db, user)
    if statement is None:
        return {"items": [], "total": 0, "critical": 0, "scope": "none"}

    if domain.strip():
        statement = statement.where(M.OpsEvent.domain == domain.strip())
    if severity.strip():
        statement = statement.where(M.OpsEvent.severity == severity.strip())
    if unacknowledged_only:
        statement = statement.where(M.OpsEvent.acknowledged_at == 0.0)

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    critical_statement = _visible_statement(db, user).where(
        M.OpsEvent.severity == "CRITICAL", M.OpsEvent.acknowledged_at == 0.0)
    critical = db.scalar(select(func.count()).select_from(critical_statement.subquery())) or 0

    # Unacknowledged criticals float to the top; everything else is newest-first.
    rows = db.scalars(
        statement.order_by(
            (M.OpsEvent.severity != "CRITICAL"),
            (M.OpsEvent.acknowledged_at != 0.0),
            M.OpsEvent.created_at.desc(),
        ).offset(offset).limit(limit)
    ).all()

    return {
        "items": [payload(row) for row in rows],
        "total": total,
        "critical": critical,
        "scope": "all" if user.get("role") == "SUPER_ADMIN" else user.get("role", ""),
    }


def payload(row: M.OpsEvent) -> dict:
    return {
        "id": row.id, "kind": row.kind, "domain": row.domain, "severity": row.severity,
        "actorId": row.actor_id, "actorRole": row.actor_role, "subjectId": row.subject_id,
        "providerId": row.provider_id, "resourceType": row.resource_type,
        "resourceId": row.resource_id, "summary": row.summary, "createdAt": row.created_at,
        "acknowledgedAt": row.acknowledged_at or None, "acknowledgedBy": row.acknowledged_by,
    }


def counts_by_domain(db, user: dict) -> dict:
    """Unacknowledged totals per domain — the tile row on an ops dashboard."""
    statement = _visible_statement(db, user)
    if statement is None:
        return {}
    subquery = statement.where(M.OpsEvent.acknowledged_at == 0.0).subquery()
    rows = db.execute(select(subquery.c.domain, func.count()).group_by(subquery.c.domain)).all()
    return {domain: count for domain, count in rows}


def visible_ids(db, user: dict, event_ids: list[str]) -> list[str]:
    """Filter ids down to those this role may act on. Used before acknowledging."""
    statement = _visible_statement(db, user)
    if statement is None or not event_ids:
        return []
    rows = db.scalars(statement.where(M.OpsEvent.id.in_(event_ids))).all()
    return [row.id for row in rows]
