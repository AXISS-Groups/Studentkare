"""One dispatcher for every notification: which channels, when, and pushing it.

Every notification already starts life in the durable outbox
(care_outbox_events): ``ops_feed.notify`` notices, reminders (medicine, refill
#235, consult, camp #232) and safety answers. The outbox pass
(services/workflow_scheduler._process_outbox) asks this module two things:

* ``external_route`` — for a reminder, the WhatsApp or email address the
  student chose for that category (default: their sign-in contact, as before
  push existed), or none;
* ``fan_out_event`` — one PushDelivery row per device of the student, when the
  category's channels include push.

Super-admin announcements fan out the same way (``fan_out_due_announcements``).
``dispatch`` then sends the due rows and ``check_receipts`` reads Expo's
receipts. Rules, all in one place:

* **Preferences**: per category channels (core/push_copy.CATEGORIES), the
  master push/email/reminder switches, and safety always on.
* **Quiet hours**: a non-safety push waits until the student's quiet hours end.
* **Rate cap and coalescing**: at most ``push.rate_cap_per_hour`` non-safety
  pushes an hour per account; a second push of the same category within
  ``push.coalesce_seconds`` is folded into the first (it says the same thing).
* **Dedupe**: one row per (source, source id, device), so a retried fan-out
  never pushes twice; a row is claimed (SENDING) before the provider call and a
  crash leaves it failed as "outcome unknown", never sent again.
* **Retries** with doubling backoff up to ``push.max_attempts``; **dead
  tokens** (Expo DeviceNotRegistered, Web Push 404/410) revoke the device.
* **Privacy**: the text is built at send time from the category and the
  device's language only (core/push_copy.lock_screen_text). The outbox payload
  is never read for it.
* **Rule L**: outbox events are clinical-plane, so ``assert_push_allowed``
  refuses any of them as a marketing push; offers come only from a super
  admin's announcement, to students who opted in, and are audited.
"""
from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, or_, select

from core import push_copy as P
from core import rule_l
from core import workflow_models as M
from core.settings_registry import setting
from services import push_providers

logger = logging.getLogger("services.push_dispatch")

OUTBOX = "OUTBOX"
ANNOUNCEMENT = "ANNOUNCEMENT"
EXPO = "EXPO"
WEB = "WEB"
HOUR_SECONDS = 3600
DAY_SECONDS = 86400
CLAIM_SECONDS = 900          # a SENDING row older than this was interrupted
DELIVERED_STATES = ("SENT", "DELIVERED")
# Outbox event types that are not about the person in account_id, or reach
# them some other way: a blood-donor broadcast and a typed message to a number.
NOT_PUSHED_EVENT_TYPES = frozenset({"BLOOD_SOS", "GENERIC_NOTIFICATION"})
URGENT_CATEGORIES = frozenset({P.SAFETY})


def _now() -> float:
    return time.time()


def _id() -> str:
    return uuid.uuid4().hex


def _audit(db, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=_now()))


# --- preferences ------------------------------------------------------------------

def stored_channels(prefs, category_key: str) -> list[str] | None:
    """The channels the student picked for a category, or None for "never chose"."""
    raw = (getattr(prefs, "channels", None) or {}) if prefs is not None else {}
    if not isinstance(raw, dict) or category_key not in raw or not isinstance(raw[category_key], list):
        return None
    allowed = P.category(category_key).channels
    return [channel for channel in raw[category_key] if channel in allowed]


def default_channels(category_key: str, sign_in_channel: str) -> list[str]:
    definition = P.category(category_key)
    out = [P.PUSH] if P.PUSH in definition.channels else []
    if definition.default_sign_in_channel and sign_in_channel in definition.channels:
        out.append(sign_in_channel)
    return out


def chosen_channels(prefs, category_key: str, sign_in_channel: str) -> list[str]:
    """Channels this category goes to for this student, before master switches."""
    definition = P.category(category_key)
    if definition.locked:
        return list(definition.channels)
    if category_key == P.OFFERS:
        return [P.PUSH] if prefs is not None and bool(getattr(prefs, "marketing_opt_in", False)) else []
    picked = stored_channels(prefs, category_key)
    return default_channels(category_key, sign_in_channel) if picked is None else picked


