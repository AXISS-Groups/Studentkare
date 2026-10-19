"""Medicine master and same-salt substitutes (commerce plane, Rule L).

Admin (SUPER_ADMIN, the same gate as /ops/catalog) maintains one master row per
marketed medicine with its salt composition, form and schedule, and links
catalogue listings to it. ``GET /api/catalog/{item_id}/substitutes`` then lists
other in-stock listings whose master has exactly the same composition and form.

Every route here runs on ``commerce_db``: products and prices only, never a
prescription or a person. A substitute for a schedule H/H1/X medicine is shown
as needing the prescriber's or pharmacist's approval; the swap itself happens
in the existing dispense substitution flow (/api/dispenses/{id}/substitutions),
which this module does not touch.
"""
from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, field_validator
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.medicine_master import (
    FORMS,
    MAX_INGREDIENTS,
    SCHEDULE_CLASSES,
    canonical_strength,
    composition_key,
    needs_prescriber_approval,
    normalise_unit,
    salt_key,
    validate_salt,
)
from services.commerce_session import commerce_db
from services.workflow_auth import StrictModel, require_super_admin

router = APIRouter(prefix="/api", tags=["Medicine master"])

SUBSTITUTE_LIMIT = 20
APPROVAL_POLICY = "PRESCRIBER_OR_PHARMACIST_APPROVAL"
SELF_SELECT_POLICY = "SELF_SELECT"


def _new_id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


# --- input ---------------------------------------------------------------------


class IngredientInput(StrictModel):
    salt: str = Field(min_length=2, max_length=120)
    strength: str = Field(min_length=1, max_length=12)
    unit: str = Field(min_length=1, max_length=16)

    @field_validator("salt")
    @classmethod
    def known_salt(cls, value: str) -> str:
        return validate_salt(value)

    @field_validator("unit")
    @classmethod
    def known_unit(cls, value: str) -> str:
        return normalise_unit(value)

    @field_validator("strength")
    @classmethod
    def exact_strength(cls, value: str) -> str:
        canonical_strength(value, "mg")   # validates the number; the unit is checked on its own
        return value


def _key_of(ingredients: list[IngredientInput]) -> str:
    return composition_key([(salt_key(i.salt), *canonical_strength(i.strength, i.unit)) for i in ingredients])


def _check_composition(ingredients: list[IngredientInput]) -> list[IngredientInput]:
    _key_of(ingredients)
    return ingredients


def _known_form(value: str) -> str:
    form = value.strip().upper()
    if form not in FORMS:
        raise ValueError(f"Unknown dosage form. Use one of: {', '.join(FORMS)}.")
    return form


def _known_schedule(value: str) -> str:
    schedule = value.strip().upper()
    if schedule not in SCHEDULE_CLASSES:
        raise ValueError(f"Schedule class must be one of: {', '.join(SCHEDULE_CLASSES)}.")
    return schedule


class MedicineInput(StrictModel):
    brandName: str = Field(min_length=2, max_length=160)
    manufacturer: str = Field(min_length=2, max_length=160)
    form: str = Field(min_length=3, max_length=24)
    pack: str = Field(min_length=1, max_length=160)
    scheduleClass: str = Field(min_length=1, max_length=4)
    ingredients: list[IngredientInput] = Field(min_length=1, max_length=MAX_INGREDIENTS)

    @field_validator("form")
    @classmethod
    def known_form(cls, value: str) -> str:
        return _known_form(value)

    @field_validator("scheduleClass")
    @classmethod
    def known_schedule(cls, value: str) -> str:
        return _known_schedule(value)

    @field_validator("ingredients")
    @classmethod
    def exact_composition(cls, value: list[IngredientInput]) -> list[IngredientInput]:
        return _check_composition(value)


