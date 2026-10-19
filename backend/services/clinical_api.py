"""
services.clinical_api — crisis follow-up, prescribing, dispensing and lab fulfilment.

Endpoint groups:
  /care/crisis-signal, /ops/crisis-events      crisis-gate activations and follow-up
  /providers/nearby                            pharmacies and labs a student can reach
  /prescriptions, /work/prescriptions          issuing and reading prescriptions
  /dispenses, /work/dispenses                  pharmacy fulfilment
  /v1/pharmacy/rx-reviews                      pharmacist review of RX_ISSUED dispenses
  /prescriptions/uploads                       a student's photo/PDF of a paper prescription
  /lab-orders, /work/lab-orders                diagnostic fulfilment
  /work/lab-tests, /work/doctor-lab-orders     a doctor orders a test for a patient in their care

Every state change goes through ``clinical_fulfilment`` so there is no route that can
skip pharmacist verification or release a report without an analysis step.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import activity_telemetry, agent_ayush, ops_feed, security_scanner, vector_store
from services import clinical_fulfilment as F
from services.workflow_auth import (
    authenticated_user,
    purpose_key,
    require_clinician,
    require_crisis_follow_up,
    require_staff,
    require_super_admin,
    workflow_db,
)
from services.workflow_auth import limit as rate_limit

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


def _owns_provider(db: Session, user: dict, provider_id: str, kind: str) -> bool:
    """True only when this partner account owns a provider of this kind.

    No platform-admin bypass: verifying a prescription, filing a lab report or
    reading a held result is the partner's act, and admins never read results.
    The kind keeps a laboratory off pharmacy routes and the other way round, so
    partner separation is enforced here and not only on screen.
    """
    if user.get("role") != "VENDOR":
        return False
    return bool(db.scalar(select(M.ServiceProvider.id).where(
        M.ServiceProvider.id == provider_id, M.ServiceProvider.account_id == user["id"],
        M.ServiceProvider.kind == kind)))


def _owns_pharmacy(db: Session, user: dict, provider_id: str) -> bool:
    return _owns_provider(db, user, provider_id, "PHARMACY")


def _owns_lab(db: Session, user: dict, provider_id: str) -> bool:
    return _owns_provider(db, user, provider_id, "LAB")


def _own_provider_ids(db: Session, user: dict, kind: str) -> list[str]:
    if user.get("role") != "VENDOR":
        return []
    return list(db.scalars(select(M.ServiceProvider.id).where(
        M.ServiceProvider.account_id == user["id"], M.ServiceProvider.kind == kind)).all())


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
    """The minimum a counsellor needs to reach out: who, how to reach them, the
    kind of signal, when, and where follow-up stands. Never what the student
    wrote (it is not stored), and no internal ids, surfaces or staff notes."""
    return {
        "id": row.id,
        "studentName": account.full_name if account else "",
        "contact": account.identifier if account else "",
        "kind": row.kind,
        "createdAt": row.created_at,
        "acknowledgedAt": row.acknowledged_at or None,
        "outcome": row.outcome,
    }


def _crisis_accounts_in_scope(user: dict, db: Session) -> list[str] | None:
    """Students whose crisis events this staff member may see. None means all.

    Only the super admin sees every campus. Anyone else who reaches here (a
    counsellor) sees their own campus only: a crisis event carries a student's
    name and contact, and another college's students are not theirs to follow
    up. Fails closed through campus_scope (no campus recorded → 403).
    """
    if user["role"] == "SUPER_ADMIN":
        return None
    # Imported here: workflow_api and emergency_api are heavier modules, and this
    # keeps clinical_api importable on its own.
    from services.emergency_api import _student_campus
    from services.workflow_api import _campus_key, campus_scope
    scope = campus_scope(user, db)
    if not scope:
        return []
    ids = db.scalars(select(M.CrisisEvent.account_id).distinct()).all()
    accounts = db.scalars(select(M.Account).where(M.Account.id.in_(ids))).all() if ids else []
    return [a.id for a in accounts if _campus_key(_student_campus(db, a)) == scope]


@router.get("/ops/crisis-events")
def crisis_events(
    outcome: str = Query("", max_length=24),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_crisis_follow_up),
    db: Session = Depends(workflow_db),
):
    """Follow-up queue. Counsellors (own campus) and the super admin only, and
    never exposes what the student wrote."""
    statement = select(M.CrisisEvent)
    campus_accounts = _crisis_accounts_in_scope(user, db)
    if campus_accounts is not None:
        statement = statement.where(M.CrisisEvent.account_id.in_(campus_accounts))
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
        "pending": db.scalar(select(func.count()).select_from(
            select(M.CrisisEvent).where(M.CrisisEvent.outcome == "PENDING",
                                        *([M.CrisisEvent.account_id.in_(campus_accounts)] if campus_accounts is not None else [])).subquery())) or 0,
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
def acknowledge_crisis(event_id: str, body: CrisisAcknowledge, user=Depends(require_crisis_follow_up), db: Session = Depends(workflow_db)):
    row = db.get(M.CrisisEvent, event_id)
    campus_accounts = _crisis_accounts_in_scope(user, db)
    if not row or (campus_accounts is not None and row.account_id not in campus_accounts):
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


def fulfilment_prescription_payload(row: M.Prescription, items: list[M.PrescriptionItem]) -> dict:
    """What a pharmacy needs to fill a prescription: the items and the prescriber's registration.

    prescription_payload is the clinical view; a partner never gets the patient id,
    advice or allergy check from it.
    """
    full = prescription_payload(row, items)
    return {key: full[key] for key in ("id", "prescriberRegNo", "issuedAt", "validUntil", "status", "items")}


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
    # A clinician prescribes only for someone in their care: a confirmed or
    # completed appointment with them. Fail closed — no relationship, no Rx.
    in_care = db.scalar(select(M.Appointment.id).where(
        M.Appointment.provider_id == user["id"], M.Appointment.account_id == body.patientId,
        M.Appointment.status.in_(("CONFIRMED", "COMPLETED"))).limit(1))
    if not in_care:
        raise HTTPException(403, "You can prescribe only for a patient with a confirmed or completed appointment with you.")

    # A prescription may be linked to a visit note only if this doctor wrote that
    # note about this patient: never to another clinician's note, never to
    # another student's (the student reads it from their visit summary).
    encounter_id = body.encounterId.strip()
    if encounter_id:
        note = db.get(M.EncounterNote, encounter_id)
        if not note or note.account_id != user["id"] or note.patient_id != body.patientId:
            raise HTTPException(422, "Link the prescription to one of your own notes for this patient, or to none.")

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
        id=new_id(), encounter_id=encounter_id, prescriber_id=user["id"],
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


def _load_items(db: Session, prescription_ids: list[str | None]) -> dict[str, list[M.PrescriptionItem]]:
    # A dispense of an uploaded prescription has no prescription id and no items.
    prescription_ids = [p for p in prescription_ids if p]
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
        "source": "UPLOAD" if row.uploaded_document_id else "IN_APP",
        "uploadedPrescriptionId": row.uploaded_document_id,
        "patientId": row.patient_id, "status": row.status, "verifiedBy": row.verified_by,
        "verifiedAt": row.verified_at, "substitutionNote": row.substitution_note,
        "rejectionReason": row.rejection_reason, "delivery": row.delivery or {},
        "createdAt": row.created_at, "updatedAt": row.updated_at,
        "nextStates": F.next_dispense_states(row.status),
    }


class DispenseRequest(StrictModel):
    """Exactly one source: an in-app prescription, or the student's own uploaded one."""
    prescriptionId: str = Field(default="", max_length=80)
    uploadedPrescriptionId: str = Field(default="", max_length=80)
    pharmacyId: str = Field(max_length=80)
    delivery: dict = Field(default_factory=dict)


