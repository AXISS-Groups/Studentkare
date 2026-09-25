"""
services.clinical_api — crisis follow-up, prescribing, dispensing and lab fulfilment.

Endpoint groups:
  /care/crisis-signal, /ops/crisis-events      crisis-gate activations and follow-up
  /providers/nearby                            pharmacies and labs a student can reach
  /prescriptions, /work/prescriptions          issuing and reading prescriptions
  /dispenses, /work/dispenses                  pharmacy fulfilment
  /lab-orders, /work/lab-orders                diagnostic fulfilment

Every state change goes through ``clinical_fulfilment`` so there is no route that can
skip pharmacist verification or release a report without an analysis step.
"""
from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import clinical_fulfilment as F
from services import activity_telemetry, agent_ayush, ops_feed, vector_store
from services.workflow_auth import (
    authenticated_user,
    require_staff,
    require_super_admin,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Clinical fulfilment"])

CRISIS_KINDS = {"CRISIS_SELF_HARM", "CRISIS_MEDICAL", "CRISIS_OVERDOSE", "ERROR_FAIL_CLOSED"}
SCHEDULE_CLASSES = {"OTC", "H", "H1", "X"}
PROVIDER_KINDS = {"PHARMACY", "LAB", "CLINIC"}
# Schedule H1 dispensing must stay on a retained register; X is tighter still.
REGISTER_CLASSES = {"H1", "X"}


class StrictModel(BaseModel):
    model_config = {"extra": "forbid"}


def new_id() -> str:
    return uuid.uuid4().hex


def _owns_pharmacy(db: Session, user: dict, provider_id: str) -> bool:
    """True when this account owns the provider, or is the platform admin."""
    if user.get("role") == "SUPER_ADMIN":
        return True
    return bool(db.scalar(select(M.ServiceProvider.id).where(
        M.ServiceProvider.id == provider_id, M.ServiceProvider.account_id == user["id"])))


def audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=new_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=time.time()))


# ══════════════════════════════════════════════════════════════════════════════
# Crisis events
# ══════════════════════════════════════════════════════════════════════════════

def record_crisis_event(db: Session, account_id: str, kind: str, language: str = "",
                        surface: str = "care_navigator", detected_by: str = "SERVER") -> M.CrisisEvent:
    """Persist a crisis-gate activation so a counsellor can follow up.

    The query text is never passed in and never stored. Recording is best-effort by
    design: a failure here must not stop the student seeing their support contacts,
    which is why callers wrap this and swallow, never the other way round.
    """
    event = M.CrisisEvent(
        id=new_id(), account_id=account_id, kind=kind, language=language or "",
        surface=surface, detected_by=detected_by, created_at=time.time(), outcome="PENDING",
    )
    db.add(event)
    ops_feed.publish(
        db, "CRISIS_GATE_TRIGGERED", "SAFETY", severity="CRITICAL",
        summary=f"Crisis gate fired ({kind}) — student needs follow-up",
        actor_id=account_id, subject_id=account_id,
        resource_type="crisis_event", resource_id=event.id,
    )
    audit(db, account_id, "CRISIS_GATE_TRIGGERED", event.id)
    return event


class CrisisSignal(StrictModel):
    """Reported by the client gate. Carries no free text — the kind is the whole payload."""
    kind: str = Field(max_length=24)
    surface: str = Field(default="care_navigator", max_length=40)

    @field_validator("kind")
    @classmethod
    def known_kind(cls, value: str) -> str:
        if value not in CRISIS_KINDS:
            raise ValueError("Unknown crisis kind.")
        return value


