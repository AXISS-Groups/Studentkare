"""
services.workflow_scheduler — Durable background job runner.

Stores schedules, completed run outcomes, and notification intents in the database.
The default cadence is 7,200 seconds (2 hours); outbox delivery runs every 45 s.
enqueue() persists an inbox/outbox intent immediately; it does not deliver it.
The worker (scripts.workflow_worker --loop) polls due jobs. Each run holds a
lease on its ScheduledJob row, so several workers/replicas can poll safely.
"""
from __future__ import annotations

import logging
import os
import socket
import threading
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import case, func, select, update

logger = logging.getLogger("services.workflow_scheduler")

DEFAULT_INTERVAL_SECONDS = 7200
MAX_BATCH_SIZE = 25
# Delivery attempts before an outbox event is marked FAILED.
OUTBOX_MAX_ATTEMPTS = 3
# Wait before the next attempt, by attempts made so far (1, 2, ...). Three
# attempts span ~6 minutes of outage, not one 2-3 minute blip. Safety alerts
# retry sooner, but still no more than once per outbox pass.
OUTBOX_RETRY_BACKOFF_SECONDS = (60, 300, 900)
URGENT_RETRY_BACKOFF_SECONDS = (15, 60, 300)

# Fixed allowlist for the periodic cycle. Handlers use the supplied DB session
# and must not commit when called by the runner. These are operational checks, never
# user-facing camera/mic/sensor activation.
PERIODIC_JOBS = {
    "integration_health": "Integration & service health monitor",
    "reminder_reconcile": "Notification & reminder reconciliation",
    "document_intake_reconcile": "Document intake pending/failed reconciliation",
    "knowledge_freshness": "Approved knowledge-source freshness check",
    "care_followup": "Care-request follow-up & overdue detection",
    "slack_selftest": "Slack ops-alert channel self-test & volumetric digest",
    "campus_departures": "Complete campus departures whose date has arrived",
    "account_erasure": "Erase accounts whose 7-day window has passed; destroy expired archives",
}

# Per-job cadence overrides (seconds). Everything else uses DEFAULT_INTERVAL_SECONDS.
JOB_INTERVAL_OVERRIDES = {
    "slack_selftest": 3600,
    # Outbox delivery carries BLOOD_SOS / CRISIS_ALERT. 45 s plus the worker's
    # 15 s poll keeps worst-case pickup at about a minute. An idle pass is one
    # indexed SELECT; providers are only called for PENDING events, at most
    # MAX_BATCH_SIZE per pass, so a short cadence does not hammer them.
    "reminder_reconcile": 45,
}

# A run lease must outlive the slowest bounded pass (25 outbox events with
# 10-15 s provider timeouts each); if its holder dies it expires and the job
# becomes claimable again.
LEASE_SECONDS = 900
WORKER_POLL_SECONDS = 15
_PROCESS_ID = f"{socket.gethostname()[:40]}:{os.getpid()}"


def now() -> float:
    return time.time()


class UnknownJobError(ValueError):
    """The requested job has no registered runtime handler."""


class JobBusyError(RuntimeError):
    """Another worker or replica currently holds this job's run lease."""


def _claim_lease(db, key: str, owner: str, *, require_due: bool) -> bool:
    """Atomically take the job's lease; True only for the single winner.

    A conditional UPDATE is atomic on Postgres (a concurrent claimer re-checks
    the WHERE clause after the first commits) and on SQLite (writes serialise),
    and it works through PgBouncer transaction pooling, unlike session advisory
    locks. Scheduled runs also require the job to still be due, so a job that
    another worker has just finished is not run twice.
    """
    from core import workflow_models as M
    t = now()
    conditions = [M.ScheduledJob.key == key, M.ScheduledJob.lease_expires_at <= t]
    if require_due:
        conditions += [M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= t]
    claimed = db.execute(
        update(M.ScheduledJob).where(*conditions)
        .values(lease_owner=owner, lease_expires_at=t + LEASE_SECONDS)
        .execution_options(synchronize_session=False)
    ).rowcount == 1
    db.commit()
    return claimed


