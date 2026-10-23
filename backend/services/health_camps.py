"""Campus health camps: hosting, booking, waitlist, cancel and change, reminders.

A campus administrator (for their own campus), a clinic or lab partner (for a
partner campus, which approves it first) or a super admin creates a camp: its
date, a place on campus, the services it offers, who may book, its price and
its bookable slots with a capacity each. Students see the published, upcoming
camps for their campus, book one slot, wait for a full one, cancel or change
their slot until ``camps.change_cutoff_hours`` before it starts, and are
reminded ``camps.reminder_hours_before`` it starts through the reminder outbox
(services/workflow_scheduler.py, ``camp_reminder``), which never names the
camp or its services outside the app.

Left out on purpose (docs/plans/tier1-health-camps-2026-10-23.md, Tier 1):
* a scannable QR pass and the staff scanner that checks a student in by it
  (DESIGN.md §5: "check-in pass and staff scanner"); the booking reference is
  shown as text and the student's own check-in on the camp day is unchanged;
* entering results at a station and sending them to the student's records;
* vaccination drives and blood donation drives (consent, clinical screening):
  their service codes exist so a host sees them, but a camp cannot offer them;
* paid camps: the price is stored and shown, but a host can set one only when
  ``camps.paid_camps_enabled`` is on, and a paid camp cannot be booked until a
  payment flow that keeps the camp off the commerce plane exists (Rule L).

The camp, slot and station tables are platform plane; a student's attendance
row is clinical (core/rule_l.py). Hosts and campus administrators get counts
per slot, never who booked: the campus console withholds small counts (its
k-anonymity floor) and no endpoint here lists a student.
"""
from __future__ import annotations

import re
import secrets
import time
import uuid
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from core.team_scope import TEAM_CAMPUS, is_reserved_campus, team_sandboxed
from services import ops_feed, student_time
from services.workflow_auth import StrictModel, authenticated_user, partner_kind_of, workflow_db

router = APIRouter(prefix="/api", tags=["Health camps"])

# Service codes a camp can list. Labels live in the i18n catalogues (camps.service.*).
SERVICES = ("GENERAL_SCREENING", "EYE_CHECK", "DENTAL_CHECK", "BLOOD_DONATION", "VACCINATION")
# Tier 1 until the plan is approved: consent at the point of care and clinical screening.
HELD_SERVICES = frozenset({"BLOOD_DONATION", "VACCINATION"})
# CAMPUS_VERIFIED: students the campus has verified. CAMPUS_ANY: students who gave this
# campus, verified or not. OPEN: every student (only a camp for every campus, campus "").
ELIGIBILITY = ("CAMPUS_VERIFIED", "CAMPUS_ANY", "OPEN")
CAMP_STATIONS = ["Registration", "Vitals", "Consultation", "Sample collection", "Exit"]
# A wellness centre gets what a clinic gets (founder decision 2026-10-22).
PARTNER_HOST_KINDS = frozenset({"CLINIC", "LAB", "WELLNESS"})

PUBLISHED = "PUBLISHED"
PENDING = "PENDING_APPROVAL"
DECLINED = "DECLINED"
CANCELLED = "CANCELLED"

BOOKED = "BOOKED"
REGISTERED = "REGISTERED"
WAITLISTED = "WAITLISTED"
ATT_CANCELLED = "CANCELLED"
# A row the student can still turn up with (check in, complete stations).
ATTENDING = frozenset({BOOKED, REGISTERED})

REMINDER_EVENT = "camp_reminder"
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8
SECONDS_PER_HOUR = 3600
NOON = 12
MINUTES_PER_HOUR = 60
HOURS_PER_DAY = 24
_TIME_12 = re.compile(r"^(\d{1,2}):(\d{2})\s*(AM|PM)$", re.IGNORECASE)
_TIME_24 = re.compile(r"^(\d{1,2}):(\d{2})$")


def _id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=user["id"], action=action, resource_id=resource_id, created_at=time.time()))