@router.post("/care/crisis-signal", status_code=201)
def crisis_signal(body: CrisisSignal, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Record a crisis the client detected locally, without transmitting the message."""
    event = record_crisis_event(db, user["id"], body.kind, surface=body.surface, detected_by="CLIENT")
    db.commit()
    return {"id": event.id, "recorded": True}


def crisis_payload(row: M.CrisisEvent, account: M.Account | None) -> dict:
    return {
        "id": row.id,
        "accountId": row.account_id,
        "studentName": account.full_name if account else "",
        "contact": account.identifier if account else "",
        "kind": row.kind,
        "language": row.language,
        "surface": row.surface,
        "detectedBy": row.detected_by,
        "createdAt": row.created_at,
        "acknowledgedAt": row.acknowledged_at,
        "acknowledgedBy": row.acknowledged_by,
        "outcome": row.outcome,
        "outcomeNote": row.outcome_note,
    }


@router.get("/ops/crisis-events")
def crisis_events(
    outcome: str = Query("", max_length=24),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """Follow-up queue. Staff only, and never exposes what the student wrote."""
    if user["role"] not in ("SUPER_ADMIN", "NMC_DOCTOR", "CAMPUS_ADMIN"):
        raise HTTPException(403, "Crisis follow-up is limited to clinical and campus staff.")
    statement = select(M.CrisisEvent)
    if outcome.strip():
        statement = statement.where(M.CrisisEvent.outcome == outcome.strip())
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    # Unacknowledged first, then newest: the queue is ordered by who still needs contact.
    rows = db.scalars(
        statement.order_by(M.CrisisEvent.acknowledged_at.asc(), M.CrisisEvent.created_at.desc())
        .offset(offset).limit(limit)
    ).all()
    accounts = {a.id: a for a in db.scalars(select(M.Account).where(M.Account.id.in_([r.account_id for r in rows]))).all()} if rows else {}
    return {
        "items": [crisis_payload(row, accounts.get(row.account_id)) for row in rows],
        "total": total or 0,
        "pending": db.scalar(select(func.count()).select_from(select(M.CrisisEvent).where(M.CrisisEvent.outcome == "PENDING").subquery())) or 0,
    }


class CrisisAcknowledge(StrictModel):
    outcome: str = Field(max_length=24)
    note: str = Field(default="", max_length=500)

    @field_validator("outcome")
    @classmethod
    def known_outcome(cls, value: str) -> str:
        allowed = {"CONTACTED", "ESCALATED", "NO_CONTACT_NEEDED", "UNREACHABLE"}
        if value not in allowed:
            raise ValueError(f"Outcome must be one of {', '.join(sorted(allowed))}.")
        return value


@router.post("/ops/crisis-events/{event_id}/acknowledge")
def acknowledge_crisis(event_id: str, body: CrisisAcknowledge, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    if user["role"] not in ("SUPER_ADMIN", "NMC_DOCTOR", "CAMPUS_ADMIN"):
        raise HTTPException(403, "Crisis follow-up is limited to clinical and campus staff.")
    row = db.get(M.CrisisEvent, event_id)
    if not row:
        raise HTTPException(404, "Crisis event not found.")
    row.acknowledged_at = time.time()
    row.acknowledged_by = user["id"]
    row.outcome = body.outcome
    row.outcome_note = body.note.strip()
    audit(db, user["id"], f"CRISIS_FOLLOW_UP_{body.outcome}", row.id)
    db.commit()
    return crisis_payload(row, db.get(M.Account, row.account_id))


# ══════════════════════════════════════════════════════════════════════════════
# Service providers — pharmacies and labs
# ══════════════════════════════════════════════════════════════════════════════

def provider_payload(row: M.ServiceProvider) -> dict:
    now = time.time()
    # An expired licence is reported, never silently treated as valid.
    licence_valid = bool(row.licence_no) and (row.licence_expiry == 0.0 or row.licence_expiry > now)
    return {
        "id": row.id, "kind": row.kind, "legalName": row.legal_name,
        "licenceNo": row.licence_no, "licenceValid": licence_valid, "licenceExpiry": row.licence_expiry,
        "accreditation": row.accreditation, "address": row.address, "pincode": row.pincode,
        "latitude": row.latitude, "longitude": row.longitude, "openHours": row.open_hours,
        "homeCollection": row.home_collection, "sourceUrl": row.source_url,
        "verifiedAt": row.verified_at, "active": row.active,
    }


class ProviderInput(StrictModel):
    accountId: str = Field(max_length=80)
    kind: str = Field(max_length=12)
    legalName: str = Field(min_length=2, max_length=160)
    licenceNo: str = Field(default="", max_length=80)
    licenceExpiry: float = Field(default=0.0, ge=0)
    accreditation: str = Field(default="", max_length=80)
    address: str = Field(default="", max_length=400)
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")
    latitude: float = Field(default=0.0, ge=-90, le=90)
    longitude: float = Field(default=0.0, ge=-180, le=180)
    serviceablePincodes: list[str] = Field(default_factory=list, max_length=200)
    openHours: str = Field(default="", max_length=200)
    homeCollection: bool = False
    sourceUrl: str = Field(default="", max_length=2000)

    @field_validator("kind")
    @classmethod
    def known_kind(cls, value: str) -> str:
        if value not in PROVIDER_KINDS:
            raise ValueError(f"Provider kind must be one of {', '.join(sorted(PROVIDER_KINDS))}.")
        return value

    @field_validator("serviceablePincodes")
    @classmethod
    def valid_pincodes(cls, value: list[str]) -> list[str]:
        import re
        if any(not re.fullmatch(r"[1-9][0-9]{5}", p) for p in value):
            raise ValueError("Every serviceable pincode must be a six-digit Indian pincode.")
        return list(dict.fromkeys(value))


@router.post("/ops/service-providers", status_code=201)
def create_provider(body: ProviderInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Onboard a pharmacy or lab. Licence details are recorded, never asserted as verified."""
    if not db.get(M.Account, body.accountId):
        raise HTTPException(404, "No such account to attach this provider to.")
    row = M.ServiceProvider(
        id=new_id(), account_id=body.accountId, kind=body.kind, legal_name=body.legalName.strip(),
        licence_no=body.licenceNo.strip(), licence_expiry=body.licenceExpiry,
        accreditation=body.accreditation.strip(), address=body.address.strip(), pincode=body.pincode,
        latitude=body.latitude, longitude=body.longitude, serviceable_pincodes=body.serviceablePincodes,
        open_hours=body.openHours.strip(), home_collection=body.homeCollection,
        source_url=body.sourceUrl.strip(), verified_at=0.0, active=True, updated_at=time.time(),
    )
    db.add(row)
    audit(db, user["id"], "SERVICE_PROVIDER_CREATED", row.id)
    db.commit()
    return provider_payload(row)


@router.get("/providers/nearby")
def nearby_providers(
    pincode: str = Query(pattern=r"^[1-9][0-9]{5}$"),
    kind: str = Query("", max_length=12),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    """Providers at, or serving, a pincode.

    Ranked by whether the provider sits in the pincode and then by name. Ranking is
    never weighted commercially (Rule L) and the basis is returned so the student can
    see why an order came out the way it did.
    """
    statement = select(M.ServiceProvider).where(M.ServiceProvider.active.is_(True))
    if kind.strip():
        if kind not in PROVIDER_KINDS:
            raise HTTPException(422, f"Provider kind must be one of {', '.join(sorted(PROVIDER_KINDS))}.")
        statement = statement.where(M.ServiceProvider.kind == kind)
    rows = db.scalars(statement.order_by(M.ServiceProvider.legal_name)).all()

    matches = [r for r in rows if r.pincode == pincode or pincode in (r.serviceable_pincodes or [])]
    matches.sort(key=lambda r: (r.pincode != pincode, r.legal_name))
    return {
        "items": [{**provider_payload(r), "inPincode": r.pincode == pincode} for r in matches[:limit]],
        "total": len(matches),
        "rankedBy": "pincode match, then name — never by commission or paid placement",
    }


# ══════════════════════════════════════════════════════════════════════════════
# Prescriptions
# ══════════════════════════════════════════════════════════════════════════════

class PrescriptionItemInput(StrictModel):
    genericName: str = Field(min_length=2, max_length=160)
    brandName: str = Field(default="", max_length=160)
    strength: str = Field(default="", max_length=60)
    form: str = Field(default="", max_length=40)
    dose: str = Field(default="", max_length=60)
    frequency: str = Field(default="", max_length=60)
    durationDays: int = Field(default=0, ge=0, le=365)
    quantity: int = Field(default=0, ge=0, le=1000)
    substitutionAllowed: bool = True
    scheduleClass: str = Field(default="OTC", max_length=4)
    substanceCode: str = Field(default="", max_length=60)

    @field_validator("scheduleClass")
    @classmethod
    def known_class(cls, value: str) -> str:
        if value not in SCHEDULE_CLASSES:
            raise ValueError(f"Schedule class must be one of {', '.join(sorted(SCHEDULE_CLASSES))}.")
        return value


class PrescriptionInput(StrictModel):
    patientId: str = Field(max_length=80)
    encounterId: str = Field(default="", max_length=80)
    items: list[PrescriptionItemInput] = Field(min_length=1, max_length=20)
    advice: str = Field(default="", max_length=1000)
    validDays: int = Field(default=30, ge=1, le=180)
    acknowledgeAllergyConflict: bool = False


def prescription_payload(row: M.Prescription, items: list[M.PrescriptionItem]) -> dict:
    return {
        "id": row.id, "encounterId": row.encounter_id, "prescriberId": row.prescriber_id,
        "prescriberRegNo": row.prescriber_reg_no, "patientId": row.patient_id,
        "issuedAt": row.issued_at, "validUntil": row.valid_until, "status": row.status,
        "advice": row.advice, "allergyCheck": row.allergy_check or {},
        "items": [{
            "id": i.id, "genericName": i.generic_name, "brandName": i.brand_name,
            "strength": i.strength, "form": i.form, "dose": i.dose, "frequency": i.frequency,
            "durationDays": i.duration_days, "quantity": i.quantity,
            "substitutionAllowed": i.substitution_allowed, "scheduleClass": i.schedule_class,
            "registerRequired": i.schedule_class in REGISTER_CLASSES,
        } for i in items],
    }


@router.post("/prescriptions", status_code=201)
def issue_prescription(body: PrescriptionInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Issue a prescription. Clinicians only, and never over an unacknowledged allergy.

    The allergy cross-check runs before anything is written. A conflict blocks the
    issue outright unless the prescriber explicitly acknowledges it, and the decision
    is stored on the prescription so the pharmacy can see it was deliberate.
    """
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Only a clinician account may issue a prescription.")

    patient = db.get(M.Account, body.patientId)
    if not patient:
        raise HTTPException(404, "No such patient account.")

    allergies = list((patient.profile or {}).get("allergies", []) or [])
    conflicts = []
    for item in body.items:
        result = F.cross_check_allergies(item.genericName, allergies, item.substanceCode)
        if result["hasConflict"]:
            conflicts.append({"genericName": item.genericName, "conflicts": result["conflicts"]})

    if conflicts and not body.acknowledgeAllergyConflict:
        # Fail closed: a recorded allergy stops the prescription until it is addressed.
        raise HTTPException(409, {
            "message": "This prescription conflicts with an allergy on the patient's record.",
            "conflicts": conflicts,
        })

    prescriber_profile = (db.get(M.Account, user["id"]).profile or {}) if db.get(M.Account, user["id"]) else {}
    now = time.time()
    prescription = M.Prescription(
        id=new_id(), encounter_id=body.encounterId.strip(), prescriber_id=user["id"],
        prescriber_reg_no=str(prescriber_profile.get("registrationNumber", ""))[:60],
        patient_id=body.patientId, issued_at=now, valid_until=now + body.validDays * 86400,
        status="ISSUED", advice=body.advice.strip(),
        allergy_check={
            "checkedAt": now,
            "recordedAllergies": len(allergies),
            "conflicts": conflicts,
            "acknowledged": bool(conflicts) and body.acknowledgeAllergyConflict,
        },
    )
    db.add(prescription)
    items = [
        M.PrescriptionItem(
            id=new_id(), prescription_id=prescription.id, generic_name=item.genericName.strip(),
            brand_name=item.brandName.strip(), strength=item.strength.strip(), form=item.form.strip(),
            dose=item.dose.strip(), frequency=item.frequency.strip(), duration_days=item.durationDays,
            quantity=item.quantity, substitution_allowed=item.substitutionAllowed,
            schedule_class=item.scheduleClass,
        )
        for item in body.items
    ]
    db.add_all(items)
    ops_feed.publish(
        db, "PRESCRIPTION_ISSUED", "CLINICAL",
        severity="ATTENTION" if conflicts else "INFO",
        summary=f"Prescription issued · {len(items)} item(s)"
                + (" · allergy conflict acknowledged" if conflicts else ""),
        actor_id=user["id"], actor_role=user["role"], subject_id=body.patientId,
        resource_type="prescription", resource_id=prescription.id,
    )
    ops_feed.notify(
        db, body.patientId, "PRESCRIPTION_ISSUED",
        dedupe_key=f"rx-issued:{prescription.id}",
        summary=f"Your clinician issued a prescription with {len(items)} item(s). "
                f"Send it to a pharmacy when you are ready.",
        resource_type="prescription", resource_id=prescription.id,
    )
    audit(db, user["id"], "PRESCRIPTION_ISSUED", prescription.id)
    db.commit()
    return prescription_payload(prescription, items)


def _load_items(db: Session, prescription_ids: list[str]) -> dict[str, list[M.PrescriptionItem]]:
    if not prescription_ids:
        return {}
    rows = db.scalars(select(M.PrescriptionItem).where(M.PrescriptionItem.prescription_id.in_(prescription_ids))).all()
    grouped: dict[str, list[M.PrescriptionItem]] = {}
    for row in rows:
        grouped.setdefault(row.prescription_id, []).append(row)
    return grouped


@router.get("/prescriptions")
def my_prescriptions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    """The signed-in account's own prescriptions. Never another account's."""
    statement = select(M.Prescription).where(M.Prescription.patient_id == user["id"])
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.Prescription.issued_at.desc()).offset(offset).limit(limit)).all()
    grouped = _load_items(db, [r.id for r in rows])
    return {"items": [prescription_payload(r, grouped.get(r.id, [])) for r in rows], "total": total or 0}


@router.get("/work/prescriptions")
def prescribed_by_me(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Only a clinician account may read its prescribing history.")
    statement = select(M.Prescription).where(M.Prescription.prescriber_id == user["id"])
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.Prescription.issued_at.desc()).offset(offset).limit(limit)).all()
    grouped = _load_items(db, [r.id for r in rows])
    return {"items": [prescription_payload(r, grouped.get(r.id, [])) for r in rows], "total": total or 0}


# ══════════════════════════════════════════════════════════════════════════════
# Dispensing
# ══════════════════════════════════════════════════════════════════════════════

def dispense_payload(row: M.Dispense) -> dict:
    return {
        "id": row.id, "prescriptionId": row.prescription_id, "pharmacyId": row.pharmacy_id,
        "patientId": row.patient_id, "status": row.status, "verifiedBy": row.verified_by,
        "verifiedAt": row.verified_at, "substitutionNote": row.substitution_note,
        "rejectionReason": row.rejection_reason, "delivery": row.delivery or {},
        "createdAt": row.created_at, "updatedAt": row.updated_at,
        "nextStates": F.next_dispense_states(row.status),
    }


class DispenseRequest(StrictModel):
    prescriptionId: str = Field(max_length=80)
    pharmacyId: str = Field(max_length=80)
    delivery: dict = Field(default_factory=dict)


@router.post("/dispenses", status_code=201)
def request_dispense(body: DispenseRequest, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """A patient sends their own prescription to a chosen pharmacy."""
    prescription = db.get(M.Prescription, body.prescriptionId)
    if not prescription or prescription.patient_id != user["id"]:
        raise HTTPException(404, "No such prescription on your account.")
    if prescription.valid_until and prescription.valid_until < time.time():
        raise HTTPException(409, "This prescription has expired. Ask your clinician to reissue it.")

    pharmacy = db.get(M.ServiceProvider, body.pharmacyId)
    if not pharmacy or pharmacy.kind != "PHARMACY" or not pharmacy.active:
        raise HTTPException(404, "No such active pharmacy.")

    existing = db.scalar(select(M.Dispense).where(
        M.Dispense.prescription_id == prescription.id,
        M.Dispense.status.not_in(tuple(F.DISPENSE_TERMINAL)),
    ))
    if existing:
        raise HTTPException(409, "This prescription is already with a pharmacy.")

    row = M.Dispense(
        id=new_id(), prescription_id=prescription.id, pharmacy_id=pharmacy.id,
        patient_id=user["id"], status=F.DISPENSE_START, delivery=body.delivery or {},
        created_at=time.time(), updated_at=time.time(),
    )
    db.add(row)
    # Per-item rows so the pharmacy can fill part of a prescription rather than
    # having to reject the whole thing.
    items = db.scalars(select(M.PrescriptionItem).where(
        M.PrescriptionItem.prescription_id == prescription.id)).all()
    db.add_all([
        M.DispenseItem(id=new_id(), dispense_id=row.id, prescription_item_id=item.id,
                       quantity_requested=item.quantity, quantity_dispensed=0, status="PENDING")
        for item in items
    ])
    ops_feed.publish(
        db, "DISPENSE_REQUESTED", "PHARMACY",
        summary=f"Prescription sent to pharmacy · {len(items)} item(s)",
        actor_id=user["id"], actor_role=user["role"], subject_id=user["id"],
        provider_id=pharmacy.id, resource_type="dispense", resource_id=row.id,
    )
    audit(db, user["id"], "DISPENSE_REQUESTED", row.id)
    db.commit()
    return dispense_payload(row)


@router.get("/work/dispenses")
def pharmacy_queue(
    status: str = Query("", max_length=24),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """The pharmacy's own incoming queue. A vendor never sees another vendor's."""
    statement = select(M.Dispense)
    if user["role"] != "SUPER_ADMIN":
        mine = db.scalars(select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"])).all()
        if not mine:
            return {"items": [], "total": 0}
        statement = statement.where(M.Dispense.pharmacy_id.in_(mine))
    if status.strip():
        statement = statement.where(M.Dispense.status == status.strip())
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.Dispense.created_at.desc()).offset(offset).limit(limit)).all()
    grouped = _load_items(db, [r.prescription_id for r in rows])
    prescriptions = {p.id: p for p in db.scalars(select(M.Prescription).where(M.Prescription.id.in_([r.prescription_id for r in rows]))).all()} if rows else {}
    return {
        "items": [{
            **dispense_payload(row),
            "prescription": prescription_payload(prescriptions[row.prescription_id], grouped.get(row.prescription_id, []))
            if row.prescription_id in prescriptions else None,
        } for row in rows],
        "total": total or 0,
    }


class DispenseTransition(StrictModel):
    status: str = Field(max_length=24)
    pharmacistName: str = Field(default="", max_length=120)
    note: str = Field(default="", max_length=500)


@router.patch("/dispenses/{dispense_id}")
def advance_dispense(dispense_id: str, body: DispenseTransition, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Move a dispense along its lifecycle. Verification needs a named pharmacist."""
    row = db.get(M.Dispense, dispense_id)
    if not row:
        raise HTTPException(404, "Dispense not found.")

    is_patient = row.patient_id == user["id"]
    owns_pharmacy = _owns_pharmacy(db, user, row.pharmacy_id)
    if not (is_patient or owns_pharmacy):
        raise HTTPException(403, "This dispense is not yours to update.")
    if is_patient and not owns_pharmacy and body.status not in F.DISPENSE_PATIENT_TRANSITIONS:
        raise HTTPException(403, "You can cancel this request; the pharmacy handles the rest.")

    try:
        F.assert_transition(F.DISPENSE_TRANSITIONS, row.status, body.status, "dispense")
    except F.TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc

    if body.status == "RX_VERIFIED":
        # Rule 1: the pharmacist gate cannot be satisfied anonymously.
        if not body.pharmacistName.strip():
            raise HTTPException(422, "Record the verifying pharmacist's name.")
        row.verified_by = body.pharmacistName.strip()
        row.verified_at = time.time()
    if body.status == "SUBSTITUTION_PROPOSED":
        if not body.note.strip():
            raise HTTPException(422, "Describe the proposed substitution.")
        row.substitution_note = body.note.strip()
    if body.status == "REJECTED":
        if not body.note.strip():
            raise HTTPException(422, "Give the patient a reason for the rejection.")
        row.rejection_reason = body.note.strip()

    row.status = body.status
    row.updated_at = time.time()
    # Only the milestones a student would act on; they do not need "packed".
    patient_message = {
        "RX_VERIFIED": "A pharmacist has verified your prescription.",
        "OUT_FOR_DELIVERY": "Your medicines are out for delivery.",
        "DELIVERED": "Your medicines have been delivered.",
        "REJECTED": f"The pharmacy could not fill your prescription: {body.note.strip()}",
        "SUBSTITUTION_PROPOSED": "The pharmacy proposed a substitution. Your clinician is reviewing it.",
    }.get(body.status)
    if patient_message:
        ops_feed.notify(
            db, row.patient_id, f"DISPENSE_{body.status}",
            dedupe_key=f"dispense:{row.id}:{body.status}",
            summary=patient_message, resource_type="dispense", resource_id=row.id,
        )
    ops_feed.publish(
        db, f"DISPENSE_{body.status}", "PHARMACY",
        severity="ATTENTION" if body.status in ("REJECTED", "RETURNED") else "INFO",
        summary=f"Dispense moved to {body.status.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        provider_id=row.pharmacy_id, resource_type="dispense", resource_id=row.id,
    )
    audit(db, user["id"], f"DISPENSE_{body.status}", row.id)
    db.commit()
    return dispense_payload(row)


@router.get("/ops/dispense-register")
def dispense_register(
    limit: int = Query(100, ge=1, le=500),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """Schedule H1 and X dispensing register.

    Kept because those classes carry a retention duty; the register is derived from
    recorded dispenses rather than maintained by hand.
    """
    if user["role"] not in ("SUPER_ADMIN", "VENDOR"):
        raise HTTPException(403, "The dispensing register is limited to pharmacy and platform staff.")
    statement = select(M.Dispense).where(M.Dispense.status == "DELIVERED")
    if user["role"] != "SUPER_ADMIN":
        mine = db.scalars(select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"])).all()
        if not mine:
            return {"items": [], "total": 0}
        statement = statement.where(M.Dispense.pharmacy_id.in_(mine))
    rows = db.scalars(statement.order_by(M.Dispense.updated_at.desc()).limit(limit)).all()
    grouped = _load_items(db, [r.prescription_id for r in rows])
    entries = []
    for row in rows:
        register_items = [i for i in grouped.get(row.prescription_id, []) if i.schedule_class in REGISTER_CLASSES]
        if not register_items:
            continue
        entries.append({
            "dispenseId": row.id, "prescriptionId": row.prescription_id, "pharmacyId": row.pharmacy_id,
            "verifiedBy": row.verified_by, "verifiedAt": row.verified_at, "dispensedAt": row.updated_at,
            "items": [{"genericName": i.generic_name, "strength": i.strength, "quantity": i.quantity,
                       "scheduleClass": i.schedule_class} for i in register_items],
        })
    return {"items": entries, "total": len(entries)}


# ══════════════════════════════════════════════════════════════════════════════
# Lab orders
# ══════════════════════════════════════════════════════════════════════════════

def lab_payload(row: M.LabOrder) -> dict:
    return {
        "id": row.id, "prescriptionId": row.prescription_id, "patientId": row.patient_id,
        "labId": row.lab_id, "orderedBy": row.ordered_by, "testPanel": row.test_panel or [],
        "clinicalIndication": row.clinical_indication, "collectionMode": row.collection_mode,
        "slotStart": row.slot_start, "fastingRequired": row.fasting_required,
        "collectorName": row.collector_name, "sampleId": row.sample_id, "status": row.status,
        "reportDocumentId": row.report_document_id, "criticalFlag": row.critical_flag,
        "criticalNote": row.critical_note,
        "criticalAcknowledgedAt": row.critical_acknowledged_at or None,
        "criticalAcknowledgedBy": row.critical_acknowledged_by,
        "rejectionReason": row.rejection_reason,
        "createdAt": row.created_at, "updatedAt": row.updated_at,
        "nextStates": F.next_lab_states(row.status),
    }


class LabOrderInput(StrictModel):
    labId: str = Field(max_length=80)
    testPanel: list[str] = Field(min_length=1, max_length=30)
    collectionMode: str = Field(default="WALK_IN", max_length=12)
    slotStart: str = Field(default="", max_length=40)
    fastingRequired: bool = False
    clinicalIndication: str = Field(default="", max_length=500)
    prescriptionId: str = Field(default="", max_length=80)

    @field_validator("collectionMode")
    @classmethod
    def known_mode(cls, value: str) -> str:
        if value not in ("HOME", "WALK_IN"):
            raise ValueError("Collection mode must be HOME or WALK_IN.")
        return value


@router.post("/lab-orders", status_code=201)
def book_lab_order(body: LabOrderInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Book a diagnostic test. Unlike the previous booking endpoint, this persists."""
    lab = db.get(M.ServiceProvider, body.labId)
    if not lab or lab.kind != "LAB" or not lab.active:
        raise HTTPException(404, "No such active laboratory.")
    if body.collectionMode == "HOME" and not lab.home_collection:
        raise HTTPException(409, "This laboratory does not offer home sample collection.")

    row = M.LabOrder(
        id=new_id(), prescription_id=body.prescriptionId.strip(), patient_id=user["id"], lab_id=lab.id,
        ordered_by=user["id"], test_panel=body.testPanel, clinical_indication=body.clinicalIndication.strip(),
        collection_mode=body.collectionMode, slot_start=body.slotStart.strip(),
        fasting_required=body.fastingRequired, status=F.LAB_START,
        created_at=time.time(), updated_at=time.time(),
    )
    db.add(row)
    ops_feed.publish(
        db, "LAB_ORDER_BOOKED", "LAB",
        summary=f"Lab booking · {len(body.testPanel)} test(s) · {body.collectionMode.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user["role"], subject_id=user["id"],
        provider_id=lab.id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], "LAB_ORDER_BOOKED", row.id)
    db.commit()
    return lab_payload(row)


@router.get("/lab-orders")
def my_lab_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    statement = select(M.LabOrder).where(M.LabOrder.patient_id == user["id"])
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.LabOrder.created_at.desc()).offset(offset).limit(limit)).all()
    return {"items": [lab_payload(r) for r in rows], "total": total or 0}


@router.get("/work/lab-orders")
def lab_queue(
    status: str = Query("", max_length=24),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """The laboratory's own queue, critical results first."""
    statement = select(M.LabOrder)
    if user["role"] != "SUPER_ADMIN":
        mine = db.scalars(select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"])).all()
        if not mine:
            return {"items": [], "total": 0, "critical": 0}
        statement = statement.where(M.LabOrder.lab_id.in_(mine))
    if status.strip():
        statement = statement.where(M.LabOrder.status == status.strip())
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(
        statement.order_by(M.LabOrder.critical_flag.desc(), M.LabOrder.created_at.desc())
        .offset(offset).limit(limit)
    ).all()
    return {
        "items": [lab_payload(r) for r in rows],
        "total": total or 0,
        "critical": sum(1 for r in rows if r.critical_flag),
    }


class LabTransition(StrictModel):
    status: str = Field(max_length=24)
    collectorName: str = Field(default="", max_length=120)
    sampleId: str = Field(default="", max_length=40)
    reportDocumentId: str = Field(default="", max_length=80)
    criticalFlag: bool = False
    criticalNote: str = Field(default="", max_length=500)
    rejectionReason: str = Field(default="", max_length=300)


@router.get("/work/lab-orders/awaiting-collection")
def lab_orders_awaiting_collection(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Samples that were booked and never collected.

    The quiet failure this catches: the clinician believes a test is under way,
    the student believes it is handled, and nobody is waiting for anything.
    Scoped to whoever can act — the clinician who ordered it, the lab that was
    due to collect it, and the super admin.
    """
    statement = select(M.LabOrder).where(M.LabOrder.status.in_(tuple(F.COLLECTION_PENDING_STATES)))
    if user["role"] == "NMC_DOCTOR":
        statement = statement.where(M.LabOrder.ordered_by == user["id"])
    elif user["role"] != "SUPER_ADMIN":
        mine = db.scalars(select(M.ServiceProvider.id).where(M.ServiceProvider.account_id == user["id"])).all()
        if not mine:
            return {"items": [], "total": 0}
        statement = statement.where(M.LabOrder.lab_id.in_(mine))

    now = time.time()
    items = []
    for row in db.scalars(statement.order_by(M.LabOrder.created_at)).all():
        overdue, reason = F.overdue_collection(row.status, row.slot_start, row.created_at, now)
        if not overdue:
            continue
        items.append({**lab_payload(row), "overdueReason": reason,
                      "waitingSeconds": round(now - (F.parse_slot(row.slot_start) or row.created_at or now))})
    items.sort(key=lambda item: item["waitingSeconds"], reverse=True)
    return {"items": items, "total": len(items)}


@router.patch("/lab-orders/{order_id}")
def advance_lab_order(order_id: str, body: LabTransition, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Move a lab order along its lifecycle, keeping the chain of custody intact."""
    row = db.get(M.LabOrder, order_id)
    if not row:
        raise HTTPException(404, "Lab order not found.")

    is_patient = row.patient_id == user["id"]
    owns_lab = _owns_pharmacy(db, user, row.lab_id)
    if not (is_patient or owns_lab):
        raise HTTPException(403, "This lab order is not yours to update.")
    if is_patient and not owns_lab and body.status not in F.LAB_PATIENT_TRANSITIONS:
        raise HTTPException(403, "You can cancel this booking; the laboratory handles the rest.")

    try:
        F.assert_transition(F.LAB_TRANSITIONS, row.status, body.status, "lab order")
    except F.TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc

    if body.status == "ASSIGNED":
        if not body.collectorName.strip():
            raise HTTPException(422, "Name the assigned collector.")
        row.collector_name = body.collectorName.strip()
    if body.status == "SAMPLE_COLLECTED":
        if not body.sampleId.strip():
            raise HTTPException(422, "A collected sample needs an identifier.")
        row.sample_id = body.sampleId.strip()
    if body.status in F.LAB_REQUIRES_SAMPLE_ID and not (row.sample_id or body.sampleId.strip()):
        raise HTTPException(409, "The chain of custody is broken: no sample identifier was recorded.")
    if body.status in F.LAB_REQUIRES_REASON:
        if not body.rejectionReason.strip():
            raise HTTPException(422, "Say why the sample was rejected — the student is being asked for another.")
        row.rejection_reason = body.rejectionReason.strip()
    if body.status == "RECOLLECTION_REQUIRED":
        # A fresh sample gets a fresh identifier; keeping the old one would break custody.
        row.sample_id = ""
        row.collector_name = ""
    if body.status == "REPORT_READY":
        if not body.reportDocumentId.strip():
            raise HTTPException(422, "Attach the report document before marking it ready.")
        document = db.get(M.Document, body.reportDocumentId.strip())
        if not document:
            raise HTTPException(404, "That report document does not exist.")
        if document.account_id != row.patient_id:
            # Without this a lab could attach any document id, including another
            # student's record, to a report.
            raise HTTPException(403, "That document belongs to a different account.")
        row.report_document_id = document.id
        if body.criticalFlag:
            # A critical value must not queue behind routine results, and must be
            # acknowledged by a clinician rather than assumed read.
            row.critical_flag = True
            row.critical_note = body.criticalNote.strip()
            ops_feed.publish(
                db, "LAB_CRITICAL_VALUE", "CLINICAL", severity="CRITICAL",
                summary="Critical lab value reported — clinician acknowledgement required",
                actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
                provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id,
            )
            audit(db, user["id"], "LAB_CRITICAL_VALUE", row.id)

    row.status = body.status
    row.updated_at = time.time()
    lab_message = {
        "ASSIGNED": f"{row.collector_name} will collect your sample."
                    + (" Please fast as instructed." if row.fasting_required else ""),
        "SAMPLE_COLLECTED": "Your sample has been collected.",
        "SAMPLE_REJECTED": f"Your sample could not be used: {row.rejection_reason}",
        "RECOLLECTION_REQUIRED": "A fresh sample is needed. The laboratory will arrange a new collection.",
        "REPORT_RELEASED": "Your lab report is ready in your health vault.",
    }.get(body.status)
    if lab_message:
        ops_feed.notify(
            db, row.patient_id, f"LAB_{body.status}",
            dedupe_key=f"lab:{row.id}:{body.status}",
            summary=lab_message, resource_type="lab_order", resource_id=row.id,
        )
    ops_feed.publish(
        db, f"LAB_{body.status}", "LAB",
        severity="ATTENTION" if body.status in ("SAMPLE_REJECTED", "RECOLLECTION_REQUIRED") else "INFO",
        summary=f"Lab order moved to {body.status.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], f"LAB_{body.status}", row.id)
    db.commit()
    return lab_payload(row)


# ══════════════════════════════════════════════════════════════════════════════
# Cross-dashboard activity feed
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/ops/feed")
def activity_feed(
    domain: str = Query("", max_length=16),
    severity: str = Query("", max_length=10),
    unacknowledgedOnly: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """Every dashboard's activity, scoped to what this role is responsible for.

    A super admin sees all of it — an order placed in the marketplace, a prescription
    issued in a clinic, a sample collected by a lab. Other roles see their slice of
    the same stream.
    """
    return ops_feed.feed(db, user, domain=domain, severity=severity,
                         unacknowledged_only=unacknowledgedOnly, limit=limit, offset=offset)


@router.get("/ops/feed/counts")
def activity_counts(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Unacknowledged counts per domain — the tile row above the feed."""
    return {"domains": ops_feed.counts_by_domain(db, user)}


@router.post("/ops/feed/{event_id}/acknowledge")
def acknowledge_event(event_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Mark an event handled. Only from within the role's own scope."""
    visible = ops_feed.visible_ids(db, user, [event_id])
    if not visible:
        raise HTTPException(404, "Event not found.")
    row = db.get(M.OpsEvent, event_id)
    row.acknowledged_at = time.time()
    row.acknowledged_by = user["id"]
    db.commit()
    return ops_feed.payload(row)


# ══════════════════════════════════════════════════════════════════════════════
# Substitution: proposed by the pharmacy, decided by the prescriber
# ══════════════════════════════════════════════════════════════════════════════

class SubstitutionProposal(StrictModel):
    prescriptionItemId: str = Field(max_length=80)
    proposedGeneric: str = Field(min_length=2, max_length=160)
    proposedBrand: str = Field(default="", max_length=160)
    reason: str = Field(min_length=3, max_length=300)


def substitution_payload(row: M.SubstitutionRequest) -> dict:
    return {
        "id": row.id, "dispenseId": row.dispense_id, "prescriptionItemId": row.prescription_item_id,
        "proposedBy": row.proposed_by, "proposedGeneric": row.proposed_generic,
        "proposedBrand": row.proposed_brand, "reason": row.reason, "status": row.status,
        "decidedBy": row.decided_by, "decidedAt": row.decided_at or None,
        "decisionNote": row.decision_note, "createdAt": row.created_at,
    }


@router.post("/dispenses/{dispense_id}/substitutions", status_code=201)
def propose_substitution(dispense_id: str, body: SubstitutionProposal,
                         user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """A pharmacy proposes a swap. It does not get to accept its own proposal."""
    row = db.get(M.Dispense, dispense_id)
    if not row:
        raise HTTPException(404, "Dispense not found.")
    if not _owns_pharmacy(db, user, row.pharmacy_id):
        raise HTTPException(403, "This dispense is not yours.")

    item = db.get(M.PrescriptionItem, body.prescriptionItemId)
    if not item or item.prescription_id != row.prescription_id:
        raise HTTPException(404, "That item is not on this prescription.")
    if not item.substitution_allowed:
        # The prescriber marked this item no-substitute; that decision stands.
        raise HTTPException(409, "The prescriber marked this item as no-substitution.")

    proposal = M.SubstitutionRequest(
        id=new_id(), dispense_id=row.id, prescription_item_id=item.id, proposed_by=user["id"],
        proposed_generic=body.proposedGeneric.strip(), proposed_brand=body.proposedBrand.strip(),
        reason=body.reason.strip(), status="PENDING", created_at=time.time(),
    )
    db.add(proposal)
    row.status = "SUBSTITUTION_PROPOSED"
    row.substitution_note = body.reason.strip()
    row.updated_at = time.time()

    prescription = db.get(M.Prescription, row.prescription_id)
    ops_feed.publish(
        db, "SUBSTITUTION_PROPOSED", "CLINICAL", severity="ATTENTION",
        summary="Pharmacy proposed a substitution — prescriber decision needed",
        actor_id=user["id"], actor_role=user["role"],
        subject_id=prescription.patient_id if prescription else "",
        resource_type="substitution", resource_id=proposal.id,
    )
    audit(db, user["id"], "SUBSTITUTION_PROPOSED", proposal.id)
    db.commit()
    return substitution_payload(proposal)


@router.get("/work/substitutions")
def pending_substitutions(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Proposals waiting on this clinician."""
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Only the prescribing clinician decides a substitution.")
    mine = db.scalars(select(M.Prescription.id).where(M.Prescription.prescriber_id == user["id"])).all()
    if not mine:
        return {"items": [], "total": 0}
    dispenses = db.scalars(select(M.Dispense.id).where(M.Dispense.prescription_id.in_(mine))).all()
    if not dispenses:
        return {"items": [], "total": 0}
    rows = db.scalars(
        select(M.SubstitutionRequest)
        .where(M.SubstitutionRequest.dispense_id.in_(dispenses), M.SubstitutionRequest.status == "PENDING")
        .order_by(M.SubstitutionRequest.created_at)
    ).all()
    return {"items": [substitution_payload(r) for r in rows], "total": len(rows)}


class SubstitutionDecision(StrictModel):
    approve: bool
    note: str = Field(default="", max_length=300)


@router.post("/substitutions/{proposal_id}/decide")
def decide_substitution(proposal_id: str, body: SubstitutionDecision,
                        user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Only the clinician who wrote the prescription may answer."""
    proposal = db.get(M.SubstitutionRequest, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found.")
    if proposal.status != "PENDING":
        raise HTTPException(409, "This proposal has already been decided.")

    dispense = db.get(M.Dispense, proposal.dispense_id)
    prescription = db.get(M.Prescription, dispense.prescription_id) if dispense else None
    if not prescription or prescription.prescriber_id != user["id"]:
        raise HTTPException(403, "Only the prescribing clinician may decide this.")

    proposal.status = "APPROVED" if body.approve else "REFUSED"
    proposal.decided_by = user["id"]
    proposal.decided_at = time.time()
    proposal.decision_note = body.note.strip()
    # Approved returns the dispense to the pharmacy to continue; refused sends it
    # back to verified so the original drug is dispensed.
    dispense.status = "RX_VERIFIED"
    dispense.updated_at = time.time()

    ops_feed.publish(
        db, f"SUBSTITUTION_{proposal.status}", "PHARMACY", severity="INFO",
        summary=f"Prescriber {proposal.status.lower()} the proposed substitution",
        actor_id=user["id"], actor_role=user["role"], subject_id=prescription.patient_id,
        provider_id=dispense.pharmacy_id, resource_type="substitution", resource_id=proposal.id,
    )
    ops_feed.notify(
        db, prescription.patient_id, f"SUBSTITUTION_{proposal.status}",
        dedupe_key=f"substitution:{proposal.id}:{proposal.status}",
        summary="Your clinician approved the pharmacy's substitution."
                if body.approve else
                "Your clinician refused the substitution; the original medicine will be dispensed.",
        resource_type="substitution", resource_id=proposal.id,
    )
    audit(db, user["id"], f"SUBSTITUTION_{proposal.status}", proposal.id)
    db.commit()
    return substitution_payload(proposal)


# ══════════════════════════════════════════════════════════════════════════════
# Critical lab values: acknowledged, or escalated
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/work/critical-results")
def critical_results(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Unacknowledged critical values. A result nobody has looked at is the risk."""
    if user["role"] not in ("NMC_DOCTOR", "SUPER_ADMIN"):
        raise HTTPException(403, "Critical results are reviewed by clinical staff.")
    rows = db.scalars(
        select(M.LabOrder)
        .where(M.LabOrder.critical_flag.is_(True), M.LabOrder.critical_acknowledged_at == 0.0)
        .order_by(M.LabOrder.updated_at)
    ).all()
    now = time.time()
    return {
        "items": [{**lab_payload(r), "waitingSeconds": round(now - r.updated_at)} for r in rows],
        "total": len(rows),
    }


class CriticalAcknowledge(StrictModel):
    note: str = Field(min_length=3, max_length=500)


@router.post("/lab-orders/{order_id}/acknowledge-critical")
def acknowledge_critical(order_id: str, body: CriticalAcknowledge,
                         user=Depends(require_staff), db: Session = Depends(workflow_db)):
    if user["role"] not in ("NMC_DOCTOR", "SUPER_ADMIN"):
        raise HTTPException(403, "Critical results are acknowledged by clinical staff.")
    row = db.get(M.LabOrder, order_id)
    if not row:
        raise HTTPException(404, "Lab order not found.")
    if not row.critical_flag:
        raise HTTPException(409, "This result is not flagged critical.")
    row.critical_acknowledged_at = time.time()
    row.critical_acknowledged_by = user["id"]
    row.critical_note = f"{row.critical_note} | Acknowledged: {body.note.strip()}"[:500]
    ops_feed.publish(
        db, "LAB_CRITICAL_ACKNOWLEDGED", "CLINICAL", severity="INFO",
        summary="Critical result acknowledged by clinician",
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], "LAB_CRITICAL_ACKNOWLEDGED", row.id)
    db.commit()
    return lab_payload(row)


# ══════════════════════════════════════════════════════════════════════════════
# Request telemetry — every endpoint, as counts rather than records
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/ops/telemetry/activity")
def telemetry_activity(
    hours: int = Query(24, ge=1, le=720),
    routePrefix: str = Query("", max_length=200),
    limit: int = Query(200, ge=1, le=500),
    user=Depends(require_super_admin),
    db: Session = Depends(workflow_db),
):
    """Volume, latency and errors for every endpoint the API exposes.

    This is the counterpart to /ops/feed. The feed shows the handful of events
    somebody must act on; this shows that everything else happened at all —
    including the routine clinical activity the feed deliberately excludes, counted
    so that no individual's record is exposed.
    """
    return {
        **activity_telemetry.summary(db, hours=hours, route_prefix=routePrefix, limit=limit),
        "byRole": activity_telemetry.by_role(db, hours=hours),
        "hourly": activity_telemetry.hourly(db, hours=hours),
        "excludes": "account ids, path parameters, query values, bodies and responses",
    }


# ══════════════════════════════════════════════════════════════════════════════
# Agent Ayush — retrieval-augmented care assistant
# ══════════════════════════════════════════════════════════════════════════════

class AyushQuestion(StrictModel):
    question: str = Field(min_length=1, max_length=1000)
    conversationId: str = Field(default="", max_length=64)


@router.post("/agents/ayush/ask")
def ayush_ask(body: AyushQuestion, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Ask Agent Ayush.

    Every answer is grounded in an approved source and carries its citations; when
    nothing clears the relevance floor the agent says so rather than composing
    something plausible. Crisis language is intercepted before retrieval runs.
    """
    return agent_ayush.ask(
        db, body.question, account_id=user["id"],
        conversation_id=body.conversationId,
        student_name=(user.get("fullName") or "").split(" ")[0] or "Student",
    )


@router.get("/agents/ayush/history")
def ayush_history(
    conversationId: str = Query("", max_length=64),
    limit: int = Query(30, ge=1, le=100),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    """The signed-in account's own transcript. A transcript is clinical data."""
    statement = select(M.AgentTurn).where(
        M.AgentTurn.account_id == user["id"], M.AgentTurn.agent == agent_ayush.AGENT_NAME)
    if conversationId.strip():
        statement = statement.where(M.AgentTurn.conversation_id == conversationId.strip())
    rows = db.scalars(statement.order_by(M.AgentTurn.created_at.desc()).limit(limit)).all()
    return {"items": [{
        "id": row.id, "conversationId": row.conversation_id, "question": row.question,
        "answer": row.answer, "outcome": row.outcome, "citationIds": row.citation_ids or [],
        "createdAt": row.created_at,
    } for row in reversed(rows)], "total": len(rows)}


@router.post("/ops/knowledge/reindex")
def reindex_knowledge(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Rebuild the retrieval index from approved sources. Safe to repeat."""
    result = vector_store.reindex_all(db)
    audit(db, user["id"], "KNOWLEDGE_REINDEXED", user["id"])
    ops_feed.publish(
        db, "KNOWLEDGE_REINDEXED", "ACCOUNT",
        summary=f"Knowledge index rebuilt · {result['sources']} source(s) · {result['chunks']} chunk(s)",
        actor_id=user["id"], actor_role=user["role"],
        resource_type="knowledge_index", resource_id=user["id"],
    )
    db.commit()
    return result


@router.get("/ops/knowledge/index-status")
def knowledge_index_status(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """What the index holds, and whether it has drifted from the approved set."""
    return vector_store.index_status(db)


@router.get("/ops/agents/ayush/quality")
def ayush_quality(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Grounded rate, answer rate and refusal breakdown from recorded turns."""
    return agent_ayush.quality(db)
