"""Areas inside a pincode, for area-wise delivery.

A pincode can cover several localities, and a provider may deliver to some of them
only. This module holds the two things that makes workable:

* **One list of area names per pincode**, loaded from the Department of Posts'
  All India Pincode Directory (data.gov.in, Government Open Data Licence - India).
  Students pick their area from it and providers tick areas from the same list, so
  the names always match. Nothing here is typed free-hand.
* **A provider's areas**: ``care_service_providers.serviceable_areas`` maps a pincode
  to the areas served in it. A pincode with no areas listed means the whole pincode.

Reference data about places, never about people. Loading it is an ops action
(``backend/scripts/load_pincode_directory.py``); nothing is fetched at run time.
"""
from __future__ import annotations

import csv
import re
from collections.abc import Iterable

from sqlalchemy import delete, func, select

from core import workflow_models as M

PINCODE = re.compile(r"[1-9][0-9]{5}")
AREA_MAX_CHARS = 120
AREA_MIN_CHARS = 2
AREAS_PER_PINCODE_MAX = 200
SOURCE = "All India Pincode Directory, Department of Posts (data.gov.in, GODL-India)"
# "Kukatpally S.O", "Ada B.O", "Mancherial H.O", "Hyderabad G.P.O.": the office type is not part of the place.
_OFFICE_SUFFIX = re.compile(r"\s+(?:[BSH]\.?O\.?|G\.?P\.?O\.?|B\.?P\.?O\.?)\s*$", re.IGNORECASE)
_SPACES = re.compile(r"\s+")

# The directory has been published with two header sets; both are read.
COLUMNS = {
    "office": ("officename", "office name", "office"),
    "pincode": ("pincode", "pin code", "pin"),
    "district": ("district", "districtname", "district name"),
    "state": ("statename", "state name", "state"),
}


def is_pincode(value: str) -> bool:
    return bool(PINCODE.fullmatch(value or ""))


def area_name(office: str) -> str:
    """The locality in a post-office name: "Kukatpally S.O" is Kukatpally."""
    return _SPACES.sub(" ", _OFFICE_SUFFIX.sub("", (office or "").strip())).strip()[:AREA_MAX_CHARS]


def area_key(name: str) -> str:
    """How two spellings of one area are compared: case and spacing do not matter."""
    return _SPACES.sub(" ", (name or "").strip()).casefold()


def areas_for(db, pincode: str) -> list[str]:
    """The areas the directory lists for a pincode, in alphabetical order. Empty when not loaded."""
    if not is_pincode(pincode):
        return []
    return list(db.scalars(select(M.PincodeArea.area).where(M.PincodeArea.pincode == pincode)
                           .order_by(M.PincodeArea.area)).all())


def place_for(db, pincode: str) -> dict:
    row = db.execute(select(M.PincodeArea.district, M.PincodeArea.state)
                     .where(M.PincodeArea.pincode == pincode).limit(1)).first()
    return {"district": row.district, "state": row.state} if row else {"district": "", "state": ""}


def clean_provider_areas(db, own_pincode: str, pincodes: list[str], areas: dict[str, list[str]]) -> dict[str, list[str]]:
    """Validate a provider's areas and return them spelled as the directory spells them.

    Raises ValueError with a message for the admin. Every key must be a pincode the
    provider serves; every area must be one the directory lists for that pincode,
    so a typo can never silently refuse (or accept) a real delivery.
    """
    served = {own_pincode, *pincodes}
    cleaned: dict[str, list[str]] = {}
    for pincode, names in (areas or {}).items():
        if not is_pincode(pincode):
            raise ValueError("Every area list must be under a six-digit pincode.")
        if pincode not in served:
            raise ValueError(f"Add pincode {pincode} to the provider's pincodes before listing its areas.")
        if len(names) > AREAS_PER_PINCODE_MAX:
            raise ValueError(f"A pincode can list at most {AREAS_PER_PINCODE_MAX} areas.")
        known = {area_key(name): name for name in areas_for(db, pincode)}
        if names and not known:
            raise ValueError(f"No areas are loaded for pincode {pincode}. Load the pincode directory, "
                             "or leave this pincode without areas to serve all of it.")
        picked: list[str] = []
        for name in names:
            match = known.get(area_key(name))
            if match is None:
                raise ValueError(f"\"{name.strip()[:AREA_MAX_CHARS]}\" is not an area of pincode {pincode}.")
            if match not in picked:
                picked.append(match)
        if picked:
            cleaned[pincode] = sorted(picked)
    return cleaned


def _field(row: dict, key: str) -> str:
    lowered = {(name or "").strip().lower(): (value or "") for name, value in row.items()}
    for alias in COLUMNS[key]:
        if alias in lowered:
            return lowered[alias].strip()
    return ""


def read_directory(lines: Iterable[str], *, state: str = "") -> tuple[dict[str, dict], int]:
    """Parse the directory CSV into {pincode: {"areas": set, "district", "state"}} and count unreadable rows."""
    wanted = state.strip().casefold()
    places: dict[str, dict] = {}
    skipped = 0
    for row in csv.DictReader(lines):
        pincode, name = _field(row, "pincode"), area_name(_field(row, "office"))
        if not is_pincode(pincode) or len(name) < AREA_MIN_CHARS:
            skipped += 1
            continue
        row_state = _field(row, "state")
        if wanted and row_state.casefold() != wanted:
            continue
        place = places.setdefault(pincode, {"areas": {}, "district": _field(row, "district").title()[:80],
                                            "state": row_state.title()[:60]})
        place["areas"].setdefault(area_key(name), name)
    return places, skipped


def load_directory(db, lines: Iterable[str], *, state: str = "") -> dict:
    """Replace the areas of every pincode in the file. Idempotent; other pincodes are left alone."""
    places, skipped = read_directory(lines, state=state)
    rows = 0
    for pincode, place in places.items():
        db.execute(delete(M.PincodeArea).where(M.PincodeArea.pincode == pincode))
        for name in sorted(place["areas"].values()):
            db.add(M.PincodeArea(pincode=pincode, area=name, district=place["district"], state=place["state"],
                                 source=SOURCE))
            rows += 1
    db.flush()
    return {"pincodes": len(places), "areas": rows, "skippedRows": skipped}


def directory_status(db) -> dict:
    return {"pincodes": db.scalar(select(func.count(func.distinct(M.PincodeArea.pincode)))) or 0,
            "areas": db.scalar(select(func.count()).select_from(M.PincodeArea)) or 0, "source": SOURCE}
