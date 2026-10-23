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
from zoneinfo import ZoneInfo

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
    "account_erasure": "Erase accounts whose deletion grace period has passed; destroy expired archives",
    "payment_expiry": "Release the stock of orders and the slots of lab bookings not paid in time",
    "content_autopilot": "Content autopilot: official health news and the weekly blog plan (off until turned on)",
    "refill_reminders": "Queue refill reminders for medicines due to run out (student's own counts)",
    "stock_alerts": "Tell students who asked that an item is back in stock",
    "push_dispatch": "Send due push notifications (phones and browsers) and scheduled announcements",
    "push_receipts": "Read phone push receipts; retire devices that are gone or unused",
}

# Per-job cadence overrides (seconds). Everything else uses DEFAULT_INTERVAL_SECONDS.
JOB_INTERVAL_OVERRIDES = {
    "slack_selftest": 3600,
    # Outbox delivery carries BLOOD_SOS and the SOS answers. 45 s plus the worker's
    # 15 s poll keeps worst-case pickup at about a minute. An idle pass is one
    # indexed SELECT; providers are only called for PENDING events, at most
    # MAX_BATCH_SIZE per pass, so a short cadence does not hammer them.
    "reminder_reconcile": 45,
    # Unpaid orders hold stock for PAYMENT_HOLD_MINUTES (default 30); give it back
    # within a few minutes of the deadline, not hours.
    "payment_expiry": 300,
    # The content autopilot posts news "instantly": a new item is picked up within
    # one pass. It does nothing while its lanes are off (services/newsroom_autopilot.py).
    "content_autopilot": 900,
    # Refill reminders are due at a set minute of the student's day; a quarter-hour
    # pass keeps them close to it. An idle pass is one indexed SELECT.
    "refill_reminders": 900,
    # Push carries the SOS answers too, so it keeps the outbox's cadence.
    "push_dispatch": 45,
    "push_receipts": 900,
}

# Jobs that carry safety deliveries. They run first in every pass and again between
# slower jobs when they fall due (WorkflowScheduler.run_due_jobs).
URGENT_JOBS = frozenset({"reminder_reconcile", "push_dispatch"})

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
        """Execute at most 25 due, enabled, allowlisted jobs.

        Urgent jobs (URGENT_JOBS) go first, and are run again between the other
        jobs whenever they fall due, so a slow health probe or erasure sweep
        cannot hold up an SOS delivery for the rest of the pass (audit TD-49).
        Otherwise the order is stable. Jobs whose lease another worker holds, or
        that stopped being due, are left out of the result: this worker did not
        run them.
        """
        from core import workflow_models as M
        results = {}
        due = db.scalars(
            select(M.ScheduledJob.key).where(
                M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= now(),
                M.ScheduledJob.key.in_(PERIODIC_JOBS),
            ).order_by(M.ScheduledJob.next_run_at, M.ScheduledJob.key).limit(MAX_BATCH_SIZE)
        ).all()
        urgent = [key for key in due if key in URGENT_JOBS]
        rest = [key for key in due if key not in URGENT_JOBS]
        for key in urgent:
            self._run_due(db, key, results)
        for key in rest:
            self._run_due(db, key, results)
            for urgent_key in self._urgent_due(db):
                self._run_due(db, urgent_key, results)
        return results

    def _run_due(self, db, key: str, results: dict) -> None:
        try:
            results[key] = self.run_job_now(db, key, require_due=True)["status"]
        except JobBusyError:
            pass

    def _urgent_due(self, db) -> list[str]:
        from core import workflow_models as M
        return list(db.scalars(select(M.ScheduledJob.key).where(
            M.ScheduledJob.enabled.is_(True), M.ScheduledJob.next_run_at <= now(),
            M.ScheduledJob.key.in_(URGENT_JOBS))).all())

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
        if key == "payment_expiry":
            from services.lab_booking import expire_unpaid_lab_bookings
            from services.payments import expire_unpaid_orders
            orders = expire_unpaid_orders(db)["summary"]
            labs = expire_unpaid_lab_bookings(db)["summary"]
            return {"summary": {**orders, "lab_bookings_due": labs["due"], "lab_bookings_expired": labs["expired"],
                                "lab_bookings_needs_review": labs["needs_review"]}}
        if key == "content_autopilot":
            from services.newsroom_autopilot import run as run_content_autopilot
            return run_content_autopilot(db)
        if key == "refill_reminders":
            from services.refill_tracker import queue_due_reminders
            return queue_due_reminders(db)
        if key == "stock_alerts":
            from services.reorder import notify_back_in_stock
            return notify_back_in_stock(db)
        if key == "push_dispatch":
            from services.push_dispatch import dispatch, fan_out_due_announcements
            announced = fan_out_due_announcements(db)
            return {"summary": {**announced, **dispatch(db)}}
        if key == "push_receipts":
            from services.push_dispatch import check_receipts
            return check_receipts(db)
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
# CRISIS_ALERT is listed so it can never be held if something enqueues it, but
# nothing does today (audit JOB-06): crisis signals reach counsellors through the
# pull queue GET /api/ops/crisis-events, not a push. Adding a push is a clinical
# decision (Tier 1).
URGENT_EVENT_TYPES = frozenset({"BLOOD_SOS", "CRISIS_ALERT", "SOS_ACKNOWLEDGED", "SOS_RESOLVED"})