def _release_lease(db, key: str, owner: str) -> None:
    """Stage the lease release; only the holder that took it can release it."""
    from core import workflow_models as M
    db.execute(
        update(M.ScheduledJob)
        .where(M.ScheduledJob.key == key, M.ScheduledJob.lease_owner == owner)
        .values(lease_owner="", lease_expires_at=0.0)
        .execution_options(synchronize_session=False)
    )


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
    for key, interval in JOB_INTERVAL_OVERRIDES.items():
        job = db.get(M.ScheduledJob, key)
        if job is not None and job.interval_seconds != interval:
            job.interval_seconds = interval
            # A shortened cadence takes effect now, not after the old interval.
            job.next_run_at = min(job.next_run_at or 0.0, now() + interval)
    db.commit()
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
    """Bounded, serial runner. Each run holds its job's lease, so any number of
    workers/replicas may poll; a job never runs twice at the same time."""

    def run_due_jobs(self, db) -> dict:
        """Execute at most 25 due, enabled, allowlisted jobs in stable order.

        Jobs whose lease another worker holds, or that stopped being due, are
        left out of the result: this worker did not run them.
        """
        from core import workflow_models as M
        results = {}
        due = db.scalars(
            select(M.ScheduledJob.key).where(
                M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= now(),
                M.ScheduledJob.key.in_(PERIODIC_JOBS),
            ).order_by(M.ScheduledJob.next_run_at, M.ScheduledJob.key).limit(MAX_BATCH_SIZE)
        ).all()
        for key in due:
            try:
                results[key] = self.run_job_now(db, key, require_due=True)["status"]
            except JobBusyError:
                continue
        return results

    def run_job_now(self, db, key: str, *, require_due: bool = False) -> dict:
        """Run one registered job; commit its outcome and schedule together.

        Manual runs explicitly bypass enabled/due checks but never the lease:
        if another worker is running the job, JobBusyError is raised. Handler
        failures roll back partial work before recording FAILED. Persistence
        failures propagate; the lease then expires after LEASE_SECONDS.
        """
        from core import workflow_models as M
        _job_payload(db, key)
        owner = f"{_PROCESS_ID}/{uuid.uuid4().hex[:12]}"
        if not _claim_lease(db, key, owner, require_due=require_due):
            raise JobBusyError("Job is already running.")
        job = db.get(M.ScheduledJob, key)
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
        _release_lease(db, key, owner)
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
        if key == "slack_selftest":
            return slack_selftest(db)
        if key == "account_erasure":
            from services.erasure import process_due_erasures
            return process_due_erasures(db)
        if key == "campus_departures":
            from services.campus_departure import complete_due_departures
            return complete_due_departures(db)
        raise UnknownJobError("Unknown job.")


def run_worker_loop(session_factory: Callable, stop: threading.Event, *,
                    poll_seconds: float = WORKER_POLL_SECONDS,
                    on_pass: Callable[[dict], None] | None = None) -> int:
    """Poll due jobs until ``stop`` is set; returns the number of passes.

    A pass that fails (e.g. the database is briefly unreachable) is logged by
    exception type only, never its message, and retried after the poll interval.
    ``stop`` is checked between passes, so a running job always finishes.
    """
    passes = 0
    while not stop.is_set():
        try:
            with session_factory() as db:
                ensure_scheduled_jobs(db)
                outcome = workflow_scheduler.run_due_jobs(db)
            if on_pass is not None:
                on_pass(outcome)
        except Exception as exc:
            logger.error("Workflow worker pass failed (%s); retrying in %ss", type(exc).__name__, poll_seconds)
        passes += 1
        stop.wait(poll_seconds)
    return passes