def push_wanted(prefs, category_key: str, sign_in_channel: str = "") -> bool:
    if P.category(category_key).locked:
        return True
    if prefs is not None and not prefs.push_enabled:
        return False
    if prefs is not None and category_key == P.REMINDERS and not prefs.reminders_enabled:
        return False
    return P.PUSH in chosen_channels(prefs, category_key, sign_in_channel)


def channel_matrix(prefs, sign_in_channel: str) -> dict[str, list[str]]:
    """What the settings screens show: every category's effective channels."""
    return {key: chosen_channels(prefs, key, sign_in_channel) for key in P.CATEGORIES}


def external_route(db, event) -> tuple[str, str, str]:
    """(channel, raw recipient, reason) for a reminder going out by WhatsApp or email.

    The channels the student chose for the event's category, in order, the
    first with an address: the sign-in contact, else a verified second contact.
    Reason is "" with a route, "channels_off" when no external channel is
    chosen (or email is switched off), "reminder_no_recipient" otherwise.
    """
    from services.contact_store import verified_contact

    account_id = getattr(event, "account_id", "") or ""
    account = db.get(M.Account, account_id) if account_id else None
    if account is None or not account.active:
        return "", "", "reminder_no_recipient"
    prefs = db.get(M.NotificationPreference, account.id)
    sign_in = (account.channel or "").upper()
    picked = [c for c in chosen_channels(prefs, P.category_of(event.event_type or ""), sign_in)
              if c in P.EXTERNAL_CHANNELS]
    chosen = [c for c in picked if not (c == P.EMAIL and prefs is not None and not prefs.email_enabled)]
    if not chosen:
        # Kept apart so the inbox can say which switch held it back.
        return "", "", "email_disabled" if picked else "channels_off"
    for channel in chosen:
        if channel == sign_in and account.identifier:
            return channel, str(account.identifier), ""
        value = verified_contact(db, account, channel)
        if value:
            return channel, value, ""
    return "", "", "reminder_no_recipient"


# --- devices -------------------------------------------------------------------------

def provider_ready(kind: str) -> bool:
    return push_providers.expo_configured() if kind == EXPO else push_providers.web_push_configured()


def active_devices(db, account_id: str) -> list[M.PushDevice]:
    stale = _now() - setting("push.inactive_device_days", db) * DAY_SECONDS
    return list(db.scalars(select(M.PushDevice).where(
        M.PushDevice.account_id == account_id, M.PushDevice.revoked_at == 0,
        or_(M.PushDevice.last_seen_at >= stale, M.PushDevice.created_at >= stale),
    ).order_by(M.PushDevice.created_at)).all())


def revoke_device(db, device: M.PushDevice, reason: str) -> None:
    if device.revoked_at:
        return
    device.revoked_at = _now()
    device.revoke_reason = reason[:40]
    for row in db.scalars(select(M.PushDelivery).where(M.PushDelivery.device_id == device.id,
                                                       M.PushDelivery.status == "PENDING")).all():
        row.status = "SUPPRESSED"
        row.last_error = "device_revoked"


def revoke_sign_in(db, account_id: str, sign_in_at: float) -> int:
    """Signing out revokes the devices that sign-in registered."""
    rows = db.scalars(select(M.PushDevice).where(M.PushDevice.account_id == account_id,
                                                 M.PushDevice.sign_in_at == sign_in_at,
                                                 M.PushDevice.revoked_at == 0)).all()
    for device in rows:
        revoke_device(db, device, "signed_out")
    return len(rows)


# --- timing ----------------------------------------------------------------------------

def quiet_until(db, prefs, at: float) -> float:
    """When this student's quiet hours end, if ``at`` is inside them; else 0."""
    from services.workflow_scheduler import _recipient_zone, in_quiet_hours, quiet_hours_end

    if prefs is None:
        return 0.0
    local = datetime.fromtimestamp(at, _recipient_zone(prefs, db))
    return quiet_hours_end(prefs.quiet_end, local) if in_quiet_hours(prefs.quiet_start, prefs.quiet_end, local) else 0.0


