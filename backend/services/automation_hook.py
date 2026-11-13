"""Outbound automation hook: tells a self-hosted workflow tool (n8n) that something happened.

What leaves the platform is deliberately tiny. For each ops-feed event on the
allow-list below, the hook sends::

    {"id": "<event id>", "kind": "ORDER_PAID", "domain": "MARKETPLACE",
     "severity": "INFO", "at": 1794600000}

and nothing else: no account, no provider, no order or record id, no summary text.
A workflow can count, alert and schedule on that; it cannot learn who did what.
Anyone who needs the detail opens the admin console, which has its own access control.

Rules this module holds (AGENTS.md guardrails 4 and 9):

* **Two gates, both must pass.** The event's kind is on ``ALLOWED_KINDS`` and its
  domain is on ``ALLOWED_DOMAINS``. Clinical, pharmacy, lab and safety events never
  leave, even if a kind of the same name is published there.
* **Off unless fully configured.** It sends only when ``AUTOMATION_HOOK_ENABLED`` is
  true and both ``AUTOMATION_HOOK_URL`` and ``AUTOMATION_HOOK_SECRET`` are set. The
  address and secret come from the environment alone, so no admin form can point
  events at another address.
* **Signed.** Every request carries ``X-SK-Timestamp`` and ``X-SK-Signature``
  (HMAC-SHA256 of ``"<timestamp>.<body>"`` with the shared secret), so the receiver
  can reject anything the platform did not send, and anything replayed.
* **At-least-once, never twice on success.** A delivered event is recorded in
  ``care_automation_deliveries``; an undelivered batch is retried on the next pass
  and given up on after ``RETRY_WINDOW_SECONDS``.
* **Never raises into the scheduler, never logs the secret, the address or a body.**
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time

import httpx
from sqlalchemy import select

from core import workflow_models as M

logger = logging.getLogger("services.automation_hook")

# Operational and commercial signals only. Adding a kind here is a privacy decision:
# it must stay meaningful with every identifier removed.
ALLOWED_KINDS = frozenset({
    "ORDER_PAID", "ORDER_REFUNDED", "ORDER_PAYMENT_EXPIRED", "ORDER_REFUND_UNAVAILABLE",
    "PAYMENT_AMOUNT_MISMATCH", "PAYMENT_NEEDS_REFUND",
    "RETURN_REQUESTED", "RETURN_PICKED_UP",
    "LAB_BOOKING_PAID", "LAB_BOOKING_EXPIRED",
    "MEDICINE_CREATED", "LEGAL_DOCUMENT_PUBLISHED",
    "CAMP_PROPOSED", "CONTRACT_SEAT_RELEASED",
    "DELETION_REQUESTED", "NAMED_SUPER_ADMIN_CREATED", "TWO_FACTOR_RESET",
})
# CLINICAL, PHARMACY, LAB and SAFETY are absent on purpose.
ALLOWED_DOMAINS = frozenset({"MARKETPLACE", "ACCOUNT", "CAMPUS", "BILLING", "SUPPORT"})

BATCH_SIZE = 50
TIMEOUT_SECONDS = 8.0
# An event older than this is no longer offered: a workflow tool that was down for a
# day should not wake up to a day of stale alerts.
RETRY_WINDOW_SECONDS = 6 * 3600

SKIPPED_OFF = "off"
SKIPPED_UNCONFIGURED = "unconfigured"


def config() -> dict:
    """Effective configuration, from the environment only."""
    return {
        "enabled": os.getenv("AUTOMATION_HOOK_ENABLED", "false").lower() == "true",
        "url": os.getenv("AUTOMATION_HOOK_URL", "").strip(),
        "secret": os.getenv("AUTOMATION_HOOK_SECRET", "").strip(),
    }


def envelope(event: M.OpsEvent) -> dict:
    """The whole of what is sent for one event."""
    return {"id": event.id, "kind": event.kind, "domain": event.domain,
            "severity": event.severity, "at": int(event.created_at)}


def sign(secret: str, timestamp: str, body: bytes) -> str:
    return hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()


def pending(db, now: float, limit: int = BATCH_SIZE) -> list[M.OpsEvent]:
    """Allow-listed events inside the retry window that have not been delivered."""
    delivered = select(M.AutomationDelivery.event_id)
    return list(db.scalars(
        select(M.OpsEvent)
        .where(M.OpsEvent.kind.in_(ALLOWED_KINDS), M.OpsEvent.domain.in_(ALLOWED_DOMAINS),
               M.OpsEvent.created_at >= now - RETRY_WINDOW_SECONDS, M.OpsEvent.id.not_in(delivered))
        .order_by(M.OpsEvent.created_at).limit(limit)).all())


def _post(url: str, secret: str, events: list[dict], now: float) -> bool:
    body = json.dumps({"events": events}, separators=(",", ":"), sort_keys=True).encode()
    timestamp = str(int(now))
    headers = {"Content-Type": "application/json", "X-SK-Timestamp": timestamp,
               "X-SK-Signature": sign(secret, timestamp, body)}
    try:
        response = httpx.post(url, content=body, headers=headers, timeout=httpx.Timeout(TIMEOUT_SECONDS, connect=3))
    except httpx.HTTPError as exc:
        logger.warning("automation hook: delivery failed (%s)", type(exc).__name__)
        return False
    if not response.is_success:
        logger.warning("automation hook: receiver answered %s", response.status_code)
        return False
    return True


def run_job(db) -> dict:
    """One scheduler pass. Stages its rows in the runner's transaction; never raises."""
    cfg = config()
    if not cfg["enabled"]:
        return {"summary": {"sent": 0, "skipped": SKIPPED_OFF}}
    if not cfg["url"] or not cfg["secret"]:
        # Enabled but half configured: say so, send nothing (fail closed).
        return {"summary": {"sent": 0, "skipped": SKIPPED_UNCONFIGURED}}
    now = time.time()
    try:
        events = pending(db, now)
        if not events:
            return {"summary": {"sent": 0, "waiting": 0}}
        if not _post(cfg["url"], cfg["secret"], [envelope(event) for event in events], now):
            return {"summary": {"sent": 0, "waiting": len(events)}}
        for event in events:
            db.add(M.AutomationDelivery(event_id=event.id, kind=event.kind, sent_at=now))
        db.flush()
        return {"summary": {"sent": len(events), "waiting": 0}}
    except Exception as exc:  # noqa: BLE001 — an automation outage must never fail the scheduler pass
        db.rollback()
        logger.warning("automation hook: pass failed (%s)", type(exc).__name__)
        return {"summary": {"sent": 0, "error": type(exc).__name__}}
