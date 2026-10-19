"""Medals for actions a student took. Never for a body metric.

A fixed catalogue, each medal backed by a record that already exists. Each is
computed on read from whether something exists (presence), never from a value:
no steps, weight, BMI, heart rate, water, reading, result or score feeds a
medal, there are no streaks, no levels, no leaderboards and nothing is compared
with anyone else. Medals are private to the student and are not stored, so
there is nothing to leak or to keep after a record is deleted.

Medals carry no points. The only thing that earns points is a referral
(services/rewards.py); the "invited a friend" medal just mirrors it.

This module reads clinical tables (documents, camp attendance) to answer
"does one exist", so it runs on the ordinary session, never as sk_commerce,
and returns booleans only.
"""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M

# Order is the order the student sees them in.
MEDALS = (
    "PROFILE_VERIFIED",          # campus verification approved
    "EMERGENCY_CARD_COMPLETE",   # blood group + emergency contact with a valid number saved
    "FIRST_HEALTH_CAMP",         # checked in at a health camp
    "FRIEND_JOINED",             # someone who used your code became a verified student
)

_INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")


def _emergency_card_complete(profile: dict) -> bool:
    """The same test the emergency card screen uses for "nothing missing"
    (EmergencyCardViewModel.missing): a blood group, a contact name and a
    10-digit Indian mobile number. Presence only."""
    phone = re.sub(r"\D", "", str(profile.get("emergencyContactPhone", "")))[-10:]
    return bool(str(profile.get("bloodGroup", "")).strip()) and bool(
        str(profile.get("emergencyContactName", "")).strip()) and bool(_INDIAN_MOBILE.match(phone))


def earned(db: Session, account: M.Account) -> dict[str, bool]:
    profile = account.profile or {}
    campus = db.get(M.CampusVerification, account.id)
    return {
        "PROFILE_VERIFIED": profile.get("isVerifiedStudent") is True and bool(campus) and campus.status == "VERIFIED",
        "EMERGENCY_CARD_COMPLETE": _emergency_card_complete(profile),
        "FIRST_HEALTH_CAMP": db.scalar(select(M.CampAttendance.id).where(
            M.CampAttendance.account_id == account.id, M.CampAttendance.checked_in.is_(True)).limit(1)) is not None,
        "FRIEND_JOINED": db.scalar(select(M.Referral.id).where(
            M.Referral.inviter_account_id == account.id,
            M.Referral.status.in_(("REWARDED", "CAPPED"))).limit(1)) is not None,
    }


def medals_payload(db: Session, account: M.Account) -> list[dict]:
    flags = earned(db, account)
    return [{"id": medal, "earned": flags[medal]} for medal in MEDALS]