# --- fan-out -------------------------------------------------------------------------

def _queue(db, *, source: str, source_id: str, device: M.PushDevice, category_key: str, at: float,
           not_before: float) -> bool:
    exists = db.scalar(select(M.PushDelivery.id).where(M.PushDelivery.source == source,
                                                       M.PushDelivery.source_id == source_id,
                                                       M.PushDelivery.device_id == device.id))
    if exists:
        return False
    db.add(M.PushDelivery(id=_id(), source=source, source_id=source_id, device_id=device.id,
                          account_id=device.account_id, category=category_key,
                          urgent=category_key in URGENT_CATEGORIES, status="PENDING", attempts=0,
                          next_attempt_at=not_before, created_at=at))
    return True


def would_push(db, event) -> bool:
    """Whether fan_out_event would reach at least one device for this event now."""
    event_type = event.event_type or ""
    account_id = getattr(event, "account_id", "") or ""
    if not account_id or event_type in NOT_PUSHED_EVENT_TYPES:
        return False
    account = db.get(M.Account, account_id)
    if account is None or not account.active:
        return False
    prefs = db.get(M.NotificationPreference, account_id)
    if not push_wanted(prefs, P.category_of(event_type), (account.channel or "").upper()):
        return False
    return any(provider_ready(device.kind) for device in active_devices(db, account_id))


def fan_out_event(db, event) -> int:
    """Queue a push to each of the student's devices for one outbox event. Returns devices covered.

    Idempotent (existing rows count, nothing is added twice). Never raises
    into the outbox pass except for a Rule L violation, which is a bug.
    """
    event_type = event.event_type or ""
    account_id = getattr(event, "account_id", "") or ""
    if not account_id or event_type in NOT_PUSHED_EVENT_TYPES:
        return 0
    category_key = P.category_of(event_type)
    # care_outbox_events is CLINICAL: nothing the outbox raises is ever marketing.
    rule_l.assert_push_allowed(rule_l.TABLE_PLANES["care_outbox_events"], category_key)
    account = db.get(M.Account, account_id)
    if account is None or not account.active:
        return 0
    prefs = db.get(M.NotificationPreference, account_id)
    if not push_wanted(prefs, category_key, (account.channel or "").upper()):
        return 0
    at = _now()
    not_before = 0.0 if category_key in URGENT_CATEGORIES else quiet_until(db, prefs, at)
    covered = 0
    for device in active_devices(db, account_id):
        if not provider_ready(device.kind):
            continue
        _queue(db, source=OUTBOX, source_id=event.id, device=device, category_key=category_key, at=at,
               not_before=not_before)
        covered += 1
    return covered


def announcement_audience(db, campus: str, kind: str):
    """Active student account ids the announcement may reach (a select, never a list in memory twice)."""
    statement = select(M.Account.id).where(M.Account.role == "STUDENT", M.Account.active.is_(True))
    if campus.strip():
        statement = statement.where(select(M.CampusVerification.account_id).where(
            M.CampusVerification.account_id == M.Account.id, M.CampusVerification.status == "VERIFIED",
            func.lower(func.trim(M.CampusVerification.university)) == campus.strip().lower(),
        ).exists())
    return statement


def _announcement_category(kind: str) -> str:
    return P.OFFERS if kind == "OFFER" else P.ANNOUNCEMENTS


def audience_counts(db, campus: str, kind: str) -> dict[str, int]:
    """How many students and devices an announcement would reach now. Counts only."""
    category_key = _announcement_category(kind)
    students = devices = 0
    for account_id in db.scalars(announcement_audience(db, campus, kind)).all():
        account = db.get(M.Account, account_id)
        prefs = db.get(M.NotificationPreference, account_id)
        if not push_wanted(prefs, category_key, (account.channel or "").upper() if account else ""):
            continue
        ready = [d for d in active_devices(db, account_id) if provider_ready(d.kind)]
        if ready:
            students += 1
            devices += len(ready)
    return {"students": students, "devices": devices}


