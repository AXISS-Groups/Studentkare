"""Medicine information: reviewed label information, lookup by name or photo, and its review.

Plan tier1-medicine-info-2026-10-22 (approved by Krishna Chintakayala, founder,
2026-10-22). The rules this module keeps:

* **Reviewed only.** Every field (identity: brand, composition, form, pack,
  manufacturer, schedule; monograph: uses, side effects, warnings, storage, age
  availability) carries its source, the pharmacist who reviewed it and when. A
  field reaches users only while it is REVIEWED and its current value still
  hashes to what the pharmacist approved: an edit, an import or a change to the
  medicine master voids the approval by itself.
* **No AI.** Nothing here calls a model or writes monograph text. Imported text
  is kept verbatim and still needs a pharmacist.
* **No dose.** Age availability lists the forms and strengths the approved label
  gives each age band, validated so that no dose, frequency or mg/kg can be
  entered. The age band a person picks is never sent here.
* **Photo text is matched, then confirmed.** The reader (services/medicine_ocr.py)
  only extracts printed text; candidates go back for the person to confirm. The
  photo is never stored.
* **Crisis first.** Search text goes through the crisis gate (fail closed): a
  crisis outcome returns the gate's help and no results. The text is never logged.
* **Rule L.** Product reference data on the commerce plane (``sk_commerce``),
  beside the catalogue it says we sell. Nothing about the viewer is read or kept.

Who may do what: anyone may look up (signed out too). A pharmacist (a pharmacy
partner account) and a super admin edit fields; only a pharmacist approves
(D-MI-2); a super admin imports a licensed dataset, which lands UNREVIEWED.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import time
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.medicine_composition import (
    SCHEDULES,
    composition_key,
    requires_prescription_for,
    salt_key,
)
from core.settings_registry import setting
from services import crisis_gate, medicine_ocr, upload_files
from services.commerce_session import commerce_db
from services.medicine_master import (
    DOSAGE_FORMS,
    STRENGTH_UNITS,
    IngredientInput,
    composition_label,
    ingredients_by_medicine,
    published_medicine_clause,
)
from services.medicine_search import Candidate, prefilter_terms, rank
from services.student_time import default_zone, local_today
from services.workflow_auth import StrictModel, authenticated_user, limit, workflow_db

router = APIRouter(prefix="/api", tags=["Medicine information"])

IDENTITY_FIELDS = ("brand", "composition", "form", "pack", "manufacturer", "schedule")
LIST_FIELDS = ("uses", "side_effects", "warnings", "storage")
MONOGRAPH_FIELDS = (*LIST_FIELDS, "age_availability")
FIELDS = (*IDENTITY_FIELDS, *MONOGRAPH_FIELDS)
FieldName = Literal["brand", "composition", "form", "pack", "manufacturer", "schedule", "uses", "side_effects",
                    "warnings", "storage", "age_availability"]
BANDS = ("UNDER_2", "CHILD", "TEEN", "ADULT", "OLDER_ADULT", "PREGNANT_BREASTFEEDING")

UNREVIEWED = "UNREVIEWED"
REVIEWED = "REVIEWED"

LINES_MAX = 20
LINE_MIN = 2
LINE_MAX = 300
AVAILABILITY_MAX = 20
CANDIDATES_MAX = 2000
PRINTED_TEXT_MAX = 600
IMPORT_MAX_BYTES = 20 * 1024 * 1024
IMPORT_ERRORS_KEPT = 200
AVAILABILITY_PARTS = ("band", "form", "strength")
# The master's own column limits (core/workflow_models.py Medicine).
NAME_MIN = 2
BRAND_MAX = 160
PACK_MAX = 120
MANUFACTURER_MAX = 120
HISTORY_MAX = 100
WORK_SCAN_MAX = 500
PHOTO_TYPES = frozenset({upload_files.PNG, upload_files.JPEG})

# A label strength: "650 mg", "120 mg/5ml", "250 mg + 125 mg", "1% w/w". Nothing else
# fits, so no dose, frequency, duration or mg/kg can be typed into age availability.
_UNIT = "|".join(re.escape(u) for u in sorted(STRENGTH_UNITS, key=len, reverse=True))
STRENGTH_PATTERN = re.compile(rf"^\d+(?:\.\d+)?\s?(?:{_UNIT})(?:\s?\+\s?\d+(?:\.\d+)?\s?(?:{_UNIT}))*$", re.IGNORECASE)
INGREDIENT_PATTERN = re.compile(rf"^(?P<salt>.+?)\s+(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>{_UNIT})$", re.IGNORECASE)
CONTROL = re.compile(r"[\x00-\x1f\x7f]")

ROLE_PHARMACIST = "PHARMACIST"

# Routes here that run as sk_commerce (listed in /ops/rule-l beside the others).
MEDICINE_INFO_COMMERCE_PATHS = (
    "GET /api/medicine-info/search", "GET /api/medicine-info/medicines/{medicine_id}",
    "POST /api/medicine-info/photo", "GET /api/work/medicine-info", "GET /api/work/medicine-info/{medicine_id}",
    "PUT /api/work/medicine-info/{medicine_id}/fields/{field}",
    "POST /api/work/medicine-info/{medicine_id}/fields/{field}/review",
    "POST /api/work/medicine-info/{medicine_id}/fields/{field}/withdraw",
    "POST /api/ops/medicine-info/import", "GET /api/ops/medicine-info/imports",
)


# --- who ------------------------------------------------------------------

def is_pharmacist(user: dict) -> bool:
    return user.get("role") == "VENDOR" and user.get("partnerKind") == "PHARMACY"


def require_editor(user: dict = Depends(authenticated_user)) -> dict:
    """A pharmacist or a super admin."""
    if is_pharmacist(user) or user.get("role") == "SUPER_ADMIN":
        return user
    raise HTTPException(403, "Medicine information is edited by pharmacists and super admins.")


def require_pharmacist(user: dict = Depends(authenticated_user)) -> dict:
    """Only a pharmacist approves medicine information. No admin bypass (D-MI-2)."""
    if is_pharmacist(user):
        return user
    raise HTTPException(403, "Only a pharmacist can approve medicine information.")


def require_importer(user: dict = Depends(authenticated_user)) -> dict:
    if user.get("role") == "SUPER_ADMIN":
        return user
    raise HTTPException(403, "Only a super admin can import a dataset.")


def actor_role(user: dict) -> str:
    return ROLE_PHARMACIST if is_pharmacist(user) else str(user.get("role", ""))


# --- values and their review ------------------------------------------------

def value_hash(field: str, value: Any) -> str:
    return hashlib.sha256(json.dumps({"f": field, "v": value}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def identity_values(medicine: M.Medicine, ingredients: list[M.MedicineIngredient]) -> dict[str, Any]:
    return {
        "brand": medicine.name, "composition": composition_label(ingredients), "form": medicine.dosage_form,
        "pack": medicine.pack, "manufacturer": medicine.manufacturer, "schedule": medicine.schedule,
    }


def current_value(field: str, identity: dict[str, Any], row: M.MedicineInfoField | None) -> Any:
    if field in IDENTITY_FIELDS:
        return identity[field]
    return row.value if row is not None else None


def is_shown(field: str, identity: dict[str, Any], row: M.MedicineInfoField | None) -> bool:
    """Reviewed, and the value is still exactly what the pharmacist approved."""
    if row is None or row.state != REVIEWED or not row.reviewed_hash:
        return False
    value = current_value(field, identity, row)
    return value is not None and row.reviewed_hash == value_hash(field, value)


def rows_by_medicine(db: Session, medicine_ids: set[str]) -> dict[str, dict[str, M.MedicineInfoField]]:
    if not medicine_ids:
        return {}
    grouped: dict[str, dict[str, M.MedicineInfoField]] = {}
    for row in db.scalars(select(M.MedicineInfoField).where(M.MedicineInfoField.medicine_id.in_(medicine_ids))):
        grouped.setdefault(row.medicine_id, {})[row.field] = row
    return grouped


def is_published(medicine: M.Medicine, identity: dict[str, Any], rows: dict[str, M.MedicineInfoField]) -> bool:
    """In the lookup at all: active, and an imported medicine only once a pharmacist reviewed its identity."""
    if not medicine.active:
        return False
    if medicine.source != "IMPORT":
        return True
    return all(is_shown(f, identity, rows.get(f)) for f in IDENTITY_FIELDS)


def _review_note(row: M.MedicineInfoField) -> dict:
    return {"source": {"title": row.source_title, "url": row.source_url or None},
            "reviewedOn": row.reviewed_on.isoformat() if row.reviewed_on else None}


# --- validation ---------------------------------------------------------------

def _clean_line(line: Any) -> str:
    if not isinstance(line, str):
        raise ValueError("Each line must be text.")
    text = " ".join(CONTROL.sub(" ", line).split())
    if not LINE_MIN <= len(text) <= LINE_MAX:
        raise ValueError(f"Each line must be {LINE_MIN} to {LINE_MAX} characters.")
    return text


def validate_value(field: str, value: Any) -> dict:
    """The stored shape of a monograph field, or ValueError with a plain reason."""
    if not isinstance(value, dict) or not isinstance(value.get("items"), list):
        raise ValueError("Send the field as {\"items\": [...]}.")
    items = value["items"]
    if not items:
        raise ValueError("Add at least one line.")
    if field in LIST_FIELDS:
        if len(items) > LINES_MAX:
            raise ValueError(f"Up to {LINES_MAX} lines.")
        return {"items": [_clean_line(line) for line in items]}
    if field == "age_availability":
        if len(items) > AVAILABILITY_MAX:
            raise ValueError(f"Up to {AVAILABILITY_MAX} entries.")
        cleaned, seen = [], set()
        for entry in items:
            if not isinstance(entry, dict) or set(entry) != {"band", "form", "strength"}:
                raise ValueError("Each entry is an age band, a form and a strength, nothing else.")
            band, form = str(entry["band"]).upper(), str(entry["form"]).upper()
            strength = " ".join(str(entry["strength"]).split())
            if band not in BANDS:
                raise ValueError(f"Age band must be one of {', '.join(BANDS)}.")
            if form not in DOSAGE_FORMS:
                raise ValueError("Pick a dosage form from the list.")
            if not STRENGTH_PATTERN.match(strength):
                raise ValueError("Strength is the label strength only, for example 650 mg or 120 mg/5ml. "
                                 "Never a dose, how often, or per kg.")
            key = (band, form, strength.lower())
            if key not in seen:
                seen.add(key)
                cleaned.append({"band": band, "form": form, "strength": strength})
        return {"items": cleaned}
    raise ValueError("This field takes no value here.")


def _https_or_empty(url: str) -> str:
    url = url.strip()
    if url and not re.match(r"^https://[^\s]+$", url):
        raise ValueError("The source link must start with https://")
    return url


# --- the lookup -----------------------------------------------------------------

def _candidates(db: Session, terms: list[str]) -> list[M.Medicine]:
    if not terms:
        return []
    clauses = []
    for term in terms:
        clauses += [M.Medicine.name.ilike(f"{term}%"), M.Medicine.name.ilike(f"% {term}%"),
                    M.Medicine.id.in_(select(M.MedicineIngredient.medicine_id).where(or_(
                        M.MedicineIngredient.salt.ilike(f"{term}%"), M.MedicineIngredient.salt.ilike(f"% {term}%"))))]
    return list(db.scalars(select(M.Medicine).where(published_medicine_clause(), or_(*clauses))
                           .order_by(M.Medicine.name, M.Medicine.id).limit(CANDIDATES_MAX)))


def _matches(db: Session, text: str, *, printed: bool) -> list[dict]:
    medicines = _candidates(db, prefilter_terms(text, printed=printed))
    ids = {m.id for m in medicines}
    ingredients = ingredients_by_medicine(db, ids)
    rows = rows_by_medicine(db, ids)
    by_id: dict[str, M.Medicine] = {}
    candidates = []
    for medicine in medicines:
        parts = ingredients.get(medicine.id, [])
        identity = identity_values(medicine, parts)
        if not is_published(medicine, identity, rows.get(medicine.id, {})):
            continue
        by_id[medicine.id] = medicine
        candidates.append(Candidate(id=medicine.id, brand=medicine.name, salts=[p.salt for p in parts],
                                    strengths=[p.strength_value for p in parts]))
    ranked = rank(candidates, text, printed=printed, threshold=float(setting("medicine_info.match_min_similarity", db)),
                  limit=int(setting("medicine_info.results_max", db)))
    return [_summary(by_id[c.id], ingredients.get(c.id, []), rows.get(c.id, {}), c.matched_on) for c in ranked]


def _summary(medicine: M.Medicine, ingredients: list[M.MedicineIngredient], rows: dict[str, M.MedicineInfoField],
             matched_on: list[str]) -> dict:
    identity = identity_values(medicine, ingredients)
    return {
        "id": medicine.id, "brand": medicine.name, "composition": identity["composition"], "form": medicine.dosage_form,
        "pack": medicine.pack, "manufacturer": medicine.manufacturer, "schedule": medicine.schedule,
        "requiresPrescription": medicine.requires_prescription,
        "reviewed": any(is_shown(f, identity, rows.get(f)) for f in MONOGRAPH_FIELDS),
        "matchedOn": matched_on,
    }


def _crisis_payload(gate: dict) -> dict:
    return {"status": "CRISIS", "kind": gate["kind"], "resources": gate["resources"], "results": []}


@router.get("/medicine-info/search")
def search(q: str = Query("", max_length=120), db: Session = Depends(commerce_db)):
    """Brand or composition, typos tolerated. Crisis words return the crisis gate's help, never results."""
    gate = crisis_gate.evaluate(q)
    if gate["isCrisis"]:
        return _crisis_payload(gate)
    text = q.strip()
    if len(text) < int(setting("medicine_info.search_min_chars", db)):
        return {"status": "OK", "results": []}
    return {"status": "OK", "results": _matches(db, text, printed=False)}