def _active_pharmacy(db: Session, pharmacy_id: str) -> M.ServiceProvider:
    pharmacy = db.get(M.ServiceProvider, pharmacy_id)
    if not pharmacy or pharmacy.kind != "PHARMACY" or not pharmacy.active:
        raise HTTPException(404, "No such active pharmacy.")
    return pharmacy


@router.post("/dispenses", status_code=201)
def request_dispense(body: DispenseRequest, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """A patient sends their own prescription to a chosen pharmacy."""
    prescription_id, upload_id = body.prescriptionId.strip(), body.uploadedPrescriptionId.strip()
    if bool(prescription_id) == bool(upload_id):
        raise HTTPException(422, "Send one prescription: an in-app prescription or an uploaded one.")
    if upload_id:
        return _request_uploaded_dispense(upload_id, body, user, db)

    prescription = db.get(M.Prescription, prescription_id)
    if not prescription or prescription.patient_id != user["id"]:
        raise HTTPException(404, "No such prescription on your account.")
    if prescription.valid_until and prescription.valid_until < time.time():
        raise HTTPException(409, "This prescription has expired. Ask your clinician to reissue it.")

    pharmacy = _active_pharmacy(db, body.pharmacyId)

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
    """The pharmacy's own incoming queue. A vendor never sees another vendor's.

    Only pharmacies have a queue, and it carries fulfilment fields only — the same
    view as the pharmacist review (Rule L): no patient id, advice or allergy record.
    """
    mine = _own_provider_ids(db, user, "PHARMACY")
    if not mine:
        return {"items": [], "total": 0}
    statement = select(M.Dispense).where(M.Dispense.pharmacy_id.in_(mine))
    if status.strip():
        statement = statement.where(M.Dispense.status == status.strip())
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.Dispense.created_at.desc()).offset(offset).limit(limit)).all()
    grouped = _load_items(db, [r.prescription_id for r in rows])
    prescriptions = {p.id: p for p in db.scalars(select(M.Prescription).where(M.Prescription.id.in_([r.prescription_id for r in rows if r.prescription_id]))).all()} if rows else {}
    uploads = _upload_mimes(db, rows)
    return {
        "items": [{
            **dispense_payload(row),
            "prescription": fulfilment_prescription_payload(prescriptions[row.prescription_id],
                                                            grouped.get(row.prescription_id, []))
            if row.prescription_id in prescriptions else None,
            # The paper prescription, viewable through a short-lived link while the
            # dispense is open. Nothing else from the student's vault.
            "uploadedPrescription": _upload_view(row, uploads[row.uploaded_document_id], user)
            if row.uploaded_document_id in uploads and row.status not in F.DISPENSE_TERMINAL else None,
        } for row in rows],
        "total": total or 0,
    }


# care_dispenses.rejection_reason is String(300).
DISPENSE_REJECTION_MAX = M.Dispense.__table__.c.rejection_reason.type.length


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
        if row.uploaded_document_id and not _viewed_upload(db, user, row):
            raise HTTPException(409, "Open the uploaded prescription before verifying it.")
        row.verified_by = body.pharmacistName.strip()
        row.verified_at = time.time()
    if body.status == "SUBSTITUTION_PROPOSED":
        if not body.note.strip():
            raise HTTPException(422, "Describe the proposed substitution.")
        row.substitution_note = body.note.strip()
    if body.status == "REJECTED":
        if not body.note.strip():
            raise HTTPException(422, "Give the patient a reason for the rejection.")
        # `note` allows 500 for a substitution note; the rejection column holds 300.
        # Postgres would refuse a longer value at commit, so refuse it here instead.
        if len(body.note.strip()) > DISPENSE_REJECTION_MAX:
            raise HTTPException(422, f"Keep the rejection reason to {DISPENSE_REJECTION_MAX} characters.")
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
# Pharmacist prescription review
# ══════════════════════════════════════════════════════════════════════════════
#
# The review queue is the pharmacy's own RX_ISSUED dispenses, read from the same
# durable rows as /work/dispenses. Approving is the RX_ISSUED -> RX_VERIFIED
# transition and rejecting is RX_ISSUED -> REJECTED, both through advance_dispense,
# so there is no second store and no second set of rules.

def require_pharmacy(user=Depends(require_staff)):
    # A prescription review is a pharmacy act. Campus admins, doctors and platform
    # admins have no reason to read a pharmacy's queue (Rule L).
    if user["role"] != "VENDOR":
        raise HTTPException(403, "Prescription review is limited to partner pharmacies.")
    return user


def _own_pharmacy_ids(db: Session, user: dict) -> list[str]:
    return _own_provider_ids(db, user, "PHARMACY")


def rx_review_payload(row: M.Dispense, prescription: M.Prescription, items: list[M.PrescriptionItem]) -> dict:
    """Only what a pharmacist needs to check a prescription.

    No patient identifier, advice, encounter or allergy record: Rule L keeps a
    partner to fulfilment data. The pharmacist confirms identity and allergies with
    the student in person.
    """
    return {
        "dispenseId": row.id,
        "receivedAt": row.created_at,
        "prescriberRegNo": prescription.prescriber_reg_no,
        "issuedAt": prescription.issued_at,
        "validUntil": prescription.valid_until,
        "expired": bool(prescription.valid_until and prescription.valid_until < time.time()),
        "items": [{
            "id": i.id, "genericName": i.generic_name, "brandName": i.brand_name,
            "strength": i.strength, "form": i.form, "dose": i.dose, "frequency": i.frequency,
            "durationDays": i.duration_days, "quantity": i.quantity,
            "scheduleClass": i.schedule_class, "registerRequired": i.schedule_class in REGISTER_CLASSES,
            "substitutionAllowed": i.substitution_allowed,
        } for i in items],
    }


def _pending_review(db: Session, user: dict, dispense_id: str) -> M.Dispense:
    """A dispense of this pharmacy's still awaiting review. Another pharmacy's is indistinguishable from absent."""
    row = db.get(M.Dispense, dispense_id)
    if not row or row.pharmacy_id not in _own_pharmacy_ids(db, user):
        raise HTTPException(404, "Prescription review not found.")
    if row.status != F.DISPENSE_START:
        raise HTTPException(409, "This prescription has already been reviewed.")
    return row


