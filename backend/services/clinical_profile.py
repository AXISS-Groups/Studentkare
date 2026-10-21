"""A student's typed blood group and allergies, on the clinical plane.

They live in ``care_clinical_profiles`` (core/rule_l.py: CLINICAL), not in
``care_accounts.profile``, so the commerce role is refused them at Postgres and
code that only needs who someone is never sees them. Every reader and writer
goes through this module.

The API keeps its shapes: ``bloodGroup`` ("" when not given) and ``allergies``
(a list) as before, plus ``noKnownAllergies``. An empty ``allergies`` list on
its own means "not answered"; "none" is ``noKnownAllergies: true``. Old clients
that never send the flag keep working: they simply never say "none".
"""
from __future__ import annotations

import time

from sqlalchemy.orm import Session

from core import workflow_models as M

FIELDS = ("bloodGroup", "allergies", "noKnownAllergies")


def read(db: Session, account_id: str) -> dict:
    row = db.get(M.ClinicalProfile, account_id)
    if row is None:
        return {"bloodGroup": "", "allergies": [], "noKnownAllergies": False}
    return {"bloodGroup": row.blood_group or "", "allergies": list(row.allergies or []),
            "noKnownAllergies": row.no_known_allergies is True}


def blood_group(db: Session, account_id: str) -> str:
    return read(db, account_id)["bloodGroup"]


def allergies(db: Session, account_id: str) -> list[str]:
    return read(db, account_id)["allergies"]


def pop_changes(changes: dict) -> dict:
    """Take the clinical fields out of a validated profile update, leaving identity fields."""
    return {key: changes.pop(key) for key in FIELDS if key in changes}


def write(db: Session, account_id: str, changes: dict) -> None:
    """Apply bloodGroup / allergies / noKnownAllergies. Staged; the caller commits.

    Listing an allergy clears "none"; saying "none" clears the list (the update
    model refuses both at once).
    """
    if not changes:
        return
    row = db.get(M.ClinicalProfile, account_id)
    if row is None:
        row = M.ClinicalProfile(account_id=account_id, blood_group="", allergies=[], no_known_allergies=False)
        db.add(row)
    if "bloodGroup" in changes:
        row.blood_group = changes["bloodGroup"]
    if "allergies" in changes:
        row.allergies = list(changes["allergies"])
        if row.allergies:
            row.no_known_allergies = False
    if "noKnownAllergies" in changes:
        row.no_known_allergies = bool(changes["noKnownAllergies"])
        if row.no_known_allergies:
            row.allergies = []
    row.updated_at = time.time()
