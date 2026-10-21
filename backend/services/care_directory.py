"""Find care near you: hospitals, clinics, pharmacies, ambulance services and blood banks.

Public (signed out) and in the app. Two sources, both real:

1. StudentKare partners already on the platform (``care_service_providers``,
   pharmacies and clinics) once a super admin has verified the listing and its
   licence is current.
2. The curated table (``care_facilities``), kept by super admins (any campus,
   or every campus) and campus administrators (their own campus only), audited.

Rules every response keeps:

* **Nothing unverified.** A listing is shown only while it is active and was
  verified within ``care_directory.verification_max_age_days``. Each item says
  how and when it was checked.
* **Nothing invented.** No bed availability, rating, review count, wait time or
  "open now" (hours are the text the admin typed). No distance either: the
  server never sees where the student is. The app computes distance on the
  device, from these coordinates, only when the student shares their location.
* **Scope.** Signed out: every-campus listings and partners. Signed in: those
  plus the listings for the viewer's own campus.
* **Ranking** is the viewer's campus first, then 24×7 places, then name. Never
  commission or paid placement (Rule L).

Doctors by department are the consultation listings (``GET /api/catalog?kind=consultation``)
and their slots (``GET /api/appointments/availability``); this module does not copy them.

India's Health Facility Registry has a connector stub (services/hfr_registry.py)
that reports "not configured" or "not built", never results.
"""
from __future__ import annotations

import re
import time
import uuid
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import Field, ValidationError, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import hfr_registry
from services.preventive_care import https_url
from services.student_time import default_zone, local_today
from services.workflow_api import _campus_key, campus_scope
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    require_campus_admin,
    require_super_admin,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Care directory"])

KINDS = ("HOSPITAL", "CLINIC", "PHARMACY", "AMBULANCE", "BLOOD_BANK")
Kind = Literal["HOSPITAL", "CLINIC", "PHARMACY", "AMBULANCE", "BLOOD_BANK"]
SEGMENTS: dict[str, frozenset[str]] = {
    "hospitals": frozenset({"HOSPITAL", "CLINIC", "BLOOD_BANK"}),
    "pharmacies": frozenset({"PHARMACY"}),
    "ambulance": frozenset({"AMBULANCE"}),
}
Segment = Literal["hospitals", "pharmacies", "ambulance"]
# Partner kinds the directory lists, and what each is shown as. Labs are booked
# through Lab tests, not visited from a directory.
PARTNER_KINDS = {"PHARMACY": "PHARMACY", "CLINIC": "CLINIC"}

CURATED_PREFIX = "cf_"
PARTNER_PREFIX = "sp_"
RANKED_BY = "your campus first, then open 24x7, then name — never by commission or paid placement"

PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9 -]*[0-9]$")
PHONE_DIGITS_MIN = 3     # 108 and 112 are three digits
PHONE_DIGITS_MAX = 15    # E.164
DEPARTMENT_NAME_MAX = 60

VERIFIED = "VERIFIED"
UNVERIFIED = "UNVERIFIED"
STALE = "STALE"


# --- who is asking --------------------------------------------------------

def optional_viewer(request: Request, db: Session = Depends(workflow_db)) -> dict | None:
    """The signed-in account, or None. Only ever narrows what is shown: a session
    that cannot be read is treated as signed out, which sees less, never more."""
    try:
        return authenticated_user(request, db)
    except HTTPException:
        return None


def viewer_campus_key(db: Session, viewer: dict | None) -> str:
    """The viewer's campus, normalised; "" when signed out or none is recorded."""
    if not viewer:
        return ""
    if viewer.get("role") == "STUDENT":
        verification = db.get(M.CampusVerification, viewer["id"])
        if verification and verification.university:
            return _campus_key(verification.university)
    account = db.get(M.Account, viewer["id"])
    return _campus_key((account.profile or {}).get("university", "")) if account else ""


# --- verification ---------------------------------------------------------

def today(db: Session) -> date:
    return local_today(default_zone(db))


def oldest_verified_day(db: Session) -> date:
    return today(db) - timedelta(days=int(setting("care_directory.verification_max_age_days", db)))


def facility_status(row: M.CareFacility, oldest: date) -> str:
    if row.verified_on is None:
        return UNVERIFIED
    return VERIFIED if row.verified_on >= oldest else STALE


def partner_verified_on(row: M.ServiceProvider, db: Session) -> date | None:
    if not row.verified_at:
        return None
    return datetime.fromtimestamp(row.verified_at, default_zone(db)).date()


def partner_licence_current(row: M.ServiceProvider) -> bool:
    return bool(row.licence_no) and (row.licence_expiry == 0.0 or row.licence_expiry > time.time())


