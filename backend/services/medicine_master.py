"""Medicine master: composition, dosage form and schedule, and same-composition alternatives.

A shop listing (care_catalog, kind "product") can point at one master record
(care_medicines). The record says what is in the medicine (one or more salts
with strengths), its dosage form, pack, manufacturer and Indian drug schedule.
``requires_prescription`` is derived from the schedule (anything but OTC needs a
prescription) and is never set on its own.

Alternatives are listings whose medicine has the same salts at the same
strengths in the same dosage form, cheapest first. They are information only:

* For an OTC listing, anyone browsing the shop may see OTC alternatives.
* For a prescription-schedule listing the shop returns none, to anyone.
  Substituting a prescribed medicine is the prescriber's decision (the
  substitution flow in services/clinical_api.py). Pharmacists and prescribers
  get them on ``/work/catalog/{id}/alternatives``.

Everything here is product reference data, never a person's health, so the
endpoints run as sk_commerce (Rule L, core/rule_l.py).
"""
from __future__ import annotations

import re
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, field_validator, model_validator
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.medicine_composition import (
    SCHEDULES,
    composition_key,
    requires_prescription_for,
    salt_key,
    strength_label,
)
from services import ops_feed
from services.commerce_session import commerce_db
from services.workflow_auth import StrictModel, authenticated_user, require_super_admin

router = APIRouter(prefix="/api", tags=["Medicine master"])

__all__ = ["SCHEDULES", "composition_key", "requires_prescription_for", "salt_key", "router"]

DOSAGE_FORMS = (
    "TABLET", "CAPSULE", "SYRUP", "SUSPENSION", "DROPS", "CREAM", "OINTMENT", "GEL", "LOTION",
    "SOLUTION", "SPRAY", "INHALER", "INJECTION", "SACHET", "LOZENGE", "POWDER",
)
STRENGTH_UNITS = ("mg", "mcg", "g", "IU", "%", "% w/w", "% w/v", "mg/ml", "mg/5ml", "mcg/dose")
Schedule = Literal["OTC", "H", "H1", "X"]
DosageForm = Literal[
    "TABLET", "CAPSULE", "SYRUP", "SUSPENSION", "DROPS", "CREAM", "OINTMENT", "GEL", "LOTION",
    "SOLUTION", "SPRAY", "INHALER", "INJECTION", "SACHET", "LOZENGE", "POWDER",
]
StrengthUnit = Literal["mg", "mcg", "g", "IU", "%", "% w/w", "% w/v", "mg/ml", "mg/5ml", "mcg/dose"]

ALTERNATIVES_LIMIT = 20
SALT_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9 ,()'./+-]*$")

# Routes here that run as sk_commerce (listed in /ops/rule-l beside workflow_api's).
MEDICINE_COMMERCE_PATHS = (
    "GET /api/catalog/{item_id}/alternatives", "GET /api/work/catalog/{item_id}/alternatives",
    "GET /api/ops/medicines", "POST /api/ops/medicines", "PATCH /api/ops/medicines/{medicine_id}",
    "PUT /api/ops/catalog/{item_id}/medicine",
)


def composition_label(rows: list[M.MedicineIngredient]) -> str:
    return " + ".join(f"{row.salt} {strength_label(row.strength_value, row.strength_unit)}"
                      for row in sorted(rows, key=lambda r: r.position))


def ingredients_by_medicine(db: Session, medicine_ids: set[str]) -> dict[str, list[M.MedicineIngredient]]:
    if not medicine_ids:
        return {}
    grouped: dict[str, list[M.MedicineIngredient]] = {}
    rows = db.scalars(select(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id.in_(medicine_ids))
                      .order_by(M.MedicineIngredient.medicine_id, M.MedicineIngredient.position)).all()
    for row in rows:
        grouped.setdefault(row.medicine_id, []).append(row)
    return grouped


def medicine_payload(medicine: M.Medicine, ingredients: list[M.MedicineIngredient]) -> dict:
    return {
        "id": medicine.id, "name": medicine.name, "dosageForm": medicine.dosage_form, "pack": medicine.pack,
        "manufacturer": medicine.manufacturer, "schedule": medicine.schedule,
        "requiresPrescription": medicine.requires_prescription, "active": medicine.active,
        "source": medicine.source, "composition": composition_label(ingredients),
        "ingredients": [{"salt": i.salt, "strengthValue": i.strength_value, "strengthUnit": i.strength_unit}
                        for i in sorted(ingredients, key=lambda r: r.position)],
    }