def _listings(db: Session, medicine_ids: set[str]) -> dict[str, list[M.CatalogEntry]]:
    if not medicine_ids:
        return {}
    rows = db.scalars(select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id).where(
        M.CatalogEntry.medicine_id.in_(medicine_ids), M.CatalogEntry.active.is_(True), M.Account.active.is_(True),
        M.CatalogEntry.kind == "product").order_by(M.CatalogEntry.price_paise, M.CatalogEntry.id))
    grouped: dict[str, list[M.CatalogEntry]] = {}
    for row in rows:
        grouped.setdefault(row.medicine_id or "", []).append(row)
    return grouped


def buy_state(medicine: M.Medicine, listings: list[M.CatalogEntry]) -> dict:
    """What the screen may offer: OTC straight to the product page; prescription only through the Rx flow."""
    rx = medicine.requires_prescription or any(item.requires_prescription for item in listings)
    if rx:
        return {"state": "PRESCRIPTION", "itemId": listings[0].id if listings else None}
    in_stock = [item for item in listings if item.stock > 0]
    if in_stock:
        return {"state": "BUY", "itemId": in_stock[0].id, "pricePaise": in_stock[0].price_paise}
    if listings:
        return {"state": "OUT_OF_STOCK", "itemId": listings[0].id}
    return {"state": "NOT_SOLD", "itemId": None}


