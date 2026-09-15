"""
services.workflow_scheduler — Durable background job runner.

Stores schedules, completed run outcomes, and notification intents in the database.
The default cadence is 7,200 seconds (2 hours). enqueue() persists an inbox/outbox
intent immediately; it does not deliver it. The finite worker CLI polls due jobs.
"""
from __future__ import annotations

import logging
import time
import uuid

from sqlalchemy import func, select

logger = logging.getLogger("services.workflow_scheduler")

DEFAULT_INTERVAL_SECONDS = 7200
MAX_BATCH_SIZE = 25

# Fixed allowlist for the periodic cycle. Handlers use the supplied DB session
# and must not commit when called by the runner. These are operational checks, never
# user-facing camera/mic/sensor activation.
PERIODIC_JOBS = {
    "integration_health": "Integration & service health monitor",
    "reminder_reconcile": "Notification & reminder reconciliation",
    "document_intake_reconcile": "Document intake pending/failed reconciliation",
    "knowledge_freshness": "Approved knowledge-source freshness check",
    "care_followup": "Care-request follow-up & overdue detection",
}


def now() -> float:
    return time.time()


class UnknownJobError(ValueError):
    """The requested job has no registered runtime handler."""


def _job_payload(db, key: str):
    if key not in PERIODIC_JOBS:
        raise UnknownJobError("Unknown job.")
    from core import workflow_models as M
    job = db.get(M.ScheduledJob, key)
    if job is None:
        job = M.ScheduledJob(
            key=key,
            name=PERIODIC_JOBS.get(key, key),
            interval_seconds=DEFAULT_INTERVAL_SECONDS,
            enabled=True,
            last_run_at=0.0,
            next_run_at=now(),
            last_status="NEVER_RUN",
            last_error="",
        )
        db.add(job)
        db.commit()
    return job


def ensure_scheduled_jobs(db) -> dict:
    """Create any missing periodic jobs. Idempotent."""
    from core import workflow_models as M
    created = 0
    for key in PERIODIC_JOBS:
        if db.get(M.ScheduledJob, key) is None:
            _job_payload(db, key)
            created += 1
    return {"created": created, "interval_seconds": DEFAULT_INTERVAL_SECONDS}


def enqueue(db, event_type: str, dedupe_key: str, payload: dict, account_id: str = "") -> str:
    """Queue an immediate, deduplicated outbox event. Returns its id."""
    from core import workflow_models as M
    existing = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.dedupe_key == dedupe_key))
    if existing:
        return existing.id
    event_id = f"evt_{uuid.uuid4().hex[:16]}"
    db.add(M.OutboxEvent(
        id=event_id, event_type=event_type, account_id=account_id, dedupe_key=dedupe_key,
        payload=payload, attempts=0, status="PENDING", created_at=now(),
    ))
    db.commit()
    return event_id


def _record_run(db, job_key: str, status: str, summary: dict, *, started_at: float,
                finished_at: float, error: str = "") -> str:
    """Stage the real outcome in the same transaction as its schedule/work."""
    from core import workflow_models as M
    run_id = f"run_{uuid.uuid4().hex[:16]}"
    db.add(M.AgentRun(
        id=run_id, job_key=job_key, status=status, started_at=started_at,
        finished_at=finished_at, error=error[:1000], summary=summary,
    ))
    return run_id


class WorkflowScheduler:
    """Bounded, serial runner. Deploy one worker; this is not a distributed lease."""

    def run_due_jobs(self, db) -> dict:
        """Execute at most 25 due, enabled, allowlisted jobs in stable order."""
        from core import workflow_models as M
        results = {}
        due = db.scalars(
            select(M.ScheduledJob.key).where(
                M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= now(),
                M.ScheduledJob.key.in_(PERIODIC_JOBS),
            ).order_by(M.ScheduledJob.next_run_at, M.ScheduledJob.key).limit(MAX_BATCH_SIZE)
        ).all()
        for key in due:
            results[key] = self.run_job_now(db, key)["status"]
        return results

    def run_job_now(self, db, key: str) -> dict:
        """Run one registered job; commit its outcome and schedule together.

        Manual runs explicitly bypass enabled/due checks. Handler failures roll
        back partial work before recording FAILED. Persistence failures propagate.
        """
        from core import workflow_models as M
        job = _job_payload(db, key)
        started_at = now()
        try:
            outcome = self._execute(key, db)
            status = outcome.get("status", "SUCCESS")
            if status not in {"SUCCESS", "FAILED", "BLOCKED", "SKIPPED", "DEGRADED"}:
                raise ValueError("Invalid job outcome status.")
            summary = outcome.get("summary", {})
            error = outcome.get("error", "")[:1000]
            db.flush()
        except Exception as exc:
            db.rollback()
            logger.exception("Scheduled job %s failed", key)
            job = db.get(M.ScheduledJob, key)
            status, summary, error = "FAILED", {}, str(exc)[:1000]
        finished_at = now()
        job.last_status = status
        job.last_error = error
        job.last_run_at = finished_at
        job.next_run_at = finished_at + max(job.interval_seconds or DEFAULT_INTERVAL_SECONDS, 1)
        run_id = _record_run(db, key, status, summary, started_at=started_at,
                             finished_at=finished_at, error=error)
        db.commit()
        results = {"key": key, "status": status, "summary": summary, "runId": run_id}
        if error:
            results["error"] = error
        return results

    def _execute(self, key: str, db) -> dict:
        """Dispatch a job to its handler."""
        if key == "integration_health":
            return integration_health_check(db)
        if key == "reminder_reconcile":
            return reminder_reconcile(db)
        if key == "document_intake_reconcile":
            return document_intake_reconcile(db)
        if key == "knowledge_freshness":
            return knowledge_freshness_check(db)
        if key == "care_followup":
            return care_followup_check(db, commit=False)
        raise UnknownJobError("Unknown job.")


