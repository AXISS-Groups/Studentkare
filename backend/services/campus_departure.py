"""Leaving campus: a student graduating, transferring or taking a break.

Design page 2, LeaveCampus (Tier 3). The student's records, care circle,
reminders and account are never touched. What ends on the effective date is
the campus link: the campus verification, the verified-student flag, the
college and roll number on the profile, and any seat on the college's contract.

Deliberately not collected: a "personal email". There is no verified recovery
contact flow yet (profile.recovery_email is read for OTP fallback but nothing
sets or verifies it), so an unverified address would be data held for nothing.
The screen instead warns a student who signs in with a college email.
"""
from __future__ import annotations

import time
import uuid
from datetime import date, datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field, field_validator, model_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core import billing_models as B
from core import workflow_models as M
from services import ops_feed
from services.workflow_auth import StrictModel, authenticated_user, workflow_db

router = APIRouter(prefix="/api", tags=["Campus departure"])

CAMPUS_TZ = ZoneInfo("Asia/Kolkata")
MAX_DAYS_AHEAD = 400
COLLEGE_EMAIL_SUFFIXES = (".ac.in", ".edu", ".edu.in")


def today_on_campus() -> date:
    return datetime.now(CAMPUS_TZ).date()


def _new_id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_new_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=time.time()))


def _scheduled(db: Session, account_id: str) -> M.CampusDeparture | None:
    return db.scalar(select(M.CampusDeparture).where(
        M.CampusDeparture.account_id == account_id, M.CampusDeparture.status == "SCHEDULED"))


def _signs_in_with_college_email(account: M.Account) -> bool:
    identifier = (account.identifier or "").lower()
    return account.channel == "EMAIL" and identifier.endswith(COLLEGE_EMAIL_SUFFIXES)


def _college_plan(db: Session, account_id: str) -> dict | None:
    """The contract a seat comes from, if the college pays for this student's plan."""
    seat = db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == account_id))
    contract = db.get(B.EnterpriseContract, seat.contract_id) if seat else None
    if not contract or contract.status != "ACTIVE":
        return None
    return {"organization": contract.organization, "planId": contract.plan_id}


def _payload(d: M.CampusDeparture | None) -> dict | None:
    if d is None:
        return None
    return {"id": d.id, "university": d.university, "reason": d.reason, "destination": d.destination or None,
            "effectiveOn": d.effective_on, "status": d.status, "createdAt": d.created_at,
            "completedAt": d.completed_at or None}


def complete_departure(db: Session, departure: M.CampusDeparture) -> None:
    """Remove the campus link. Staged in the caller's transaction; never commits."""
    account = db.scalar(select(M.Account).where(M.Account.id == departure.account_id).with_for_update()
                        .execution_options(populate_existing=True))
    db.execute(delete(M.CampusVerification).where(M.CampusVerification.account_id == departure.account_id))
    released = db.execute(delete(B.ContractSeat).where(B.ContractSeat.account_id == departure.account_id)).rowcount
    if account is not None:
        profile = dict(account.profile or {})
        profile.update(isVerifiedStudent=False, university="", rollNumber="")
        # The digital ID is issued against the campus affiliation, as on resubmission.
        profile.pop("digitalIdSecret", None)
        profile.pop("digitalIdIssuedAt", None)
        account.profile = profile
    departure.status = "COMPLETED"
    departure.completed_at = time.time()
    _audit(db, departure.account_id, "CAMPUS_DEPARTURE_COMPLETED", departure.id)
    ops_feed.announce(
        db, account_id=departure.account_id, event_type="CAMPUS_DEPARTURE_COMPLETED", domain="CAMPUS",
        dedupe_key=f"departure:{departure.id}:completed",
        summary="You're now a personal account. Your records stay with you.",
        actor_id=departure.account_id, actor_role="STUDENT",
        resource_type="campus_departure", resource_id=departure.id,
    )
    if released:
        ops_feed.publish(db, "CONTRACT_SEAT_RELEASED", "BILLING", summary="A contract seat was released when a student left campus",
                         subject_id=departure.account_id, resource_type="campus_departure", resource_id=departure.id)