def fan_out_announcement(db, announcement: M.Announcement) -> int:
    category_key = _announcement_category(announcement.kind)
    rule_l.assert_push_allowed(rule_l.TABLE_PLANES["care_announcements"], category_key)
    at = _now()
    reached = 0
    for account_id in db.scalars(announcement_audience(db, announcement.campus, announcement.kind)).all():
        account = db.get(M.Account, account_id)
        prefs = db.get(M.NotificationPreference, account_id)
        if not push_wanted(prefs, category_key, (account.channel or "").upper() if account else ""):
            continue
        not_before = quiet_until(db, prefs, at)
        devices = [d for d in active_devices(db, account_id) if provider_ready(d.kind)]
        for device in devices:
            _queue(db, source=ANNOUNCEMENT, source_id=announcement.id, device=device, category_key=category_key,
                   at=at, not_before=not_before)
        reached += 1 if devices else 0
    return reached


def fan_out_due_announcements(db) -> dict:
    due = db.scalars(select(M.Announcement).where(M.Announcement.status == "SCHEDULED",
                                                  M.Announcement.scheduled_at <= _now())
                     .order_by(M.Announcement.scheduled_at).limit(10)).all()
    for announcement in due:
        announcement.status = "SENDING"
        db.commit()
        announcement.recipients = fan_out_announcement(db, announcement)
        announcement.status = "SENT"
        announcement.sent_at = _now()
        if announcement.kind == "OFFER":
            # Every marketing push is audited, with its count, never a recipient.
            _audit(db, announcement.created_by, f"OFFER_PUSH_SENT:{announcement.recipients}", announcement.id)
        else:
            _audit(db, announcement.created_by, f"ANNOUNCEMENT_PUSH_SENT:{announcement.recipients}", announcement.id)
        db.commit()
    return {"announcements": len(due)}


# --- building a message ------------------------------------------------------------------

def message_text(db, row: M.PushDelivery, device: M.PushDevice) -> tuple[str, str]:
    """(title, body). Outbox pushes: the fixed category line. Announcements: their checked text."""
    if row.source == ANNOUNCEMENT:
        announcement = db.get(M.Announcement, row.source_id)
        if announcement is None or announcement.status == "CANCELLED":
            return "", ""
        return announcement.title, announcement.body
    return P.lock_screen_text(row.category, device.locale)


def build_message(db, row: M.PushDelivery, device: M.PushDevice) -> dict | None:
    title, body = message_text(db, row, device)
    if not title:
        return None
    definition = P.category(row.category)
    data = {"path": definition.path, "category": row.category}
    ttl = setting("push.ttl_seconds", db)
    if device.kind == EXPO:
        return {"to": device.token, "title": title, "body": body, "data": data, "sound": "default",
                "channelId": definition.android_channel, "categoryId": definition.ios_category,
                "priority": "high" if row.urgent else "default", "ttl": ttl}
    return {"title": title, "body": body, "tag": row.category, **data}


# --- dispatch ----------------------------------------------------------------------------

def _retry_at(db, attempts: int) -> float:
    return _now() + setting("push.retry_base_seconds", db) * (2 ** max(attempts - 1, 0))