@router.get("/v1/pharmacy/rx-reviews")
def rx_review_queue(
    limit: int = Query(100, ge=1, le=200),
    user=Depends(require_pharmacy),
    db: Session = Depends(workflow_db),
):
    """Prescriptions sent to this pharmacy that no pharmacist has checked yet. Oldest first."""
    mine = _own_pharmacy_ids(db, user)
    if not mine:
        return {"reviews": [], "total": 0}
    # In-app prescriptions only; uploads are /v1/pharmacy/rx-reviews/uploads.
    rows = db.scalars(select(M.Dispense).where(
        M.Dispense.pharmacy_id.in_(mine), M.Dispense.status == F.DISPENSE_START,
        M.Dispense.prescription_id.is_not(None),
    ).order_by(M.Dispense.created_at.asc()).limit(limit)).all()
    prescriptions = {p.id: p for p in db.scalars(select(M.Prescription).where(
        M.Prescription.id.in_([r.prescription_id for r in rows]))).all()} if rows else {}
    grouped = _load_items(db, list(prescriptions))
    reviews = [rx_review_payload(r, prescriptions[r.prescription_id], grouped.get(r.prescription_id, []))
               for r in rows if r.prescription_id in prescriptions]
    return {"reviews": reviews, "total": len(reviews)}


class RxReviewChecks(StrictModel):
    """The five checks on the review screen. Every one must be ticked to approve."""
    prescriberRegistration: bool = False
    prescriptionDate: bool = False
    patientMatches: bool = False
    allergyChecked: bool = False
    scheduleLogged: bool = False


class RxReviewApproval(StrictModel):
    pharmacistName: str = Field(max_length=120)
    checks: RxReviewChecks


class RxReviewRejection(StrictModel):
    # care_dispenses.rejection_reason is 300 characters.
    reason: str = Field(max_length=300)


@router.post("/v1/pharmacy/rx-reviews/{dispense_id}/approve")
def approve_rx_review(dispense_id: str, body: RxReviewApproval, user=Depends(require_pharmacy),
                      db: Session = Depends(workflow_db)):
    """A named pharmacist verifies the prescription: RX_ISSUED -> RX_VERIFIED."""
    row = _pending_review(db, user, dispense_id)
    if not all(body.checks.model_dump().values()):
        raise HTTPException(422, "Every pharmacist check must be ticked before approving.")
    # A paper prescription carries no validity date the server can read: the
    # pharmacist's prescriptionDate check is that judgement, and advance_dispense
    # refuses to verify one this pharmacist never opened.
    if not row.uploaded_document_id:
        prescription = db.get(M.Prescription, row.prescription_id) if row.prescription_id else None
        if not prescription or (prescription.valid_until and prescription.valid_until < time.time()):
            # An expired prescription is rejected with a reason, never verified.
            raise HTTPException(409, "This prescription has expired and cannot be verified.")
    # advance_dispense owns the lifecycle, the named-pharmacist rule, the patient
    # notice, the ops_feed event and the audit row.
    return advance_dispense(row.id, DispenseTransition(status="RX_VERIFIED", pharmacistName=body.pharmacistName),
                            user, db)


@router.post("/v1/pharmacy/rx-reviews/{dispense_id}/reject")
def reject_rx_review(dispense_id: str, body: RxReviewRejection, user=Depends(require_pharmacy),
                     db: Session = Depends(workflow_db)):
    """The pharmacist rejects the prescription with a reason the student is told."""
    row = _pending_review(db, user, dispense_id)
    # advance_dispense requires the reason and publishes the ops_feed event.
    return advance_dispense(row.id, DispenseTransition(status="REJECTED", note=body.reason), user, db)


# ══════════════════════════════════════════════════════════════════════════════
# Uploaded paper prescriptions
# ══════════════════════════════════════════════════════════════════════════════
#
# A student photographs or scans a paper prescription from an outside doctor. It
# is stored in their own vault (care_documents, category OUTSIDE_PRESCRIPTION) and
# nothing is read out of it: there is no OCR or model here, so the record has no
# items and no claimed doctor, date or medicine. The student may send it to one
# pharmacy (a dispense whose source is the document); that pharmacy's pharmacist
# views it through a short-lived link bound to their account and the dispense,
# every view is audited, and approval stays the five-check, named-pharmacist
# verification. The review flow has no way to record items against a dispense
# (care_dispense_items needs an in-app prescription item), so approval of an
# upload is verify-only: no transcription is stored.
#
# Rule L: none of this is reachable from commerce code. It runs on workflow_db,
# never commerce_db, and the shop never sees an upload.

UPLOAD_CATEGORY = "OUTSIDE_PRESCRIPTION"
UPLOAD_MAX_BYTES = 10 * 1024 * 1024
UPLOAD_VIEW_SECONDS = 300
UPLOAD_EXTENSIONS = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}
_VIEW_PURPOSE = "rx-upload-view"


def _require_student(user: dict) -> None:
    if user.get("role") != "STUDENT":
        raise HTTPException(403, "Only a student can upload or send their own prescription.")


def _own_upload(db: Session, user: dict, document_id: str) -> M.Document:
    """The student's own uploaded prescription. Any other document is indistinguishable from absent."""
    document = db.scalar(select(M.Document).where(
        M.Document.id == document_id, M.Document.account_id == user["id"],
        M.Document.category == UPLOAD_CATEGORY))
    if not document:
        raise HTTPException(404, "No such uploaded prescription on your account.")
    return document


def _view_signature(dispense: M.Dispense, account_id: str, expires: int) -> str:
    message = f"{dispense.id}|{dispense.uploaded_document_id}|{account_id}|{expires}".encode()
    return base64.urlsafe_b64encode(hmac.new(purpose_key(_VIEW_PURPOSE), message, hashlib.sha256).digest()).decode().rstrip("=")


def _upload_view(dispense: M.Dispense, mime_type: str, user: dict) -> dict:
    """A link only this pharmacy account can use, for this dispense, for five minutes."""
    expires = int(time.time()) + UPLOAD_VIEW_SECONDS
    token = f"{expires}.{_view_signature(dispense, user['id'], expires)}"
    return {"mimeType": mime_type, "viewPath": f"/v1/pharmacy/rx-reviews/{dispense.id}/document?token={token}",
            "expiresAt": expires}


def _upload_mimes(db: Session, rows) -> dict[str, str]:
    ids = [r.uploaded_document_id for r in rows if r.uploaded_document_id]
    if not ids:
        return {}
    return dict(db.execute(select(M.Document.id, M.Document.mime_type).where(M.Document.id.in_(ids))).all())


def _viewed_upload(db: Session, user: dict, dispense: M.Dispense) -> bool:
    return bool(db.scalar(select(M.WorkflowAudit.id).where(
        M.WorkflowAudit.action == "RX_UPLOAD_VIEWED", M.WorkflowAudit.resource_id == dispense.id,
        M.WorkflowAudit.actor_id == user["id"]).limit(1)))