# Event types a student can turn off under "consult and dose reminders".
REMINDER_EVENT_TYPES = frozenset({"MEDICATION_REMINDER", "medication_refill", "appointment_reminder", "camp_reminder"})

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


def _recipient_zone(prefs, db=None) -> ZoneInfo:
    """The recipient's chosen zone, else the platform.default_timezone setting."""
    from services import student_time

    return student_time.zone_named(getattr(prefs, "timezone", None) if prefs else None, db)


def _preference_verdict_for(db, event, channel: str | None = None) -> tuple[str, str, float]:
    """Look up the recipient's preferences and apply them to one event.

    ``channel`` is the resolved delivery channel; when omitted it is read from
    the payload (GENERIC_NOTIFICATION carries its own route).
    Returns (verdict, reason, defer-until epoch seconds; 0 unless deferred).
    """
    from core import workflow_models as M

    account_id = getattr(event, "account_id", "") or ""
    if not account_id:
        return "send", "", 0.0
    prefs = db.get(M.NotificationPreference, account_id)
    local = datetime.fromtimestamp(now_seconds(), _recipient_zone(prefs, db))
    if channel is None:
        channel = (getattr(event, "payload", None) or {}).get("channel", "")
    verdict, why = preference_verdict(prefs, event.event_type or "", channel, local)
    until = quiet_hours_end(prefs.quiet_end, local) if verdict == "defer" and prefs is not None else 0.0
    return verdict, why, until


# Event types _deliver_event sends over WhatsApp or email. Reminders
# (REMINDER_EVENT_TYPES) go out through _deliver_reminder instead.
EXTERNAL_EVENT_TYPES = frozenset({"BLOOD_SOS", "GENERIC_NOTIFICATION"})

# What a reminder says outside the app. A WhatsApp preview or an email subject
# can be read over a shoulder or on a lock screen, so the text names no
# diagnosis, medicine, clinician or service; the in-app inbox (behind sign-in)
# carries the detail. The payload is never copied into the message.
REMINDER_MESSAGES = {
    "appointment_reminder": "You have an upcoming appointment in Student Kare. Open the app for details.",
    "medication_refill": "You have a medicine reminder in Student Kare. Open the app for details.",
    "MEDICATION_REMINDER": "You have a medicine reminder in Student Kare. Open the app for details.",
    # Never the camp's name or services: a dental or eye camp is care sought.
    "camp_reminder": "You have an upcoming booking in Student Kare. Open the app for details.",
}

# Appointment states a reminder still makes sense for.
_REMINDABLE_APPOINTMENT_STATES = frozenset({"REQUESTED", "CONFIRMED"})
_DEFAULT_MINUTES_BEFORE = 60


def reminder_message(event_type: str) -> str:
    return REMINDER_MESSAGES.get(event_type, REMINDER_MESSAGES["MEDICATION_REMINDER"])


def _parse_slot_start(value: str, zone: ZoneInfo) -> float | None:
    """A slot's ISO start as epoch seconds. Naive times are the student's local time."""
    try:
        start = datetime.fromisoformat(str(value or "").strip())
    except ValueError:
        return None
    if start.tzinfo is None:
        start = start.replace(tzinfo=zone)
    return start.timestamp()