def compositions_for(db: Session, items: list[M.CatalogEntry]) -> dict[str, str]:
    """Listing id -> composition label, for listings linked to an active medicine."""
    medicine_ids = {item.medicine_id for item in items if item.medicine_id}
    if not medicine_ids:
        return {}
    active = set(db.scalars(select(M.Medicine.id).where(M.Medicine.id.in_(medicine_ids),
                                                       M.Medicine.active.is_(True))).all())
    grouped = ingredients_by_medicine(db, active)
    return {item.id: composition_label(grouped[item.medicine_id])
            for item in items if item.medicine_id in active and grouped.get(item.medicine_id)}


# The six identity fields a pharmacist reviews before an imported medicine reaches
# any lookup (services/medicine_info.py; plan tier1-medicine-info-2026-10-22, D-MI-4).
IDENTITY_FIELD_COUNT = 6


def published_medicine_clause():
    """Active, and not an imported medicine whose identity no pharmacist has reviewed yet.

    A SQL pre-filter only: services/medicine_info.py re-checks each review
    against the current value before showing anything.
    """
    reviewed_imports = (select(M.MedicineInfoField.medicine_id)
                        .where(M.MedicineInfoField.field.in_(("brand", "composition", "form", "pack", "manufacturer",
                                                               "schedule")),
                               M.MedicineInfoField.state == "REVIEWED")
                        .group_by(M.MedicineInfoField.medicine_id)
                        .having(func.count() == IDENTITY_FIELD_COUNT))
    return M.Medicine.active.is_(True) & or_(M.Medicine.source != "IMPORT", M.Medicine.id.in_(reviewed_imports))


def salt_match(query: str):
    """A catalogue filter: the listing's medicine contains a salt matching ``query``."""
    return M.CatalogEntry.medicine_id.in_(
        select(M.MedicineIngredient.medicine_id).where(M.MedicineIngredient.salt.icontains(query, autoescape=True)))


def lookup_medicine(db: Session, query: str) -> dict:
    """Find a medicine in the master by name or salt. Text only.

    No match is an honest empty result, never a stand-in medicine. Only facts
    held in the master are returned: there is no monograph, indication or
    price here, so none is made up.
    """
    terms = [t for t in query.lower().replace("_", " ").replace(".", " ").split() if len(t) > 2]
    if not terms:
        return {"status": "NO_MATCH", "query": query}
    clauses = []
    for term in terms:
        clauses.append(M.Medicine.name.icontains(term, autoescape=True))
        clauses.append(M.Medicine.id.in_(select(M.MedicineIngredient.medicine_id)
                                         .where(M.MedicineIngredient.salt.icontains(term, autoescape=True))))
    medicine = db.scalars(select(M.Medicine).where(published_medicine_clause(), or_(*clauses))
                          .order_by(M.Medicine.name, M.Medicine.id).limit(1)).first()
    if medicine is None:
        return {"status": "NO_MATCH", "query": query}
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    return {
        "status": "SUCCESS", "medicine": medicine.name, "activeMolecule": composition_label(ingredients),
        "dosageForm": medicine.dosage_form, "pack": medicine.pack, "manufacturer": medicine.manufacturer,
        "schedule": medicine.schedule, "prescriptionRequired": medicine.requires_prescription,
    }


# --- alternatives -----------------------------------------------------------

def _listed_item(db: Session, item_id: str) -> M.CatalogEntry:
    item = db.scalar(select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id).where(
        M.CatalogEntry.id == item_id, M.CatalogEntry.active.is_(True), M.Account.active.is_(True)))
    if item is None:
        raise HTTPException(404, "Catalog item not found.")
    return item