def partner_status(row: M.ServiceProvider, db: Session, oldest: date) -> str:
    verified_on = partner_verified_on(row, db)
    if verified_on is None:
        return UNVERIFIED
    return VERIFIED if verified_on >= oldest else STALE


# --- payloads -------------------------------------------------------------

def _coordinates(latitude: float | None, longitude: float | None) -> dict | None:
    if latitude is None or longitude is None or (latitude == 0.0 and longitude == 0.0):
        return None
    return {"latitude": latitude, "longitude": longitude}


def facility_payload(row: M.CareFacility) -> dict:
    """What a student sees about a curated place. Nothing about anyone's health."""
    return {
        "id": f"{CURATED_PREFIX}{row.id}", "source": "CURATED", "kind": row.kind, "name": row.name,
        "departments": list(row.departments or []), "address": row.address, "area": row.area, "pincode": row.pincode,
        "coordinates": _coordinates(row.latitude, row.longitude), "phone": row.phone or None,
        "emergency24x7": bool(row.emergency_24x7), "hoursText": row.hours_text or None,
        "verifiedOn": row.verified_on.isoformat() if row.verified_on else None,
        "sourceNote": row.source, "sourceUrl": row.source_url or None, "campus": row.campus or None,
    }


def partner_payload(row: M.ServiceProvider, db: Session) -> dict:
    """A verified StudentKare partner. Partners have no listed phone, so there is no call button."""
    verified_on = partner_verified_on(row, db)
    return {
        "id": f"{PARTNER_PREFIX}{row.id}", "source": "PARTNER", "kind": PARTNER_KINDS[row.kind], "name": row.legal_name,
        "departments": [], "address": row.address, "area": "", "pincode": row.pincode,
        "coordinates": _coordinates(row.latitude, row.longitude), "phone": None,
        "emergency24x7": False, "hoursText": row.open_hours or None,
        "verifiedOn": verified_on.isoformat() if verified_on else None,
        "sourceNote": "", "sourceUrl": row.source_url or None, "campus": None,
    }


def _shown_facilities(db: Session, campus_key: str, kinds: frozenset[str] | None) -> list[M.CareFacility]:
    oldest = oldest_verified_day(db)
    statement = select(M.CareFacility).where(M.CareFacility.active.is_(True), M.CareFacility.verified_on.is_not(None),
                                             M.CareFacility.verified_on >= oldest)
    if kinds is not None:
        statement = statement.where(M.CareFacility.kind.in_(sorted(kinds)))
    rows = db.scalars(statement).all()
    return [r for r in rows if not r.campus or (campus_key and _campus_key(r.campus) == campus_key)]


def _shown_partners(db: Session, kinds: frozenset[str] | None) -> list[M.ServiceProvider]:
    oldest = oldest_verified_day(db)
    wanted = [k for k, shown_as in PARTNER_KINDS.items() if kinds is None or shown_as in kinds]
    if not wanted:
        return []
    rows = db.scalars(select(M.ServiceProvider).where(
        M.ServiceProvider.active.is_(True), M.ServiceProvider.kind.in_(wanted))).all()
    return [r for r in rows if partner_licence_current(r) and partner_status(r, db, oldest) == VERIFIED]


def _rank(item: dict, campus_key: str) -> tuple:
    own_campus = bool(item["campus"]) and _campus_key(item["campus"]) == campus_key
    return (not own_campus, not item["emergency24x7"], item["name"].casefold(), item["id"])


@router.get("/care-directory")
def care_directory(segment: Segment | None = None, viewer: dict | None = Depends(optional_viewer),
                   db: Session = Depends(workflow_db)) -> dict:
    """Verified places, for everyone. Signed in, the viewer's own campus listings too."""
    kinds = SEGMENTS[segment] if segment else None
    campus_key = viewer_campus_key(db, viewer)
    items = [facility_payload(r) for r in _shown_facilities(db, campus_key, kinds)]
    items += [partner_payload(r, db) for r in _shown_partners(db, kinds)]
    items.sort(key=lambda item: _rank(item, campus_key))
    cap = int(setting("care_directory.results_max", db))
    return {"items": items[:cap], "total": len(items), "rankedBy": RANKED_BY, "registry": hfr_registry.status()}


@router.get("/care-directory/registry")
def care_directory_registry() -> dict:
    """Whether India's Health Facility Registry is connected. It never is a source of listings yet."""
    return hfr_registry.status()


@router.get("/care-directory/{item_id}")
def care_directory_item(item_id: str, viewer: dict | None = Depends(optional_viewer), db: Session = Depends(workflow_db)) -> dict:
    """One place, under the same rules as the list: an unverified or out-of-scope one is not found."""
    campus_key = viewer_campus_key(db, viewer)
    if item_id.startswith(CURATED_PREFIX):
        wanted = item_id.removeprefix(CURATED_PREFIX)
        for row in _shown_facilities(db, campus_key, None):
            if row.id == wanted:
                return facility_payload(row)
    elif item_id.startswith(PARTNER_PREFIX):
        wanted = item_id.removeprefix(PARTNER_PREFIX)
        for row in _shown_partners(db, None):
            if row.id == wanted:
                return partner_payload(row, db)
    raise HTTPException(404, "This place is not in the directory.")