def reminder_timing(db, event, at: float | None = None) -> tuple[str, str]:
    """Whether a reminder is due now: ("send"|"defer"|"suppress"|"fail", reason).

    Appointment reminders are queued when the student asks, but are meant for
    ``minutesBefore`` the slot, so they wait (PENDING) until then. A cancelled
    or past appointment is never reminded about; an appointment that cannot be
    found or timed is failed rather than guessed at. Medicine reminders carry
    no due time and go out on the next pass.
    """
    from core import workflow_models as M

    if (event.event_type or "") == "camp_reminder":
        from services.health_camps import camp_reminder_timing
        verdict, reason, due = camp_reminder_timing(db, event, time.time() if at is None else at)
        if verdict == "defer" and due is not None:
            defer_until(event, due)
        return verdict, reason
    if (event.event_type or "") != "appointment_reminder":
        return "send", ""
    payload = event.payload or {}
    appointment = db.get(M.Appointment, str(payload.get("appointmentId", "") or ""))
    if appointment is None or appointment.account_id != (event.account_id or ""):
        return "fail", "appointment_not_found"
    if appointment.status == "CANCELLED":
        return "suppress", "appointment_cancelled"
    if appointment.status not in _REMINDABLE_APPOINTMENT_STATES:
        # COMPLETED or NO_SHOW: the visit has already happened (or not).
        return "suppress", "appointment_not_active"
    slot = db.get(M.AvailabilitySlot, appointment.slot_id)
    prefs = db.get(M.NotificationPreference, event.account_id)
    start = _parse_slot_start(slot.slot_start, _recipient_zone(prefs, db)) if slot else None
    if start is None:
        return "fail", "appointment_time_unknown"
    try:
        minutes = int(payload.get("minutesBefore", _DEFAULT_MINUTES_BEFORE))
    except (TypeError, ValueError):
        minutes = _DEFAULT_MINUTES_BEFORE
    minutes = min(max(minutes, 0), 10080)
    current = time.time() if at is None else at
    if current >= start:
        return "suppress", "appointment_passed"
    if current < start - minutes * 60:
        defer_until(event, start - minutes * 60)
        return "defer", "not_due"
    return "send", ""


def reminder_route_for(db, event) -> tuple[str, str, str]:
    """(channel, recipient, reason): the WhatsApp/email route the student chose for this reminder."""
    from services.push_dispatch import external_route

    if db is None:
        return "", "", "reminder_no_recipient"
    return external_route(db, event)


def _would_push(db, event) -> bool:
    from services.push_dispatch import would_push

    try:
        return would_push(db, event)
    except Exception as exc:  # noqa: BLE001 — treated as "no push"; the external route still decides
        logger.error("Could not check push devices for an outbox event (%s)", type(exc).__name__)
        return False


def _fan_out_push(db, event) -> int:
    """Queue pushes for one outbox event. A Rule L violation is a bug and raises; anything else is logged."""
    from core.rule_l import CommerceFirewallViolation
    from services.push_dispatch import fan_out_event

    try:
        with db.begin_nested():   # a savepoint: a failure here undoes only the push rows
            return fan_out_event(db, event)
    except CommerceFirewallViolation:
        raise
    except Exception as exc:  # noqa: BLE001 — a push problem must not stop the outbox pass
        logger.error("Could not queue a push for an outbox event (%s)", type(exc).__name__)
        return 0


def _deliver_reminder(db, event) -> dict:
    """Send a reminder's fixed, non-clinical text to the student's chosen contact."""
    from core.email_templates import reminder_email
    from services.otp_delivery import (
        _openwa,
        _send_openwa,
        normalize_chat_id,
        send_notification_email,
    )

    channel, recipient, _ = reminder_route_for(db, event)
    if not channel or not recipient:
        return {"status": "skipped", "reason": "reminder_no_recipient"}
    text = reminder_message(event.event_type or "")
    if channel == "EMAIL":
        subject, html_body, plain_body = reminder_email(text)
        return send_notification_email(recipient, subject, html_body, plain_body)
    ow = _openwa()
    return _send_openwa(normalize_chat_id(recipient, ow["cc"]), text)


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