def _monograph(field: str, identity: dict, row: M.MedicineInfoField | None) -> dict | None:
    if not is_shown(field, identity, row) or row is None or row.value is None:
        return None
    return {"items": row.value["items"], **_review_note(row)}


def _related(db: Session, medicine: M.Medicine, ingredients: list[M.MedicineIngredient]) -> tuple[list[dict], list[dict]]:
    """Same-salt medicines (for age forms) and same-composition alternatives (OTC only)."""
    salts = {i.salt_key for i in ingredients}
    if not salts:
        return [], []
    ids = set(db.scalars(select(M.MedicineIngredient.medicine_id).where(M.MedicineIngredient.salt_key.in_(salts),
                                                                        M.MedicineIngredient.medicine_id != medicine.id)))
    others = list(db.scalars(select(M.Medicine).where(M.Medicine.id.in_(ids), published_medicine_clause())
                             .order_by(M.Medicine.name, M.Medicine.id).limit(CANDIDATES_MAX))) if ids else []
    parts = ingredients_by_medicine(db, {m.id for m in others})
    rows = rows_by_medicine(db, {m.id for m in others})
    listings = _listings(db, {m.id for m in others})
    cap = int(setting("medicine_info.results_max", db))
    same_salt, alternatives = [], []
    for other in others:
        other_parts = parts.get(other.id, [])
        if {p.salt_key for p in other_parts} != salts:
            continue
        identity = identity_values(other, other_parts)
        other_rows = rows.get(other.id, {})
        if not is_published(other, identity, other_rows):
            continue
        base = {"id": other.id, "brand": other.name, "composition": identity["composition"], "form": other.dosage_form,
                "pack": other.pack, "manufacturer": other.manufacturer, "schedule": other.schedule,
                "requiresPrescription": other.requires_prescription, "buy": buy_state(other, listings.get(other.id, []))}
        ages = _monograph("age_availability", identity, other_rows.get("age_availability"))
        if ages is not None and len(same_salt) < cap:
            same_salt.append({**base, "ageAvailability": ages})
        same = (other.composition_key == medicine.composition_key and other.dosage_form == medicine.dosage_form)
        if (same and not medicine.requires_prescription and not other.requires_prescription
                and is_shown("composition", identity, other_rows.get("composition")) and len(alternatives) < cap):
            alternatives.append(base)
    alternatives.sort(key=lambda a: (a["buy"].get("pricePaise") is None, a["buy"].get("pricePaise") or 0, a["brand"]))
    return same_salt, alternatives


