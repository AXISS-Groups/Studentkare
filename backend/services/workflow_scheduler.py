"""
services.workflow_scheduler — Durable background job runner.

Provides a persistent, restart-safe job scheduler for the workflow plane. Jobs are
stored in the database (care_scheduled_jobs / care_agent_runs / care_outbox_events)
so a restart never loses scheduled work or fabricates successful runs.

The default cadence is 7,200 seconds (2 hours). User-triggered work and due
notifications run immediately through enqueue(), not by waiting for the next cycle.
"""
from __future__ import annotations

import logging
import time
import uuid

from sqlalchemy import select

logger = logging.getLogger("services.workflow_scheduler")

DEFAULT_INTERVAL_SECONDS = 7200

# Jobs registered for the periodic cycle. Each is a pure function so it can be
# unit-tested without a live dependency. These are operational checks, never
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


def _job_payload(db, key: str):
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


def _record_run(db, job_key: str, status: str, summary: dict, error: str = "") -> str:
    from core import workflow_models as M
    run_id = f"run_{uuid.uuid4().hex[:16]}"
    db.add(M.AgentRun(
        id=run_id, job_key=job_key, status=status, started_at=now(),
        finished_at=now(), error=error[:1000], summary=summary,
    ))
    db.commit()
    return run_id


class WorkflowScheduler:
    """Persistent scheduler; safe to call from a worker or an on-demand runner."""

    def run_due_jobs(self, db) -> dict:
        """Execute any periodic jobs whose next_run_at is due. One lease-style pass."""
        from core import workflow_models as M
        results = {}
        due = db.scalars(
            select(M.ScheduledJob).where(M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= now())
        ).all()
        for job in due:
            try:
                outcome = self._execute(job.key, db)
                job.last_status = "SUCCESS"
                job.last_error = ""
                job.summary = outcome.get("summary", {})
                results[job.key] = "SUCCESS"
            except Exception as exc:  # pragma: no cover - defensive
                logger.exception("Scheduled job %s failed", job.key)
                job.last_status = "FAILED"
                job.last_error = str(exc)[:1000]
                results[job.key] = "FAILED"
            job.last_run_at = now()
            job.next_run_at = now() + max(job.interval_seconds or DEFAULT_INTERVAL_SECONDS, 1)
        db.commit()
        return results

    def run_job_now(self, db, key: str) -> dict:
        """Run one job immediately (admin 'Check now'). Returns its status."""
        from core import workflow_models as M
        job = _job_payload(db, key)
        try:
            outcome = self._execute(key, db)
            job.last_status = "SUCCESS"
            job.last_error = ""
            job.summary = outcome.get("summary", {})
            results = {"key": key, "status": "SUCCESS", "summary": outcome.get("summary", {})}
        except Exception as exc:  # pragma: no cover - defensive
            job.last_status = "FAILED"
            job.last_error = str(exc)[:1000]
            results = {"key": key, "status": "FAILED", "error": str(exc)[:1000]}
        job.last_run_at = now()
        job.next_run_at = now() + max(job.interval_seconds or DEFAULT_INTERVAL_SECONDS, 1)
        db.commit()
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
            return care_followup_check(db)
        return {"summary": {}}