def upload_payload(document: M.Document, dispense: M.Dispense | None = None) -> dict:
    return {
        "id": document.id, "title": document.title, "category": document.category,
        "mimeType": document.mime_type, "createdAt": document.created_at,
        # Stated, not implied: nothing was read out of the file.
        "itemsExtracted": False,
        "dispense": dispense_payload(dispense) if dispense else None,
    }


@router.post("/prescriptions/uploads", status_code=201)
def upload_prescription(file: UploadFile = File(...), user=Depends(authenticated_user),
                        db: Session = Depends(workflow_db)):
    """A student stores a photo or PDF of a paper prescription in their own vault."""
    _require_student(user)
    rate_limit(db, f"rx-upload:{user['id']}", 20, 3600)
    content = file.file.read(UPLOAD_MAX_BYTES + 1)
    if len(content) > UPLOAD_MAX_BYTES:
        raise HTTPException(413, "Prescriptions must be 10 MB or smaller.")
    magic = REPORT_TYPES.get(file.content_type or "")
    if not magic or not content.startswith(magic):
        raise HTTPException(422, "Upload the prescription as a JPG, PNG or PDF file.")
    # Fail closed in every environment: no scanner, no upload. (The lab-report and
    # vault paths let development/test through when ClamAV is unreachable.)
    security_scanner.scan_file_for_viruses(content, allow_offline_bypass=False)

    now = time.time()
    document = M.Document(
        id=new_id(), account_id=user["id"], title="Prescription from an outside doctor", category=UPLOAD_CATEGORY,
        filename=re.sub(r"[^a-zA-Z0-9._ -]", "_", (file.filename or "prescription").replace("\\", "/").split("/")[-1])[:180],
        mime_type=file.content_type or "", content=content, created_at=now,
    )
    db.add(document)
    audit(db, user["id"], "RX_UPLOADED", document.id)
    db.commit()
    return upload_payload(document)


