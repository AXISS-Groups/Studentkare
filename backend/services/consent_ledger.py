"""Every consent a student gave, and withdrawing each optional one (DPDP Act 2023 s.6(4), audit H2).

Two kinds of purpose:

* **Required for the service** (``RECORDS_STORAGE``, ``CAMPUS_ENROLMENT``,
  ``ADULT_18_PLUS``), agreed at sign-up. Studentkare can't keep an account without
  them, so they can't be withdrawn one by one: withdrawing them means stopping the
  service, which is deleting the account (services/erasure.py). The API says so
  (``REQUIRED_FOR_SERVICE``) instead of pretending to withdraw.
* **Optional**, each a switch the student turned on themselves. Each is listed in
  ``OPTIONAL_PURPOSES`` with the flag the code that processes it reads, so
  withdrawing it turns that flag off in the same transaction and the processing
  stops at its gate:

  - ``AYUSH_HISTORY``: services/agent_ayush.history_kept reads the flag before any
    words are kept; withdrawing also clears the words already kept.
  - ``PICKUP_LOCATION``: stored only; nothing reads it today (a hostel pickup carries
    the block typed into that request). Withdrawing keeps it off for when something does.
  - ``SEASONAL_EDUCATION`` / ``PREVENTIVE_OFFERS``: stored only; no sender reads them
    today. Same.
  - ``BLOOD_DONOR_CONTACT``: the donor record's ``visible`` flag, which
    blood_emergency_agent.campus_donors requires before a donor is listed to campus
    staff or messaged by a blood SOS.

The ledger is ``care_consent_records``, append-only: giving an optional consent adds
a row (purpose, wording version, time); withdrawing it stamps ``withdrawn_at`` on
that row. The switches elsewhere (notification settings, preventive care, donor
registration) write the same ledger through ``record_change``, so the record is the
same whichever screen the student used. Every change is audited.
"""
from __future__ import annotations

import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session as DBSession

from core import preventive_models as P
from core import workflow_models as M
from services.workflow_auth import (
    SIGNUP_REQUIRED_PURPOSES,
    StrictModel,
    authenticated_user,
    workflow_db,
)

router = APIRouter(prefix="/api/privacy", tags=["Privacy and consent"])

# The wording version of the optional purposes ("privacy.consent.*" in
# src/i18n/areas/privacy.ts). Change that copy → change this, so each record says
# which wording was agreed to.
OPTIONAL_CONSENT_VERSION = "optional-2026-10-23"
REQUIRED_FOR_SERVICE = "REQUIRED_FOR_SERVICE"
NOT_REGISTERED = "BLOOD_DONOR_NOT_REGISTERED"


def _audit(db: DBSession, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=time.time()))


def _notification_prefs(db: DBSession, account_id: str, create: bool) -> M.NotificationPreference | None:
    row = db.get(M.NotificationPreference, account_id)
    if row is None and create:
        row = M.NotificationPreference(account_id=account_id, email_enabled=True, push_enabled=True,
                                       reminders_enabled=True, timezone="", quiet_start="22:00", quiet_end="08:00",
                                       pickup_location_enabled=False, ayush_history_enabled=False)
        db.add(row)
    return row


def _preventive_prefs(db: DBSession, account_id: str, create: bool) -> P.PreventivePreference | None:
    row = db.get(P.PreventivePreference, account_id)
    if row is None and create:
        row = P.PreventivePreference(account_id=account_id, seasonal_education_enabled=False, promotions_enabled=False,
                                     region="", topics=[], consent_version=1, updated_at=time.time())
        db.add(row)
    return row


def clear_ayush_words(db: DBSession, account_id: str) -> int:
    """History off means the words are not kept, including those already kept.

    Outcome and timing stay for evaluation; the transcript goes.
    """
    cleared = db.execute(
        update(M.AgentTurn)
        .where(M.AgentTurn.account_id == account_id, M.AgentTurn.question != "")
        .values(question="", answer="")
    ).rowcount or 0
    if cleared:
        _audit(db, account_id, "AYUSH_HISTORY_CLEARED", account_id)
    return cleared