def detail_payload(db: Session, medicine: M.Medicine) -> dict:
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    rows = rows_by_medicine(db, {medicine.id}).get(medicine.id, {})
    identity = identity_values(medicine, ingredients)
    if not is_published(medicine, identity, rows):
        raise HTTPException(404, "Medicine not found.")
    identity_rows = [rows.get(f) for f in IDENTITY_FIELDS]
    identity_reviewed = all(is_shown(f, identity, rows.get(f)) for f in IDENTITY_FIELDS)
    newest = max((r for r in identity_rows if r is not None), key=lambda r: r.reviewed_at, default=None)
    fields = {f: _monograph(f, identity, rows.get(f)) for f in MONOGRAPH_FIELDS}
    same_salt, alternatives = _related(db, medicine, ingredients)
    return {
        "id": medicine.id, **identity,
        "ingredients": [{"salt": i.salt, "strengthValue": i.strength_value, "strengthUnit": i.strength_unit}
                        for i in ingredients],
        "requiresPrescription": medicine.requires_prescription,
        "identityReview": _review_note(newest) if identity_reviewed and newest is not None else None,
        "fields": fields,
        "reviewed": any(v is not None for v in fields.values()),
        "sameSalt": same_salt,
        "alternatives": alternatives,
        "alternativesRestricted": medicine.requires_prescription,
        "buy": buy_state(medicine, _listings(db, {medicine.id}).get(medicine.id, [])),
    }