def _fail(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _key(value: str | None) -> str:
    return " ".join((value or "").split()).casefold()


def _tidy(value: str | None) -> str:
    return " ".join((value or "").split())


# --- time ---------------------------------------------------------------------

def parse_slot_time(value: str) -> tuple[int, int] | None:
    """(hour, minute) from "9:30 AM" (what students have always been shown) or "09:30"."""
    text = (value or "").strip()
    match = _TIME_12.match(text)
    if match:
        hours, minutes = int(match.group(1)), int(match.group(2))
        if not 1 <= hours <= NOON or minutes >= MINUTES_PER_HOUR:
            return None
        hours = hours % NOON + (NOON if match.group(3).upper() == "PM" else 0)
        return hours, minutes
    match = _TIME_24.match(text)
    if match:
        hours, minutes = int(match.group(1)), int(match.group(2))
        if hours >= HOURS_PER_DAY or minutes >= MINUTES_PER_HOUR:
            return None
        return hours, minutes
    return None


def display_time(hours: int, minutes: int) -> str:
    meridiem = "PM" if hours >= NOON else "AM"
    twelve = hours % NOON or NOON
    return f"{twelve}:{minutes:02d} {meridiem}"


def slot_start_epoch(db: Session, camp_date: str, slot_start: str) -> float | None:
    """When a slot starts, in the platform's zone (campuses keep no zone of their own)."""
    parsed = parse_slot_time(slot_start)
    try:
        day = date.fromisoformat(camp_date)
    except (TypeError, ValueError):
        return None
    if parsed is None:
        return None
    zone = student_time.default_zone(db)
    return datetime(day.year, day.month, day.day, parsed[0], parsed[1], tzinfo=zone).timestamp()


def _today(db: Session) -> date:
    return datetime.now(student_time.default_zone(db)).date()


def _changeable_until(db: Session, camp: M.HealthCamp, slot: M.HealthCampSlot | None) -> float | None:
    if slot is None:
        return None
    start = slot_start_epoch(db, camp.date, slot.slot_start)
    if start is None:
        return None
    return start - int(setting("camps.change_cutoff_hours", db)) * SECONDS_PER_HOUR


def _can_change(db: Session, camp: M.HealthCamp, slot: M.HealthCampSlot | None) -> bool:
    until = _changeable_until(db, camp, slot)
    # A slot whose time cannot be read is not changed in the app (fail closed).
    return until is not None and time.time() < until


# --- who may see and book -------------------------------------------------------

def student_campus(db: Session, account_id: str) -> tuple[str, bool]:
    """(campus key, verified) for a student: their campus verification, else the campus they gave."""
    row = db.get(M.CampusVerification, account_id)
    if row is not None and row.university:
        return _key(row.university), row.status == "VERIFIED"
    account = db.get(M.Account, account_id)
    return _key((account.profile or {}).get("university", "") if account else ""), False


def _visible_to_student(camp: M.HealthCamp, campus_key: str) -> bool:
    return not camp.campus or (bool(campus_key) and _key(camp.campus) == campus_key)


def eligibility_of(db: Session, user: dict, camp: M.HealthCamp) -> str:
    """"" when the user may book this camp, else the reason code the app explains."""
    if user.get("role") != "STUDENT":
        return "NOT_STUDENT"
    campus_key, verified = student_campus(db, user["id"])
    if not _visible_to_student(camp, campus_key):
        return "OTHER_CAMPUS"
    if camp.campus and camp.eligibility == "CAMPUS_VERIFIED" and not verified:
        return "NOT_VERIFIED"
    return ""


def _upcoming(db: Session, camp: M.HealthCamp) -> bool:
    today = _today(db)
    last = today + timedelta(days=int(setting("camps.upcoming_days_max", db)))
    return today.isoformat() <= camp.date <= last.isoformat()


def _bookable_camp(db: Session, camp_id: str, user: dict) -> M.HealthCamp:
    camp = db.get(M.HealthCamp, camp_id)
    if camp is None or not camp.active or camp.status != PUBLISHED:
        raise HTTPException(404, "Camp not found.")
    if user.get("role") == "STUDENT" and not _visible_to_student(camp, student_campus(db, user["id"])[0]):
        raise HTTPException(404, "Camp not found.")
    return camp


# --- payloads -----------------------------------------------------------------------

def _slots(db: Session, camp_id: str) -> list[M.HealthCampSlot]:
    return list(db.scalars(select(M.HealthCampSlot).where(M.HealthCampSlot.camp_id == camp_id, M.HealthCampSlot.active.is_(True))
                           .order_by(M.HealthCampSlot.slot_start)).all())


def _sorted_slots(db: Session, camp: M.HealthCamp) -> list[M.HealthCampSlot]:
    """Slots in clock order ("10:00 AM" sorts before "9:00 AM" as text)."""
    rows = _slots(db, camp.id)
    return sorted(rows, key=lambda slot: parse_slot_time(slot.slot_start) or (99, 0))


def _waitlisted_counts(db: Session, camp_id: str) -> dict[str, int]:
    rows = db.execute(select(M.CampAttendance.slot_id, func.count()).where(
        M.CampAttendance.camp_id == camp_id, M.CampAttendance.status == WAITLISTED).group_by(M.CampAttendance.slot_id)).all()
    return {slot_id: count for slot_id, count in rows if slot_id}


def _camp_base(camp: M.HealthCamp) -> dict:
    return {"id": camp.id, "name": camp.name, "date": camp.date, "location": camp.location, "whatToBring": camp.what_to_bring,
            "campus": camp.campus, "services": list(camp.services or []), "eligibility": camp.eligibility,
            "pricePaise": camp.price_paise, "hostKind": camp.host_kind or "", "status": camp.status}


def _waitlist_position(db: Session, row: M.CampAttendance) -> int | None:
    if row.status != WAITLISTED or not row.slot_id:
        return None
    ahead = db.scalar(select(func.count()).select_from(M.CampAttendance).where(
        M.CampAttendance.slot_id == row.slot_id, M.CampAttendance.status == WAITLISTED,
        M.CampAttendance.updated_at < row.updated_at))
    return int(ahead or 0) + 1


def _booking_payload(db: Session, row: M.CampAttendance, camp: M.HealthCamp) -> dict:
    slot = db.get(M.HealthCampSlot, row.slot_id) if row.slot_id else None
    until = _changeable_until(db, camp, slot)
    return {
        "id": row.id, "status": row.status, "bookingCode": row.booking_code or None, "checkedIn": row.checked_in,
        "camp": _camp_base(camp),
        "slot": {"id": slot.id, "slotStart": slot.slot_start, "slotEnd": slot.slot_end} if slot else None,
        "waitlistPosition": _waitlist_position(db, row),
        "changeableUntil": until,
        "canChange": row.status in (BOOKED, WAITLISTED) and not row.checked_in and camp.status == PUBLISHED and _can_change(db, camp, slot),
        "campCancelled": camp.status == CANCELLED or not camp.active,
        "cancelReason": camp.cancel_reason or None,
        "updatedAt": row.updated_at or row.created_at,
    }


def _mine(db: Session, camp_id: str, account_id: str, *, lock: bool = False) -> M.CampAttendance | None:
    query = select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id, M.CampAttendance.account_id == account_id)
    if lock:
        query = query.with_for_update()
    return db.scalar(query)