class MedicineUpdate(StrictModel):
    brandName: str | None = Field(default=None, min_length=2, max_length=160)
    manufacturer: str | None = Field(default=None, min_length=2, max_length=160)
    form: str | None = Field(default=None, min_length=3, max_length=24)
    pack: str | None = Field(default=None, min_length=1, max_length=160)
    scheduleClass: str | None = Field(default=None, min_length=1, max_length=4)
    ingredients: list[IngredientInput] | None = Field(default=None, min_length=1, max_length=MAX_INGREDIENTS)
    active: bool | None = None

    @field_validator("form")
    @classmethod
    def known_form(cls, value: str | None) -> str | None:
        return None if value is None else _known_form(value)

    @field_validator("scheduleClass")
    @classmethod
    def known_schedule(cls, value: str | None) -> str | None:
        return None if value is None else _known_schedule(value)

    @field_validator("ingredients")
    @classmethod
    def exact_composition(cls, value: list[IngredientInput] | None) -> list[IngredientInput] | None:
        return None if value is None else _check_composition(value)


class CatalogMedicineLink(StrictModel):
    medicineId: str | None = Field(default=None, min_length=1, max_length=64)


# --- payloads ------------------------------------------------------------------


def _ingredients(db: Session, medicine_id: str) -> list[M.MedicineIngredient]:
    return list(db.scalars(select(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id == medicine_id)
                           .order_by(M.MedicineIngredient.position)).all())


def _composition_payload(rows: list[M.MedicineIngredient]) -> list[dict]:
    return [{"salt": r.salt_name, "strength": r.strength_value, "unit": r.strength_unit} for r in rows]


def _summary(medicine: M.Medicine) -> dict:
    return {"id": medicine.id, "brandName": medicine.brand_name, "manufacturer": medicine.manufacturer,
            "form": medicine.form, "pack": medicine.pack, "scheduleClass": medicine.schedule_class,
            "active": medicine.active}


def medicine_payload(db: Session, medicine: M.Medicine) -> dict:
    return {**_summary(medicine), "composition": _composition_payload(_ingredients(db, medicine.id)),
            "requiresPrescriberApproval": needs_prescriber_approval(medicine.schedule_class),
            "createdAt": medicine.created_at, "updatedAt": medicine.updated_at}


def _write_ingredients(db: Session, medicine_id: str, ingredients: list[IngredientInput]) -> str:
    rows = []
    for position, item in enumerate(ingredients):
        value, unit = canonical_strength(item.strength, item.unit)
        rows.append(M.MedicineIngredient(
            id=_new_id(), medicine_id=medicine_id, position=position, salt_name=item.salt, salt_key=salt_key(item.salt),
            strength_value=item.strength, strength_unit=item.unit, canonical_value=value, canonical_unit=unit))
    db.add_all(rows)
    return composition_key([(r.salt_key, r.canonical_value, r.canonical_unit) for r in rows])


def _tighten_linked_listings(db: Session, medicine: M.Medicine) -> None:
    """A prescription-schedule master makes its listings prescription-only. Never loosens."""
    if needs_prescriber_approval(medicine.schedule_class):
        db.execute(update(M.CatalogEntry).where(M.CatalogEntry.medicine_id == medicine.id)
                   .values(requires_prescription=True))


def _duplicate(db: Session, *, brand: str, manufacturer: str, form: str, pack: str, key: str,
               exclude: str | None = None) -> bool:
    stmt = select(M.Medicine.id).where(
        func.lower(M.Medicine.brand_name) == brand.lower(), func.lower(M.Medicine.manufacturer) == manufacturer.lower(),
        M.Medicine.form == form, func.lower(M.Medicine.pack) == pack.lower(), M.Medicine.composition_key == key)
    if exclude:
        stmt = stmt.where(M.Medicine.id != exclude)
    return db.scalar(stmt.limit(1)) is not None


# --- admin ---------------------------------------------------------------------