@router.get("/medicine-info/medicines/{medicine_id}")
def medicine_detail(medicine_id: str, db: Session = Depends(commerce_db)):
    medicine = db.get(M.Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(404, "Medicine not found.")
    return detail_payload(db, medicine)


# --- photo ------------------------------------------------------------------------

@router.get("/medicine-info/photo/status")
def photo_status():
    return {"state": medicine_ocr.status()["state"]}


def _client_key(request: Request) -> str:
    return f"medicine-photo:{request.client.host if request.client else 'unknown'}"


@router.post("/medicine-info/photo")
def read_photo(request: Request, file: UploadFile = File(...), db: Session = Depends(commerce_db),
               ops: Session = Depends(workflow_db)):
    """Printed text on a strip or box → candidates to confirm. The photo is read in memory and never kept."""
    state = medicine_ocr.status()["state"]
    if state != medicine_ocr.READY:
        return {"state": state, "text": "", "candidates": []}
    limit(ops, _client_key(request), int(setting("medicine_info.photo_per_hour", db)), 3600)
    max_bytes = int(setting("medicine_info.photo_max_kb", db)) * 1024
    content = upload_files.read_capped(file.file, max_bytes, "That photo is too large. Take it again a little further away.")
    if not upload_files.declared_type_matches(content, file.content_type, PHOTO_TYPES):
        raise HTTPException(422, "Send the photo as a JPEG or PNG.")
    try:
        text = medicine_ocr.read_text(content, int(setting("medicine_info.ocr_timeout_seconds", db)))
    except medicine_ocr.ReaderUnavailable as exc:
        return {"state": exc.state, "text": "", "candidates": []}
    except medicine_ocr.ReadFailed:
        return {"state": "FAILED", "text": "", "candidates": []}
    finally:
        del content
    printed = " ".join(text.split())[:PRINTED_TEXT_MAX]
    if not printed:
        return {"state": "NO_TEXT", "text": "", "candidates": []}
    return {"state": "READ", "text": printed, "candidates": _matches(db, printed, printed=True)}


# --- review: pharmacists and super admins ------------------------------------------

def _event(db: Session, user: dict, medicine_id: str, field: str, action: str, digest: str = "") -> None:
    now = time.time()
    db.add(M.MedicineInfoEvent(id=str(uuid.uuid4()), medicine_id=medicine_id, field=field, action=action,
                               actor_id=user["id"], actor_role=actor_role(user), value_hash=digest, created_at=now))
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action=f"MEDICINE_INFO_{action}",
                           resource_id=medicine_id, created_at=now))


def _field_payload(field: str, identity: dict, row: M.MedicineInfoField | None, viewer: dict) -> dict:
    value = current_value(field, identity, row)
    reviewed = row is not None and row.state == REVIEWED
    shown = is_shown(field, identity, row)
    return {
        "field": field, "kind": "identity" if field in IDENTITY_FIELDS else "monograph", "value": value,
        "valueHash": value_hash(field, value) if value is not None else None,
        "state": row.state if row is not None else UNREVIEWED, "shown": shown,
        "changedSinceReview": reviewed and not shown,
        "sourceTitle": row.source_title if row else "", "sourceUrl": row.source_url if row else "",
        "reviewedOn": row.reviewed_on.isoformat() if row and row.reviewed_on else None,
        "reviewedByYou": bool(row and row.reviewed_by and row.reviewed_by == viewer["id"]),
        "reviewedBy": row.reviewed_by if row else None,
        "updatedAt": row.updated_at if row else None,
    }


def _work_summary(medicine: M.Medicine, ingredients: list, rows: dict) -> dict:
    identity = identity_values(medicine, ingredients)
    shown = sum(1 for f in FIELDS if is_shown(f, identity, rows.get(f)))
    changed = sum(1 for f in FIELDS if rows.get(f) is not None and rows[f].state == REVIEWED and not is_shown(f, identity, rows[f]))
    return {"id": medicine.id, "brand": medicine.name, "composition": identity["composition"], "form": medicine.dosage_form,
            "schedule": medicine.schedule, "source": medicine.source, "active": medicine.active,
            "published": is_published(medicine, identity, rows), "reviewedCount": shown, "fieldCount": len(FIELDS),
            "changedCount": changed}


@router.get("/work/medicine-info")
def work_list(query: str = Query("", max_length=120), state: Literal["ALL", "TO_REVIEW", "REVIEWED"] = "TO_REVIEW",
              offset: int = Query(0, ge=0), limit_: int = Query(50, ge=1, le=200, alias="limit"),
              user=Depends(require_editor), db: Session = Depends(commerce_db)):
    statement = select(M.Medicine)
    if query.strip():
        q = query.strip()
        statement = statement.where(or_(M.Medicine.name.icontains(q, autoescape=True), M.Medicine.id.in_(
            select(M.MedicineIngredient.medicine_id).where(M.MedicineIngredient.salt.icontains(q, autoescape=True)))))
    medicines = list(db.scalars(statement.order_by(M.Medicine.name, M.Medicine.id).limit(WORK_SCAN_MAX)))
    ids = {m.id for m in medicines}
    parts, rows = ingredients_by_medicine(db, ids), rows_by_medicine(db, ids)
    items = [_work_summary(m, parts.get(m.id, []), rows.get(m.id, {})) for m in medicines]
    if state == "TO_REVIEW":
        items = [i for i in items if i["reviewedCount"] < i["fieldCount"]]
    elif state == "REVIEWED":
        items = [i for i in items if i["reviewedCount"] == i["fieldCount"]]
    return {"items": items[offset:offset + limit_], "total": len(items), "offset": offset, "limit": limit_,
            "canApprove": is_pharmacist(user), "canImport": user.get("role") == "SUPER_ADMIN"}