@dataclass(frozen=True)
class OptionalPurpose:
    key: str
    # Whether it is on now: the flag the processing reads.
    read: Callable[[DBSession, str], bool]
    # Sets that flag. Raises HTTPException when it can't be given from the privacy page.
    write: Callable[[DBSession, str, bool], None]
    # Whether the privacy page can turn it on (False: it needs its own screen first).
    grantable_here: Callable[[DBSession, str], bool]


def _read_notif(field: str) -> Callable[[DBSession, str], bool]:
    def read(db: DBSession, account_id: str) -> bool:
        row = _notification_prefs(db, account_id, False)
        return bool(row and getattr(row, field))
    return read


def _write_notif(field: str) -> Callable[[DBSession, str, bool], None]:
    def write(db: DBSession, account_id: str, on: bool) -> None:
        row = _notification_prefs(db, account_id, True)
        setattr(row, field, on)
        if field == "ayush_history_enabled" and not on:
            clear_ayush_words(db, account_id)
    return write


def _read_prev(field: str) -> Callable[[DBSession, str], bool]:
    def read(db: DBSession, account_id: str) -> bool:
        row = _preventive_prefs(db, account_id, False)
        return bool(row and getattr(row, field))
    return read


def _write_prev(field: str) -> Callable[[DBSession, str, bool], None]:
    def write(db: DBSession, account_id: str, on: bool) -> None:
        row = _preventive_prefs(db, account_id, True)
        setattr(row, field, on)
        row.updated_at = time.time()
    return write


def _donors(db: DBSession, account_id: str) -> list[M.BloodDonor]:
    return list(db.scalars(select(M.BloodDonor).where(M.BloodDonor.account_id == account_id)).all())


def _read_donor(db: DBSession, account_id: str) -> bool:
    return any(row.visible for row in _donors(db, account_id))


def _write_donor(db: DBSession, account_id: str, on: bool) -> None:
    rows = _donors(db, account_id)
    if on and not rows:
        raise HTTPException(409, {"code": NOT_REGISTERED,
                                  "message": "Register as a blood donor first, on its own page."})
    for row in rows:
        row.visible = on


def _always(_db: DBSession, _account_id: str) -> bool:
    return True


OPTIONAL_PURPOSES: dict[str, OptionalPurpose] = {
    p.key: p for p in (
        OptionalPurpose("AYUSH_HISTORY", _read_notif("ayush_history_enabled"), _write_notif("ayush_history_enabled"), _always),
        OptionalPurpose("BLOOD_DONOR_CONTACT", _read_donor, _write_donor, lambda db, a: bool(_donors(db, a))),
        OptionalPurpose("PICKUP_LOCATION", _read_notif("pickup_location_enabled"), _write_notif("pickup_location_enabled"), _always),
        OptionalPurpose("PREVENTIVE_OFFERS", _read_prev("promotions_enabled"), _write_prev("promotions_enabled"), _always),
        OptionalPurpose("SEASONAL_EDUCATION", _read_prev("seasonal_education_enabled"), _write_prev("seasonal_education_enabled"), _always),
    )
}


def _rows(db: DBSession, account_id: str) -> list[M.ConsentRecord]:
    return list(db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.account_id == account_id)
                           .order_by(M.ConsentRecord.recorded_at.desc())).all())


def _for_purpose(rows: list[M.ConsentRecord], purpose: str) -> list[M.ConsentRecord]:
    return [row for row in rows if list(row.purposes or []) == [purpose]]