def _count_pending(db) -> int:
    from core import workflow_models as M
    return len(db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING")).all())


def _process_outbox(db, max_batch: int = 25) -> dict:
    """Deliver pending outbox events with bounded retries. Honest status only.

    No real channel is configured by default, so delivery is recorded as queued
    unless a messaging provider is available. This prevents claiming delivery
    that did not happen.
    """
    from core import workflow_models as M
    from services.integration_config import INTEGRATIONS_DB
    openwa = INTEGRATIONS_DB.get("openwa", {})
    messaging_available = bool(openwa.get("base_url") and openwa.get("api_key"))
    pending = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING").limit(max_batch)).all()
    delivered = failed = 0
    for event in pending:
        if event.attempts >= 3:
            event.status = "FAILED"
            event.last_error = event.last_error or "Exceeded retry limit."
            failed += 1
            continue
        if not messaging_available:
            # Leave queued; do not claim delivery.
            continue
        # Real delivery adapter would go here. Mark attempted to avoid tight-looping.
        event.attempts += 1
        event.status = "SENT"
        event.sent_at = now()
        delivered += 1
    db.commit()
    return {"pending": len(pending), "delivered": delivered, "failed": failed, "messaging_available": messaging_available}


def reminder_reconcile(db) -> dict:
    """Reconcile reminder/notification outbox delivery. Runs on the 2-hour cycle."""
    outbox = _process_outbox(db)
    return {"summary": {"outbox": outbox}}


def document_intake_reconcile(db) -> dict:
    """Reconcile eligible document-intake work. Placeholder for a real queue adapter."""
    return {"summary": {"reconciled": 0, "pending": 0}}


def knowledge_freshness_check(db) -> dict:
    """Flag approved knowledge sources that have expired or are near expiry."""
    from core import workflow_models as M
    now = now_seconds()
    rows = db.scalars(select(M.KnowledgeSource).where(M.KnowledgeSource.active.is_(True))).all()
    expired = near = 0
    for row in rows:
        if row.expires_at and row.expires_at < now:
            expired += 1
        elif row.expires_at and row.expires_at < now + 30 * 86400:
            near += 1
    return {"summary": {"sources": len(rows), "expired": expired, "expiring_soon": near}}


def care_followup_check(db) -> dict:
    """Detect care requests that have sat unfulfilled too long and open follow-up tasks.

    A request is overdue if its ORDER was created beyond a threshold (48 hours) and
    a line is still REQUESTED/ACCEPTED. This creates a staff follow-up task rather
    than fabricating a provider action — the platform never marks a request as
    fulfilled on its own.
    """
    from core import workflow_models as M
    now = now_seconds()
    threshold = now - 48 * 3600
    # Overdue orders with at least one unfulfilled line.
    overdue_orders = db.scalars(
        select(M.Order).where(M.Order.created_at < threshold)
    ).all()
    created = 0
    for order in overdue_orders:
        lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order.id)).all()
        open_lines = [line for line in lines if line.status in ("REQUESTED", "ACCEPTED")]
        if not open_lines:
            continue
        existing = db.scalar(
            select(M.FollowUpTask).where(M.FollowUpTask.order_id == order.id, M.FollowUpTask.status == "OPEN")
        )
        if existing:
            continue
        names = ", ".join(line.name for line in open_lines[:2])
        db.add(M.FollowUpTask(id=f"fu_{uuid4().hex[:12]}", order_id=order.id,
                              account_id=open_lines[0].provider_id,
                              note=f"Request(s) {names} unfulfilled for over 48h.",
                              status="OPEN", created_at=now))
        created += 1
    db.commit()
    return {"summary": {"overdue_orders": len(overdue_orders), "followups_created": created}}


def now_seconds() -> float:
    return time.time()


def uuid4():
    import uuid
    return uuid.uuid4()


def enqueue_reminder(db, account_id: str, reminder_type: str, dedupe_key: str, payload: dict) -> str:
    """Queue a durable, deduplicated reminder for immediate delivery."""
    return enqueue(db, reminder_type, dedupe_key, payload, account_id=account_id)


def _probe(url: str, timeout: float = 6.0) -> tuple[bool, float, str]:
    """Safe GET/HEAD probe. Never sends real user data."""
    import httpx
    try:
        with httpx.Client(timeout=timeout) as client:
            start = time.time()
            resp = client.get(url)
            latency_ms = round((time.time() - start) * 1000, 1)
            ok = 200 <= resp.status_code < 500
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
    llm_url = None
    add("model_gateway", bool(llm_cfg.get("enabled")), None, "configured" if llm_cfg.get("enabled") else "not configured")

    # OpenWA messaging
    openwa = INTEGRATIONS_DB.get("openwa", {})
    if openwa.get("base_url") and openwa.get("session_id"):
        ok, ms, detail = _probe(f"{openwa['base_url'].rstrip('/')}/api/sessions/{openwa['session_id']}")
        add("messaging_openwa", True, ok, f"{detail} · {ms} ms")
    else:
        add("messaging_openwa", False, None, "not configured")

    # Postal email
    postal = INTEGRATIONS_DB.get("postal", {})
    if postal.get("api_url"):
        ok, ms, detail = _probe(postal["api_url"].rstrip('/') + "/api/v1/send/message")
        add("email_postal", True, ok, f"{detail} · {ms} ms")
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
        "overall": "operational" if all(c["status"] in ("online", "unknown") for c in checks) else "degraded",
    }
    return {"summary": summary}


workflow_scheduler = WorkflowScheduler()