def _gate(db, row: M.PushDelivery, at: float, claimed: dict) -> tuple[str, float]:
    """("send", 0) or ("defer", until) or ("suppress" | "coalesce", 0) for one row.

    ``claimed`` holds what this pass has already claimed, which the database
    does not show as sent yet: (account, device, category) keys and the
    sources per account.
    """
    if row.urgent:
        return "send", 0.0
    account = db.get(M.Account, row.account_id)
    prefs = db.get(M.NotificationPreference, row.account_id)
    if account is None or not account.active or not push_wanted(prefs, row.category, (account.channel or "").upper()):
        return "suppress", 0.0
    until = quiet_until(db, prefs, at)
    if until:
        return "defer", until
    window = setting("push.coalesce_seconds", db)
    key = (row.account_id, row.device_id, row.category)
    if window and row.source == OUTBOX and key in claimed["keys"]:
        return "coalesce", 0.0
    if window and row.source == OUTBOX and db.scalar(select(M.PushDelivery.id).where(
            M.PushDelivery.account_id == row.account_id, M.PushDelivery.device_id == row.device_id,
            M.PushDelivery.category == row.category, M.PushDelivery.status.in_(DELIVERED_STATES),
            M.PushDelivery.sent_at >= at - window).limit(1)):
        return "coalesce", 0.0
    recent = db.execute(select(func.count(func.distinct(M.PushDelivery.source_id)), func.min(M.PushDelivery.sent_at))
                        .where(M.PushDelivery.account_id == row.account_id, M.PushDelivery.urgent.is_(False),
                               M.PushDelivery.status.in_(DELIVERED_STATES),
                               M.PushDelivery.sent_at >= at - HOUR_SECONDS)).one()
    this_pass = claimed["sources"].get(row.account_id, set())
    if recent[0] + len(this_pass - {row.source_id}) >= setting("push.rate_cap_per_hour", db):
        already = db.scalar(select(M.PushDelivery.id).where(
            M.PushDelivery.account_id == row.account_id, M.PushDelivery.source_id == row.source_id,
            M.PushDelivery.status.in_(DELIVERED_STATES)).limit(1))
        if not already and row.source_id not in this_pass:   # another device got this one: don't hold the rest back
            return "defer", float(recent[1] or at) + HOUR_SECONDS
    return "send", 0.0


def _finish(db, row: M.PushDelivery, device: M.PushDevice, outcome: str, code: str, ticket_id: str = "") -> str:
    row.attempts = (row.attempts or 0) + 1
    if outcome == push_providers.OK:
        row.status = "SENT"
        row.sent_at = _now()
        row.ticket_id = ticket_id
        row.last_error = ""
        return "sent"
    if outcome == push_providers.GONE:
        revoke_device(db, device, "provider_gone")
        row.status = "FAILED"
        row.last_error = code or "device_gone"
        return "gone"
    if outcome == push_providers.RETRY and row.attempts < setting("push.max_attempts", db):
        row.status = "PENDING"
        row.next_attempt_at = _retry_at(db, row.attempts)
        row.last_error = code or "retry"
        return "retry"
    row.status = "FAILED"
    row.last_error = (code or outcome)[:60]
    return "failed"


def dispatch(db, *, expo_client=None, web_client=None) -> dict:
    """Send the due push deliveries. Bounded by push.batch_max per pass."""
    at = _now()
    summary = defaultdict(int)
    for row in db.scalars(select(M.PushDelivery).where(M.PushDelivery.status == "SENDING",
                                                       M.PushDelivery.next_attempt_at <= at)).all():
        row.status = "FAILED"
        row.last_error = "interrupted_outcome_unknown"
        summary["interrupted"] += 1
    db.commit()

    urgent_first = M.PushDelivery.urgent.desc()
    rows = db.scalars(select(M.PushDelivery).where(M.PushDelivery.status == "PENDING",
                                                   M.PushDelivery.next_attempt_at <= at)
                      .order_by(urgent_first, M.PushDelivery.created_at, M.PushDelivery.id)
                      .limit(setting("push.batch_max", db))).all()
    claimed: dict = {"keys": set(), "sources": defaultdict(set)}
    expo_batch: list[tuple[M.PushDelivery, M.PushDevice, dict]] = []
    web_batch: list[tuple[M.PushDelivery, M.PushDevice, dict]] = []
    for row in rows:
        device = db.get(M.PushDevice, row.device_id)
        if device is None or device.revoked_at:
            row.status, row.last_error = "SUPPRESSED", "device_revoked"
            summary["suppressed"] += 1
            continue
        verdict, until = _gate(db, row, at, claimed)
        if verdict == "defer":
            row.next_attempt_at = until
            row.last_error = "held"
            summary["deferred"] += 1
            continue
        if verdict in ("suppress", "coalesce"):
            row.status = "SUPPRESSED"
            row.last_error = "coalesced" if verdict == "coalesce" else "push_off"
            summary["suppressed"] += 1
            continue
        message = build_message(db, row, device)
        if message is None:
            row.status, row.last_error = "SUPPRESSED", "source_cancelled"
            summary["suppressed"] += 1
            continue
        if not provider_ready(device.kind):
            row.next_attempt_at = at + HOUR_SECONDS
            row.last_error = "provider_not_configured"
            summary["deferred"] += 1
            continue
        # Claim before the provider call: a crash cannot lead to a second push.
        claimed["keys"].add((row.account_id, row.device_id, row.category))
        claimed["sources"][row.account_id].add(row.source_id)
        row.status = "SENDING"
        row.next_attempt_at = at + CLAIM_SECONDS
        (expo_batch if device.kind == EXPO else web_batch).append((row, device, message))
    db.commit()

    for start in range(0, len(expo_batch), push_providers.EXPO_BATCH):
        chunk = expo_batch[start:start + push_providers.EXPO_BATCH]
        results = push_providers.send_expo([message for _, _, message in chunk], client=expo_client)
        for (row, device, _), result in zip(chunk, results, strict=True):
            summary[_finish(db, row, device, result.outcome, result.code, result.ticket_id)] += 1
        db.commit()
    ttl = setting("push.ttl_seconds", db)
    for row, device, message in web_batch:
        outcome = push_providers.send_web_push(device.token, device.p256dh, device.auth, message, ttl=ttl,
                                               urgent=row.urgent, client=web_client)
        summary[_finish(db, row, device, outcome, f"web_{outcome}" if outcome != push_providers.OK else "")] += 1
        db.commit()
    summary["picked"] = len(rows)
    return dict(summary)