def slack_selftest(db) -> dict:
    """Dead-man's switch for the Slack ops-alert path + volumetric digest.

    - Slack disabled -> SKIPPED (no noise when the feature is off).
    - auth.test fails -> FAILED with a loud error log (visible in the ops
      scheduler dashboard); the token is never logged or echoed.
    - auth.test passes -> SUCCESS; if any volumetric counters accumulated
      (appointments, triage evals, 5xx), one aggregate digest is posted.
      Counts only — never identifiers, never PHI.
    Never commits; the runner owns the transaction. Never raises outward
    beyond the runner's own guard.
    """
    from services.integration_config import INTEGRATIONS_DB
    from services.slack_notifier import post_ops_alert, take_counters

    cfg = INTEGRATIONS_DB.get("slack", {})
    counters = take_counters()
    activity = {k: int(v) for k, v in counters.items() if int(v) > 0}
    if not cfg.get("enabled"):
        return {"status": "SKIPPED", "summary": {"reason": "slack disabled", "counters": activity}}

    token = str(cfg.get("bot_token") or "")
    if not token:
        logger.error("[slack_selftest] FAILED: Slack enabled but bot_token is missing")
        return {"status": "FAILED", "summary": {"ok": False, "counters": activity},
                "error": "Slack enabled but bot_token is missing"}

    import httpx
    try:
        r = httpx.post("https://slack.com/api/auth.test",
                       headers={"Authorization": f"Bearer {token}"}, timeout=10)
        data = r.json()
    except (httpx.HTTPError, OSError, ValueError) as err:
        logger.error("[slack_selftest] FAILED: Slack auth.test unreachable: %s", str(err)[:120])
        return {"status": "FAILED", "summary": {"ok": False, "counters": activity},
                "error": f"Slack auth.test unreachable: {str(err)[:120]}"}
    if not (200 <= r.status_code < 300 and data.get("ok") is True):
        err_code = str(data.get("error") or "unknown_error")[:120]
        logger.error("[slack_selftest] FAILED: Slack rejected token: %s", err_code)
        return {"status": "FAILED", "summary": {"ok": False, "counters": activity},
                "error": f"Slack rejected token: {err_code}"}

    team = str(data.get("team") or "")[:80]
    digest_posted = False
    if activity:
        parts = ", ".join(f"{k}: {v}" for k, v in sorted(activity.items()))
        digest = post_ops_alert(
            f":bar_chart: Studentkare ops digest — {parts}. Counts only, no patient data included.",
            kind="digest",
        )
        digest_posted = bool(digest.get("success"))
        if not digest_posted:
            logger.warning("[slack_selftest] DEGRADED: digest post failed: %s",
                           str(digest.get("reason") or "")[:120])
            return {"status": "DEGRADED",
                    "summary": {"ok": True, "team": team, "counters": activity, "digest_posted": False},
                    "error": f"digest post failed: {str(digest.get('reason') or '')[:120]}"}
    return {"status": "SUCCESS",
            "summary": {"ok": True, "team": team, "counters": activity, "digest_posted": digest_posted}}