def complete_due_departures(db: Session, *, on: date | None = None, limit: int = 50) -> dict:
    """Scheduler entry point: complete every departure whose date has arrived. Never commits."""
    cutoff = (on or today_on_campus()).isoformat()
    due = db.scalars(select(M.CampusDeparture).where(
        M.CampusDeparture.status == "SCHEDULED", M.CampusDeparture.effective_on <= cutoff,
    ).order_by(M.CampusDeparture.effective_on, M.CampusDeparture.id).limit(limit)).all()
    for departure in due:
        complete_departure(db, departure)
    db.flush()
    return {"summary": {"completed": len(due)}}


@router.get("/campus/departure")
def get_departure(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    account = db.get(M.Account, user["id"])
    if account is None:
        raise HTTPException(404, "Account not found.")
    verification = db.get(M.CampusVerification, user["id"])
    latest = db.scalar(select(M.CampusDeparture).where(M.CampusDeparture.account_id == user["id"])
                       .order_by(M.CampusDeparture.created_at.desc()).limit(1))
    return {
        "departure": _payload(latest),
        "campus": {"university": verification.university, "status": verification.status} if verification else None,
        "collegePlan": _college_plan(db, user["id"]),
        "signsInWithCollegeEmail": _signs_in_with_college_email(account),
        "today": today_on_campus().isoformat(),
    }


class DepartureInput(StrictModel):
    reason: Literal["GRADUATING", "TRANSFERRING", "PAUSING"]
    effectiveOn: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    destination: str | None = Field(default=None, max_length=160)

    @field_validator("destination", mode="before")
    @classmethod
    def strip_destination(cls, value):
        return value.strip() or None if isinstance(value, str) else value

    @model_validator(mode="after")
    def date_rules(self):
        if self.reason == "PAUSING":
            # A break takes effect today; there is nothing to schedule.
            self.effectiveOn = None
        elif not self.effectiveOn:
            raise ValueError("Choose the date you leave.")
        if self.reason != "TRANSFERRING":
            self.destination = None
        return self


@router.post("/campus/departure", status_code=201)
def create_departure(body: DepartureInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Only a student account can leave a campus.")
    db.scalar(select(M.Account).where(M.Account.id == user["id"]).with_for_update()
              .execution_options(populate_existing=True))
    verification = db.get(M.CampusVerification, user["id"])
    if verification is None:
        raise HTTPException(409, "Your account isn't linked to a campus, so there's nothing to leave.")
    if _scheduled(db, user["id"]):
        raise HTTPException(409, "You've already told us you're leaving. Undo that first to change it.")
    today = today_on_campus()
    if body.effectiveOn is None:
        effective = today
    else:
        try:
            effective = date.fromisoformat(body.effectiveOn)
        except ValueError as exc:
            raise HTTPException(422, "That date doesn't exist.") from exc
        if effective < today or effective > today + timedelta(days=MAX_DAYS_AHEAD):
            raise HTTPException(422, f"Choose a date between today and {MAX_DAYS_AHEAD} days from now.")
    departure = M.CampusDeparture(
        id=_new_id(), account_id=user["id"], university=verification.university, reason=body.reason,
        destination=body.destination or "", effective_on=effective.isoformat(), status="SCHEDULED",
        created_at=time.time(),
    )
    db.add(departure)
    _audit(db, user["id"], "CAMPUS_DEPARTURE_SCHEDULED", departure.id)
    if effective <= today:
        complete_departure(db, departure)
    else:
        ops_feed.notify(db, user["id"], "CAMPUS_DEPARTURE_SCHEDULED", dedupe_key=f"departure:{departure.id}:scheduled",
                        summary=f"You'll become a personal account on {effective.isoformat()}. You can undo this before then.",
                        resource_type="campus_departure", resource_id=departure.id)
    db.commit()
    return {"departure": _payload(departure)}


@router.post("/campus/departure/cancel")
def cancel_departure(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    departure = _scheduled(db, user["id"])
    if departure is None:
        raise HTTPException(409, "There's no scheduled departure to undo.")
    departure.status = "CANCELLED"
    _audit(db, user["id"], "CAMPUS_DEPARTURE_CANCELLED", departure.id)
    db.commit()
    return {"departure": _payload(departure)}