def _new_code(db: Session) -> str:
    for _ in range(5):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        if db.scalar(select(M.CampAttendance.id).where(M.CampAttendance.booking_code == code)) is None:
            return code
    raise HTTPException(503, "Couldn't make a booking reference. Try again.")


def _stage_reminder(db: Session, row: M.CampAttendance) -> None:
    """Queue the slot reminder in this transaction. The scheduler holds it until it is due
    and drops it if the booking was cancelled or changed (reminder_timing)."""
    dedupe = f"camp-reminder:{row.id}:{row.booking_code}"
    if db.scalar(select(M.OutboxEvent.id).where(M.OutboxEvent.dedupe_key == dedupe)) is not None:
        return
    db.add(M.OutboxEvent(id=f"evt_{_id()[:16]}", event_type=REMINDER_EVENT, account_id=row.account_id, dedupe_key=dedupe,
                         payload={"attendanceId": row.id, "campId": row.camp_id, "slotId": row.slot_id,
                                  "bookingCode": row.booking_code},
                         attempts=0, status="PENDING", created_at=time.time()))


def _reserve(db: Session, slot_id: str, camp_id: str) -> bool:
    return db.execute(update(M.HealthCampSlot).where(
        M.HealthCampSlot.id == slot_id, M.HealthCampSlot.camp_id == camp_id, M.HealthCampSlot.active.is_(True),
        M.HealthCampSlot.booked < M.HealthCampSlot.capacity).values(booked=M.HealthCampSlot.booked + 1)).rowcount == 1


def _release(db: Session, slot_id: str) -> None:
    db.execute(update(M.HealthCampSlot).where(M.HealthCampSlot.id == slot_id, M.HealthCampSlot.booked > 0)
               .values(booked=M.HealthCampSlot.booked - 1))


def _promote_waitlist(db: Session, camp: M.HealthCamp, slot_id: str) -> int:
    """Book the longest-waiting students into a slot that has room again. In the caller's transaction."""
    slot = db.get(M.HealthCampSlot, slot_id)
    promoted = 0
    if slot is None or camp.status != PUBLISHED or not _can_change(db, camp, slot):
        return promoted
    while True:
        waiting = db.scalar(select(M.CampAttendance).where(
            M.CampAttendance.slot_id == slot_id, M.CampAttendance.status == WAITLISTED)
            .order_by(M.CampAttendance.updated_at, M.CampAttendance.id).limit(1).with_for_update())
        if waiting is None or not _reserve(db, slot_id, camp.id):
            return promoted
        waiting.status = BOOKED
        waiting.booking_code = _new_code(db)
        waiting.updated_at = time.time()
        _stage_reminder(db, waiting)
        ops_feed.notify(db, waiting.account_id, "CAMP_WAITLIST_BOOKED", dedupe_key=f"camp-promoted:{waiting.id}:{waiting.booking_code}",
                        summary="A place opened up and your health camp slot is now booked.",
                        resource_type="camp", resource_id=camp.id)
        promoted += 1


# --- student ------------------------------------------------------------------------