def _alternative_payload(item: M.CatalogEntry, medicine: M.Medicine, composition: str) -> dict:
    image_url = f"/api/catalog/{item.id}/image" if item.image_id else None
    return {"id": item.id, "name": item.name, "brand": item.brand, "pack": item.pack,
            "pricePaise": item.price_paise, "mrpPaise": item.mrp_paise, "stock": item.stock,
            "imageUrl": image_url, "manufacturer": medicine.manufacturer, "dosageForm": medicine.dosage_form,
            "composition": composition, "schedule": medicine.schedule,
            "requiresPrescription": item.requires_prescription or medicine.requires_prescription}


def _alternatives(db: Session, item: M.CatalogEntry, medicine: M.Medicine, composition: str,
                  include_prescription: bool) -> list[dict]:
    statement = (
        select(M.CatalogEntry, M.Medicine)
        .join(M.Medicine, M.Medicine.id == M.CatalogEntry.medicine_id)
        .join(M.Account, M.Account.id == M.CatalogEntry.provider_id)
        .where(M.Medicine.composition_key == medicine.composition_key,
               M.Medicine.dosage_form == medicine.dosage_form,
               M.Medicine.active.is_(True), M.CatalogEntry.active.is_(True), M.Account.active.is_(True),
               M.CatalogEntry.kind == "product", M.CatalogEntry.id != item.id)
    )
    if not include_prescription:
        # An OTC listing never leads a student to a prescription-only one, even
        # if the two records disagree about the schedule.
        statement = statement.where(M.Medicine.requires_prescription.is_(False),
                                    M.CatalogEntry.requires_prescription.is_(False))
    rows = db.execute(statement.order_by(M.CatalogEntry.price_paise, M.CatalogEntry.name, M.CatalogEntry.id)
                      .limit(ALTERNATIVES_LIMIT)).all()
    return [_alternative_payload(row_item, row_medicine, composition) for row_item, row_medicine in rows]


def _linked_medicine(db: Session, item: M.CatalogEntry) -> tuple[M.Medicine | None, str]:
    if not item.medicine_id:
        return None, ""
    medicine = db.get(M.Medicine, item.medicine_id)
    if medicine is None or not medicine.active:
        return None, ""
    ingredients = ingredients_by_medicine(db, {medicine.id}).get(medicine.id, [])
    return medicine, composition_label(ingredients)


@router.get("/catalog/{item_id}/alternatives")
def catalog_alternatives(item_id: str, db: Session = Depends(commerce_db)):
    """Same salts, same strengths, same form, cheapest first. OTC listings only.

    Public, like /catalog. A prescription-schedule listing returns no
    alternatives at all: substitution is the prescriber's decision.
    """
    item = _listed_item(db, item_id)
    medicine, composition = _linked_medicine(db, item)
    if medicine is None:
        return {"itemId": item.id, "composition": None, "dosageForm": None, "restricted": False, "items": []}
    if item.requires_prescription or medicine.requires_prescription:
        return {"itemId": item.id, "composition": composition, "dosageForm": medicine.dosage_form,
                "restricted": True, "items": [],
                "message": "This medicine needs a prescription. Only your prescriber can change it to another brand."}
    return {"itemId": item.id, "composition": composition, "dosageForm": medicine.dosage_form, "restricted": False,
            "items": _alternatives(db, item, medicine, composition, include_prescription=False)}


def require_dispenser_or_prescriber(user: dict = Depends(authenticated_user)) -> dict:
    """A prescriber, or a partner whose assigned kind is pharmacy. No admin bypass."""
    if user.get("role") == "NMC_DOCTOR":
        return user
    if user.get("role") == "VENDOR" and user.get("partnerKind") == "PHARMACY":
        return user
    raise HTTPException(403, "Alternatives for prescription medicines are limited to pharmacists and prescribers.")


@router.get("/work/catalog/{item_id}/alternatives")
def work_catalog_alternatives(item_id: str, user=Depends(require_dispenser_or_prescriber),
                              db: Session = Depends(commerce_db)):
    """Every same-composition listing, prescription-schedule ones included, with each schedule.

    Information for the pharmacist and the prescriber. It changes nothing: a
    substitution on a prescription still goes through the prescriber.
    """
    item = _listed_item(db, item_id)
    medicine, composition = _linked_medicine(db, item)
    if medicine is None:
        return {"itemId": item.id, "composition": None, "dosageForm": None, "schedule": None, "items": []}
    return {"itemId": item.id, "composition": composition, "dosageForm": medicine.dosage_form,
            "schedule": medicine.schedule,
            "items": _alternatives(db, item, medicine, composition, include_prescription=True)}