def outbox_route(event, db=None) -> tuple[str, str]:
    """(channel, raw recipient) that the outbox would use for this event.

    IN_APP notices have no outside channel: they reach the student's inbox only.
    Reminders are routed to the account's own contact, which needs ``db``.
    An empty channel means no route exists, which is a real problem to surface.
    The recipient is a contact detail; callers must mask it before showing it.
    """
    payload = event.payload or {}
    event_type = event.event_type or ""
    if event_type == "BLOOD_SOS":
        return "WHATSAPP", str(payload.get("phone", "") or "")
    if event_type in REMINDER_EVENT_TYPES:
        channel, recipient, _ = reminder_route_for(db, event)
        return channel, recipient
    if event_type == "GENERIC_NOTIFICATION":
        return str(payload.get("channel", "WHATSAPP") or "WHATSAPP"), str(payload.get("to", "") or "")
    return ("IN_APP" if is_in_app_notice(event) else ""), ""


def _deliver_event(event) -> dict:
    """Route an outbox event to the correct otp_delivery channel.

    Returns the delivery result dict without raising. Caller handles
    status updates and retry logic.
    """
    from core.email_templates import notification_email
    from services.otp_delivery import (
        _openwa,
        _send_openwa,
        normalize_chat_id,
        send_notification_email,
    )

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

    if event_type == "GENERIC_NOTIFICATION":
        channel = payload.get("channel", "WHATSAPP")
        to = payload.get("to", "")
        body = payload.get("body", "")
        if not to or not body:
            return {"status": "skipped", "reason": "missing_recipient_or_body"}
        if channel == "EMAIL":
            # Never the OTP template: that would present the body as a "verification code".
            subject, html_body, plain_body = notification_email(body)
            return send_notification_email(to, subject, html_body, plain_body)
        ow = _openwa()
        chat_id = normalize_chat_id(to, ow["cc"])
        return _send_openwa(chat_id, body)

    return {"status": "skipped", "reason": f"unhandled_event_type:{event_type}"}


def _retry_delay(event) -> float:
    table = URGENT_RETRY_BACKOFF_SECONDS if event.event_type in URGENT_EVENT_TYPES else OUTBOX_RETRY_BACKOFF_SECONDS
    return float(table[min(max(event.attempts or 1, 1), len(table)) - 1])


def _flag_urgent_failure(db, event, outcome: str) -> bool:
    """Stage a CRITICAL super-admin ops event for an urgent message that finally failed.

    No body and no contact: event type, masked recipient, outbox id and a fixed
    outcome code. Returns True when the caller should also alert Slack after
    committing. Never raises: flagging must not stop the outbox pass.
    """
    if event.event_type not in URGENT_EVENT_TYPES:
        return False
    try:
        from services.ops_feed import URGENT_DELIVERY_FAILED, publish
        from services.workflow_api import mask_contact
        channel, recipient = outbox_route(event)
        summary = (f"{event.event_type} {event.id} to {mask_contact(recipient) or 'no recipient'} "
                   f"via {channel or 'no channel'}: {outcome}. Check with the recipient, then requeue.")
        return publish(db, URGENT_DELIVERY_FAILED, "SAFETY", summary=summary, severity="CRITICAL",
                       resource_type="outbox_event", resource_id=event.id) is not None
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not flag an undelivered urgent outbox event (%s)", type(exc).__name__)
        return False