def _medicine_or_404(db: Session, medicine_id: str) -> M.Medicine:
    medicine = db.get(M.Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(404, "Medicine not found.")
    return medicine


def work_detail_payload(db: Session, medicine: M.Medicine, user: dict) -> dict:
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    rows = rows_by_medicine(db, {medicine.id}).get(medicine.id, {})
    identity = identity_values(medicine, ingredients)
    history = db.scalars(select(M.MedicineInfoEvent).where(M.MedicineInfoEvent.medicine_id == medicine.id)
                         .order_by(M.MedicineInfoEvent.created_at.desc(), M.MedicineInfoEvent.id).limit(HISTORY_MAX))
    return {
        "medicine": _work_summary(medicine, ingredients, rows),
        "fields": [_field_payload(f, identity, rows.get(f), user) for f in FIELDS],
        "history": [{"id": e.id, "field": e.field, "action": e.action, "actorRole": e.actor_role,
                     "byYou": e.actor_id == user["id"], "at": e.created_at, "valueHash": e.value_hash} for e in history],
        "canApprove": is_pharmacist(user),
        "bands": list(BANDS), "forms": list(DOSAGE_FORMS),
    }


@router.get("/work/medicine-info/{medicine_id}")
def work_detail(medicine_id: str, user=Depends(require_editor), db: Session = Depends(commerce_db)):
    return work_detail_payload(db, _medicine_or_404(db, medicine_id), user)


class FieldEdit(StrictModel):
    value: dict | None = None
    sourceTitle: str = Field(min_length=3, max_length=200)
    sourceUrl: str = Field(default="", max_length=2000)

    @field_validator("sourceUrl")
    @classmethod
    def https_only(cls, value: str) -> str:
        return _https_or_empty(value)


def _row(db: Session, medicine_id: str, field: str) -> M.MedicineInfoField | None:
    return db.scalar(select(M.MedicineInfoField).where(M.MedicineInfoField.medicine_id == medicine_id,
                                                       M.MedicineInfoField.field == field))


def _upsert(db: Session, medicine_id: str, field: str, user_id: str) -> M.MedicineInfoField:
    row = _row(db, medicine_id, field)
    if row is None:
        row = M.MedicineInfoField(id=str(uuid.uuid4()), medicine_id=medicine_id, field=field, state=UNREVIEWED)
        db.add(row)
    row.updated_by, row.updated_at = user_id, time.time()
    return row


def _clear_review(row: M.MedicineInfoField) -> None:
    row.state, row.reviewed_by, row.reviewed_on, row.reviewed_at, row.reviewed_hash = UNREVIEWED, None, None, 0.0, ""


@router.put("/work/medicine-info/{medicine_id}/fields/{field}")
def edit_field(medicine_id: str, field: FieldName, body: FieldEdit, user=Depends(require_editor),
               db: Session = Depends(commerce_db)):
    """Set a field's value (monograph fields) and its source. Any edit needs a fresh review."""
    medicine = _medicine_or_404(db, medicine_id)
    if field in IDENTITY_FIELDS:
        if body.value is not None:
            raise HTTPException(422, "Brand, composition, form, pack, manufacturer and schedule are changed in the "
                                     "medicine list (super admin); here you record only their source.")
        value = None
    else:
        if body.value is None:
            raise HTTPException(422, "Add the text for this field.")
        try:
            value = validate_value(field, body.value)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
    row = _upsert(db, medicine.id, field, user["id"])
    if field in MONOGRAPH_FIELDS:
        row.value = value
    row.source_title, row.source_url = " ".join(body.sourceTitle.split()), body.sourceUrl
    _clear_review(row)
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    current = current_value(field, identity_values(medicine, ingredients), row)
    _event(db, user, medicine.id, field, "EDITED", value_hash(field, current) if current is not None else "")
    db.commit()
    return work_detail_payload(db, medicine, user)


class ReviewInput(StrictModel):
    valueHash: str = Field(min_length=64, max_length=64)


@router.post("/work/medicine-info/{medicine_id}/fields/{field}/review")
def approve_field(medicine_id: str, field: FieldName, body: ReviewInput, user=Depends(require_pharmacist),
                  db: Session = Depends(commerce_db)):
    """A pharmacist approves exactly the value they read (its hash); anything else is refused."""
    medicine = _medicine_or_404(db, medicine_id)
    row = _row(db, medicine.id, field)
    if row is None or not row.source_title.strip():
        raise HTTPException(422, "Record where this information comes from before approving it.")
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    current = current_value(field, identity_values(medicine, ingredients), row)
    if current is None:
        raise HTTPException(422, "There is nothing to approve in this field yet.")
    digest = value_hash(field, current)
    if digest != body.valueHash:
        raise HTTPException(409, "This field changed after you opened it. Read it again before approving.")
    row.state, row.reviewed_by, row.reviewed_hash = REVIEWED, user["id"], digest
    row.reviewed_at = time.time()
    row.reviewed_on = local_today(default_zone(db))
    _event(db, user, medicine.id, field, "REVIEWED", digest)
    db.commit()
    return work_detail_payload(db, medicine, user)


@router.post("/work/medicine-info/{medicine_id}/fields/{field}/withdraw")
def withdraw_review(medicine_id: str, field: FieldName, user=Depends(require_editor), db: Session = Depends(commerce_db)):
    """Take a field off the public screen at once (it keeps its text for a new review)."""
    medicine = _medicine_or_404(db, medicine_id)
    row = _row(db, medicine.id, field)
    if row is None or row.state != REVIEWED:
        raise HTTPException(409, "This field is not approved.")
    digest = row.reviewed_hash
    _clear_review(row)
    row.updated_by, row.updated_at = user["id"], time.time()
    _event(db, user, medicine.id, field, "REVIEW_WITHDRAWN", digest)
    db.commit()
    return work_detail_payload(db, medicine, user)


# --- import: a licensed dataset, everything UNREVIEWED --------------------------------

IMPORT_COLUMNS = ("brand", "composition", "form", "pack", "manufacturer", "schedule", "uses", "side_effects",
                  "warnings", "storage", "age_availability", "source_title", "source_url")
REQUIRED_COLUMNS = ("brand", "composition", "form", "pack", "manufacturer", "schedule")


def parse_composition(text: str) -> list[IngredientInput]:
    parts = [p.strip() for p in text.split("+") if p.strip()]
    if not parts:
        raise ValueError("composition is empty")
    out = []
    for part in parts:
        match = INGREDIENT_PATTERN.match(" ".join(part.split()))
        if not match:
            raise ValueError(f"composition part '{part[:40]}' is not 'Salt 500 mg'")
        unit = next(u for u in STRENGTH_UNITS if u.lower() == match["unit"].lower())
        out.append(IngredientInput(salt=match["salt"], strengthValue=float(match["value"]), strengthUnit=unit))
    if len({salt_key(i.salt) for i in out}) != len(out):
        raise ValueError("a salt is listed twice")
    return out


def parse_availability(text: str) -> dict:
    items = []
    for chunk in [c.strip() for c in text.split("|") if c.strip()]:
        bits = [b.strip() for b in chunk.split(":")]
        if len(bits) != len(AVAILABILITY_PARTS):
            raise ValueError("age_availability entries are BAND:FORM:STRENGTH separated by |")
        items.append({"band": bits[0], "form": bits[1], "strength": bits[2]})
    return validate_value("age_availability", {"items": items})


def _parse_row(raw: dict[str, str]) -> dict:
    cell = {k: " ".join(CONTROL.sub(" ", (raw.get(k) or "")).split()) for k in IMPORT_COLUMNS}
    missing = [k for k in REQUIRED_COLUMNS if not cell[k]]
    if missing:
        raise ValueError(f"missing {', '.join(missing)}")
    form, schedule = cell["form"].upper(), cell["schedule"].upper()
    if form not in DOSAGE_FORMS:
        raise ValueError(f"form '{cell['form'][:30]}' is not a known dosage form")
    if schedule not in SCHEDULES:
        raise ValueError("schedule must be OTC, H, H1 or X")
    if not (NAME_MIN <= len(cell["brand"]) <= BRAND_MAX and len(cell["pack"]) <= PACK_MAX
            and NAME_MIN <= len(cell["manufacturer"]) <= MANUFACTURER_MAX):
        raise ValueError("brand, pack or manufacturer is too long or too short")
    try:
        ingredients = parse_composition(cell["composition"])
    except ValueError as exc:
        raise ValueError(str(exc)) from None
    monograph: dict[str, dict] = {}
    for f in LIST_FIELDS:
        if cell[f]:
            monograph[f] = validate_value(f, {"items": [x.strip() for x in cell[f].split("|") if x.strip()]})
    if cell["age_availability"]:
        monograph["age_availability"] = parse_availability(cell["age_availability"])
    return {"brand": cell["brand"], "ingredients": ingredients, "form": form, "pack": cell["pack"],
            "manufacturer": cell["manufacturer"], "schedule": schedule, "monograph": monograph,
            "source_title": cell["source_title"], "source_url": _https_or_empty(cell["source_url"])}


@router.post("/ops/medicine-info/import", status_code=201)
def import_dataset(file: UploadFile = File(...), dataset: str = Form(..., min_length=3, max_length=200),
                   licence: str = Form(..., min_length=3, max_length=300), sourceUrl: str = Form("", max_length=2000),
                   user=Depends(require_importer), db: Session = Depends(commerce_db)):
    """A licensed dataset's CSV. Rows land UNREVIEWED; a bad row is reported and nothing of it is saved."""
    try:
        default_url = _https_or_empty(sourceUrl)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    content = upload_files.read_capped(file.file, IMPORT_MAX_BYTES, "The file is too large.")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(422, "Save the file as UTF-8 CSV.") from exc
    reader = csv.DictReader(io.StringIO(text))
    header = [h.strip().lower() for h in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    if missing:
        raise HTTPException(422, f"The CSV needs the columns {', '.join(IMPORT_COLUMNS)}. Missing: {', '.join(missing)}.")
    reader.fieldnames = header
    rows = list(reader)
    if len(rows) > int(setting("medicine_info.import_max_rows", db)):
        raise HTTPException(422, f"Up to {setting('medicine_info.import_max_rows', db)} rows per import.")
    batch = M.MedicineInfoImport(id=str(uuid.uuid4()), filename=upload_files.safe_filename(file.filename, "import.csv"),
                                 dataset=" ".join(dataset.split()), licence=" ".join(licence.split()),
                                 source_url=default_url, rows_total=len(rows), errors=[], created_by=user["id"],
                                 created_at=time.time())
    db.add(batch)
    errors: list[dict] = []
    for number, raw in enumerate(rows, start=2):
        try:
            parsed = _parse_row(raw)
        except ValueError as exc:
            errors.append({"row": number, "reason": str(exc)[:200]})
            continue
        _import_row(db, batch, parsed, user)
    batch.rows_rejected = len(errors)
    batch.errors = errors[:IMPORT_ERRORS_KEPT]
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action="MEDICINE_INFO_IMPORT", resource_id=batch.id,
                           created_at=time.time()))
    db.commit()
    return _import_payload(batch)