@router.get("/ops/medicines")
def list_medicines(query: str = Query("", max_length=120), limit: int = Query(20, ge=1, le=100),
                   offset: int = Query(0, ge=0), user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    stmt = select(M.Medicine)
    if query.strip():
        q = query.strip()
        salt_match = select(M.MedicineIngredient.medicine_id).where(
            M.MedicineIngredient.salt_key.icontains(salt_key(q), autoescape=True))
        stmt = stmt.where(or_(M.Medicine.brand_name.icontains(q, autoescape=True),
                              M.Medicine.manufacturer.icontains(q, autoescape=True),
                              M.Medicine.id.in_(salt_match)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(M.Medicine.brand_name, M.Medicine.id).offset(offset).limit(limit)).all()
    return {"items": [medicine_payload(db, row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/ops/medicines/{medicine_id}")
def get_medicine(medicine_id: str, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    medicine = db.get(M.Medicine, medicine_id)
    if not medicine:
        raise HTTPException(404, "Medicine not found.")
    return medicine_payload(db, medicine)


@router.post("/ops/medicines", status_code=201)
def create_medicine(body: MedicineInput, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    key = _key_of(body.ingredients)
    if _duplicate(db, brand=body.brandName, manufacturer=body.manufacturer, form=body.form, pack=body.pack, key=key):
        raise HTTPException(409, "This medicine (brand, manufacturer, form, pack and composition) already exists.")
    now = time.time()
    medicine = M.Medicine(id=_new_id(), brand_name=body.brandName, manufacturer=body.manufacturer, form=body.form,
                          pack=body.pack, schedule_class=body.scheduleClass, composition_key=key, active=True,
                          created_at=now, updated_at=now)
    db.add(medicine)
    db.flush()
    _write_ingredients(db, medicine.id, body.ingredients)
    _audit(db, user, "MEDICINE_CREATED", medicine.id)
    db.commit()
    return medicine_payload(db, medicine)


@router.patch("/ops/medicines/{medicine_id}")
def update_medicine(medicine_id: str, body: MedicineUpdate, user=Depends(require_super_admin),
                    db: Session = Depends(commerce_db)):
    medicine = db.get(M.Medicine, medicine_id)
    if not medicine:
        raise HTTPException(404, "Medicine not found.")
    for attr, value in (("brand_name", body.brandName), ("manufacturer", body.manufacturer), ("form", body.form),
                        ("pack", body.pack), ("schedule_class", body.scheduleClass), ("active", body.active)):
        if value is not None:
            setattr(medicine, attr, value)
    if body.ingredients is not None:
        db.execute(delete(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id == medicine.id))
        medicine.composition_key = _write_ingredients(db, medicine.id, body.ingredients)
    db.flush()
    if _duplicate(db, brand=medicine.brand_name, manufacturer=medicine.manufacturer, form=medicine.form,
                  pack=medicine.pack, key=medicine.composition_key, exclude=medicine.id):
        db.rollback()
        raise HTTPException(409, "Another medicine already has this brand, manufacturer, form, pack and composition.")
    medicine.updated_at = time.time()
    _tighten_linked_listings(db, medicine)
    _audit(db, user, "MEDICINE_UPDATED", medicine.id)
    db.commit()
    return medicine_payload(db, medicine)


@router.put("/ops/catalog/{item_id}/medicine")
def link_catalog_medicine(item_id: str, body: CatalogMedicineLink, user=Depends(require_super_admin),
                          db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found.")
    if body.medicineId is None:
        item.medicine_id = None   # requires_prescription is left as it was: unlinking never loosens it
        _audit(db, user, "CATALOG_MEDICINE_UNLINKED", item.id)
        db.commit()
        return {"success": True, "itemId": item.id, "medicine": None, "requiresPrescription": item.requires_prescription}
    if item.kind != "product":
        raise HTTPException(422, "Only product listings can be linked to a medicine.")
    medicine = db.get(M.Medicine, body.medicineId)
    if not medicine:
        raise HTTPException(404, "Medicine not found.")
    if not medicine.active:
        raise HTTPException(422, "This medicine is inactive. Reactivate it before linking listings to it.")
    item.medicine_id = medicine.id
    if needs_prescriber_approval(medicine.schedule_class):
        item.requires_prescription = True
    _audit(db, user, "CATALOG_MEDICINE_LINKED", item.id)
    db.commit()
    return {"success": True, "itemId": item.id, "medicine": _summary(medicine),
            "requiresPrescription": item.requires_prescription}


# --- public: same-salt substitutes --------------------------------------------


def _listing(item: M.CatalogEntry) -> dict:
    image_url = f"/api/catalog/{item.id}/image" if item.image_id else None
    return {"id": item.id, "providerId": item.provider_id, "name": item.name, "brand": item.brand, "pack": item.pack,
            "pricePaise": item.price_paise, "mrpPaise": item.mrp_paise, "stock": item.stock,
            "requiresPrescription": item.requires_prescription, "imageUrl": image_url}


@router.get("/catalog/{item_id}/substitutes")
def catalog_substitutes(item_id: str, db: Session = Depends(commerce_db)):
    """Other in-stock listings with exactly the same salts, strengths and form, cheapest first.

    For a prescription item (schedule H/H1/X, or a listing marked
    prescription-only) every substitute is marked as needing the prescriber's or
    pharmacist's approval: it is information, not a swap the student can make.
    """
    base = db.execute(
        select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id)
        .where(M.CatalogEntry.id == item_id, M.CatalogEntry.active.is_(True), M.Account.active.is_(True))
    ).scalar_one_or_none()
    if base is None:
        raise HTTPException(404, "Catalog item not found.")
    empty = {"itemId": base.id, "medicine": None, "composition": [], "items": [], "total": 0}
    if base.kind != "product" or not base.medicine_id:
        return {**empty, "status": "NOT_LINKED", "substitutionPolicy": None}
    medicine = db.get(M.Medicine, base.medicine_id)
    if medicine is None or not medicine.active:
        return {**empty, "status": "MEDICINE_INACTIVE", "substitutionPolicy": None}

    base_needs_approval = base.requires_prescription or needs_prescriber_approval(medicine.schedule_class)
    rows = db.execute(
        select(M.CatalogEntry, M.Medicine)
        .join(M.Medicine, M.Medicine.id == M.CatalogEntry.medicine_id)
        .join(M.Account, M.Account.id == M.CatalogEntry.provider_id)
        .where(M.Medicine.composition_key == medicine.composition_key, M.Medicine.form == medicine.form,
               M.Medicine.active.is_(True), M.CatalogEntry.id != base.id, M.CatalogEntry.kind == "product",
               M.CatalogEntry.active.is_(True), M.CatalogEntry.stock > 0, M.Account.active.is_(True))
        .order_by(M.CatalogEntry.price_paise, M.CatalogEntry.id)
        .limit(SUBSTITUTE_LIMIT)
    ).all()
    items = []
    for entry, master in rows:
        cheaper = entry.price_paise < base.price_paise
        items.append({
            **_listing(entry),
            "medicine": _summary(master),
            "sameProduct": master.id == medicine.id,
            "cheaper": cheaper,
            "savingsPaise": base.price_paise - entry.price_paise if cheaper else 0,
            "requiresPrescriberApproval": (base_needs_approval or entry.requires_prescription
                                           or needs_prescriber_approval(master.schedule_class)),
        })
    return {
        "itemId": base.id,
        "status": "OK",
        "medicine": _summary(medicine),
        "composition": _composition_payload(_ingredients(db, medicine.id)),
        "pricePaise": base.price_paise,
        "substitutionPolicy": APPROVAL_POLICY if base_needs_approval else SELF_SELECT_POLICY,
        "items": items,
        "total": len(items),
    }


# Every route above runs on commerce_db (tests/test_medicine_master.py checks it).
MEDICINE_COMMERCE_PATHS = (
    "GET /api/ops/medicines", "GET /api/ops/medicines/{medicine_id}", "POST /api/ops/medicines",
    "PATCH /api/ops/medicines/{medicine_id}", "PUT /api/ops/catalog/{item_id}/medicine",
    "GET /api/catalog/{item_id}/substitutes",
)