def _count_pending(db) -> int:
    from core import workflow_models as M
    return db.scalar(select(func.count()).select_from(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING"))


# Event types that are never gated and never deferred. Someone in danger does
# not get to be quiet-houred, and a preference switch is not a reason to
# withhold an emergency broadcast (AGENTS.md: help is always one tap away).
# Safety alerts ignore quiet hours and channel preferences. That includes the
# answers to a student's own SOS: "someone is coming" must not wait until 08:00.
URGENT_EVENT_TYPES = frozenset({"BLOOD_SOS", "CRISIS_ALERT", "SOS_ACKNOWLEDGED", "SOS_RESOLVED"})

# Event types a student can turn off under "consult and dose reminders".
REMINDER_EVENT_TYPES = frozenset({"MEDICATION_REMINDER", "medication_refill", "appointment_reminder"})

DEFAULT_TIMEZONE = "Asia/Kolkata"


def in_quiet_hours(start: str, end: str, at: datetime) -> bool:
    """Whether ``at`` falls inside a HH:MM..HH:MM window that may wrap midnight."""
    try:
        start_h, start_m = (int(part) for part in str(start).split(":"))
        end_h, end_m = (int(part) for part in str(end).split(":"))
    except (ValueError, TypeError):
        return False
    start_min, end_min = start_h * 60 + start_m, end_h * 60 + end_m
    if start_min == end_min:
        return False
    minutes = at.hour * 60 + at.minute
    if start_min < end_min:
        return start_min <= minutes < end_min
    return minutes >= start_min or minutes < end_min


def preference_verdict(prefs, event_type: str, channel: str, at: datetime) -> tuple[str, str]:
    """What the recipient's stored preferences say about delivering this now.

    Returns ("send", ""), ("suppress", reason) for a setting the student turned
    off, or ("defer", reason) for quiet hours — deferring keeps the event
    PENDING so it goes out once the window passes, whereas suppressing is
    terminal. Conflating the two either loses a message or retries it forever.
    """
    if event_type in URGENT_EVENT_TYPES:
        return "send", ""
    if prefs is None:
        # Never configured. The column defaults are all on, so honour that.
        return "send", ""
    if event_type in REMINDER_EVENT_TYPES and not prefs.reminders_enabled:
        return "suppress", "reminders_disabled"
    if channel == "EMAIL" and not prefs.email_enabled:
        return "suppress", "email_disabled"
    if in_quiet_hours(prefs.quiet_start, prefs.quiet_end, at):
        return "defer", "quiet_hours"
    return "send", ""


def quiet_hours_end(end: str, at: datetime) -> float:
    """Epoch seconds of the next ``end`` (HH:MM, local to ``at``) after ``at``."""
    try:
        hour, minute = (int(part) for part in str(end).split(":"))
        candidate = at.replace(hour=hour, minute=minute, second=0, microsecond=0)
    except (ValueError, TypeError):
        return at.timestamp() + 300
    if candidate <= at:
        candidate += timedelta(days=1)
    return candidate.timestamp()


def defer_until(event, ts: float) -> None:
    """Keep a PENDING outbox event out of every pass until ``ts`` (epoch seconds).

    For quiet hours, retry backoff, or a reminder that is not due yet: the pick
    query skips it, so it stops occupying one of the 25 batch slots.
    """
    event.status = "PENDING"
    event.next_attempt_at = max(float(ts), 0.0)


def _preference_verdict_for(db, event) -> tuple[str, str, float]:
    """Look up the recipient's preferences and apply them to one event.

    Returns (verdict, reason, defer-until epoch seconds; 0 unless deferred).
    """
    from core import workflow_models as M

    account_id = getattr(event, "account_id", "") or ""
    if not account_id:
        return "send", "", 0.0
    prefs = db.get(M.NotificationPreference, account_id)
    zone = (getattr(prefs, "timezone", "") or DEFAULT_TIMEZONE) if prefs else DEFAULT_TIMEZONE
    try:
        local = datetime.fromtimestamp(now_seconds(), ZoneInfo(zone))
    except (ZoneInfoNotFoundError, ValueError):
        local = datetime.fromtimestamp(now_seconds(), ZoneInfo(DEFAULT_TIMEZONE))
    channel = (getattr(event, "payload", None) or {}).get("channel", "")
    verdict, why = preference_verdict(prefs, event.event_type or "", channel, local)
    until = quiet_hours_end(prefs.quiet_end, local) if verdict == "defer" and prefs is not None else 0.0
    return verdict, why, until


# Event types _deliver_event sends over WhatsApp or email.
EXTERNAL_EVENT_TYPES = frozenset({"BLOOD_SOS", "GENERIC_NOTIFICATION", "MEDICATION_REMINDER"})


def is_in_app_notice(event) -> bool:
    """An ops_feed.notify notice: it has no outside channel and is done once queued.

    The student's inbox (GET /notifications) reads the outbox row itself, so the
    notice has reached them the moment it exists. Recognised by notify()'s payload
    shape (a "summary"), never by event type alone, so a reminder or an unknown
    type that ought to go out over a channel is not quietly called delivered.
    """
    event_type = event.event_type or ""
    if event_type in EXTERNAL_EVENT_TYPES or event_type in REMINDER_EVENT_TYPES:
        return False
    return "summary" in (event.payload or {})


def outbox_route(event) -> tuple[str, str]:
    """(channel, raw recipient) that _deliver_event would use for this event.

    IN_APP notices have no outside channel: they reach the student's inbox only.
    An empty channel means no route exists, which is a real problem to surface.
    The recipient is a contact detail; callers must mask it before showing it.
    """
    payload = event.payload or {}
    event_type = event.event_type or ""
    if event_type == "BLOOD_SOS":
        return "WHATSAPP", str(payload.get("phone", "") or "")
    if event_type in ("GENERIC_NOTIFICATION", "MEDICATION_REMINDER"):
        return str(payload.get("channel", "WHATSAPP") or "WHATSAPP"), str(payload.get("to", "") or "")
    return ("IN_APP" if is_in_app_notice(event) else ""), ""


def _deliver_event(event) -> dict:
    """Route an outbox event to the correct otp_delivery channel.

    Returns the delivery result dict without raising. Caller handles
    status updates and retry logic.
    """
    from services.otp_delivery import _openwa, _send_email, _send_openwa, normalize_chat_id

    payload = event.payload or {}
    event_type = event.event_type or ""

    if event_type == "BLOOD_SOS":
        phone = payload.get("phone", "")
        text = payload.get("text", "")
        if not phone or not text:
            return {"status": "skipped", "reason": "missing_phone_or_text"}
        ow = _openwa()
        chat_id = normalize_chat_id(phone, ow["cc"])
        return _send_openwa(chat_id, text)

    if event_type in ("GENERIC_NOTIFICATION", "MEDICATION_REMINDER"):
        channel = payload.get("channel", "WHATSAPP")
        to = payload.get("to", "")
        body = payload.get("body", "")
        if not to or not body:
            return {"status": "skipped", "reason": "missing_recipient_or_body"}
        if channel == "EMAIL":
            return _send_email(to, body)
        ow = _openwa()
        chat_id = normalize_chat_id(to, ow["cc"])
        return _send_openwa(chat_id, body)

    return {"status": "skipped", "reason": f"unhandled_event_type:{event_type}"}


def _retry_delay(event) -> float:
    table = URGENT_RETRY_BACKOFF_SECONDS if event.event_type in URGENT_EVENT_TYPES else OUTBOX_RETRY_BACKOFF_SECONDS
    return float(table[min(max(event.attempts or 1, 1), len(table)) - 1])


def _process_outbox(db, max_batch: int = MAX_BATCH_SIZE) -> dict:
    """Process a bounded batch of due outbox events with real delivery.

    Delivery uses otp_delivery._send_openwa / _send_email directly.
    Each event is attempted; SENT marks success, FAILED after max attempts.
    Delivery failures are recorded per event and never raise.

    No repeat sends: before a provider is called the event is committed as
    SENDING (next_attempt_at = claim deadline), and its outcome is committed
    right after the call. A worker killed in between leaves it SENDING; once
    the deadline passes it is failed as "outcome unknown" (visible in the admin
    outbox and requeueable), never sent again automatically.

    Safety events are picked before anything else, then oldest first. Events
    whose next_attempt_at is in the future (retry backoff, quiet hours, a
    reminder not yet due) are skipped, so they do not hold batch slots; one
    that can never be sent (no route, missing recipient) fails at once.
    """
    from core import workflow_models as M
    if type(max_batch) is not int or max_batch < 1:
        raise ValueError("max_batch must be a positive integer.")

    t = now_seconds()
    interrupted = db.execute(
        update(M.OutboxEvent)
        .where(M.OutboxEvent.status == "SENDING", M.OutboxEvent.next_attempt_at <= t)
        .values(status="FAILED", last_error="delivery_interrupted_outcome_unknown", next_attempt_at=0.0)
        .execution_options(synchronize_session=False)
    ).rowcount or 0
    db.commit()

    urgent_first = case((M.OutboxEvent.event_type.in_(URGENT_EVENT_TYPES), 0), else_=1)
    pending = db.scalars(
        select(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING", M.OutboxEvent.next_attempt_at <= t)
        .order_by(urgent_first, M.OutboxEvent.created_at, M.OutboxEvent.id).limit(min(max_batch, MAX_BATCH_SIZE))
    ).all()

    delivered, failed, suppressed, deferred, in_app = 0, 0, 0, 0, 0
    for event in pending:
        if is_in_app_notice(event):
            # Already in the student's inbox; nothing to send, so neither quiet
            # hours nor channel switches apply. Terminal, so it stops counting as backlog.
            event.status = "SENT"
            event.sent_at = now()
            event.last_error = ""
            in_app += 1
            db.commit()
            continue
        verdict, why, until = _preference_verdict_for(db, event)
        if verdict == "suppress":
            # Terminal: the student turned this off. Recording it rather than
            # deleting it keeps the audit trail honest about what was withheld.
            event.status = "SUPPRESSED"
            event.last_error = why
            suppressed += 1
            db.commit()
            continue
        if verdict == "defer":
            # Stays PENDING, out of the batch until the quiet window ends.
            defer_until(event, until)
            event.last_error = why
            deferred += 1
            db.commit()
            continue

        # Claim before the provider call so a crash cannot lead to a resend.
        event.status = "SENDING"
        event.next_attempt_at = now_seconds() + LEASE_SECONDS
        db.commit()
        try:
            result = _deliver_event(event)
        except Exception as exc:
            result = {"status": "failed", "reason": str(exc)[:500]}

        if result.get("status") == "skipped":
            reason = (result.get("reason") or "skipped")[:1000]
            event.last_error = reason
            if not reason.endswith("_not_configured"):
                # No route or no recipient: retrying cannot help. FAILED keeps it
                # visible in the admin outbox and requeueable once a sender exists.
                event.status = "FAILED"
                event.next_attempt_at = 0.0
                failed += 1
                db.commit()
                continue
            # The channel is switched off: count it as a failed attempt below.

        event.attempts = (event.attempts or 0) + 1
        if result.get("status") == "sent":
            event.status = "SENT"
            event.sent_at = now()
            event.next_attempt_at = 0.0
            event.last_error = ""
            delivered += 1
        elif event.attempts >= OUTBOX_MAX_ATTEMPTS:
            event.status = "FAILED"
            event.next_attempt_at = 0.0
            event.last_error = result.get("reason", "")[:1000]
            failed += 1
        else:
            defer_until(event, now_seconds() + _retry_delay(event))
            event.last_error = result.get("reason", "")[:1000]
        db.commit()

    still_pending = sum(1 for event in pending if event.status == "PENDING")
    return {
        "pending": len(pending),
        # Left PENDING for a reason other than quiet hours: retrying after backoff.
        "stuck": still_pending - deferred,
        "delivered": delivered,
        "in_app": in_app,
        "failed": failed + interrupted,
        "interrupted": interrupted,
        "suppressed": suppressed,
        "deferred": deferred,
        "messaging_available": True,
    }


def reminder_reconcile(db) -> dict:
    """Reconcile reminder/notification outbox delivery. Runs every 45 s (JOB_INTERVAL_OVERRIDES)."""
    outbox = _process_outbox(db)
    # Quiet-hours deferrals are by design; a failure, or anything else left PENDING, needs a look.
    blocked = outbox["stuck"] or outbox["failed"]
    return {"status": "BLOCKED" if blocked else "SUCCESS", "summary": {"outbox": outbox}}


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