def check_receipts(db, *, client=None) -> dict:
    """Read Expo receipts for accepted phone pushes; prune dead tokens and stale devices."""
    at = _now()
    delay = setting("push.receipt_delay_seconds", db)
    rows = db.scalars(select(M.PushDelivery).where(
        M.PushDelivery.status == "SENT", M.PushDelivery.ticket_id != "", M.PushDelivery.receipt_checked_at == 0,
        M.PushDelivery.sent_at <= at - delay).limit(push_providers.EXPO_RECEIPT_BATCH)).all()
    summary = defaultdict(int)
    if rows:
        receipts = push_providers.expo_receipts([row.ticket_id for row in rows], client=client)
        if receipts is None:
            summary["unavailable"] = len(rows)
        else:
            for row in rows:
                receipt = receipts.get(row.ticket_id)
                if receipt is None:
                    # Not ready yet; Expo keeps receipts for a day, after which we stop asking.
                    if row.sent_at <= at - DAY_SECONDS:
                        row.receipt_checked_at = at
                        summary["expired"] += 1
                    continue
                row.receipt_checked_at = at
                if receipt.outcome == push_providers.OK:
                    row.status = "DELIVERED"
                    summary["delivered"] += 1
                    continue
                row.status = "FAILED"
                row.last_error = receipt.code[:60]
                summary["failed"] += 1
                if receipt.outcome == push_providers.GONE:
                    device = db.get(M.PushDevice, row.device_id)
                    if device is not None:
                        revoke_device(db, device, "provider_gone")
                        summary["pruned"] += 1
    stale = at - setting("push.inactive_device_days", db) * DAY_SECONDS
    for device in db.scalars(select(M.PushDevice).where(M.PushDevice.revoked_at == 0,
                                                        M.PushDevice.last_seen_at < stale,
                                                        M.PushDevice.created_at < stale)).all():
        revoke_device(db, device, "inactive")
        summary["inactive"] += 1
    db.commit()
    return {"summary": dict(summary), "checked": len(rows)}


def announcement_counts(db, announcement_id: str) -> dict[str, int]:
    rows = db.execute(select(M.PushDelivery.status, func.count()).where(
        M.PushDelivery.source == ANNOUNCEMENT, M.PushDelivery.source_id == announcement_id)
        .group_by(M.PushDelivery.status)).all()
    by = dict(rows)
    return {"devices": sum(by.values()), "sent": by.get("SENT", 0) + by.get("DELIVERED", 0),
            "delivered": by.get("DELIVERED", 0), "failed": by.get("FAILED", 0),
            "pending": by.get("PENDING", 0) + by.get("SENDING", 0), "suppressed": by.get("SUPPRESSED", 0)}
