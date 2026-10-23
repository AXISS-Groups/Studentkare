"""Refill reminders: count a medicine down to its run-out date and remind N days before.

Clinical plane (core/rule_l.py: ``care_refill_trackers``). Everything counted
here is the student's own entry — pack size, packs, units per dose, doses a
day — and the only arithmetic is units on hand divided by units a day. No dose
is suggested, checked or corrected: that would be dosing advice (Tier 1), and
it is not built (docs/plans/tier1-refill-reorder-2026-10-23.md).

Rule L, in both directions:

* Reading commerce is allowed, writing it is not. Starting a tracker from a past
  order reads that order line through ``commerce_db`` (to check ownership and
  take its name and quantity); nothing here writes a commerce table.
* Commerce never reads this table. The one-tap reorder (services/reorder.py)
  is asked for an order's current prices with the order id alone; it never
  learns that a refill, a plan or a reminder exists.
* A reminder is a ``medication_refill`` outbox event (a REMINDER_EVENT_TYPE): the
  student's "reminders" switch suppresses it, quiet hours defer it, and outside
  the app it says only "You have a medicine reminder" (workflow_scheduler
  REMINDER_MESSAGES). Its payload is the tracker id — no name, no price, no
  offer — and no marketing or offers code reads it.

Prescription status (``GET /api/refill-tracker/rx-status``) says only whether
the student holds an unexpired e-prescription and until when. It decides
nothing: shop orders refuse prescription items outright (POST /api/orders), and
a valid prescription is sent to a pharmacist through the existing dispense path.
"""
from __future__ import annotations

import time
import uuid
from datetime import date, datetime, timedelta
from datetime import time as dtime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import student_time
from services.commerce_session import commerce_db
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(prefix="/api/refill-tracker", tags=["Refill reminders"])

DAY_SECONDS = 86400
MINUTES_PER_HOUR = 60
# How far back a "started on" date may go: a pack counted from a year ago has
# long run out, and the date is only a counting anchor.
START_LOOKBACK_DAYS = 365
DUE_BATCH = 200
REFILL_EVENT = "medication_refill"
RESOURCE_TYPE = "refill_tracker"
SOURCES = ("ORDER", "PLAN")


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> float:
    return time.time()


def refill_error(status: int, code: str, message: str, **values) -> HTTPException:
    """Same shape as wellness errors: the client shows ``refill.msg.<CODE>`` with ``values``."""
    return HTTPException(status, {"code": code, "message": message, "values": values})


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=_now()))


def _student(user: dict) -> None:
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Only a student account tracks refills.")


# --- the arithmetic (counting only) ------------------------------------------------


def units_per_day(row: M.RefillTracker) -> int:
    return row.units_per_dose * row.doses_per_day