def record_change(db: DBSession, actor_id: str, account_id: str, purpose: str, granted: bool,
                  language: str = "en") -> None:
    """Writes the ledger for an optional purpose that was just turned on or off. Doesn't commit.

    Turning on with no active record adds one; turning off stamps every active one.
    Calling it with the state that is already recorded is a no-op.
    """
    if purpose not in OPTIONAL_PURPOSES:
        raise ValueError(f"Not an optional purpose: {purpose}")
    now = time.time()
    active = [row for row in _for_purpose(_rows(db, account_id), purpose) if not row.withdrawn_at]
    if granted and not active:
        row = M.ConsentRecord(id=str(uuid.uuid4()), account_id=account_id, version=OPTIONAL_CONSENT_VERSION,
                              purposes=[purpose], language=language, recorded_at=now, withdrawn_at=0.0)
        db.add(row)
        _audit(db, actor_id, f"CONSENT_GIVEN_{purpose}", row.id)
    elif not granted and active:
        for row in active:
            row.withdrawn_at = now
            _audit(db, actor_id, f"CONSENT_WITHDRAWN_{purpose}", row.id)


def set_optional(db: DBSession, actor_id: str, account_id: str, purpose: str, granted: bool, language: str = "en") -> None:
    """Turns the processing flag and the ledger together. Doesn't commit."""
    spec = OPTIONAL_PURPOSES[purpose]
    spec.write(db, account_id, granted)
    record_change(db, actor_id, account_id, purpose, granted, language)


def view(db: DBSession, account_id: str) -> dict:
    rows = _rows(db, account_id)
    signup = next((row for row in rows if set(SIGNUP_REQUIRED_PURPOSES) <= set(row.purposes or [])), None)
    optional = []
    for key, spec in OPTIONAL_PURPOSES.items():
        mine = _for_purpose(rows, key)
        active = next((row for row in mine if not row.withdrawn_at), None)
        withdrawn = next((row for row in mine if row.withdrawn_at), None)
        on = spec.read(db, account_id)
        optional.append({"purpose": key, "on": on, "canGiveHere": on or spec.grantable_here(db, account_id),
                         "version": active.version if active else None,
                         "givenAt": active.recorded_at if active else None,
                         "withdrawnAt": None if on or withdrawn is None else withdrawn.withdrawn_at})
    return {
        "required": None if signup is None else {
            "purposes": [p for p in SIGNUP_REQUIRED_PURPOSES if p in (signup.purposes or [])],
            "version": signup.version, "language": signup.language, "givenAt": signup.recorded_at,
            "noticeVersion": signup.notice_version or None, "termsVersion": signup.terms_version or None,
        },
        "optional": optional,
        "history": [{"purposes": list(row.purposes or []), "version": row.version, "givenAt": row.recorded_at,
                     "withdrawnAt": row.withdrawn_at or None} for row in rows],
    }


@router.get("/consents")
def my_consents(response: Response, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    """Every consent this account gave: the sign-up ones and each optional one, with dates and versions."""
    response.headers["Cache-Control"] = "no-store"
    return view(db, user["id"])


class ConsentChange(StrictModel):
    granted: bool
    # The language the student read the wording in.
    language: Literal["en", "te", "hi"] = "en"


@router.post("/consents/{purpose}")
def change_consent(purpose: str, body: ConsentChange, response: Response, user=Depends(authenticated_user),
                   db: DBSession = Depends(workflow_db)):
    """Gives or withdraws one optional consent, as easily as either way.

    A required purpose is refused with what withdrawing it means: the service
    stops, which is deleting the account.
    """
    response.headers["Cache-Control"] = "no-store"
    if purpose in SIGNUP_REQUIRED_PURPOSES:
        raise HTTPException(409, {"code": REQUIRED_FOR_SERVICE,
                                  "message": "This one is needed to keep your account. To withdraw it, delete your account."})
    if purpose not in OPTIONAL_PURPOSES:
        raise HTTPException(404, "No such consent.")
    set_optional(db, user["id"], user["id"], purpose, body.granted, body.language)
    db.commit()
    return view(db, user["id"])