@router.get("/prescriptions/uploads")
def my_uploaded_prescriptions(
    limit_: int = Query(20, ge=1, le=100, alias="limit"),
    offset: int = Query(0, ge=0),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    """The signed-in student's own uploads, each with its latest dispense if it was sent."""
    _require_student(user)
    statement = select(M.Document).where(M.Document.account_id == user["id"], M.Document.category == UPLOAD_CATEGORY)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    documents = db.scalars(statement.order_by(M.Document.created_at.desc()).offset(offset).limit(limit_)).all()
    latest: dict[str, M.Dispense] = {}
    if documents:
        for row in db.scalars(select(M.Dispense).where(
                M.Dispense.uploaded_document_id.in_([d.id for d in documents]),
                M.Dispense.patient_id == user["id"]).order_by(M.Dispense.created_at)).all():
            latest[row.uploaded_document_id] = row
    return {"items": [upload_payload(d, latest.get(d.id)) for d in documents], "total": total or 0}


def _request_uploaded_dispense(upload_id: str, body: DispenseRequest, user: dict, db: Session) -> dict:
    _require_student(user)
    document = _own_upload(db, user, upload_id)
    pharmacy = _active_pharmacy(db, body.pharmacyId)
    existing = db.scalar(select(M.Dispense.id).where(
        M.Dispense.uploaded_document_id == document.id,
        M.Dispense.status.not_in(tuple(F.DISPENSE_TERMINAL))))
    if existing:
        raise HTTPException(409, "This prescription is already with a pharmacy.")
    now = time.time()
    row = M.Dispense(
        id=new_id(), prescription_id=None, uploaded_document_id=document.id, pharmacy_id=pharmacy.id,
        patient_id=user["id"], status=F.DISPENSE_START, delivery=body.delivery or {},
        created_at=now, updated_at=now,
    )
    db.add(row)
    ops_feed.publish(
        db, "DISPENSE_REQUESTED", "PHARMACY",
        summary="Uploaded prescription sent to pharmacy · awaiting pharmacist verification",
        actor_id=user["id"], actor_role=user["role"], subject_id=user["id"],
        provider_id=pharmacy.id, resource_type="dispense", resource_id=row.id,
    )
    audit(db, user["id"], "DISPENSE_REQUESTED", row.id)
    db.commit()
    return dispense_payload(row)


@router.get("/v1/pharmacy/rx-reviews/uploads")
def rx_upload_review_queue(
    limit_: int = Query(100, ge=1, le=200, alias="limit"),
    user=Depends(require_pharmacy),
    db: Session = Depends(workflow_db),
):
    """Uploaded paper prescriptions sent to this pharmacy and not yet reviewed. Oldest first.

    No patient identifier, no other vault document, no extracted items (there are
    none): the dispense, when it arrived, and a five-minute link to the file.
    """
    mine = _own_pharmacy_ids(db, user)
    if not mine:
        return {"reviews": [], "total": 0}
    rows = db.scalars(select(M.Dispense).where(
        M.Dispense.pharmacy_id.in_(mine), M.Dispense.status == F.DISPENSE_START,
        M.Dispense.uploaded_document_id.is_not(None),
    ).order_by(M.Dispense.created_at.asc()).limit(limit_)).all()
    mimes = _upload_mimes(db, rows)
    reviews = [{"dispenseId": r.id, "receivedAt": r.created_at, "source": "UPLOAD",
                "document": _upload_view(r, mimes[r.uploaded_document_id], user)}
               for r in rows if r.uploaded_document_id in mimes]
    return {"reviews": reviews, "total": len(reviews)}


@router.get("/v1/pharmacy/rx-reviews/{dispense_id}/document")
def uploaded_prescription_file(dispense_id: str, token: str = Query(..., max_length=200),
                               user=Depends(require_pharmacy), db: Session = Depends(workflow_db)):
    """The uploaded file, for the pharmacy the student sent it to, while its link is fresh."""
    row = db.get(M.Dispense, dispense_id)
    if (not row or not row.uploaded_document_id or row.pharmacy_id not in _own_pharmacy_ids(db, user)
            or row.status in F.DISPENSE_TERMINAL):
        raise HTTPException(404, "Uploaded prescription not found.")
    expires_raw, _, signature = token.partition(".")
    if not expires_raw.isdigit() or not signature or not hmac.compare_digest(
            _view_signature(row, user["id"], int(expires_raw)), signature):
        raise HTTPException(403, "This link is not valid for your account.")
    if int(expires_raw) < time.time():
        raise HTTPException(410, "This link has expired. Reopen the prescription for a new one.")
    document = db.get(M.Document, row.uploaded_document_id)
    if not document or document.account_id != row.patient_id or document.category != UPLOAD_CATEGORY:
        raise HTTPException(404, "Uploaded prescription not found.")
    audit(db, user["id"], "RX_UPLOAD_VIEWED", row.id)
    db.commit()
    extension = UPLOAD_EXTENSIONS.get(document.mime_type, "")
    return Response(content=document.content, media_type=document.mime_type or "application/octet-stream", headers={
        "Cache-Control": "no-store", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        # Never the student's own filename: it can carry their name.
        "Content-Disposition": f'inline; filename="prescription{extension}"',
    })


# ══════════════════════════════════════════════════════════════════════════════
# Lab orders
# ══════════════════════════════════════════════════════════════════════════════

def lab_payload(row: M.LabOrder, for_patient: bool = False) -> dict:
    payload = {
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
        "hasHeldReport": row.report_content is not None,
        "reviewerId": row.reviewer_id, "reviewedAt": row.reviewed_at or None, "reviewNote": row.review_note,
        "awaitingDoctorReview": row.status == "REPORT_READY",
        "createdAt": row.created_at, "updatedAt": row.updated_at,
        # Release is the reviewing doctor's step (/work/lab-reviews/{id}/release),
        # never offered as a lab action.
        "nextStates": [s for s in F.next_lab_states(row.status) if s != "REPORT_RELEASED"],
    }
    if for_patient and row.status != "REPORT_RELEASED":
        # Nothing about the result reaches the student before a doctor has
        # reviewed and released it — not even that a value was flagged critical.
        payload.update(reportDocumentId="", criticalFlag=False, criticalNote="",
                       criticalAcknowledgedAt=None, criticalAcknowledgedBy="", hasHeldReport=False,
                       reviewNote="", nextStates=[s for s in payload["nextStates"] if s in F.LAB_PATIENT_TRANSITIONS])
    return payload


def operational_lab_payload(row: M.LabOrder) -> dict:
    """Where an order is stuck, without anything clinical about it."""
    return {"id": row.id, "labId": row.lab_id, "testPanel": row.test_panel or [],
            "collectionMode": row.collection_mode, "slotStart": row.slot_start,
            "collectorName": row.collector_name, "status": row.status,
            "createdAt": row.created_at, "updatedAt": row.updated_at}


def _doctor_may_review(db: Session, user: dict, row: M.LabOrder) -> bool:
    """A doctor may review a result they were assigned, ordered, or whose patient is in their care.

    An assignment is exclusive: once a reviewer is named, only they may act.
    Fails closed — no relationship, no access to the result.
    """
    if user.get("role") != "NMC_DOCTOR":
        return False
    if row.reviewer_id:
        return row.reviewer_id == user["id"]
    if row.ordered_by == user["id"]:
        return True
    return bool(db.scalar(select(M.Appointment.id).where(
        M.Appointment.provider_id == user["id"], M.Appointment.account_id == row.patient_id,
        M.Appointment.status.in_(("CONFIRMED", "COMPLETED"))).limit(1)))


class LabOrderInput(StrictModel):
    labId: str = Field(max_length=80)
    testPanel: list[str] = Field(min_length=1, max_length=30)
    collectionMode: str = Field(default="WALK_IN", max_length=12)
    slotStart: str = Field(default="", max_length=40)
    fastingRequired: bool = False
    clinicalIndication: str = Field(default="", max_length=500)
    prescriptionId: str = Field(default="", max_length=80)
    catalogItemId: str = Field(default="", max_length=80)

    @field_validator("collectionMode")
    @classmethod
    def known_mode(cls, value: str) -> str:
        if value not in ("HOME", "WALK_IN"):
            raise ValueError("Collection mode must be HOME or WALK_IN.")
        return value


def _lab_catalog_ids(db: Session, lab: M.ServiceProvider, names: list[str]) -> list[str]:
    """Active catalogue tests this lab's account offers under these names."""
    if not lab.account_id or not names:
        return []
    return list(db.scalars(select(M.CatalogEntry.id).where(
        M.CatalogEntry.provider_id == lab.account_id, M.CatalogEntry.kind == "lab",
        M.CatalogEntry.active.is_(True), M.CatalogEntry.name.in_(names))).all())


@router.post("/lab-orders", status_code=201)
def book_lab_order(body: LabOrderInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Book a diagnostic test. Unlike the previous booking endpoint, this persists."""
    lab = db.get(M.ServiceProvider, body.labId)
    if not lab or lab.kind != "LAB" or not lab.active:
        raise HTTPException(404, "No such active laboratory.")
    if body.collectionMode == "HOME" and not lab.home_collection:
        raise HTTPException(409, "This laboratory does not offer home sample collection.")
    catalog_item_id = body.catalogItemId.strip() or None
    if catalog_item_id:
        item = db.get(M.CatalogEntry, catalog_item_id)
        if not item or item.kind != "lab" or not item.active or item.provider_id != lab.account_id:
            raise HTTPException(404, "This laboratory does not offer that test.")
    elif len(body.testPanel) == 1:
        # Record the link once, at booking, when the name identifies exactly one test.
        matches = _lab_catalog_ids(db, lab, body.testPanel)
        catalog_item_id = matches[0] if len(matches) == 1 else None

    row = M.LabOrder(
        id=new_id(), prescription_id=body.prescriptionId.strip(), patient_id=user["id"], lab_id=lab.id,
        catalog_item_id=catalog_item_id,
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
    return lab_payload(row, for_patient=True)


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
    doctors = _ordering_doctor_names(db, rows)
    return {"items": [{**lab_payload(r, for_patient=True), "orderedByDoctor": doctors.get(r.ordered_by, "")}
                      for r in rows], "total": total or 0}


def _ordering_doctor_names(db: Session, rows) -> dict[str, str]:
    """Names of the doctors who ordered these tests. A self-booked test has none."""
    ids = {r.ordered_by for r in rows if r.ordered_by and r.ordered_by != r.patient_id}
    if not ids:
        return {}
    return {a.id: a.full_name for a in db.scalars(select(M.Account).where(
        M.Account.id.in_(ids), M.Account.role == "NMC_DOCTOR")).all()}


# ── The student chooses when their sample is collected ────────────────────────
#
# Rule L: choosing a time is not a purchase. No price is read or returned and
# nothing is charged. The slots are the ones the lab published for this test.

def _own_booked_order(db: Session, user: dict, order_id: str) -> M.LabOrder:
    """The student's own order, still BOOKED. Someone else's order is a 404, never a 403."""
    row = db.get(M.LabOrder, order_id)
    if not row or row.patient_id != user["id"]:
        raise HTTPException(404, "Lab order not found.")
    if row.status != F.LAB_START:
        raise HTTPException(409, "The laboratory has already scheduled this collection. Contact them to change it.")
    return row


def _order_slots(db: Session, row: M.LabOrder) -> list[M.AvailabilitySlot]:
    """Active slots the order's lab published for the test on this order.

    Uses the recorded catalogue test; only rows from before it was recorded
    fall back to matching the test by name.
    """
    lab = db.get(M.ServiceProvider, row.lab_id)
    if not lab or not lab.account_id:
        return []
    item_ids = [row.catalog_item_id] if row.catalog_item_id else _lab_catalog_ids(db, lab, list(row.test_panel or []))
    if not item_ids:
        return []
    return list(db.scalars(select(M.AvailabilitySlot).where(
        M.AvailabilitySlot.catalog_item_id.in_(item_ids), M.AvailabilitySlot.provider_id == lab.account_id,
        M.AvailabilitySlot.active.is_(True)).order_by(M.AvailabilitySlot.slot_start, M.AvailabilitySlot.id)).all())


def _is_future(slot: M.AvailabilitySlot, now: float) -> bool:
    start = F.parse_slot(slot.slot_start)
    return start is not None and start > now


def _student_lab_payload(db: Session, row: M.LabOrder) -> dict:
    return {**lab_payload(row, for_patient=True),
            "orderedByDoctor": _ordering_doctor_names(db, [row]).get(row.ordered_by, "")}


@router.get("/lab-orders/{order_id}/slots")
def lab_order_slots(order_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Collection times the student can choose for their own BOOKED order. Times only, no price."""
    row = _own_booked_order(db, user, order_id)
    now = time.time()
    return {"slots": [{"id": s.id, "slotStart": s.slot_start, "slotEnd": s.slot_end, "capacity": s.capacity,
                       "booked": s.booked, "available": max(0, s.capacity - s.booked)}
                      for s in _order_slots(db, row) if _is_future(s, now) and s.booked < s.capacity]}


class LabSlotChoice(StrictModel):
    slotId: str = Field(min_length=1, max_length=80)


@router.put("/lab-orders/{order_id}/slot")
def choose_lab_order_slot(order_id: str, body: LabSlotChoice, user=Depends(authenticated_user),
                          db: Session = Depends(workflow_db)):
    """Set or change the collection time on the student's own order, only while it is BOOKED.

    Capacity on the lab's published slot is reserved, and the previous slot's
    place is given back. Audited, and the lab sees it in its ops feed.
    """
    row = _own_booked_order(db, user, order_id)
    slots = _order_slots(db, row)
    slot = next((s for s in slots if s.id == body.slotId), None)
    if not slot:
        raise HTTPException(404, "That time is not offered for this test.")
    if not _is_future(slot, time.time()):
        raise HTTPException(409, "That time has passed. Choose another.")
    previous = row.slot_start
    previous_slot_id = row.slot_id
    if (previous_slot_id or None) == slot.id or (not previous_slot_id and previous == slot.slot_start):
        return _student_lab_payload(db, row)

    reserved = db.execute(update(M.AvailabilitySlot).where(
        M.AvailabilitySlot.id == slot.id, M.AvailabilitySlot.booked < M.AvailabilitySlot.capacity)
        .values(booked=M.AvailabilitySlot.booked + 1)).rowcount
    if not reserved:
        db.rollback()
        raise HTTPException(409, "That time was just taken. Choose another.")
    # The lab may have assigned a collector since the order was read: only a
    # still-BOOKED order takes the new time.
    moved = db.execute(update(M.LabOrder).where(M.LabOrder.id == row.id, M.LabOrder.status == F.LAB_START)
                       .values(slot_start=slot.slot_start, slot_id=slot.id, updated_at=time.time())).rowcount
    if not moved:
        db.rollback()
        raise HTTPException(409, "The laboratory has already scheduled this collection. Contact them to change it.")
    # Give back the place held before: by its recorded slot, or for rows from
    # before slot ids were kept, by matching the start time.
    held_id = previous_slot_id or next(
        (s.id for s in slots if previous and s.slot_start == previous and s.id != slot.id), None)
    if held_id and held_id != slot.id:
        db.execute(update(M.AvailabilitySlot).where(M.AvailabilitySlot.id == held_id, M.AvailabilitySlot.booked > 0)
                   .values(booked=M.AvailabilitySlot.booked - 1))

    action = "LAB_ORDER_SLOT_CHANGED" if previous else "LAB_ORDER_SLOT_CHOSEN"
    ops_feed.publish(
        db, action, "LAB",
        summary="Collection time changed by the student" if previous else "Collection time chosen by the student",
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], action, row.id)
    db.commit()
    db.refresh(row)
    return _student_lab_payload(db, row)


# ── A doctor orders a test for a patient in their care ────────────────────────
#
# Rule L: this is a clinical order, not a sale. The doctor never sees or sets a
# price, nothing is charged here (payments are not connected; a student's own
# booking is a saved request too), and the student is told only that a test was
# ordered — the indication stays in the record, not in the notification.

def _orderable_labs(db: Session, item: M.CatalogEntry) -> list[M.ServiceProvider]:
    return list(db.scalars(select(M.ServiceProvider).where(
        M.ServiceProvider.account_id == item.provider_id, M.ServiceProvider.kind == "LAB",
        M.ServiceProvider.active.is_(True)).order_by(M.ServiceProvider.id)).all())


@router.get("/work/lab-tests")
def orderable_lab_tests(user=Depends(require_clinician), db: Session = Depends(workflow_db)):
    """Catalogue tests a doctor can order — names and preparation only, never a price."""
    items = db.scalars(select(M.CatalogEntry).where(M.CatalogEntry.kind == "lab", M.CatalogEntry.active.is_(True))
                       .order_by(M.CatalogEntry.name, M.CatalogEntry.id)).all()
    tests = []
    for item in items:
        labs = _orderable_labs(db, item)
        if labs:
            tests.append({"id": item.id, "name": item.name, "preparation": item.preparation,
                          "labName": labs[0].legal_name, "homeCollection": labs[0].home_collection})
    return {"items": tests, "total": len(tests)}


class DoctorLabOrderInput(StrictModel):
    patientId: str = Field(min_length=1, max_length=80)
    catalogItemId: str = Field(min_length=1, max_length=80)
    collectionMode: str = Field(default="WALK_IN", max_length=12)
    fastingRequired: bool = False
    clinicalIndication: str = Field(max_length=500)

    @field_validator("collectionMode")
    @classmethod
    def known_mode(cls, value: str) -> str:
        if value not in ("HOME", "WALK_IN"):
            raise ValueError("Collection mode must be HOME or WALK_IN.")
        return value

    @field_validator("clinicalIndication")
    @classmethod
    def typed_indication(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Type the clinical indication for this test.")
        return value


@router.post("/work/doctor-lab-orders", status_code=201)
def order_lab_for_patient(body: DoctorLabOrderInput, user=Depends(require_clinician),
                          db: Session = Depends(workflow_db)):
    """A doctor orders a catalogue test for a patient in their care.

    The doctor is recorded as the ordering doctor, so they review the report by
    default. Fails closed: no confirmed or completed appointment, no order.
    """
    in_care = db.scalar(select(M.Appointment.id).where(
        M.Appointment.provider_id == user["id"], M.Appointment.account_id == body.patientId,
        M.Appointment.status.in_(("CONFIRMED", "COMPLETED"))).limit(1))
    if not in_care:
        raise HTTPException(403, "You can order tests only for a patient with a confirmed or completed appointment with you.")
    item = db.get(M.CatalogEntry, body.catalogItemId)
    if not item or item.kind != "lab" or not item.active:
        raise HTTPException(404, "No such test in the catalogue.")
    labs = _orderable_labs(db, item)
    if not labs:
        raise HTTPException(409, "No laboratory is taking orders for this test yet.")
    lab = labs[0]
    if body.collectionMode == "HOME" and not lab.home_collection:
        raise HTTPException(409, "This laboratory does not offer hostel sample collection.")

    now = time.time()
    row = M.LabOrder(
        id=new_id(), prescription_id="", patient_id=body.patientId, lab_id=lab.id, catalog_item_id=item.id,
        ordered_by=user["id"], test_panel=[item.name], clinical_indication=body.clinicalIndication,
        collection_mode=body.collectionMode, slot_start="", fasting_required=body.fastingRequired,
        status=F.LAB_START, created_at=now, updated_at=now,
    )
    db.add(row)
    ops_feed.notify(
        db, body.patientId, "LAB_ORDERED_BY_DOCTOR", dedupe_key=f"lab:{row.id}:ORDERED",
        summary="Your doctor has ordered a lab test for you. See it under Prescriptions & tests.",
        resource_type="lab_order", resource_id=row.id,
    )
    ops_feed.publish(
        db, "LAB_ORDER_BOOKED", "LAB",
        summary=f"Doctor lab order · 1 test · {body.collectionMode.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user["role"], subject_id=body.patientId,
        provider_id=lab.id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], "LAB_ORDERED_BY_DOCTOR", row.id)
    db.commit()
    return {**lab_payload(row), "labName": lab.legal_name, "charged": False}


@router.get("/work/doctor-lab-orders")
def my_ordered_lab_tests(
    limit: int = Query(50, ge=1, le=100),
    user=Depends(require_clinician),
    db: Session = Depends(workflow_db),
):
    """Tests this doctor ordered, newest first, with where each one has got to.

    Status only — the held report and any critical value are read in Report reviews.
    """
    rows = db.scalars(select(M.LabOrder).where(M.LabOrder.ordered_by == user["id"],
                                                M.LabOrder.patient_id != user["id"])
                      .order_by(M.LabOrder.created_at.desc()).limit(limit)).all()
    patient_ids = {r.patient_id for r in rows}
    lab_ids = {r.lab_id for r in rows}
    names = {a.id: a.full_name for a in db.scalars(select(M.Account).where(M.Account.id.in_(patient_ids))).all()}
    labs = {p.id: p.legal_name for p in db.scalars(select(M.ServiceProvider).where(
        M.ServiceProvider.id.in_(lab_ids))).all()}
    items = [{
        "id": r.id, "patientId": r.patient_id, "patientName": names.get(r.patient_id, ""),
        "testPanel": r.test_panel or [], "clinicalIndication": r.clinical_indication,
        "collectionMode": r.collection_mode, "fastingRequired": r.fasting_required,
        "labName": labs.get(r.lab_id, ""), "status": r.status, "createdAt": r.created_at,
    } for r in rows]
    return {"items": items, "total": len(items)}


@router.get("/work/lab-orders")
def lab_queue(
    status: str = Query("", max_length=24),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_staff),
    db: Session = Depends(workflow_db),
):
    """The laboratory's own queue, critical results first. Admins never read results."""
    mine = _own_provider_ids(db, user, "LAB")
    if not mine:
        return {"items": [], "total": 0, "critical": 0}
    statement = select(M.LabOrder).where(M.LabOrder.lab_id.in_(mine))
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
        mine = _own_provider_ids(db, user, "LAB")
        if not mine:
            return {"items": [], "total": 0}
        statement = statement.where(M.LabOrder.lab_id.in_(mine))
    # The super admin chases the lab, not the patient: no indication or notes.
    payload_of = operational_lab_payload if user["role"] == "SUPER_ADMIN" else lab_payload

    now = time.time()
    items = []
    for row in db.scalars(statement.order_by(M.LabOrder.created_at)).all():
        overdue, reason = F.overdue_collection(row.status, row.slot_start, row.created_at, now)
        if not overdue:
            continue
        items.append({**payload_of(row), "overdueReason": reason,
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
    owns_lab = _owns_lab(db, user, row.lab_id)
    if not (is_patient or owns_lab):
        raise HTTPException(403, "This lab order is not yours to update.")
    if is_patient and not owns_lab and body.status not in F.LAB_PATIENT_TRANSITIONS:
        raise HTTPException(403, "You can cancel this booking; the laboratory handles the rest.")
    if body.status == "REPORT_READY":
        raise HTTPException(409, "Upload the report with POST /work/lab-orders/{id}/report; a doctor reviews it before release.")
    if body.status == "REPORT_RELEASED":
        raise HTTPException(403, "A doctor reviews and releases lab results. The laboratory cannot release them.")

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

    row.status = body.status
    row.updated_at = time.time()
    lab_message = {
        "ASSIGNED": f"{row.collector_name} will collect your sample."
                    + (" Please fast as instructed." if row.fasting_required else ""),
        "SAMPLE_COLLECTED": "Your sample has been collected.",
        "SAMPLE_REJECTED": f"Your sample could not be used: {row.rejection_reason}",
        "RECOLLECTION_REQUIRED": "A fresh sample is needed. The laboratory will arrange a new collection.",
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
    return lab_payload(row, for_patient=is_patient and not owns_lab)


REPORT_TYPES = {"application/pdf": b"%PDF-", "image/png": b"\x89PNG\r\n\x1a\n", "image/jpeg": b"\xff\xd8\xff"}


@router.post("/work/lab-orders/{order_id}/report")
def upload_lab_report(order_id: str, file: UploadFile = File(...), criticalFlag: bool = Form(False),
                      criticalNote: str = Form("", max_length=500),
                      user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """The laboratory files its report. It is held for a doctor, not sent to the student."""
    row = db.get(M.LabOrder, order_id)
    if not row:
        raise HTTPException(404, "Lab order not found.")
    if not _owns_lab(db, user, row.lab_id):
        raise HTTPException(403, "Only the laboratory doing this test can file its report.")
    try:
        F.assert_transition(F.LAB_TRANSITIONS, row.status, "REPORT_READY", "lab order")
    except F.TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc
    if not row.sample_id:
        raise HTTPException(409, "The chain of custody is broken: no sample identifier was recorded.")
    if criticalFlag and not criticalNote.strip():
        raise HTTPException(422, "Say which value is critical.")
    content = file.file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Reports must be 10 MB or smaller.")
    magic = REPORT_TYPES.get(file.content_type or "")
    if not magic or not content.startswith(magic):
        raise HTTPException(422, "Upload the report as a PDF, PNG or JPEG file.")
    from services.security_scanner import scan_file_for_viruses
    scan_file_for_viruses(content)

    row.report_content = content
    row.report_mime = file.content_type or ""
    row.report_filename = re.sub(r"[^a-zA-Z0-9._ -]", "_", (file.filename or "report").replace("\\", "/").split("/")[-1])[:180]
    row.critical_flag = bool(criticalFlag)
    row.critical_note = criticalNote.strip()
    # The ordering doctor reviews by default. A self-booked test has none, so a
    # doctor already caring for the student may pick it up, or a super admin
    # assigns one. Until then it waits: nothing is released by default.
    ordering = db.get(M.Account, row.ordered_by) if row.ordered_by else None
    if not row.reviewer_id and ordering and ordering.role == "NMC_DOCTOR":
        row.reviewer_id = ordering.id
    row.status = "REPORT_READY"
    row.updated_at = time.time()
    ops_feed.publish(
        db, "LAB_CRITICAL_VALUE" if row.critical_flag else "LAB_REPORT_AWAITING_REVIEW", "CLINICAL",
        severity="CRITICAL" if row.critical_flag else "INFO",
        summary=("Critical lab value reported — a doctor must review it before release" if row.critical_flag
                 else "Lab report filed — waiting for a doctor's review"),
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], "LAB_CRITICAL_VALUE" if row.critical_flag else "LAB_REPORT_READY", row.id)
    db.commit()
    return lab_payload(row)


@router.get("/work/lab-reviews")
def lab_reviews(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Reports waiting for a doctor, critical first.

    A doctor sees the ones they may review. A super admin sees only the ones
    nobody can review yet, to assign a doctor — not the results themselves.
    """
    rows = db.scalars(select(M.LabOrder).where(M.LabOrder.status == "REPORT_READY")
                      .order_by(M.LabOrder.critical_flag.desc(), M.LabOrder.updated_at)).all()
    now = time.time()
    if user["role"] == "NMC_DOCTOR":
        mine = [r for r in rows if _doctor_may_review(db, user, r)]
        return {"items": [{**lab_payload(r), "waitingSeconds": round(now - r.updated_at)} for r in mine], "total": len(mine)}
    if user["role"] == "SUPER_ADMIN":
        unassigned = [r for r in rows if not r.reviewer_id]
        return {"items": [{"id": r.id, "testPanel": r.test_panel or [], "criticalFlag": r.critical_flag,
                           "waitingSeconds": round(now - r.updated_at)} for r in unassigned],
                "total": len(unassigned)}
    raise HTTPException(403, "Lab reports are reviewed by doctors.")


class ReviewerAssignment(StrictModel):
    doctorId: str = Field(max_length=80)


@router.post("/work/lab-reviews/{order_id}/assign")
def assign_lab_reviewer(order_id: str, body: ReviewerAssignment, user=Depends(require_super_admin),
                        db: Session = Depends(workflow_db)):
    row = db.get(M.LabOrder, order_id)
    if not row or row.status != "REPORT_READY":
        raise HTTPException(404, "No report is waiting for review under that id.")
    doctor = db.get(M.Account, body.doctorId)
    if not doctor or doctor.role != "NMC_DOCTOR" or not doctor.active:
        raise HTTPException(422, "Assign an active doctor account.")
    row.reviewer_id = doctor.id
    row.updated_at = time.time()
    audit(db, user["id"], "LAB_REVIEWER_ASSIGNED", row.id)
    ops_feed.notify(db, doctor.id, "LAB_REVIEW_ASSIGNED", dedupe_key=f"lab-review:{row.id}:{doctor.id}",
                    summary="A lab report is waiting for your review.", resource_type="lab_order", resource_id=row.id)
    db.commit()
    return {"id": row.id, "reviewerId": row.reviewer_id}


@router.get("/work/lab-reviews/{order_id}/report")
def held_lab_report(order_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """The held report, for the reviewing doctor (or the lab that filed it)."""
    row = db.get(M.LabOrder, order_id)
    if not row or row.report_content is None:
        raise HTTPException(404, "No held report for that order.")
    if not (_doctor_may_review(db, user, row) or _owns_lab(db, user, row.lab_id)):
        raise HTTPException(403, "This report is not yours to read.")
    audit(db, user["id"], "LAB_REPORT_VIEWED", row.id)
    db.commit()
    return Response(content=row.report_content, media_type=row.report_mime or "application/octet-stream",
                    headers={"Cache-Control": "no-store", "Content-Disposition": f'inline; filename="{row.report_filename or "report"}"'})


class LabRelease(StrictModel):
    note: str = Field(min_length=3, max_length=1000)


@router.post("/work/lab-reviews/{order_id}/release")
def release_lab_report(order_id: str, body: LabRelease, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """A doctor reviews, approves and shares the report. Only now does the student receive it."""
    row = db.get(M.LabOrder, order_id)
    if not row:
        raise HTTPException(404, "Lab order not found.")
    if not _doctor_may_review(db, user, row):
        raise HTTPException(403, "Only the reviewing doctor can release this report.")
    try:
        F.assert_transition(F.LAB_TRANSITIONS, row.status, "REPORT_RELEASED", "lab order")
    except F.TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc
    if row.report_content is None:
        raise HTTPException(409, "There is no held report to release.")

    tests = ", ".join(row.test_panel or []) or "Lab test"
    document = M.Document(id=new_id(), account_id=row.patient_id, title=f"Lab report · {tests}"[:160], category="LAB",
                          filename=row.report_filename or "report", mime_type=row.report_mime, content=row.report_content,
                          created_at=time.time())
    db.add(document)
    now = time.time()
    row.report_document_id = document.id
    row.report_content = None
    row.reviewer_id = user["id"]
    row.reviewed_at = now
    row.review_note = body.note.strip()
    if row.critical_flag and not row.critical_acknowledged_at:
        row.critical_acknowledged_at = now
        row.critical_acknowledged_by = user["id"]
    row.status = "REPORT_RELEASED"
    row.updated_at = now
    ops_feed.notify(db, row.patient_id, "LAB_REPORT_RELEASED", dedupe_key=f"lab:{row.id}:REPORT_RELEASED",
                    summary="A doctor has reviewed your lab report. It's in your health vault.",
                    resource_type="lab_order", resource_id=row.id)
    ops_feed.publish(
        db, "LAB_REPORT_RELEASED", "CLINICAL", severity="INFO",
        summary="Lab report reviewed and released by a doctor",
        actor_id=user["id"], actor_role=user["role"], subject_id=row.patient_id,
        provider_id=row.lab_id, resource_type="lab_order", resource_id=row.id,
    )
    audit(db, user["id"], "LAB_REPORT_RELEASED", row.id)
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
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Critical results are reviewed by doctors.")
    rows = [r for r in db.scalars(
        select(M.LabOrder)
        .where(M.LabOrder.critical_flag.is_(True), M.LabOrder.critical_acknowledged_at == 0.0)
        .order_by(M.LabOrder.updated_at)
    ).all() if _doctor_may_review(db, user, r)]
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
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Critical results are acknowledged by doctors.")
    row = db.get(M.LabOrder, order_id)
    if not row or not _doctor_may_review(db, user, row):
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
    # Turns kept without the student's words (history off) are metrics, not a transcript.
    statement = select(M.AgentTurn).where(
        M.AgentTurn.account_id == user["id"], M.AgentTurn.agent == agent_ayush.AGENT_NAME,
        M.AgentTurn.question != "")
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