def _count_pending(db) -> int:
    from core import workflow_models as M
    return db.scalar(select(func.count()).select_from(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING"))


def _process_outbox(db, max_batch: int = MAX_BATCH_SIZE) -> dict:
    """Inspect a bounded queued batch. No delivery adapter is implemented.

    Credentials do not prove delivery. Preserve inbox state, attempt counters,
    and sent timestamps until an adapter can confirm a real delivery.
    """
    from core import workflow_models as M
    if type(max_batch) is not int or max_batch < 1:
        raise ValueError("max_batch must be a positive integer.")
    pending = db.scalars(
        select(M.OutboxEvent.id).where(M.OutboxEvent.status == "PENDING")
        .order_by(M.OutboxEvent.created_at, M.OutboxEvent.id).limit(min(max_batch, MAX_BATCH_SIZE))
    ).all()
    return {"pending": len(pending), "delivered": 0, "failed": 0,
            "messaging_available": False, "reason": "No notification delivery adapter is implemented."}


def reminder_reconcile(db) -> dict:
    """Reconcile reminder/notification outbox delivery. Runs on the 2-hour cycle."""
    outbox = _process_outbox(db)
    return {"status": "BLOCKED" if outbox["pending"] else "SUCCESS", "summary": {"outbox": outbox}}


def document_intake_reconcile(db) -> dict:
    """Report actual backlog; extraction requires an implemented queue adapter."""
    from core import workflow_models as M
    pending, failed = db.execute(select(
        func.count().filter(M.DocumentIntake.status == "QUEUED"),
        func.count().filter(M.DocumentIntake.status == "FAILED"),
    ).select_from(M.DocumentIntake)).one()
    return {"status": "BLOCKED" if pending or failed else "SKIPPED",
            "summary": {"reconciled": 0, "pending": pending, "failed": failed,
                        "reason": "No document-intake queue adapter is implemented."}}


def knowledge_freshness_check(db) -> dict:
    """Flag approved knowledge sources that have expired or are near expiry."""
    from core import workflow_models as M
    timestamp = now_seconds()
    sources, expired, near = db.execute(select(
        func.count(),
        func.count().filter(M.KnowledgeSource.expires_at > 0, M.KnowledgeSource.expires_at < timestamp),
        func.count().filter(M.KnowledgeSource.expires_at >= timestamp,
                            M.KnowledgeSource.expires_at < timestamp + 30 * 86400),
    ).select_from(M.KnowledgeSource).where(
        M.KnowledgeSource.active.is_(True), M.KnowledgeSource.reviewed.is_(True),
    )).one()
    return {"summary": {"sources": sources, "expired": expired, "expiring_soon": near}}


def care_followup_check(db, *, commit: bool = True) -> dict:
    """Detect care requests that have sat unfulfilled too long and open follow-up tasks.

    A request is overdue if its ORDER was created beyond a threshold (48 hours) and
    a line is still REQUESTED/ACCEPTED. This creates a staff follow-up task rather
    than fabricating a provider action — the platform never marks a request as
    fulfilled on its own.
    """
    from core import workflow_models as M
    now = now_seconds()
    threshold = now - 48 * 3600
    # Filter before limiting so existing tasks cannot starve later orders.
    overdue_orders = db.scalars(
        select(M.Order).where(
            M.Order.created_at < threshold,
            select(M.OrderLine.id).where(
                M.OrderLine.order_id == M.Order.id,
                M.OrderLine.status.in_(("REQUESTED", "ACCEPTED")),
            ).exists(),
            ~select(M.FollowUpTask.id).where(
                M.FollowUpTask.order_id == M.Order.id, M.FollowUpTask.status == "OPEN",
            ).exists(),
        ).order_by(M.Order.created_at, M.Order.id).limit(MAX_BATCH_SIZE)
    ).all()
    created = 0
    for order in overdue_orders:
        open_lines = db.scalars(select(M.OrderLine).where(
            M.OrderLine.order_id == order.id, M.OrderLine.status.in_(("REQUESTED", "ACCEPTED")),
        ).order_by(M.OrderLine.id).limit(2)).all()
        if not open_lines:
            continue
        names = ", ".join(line.name for line in open_lines[:2])
        db.add(M.FollowUpTask(id=f"fu_{uuid4().hex[:12]}", order_id=order.id,
                              account_id=open_lines[0].provider_id,
                              note=f"Request(s) {names} unfulfilled for over 48h.",
                              status="OPEN", created_at=now))
        created += 1
    if commit:
        db.commit()
    else:
        db.flush()
    return {"summary": {"overdue_orders": len(overdue_orders), "followups_created": created}}


def now_seconds() -> float:
    return time.time()


def uuid4():
    import uuid
    return uuid.uuid4()


def enqueue_reminder(db, account_id: str, reminder_type: str, dedupe_key: str, payload: dict) -> str:
    """Persist a durable, deduplicated reminder; queuing does not imply delivery."""
    return enqueue(db, reminder_type, dedupe_key, payload, account_id=account_id)


def _probe(url: str, timeout: float = 6.0) -> tuple[bool, float, str]:
    """Safe GET/HEAD probe. Never sends real user data."""
    import httpx
    try:
        with httpx.Client(timeout=timeout) as client:
            start = time.time()
            resp = client.get(url)
            latency_ms = round((time.time() - start) * 1000, 1)
            ok = 200 <= resp.status_code < 300
            return ok, latency_ms, f"HTTP {resp.status_code}"
    except Exception as exc:  # noqa: BLE001 - probe result, not a raise
        return False, 0.0, str(exc)[:200]


def integration_health_check(db) -> dict:
    """Probe configured external services and report honest, current status.

    Uses only non-mutating probes; it never sends a real notification or patient
    message as a health check. When a provider is not configured, it is reported
    as 'unavailable', never as 'online'.
    """
    from services.integration_config import INTEGRATIONS_DB

    checks = []

    def add(name: str, configured: bool, reachable: bool | None, detail: str):
        checks.append({
            "name": name, "configured": configured,
            "reachable": reachable, "status": ("online" if (configured and reachable)
                                               else "unavailable" if not configured
                                               else "degraded" if reachable is False else "unknown"),
            "detail": detail, "checked_at": now(),
        })

    # LLM / model gateway
    llm_cfg = INTEGRATIONS_DB.get("llm", {})
    add("model_gateway", bool(llm_cfg.get("enabled")), None, "configured" if llm_cfg.get("enabled") else "not configured")

    # OpenWA messaging
    openwa = INTEGRATIONS_DB.get("openwa", {})
    if openwa.get("enabled") and openwa.get("base_url") and openwa.get("session_id"):
        ok, ms, detail = _probe(f"{openwa['base_url'].rstrip('/')}/api/sessions/{openwa['session_id']}")
        add("messaging_openwa", True, ok, f"{detail} · {ms} ms")
    else:
        add("messaging_openwa", False, None, "not configured")

    # Postal email
    postal = INTEGRATIONS_DB.get("postal", {})
    if postal.get("enabled") and postal.get("api_url"):
        add("email_postal", True, None, "configured; no read-only health probe implemented")
    else:
        add("email_postal", False, None, "not configured")

    # PostHog analytics
    posthog = INTEGRATIONS_DB.get("posthog", {})
    if posthog.get("enabled") and posthog.get("host"):
        ok, ms, detail = _probe(posthog["host"].rstrip('/') + "/")
        add("analytics_posthog", True, ok, f"{detail} · {ms} ms")
    else:
        add("analytics_posthog", False, None, "not configured")

    # Firebase
    firebase = INTEGRATIONS_DB.get("firebase", {})
    add("firebase", bool(firebase.get("enabled")), None, "configured" if firebase.get("enabled") else "not configured")

    summary = {
        "checked_at": now(),
        "interval_seconds": DEFAULT_INTERVAL_SECONDS,
        "checks": checks,
        "overall": "operational" if all(c["status"] == "online" for c in checks) else "degraded",
    }
    return {"summary": summary}


workflow_scheduler = WorkflowScheduler()