@router.get("/camps")
def list_camps(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Published, upcoming camps: for a student, their campus's and every-campus camps."""
    rows = db.scalars(select(M.HealthCamp).where(M.HealthCamp.active.is_(True), M.HealthCamp.status == PUBLISHED)
                      .order_by(M.HealthCamp.date, M.HealthCamp.name)).all()
    student = user.get("role") == "STUDENT"
    campus_key = student_campus(db, user["id"])[0] if student else ""
    items = []
    for camp in rows:
        if not _upcoming(db, camp) or (student and not _visible_to_student(camp, campus_key)):
            continue
        slots = _slots(db, camp.id)
        mine = _mine(db, camp.id, user["id"]) if student else None
        capacity = sum(slot.capacity for slot in slots)
        remaining = sum(max(slot.capacity - slot.booked, 0) for slot in slots)
        items.append({**_camp_base(camp), "capacity": capacity, "remaining": remaining, "slotCount": len(slots),
                      "ineligibleReason": eligibility_of(db, user, camp) or None,
                      "myStatus": mine.status if mine and mine.status != ATT_CANCELLED else None})
    return {"items": items}


@router.get("/camps/bookings/me")
def my_bookings(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Every camp booking, waitlist place and cancellation of the caller, newest camp first."""
    rows = db.execute(select(M.CampAttendance, M.HealthCamp).join(M.HealthCamp, M.HealthCamp.id == M.CampAttendance.camp_id)
                      .where(M.CampAttendance.account_id == user["id"], M.CampAttendance.status != REGISTERED)
                      .order_by(M.HealthCamp.date.desc())).all()
    return {"items": [_booking_payload(db, row, camp) for row, camp in rows]}


@router.get("/camps/{camp_id}/slots")
def camp_slots(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    camp = _bookable_camp(db, camp_id, user)
    waiting = _waitlisted_counts(db, camp_id)
    waitlist_max = int(setting("camps.waitlist_max_per_slot", db))
    items = []
    for slot in _sorted_slots(db, camp):
        start = slot_start_epoch(db, camp.date, slot.slot_start)
        started = start is None or time.time() >= start
        items.append({"id": slot.id, "slotStart": slot.slot_start, "slotEnd": slot.slot_end, "capacity": slot.capacity,
                      "booked": slot.booked, "remaining": max(slot.capacity - slot.booked, 0),
                      "available": slot.booked < slot.capacity and not started,
                      "waitlisted": waiting.get(slot.id, 0),
                      "waitlistOpen": slot.booked >= slot.capacity and not started and waiting.get(slot.id, 0) < waitlist_max,
                      "started": started})
    return {"items": items}


def _slot_for(db: Session, camp_id: str, body: dict) -> M.HealthCampSlot:
    slot_id = str(body.get("slotId", "")).strip()
    if not slot_id:
        raise HTTPException(422, "Choose a health camp slot.")
    slot = db.scalar(select(M.HealthCampSlot).where(M.HealthCampSlot.id == slot_id, M.HealthCampSlot.camp_id == camp_id,
                                                    M.HealthCampSlot.active.is_(True)))
    if slot is None:
        raise HTTPException(404, "Health camp slot not found.")
    start = slot_start_epoch(db, slot_camp_date(db, camp_id), slot.slot_start)
    if start is None or time.time() >= start:
        raise _fail(409, "SLOT_STARTED", "That slot has already started. Choose a later one.")
    return slot


def slot_camp_date(db: Session, camp_id: str) -> str:
    camp = db.get(M.HealthCamp, camp_id)
    return camp.date if camp else ""


def _check_bookable(db: Session, user: dict, camp: M.HealthCamp) -> None:
    reason = eligibility_of(db, user, camp)
    if reason:
        messages = {"NOT_STUDENT": "Only students can book a health camp.",
                    "OTHER_CAMPUS": "This camp is for students of another campus.",
                    "NOT_VERIFIED": "This camp is for students their campus has verified. Verify your campus first."}
        raise _fail(403, reason, messages[reason])
    if camp.price_paise > 0:
        # Rule L: no camp payment flow exists yet, so a paid camp is never booked unpaid.
        raise _fail(409, "PAYMENT_NOT_AVAILABLE", "Paying for a camp in the app isn't available yet.")


def _confirmation(db: Session, row: M.CampAttendance, camp: M.HealthCamp, slot: M.HealthCampSlot) -> dict:
    return {"bookingId": row.id, "bookingCode": row.booking_code, "status": row.status,
            "waitlistPosition": _waitlist_position(db, row),
            "camp": {"id": camp.id, "name": camp.name, "date": camp.date, "location": camp.location,
                     "whatToBring": camp.what_to_bring},
            "slot": {"id": slot.id, "slotStart": slot.slot_start, "slotEnd": slot.slot_end}}


@router.post("/camps/{camp_id}/book", status_code=201)
def book_camp_slot(camp_id: str, body: dict = Body(...), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    camp = _bookable_camp(db, camp_id, user)
    _check_bookable(db, user, camp)
    slot = _slot_for(db, camp_id, body)
    existing = _mine(db, camp_id, user["id"], lock=True)
    if existing and existing.status == BOOKED or existing and existing.status == REGISTERED and existing.slot_id:
        raise HTTPException(409, "You already booked a slot for this camp.")
    if not _reserve(db, slot.id, camp_id):
        raise _fail(409, "SLOT_FULL", "That slot is full. Choose another slot or join its waitlist.")
    row = existing or M.CampAttendance(id=f"att_{_id()[:10]}", camp_id=camp_id, account_id=user["id"],
                                       checked_in=False, completed_stations=[], created_at=time.time())
    if existing is None:
        db.add(row)
    previous_wait = existing.slot_id if existing and existing.status == WAITLISTED else None
    row.slot_id = slot.id
    row.status = BOOKED
    row.booking_code = _new_code(db)
    row.updated_at = time.time()
    _audit(db, user, "CAMP_SLOT_BOOKED", slot.id)
    ops_feed.announce(db, account_id=user["id"], event_type="CAMP_SLOT_BOOKED", domain="CAMPUS",
                      dedupe_key=f"camp-slot:{camp_id}:{user['id']}:{row.booking_code}",
                      summary="Your health camp slot is booked.", actor_id=user["id"], actor_role=user.get("role", ""),
                      resource_type="camp", resource_id=camp_id)
    _stage_reminder(db, row)
    try:
        db.flush()
        if previous_wait:
            _promote_waitlist(db, camp, previous_wait)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already booked a slot for this camp.") from None
    return _confirmation(db, row, camp, slot)


@router.post("/camps/{camp_id}/waitlist", status_code=201)
def join_waitlist(camp_id: str, body: dict = Body(...), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Wait for a full slot. The student is booked in, in the order they joined, when a place opens."""
    camp = _bookable_camp(db, camp_id, user)
    _check_bookable(db, user, camp)
    slot = _slot_for(db, camp_id, body)
    existing = _mine(db, camp_id, user["id"], lock=True)
    if existing and existing.status in (BOOKED, WAITLISTED) or existing and existing.status == REGISTERED and existing.slot_id:
        raise HTTPException(409, "You already have a place or a waitlist place at this camp. Change it instead.")
    db.refresh(slot)
    if slot.booked < slot.capacity:
        raise _fail(409, "SLOT_OPEN", "That slot has room. Book it instead.")
    waiting = db.scalar(select(func.count()).select_from(M.CampAttendance).where(
        M.CampAttendance.slot_id == slot.id, M.CampAttendance.status == WAITLISTED))
    if int(waiting or 0) >= int(setting("camps.waitlist_max_per_slot", db)):
        raise _fail(409, "WAITLIST_FULL", "The waitlist for that slot is full.")
    row = existing or M.CampAttendance(id=f"att_{_id()[:10]}", camp_id=camp_id, account_id=user["id"],
                                       checked_in=False, completed_stations=[], created_at=time.time())
    if existing is None:
        db.add(row)
    row.slot_id = slot.id
    row.status = WAITLISTED
    row.booking_code = _new_code(db)
    row.updated_at = time.time()
    _audit(db, user, "CAMP_WAITLIST_JOINED", slot.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already have a place at this camp.") from None
    return _confirmation(db, row, camp, slot)


@router.post("/camps/{camp_id}/cancel")
def cancel_booking(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    camp = db.get(M.HealthCamp, camp_id)
    row = _mine(db, camp_id, user["id"], lock=True)
    if camp is None or row is None or row.status not in (BOOKED, WAITLISTED):
        raise HTTPException(404, "No booking at this camp to cancel.")
    if row.checked_in:
        raise _fail(409, "CHECKED_IN", "You've checked in at this camp, so the booking can't be cancelled.")
    slot = db.get(M.HealthCampSlot, row.slot_id) if row.slot_id else None
    if row.status == BOOKED and camp.status == PUBLISHED and not _can_change(db, camp, slot):
        raise _fail(409, "TOO_LATE", "It's too close to your slot to cancel in the app. Tell the camp desk instead.")
    was_booked = row.status == BOOKED
    row.status = ATT_CANCELLED
    row.updated_at = time.time()
    _audit(db, user, "CAMP_BOOKING_CANCELLED", camp_id)
    if was_booked and slot is not None:
        _release(db, slot.id)
        db.flush()
        _promote_waitlist(db, camp, slot.id)
    db.commit()
    return _booking_payload(db, row, camp)


@router.post("/camps/{camp_id}/reschedule")
def reschedule_booking(camp_id: str, body: dict = Body(...), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Move a booking (or a waitlist place) to another slot with room."""
    camp = _bookable_camp(db, camp_id, user)
    _check_bookable(db, user, camp)
    row = _mine(db, camp_id, user["id"], lock=True)
    if row is None or row.status not in (BOOKED, WAITLISTED):
        raise HTTPException(404, "No booking at this camp to change.")
    if row.checked_in:
        raise _fail(409, "CHECKED_IN", "You've checked in at this camp, so the slot can't be changed.")
    old_slot = db.get(M.HealthCampSlot, row.slot_id) if row.slot_id else None
    if row.status == BOOKED and not _can_change(db, camp, old_slot):
        raise _fail(409, "TOO_LATE", "It's too close to your slot to change it in the app. Tell the camp desk instead.")
    slot = _slot_for(db, camp_id, body)
    if old_slot is not None and slot.id == old_slot.id:
        raise _fail(409, "SAME_SLOT", "That is already your slot.")
    if not _reserve(db, slot.id, camp_id):
        raise _fail(409, "SLOT_FULL", "That slot is full. Choose another slot.")
    was_booked = row.status == BOOKED
    row.slot_id = slot.id
    row.status = BOOKED
    row.booking_code = _new_code(db)
    row.updated_at = time.time()
    _audit(db, user, "CAMP_BOOKING_CHANGED", slot.id)
    _stage_reminder(db, row)
    if old_slot is not None:
        if was_booked:
            _release(db, old_slot.id)
        db.flush()
        _promote_waitlist(db, camp, old_slot.id)
    db.commit()
    return _confirmation(db, row, camp, slot)


@router.get("/camps/{camp_id}/stations")
def camp_stations(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.HealthCampStation).where(M.HealthCampStation.camp_id == camp_id).order_by(M.HealthCampStation.sort)).all()
    return {"items": [{"id": s.id, "name": s.name, "sort": s.sort} for s in rows]}


@router.post("/camps/{camp_id}/register")
def register_for_camp(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    camp = _bookable_camp(db, camp_id, user)
    _check_bookable(db, user, camp)
    existing = _mine(db, camp_id, user["id"])
    if existing and existing.status != ATT_CANCELLED:
        return {"id": existing.id, "alreadyRegistered": True}
    row = existing or M.CampAttendance(id=f"att_{_id()[:10]}", camp_id=camp_id, account_id=user["id"],
                                       checked_in=False, completed_stations=[], created_at=time.time())
    if existing is None:
        db.add(row)
    row.slot_id = None
    row.status = REGISTERED
    row.updated_at = time.time()
    _audit(db, user, "CAMP_REGISTERED", camp_id)
    ops_feed.announce(db, account_id=user["id"], event_type="CAMP_REGISTERED", domain="CAMPUS",
                      dedupe_key=f"camp:{camp_id}:{user['id']}", summary="You are registered for the health camp.",
                      actor_id=user["id"], actor_role=user.get("role", ""), resource_type="camp", resource_id=camp_id)
    db.commit()
    return {"id": row.id, "alreadyRegistered": False}


def _attending(db: Session, camp_id: str, user: dict, missing: str) -> M.CampAttendance:
    row = _mine(db, camp_id, user["id"])
    if row is None or row.status not in ATTENDING:
        raise HTTPException(404, missing)
    return row


@router.post("/camps/{camp_id}/check-in")
def camp_check_in(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = _attending(db, camp_id, user, "Register for this camp before checking in.")
    row.checked_in = True
    _audit(db, user, "CAMP_CHECKED_IN", camp_id)
    db.commit()
    return {"checkedIn": True}


@router.post("/camps/{camp_id}/stations/{station_id}")
def complete_station(camp_id: str, station_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = _attending(db, camp_id, user, "Register for this camp first.")
    station = db.scalar(select(M.HealthCampStation).where(M.HealthCampStation.id == station_id, M.HealthCampStation.camp_id == camp_id))
    if not station:
        raise HTTPException(404, "Station not found.")
    completed = list(row.completed_stations or [])
    if station_id not in completed:
        completed.append(station_id)
        row.completed_stations = completed
        _audit(db, user, "CAMP_STATION_COMPLETED", station_id)
        db.commit()
    return {"completedStations": completed}


@router.get("/camps/{camp_id}/me")
def my_camp_status(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = _mine(db, camp_id, user["id"])
    if not row or row.status not in ATTENDING:
        return {"registered": False, "checkedIn": False, "completedStations": [], "slotId": None,
                "status": row.status if row else None, "bookingCode": None}
    return {"registered": True, "checkedIn": row.checked_in, "completedStations": row.completed_stations or [],
            "slotId": row.slot_id, "status": row.status, "bookingCode": row.booking_code or None}


# --- hosts: campus administrators, clinic and lab partners, super admins ------------------

def _host(user: dict, db: Session) -> tuple[str, M.Account]:
    """("CAMPUS" | "PARTNER" | "PLATFORM", account) for someone who may host camps, else 403."""
    account = db.get(M.Account, user["id"])
    role = user.get("role")
    if account is not None and role == "SUPER_ADMIN":
        return "PLATFORM", account
    if account is not None and role == "CAMPUS_ADMIN":
        return "CAMPUS", account
    if account is not None and role == "VENDOR" and partner_kind_of(account) in PARTNER_HOST_KINDS:
        return "PARTNER", account
    raise HTTPException(403, "Only a campus administrator, a clinic or lab partner or a super admin can run health camps.")


def _admin_campus(db: Session, account: M.Account) -> str:
    from services.workflow_api import staff_campus_of
    campus = staff_campus_of(account)
    if not campus:
        raise HTTPException(403, "Your account isn't assigned to a campus yet. Ask a super admin to set it.")
    return campus


def partner_campuses(db: Session) -> list[str]:
    """Campuses with an active campus administrator: the ones a partner can propose a camp to."""
    from services.workflow_api import staff_campus_of
    rows = db.scalars(select(M.Account).where(M.Account.role == "CAMPUS_ADMIN", M.Account.active.is_(True),
                                              M.Account.is_team_account.is_(False))).all()
    seen: dict[str, str] = {}
    for row in rows:
        name = staff_campus_of(row)
        if _key(name) and _key(name) not in seen:
            seen[_key(name)] = name
    return sorted(seen.values(), key=str.casefold)


def _in_scope(kind: str, account: M.Account, camp: M.HealthCamp, db: Session) -> bool:
    if kind == "PLATFORM":
        return True
    if kind == "CAMPUS":
        return bool(camp.campus) and _key(camp.campus) == _key(_admin_campus(db, account))
    return camp.host_account_id == account.id


@router.get("/ops/camps/options")
def host_options(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """What the create form may offer this host. Services on hold are listed with ``held``."""
    kind, account = _host(user, db)
    if kind == "CAMPUS":
        campuses = [_admin_campus(db, account)]
    elif kind == "PARTNER":
        campuses = [TEAM_CAMPUS] if team_sandboxed(user) else partner_campuses(db)
    else:
        campuses = partner_campuses(db)
    return {"hostKind": kind, "campuses": campuses, "campusFixed": kind == "CAMPUS",
            "services": [{"code": code, "held": code in HELD_SERVICES} for code in SERVICES],
            "eligibility": [code for code in ELIGIBILITY if code != "OPEN"],
            "needsApproval": kind == "PARTNER"}


class SlotInput(StrictModel):
    start: str = Field(min_length=4, max_length=8)
    end: str = Field(min_length=4, max_length=8)
    capacity: int = Field(ge=1)


class CampInput(StrictModel):
    name: str = Field(min_length=3, max_length=120)
    date: str = Field(min_length=10, max_length=10)
    campus: str = Field(default="", max_length=160)
    location: str = Field(default="", max_length=160)
    whatToBring: str = Field(default="", max_length=400)
    services: list[str] = Field(min_length=1, max_length=len(SERVICES))
    eligibility: Literal["CAMPUS_VERIFIED", "CAMPUS_ANY"] = "CAMPUS_VERIFIED"
    pricePaise: int = Field(default=0, ge=0)
    slots: list[SlotInput] = Field(min_length=1)

    @field_validator("name", "campus", "location", "whatToBring", mode="before")
    @classmethod
    def tidy(cls, value):
        return " ".join(value.split()) if isinstance(value, str) else value


def _validated_slots(db: Session, body: CampInput) -> list[tuple[str, str, int]]:
    if len(body.slots) > int(setting("camps.slots_per_camp_max", db)):
        raise HTTPException(422, "That camp has more slots than a camp may have.")
    capacity_max = int(setting("camps.slot_capacity_max", db))
    out: list[tuple[str, str, int]] = []
    seen: set[tuple[int, int]] = set()
    for slot in body.slots:
        start, end = parse_slot_time(slot.start), parse_slot_time(slot.end)
        if start is None or end is None or end <= start:
            raise HTTPException(422, "Each slot needs a start time before its end time.")
        if slot.capacity > capacity_max:
            raise HTTPException(422, f"A slot can hold at most {capacity_max} students.")
        if start in seen:
            raise HTTPException(422, "Two slots start at the same time.")
        seen.add(start)
        out.append((display_time(*start), display_time(*end), slot.capacity))
    return out


@router.post("/ops/camps", status_code=201)
def create_camp(body: CampInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    kind, account = _host(user, db)
    try:
        day = date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(422, "Enter the camp date as YYYY-MM-DD.") from None
    if day < _today(db):
        raise HTTPException(422, "A camp can't be in the past.")
    services = list(dict.fromkeys(body.services))
    unknown = [code for code in services if code not in SERVICES]
    if unknown:
        raise HTTPException(422, "Unknown camp service.")
    if any(code in HELD_SERVICES for code in services):
        raise _fail(422, "SERVICE_HELD", "Vaccination and blood donation camps need a clinical review before they can be offered.")
    if body.pricePaise > 0 and not setting("camps.paid_camps_enabled", db):
        raise _fail(422, "PAID_CAMPS_OFF", "Paid camps aren't available yet. Make the camp free.")
    if body.pricePaise > int(setting("camps.price_paise_max", db)):
        raise HTTPException(422, "That price is above the highest a camp may charge.")
    slots = _validated_slots(db, body)
    if kind == "CAMPUS":
        campus = _admin_campus(db, account)
    elif kind == "PARTNER":
        offered = [TEAM_CAMPUS] if team_sandboxed(user) else partner_campuses(db)
        campus = next((name for name in offered if _key(name) == _key(body.campus)), "")
        if not campus:
            raise HTTPException(422, "Choose one of the partner campuses.")
    else:
        campus = body.campus
        if not campus or (is_reserved_campus(campus) and not user.get("isTeamAccount")):
            raise HTTPException(422, "Choose the campus this camp is for.")
    camp_id = f"camp_{_id()[:10]}"
    status = PENDING if kind == "PARTNER" else PUBLISHED
    db.add(M.HealthCamp(id=camp_id, name=body.name, date=body.date, location=body.location, what_to_bring=body.whatToBring,
                        active=True, campus=campus, services=services, eligibility=body.eligibility,
                        price_paise=body.pricePaise, status=status, host_account_id=account.id, host_kind=kind,
                        created_at=time.time()))
    for index, station in enumerate(CAMP_STATIONS):
        db.add(M.HealthCampStation(id=f"{camp_id}-st{index}", camp_id=camp_id, name=station, sort=index))
    for index, (start, end, capacity) in enumerate(slots):
        db.add(M.HealthCampSlot(id=f"{camp_id}-slot{index + 1}", camp_id=camp_id, slot_start=start, slot_end=end,
                                capacity=capacity, booked=0, active=True))
    _audit(db, user, "CAMP_CREATED", camp_id)
    if status == PENDING:
        ops_feed.publish(db, "CAMP_PROPOSED", "CAMPUS", summary="A partner proposed a health camp for your campus.",
                         actor_id=user["id"], actor_role=user.get("role", ""), resource_type="camp", resource_id=camp_id)
    db.commit()
    return {"id": camp_id, "status": status}


def _host_camp(db: Session, user: dict, camp_id: str) -> tuple[str, M.Account, M.HealthCamp]:
    kind, account = _host(user, db)
    camp = db.get(M.HealthCamp, camp_id)
    if camp is None or not _in_scope(kind, account, camp, db):
        raise HTTPException(404, "Camp not found.")
    return kind, account, camp


@router.get("/ops/camps")
def host_camps(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The camps this host runs or may approve, with counts per slot. Never who booked."""
    kind, account = _host(user, db)
    rows = db.scalars(select(M.HealthCamp).order_by(M.HealthCamp.date.desc(), M.HealthCamp.name)).all()
    items = []
    for camp in rows:
        if not _in_scope(kind, account, camp, db):
            continue
        counts = db.execute(select(M.CampAttendance.slot_id, M.CampAttendance.status, M.CampAttendance.checked_in, func.count())
                            .where(M.CampAttendance.camp_id == camp.id)
                            .group_by(M.CampAttendance.slot_id, M.CampAttendance.status, M.CampAttendance.checked_in)).all()
        per_slot: dict[str, dict[str, int]] = {}
        for slot_id, status, checked_in, count in counts:
            bucket = per_slot.setdefault(slot_id or "", {"waitlisted": 0, "checkedIn": 0, "cancelled": 0})
            if status == WAITLISTED:
                bucket["waitlisted"] += count
            elif status == ATT_CANCELLED:
                bucket["cancelled"] += count
            if checked_in and status in ATTENDING:
                bucket["checkedIn"] += count
        slots = [{"id": slot.id, "slotStart": slot.slot_start, "slotEnd": slot.slot_end, "capacity": slot.capacity,
                  "booked": slot.booked, **per_slot.get(slot.id, {"waitlisted": 0, "checkedIn": 0, "cancelled": 0})}
                 for slot in _sorted_slots(db, camp)]
        can_decide = camp.status == PENDING and kind in ("CAMPUS", "PLATFORM")
        items.append({**_camp_base(camp), "slots": slots, "isHost": camp.host_account_id == account.id,
                      "canDecide": can_decide,
                      "canCancel": camp.status in (PUBLISHED, PENDING) and camp.date >= _today(db).isoformat(),
                      "cancelReason": camp.cancel_reason or None})
    return {"items": items, "hostKind": kind}


class DecisionInput(StrictModel):
    decision: Literal["APPROVE", "DECLINE"]


@router.post("/ops/camps/{camp_id}/decision")
def decide_camp(camp_id: str, body: DecisionInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    kind, _account, camp = _host_camp(db, user, camp_id)
    if kind not in ("CAMPUS", "PLATFORM"):
        raise HTTPException(403, "The campus approves a partner's camp.")
    if camp.status != PENDING:
        raise HTTPException(409, "This camp isn't waiting for approval.")
    camp.status = PUBLISHED if body.decision == "APPROVE" else DECLINED
    _audit(db, user, f"CAMP_{body.decision}D", camp_id)
    ops_feed.notify(db, camp.host_account_id, "CAMP_DECISION", dedupe_key=f"camp-decision:{camp_id}",
                    summary="The campus approved your health camp." if body.decision == "APPROVE"
                    else "The campus declined your health camp.", resource_type="camp", resource_id=camp_id)
    db.commit()
    return {"id": camp_id, "status": camp.status}


class CancelCampInput(StrictModel):
    reason: str = Field(min_length=3, max_length=300)


@router.post("/ops/camps/{camp_id}/cancel")
def cancel_camp(camp_id: str, body: CancelCampInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Call a camp off. Every booking and waitlist place is cancelled and each student is told in the app."""
    _kind, _account, camp = _host_camp(db, user, camp_id)
    if camp.status not in (PUBLISHED, PENDING):
        raise HTTPException(409, "This camp is not running.")
    camp.status = CANCELLED
    camp.cancel_reason = " ".join(body.reason.split())
    rows = db.scalars(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id,
                                                     M.CampAttendance.status.in_((BOOKED, WAITLISTED, REGISTERED)))).all()
    for row in rows:
        row.status = ATT_CANCELLED
        row.updated_at = time.time()
        ops_feed.notify(db, row.account_id, "CAMP_CANCELLED", dedupe_key=f"camp-cancelled:{camp_id}:{row.account_id}",
                        summary="A health camp you booked was called off. Open the app for details.",
                        resource_type="camp", resource_id=camp_id)
    db.execute(update(M.HealthCampSlot).where(M.HealthCampSlot.camp_id == camp_id).values(booked=0))
    _audit(db, user, "CAMP_CANCELLED", camp_id)
    db.commit()
    return {"id": camp_id, "status": camp.status, "bookingsCancelled": len(rows)}


# --- reminders (services/workflow_scheduler.reminder_timing) ------------------------------

def camp_reminder_timing(db: Session, event, at: float) -> tuple[str, str, float | None]:
    """("send" | "defer" | "suppress" | "fail", reason, defer-until) for a camp_reminder."""
    payload = event.payload or {}
    row = db.get(M.CampAttendance, str(payload.get("attendanceId", "") or ""))
    if row is None or row.account_id != (event.account_id or ""):
        return "fail", "camp_booking_not_found", None
    if row.status != BOOKED or row.booking_code != payload.get("bookingCode"):
        # Cancelled, or changed to another slot (which queued its own reminder).
        return "suppress", "camp_booking_changed", None
    camp = db.get(M.HealthCamp, row.camp_id)
    slot = db.get(M.HealthCampSlot, row.slot_id) if row.slot_id else None
    if camp is None or camp.status != PUBLISHED or not camp.active:
        return "suppress", "camp_not_running", None
    start = slot_start_epoch(db, camp.date, slot.slot_start) if slot else None
    if start is None:
        return "fail", "camp_time_unknown", None
    if at >= start:
        return "suppress", "camp_passed", None
    due = start - int(setting("camps.reminder_hours_before", db)) * SECONDS_PER_HOUR
    if at < due:
        return "defer", "not_due", due
    return "send", "", None


def seed_sample_camp(db: Session, campus: str, host_account_id: str, now: float) -> int:
    """Dev seed only (services/demo_seed.py): one sample camp a week ahead. Idempotent."""
    camp_id = "sample-camp-eye-dental"
    if db.get(M.HealthCamp, camp_id) is not None:
        return 0
    day = (datetime.fromtimestamp(now, student_time.default_zone(db)).date() + timedelta(days=7)).isoformat()
    db.add(M.HealthCamp(id=camp_id, name="Sample: Eye and dental check camp", date=day, location="Sample: Main auditorium",
                        what_to_bring="Sample note: your student ID and any glasses you wear.", active=True, campus=campus,
                        services=["EYE_CHECK", "DENTAL_CHECK"], eligibility="CAMPUS_ANY", price_paise=0, status=PUBLISHED,
                        host_account_id=host_account_id, host_kind="CAMPUS", created_at=now))
    for index, station in enumerate(CAMP_STATIONS):
        db.add(M.HealthCampStation(id=f"{camp_id}-st{index}", camp_id=camp_id, name=station, sort=index))
    for index, (start, end) in enumerate((("9:00 AM", "10:00 AM"), ("10:00 AM", "11:00 AM"), ("11:00 AM", "12:00 PM"))):
        db.add(M.HealthCampSlot(id=f"{camp_id}-slot{index + 1}", camp_id=camp_id, slot_start=start, slot_end=end,
                                capacity=2 if index == 0 else 20, booked=0, active=True))
    return 1