# --- curation (super admin, campus administrators) -------------------------

def _clean_phone(value: str) -> str:
    value = " ".join(value.split())
    if not value:
        return ""
    digits = re.sub(r"\D", "", value)
    if not PHONE_PATTERN.fullmatch(value) or not PHONE_DIGITS_MIN <= len(digits) <= PHONE_DIGITS_MAX:
        raise ValueError("Enter a phone number with digits only (a leading + and spaces are fine).")
    return value


class FacilityInput(StrictModel):
    kind: Kind
    name: str = Field(min_length=2, max_length=160)
    departments: list[str] = Field(default_factory=list, max_length=30)
    address: str = Field(default="", max_length=400)
    area: str = Field(default="", max_length=120)
    pincode: str = Field(default="", pattern=r"^([1-9][0-9]{5})?$")
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    phone: str = Field(default="", max_length=32)
    emergency24x7: bool = False
    hoursText: str = Field(default="", max_length=200)
    source: str = Field(min_length=3, max_length=200)
    sourceUrl: str = Field(default="", max_length=2000)
    verifiedOn: date | None = None
    campus: str = Field(default="", max_length=160)
    active: bool = True

    @field_validator("name", "address", "area", "hoursText", "source", "campus")
    @classmethod
    def trimmed(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("departments")
    @classmethod
    def clean_departments(cls, value: list[str]) -> list[str]:
        names = [" ".join(v.split()) for v in value if v and v.strip()]
        if any(len(name) > DEPARTMENT_NAME_MAX for name in names):
            raise ValueError(f"Each department name is at most {DEPARTMENT_NAME_MAX} characters.")
        return list(dict.fromkeys(names))

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        return _clean_phone(value)

    @field_validator("sourceUrl")
    @classmethod
    def valid_source_url(cls, value: str) -> str:
        return https_url(value.strip()) if value.strip() else ""

    @model_validator(mode="after")
    def coherent(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Give both latitude and longitude, or neither.")
        if self.latitude == 0.0 and self.longitude == 0.0:
            raise ValueError("0, 0 is not a real location. Leave the coordinates empty if you don't have them.")
        return self


class FacilityPatch(StrictModel):
    kind: Kind | None = None
    name: str | None = None
    departments: list[str] | None = None
    address: str | None = None
    area: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    emergency24x7: bool | None = None
    hoursText: str | None = None
    source: str | None = None
    sourceUrl: str | None = None
    verifiedOn: date | None = None
    campus: str | None = None
    active: bool | None = None


FIELDS = {"kind": "kind", "name": "name", "departments": "departments", "address": "address", "area": "area",
          "pincode": "pincode", "latitude": "latitude", "longitude": "longitude", "phone": "phone",
          "emergency24x7": "emergency_24x7", "hoursText": "hours_text", "source": "source", "sourceUrl": "source_url",
          "verifiedOn": "verified_on", "campus": "campus", "active": "active"}


def admin_payload(row: M.CareFacility, oldest: date) -> dict:
    return {"id": row.id, **{key: getattr(row, attr) for key, attr in FIELDS.items() if key != "verifiedOn"},
            "departments": list(row.departments or []),
            "verifiedOn": row.verified_on.isoformat() if row.verified_on else None,
            "status": facility_status(row, oldest), "updatedAt": row.updated_at or None}


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


def _admin_campus(db: Session, user: dict) -> str | None:
    """None for a super admin (any campus); otherwise the administrator's own campus, as recorded."""
    if campus_scope(user, db) is None:
        return None
    account = db.get(M.Account, user["id"])
    return " ".join(((account.profile or {}).get("university", "") if account else "").split())


def _check_verified_on(value: date | None, db: Session) -> None:
    if value is not None and value > today(db):
        raise HTTPException(422, "The verified date can't be in the future.")


def _owned(db: Session, user: dict, facility_id: str) -> M.CareFacility:
    """The row, if this administrator may change it. Another campus's row is simply not found."""
    row = db.get(M.CareFacility, facility_id)
    own = _admin_campus(db, user)
    if row is None or (own is not None and (not row.campus or _campus_key(row.campus) != _campus_key(own))):
        raise HTTPException(404, "Place not found.")
    return row


@router.get("/ops/care-facilities")
def list_facilities(campus: str | None = Query(None, max_length=160), user: dict = Depends(require_campus_admin),
                    db: Session = Depends(workflow_db)) -> dict:
    """A super admin sees every row (or one campus's); a campus administrator, their campus's rows."""
    own = _admin_campus(db, user)
    rows = db.scalars(select(M.CareFacility).order_by(M.CareFacility.name, M.CareFacility.id)).all()
    if own is not None:
        rows = [r for r in rows if r.campus and _campus_key(r.campus) == _campus_key(own)]
    elif campus is not None:
        rows = [r for r in rows if _campus_key(r.campus) == _campus_key(campus)]
    oldest = oldest_verified_day(db)
    return {"items": [admin_payload(r, oldest) for r in rows], "campus": own,
            "maxAgeDays": int(setting("care_directory.verification_max_age_days", db))}


@router.post("/ops/care-facilities", status_code=201)
def create_facility(body: FacilityInput, user: dict = Depends(require_campus_admin), db: Session = Depends(workflow_db)) -> dict:
    own = _admin_campus(db, user)
    if own is not None:
        if body.campus and _campus_key(body.campus) != _campus_key(own):
            raise HTTPException(403, "You can add places for your own campus only.")
        body = body.model_copy(update={"campus": own})
    _check_verified_on(body.verifiedOn, db)
    now = time.time()
    row = M.CareFacility(id=uuid.uuid4().hex, created_by=user["id"], created_at=now, updated_by=user["id"], updated_at=now)
    for key, attr in FIELDS.items():
        setattr(row, attr, getattr(body, key))
    db.add(row)
    _audit(db, user, "CARE_FACILITY_CREATED", row.id)
    db.commit()
    return admin_payload(row, oldest_verified_day(db))


@router.patch("/ops/care-facilities/{facility_id}")
def update_facility(facility_id: str, body: FacilityPatch, user: dict = Depends(require_campus_admin),
                    db: Session = Depends(workflow_db)) -> dict:
    row = _owned(db, user, facility_id)
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(422, "Change at least one field.")
    own = _admin_campus(db, user)
    if own is not None and "campus" in patch and _campus_key(patch["campus"] or "") != _campus_key(own):
        raise HTTPException(403, "You can keep places on your own campus only.")
    current = {key: getattr(row, attr) for key, attr in FIELDS.items()}
    current["departments"] = list(row.departments or [])
    try:
        merged = FacilityInput.model_validate({**current, **patch})
    except ValidationError as exc:
        raise HTTPException(422, [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]) from exc
    _check_verified_on(merged.verifiedOn, db)
    for key, attr in FIELDS.items():
        setattr(row, attr, getattr(merged, key))
    row.updated_by, row.updated_at = user["id"], time.time()
    _audit(db, user, "CARE_FACILITY_UPDATED", row.id)
    db.commit()
    return admin_payload(row, oldest_verified_day(db))


@router.delete("/ops/care-facilities/{facility_id}")
def remove_facility(facility_id: str, user: dict = Depends(require_campus_admin), db: Session = Depends(workflow_db)) -> dict:
    row = _owned(db, user, facility_id)
    db.delete(row)
    _audit(db, user, "CARE_FACILITY_REMOVED", facility_id)
    db.commit()
    return {"success": True}


@router.get("/ops/care-directory/partners")
def directory_partners(user: dict = Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    """Partner pharmacies and clinics, and whether each reaches the directory (and why not)."""
    oldest = oldest_verified_day(db)
    rows = db.scalars(select(M.ServiceProvider).where(M.ServiceProvider.kind.in_(sorted(PARTNER_KINDS)))
                      .order_by(M.ServiceProvider.legal_name, M.ServiceProvider.id)).all()
    items = []
    for row in rows:
        status = partner_status(row, db, oldest)
        shown = row.active and partner_licence_current(row) and status == VERIFIED
        reason = None if shown else ("INACTIVE" if not row.active else "LICENCE" if not partner_licence_current(row) else status)
        verified_on = partner_verified_on(row, db)
        items.append({"id": row.id, "kind": row.kind, "name": row.legal_name, "pincode": row.pincode,
                      "hasCoordinates": _coordinates(row.latitude, row.longitude) is not None,
                      "verifiedOn": verified_on.isoformat() if verified_on else None,
                      "shown": shown, "hiddenBecause": reason})
    return {"items": items}


@router.get("/ops/care-directory/registry/search")
def registry_search(query: str = Query("", max_length=160), pincode: str = Query("", pattern=r"^([1-9][0-9]{5})?$"),
                    user: dict = Depends(require_super_admin)) -> dict:
    """HFR search for an admin. Answers 503 with the connector's state: there is no live search to run."""
    try:
        return {"items": hfr_registry.search_facilities(query, pincode)}
    except hfr_registry.RegistryUnavailable as exc:
        raise HTTPException(503, {"code": exc.state, "message": exc.message}) from exc