def runs_out_on(anchor: date, units_on_hand: int, per_day: int) -> date:
    """The first local day the units on hand no longer cover a full day's count."""
    return anchor + timedelta(days=units_on_hand // per_day)


def units_left(row: M.RefillTracker, today: date) -> int:
    used = units_per_day(row) * max((today - date.fromisoformat(row.anchor_on)).days, 0)
    return max(row.units_on_hand - used, 0)


def remind_at(out_on: date, days_before: int, zone, minute_of_day: int) -> float:
    day = out_on - timedelta(days=days_before)
    hour, minute = divmod(minute_of_day, MINUTES_PER_HOUR)
    return datetime.combine(day, dtime(hour, minute), tzinfo=zone).timestamp()


def recompute(db: Session, row: M.RefillTracker) -> None:
    """Refresh the cached run-out date and reminder time from the student's counts."""
    zone = student_time.student_zone(db, row.account_id)
    out_on = runs_out_on(date.fromisoformat(row.anchor_on), row.units_on_hand, units_per_day(row))
    row.runs_out_on = out_on.isoformat()
    row.remind_at = remind_at(out_on, row.remind_days_before, zone, setting("refill.remind_minute_local", db))


def payload(db: Session, row: M.RefillTracker) -> dict:
    zone = student_time.student_zone(db, row.account_id)
    today = student_time.local_today(zone)
    out_on = date.fromisoformat(row.runs_out_on)
    return {
        "id": row.id, "source": row.source, "label": row.label,
        "planId": row.plan_id, "orderId": row.order_id, "itemId": row.item_id,
        "packSize": row.pack_size, "packs": row.packs, "unitsPerDose": row.units_per_dose,
        "dosesPerDay": row.doses_per_day, "unitsPerDay": units_per_day(row),
        "unitsLeft": units_left(row, today), "startedOn": row.anchor_on,
        "runsOutOn": row.runs_out_on, "daysLeft": max((out_on - today).days, 0),
        "remindOn": (out_on - timedelta(days=row.remind_days_before)).isoformat(),
        "remindDaysBefore": row.remind_days_before, "enabled": row.enabled,
        "snoozedUntil": row.snoozed_until or None,
        # One-tap reorder repeats a shop order; a plan's refill goes to a pharmacy (/refill-request).
        "canReorder": row.source == "ORDER",
    }


# --- validation ----------------------------------------------------------------------


def _bounded(db: Session, value: int, key: str, code: str) -> int:
    most = setting(key, db)
    if value > most:
        raise refill_error(422, code, f"Enter at most {most}.", min=1, max=most)
    return value


def _check_counts(db: Session, *, pack_size: int, packs: int, units_per_dose: int, doses_per_day: int) -> None:
    _bounded(db, pack_size, "refill.pack_units_max", "PACK_SIZE_OUT_OF_RANGE")
    _bounded(db, packs, "refill.packs_max", "PACKS_OUT_OF_RANGE")
    _bounded(db, units_per_dose, "refill.units_per_dose_max", "UNITS_PER_DOSE_OUT_OF_RANGE")
    _bounded(db, doses_per_day, "meds.times_per_day_max", "DOSES_PER_DAY_OUT_OF_RANGE")


def _days_before(db: Session, value: int | None) -> int:
    if value is None:
        return setting("refill.remind_days_before_default", db)
    return _bounded(db, value, "refill.remind_days_before_max", "REMIND_DAYS_OUT_OF_RANGE")


def _start_date(db: Session, account_id: str, value: date | None) -> date:
    today = student_time.local_today(student_time.student_zone(db, account_id))
    if value is None:
        return today
    if value > today or value < today - timedelta(days=START_LOOKBACK_DAYS):
        raise refill_error(422, "START_DATE_OUT_OF_RANGE", "Pick a start date in the last year, not in the future.",
                           days=START_LOOKBACK_DAYS)
    return value


def _own(db: Session, user: dict, tracker_id: str) -> M.RefillTracker:
    row = db.get(M.RefillTracker, tracker_id)
    if row is None or row.account_id != user["id"]:
        raise refill_error(404, "REFILL_NOT_FOUND", "That refill isn't on your list.")
    return row


# --- endpoints ----------------------------------------------------------------------


@router.get("")
def list_trackers(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    rows = db.scalars(select(M.RefillTracker).where(M.RefillTracker.account_id == user["id"])
                      .order_by(M.RefillTracker.runs_out_on, M.RefillTracker.label)).all()
    return {"items": [payload(db, row) for row in rows]}


@router.get("/plans")
def trackable_plans(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The student's active medication plans that are not tracked yet (start a refill from a pill reminder)."""
    _student(user)
    tracked = set(db.scalars(select(M.RefillTracker.plan_id).where(
        M.RefillTracker.account_id == user["id"], M.RefillTracker.plan_id.is_not(None))).all())
    plans = db.scalars(select(M.MedicationPlan).where(M.MedicationPlan.account_id == user["id"],
                                                      M.MedicationPlan.active.is_(True))
                       .order_by(M.MedicationPlan.name)).all()
    return {"items": [{"id": p.id, "name": p.name, "timesPerDay": p.times_per_day}
                      for p in plans if p.id not in tracked]}


class TrackerInput(StrictModel):
    source: Literal["ORDER", "PLAN"]
    orderId: str | None = Field(default=None, max_length=80)
    itemId: str | None = Field(default=None, max_length=80)
    planId: str | None = Field(default=None, max_length=80)
    packSize: int = Field(ge=1)
    packs: int | None = Field(default=None, ge=1)
    unitsPerDose: int = Field(ge=1)
    dosesPerDay: int = Field(ge=1)
    startedOn: date | None = None
    remindDaysBefore: int | None = Field(default=None, ge=1)


def _order_line(cdb: Session, user: dict, order_id: str, item_id: str) -> M.OrderLine:
    """The student's own product line on a past order, read on the commerce session."""
    order = cdb.get(M.Order, order_id)
    if order is None or order.account_id != user["id"]:
        raise refill_error(404, "ORDER_NOT_FOUND", "That order isn't on your account.")
    line = cdb.scalar(select(M.OrderLine).where(M.OrderLine.order_id == order_id, M.OrderLine.item_id == item_id))
    if line is None or line.kind != "product" or line.status == "CANCELLED":
        raise refill_error(422, "ORDER_LINE_NOT_REFILLABLE", "Only a product you were sold can be refilled.")
    return line


@router.post("", status_code=201)
def create_tracker(body: TrackerInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db),
                   cdb: Session = Depends(commerce_db)):
    _student(user)
    count = db.scalar(select(func.count()).select_from(M.RefillTracker).where(M.RefillTracker.account_id == user["id"]))
    most = setting("refill.tracked_max", db)
    if count >= most:
        raise refill_error(409, "TOO_MANY_REFILLS", f"You can track at most {most} medicines.", max=most)
    plan_id = order_id = item_id = None
    if body.source == "ORDER":
        if not body.orderId or not body.itemId:
            raise refill_error(422, "ORDER_LINE_NOT_REFILLABLE", "Pick the order and the item.")
        line = _order_line(cdb, user, body.orderId, body.itemId)
        label, default_packs = line.name, line.quantity
        order_id, item_id = body.orderId, body.itemId
        duplicate = select(M.RefillTracker).where(M.RefillTracker.account_id == user["id"],
                                                  M.RefillTracker.item_id == item_id)
    else:
        plan = db.get(M.MedicationPlan, body.planId or "")
        if plan is None or plan.account_id != user["id"] or not plan.active:
            raise refill_error(404, "PLAN_NOT_FOUND", "That medicine isn't in your list.")
        label, default_packs, plan_id = plan.name, 1, plan.id
        duplicate = select(M.RefillTracker).where(M.RefillTracker.account_id == user["id"],
                                                  M.RefillTracker.plan_id == plan_id)
    if db.scalar(duplicate) is not None:
        raise refill_error(409, "ALREADY_TRACKED", "You already track a refill for this medicine.")
    packs = body.packs or default_packs
    _check_counts(db, pack_size=body.packSize, packs=packs, units_per_dose=body.unitsPerDose,
                  doses_per_day=body.dosesPerDay)
    started = _start_date(db, user["id"], body.startedOn)
    now = _now()
    row = M.RefillTracker(
        id=_id(), account_id=user["id"], source=body.source, plan_id=plan_id, order_id=order_id, item_id=item_id,
        label=label[:160], pack_size=body.packSize, packs=packs, units_per_dose=body.unitsPerDose,
        doses_per_day=body.dosesPerDay, units_on_hand=body.packSize * packs, anchor_on=started.isoformat(),
        remind_days_before=_days_before(db, body.remindDaysBefore), enabled=True, snoozed_until=0.0,
        reminded_for="", created_at=now, updated_at=now)
    recompute(db, row)
    db.add(row)
    _audit(db, user["id"], "REFILL_TRACKER_CREATED", row.id)
    db.commit()
    return {"refill": payload(db, row)}


class TrackerUpdate(StrictModel):
    enabled: bool | None = None
    remindDaysBefore: int | None = Field(default=None, ge=1)
    packSize: int | None = Field(default=None, ge=1)
    unitsPerDose: int | None = Field(default=None, ge=1)
    dosesPerDay: int | None = Field(default=None, ge=1)


@router.patch("/{tracker_id}")
def update_tracker(tracker_id: str, body: TrackerUpdate, user=Depends(authenticated_user),
                   db: Session = Depends(workflow_db)):
    _student(user)
    row = _own(db, user, tracker_id)
    pack_size = body.packSize or row.pack_size
    units_per_dose = body.unitsPerDose or row.units_per_dose
    doses_per_day = body.dosesPerDay or row.doses_per_day
    _check_counts(db, pack_size=pack_size, packs=row.packs, units_per_dose=units_per_dose, doses_per_day=doses_per_day)
    if body.remindDaysBefore is not None:
        row.remind_days_before = _days_before(db, body.remindDaysBefore)
    if body.enabled is not None:
        row.enabled = body.enabled
    if (units_per_dose, doses_per_day) != (row.units_per_dose, row.doses_per_day):
        # A new schedule counts from today, from what is left under the old one.
        zone = student_time.student_zone(db, row.account_id)
        today = student_time.local_today(zone)
        row.units_on_hand, row.anchor_on = units_left(row, today), today.isoformat()
    row.pack_size, row.units_per_dose, row.doses_per_day = pack_size, units_per_dose, doses_per_day
    row.updated_at = _now()
    recompute(db, row)
    _audit(db, user["id"], "REFILL_TRACKER_UPDATED", row.id)
    db.commit()
    return {"refill": payload(db, row)}


class SnoozeInput(StrictModel):
    days: int | None = Field(default=None, ge=1)


@router.post("/{tracker_id}/snooze")
def snooze_tracker(tracker_id: str, body: SnoozeInput, user=Depends(authenticated_user),
                   db: Session = Depends(workflow_db)):
    """Hold the reminder back; once the snooze ends it comes again for the same run-out date."""
    _student(user)
    row = _own(db, user, tracker_id)
    days = body.days or setting("refill.snooze_days", db)
    _bounded(db, days, "refill.remind_days_before_max", "SNOOZE_OUT_OF_RANGE")
    row.snoozed_until = _now() + days * DAY_SECONDS
    row.reminded_for = ""
    row.updated_at = _now()
    _audit(db, user["id"], "REFILL_TRACKER_SNOOZED", row.id)
    db.commit()
    return {"refill": payload(db, row)}


class AdjustInput(StrictModel):
    # "I still have some": what the student counts in hand today.
    unitsLeft: int = Field(ge=0)


@router.post("/{tracker_id}/adjust")
def adjust_tracker(tracker_id: str, body: AdjustInput, user=Depends(authenticated_user),
                   db: Session = Depends(workflow_db)):
    _student(user)
    row = _own(db, user, tracker_id)
    most = row.pack_size * setting("refill.packs_max", db)
    if body.unitsLeft > most:
        raise refill_error(422, "UNITS_LEFT_OUT_OF_RANGE", f"Enter at most {most}.", min=0, max=most)
    today = student_time.local_today(student_time.student_zone(db, row.account_id))
    row.units_on_hand, row.anchor_on, row.reminded_for = body.unitsLeft, today.isoformat(), ""
    row.snoozed_until, row.updated_at = 0.0, _now()
    recompute(db, row)
    _audit(db, user["id"], "REFILL_TRACKER_ADJUSTED", row.id)
    db.commit()
    return {"refill": payload(db, row)}


class RestockInput(StrictModel):
    packs: int = Field(ge=1)


@router.post("/{tracker_id}/restock")
def restock_tracker(tracker_id: str, body: RestockInput, user=Depends(authenticated_user),
                    db: Session = Depends(workflow_db)):
    """The student has the new packs in hand: add them to what is left and count on from today."""
    _student(user)
    row = _own(db, user, tracker_id)
    _bounded(db, body.packs, "refill.packs_max", "PACKS_OUT_OF_RANGE")
    today = student_time.local_today(student_time.student_zone(db, row.account_id))
    row.units_on_hand = units_left(row, today) + body.packs * row.pack_size
    row.anchor_on, row.packs, row.reminded_for, row.snoozed_until = today.isoformat(), body.packs, "", 0.0
    row.updated_at = _now()
    recompute(db, row)
    _audit(db, user["id"], "REFILL_TRACKER_RESTOCKED", row.id)
    db.commit()
    return {"refill": payload(db, row)}


@router.delete("/{tracker_id}")
def delete_tracker(tracker_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    row = _own(db, user, tracker_id)
    db.delete(row)
    _audit(db, user["id"], "REFILL_TRACKER_DELETED", tracker_id)
    db.commit()
    return {"success": True}


@router.get("/rx-status")
def prescription_status(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Whether the student holds an unexpired e-prescription, and until when. Nothing more.

    Fail closed: a prescription with no recorded expiry is not counted as valid.
    It names no medicine and is never matched to a product here — a pharmacist
    does that when the prescription is sent to them.
    """
    _student(user)
    now = _now()
    rows = db.scalars(select(M.Prescription).where(
        M.Prescription.patient_id == user["id"], M.Prescription.status == "ISSUED",
        M.Prescription.valid_until > now)).all()
    latest = max((row.valid_until for row in rows), default=0.0)
    return {"validCount": len(rows), "latestValidUntil": latest or None}


# --- the scheduled pass ---------------------------------------------------------------


def queue_due_reminders(db: Session, at: float | None = None) -> dict:
    """Queue one refill reminder per tracker whose reminder time has come.

    Called by the ``refill_reminders`` job. Reminders that are off, snoozed or
    already queued for this run-out date are skipped. Delivery (reminders
    switch, quiet hours, channel) is the outbox's job; queuing promises nothing.
    """
    from services.workflow_scheduler import enqueue_reminder

    now = _now() if at is None else at
    rows = db.scalars(select(M.RefillTracker).where(
        M.RefillTracker.enabled.is_(True), M.RefillTracker.remind_at <= now,
        M.RefillTracker.snoozed_until <= now).order_by(M.RefillTracker.remind_at).limit(DUE_BATCH)).all()
    queued = 0
    for row in rows:
        recompute(db, row)   # the student may have changed time zone since
        if row.remind_at > now or row.reminded_for == row.runs_out_on:
            continue
        enqueue_reminder(db, row.account_id, REFILL_EVENT,
                         f"refill-tracker:{row.id}:{row.runs_out_on}:{int(row.updated_at)}",
                         {"resourceType": RESOURCE_TYPE, "resourceId": row.id})
        row.reminded_for = row.runs_out_on
        queued += 1
    db.commit()
    return {"status": "SUCCESS", "summary": {"due": len(rows), "queued": queued}}