# --- super admin: master records and links ---------------------------------

class IngredientInput(StrictModel):
    salt: str = Field(min_length=2, max_length=80)
    strengthValue: float = Field(gt=0, le=100000, allow_inf_nan=False)
    strengthUnit: StrengthUnit

    @field_validator("salt")
    @classmethod
    def clean_salt(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2 or not SALT_PATTERN.match(value):
            raise ValueError("Enter the salt name in letters, for example Paracetamol.")
        return value


def _unique_salts(ingredients: list[IngredientInput]) -> list[IngredientInput]:
    keys = [salt_key(i.salt) for i in ingredients]
    if len(set(keys)) != len(keys):
        raise ValueError("List each salt once.")
    return ingredients


class MedicineInput(StrictModel):
    name: str = Field(min_length=2, max_length=160)
    ingredients: list[IngredientInput] = Field(min_length=1, max_length=8)
    dosageForm: DosageForm
    pack: str = Field(min_length=1, max_length=120)
    manufacturer: str = Field(min_length=2, max_length=120)
    schedule: Schedule
    active: bool = True

    @field_validator("ingredients")
    @classmethod
    def unique_salts(cls, value: list[IngredientInput]) -> list[IngredientInput]:
        return _unique_salts(value)


class MedicineUpdate(StrictModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    ingredients: list[IngredientInput] | None = Field(default=None, min_length=1, max_length=8)
    dosageForm: DosageForm | None = None
    pack: str | None = Field(default=None, min_length=1, max_length=120)
    manufacturer: str | None = Field(default=None, min_length=2, max_length=120)
    schedule: Schedule | None = None
    active: bool | None = None

    @field_validator("ingredients")
    @classmethod
    def unique_salts(cls, value: list[IngredientInput] | None) -> list[IngredientInput] | None:
        return None if value is None else _unique_salts(value)

    @model_validator(mode="after")
    def something_to_change(self):
        if not self.model_fields_set:
            raise ValueError("Send at least one field to change.")
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be empty.")
        return self


def _new_id() -> str:
    return str(uuid.uuid4())


def _audit(db: Session, user: dict, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_new_id(), actor_id=user["id"], action=action, resource_id=resource_id,
                           created_at=time.time()))


def _write_ingredients(db: Session, medicine_id: str, ingredients: list[IngredientInput]) -> None:
    for position, ingredient in enumerate(ingredients):
        db.add(M.MedicineIngredient(id=_new_id(), medicine_id=medicine_id, position=position, salt=ingredient.salt,
                                    salt_key=salt_key(ingredient.salt), strength_value=ingredient.strengthValue,
                                    strength_unit=ingredient.strengthUnit))


def _key_of(ingredients: list[IngredientInput]) -> str:
    return composition_key([(i.salt, i.strengthValue, i.strengthUnit) for i in ingredients])


def _raise_linked_listings(db: Session, medicine: M.Medicine) -> None:
    """A prescription schedule reaches every listing of the medicine.

    Only ever raised, never lowered: a listing marked prescription-only stays
    so until someone deliberately changes it (fail closed).
    """
    if medicine.requires_prescription:
        db.execute(update(M.CatalogEntry).where(M.CatalogEntry.medicine_id == medicine.id)
                   .values(requires_prescription=True))


def _payload_of(db: Session, medicine: M.Medicine) -> dict:
    return medicine_payload(medicine, ingredients_by_medicine(db, {medicine.id}).get(medicine.id, []))


@router.get("/ops/medicines")
def list_medicines(query: str = Query("", max_length=120), offset: int = Query(0, ge=0),
                   limit: int = Query(50, ge=1, le=200), user=Depends(require_super_admin),
                   db: Session = Depends(commerce_db)):
    statement = select(M.Medicine)
    if query.strip():
        q = query.strip()
        statement = statement.where(or_(
            M.Medicine.name.icontains(q, autoescape=True), M.Medicine.manufacturer.icontains(q, autoescape=True),
            M.Medicine.id.in_(select(M.MedicineIngredient.medicine_id)
                              .where(M.MedicineIngredient.salt.icontains(q, autoescape=True)))))
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.Medicine.name, M.Medicine.id).offset(offset).limit(limit)).all()
    grouped = ingredients_by_medicine(db, {row.id for row in rows})
    return {"items": [medicine_payload(row, grouped.get(row.id, [])) for row in rows], "total": total,
            "offset": offset, "limit": limit}