def _alert_urgent_failures(event_types: list[str]) -> None:
    """One Slack ops alert per pass for urgent failures (counts and types only)."""
    if not event_types:
        return
    try:
        from services.slack_notifier import post_ops_alert
        kinds = ", ".join(sorted(set(event_types)))
        post_ops_alert(f":rotating_light: {len(event_types)} urgent outbox message(s) ({kinds}) could not be "
                       "delivered. Check the CRITICAL items in the ops feed and requeue from the admin outbox.",
                       kind="urgent_outbox", purpose="ops")
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not post the urgent-outbox Slack alert (%s)", type(exc).__name__)


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
    urgent_failed: list[str] = []
    lapsed = db.scalars(
        select(M.OutboxEvent).where(M.OutboxEvent.status == "SENDING", M.OutboxEvent.next_attempt_at <= t)
        .order_by(M.OutboxEvent.id).limit(MAX_BATCH_SIZE)
    ).all()
    for event in lapsed:
        event.status = "FAILED"
        event.last_error = "delivery_interrupted_outcome_unknown"
        event.next_attempt_at = 0.0
        if _flag_urgent_failure(db, event, "delivery interrupted, outcome unknown"):
            urgent_failed.append(event.event_type)
    interrupted = len(lapsed)
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
            # A push, if the student wants one, is queued per device and waits
            # for their quiet hours on its own (services/push_dispatch.py).
            _fan_out_push(db, event)
            event.status = "SENT"
            event.sent_at = now()
            event.last_error = ""
            in_app += 1
            db.commit()
            continue
        until = 0.0
        is_reminder = (event.event_type or "") in REMINDER_EVENT_TYPES
        pushed = 0
        if is_reminder:
            channel, recipient, route_why = reminder_route_for(db, event)
            if not channel and not _would_push(db, event):
                # Nowhere to send it at all: settle it now rather than wait for its time.
                verdict, why = ("fail", route_why) if route_why == "reminder_no_recipient" else ("suppress", route_why)
            else:
                verdict, why = reminder_timing(db, event)
            if verdict == "send":
                verdict, why, until = _preference_verdict_for(db, event, channel)
            if verdict == "send":
                # The student's channels for this category: push to their devices,
                # and WhatsApp/email only if they chose one with an address.
                pushed = _fan_out_push(db, event)
                if not channel:
                    if pushed:
                        event.status = "SENT"
                        event.sent_at = now()
                        event.next_attempt_at = 0.0
                        event.last_error = ""
                        delivered += 1
                        db.commit()
                        continue
                    verdict, why = ("fail", route_why) if route_why == "reminder_no_recipient" else ("suppress", route_why)
        else:
            verdict, why, until = _preference_verdict_for(db, event)
        if verdict == "fail":
            # Can never be sent as queued (no route, no appointment): fail
            # visibly instead of guessing, so it shows in the admin outbox.
            event.status = "FAILED"
            event.last_error = why
            failed += 1
            continue
        if verdict == "suppress":
            # Terminal: the student turned this off. Recording it rather than
            # deleting it keeps the audit trail honest about what was withheld.
            event.status = "SUPPRESSED"
            event.last_error = why
            suppressed += 1
            db.commit()
            continue
        if verdict == "defer":
            # Stays PENDING, out of the batch until the quiet window ends (or,
            # for an appointment reminder, until it is due: reminder_timing has
            # already set that time).
            if until:
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
            result = _deliver_reminder(db, event) if is_reminder else _deliver_event(event)
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
                if _flag_urgent_failure(db, event, "no delivery route"):
                    urgent_failed.append(event.event_type)
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
            if _flag_urgent_failure(db, event, f"failed after {event.attempts} attempts"):
                urgent_failed.append(event.event_type)
        else:
            defer_until(event, now_seconds() + _retry_delay(event))
            event.last_error = result.get("reason", "")[:1000]
        db.commit()

    _alert_urgent_failures(urgent_failed)
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
    # Keep Ayush's index in line: expired sources leave it, anything approved but
    # missing (or embedded by a model no longer active) is indexed. No commit here.
    from services import vector_store
    synced = vector_store.sync_index(db, commit=False)
    return {"summary": {"sources": sources, "expired": expired, "expiring_soon": near,
                        "index_updated": synced["indexed"], "index_removed": synced["removed"]}}


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

    # ABDM Health Facility Registry (care directory): no live probe, because no live search exists.
    from services import hfr_registry
    hfr = hfr_registry.status()
    add("abdm_hfr", hfr["configured"], None,
        "configured; live facility search not built" if hfr["configured"] else "not configured")

    # Firebase
    firebase = INTEGRATIONS_DB.get("firebase", {})
    add("firebase", bool(firebase.get("enabled")), None, "configured" if firebase.get("enabled") else "not configured")

    # Rule L commerce firewall at the database (AGENTS.md guardrail 4). Computed
    # from the live grants; in production a CRITICAL ops-feed alert is raised
    # when it is not enforced. "online" only when every check passes.
    try:
        from services.commerce_session import rule_l_alert
        rule_l = rule_l_alert(db)
        add("rule_l_firewall", True, bool(rule_l["enforced"]),
            "enforced" if rule_l["enforced"] else "NOT enforced: " + "; ".join(rule_l["reasons"]))
    except Exception as exc:  # noqa: BLE001 — reported as degraded, never as enforced
        db.rollback()
        add("rule_l_firewall", True, False, f"status could not be computed ({type(exc).__name__})")

    summary = {
        "checked_at": now(),
        "interval_seconds": DEFAULT_INTERVAL_SECONDS,
        "checks": checks,
        "overall": "operational" if all(c["status"] == "online" for c in checks) else "degraded",
    }
    return {"summary": summary}


workflow_scheduler = WorkflowScheduler()