def _import_row(db: Session, batch: M.MedicineInfoImport, parsed: dict, user: dict) -> None:
    key = composition_key([(i.salt, i.strengthValue, i.strengthUnit) for i in parsed["ingredients"]])
    medicine = db.scalar(select(M.Medicine).where(func.lower(M.Medicine.name) == parsed["brand"].lower(),
                                                  M.Medicine.composition_key == key,
                                                  M.Medicine.dosage_form == parsed["form"]).limit(1))
    now = time.time()
    if medicine is None:
        medicine = M.Medicine(id=str(uuid.uuid4()), name=parsed["brand"], composition_key=key, dosage_form=parsed["form"],
                              pack=parsed["pack"], manufacturer=parsed["manufacturer"], schedule=parsed["schedule"],
                              requires_prescription=requires_prescription_for(parsed["schedule"]), active=True,
                              source="IMPORT", created_at=now, updated_at=now)
        db.add(medicine)
        db.flush()
        for position, ingredient in enumerate(parsed["ingredients"]):
            db.add(M.MedicineIngredient(id=str(uuid.uuid4()), medicine_id=medicine.id, position=position,
                                        salt=ingredient.salt, salt_key=salt_key(ingredient.salt),
                                        strength_value=ingredient.strengthValue, strength_unit=ingredient.strengthUnit))
        batch.rows_created += 1
    else:
        batch.rows_matched += 1   # the master is never changed by an import
    source_title = parsed["source_title"] or batch.dataset
    source_url = parsed["source_url"] or batch.source_url
    for field in IDENTITY_FIELDS:
        row = _row(db, medicine.id, field)
        if row is None:
            row = _upsert(db, medicine.id, field, user["id"])
            row.source_title, row.source_url, row.import_id = source_title, source_url, batch.id
            _event(db, user, medicine.id, field, "IMPORTED")
    for field, value in parsed["monograph"].items():
        row = _row(db, medicine.id, field)
        if row is not None and row.value == value:
            continue
        row = _upsert(db, medicine.id, field, user["id"])
        row.value, row.source_title, row.source_url, row.import_id = value, source_title, source_url, batch.id
        _clear_review(row)
        _event(db, user, medicine.id, field, "IMPORTED", value_hash(field, value))
    db.flush()


def _import_payload(batch: M.MedicineInfoImport) -> dict:
    return {"id": batch.id, "filename": batch.filename, "dataset": batch.dataset, "licence": batch.licence,
            "sourceUrl": batch.source_url or None, "rowsTotal": batch.rows_total, "rowsCreated": batch.rows_created,
            "rowsMatched": batch.rows_matched, "rowsRejected": batch.rows_rejected, "errors": batch.errors,
            "createdAt": batch.created_at}


@router.get("/ops/medicine-info/imports")
def list_imports(user=Depends(require_importer), db: Session = Depends(commerce_db)):
    rows = db.scalars(select(M.MedicineInfoImport).order_by(M.MedicineInfoImport.created_at.desc()).limit(HISTORY_MAX))
    return {"items": [_import_payload(r) for r in rows], "columns": list(IMPORT_COLUMNS)}