@router.post("/ops/medicines", status_code=201)
def create_medicine(body: MedicineInput, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    now = time.time()
    medicine = M.Medicine(id=_new_id(), name=body.name.strip(), composition_key=_key_of(body.ingredients),
                          dosage_form=body.dosageForm, pack=body.pack.strip(), manufacturer=body.manufacturer.strip(),
                          schedule=body.schedule, requires_prescription=requires_prescription_for(body.schedule),
                          active=body.active, source="ADMIN", created_at=now, updated_at=now)
    db.add(medicine)
    db.flush()
    _write_ingredients(db, medicine.id, body.ingredients)
    _audit(db, user, "MEDICINE_CREATED", medicine.id)
    ops_feed.publish(db, "MEDICINE_CREATED", "MARKETPLACE", summary=f"Medicine record added · {body.schedule}",
                     actor_id=user["id"], actor_role=user.get("role", ""), resource_type="medicine",
                     resource_id=medicine.id)
    db.commit()
    return _payload_of(db, medicine)


@router.patch("/ops/medicines/{medicine_id}")
def update_medicine(medicine_id: str, body: MedicineUpdate, user=Depends(require_super_admin),
                    db: Session = Depends(commerce_db)):
    medicine = db.get(M.Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(404, "Medicine not found.")
    if body.name is not None:
        medicine.name = body.name.strip()
    if body.dosageForm is not None:
        medicine.dosage_form = body.dosageForm
    if body.pack is not None:
        medicine.pack = body.pack.strip()
    if body.manufacturer is not None:
        medicine.manufacturer = body.manufacturer.strip()
    if body.active is not None:
        medicine.active = body.active
    if body.schedule is not None:
        medicine.schedule = body.schedule
        medicine.requires_prescription = requires_prescription_for(body.schedule)
    if body.ingredients is not None:
        db.execute(delete(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id == medicine.id))
        db.flush()
        _write_ingredients(db, medicine.id, body.ingredients)
        medicine.composition_key = _key_of(body.ingredients)
    medicine.updated_at = time.time()
    db.flush()
    _raise_linked_listings(db, medicine)
    _audit(db, user, "MEDICINE_UPDATED", medicine.id)
    db.commit()
    return _payload_of(db, medicine)


class CatalogMedicineLink(StrictModel):
    medicineId: str | None = Field(default=..., max_length=80)


@router.put("/ops/catalog/{item_id}/medicine")
def link_catalog_medicine(item_id: str, body: CatalogMedicineLink, user=Depends(require_super_admin),
                          db: Session = Depends(commerce_db)):
    """Link a product listing to its master record (or unlink with null).

    Linking to a prescription-schedule medicine marks the listing
    prescription-only. Linking never clears that mark.
    """
    item = db.get(M.CatalogEntry, item_id)
    if item is None:
        raise HTTPException(404, "Catalog item not found.")
    if body.medicineId is None:
        item.medicine_id = None
        _audit(db, user, "CATALOG_MEDICINE_UNLINKED", item.id)
        db.commit()
        return {"itemId": item.id, "medicineId": None, "requiresPrescription": item.requires_prescription}
    if item.kind != "product":
        raise HTTPException(422, "Only product listings can be linked to a medicine.")
    medicine = db.get(M.Medicine, body.medicineId)
    if medicine is None or not medicine.active:
        raise HTTPException(422, "Select an active medicine record.")
    item.medicine_id = medicine.id
    item.requires_prescription = item.requires_prescription or medicine.requires_prescription
    _audit(db, user, "CATALOG_MEDICINE_LINKED", item.id)
    db.commit()
    return {"itemId": item.id, "medicineId": medicine.id, "requiresPrescription": item.requires_prescription}
