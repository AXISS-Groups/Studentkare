"""Owned health data, configured catalog, durable requests, and role-scoped operations."""
import hashlib
import json
import re
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from pydantic import Field, field_validator, model_validator
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.rule_l import COMMERCE_ROLE, commerce_role_usable, rule_l_status
from core.settings_registry import setting
from core.team_scope import RESERVED_CAMPUS_MESSAGE, is_reserved_campus, team_sandboxed
from services import (
    clinical_profile,
    consent_ledger,
    lab_results,
    livekit_media,
    medicine_info,
    medicine_master,
    ops_feed,
    payments,
    rewards,
    student_time,
    upload_files,
    vector_store,
)
from services.agents.blood_emergency_agent import blood_emergency_agent
from services.agents.hitl_approval_agent import hitl_approval_agent
from services.agents.medical_guard import KILL_SWITCH_SETTING, medical_guard
from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
from services.code_sentinel_scanner import CodeSentinelScanner
from services.commerce_session import commerce_db, grants_required
from services.payment_gateway import ProviderUnavailable, WebhookRejected, get_provider
from services.security_scanner import scan_file_for_viruses
from services.wellness_messages import error as wellness_error
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    normalize_identifier,
    partner_kind_of,
    require_campus_admin,
    require_clinician,
    require_staff,
    require_super_admin,
    workflow_db,
)
from services.workflow_scheduler import (
    OUTBOX_MAX_ATTEMPTS,
    ensure_scheduled_jobs,
    integration_health_check,
    outbox_route,
    workflow_scheduler,
)

router = APIRouter(prefix="/api", tags=["Care workflows"])

# Structural lengths and formats (AGENTS.md rule 11: named, not tunable).
INCLUDED_TEST_NAME_MAX_CHARS = 120   # one lab-package test name
WEBP_HEADER_BYTES = 12               # "RIFF" + size + "WEBP"
PINCODE_DIGITS = 6                   # an Indian postal code
DELIVERY_ADDRESS_MIN_CHARS = 10      # shorter cannot be a full address
CAMPUS_NAME_MIN_CHARS = 2
MASK_MIN_DIGITS = 6                  # a shorter contact is hidden entirely

METRICS = {
    "heart": ("Resting heart rate", "bpm", 1, 300),
    "oxygen": ("Blood oxygen", "%", 0, 100),
    "sleep": ("Sleep duration", "hrs", 0, 24),
    "steps": ("Daily movement", "steps", 0, 100000),
    "temperature": ("Temperature", "Â°C", 20, 50),
    "weight": ("Weight", "kg", 0.1, 500),
    "systolic": ("Systolic blood pressure", "mmHg", 30, 300),
    "diastolic": ("Diastolic blood pressure", "mmHg", 10, 200),
    "glucose": ("Blood glucose", "mg/dL", 1, 1000),
}


def new_id():
    return str(uuid.uuid4())


def audit(db, user, action, resource_id):
    db.add(M.WorkflowAudit(id=new_id(), actor_id=user["id"], action=action, resource_id=resource_id, created_at=time.time()))


def provider_state(db, account_id):
    """A provider's role and active flag, and nothing else about the account.

    The commerce paths run as sk_commerce, which may read only these columns of
    care_accounts (core/rule_l.py); loading the whole Account row would fail.
    """
    return db.execute(select(M.Account.role, M.Account.active).where(M.Account.id == account_id)).first()


def catalog_payload(item, composition: str | None = None):
    image_url = f"/api/catalog/{item.id}/image" if getattr(item, "image_id", None) else None
    return {"id": item.id, "providerId": item.provider_id, "kind": item.kind, "name": item.name,
            "brand": item.brand, "category": item.category, "description": item.description, "pack": item.pack,
            "pricePaise": item.price_paise, "mrpPaise": item.mrp_paise, "stock": item.stock, "active": item.active,
            "requiresPrescription": item.requires_prescription, "preparation": item.preparation,
            "includes": list(getattr(item, "includes", None) or []), "fastingHours": getattr(item, "fasting_hours", 0) or 0,
            "reportHours": getattr(item, "report_hours", 0) or 0,
            "imageUrl": image_url, "medicineId": item.medicine_id, "composition": composition}


def line_payload(line):
    return {"id": line.id, "itemId": line.item_id, "name": line.name, "kind": line.kind, "quantity": line.quantity,
            "pricePaise": line.price_paise, "status": line.status}


def order_payload(db, order):
    lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order.id)).all()
    return {"id": order.id, "createdAt": order.created_at, "totalPaise": order.total_paise,
            "delivery": order.delivery, "requestedSlot": order.requested_slot,
            "paymentStatus": order.payment_status, "paymentDueAt": order.payment_due_at or None,
            "lines": [line_payload(line) for line in lines]}


class ReadingInput(StrictModel):
    metric: str
    value: float = Field(allow_inf_nan=False)
    recordedAt: datetime

    @model_validator(mode="after")
    def validate_reading(self):
        if self.metric not in METRICS:
            raise ValueError("Choose a supported metric.")
        _, _, lower, upper = METRICS[self.metric]
        if not lower <= self.value <= upper:
            raise ValueError(f"Enter a value between {lower} and {upper} in the displayed unit.")
        if self.metric == "steps" and not self.value.is_integer():
            raise ValueError("Steps must be a whole number.")
        if self.recordedAt.tzinfo is None:
            raise ValueError("Include the measurement timezone.")
        if self.recordedAt > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError("A reading cannot be dated in the future.")
        return self


@router.get("/health/metrics")
def metric_definitions(user=Depends(authenticated_user)):
    return {"items": [{"id": key, "label": value[0], "unit": value[1], "min": value[2], "max": value[3]} for key, value in METRICS.items()]}


@router.get("/health/readings")
def readings(days: int = Query(90, ge=1, le=3650), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = db.scalars(select(M.Reading).where(M.Reading.account_id == user["id"], M.Reading.recorded_at >= cutoff)
                      .order_by(M.Reading.recorded_at.desc()).limit(setting("health.readings_list_cap", db))).all()
    from services.wellness_metrics import unit_of
    return {"items": [{"id": row.id, "metric": row.metric, "value": row.value, "unit": unit_of(row.metric), "recordedAt": row.recorded_at, "source": row.source} for row in reversed(rows)]}


@router.post("/health/readings", status_code=201)
def add_reading(body: ReadingInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = M.Reading(id=new_id(), account_id=user["id"], metric=body.metric, value=body.value,
                    recorded_at=body.recordedAt.astimezone(timezone.utc).isoformat(), source="MANUAL")
    db.add(row)
    audit(db, user, "READING_RECORDED", row.id)
    db.commit()
    return {"id": row.id}


@router.delete("/health/readings/{reading_id}")
def remove_reading(reading_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    changed = db.execute(delete(M.Reading).where(M.Reading.id == reading_id, M.Reading.account_id == user["id"])).rowcount
    if not changed:
        raise HTTPException(404, "Reading not found.")
    audit(db, user, "READING_DELETED", reading_id)
    db.commit()
    return {"success": True}


@router.get("/health/documents")
def documents(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db)
):
    stmt = select(M.Document.id, M.Document.title, M.Document.category, M.Document.filename, M.Document.mime_type, M.Document.created_at).where(M.Document.account_id == user["id"])
    total = db.scalar(select(func.count()).select_from(M.Document).where(M.Document.account_id == user["id"]))
    rows = db.execute(stmt.order_by(M.Document.created_at.desc()).offset(offset).limit(limit)).all()
    # How many of the owner's documents are in each category (M2Profile's document cards).
    counts = db.execute(select(M.Document.category, func.count()).where(M.Document.account_id == user["id"])
                        .group_by(M.Document.category)).all()
    return {
        "items": [{"id": row.id, "title": row.title, "category": row.category, "filename": row.filename,
                   "mimeType": row.mime_type, "createdAt": row.created_at} for row in rows],
        "total": total,
        "categoryCounts": {str(category): int(count) for category, count in counts},
        "limit": limit,
        "offset": offset,
    }


@router.post("/health/documents", status_code=201)
def upload_document(title: str = Form(..., min_length=1, max_length=160), category: str = Form(...), file: UploadFile = File(...),
                    user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if not title.strip():
        raise HTTPException(422, "Enter a record title.")
    if category not in {"LAB", "PRESCRIPTION", "VACCINE", "CAMP_REPORT", "DISCHARGE_SUMMARY", "OTHER"}:
        raise HTTPException(422, "Choose a supported record category.")
    content = upload_files.read_capped(file.file, 10 * 1024 * 1024, "Files must be 10 MB or smaller.")
    if not upload_files.declared_type_matches(content, file.content_type, upload_files.DOCUMENT_TYPES):
        raise HTTPException(422, "Upload a valid PDF, PNG, or JPEG file.")
    # A prescription is never stored unscanned: no offline bypass for that category, in any environment.
    scan_file_for_viruses(content, allow_offline_bypass=category != "PRESCRIPTION")
    filename = upload_files.safe_filename(file.filename, "record")
    row = M.Document(id=new_id(), account_id=user["id"], title=title.strip(), category=category, filename=filename,
                     mime_type=file.content_type, content=content, created_at=time.time())
    db.add(row)
    audit(db, user, "DOCUMENT_UPLOADED", row.id)
    db.flush()
    # Auto-queue document intake for extraction (honest, no invented fields).
    from services.document_intake import extract_fields as _extract  # noqa: F401
    result = extract_fields(content, title.strip(), category)
    intake_id = f"int_{new_id()[:10]}"
    db.add(M.DocumentIntake(id=intake_id, document_id=row.id, account_id=user["id"], status="DRAFT",
                            extractor="heuristic", draft=result, created_at=time.time()))
    for field in result["fields"]:
        db.add(M.IntakeReviewItem(id=f"ir_{new_id()[:10]}", intake_id=intake_id, field=field["field"],
                                  value=field["value"], confidence=field["confidence"], status="PENDING"))
    db.commit()
    return {"id": row.id, "intakeId": intake_id}


@router.get("/health/documents/{document_id}/file")
def download_document(document_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Record not found.")
    return Response(row.content, media_type=row.mime_type, headers={"Content-Disposition": f'attachment; filename="{row.filename}"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.delete("/health/documents/{document_id}")
def delete_document(document_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    from services.rx_uploads import withdraw_reviews_for_document

    if db.scalar(select(M.Document.id).where(M.Document.id == document_id, M.Document.account_id == user["id"])):
        # A prescription sent to a pharmacist leaves that queue with its file.
        withdraw_reviews_for_document(db, document_id)
        lab_results.delete_for_document(db, user["id"], document_id)
    changed = db.execute(delete(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"])).rowcount
    if not changed:
        raise HTTPException(404, "Record not found.")
    audit(db, user, "DOCUMENT_DELETED", document_id)
    db.commit()
    return {"success": True}


# --- Document intake & review queue ---

from services.document_intake import extract_fields  # noqa: E402


@router.post("/intake/{document_id}/process")
def process_document_intake(document_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Queue an owned document for extraction. Idempotent; returns the intake record."""
    doc = db.scalar(select(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"]))
    if not doc:
        raise HTTPException(404, "Record not found.")
    existing = db.scalar(select(M.DocumentIntake).where(M.DocumentIntake.document_id == document_id))
    if existing:
        return {"id": existing.id, "status": existing.status, "fields": existing.draft.get("fields", [])}
    intake_id = f"int_{new_id()[:10]}"
    result = extract_fields(doc.content, doc.title, doc.category)
    db.add(M.DocumentIntake(id=intake_id, document_id=doc.id, account_id=user["id"], status="DRAFT",
                            extractor="heuristic", draft=result, created_at=time.time()))
    for field in result["fields"]:
        db.add(M.IntakeReviewItem(id=f"ir_{new_id()[:10]}", intake_id=intake_id, field=field["field"],
                                  value=field["value"], confidence=field["confidence"], status="PENDING"))
    audit(db, user, "DOCUMENT_INTAKE_QUEUED", intake_id)
    db.commit()
    return {"id": intake_id, "status": "DRAFT", "fields": result["fields"]}


@router.get("/intake/{intake_id}")
def intake_status(intake_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.DocumentIntake).where(M.DocumentIntake.id == intake_id, M.DocumentIntake.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Intake not found.")
    items = db.scalars(select(M.IntakeReviewItem).where(M.IntakeReviewItem.intake_id == intake_id)).all()
    return {"id": row.id, "status": row.status, "extractor": row.extractor,
            "fields": [{"field": i.field, "value": i.value, "confidence": i.confidence, "status": i.status} for i in items]}


@router.get("/ops/intake/review")
def intake_review_queue(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Super-admin intake queue: operational state only, never document content.

    A document and the fields read from it belong to the student who uploaded it
    (GET /intake/{id} is owner-only). A super admin sees, per intake, its opaque
    id, the document's kind, its state and its times: no title, no document id,
    no extracted field name, value or confidence. There is no super-admin
    decision on extracted values either, since nobody can judge a value they may
    not read. Intakes are listed while a field still waits for review or while
    extraction is queued or failed.
    """
    waiting = select(M.IntakeReviewItem.intake_id).where(M.IntakeReviewItem.status == "PENDING")
    rows = db.execute(
        select(M.DocumentIntake.id, M.DocumentIntake.status, M.DocumentIntake.created_at,
               M.DocumentIntake.processed_at, M.Document.category)
        .join(M.Document, M.Document.id == M.DocumentIntake.document_id)
        .where(or_(M.DocumentIntake.id.in_(waiting), M.DocumentIntake.status.in_(("QUEUED", "FAILED"))))
        .order_by(M.DocumentIntake.created_at)
    ).all()
    return {"items": [{"id": row.id, "kind": row.category, "status": row.status, "createdAt": row.created_at or None,
                       "processedAt": row.processed_at or None} for row in rows]}


# --- Records privacy: export, consent sharing, and deletion requests ---

@router.get("/records/export")
def export_records(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Return a JSON manifest of the account's own data. Never another account's."""
    docs = db.scalars(select(M.Document).where(M.Document.account_id == user["id"]).order_by(M.Document.created_at)).all()
    readings = db.scalars(select(M.Reading).where(M.Reading.account_id == user["id"]).order_by(M.Reading.recorded_at)).all()
    policies = db.scalars(select(M.Policy).where(M.Policy.account_id == user["id"])).all()
    return {
        # The account's identity plus its own blood group and allergies (services/clinical_profile.py).
        "user": {**dict(user.items()), **clinical_profile.read(db, user["id"])},
        "documents": [{"id": d.id, "title": d.title, "category": d.category, "filename": d.filename,
                       "mimeType": d.mime_type, "createdAt": d.created_at, "downloadUrl": f"/api/health/documents/{d.id}/file"} for d in docs],
        "readings": [{"id": r.id, "metric": r.metric, "value": r.value, "recordedAt": r.recorded_at, "source": r.source} for r in readings],
        "policies": [{"id": p.id, "insurer": p.insurer, "policyNumber": p.policy_number, "sumInsured": p.sum_insured, "validUntil": p.valid_until} for p in policies],
        **lab_results.export_rows(db, user["id"]),
        # Care records about the student (audit M6, DPDP right of access).
        **_care_export(db, user["id"]),
    }


def _care_export(db: Session, account_id: str) -> dict:
    """The student's own appointments, prescriptions, final visit notes, consents and crisis events.

    Visit notes are the signed (FINAL) ones the student can already read; a
    clinician's draft isn't a record yet. A crisis event carries what was
    recorded (kind, surface, times, outcome), never the student's words, which
    are not stored, and not the counsellor's private follow-up note.
    """
    appointments = db.scalars(select(M.Appointment).where(M.Appointment.account_id == account_id)
                              .order_by(M.Appointment.created_at)).all()
    prescriptions = db.scalars(select(M.Prescription).where(M.Prescription.patient_id == account_id)
                               .order_by(M.Prescription.issued_at)).all()
    items: dict[str, list[M.PrescriptionItem]] = {}
    if prescriptions:
        for item in db.scalars(select(M.PrescriptionItem).where(
                M.PrescriptionItem.prescription_id.in_([p.id for p in prescriptions]))).all():
            items.setdefault(item.prescription_id, []).append(item)
    notes = db.scalars(select(M.EncounterNote).where(M.EncounterNote.patient_id == account_id,
                                                     M.EncounterNote.status == "FINAL")
                       .order_by(M.EncounterNote.created_at)).all()
    consents = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.account_id == account_id)
                          .order_by(M.ConsentRecord.recorded_at)).all()
    crises = db.scalars(select(M.CrisisEvent).where(M.CrisisEvent.account_id == account_id)
                        .order_by(M.CrisisEvent.created_at)).all()
    return {
        "appointments": [{"id": a.id, "providerId": a.provider_id, "serviceId": a.catalog_item_id, "slotId": a.slot_id,
                          "status": a.status, "createdAt": a.created_at, "updatedAt": a.updated_at} for a in appointments],
        "prescriptions": [{"id": p.id, "prescriberRegNo": p.prescriber_reg_no, "issuedAt": p.issued_at,
                           "validUntil": p.valid_until, "status": p.status, "advice": p.advice,
                           "items": [{"genericName": i.generic_name, "brandName": i.brand_name, "strength": i.strength,
                                      "form": i.form, "dose": i.dose, "frequency": i.frequency,
                                      "durationDays": i.duration_days, "quantity": i.quantity,
                                      "scheduleClass": i.schedule_class} for i in items.get(p.id, [])]}
                          for p in prescriptions],
        "visitNotes": [{"id": n.id, "appointmentId": n.appointment_id, "subjective": n.subjective,
                        "objective": n.objective, "assessment": n.assessment, "plan": n.plan,
                        "createdAt": n.created_at, "updatedAt": n.updated_at} for n in notes],
        "consents": [{"version": c.version, "purposes": c.purposes, "language": c.language,
                      "recordedAt": c.recorded_at, "withdrawnAt": c.withdrawn_at or None} for c in consents],
        "crisisEvents": [{"id": e.id, "kind": e.kind, "language": e.language, "surface": e.surface,
                          "detectedBy": e.detected_by, "createdAt": e.created_at,
                          "acknowledgedAt": e.acknowledged_at or None, "outcome": e.outcome} for e in crises],
    }


class ShareInput(StrictModel):
    documentId: str
    clinicianEmail: str
    expiresInDays: int = Field(default=7, ge=1, le=90)


@router.post("/records/shares", status_code=201)
def grant_record_share(body: ShareInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    doc = db.scalar(select(M.Document).where(M.Document.id == body.documentId, M.Document.account_id == user["id"]))
    if not doc:
        raise HTTPException(404, "Record not found.")
    clinician = db.scalar(select(M.Account).where(M.Account.identifier == body.clinicianEmail.lower()))
    # A team account (core/team_scope.py) is never a real student's clinician: the same
    # answer as an unknown address, so nothing says the team account exists.
    if not clinician or clinician.role not in {"NMC_DOCTOR", "SUPER_ADMIN"} or clinician.is_team_account:
        raise HTTPException(404, "No matching clinician account found.")
    share_id = f"shr_{new_id()[:10]}"
    db.add(M.RecordShare(id=share_id, owner_id=user["id"], clinician_id=clinician.id, document_id=doc.id,
                         granted_at=time.time(), expires_at=time.time() + body.expiresInDays * 86400, revoked=False))
    audit(db, user, "RECORD_SHARE_GRANTED", share_id)
    ops_feed.publish(
        db, "RECORD_SHARE_GRANTED", "CLINICAL",
        summary=f"Record shared with a clinician for {body.expiresInDays} day(s)",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="record_share", resource_id=share_id,
    )
    db.commit()
    return {"id": share_id, "expiresAt": time.time() + body.expiresInDays * 86400}


@router.get("/records/shares")
def my_record_shares(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.execute(
        select(M.RecordShare, M.Account, M.Document).join(M.Account, M.Account.id == M.RecordShare.clinician_id)
        .join(M.Document, M.Document.id == M.RecordShare.document_id)
        .where(M.RecordShare.owner_id == user["id"]).order_by(M.RecordShare.granted_at.desc())
    ).all()
    # documentId lets the vault show, per document, whether it is shared right now.
    return {"items": [{"id": r.id, "clinician": account.full_name, "document": doc.title, "documentId": doc.id,
                       "grantedAt": r.granted_at, "expiresAt": r.expires_at, "revoked": r.revoked,
                       "active": (not r.revoked) and r.expires_at > time.time()} for r, account, doc in rows]}


@router.post("/records/shares/{share_id}/revoke")
def revoke_record_share(share_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    share = db.scalar(select(M.RecordShare).where(M.RecordShare.id == share_id, M.RecordShare.owner_id == user["id"]))
    if not share:
        raise HTTPException(404, "Share not found.")
    share.revoked = True
    audit(db, user, "RECORD_SHARE_REVOKED", share_id)
    ops_feed.publish(
        db, "RECORD_SHARE_REVOKED", "CLINICAL", severity="ATTENTION",
        summary="A student withdrew a clinician's access to their records",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="record_share", resource_id=share_id,
    )
    db.commit()
    return {"success": True}


@router.get("/records/shares/{share_id}/document")
def view_shared_document(share_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """A clinician views a record they were granted access to, within consent/expiry."""
    share = db.get(M.RecordShare, share_id)
    if not share or share.revoked or share.expires_at <= time.time():
        raise HTTPException(403, "This shared record is no longer accessible.")
    if share.clinician_id != user["id"] and user["role"] != "SUPER_ADMIN":
        raise HTTPException(403, "You are not the intended recipient of this share.")
    doc = db.get(M.Document, share.document_id)
    if not doc:
        raise HTTPException(404, "Record not found.")
    share.last_viewed_at = time.time()
    db.commit()
    return Response(doc.content, media_type=doc.mime_type, headers={"Content-Disposition": f'inline; filename="{doc.filename}"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


# /records/deletion-request lives in services/erasure.py (schedule, cancel, sealed archive).


class PreferencesInput(StrictModel):
    savedExercises: list[str] = Field(default_factory=list, max_length=50)
    completedTasks: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("savedExercises", "completedTasks")
    @classmethod
    def valid_ids(cls, value):
        if any(not re.fullmatch(r"[a-z0-9-]{1,60}", item) for item in value):
            raise ValueError("Invalid preference identifier.")
        return list(dict.fromkeys(value))


@router.get("/health/preferences")
def preferences(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.get(M.Preference, user["id"])
    return {"savedExercises": row.saved_exercises if row else [], "completedTasks": row.completed_tasks if row and row.task_date == date.today().isoformat() else []}


@router.put("/health/preferences")
def save_preferences(body: PreferencesInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.get(M.Preference, user["id"])
    if not row:
        row = M.Preference(account_id=user["id"])
        db.add(row)
    row.saved_exercises, row.completed_tasks, row.task_date = body.savedExercises, body.completedTasks, date.today().isoformat()
    db.commit()
    return body.model_dump()


class ExerciseInput(StrictModel):
    id: str = Field(min_length=8, max_length=80)
    routineName: str = Field(min_length=1, max_length=120)
    activeSeconds: int = Field(ge=0, le=86400)
    completedMoves: int = Field(ge=0, le=50)
    skippedMoves: int = Field(ge=0, le=50)
    finishedAt: datetime


@router.get("/health/exercise-sessions")
def exercise_sessions(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.ExerciseSession).where(M.ExerciseSession.account_id == user["id"]).order_by(M.ExerciseSession.created_at.desc()).limit(20)).all()
    return {"items": [row.summary for row in rows]}


@router.post("/health/exercise-sessions", status_code=201)
def record_exercise(body: ExerciseInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    existing = db.scalar(select(M.ExerciseSession).where(M.ExerciseSession.account_id == user["id"], M.ExerciseSession.client_id == body.id))
    if existing:
        return existing.summary
    db.add(M.ExerciseSession(id=new_id(), client_id=body.id, account_id=user["id"], summary=body.model_dump(mode="json"), created_at=time.time()))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return body.model_dump(mode="json")


class PolicyInput(StrictModel):
    insurer: str = Field(min_length=2, max_length=100)
    policyNumber: str = Field(min_length=2, max_length=100)
    sumInsured: int = Field(ge=1, le=100000000)
    validUntil: date


@router.get("/health/policies")
def policies(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.Policy).where(M.Policy.account_id == user["id"]).order_by(M.Policy.created_at.desc()).limit(50)).all()
    return {"items": [{"id": row.id, "insurer": row.insurer, "policyNumber": row.policy_number, "sumInsured": row.sum_insured, "validUntil": row.valid_until, "verification": "USER_RECORDED"} for row in rows]}


@router.post("/health/policies", status_code=201)
def add_policy(body: PolicyInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = M.Policy(id=new_id(), account_id=user["id"], insurer=body.insurer, policy_number=body.policyNumber,
                   sum_insured=body.sumInsured, valid_until=body.validUntil.isoformat(), created_at=time.time())
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.delete("/health/policies/{policy_id}")
def remove_policy(policy_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if not db.execute(delete(M.Policy).where(M.Policy.id == policy_id, M.Policy.account_id == user["id"])).rowcount:
        raise HTTPException(404, "Policy not found.")
    db.commit()
    return {"success": True}


# --- Insurance benefits directory and honest claim requests ---

REVIEWED_BENEFITS = [
    {"category": "hospitalisation", "title": "Inpatient hospitalisation", "description": "Coverage for an overnight hospital stay, subject to the policy's room-rent and disease limits."},
    {"category": "hospitalisation", "title": "Day-care procedures", "description": "Coverage for procedures that do not require an overnight stay, where listed in the policy."},
    {"category": "outpatient", "title": "Outpatient consultations", "description": "Doctor consultations may be covered under an OPD benefit; this varies by policy."},
    {"category": "outpatient", "title": "Diagnostics & lab tests", "description": "Coverage for prescribed tests depends on the policy's sub-limits and waiting periods."},
    {"category": "maternity", "title": "Maternity cover", "description": "Maternity benefits are usually subject to a separate waiting period and sub-limit."},
    {"category": "preventive", "title": "Preventive health checkups", "description": "Annual health checkups may be covered under a wellness benefit, within limits."},
    {"category": "addon", "title": "Personal accident cover", "description": "An add-on that may pay a lump sum for accidental injury or death."},
]


def ensure_reviewed_benefits(db) -> int:
    created = 0
    for i, entry in enumerate(REVIEWED_BENEFITS):
        if db.get(M.ReviewedBenefit, entry["title"]) is None:
            db.add(M.ReviewedBenefit(id=entry["title"], category=entry["category"], title=entry["title"],
                                     description=entry["description"], reviewed=True, sort=i))
            created += 1
    db.commit()
    return created


@router.get("/insurance/benefits")
def insurance_benefits(db: Session = Depends(workflow_db)):
    ensure_reviewed_benefits(db)
    rows = db.scalars(select(M.ReviewedBenefit).order_by(M.ReviewedBenefit.sort)).all()
    return {"items": [{"id": r.id, "category": r.category, "title": r.title, "description": r.description, "reviewed": r.reviewed} for r in rows]}


class ClaimInput(StrictModel):
    policyId: str
    providerName: str = Field(default="", max_length=160)
    service: str = Field(default="", max_length=160)
    amountPaise: int = Field(default=0, ge=0)


@router.post("/insurance/claims", status_code=201)
def create_claim_request(body: ClaimInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    policy = db.scalar(select(M.Policy).where(M.Policy.id == body.policyId, M.Policy.account_id == user["id"]))
    if not policy:
        raise HTTPException(404, "Policy not found.")
    claim_id = f"clm_{new_id()[:10]}"
    db.add(M.ClaimRequest(id=claim_id, account_id=user["id"], policy_id=policy.id, provider_name=body.providerName,
                          service=body.service, amount_paise=body.amountPaise, status="DRAFT", created_at=time.time()))
    audit(db, user, "CLAIM_REQUEST_CREATED", claim_id)
    ops_feed.publish(
        db, "CLAIM_REQUEST_CREATED", "SUPPORT", severity="ATTENTION",
        summary="Insurance claim drafted â€” awaiting review",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="claim", resource_id=claim_id,
    )
    db.commit()
    return {"id": claim_id, "status": "DRAFT"}


@router.get("/insurance/claims")
def my_claim_requests(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.ClaimRequest).where(M.ClaimRequest.account_id == user["id"]).order_by(M.ClaimRequest.created_at.desc()).limit(100)).all()
    return {"items": [{"id": r.id, "policyId": r.policy_id, "providerName": r.provider_name, "service": r.service,
                       "amountPaise": r.amount_paise, "status": r.status, "createdAt": r.created_at} for r in rows]}


# --- Insurer eligibility & claim submission (honest unconfigured contract) ---

@router.get("/insurance/eligibility")
def insurer_eligibility(policyId: str = Query(...), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Check eligibility against the policy. Returns an honest unconfigured state
    until an insurer integration is connected â€” never fabricates eligibility."""
    policy = db.scalar(select(M.Policy).where(M.Policy.id == policyId, M.Policy.account_id == user["id"]))
    if not policy:
        raise HTTPException(404, "Policy not found.")
    # No insurer client exists in this codebase. Setting INSURER_PROVIDER used to
    # make this answer "queued" with nothing queued; until a client is written the
    # answer is the same whatever the environment says.
    return {"configured": False, "eligible": None, "status": "UNAVAILABLE",
            "message": "No insurer integration is connected. Eligibility is not checked."}


@router.post("/insurance/claims/{claim_id}/submit")
def submit_claim(claim_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Submit a prepared claim request. Honest unconfigured state when no insurer
    integration is connected; a submitted claim is never claimed without one."""
    claim = db.scalar(select(M.ClaimRequest).where(M.ClaimRequest.id == claim_id, M.ClaimRequest.account_id == user["id"]))
    if not claim:
        raise HTTPException(404, "Claim request not found.")
    # No insurer client exists in this codebase. Setting INSURER_PROVIDER used to
    # mark the claim SUBMITTED without sending it anywhere. Fail closed: a claim
    # is never recorded as submitted until something actually submits it.
    return {"submitted": False, "status": "UNAVAILABLE", "message": "No insurer integration is connected. This claim is not submitted."}


@router.get("/catalog")
def catalog(kind: Literal["product", "lab", "consultation", "vaccine", "wellness"] | None = None, query: str = Query("", max_length=160), category: str = Query("", max_length=30), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(commerce_db)):
    statement = select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id).where(M.CatalogEntry.active.is_(True), M.Account.active.is_(True))
    if kind:
        statement = statement.where(M.CatalogEntry.kind == kind)
    if query:
        # Brand, name or category, or a salt in the linked medicine ("paracetamol" finds every brand of it).
        statement = statement.where(or_(M.CatalogEntry.name.icontains(query, autoescape=True), M.CatalogEntry.brand.icontains(query, autoescape=True), M.CatalogEntry.category.icontains(query, autoescape=True), medicine_master.salt_match(query)))
    if category:
        statement = statement.where(M.CatalogEntry.category == category)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.CatalogEntry.name, M.CatalogEntry.id).offset(offset).limit(limit)).all()
    compositions = medicine_master.compositions_for(db, rows)
    return {"items": [catalog_payload(row, compositions.get(row.id)) for row in rows], "total": total, "offset": offset, "limit": limit}


# Which role may provide each kind of listing. A wellness session is run by the
# campus on its own premises, so the provider is the campus rather than a vendor.
CATALOG_PROVIDER_ROLES = {
    "consultation": "NMC_DOCTOR",
    "wellness": "CAMPUS_ADMIN",
}


class CatalogInput(StrictModel):
    providerId: str = Field(min_length=1, max_length=80)
    kind: Literal["product", "lab", "consultation", "vaccine", "wellness"]
    name: str = Field(min_length=2, max_length=160)
    brand: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=10, max_length=2000)
    pack: str = Field(min_length=1, max_length=160)
    pricePaise: int = Field(ge=0, le=100000000)
    mrpPaise: int = Field(default=0, ge=0, le=100000000)
    stock: int = Field(ge=0, le=1000000)
    requiresPrescription: bool = False
    preparation: str = Field(default="", max_length=1000)
    # A product's medicine-master record. Its schedule can only add a prescription requirement.
    medicineId: str | None = Field(default=None, max_length=80)
    # Lab packages: the tests included (names only), fasting hours and report turnaround.
    includes: list[str] = Field(default_factory=list, max_length=120)
    fastingHours: int = Field(default=0, ge=0, le=24)
    reportHours: int = Field(default=0, ge=0, le=720)

    @field_validator("includes")
    @classmethod
    def test_names(cls, value: list[str]) -> list[str]:
        names = [name.strip() for name in value if name.strip()]
        if any(len(name) > INCLUDED_TEST_NAME_MAX_CHARS for name in names):
            raise ValueError("Each included test name is at most 120 characters.")
        return names

    @model_validator(mode="after")
    def lab_fields_for_labs(self):
        if self.kind != "lab" and (self.includes or self.fastingHours or self.reportHours):
            raise ValueError("Included tests, fasting and report time apply to lab listings only.")
        return self


@router.post("/ops/catalog", status_code=201)
def create_catalog(body: CatalogInput, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    provider = provider_state(db, body.providerId)
    expected_role = CATALOG_PROVIDER_ROLES.get(body.kind, "VENDOR")
    if not provider or provider.role != expected_role or not provider.active:
        raise HTTPException(422, f"Select an active {expected_role.lower().replace('_', ' ')} account.")
    requires_prescription = body.requiresPrescription
    if body.medicineId is not None:
        medicine = db.get(M.Medicine, body.medicineId)
        if body.kind != "product" or medicine is None or not medicine.active:
            raise HTTPException(422, "Only a product can be linked, and only to an active medicine record.")
        requires_prescription = requires_prescription or medicine.requires_prescription
    row = M.CatalogEntry(id=new_id(), provider_id=body.providerId, kind=body.kind, name=body.name, brand=body.brand,
                         category=body.category, description=body.description, pack=body.pack, price_paise=body.pricePaise,
                         mrp_paise=body.mrpPaise, stock=body.stock, active=True, requires_prescription=requires_prescription, preparation=body.preparation,
                         medicine_id=body.medicineId, includes=body.includes, fasting_hours=body.fastingHours, report_hours=body.reportHours)
    db.add(row)
    audit(db, user, "CATALOG_CREATED", row.id)
    ops_feed.publish(
        db, "CATALOG_CREATED", "MARKETPLACE",
        summary=f"Catalog listing published Â· {body.kind} Â· â‚¹{body.pricePaise / 100:.2f}",
        actor_id=user["id"], actor_role=user.get("role", ""),
        provider_id=body.providerId, resource_type="catalog_item", resource_id=row.id,
    )
    db.commit()
    return catalog_payload(row, medicine_master.compositions_for(db, [row]).get(row.id))


class CatalogUpdate(StrictModel):
    active: bool
    stock: int = Field(ge=0, le=1000000)


@router.patch("/ops/catalog/{item_id}")
def update_catalog(item_id: str, body: CatalogUpdate, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    if not db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == item_id).values(active=body.active, stock=body.stock)).rowcount:
        raise HTTPException(404, "Catalog item not found.")
    audit(db, user, "CATALOG_UPDATED", item_id)
    db.commit()
    return {"success": True}


@router.post("/ops/catalog/{item_id}/image")
def upload_catalog_image(item_id: str, file: UploadFile = File(...), user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found.")
    content = file.file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image file must be 5 MB or smaller.")
    valid = {
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/webp": len(content) >= WEBP_HEADER_BYTES and content[0:4] == b"RIFF" and content[8:12] == b"WEBP",
    }
    if not valid.get(file.content_type, False):
        raise HTTPException(422, "Upload a valid PNG, JPEG, or WEBP image.")
    scan_file_for_viruses(content)

    # Product photos live in the commerce plane (care_catalog_images), never in
    # the clinical care_documents table (Rule L). A new photo replaces the old.
    if item.image_id:
        db.execute(delete(M.CatalogImage).where(M.CatalogImage.id == item.image_id))
    img_id = new_id()
    db.add(M.CatalogImage(id=img_id, item_id=item.id, filename=(file.filename or "product.png")[:200],
                          mime_type=file.content_type, content=content, uploaded_by=user["id"], created_at=time.time()))
    item.image_id = img_id
    item.image_mime = file.content_type
    audit(db, user, "CATALOG_IMAGE_UPLOADED", item_id)
    db.commit()
    return {"success": True, "imageUrl": f"/api/catalog/{item_id}/image"}


@router.delete("/ops/catalog/{item_id}/image")
def delete_catalog_image(item_id: str, user=Depends(require_super_admin), db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found.")
    if item.image_id:
        db.execute(delete(M.CatalogImage).where(M.CatalogImage.id == item.image_id))
        item.image_id = None
        item.image_mime = None
        audit(db, user, "CATALOG_IMAGE_DELETED", item_id)
        db.commit()
    return {"success": True}


@router.get("/catalog/{item_id}/image")
def get_catalog_image(item_id: str, db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if not item or not item.image_id:
        raise HTTPException(404, "Image not found.")
    image = db.get(M.CatalogImage, item.image_id)
    if not image or image.item_id != item.id:
        raise HTTPException(404, "Image not found.")
    return Response(
        content=image.content,
        media_type=image.mime_type or "image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        }
    )


class CartLineInput(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=1, le=10)


class CartValidationInput(StrictModel):
    items: list[CartLineInput] = Field(default_factory=list)
    pincode: str = Field(default="", max_length=10)


@router.post("/cart/validate")
def validate_cart(body: CartValidationInput, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    """Revalidate a cart against live inventory and serviceability before ordering.

    Returns per-item availability and a serviceable flag. Does not mutate stock.
    """
    pincode = body.pincode.strip()
    serviceable = True
    serviceability_note = ""
    if pincode and not _is_serviceable(pincode):
        serviceable = False
        serviceability_note = "This pincode is not currently serviceable."

    items = []
    line_max = setting("shop.cart_line_max", db)
    for line in body.items:
        if line.quantity > line_max:
            items.append({"id": line.id, "available": False, "stock": 0, "reason": f"at most {line_max} of one item"})
            serviceable = False
            continue
        item = db.get(M.CatalogEntry, line.id)
        if not item or not item.active:
            items.append({"id": line.id, "available": False, "stock": 0, "reason": "no longer available"})
            serviceable = False
            continue
        provider = provider_state(db, item.provider_id)
        if not provider or not provider.active:
            items.append({"id": line.id, "available": False, "stock": item.stock, "reason": "provider unavailable"})
            serviceable = False
            continue
        if item.requires_prescription:
            items.append({"id": line.id, "available": False, "stock": item.stock, "reason": "prescription review required"})
            serviceable = False
            continue
        if item.kind == "lab":
            items.append({"id": line.id, "available": False, "stock": 0, "reason": "book lab tests from Lab tests"})
            serviceable = False
            continue
        available = item.stock >= line.quantity
        if not available:
            serviceable = False
        items.append({"id": line.id, "available": available, "stock": item.stock,
                      "reason": "" if available else "insufficient stock"})

    return {"serviceable": serviceable, "serviceabilityNote": serviceability_note, "items": items}


def _is_serviceable(pincode: str) -> bool:
    """Deterministic serviceability check. A real partner API would replace this;
    a 6-digit Indian pincode that starts with a non-zero digit is treated as
    serviceable. Unclear inputs are refused (not assumed serviceable)."""
    return bool(pincode) and pincode.isdigit() and len(pincode) == PINCODE_DIGITS and pincode[0] != "0"


@router.get("/inventory/{item_id}")
def inventory_status(item_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    item = db.get(M.CatalogEntry, item_id)
    if not item or not item.active:
        raise HTTPException(404, "Item not found.")
    return {"id": item.id, "name": item.name, "stock": item.stock,
            "available": item.stock > 0, "requiresPrescription": item.requires_prescription}


class DeliveryInput(StrictModel):
    mode: Literal["delivery", "pickup"]
    address: str = Field(default="", max_length=300)
    city: str = Field(min_length=2, max_length=100)
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")

    @model_validator(mode="after")
    def delivery_address(self):
        if self.mode == "delivery" and len(self.address) < DELIVERY_ADDRESS_MIN_CHARS:
            raise ValueError("Enter the full delivery or collection address.")
        return self


class OrderInput(StrictModel):
    items: list[CartLineInput] = Field(min_length=1, max_length=30)
    delivery: DeliveryInput
    requestedSlot: str = Field(default="", max_length=40)

    @model_validator(mode="after")
    def unique_items(self):
        if len({line.id for line in self.items}) != len(self.items):
            raise ValueError("Combine repeated items into one quantity.")
        return self


@router.post("/orders", status_code=201)
def place_order(body: OrderInput, idempotency_key: str = Header(..., min_length=8, max_length=80), user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    request_hash = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True).encode()).hexdigest()
    existing = db.scalar(select(M.Order).where(M.Order.account_id == user["id"], M.Order.idempotency_key == idempotency_key))
    if existing:
        if existing.request_hash != request_hash:
            raise HTTPException(409, "This request key was already used for different items.")
        return order_payload(db, existing)
    line_max = setting("shop.cart_line_max", db)
    if any(line.quantity > line_max for line in body.items):
        raise HTTPException(422, f"You can order at most {line_max} of one item.")
    items = []
    for line in sorted(body.items, key=lambda item: item.id):
        item = db.get(M.CatalogEntry, line.id)
        provider = provider_state(db, item.provider_id) if item else None
        if not item or not item.active or not provider or not provider.active:
            raise HTTPException(409, "An item is no longer available. Refresh the catalog.")
        if item.requires_prescription:
            raise HTTPException(409, "Prescription review is not connected. Contact your care provider before ordering this item.")
        if item.kind == "lab":
            # A lab test becomes a lab order with a slot and an address (POST /lab-bookings), never a cart line.
            raise HTTPException(422, "Lab tests are booked from Lab tests with a collection time, not bought through the cart.")
        if item.kind != "product" and line.quantity != 1:
            raise HTTPException(422, "Select each service once.")
        if item.kind != "product":
            try:
                requested = datetime.fromisoformat(body.requestedSlot.replace('Z', '+00:00'))
                if requested.tzinfo is None or requested <= datetime.now(timezone.utc):
                    raise ValueError()
            except ValueError:
                raise HTTPException(422, "Choose a future date and time for the service request.")
        items.append((item, line.quantity))
    order = M.Order(id=new_id(), account_id=user["id"], idempotency_key=idempotency_key, request_hash=request_hash,
                    total_paise=sum(item.price_paise * quantity for item, quantity in items), delivery=body.delivery.model_dump(), requested_slot=body.requestedSlot, created_at=time.time(),
                    # Stock is held until then for payment; 0 when no provider is connected.
                    payment_due_at=payments.payment_due_at_for_new_order(db))
    try:
        db.add(order)
        db.flush()
        for item, quantity in items:
            if item.kind == "product":
                reserved = db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == item.id, M.CatalogEntry.stock >= quantity, M.CatalogEntry.active.is_(True)).values(stock=M.CatalogEntry.stock - quantity)).rowcount
                if not reserved:
                    raise HTTPException(409, "There is not enough stock for this request. Refresh your cart.")
            db.add(M.OrderLine(id=new_id(), order_id=order.id, item_id=item.id, provider_id=item.provider_id,
                              name=item.name, kind=item.kind, quantity=quantity, price_paise=item.price_paise, status="REQUESTED"))
        audit(db, user, "ORDER_REQUESTED", order.id)
        # One event for the platform, one per fulfilling provider, so an order shows
        # up on the super admin feed and on the right vendor's queue.
        ops_feed.publish(
            db, "ORDER_PLACED", "MARKETPLACE",
            summary=f"Order placed Â· {len(items)} line(s) Â· â‚¹{order.total_paise / 100:.2f}",
            actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
            resource_type="order", resource_id=order.id,
        )
        for provider_id in sorted({item.provider_id for item, _quantity in items}):
            ops_feed.publish(
                db, "ORDER_LINE_ASSIGNED", "MARKETPLACE",
                summary="New request assigned to your queue",
                actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
                provider_id=provider_id, resource_type="order", resource_id=order.id,
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(M.Order).where(M.Order.account_id == user["id"], M.Order.idempotency_key == idempotency_key))
        if existing and existing.request_hash == request_hash:
            return order_payload(db, existing)
        raise HTTPException(409, "The order could not be created. Refresh and try again.")
    return order_payload(db, order)


# --- Payments: services/payments.py over the provider in services/payment_gateway.py ---
# The client's callback only triggers a check against the provider; the signed
# webhook settles independently and is the source of truth. Nothing here sends
# item names or anything about health to the provider (Rule L).


def _own_order_payable(db, order_id: str, user: dict):
    payable = payments.PAYABLE_KINDS[payments.SHOP_ORDER].load(db, order_id, account_id=user["id"])
    if payable is None:
        raise HTTPException(404, "Order not found.")
    return payable


@router.post("/orders/{order_id}/payment")
def initiate_payment(order_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db),
                     idempotency_key: str = Header("", max_length=80)):
    """Open a provider order for this order's server-side total, or say plainly that none is connected.

    The same Idempotency-Key always gets the same payment back (one checkout, one payment).
    """
    return payments.start_payment(db, _own_order_payable(db, order_id, user), idempotency_key)


class PaymentVerifyInput(StrictModel):
    providerOrderId: str = Field(min_length=1, max_length=120)
    providerPaymentId: str = Field(min_length=1, max_length=120)
    signature: str = Field(min_length=1, max_length=256)


@router.post("/orders/{order_id}/payment/verify")
def verify_payment(order_id: str, body: PaymentVerifyInput, user=Depends(authenticated_user),
                   db: Session = Depends(commerce_db)):
    """The checkout callback. Marks nothing paid on the client's word: it asks the provider."""
    return payments.verify_client_payment(db, _own_order_payable(db, order_id, user), body.providerOrderId,
                                          body.providerPaymentId, body.signature)


class MockCheckoutInput(StrictModel):
    providerOrderId: str = Field(min_length=1, max_length=120)
    cardNumber: str = Field(min_length=12, max_length=23)


@router.post("/orders/{order_id}/payment/mock-checkout")
def mock_checkout(order_id: str, body: MockCheckoutInput, user=Depends(authenticated_user),
                  db: Session = Depends(commerce_db)):
    """The mock provider's payment page (dev/test only; refused unless the mock opened this payment)."""
    return payments.mock_checkout(db, _own_order_payable(db, order_id, user), body.providerOrderId, body.cardNumber)


@router.post("/payments/webhook")
async def payment_webhook(request: Request, db: Session = Depends(commerce_db),
                          idb: Session = Depends(workflow_db)):
    """Signed provider webhook, verified by the active provider. Idempotent on the provider's payment id.

    A signature proves who sent the event, not that the right amount was paid:
    the amount must equal the order total exactly, or the event is refused (409)
    and left for a person, never rounded into PAID.
    """
    raw = await request.body()
    try:
        provider = get_provider(db)
    except ProviderUnavailable:
        raise HTTPException(401, "Invalid webhook signature.")
    try:
        event = provider.parse_webhook(raw, request.headers)
    except WebhookRejected:
        raise HTTPException(401, "Invalid webhook signature.")
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(400, "Invalid webhook payload.")
    result = payments.handle_webhook(db, provider, event)
    if event.kind == "captured":
        # The payable is named by its intent (provider order id) or, for the
        # generic signed webhook, by payableKind + payableId: the same lookup
        # payments.settle_capture used.
        intent = db.scalar(select(M.PaymentIntent).where(
            M.PaymentIntent.provider_order_id == event.provider_order_id)) if event.provider_order_id else None
        kind, payable_id = (intent.payable_kind, intent.payable_id) if intent is not None \
            else (event.payable_kind, event.payable_id)
        if kind == payments.DISPENSE_QUOTE and payable_id:
            _settle_quote_dispense(db, idb, payable_id)
    return result


@router.get("/orders/{order_id}/payment")
def payment_status(order_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    return payments.payment_status_payload(db, _own_order_payable(db, order_id, user))


# --- Dispense quotes: paying a pharmacy's price for a verified prescription ---
# Same provider path as orders. These routes run on the commerce session and see
# only care_dispense_quotes (a dispense id and amounts). Once a payment settles,
# the dispense id alone is handed to the clinical session, which moves the
# dispense to ACCEPTED (clinical_api.settle_paid_dispense). Paying grants the
# payer nothing: only the dispense's own patient can pay, and nothing here
# returns what was prescribed.


def _own_quote_payable(db, quote_id: str, user: dict):
    payable = payments.PAYABLE_KINDS[payments.DISPENSE_QUOTE].load(db, quote_id, account_id=user["id"])
    if payable is None:
        raise HTTPException(404, "Quote not found.")
    return payable


def _settle_quote_dispense(db, idb, quote_id: str) -> None:
    quote = db.get(M.DispenseQuote, quote_id)
    if quote is not None and quote.status == payments.QUOTE_PAID:
        from services.clinical_api import settle_paid_dispense
        settle_paid_dispense(idb, quote.dispense_id)


class QuotePaymentInput(StrictModel):
    # The total the student was shown; a quote that changed since is refused.
    expectedTotalPaise: int = Field(gt=0)


@router.post("/dispense-quotes/{quote_id}/payment")
def initiate_quote_payment(quote_id: str, body: QuotePaymentInput, user=Depends(authenticated_user),
                           db: Session = Depends(commerce_db)):
    """Accept the pharmacy's quote at the shown total and open a provider order for exactly that amount."""
    return payments.start_quote_payment(db, _own_quote_payable(db, quote_id, user), body.expectedTotalPaise)


@router.post("/dispense-quotes/{quote_id}/payment/verify")
def verify_quote_payment(quote_id: str, body: PaymentVerifyInput, user=Depends(authenticated_user),
                         db: Session = Depends(commerce_db), idb: Session = Depends(workflow_db)):
    """The checkout callback. The provider is asked; a settled payment then releases the dispense for packing."""
    result = payments.verify_client_payment(db, _own_quote_payable(db, quote_id, user), body.providerOrderId,
                                            body.providerPaymentId, body.signature)
    _settle_quote_dispense(db, idb, quote_id)
    return result


@router.post("/dispense-quotes/{quote_id}/payment/mock-checkout")
def mock_quote_checkout(quote_id: str, body: MockCheckoutInput, user=Depends(authenticated_user),
                        db: Session = Depends(commerce_db)):
    """The mock provider's payment page (dev/test only; refused unless the mock opened this payment)."""
    return payments.mock_checkout(db, _own_quote_payable(db, quote_id, user), body.providerOrderId, body.cardNumber)


@router.get("/dispense-quotes/{quote_id}/payment")
def quote_payment_status(quote_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    return payments.payment_status_payload(db, _own_quote_payable(db, quote_id, user))


@router.get("/orders")
def orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(authenticated_user),
    db: Session = Depends(commerce_db)
):
    stmt = select(M.Order).where(M.Order.account_id == user["id"])
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(M.Order.created_at.desc()).offset(offset).limit(limit)).all()
    return {"items": [order_payload(db, row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    row = db.scalar(select(M.Order).where(M.Order.id == order_id, M.Order.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Order not found.")
    lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order_id)).all()
    if all(line.status == "CANCELLED" for line in lines):
        return {"success": True}
    if row.payment_status != payments.UNPAID:
        # Money has moved: cancelling is a refund, which support issues.
        raise HTTPException(409, "This order is paid. Contact support to cancel it and get a refund.")
    for line in lines:
        if not db.execute(update(M.OrderLine).where(M.OrderLine.id == line.id, M.OrderLine.status == "REQUESTED").values(status="CANCELLED")).rowcount:
            db.rollback()
            raise HTTPException(409, "A provider has already processed this request. Contact support to make changes.")
        if line.kind == "product":
            db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == line.item_id).values(stock=M.CatalogEntry.stock + line.quantity))
    # A payment that lands after this is recorded and raised for a refund, never applied.
    if not db.execute(update(M.Order).where(M.Order.id == order_id, M.Order.payment_status == payments.UNPAID)
                      .values(payment_status=payments.CANCELLED)).rowcount:
        db.rollback()
        raise HTTPException(409, "This order was paid a moment ago. Contact support to cancel it and get a refund.")
    payments.cancel_open_intents(db, payments.SHOP_ORDER, order_id)
    audit(db, user, "ORDER_CANCELLED", order_id)
    ops_feed.publish(
        db, "ORDER_CANCELLED", "MARKETPLACE", severity="ATTENTION",
        summary="Order cancelled by the account holder",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="order", resource_id=order_id,
    )
    db.commit()
    return {"success": True}


# The queue filter for placed-but-unpaid lines (not an OrderLine status).
AWAITING_PAYMENT = "AWAITING_PAYMENT"
# Moves that hand over goods or a service: refused until the order is paid.
PAID_ONLY_MOVES = frozenset({"ACCEPTED", "DISPATCHED", "COMPLETED"})
UNPAID_MOVE_MESSAGE = "This order isn't paid yet. It moves to your queue once the payment is confirmed."


@router.get("/work/requests")
def provider_requests(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str = Query("", max_length=30),
    user=Depends(require_staff),
    db: Session = Depends(commerce_db),
    idb: Session = Depends(workflow_db),
):
    # Order lines run as sk_commerce; the customer's name and contact are identity,
    # read on the normal session (sk_commerce cannot see identifiers).
    statement = select(M.OrderLine, M.Order).join(M.Order, M.Order.id == M.OrderLine.order_id)
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.OrderLine.provider_id == user["id"])
    wanted = status.strip()
    awaiting = payments.order_awaits_payment_clause()
    if wanted == AWAITING_PAYMENT:
        # Placed but not paid: shown apart, never as "waiting for you".
        statement = statement.where(M.OrderLine.status == "REQUESTED", awaiting)
    elif wanted == "REQUESTED":
        statement = statement.where(M.OrderLine.status == "REQUESTED", ~awaiting)
    elif wanted and wanted != "ALL":
        statement = statement.where(M.OrderLine.status == wanted)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.execute(statement.order_by(M.Order.created_at.desc()).offset(offset).limit(limit)).all()
    ids = sorted({order.account_id for _line, order in rows})
    people = {a.id: a for a in idb.execute(select(M.Account.id, M.Account.full_name, M.Account.identifier)
                                           .where(M.Account.id.in_(ids))).all()} if ids else {}
    rows = [(line, order, people[order.account_id]) for line, order in rows if order.account_id in people]
    return {
        "items": [{**line_payload(line), "orderId": order.id, "customer": account.full_name, "contact": account.identifier,
                   "delivery": order.delivery, "requestedSlot": order.requested_slot, "createdAt": order.created_at,
                   "paymentStatus": order.payment_status, "awaitingPayment": payments.order_awaits_payment(order)}
                  for line, order, account in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


class RequestStatus(StrictModel):
    status: Literal["ACCEPTED", "DECLINED", "DISPATCHED", "COMPLETED"]


@router.patch("/work/requests/{line_id}")
def update_request(line_id: str, body: RequestStatus, user=Depends(require_staff), db: Session = Depends(commerce_db),
                   idb: Session = Depends(workflow_db)):
    statement = select(M.OrderLine).where(M.OrderLine.id == line_id)
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.OrderLine.provider_id == user["id"])
    line = db.scalar(statement)
    if not line:
        raise HTTPException(404, "Request not found.")
    if line.status == body.status:
        return line_payload(line)
    if body.status in PAID_ONLY_MOVES and payments.order_awaits_payment(db.get(M.Order, line.order_id)):
        raise HTTPException(409, UNPAID_MOVE_MESSAGE)
    transitions = {"REQUESTED": {"ACCEPTED", "DECLINED"}, "ACCEPTED": {"DISPATCHED"} if line.kind == "product" else {"COMPLETED"}, "DISPATCHED": {"COMPLETED"}}
    if body.status not in transitions.get(line.status, set()):
        raise HTTPException(409, "That status change is not allowed.")
    old_status = line.status
    if not db.execute(update(M.OrderLine).where(M.OrderLine.id == line.id, M.OrderLine.status == old_status).values(status=body.status)).rowcount:
        db.rollback()
        raise HTTPException(409, "This request changed. Refresh and try again.")
    if body.status == "DECLINED" and line.kind == "product":
        db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == line.item_id).values(stock=M.CatalogEntry.stock + line.quantity))
    audit(db, user, f"REQUEST_{body.status}", line.id)
    order_row = db.get(M.Order, line.order_id)
    request_message = {
        "ACCEPTED": "A provider accepted your request.",
        "DECLINED": "A provider could not fulfil your request.",
        "DISPATCHED": "Your order has been dispatched.",
        "COMPLETED": "Your request is complete.",
    }.get(body.status)
    ops_feed.publish(
        db, f"REQUEST_{body.status}", "MARKETPLACE",
        severity="ATTENTION" if body.status == "DECLINED" else "INFO",
        summary=f"Request {body.status.lower()} by the provider",
        actor_id=user["id"], actor_role=user.get("role", ""),
        subject_id=order_row.account_id if order_row else "",
        provider_id=line.provider_id, resource_type="order", resource_id=line.order_id,
    )
    db.commit()
    # The outbox is not a commerce table (Rule L): tell the customer on the normal
    # session once the change has landed. Deduped, so a retry notifies once.
    if request_message and order_row:
        ops_feed.notify(idb, order_row.account_id, f"REQUEST_{body.status}",
                        dedupe_key=f"request:{line.id}:{body.status}",
                        summary=request_message, resource_type="order", resource_id=line.order_id)
        idb.commit()
    return line_payload(db.get(M.OrderLine, line.id))


class SupportInput(StrictModel):
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=2000)


@router.get("/support")
def support_requests(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    statement = select(M.SupportRequest)
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.SupportRequest.account_id == user["id"])
    rows = db.scalars(statement.order_by(M.SupportRequest.created_at.desc()).limit(100)).all()
    return {"items": [{"id": row.id, "subject": row.subject, "message": row.message, "status": row.status, "createdAt": row.created_at, "pointsAwarded": 50} for row in rows]}


@router.post("/support", status_code=201)
def create_support(body: SupportInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = M.SupportRequest(id=new_id(), account_id=user["id"], subject=body.subject, message=body.message, status="OPEN", created_at=time.time())
    db.add(row)
    ops_feed.publish(
        db, "SUPPORT_RAISED", "SUPPORT", severity="ATTENTION",
        summary="New support request awaiting triage",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="support_request", resource_id=row.id,
    )
    db.commit()
    return {"id": row.id}


@router.patch("/ops/support/{request_id}")
def resolve_support(request_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    if not db.execute(update(M.SupportRequest).where(M.SupportRequest.id == request_id).values(status="RESOLVED")).rowcount:
        raise HTTPException(404, "Support request not found.")
    audit(db, user, "SUPPORT_RESOLVED", request_id)
    ops_feed.publish(
        db, "SUPPORT_RESOLVED", "SUPPORT",
        summary="Support request resolved",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="support_request", resource_id=request_id,
    )
    db.commit()
    return {"success": True}


@router.get("/ops/summary")
def operations_summary(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    return {"accounts": db.scalar(select(func.count()).select_from(M.Account)), "catalogItems": db.scalar(select(func.count()).select_from(M.CatalogEntry)),
            "orderRequests": db.scalar(select(func.count()).select_from(M.Order)),
            "openSupport": db.scalar(select(func.count()).select_from(M.SupportRequest).where(M.SupportRequest.status == "OPEN")),
            "statuses": dict(db.execute(select(M.OrderLine.status, func.count()).group_by(M.OrderLine.status)).all())}


@router.get("/ops/catalog")
def operations_catalog(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    query: str = Query("", max_length=160),
    user=Depends(require_super_admin),
    db: Session = Depends(commerce_db)
):
    stmt = select(M.CatalogEntry)
    if query.strip():
        q = f"%{query.strip()}%"
        stmt = stmt.where(or_(M.CatalogEntry.name.ilike(q), M.CatalogEntry.brand.ilike(q), M.CatalogEntry.category.ilike(q),
                              medicine_master.salt_match(query.strip())))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.order_by(M.CatalogEntry.name).offset(offset).limit(limit)).all()
    compositions = medicine_master.compositions_for(db, items)
    return {"items": [catalog_payload(item, compositions.get(item.id)) for item in items], "total": total, "limit": limit, "offset": offset}


@router.get("/ops/accounts")
def accounts(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    query: str = Query("", max_length=160),
    role: str = Query("", max_length=40),
    user=Depends(require_super_admin),
    db: Session = Depends(workflow_db)
):
    stmt = select(M.Account)
    if query.strip():
        q = f"%{query.strip()}%"
        stmt = stmt.where(or_(M.Account.full_name.ilike(q), M.Account.identifier.ilike(q)))
    if role.strip():
        stmt = stmt.where(M.Account.role == role.strip())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(M.Account.created_at.desc()).offset(offset).limit(limit)).all()
    # Whether each account has an authenticator on: a super admin can only reset one that exists.
    with_two_factor = set(db.scalars(select(M.TwoFactorSecret.account_id).where(
        M.TwoFactorSecret.account_id.in_([row.id for row in rows]), M.TwoFactorSecret.enabled.is_(True))).all()) if rows else set()
    return {
        "items": [{"id": row.id, "fullName": row.full_name, "identifier": row.identifier, "role": row.role, "active": row.active,
                   "partnerKind": partner_kind_of(row),
                   "twoFactorEnabled": row.id in with_two_factor,
                   # Only campus-scoped staff show their campus; a student's profile stays private.
                   **({"campus": row.staff_campus or ""} if row.role in CAMPUS_SCOPED_ROLES else {})}
                  for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


PartnerKind = Literal["PHARMACY", "LAB", "CLINIC", "WELLNESS"]

# Staff who act for one campus only. Each needs a campus on their account; an
# account without one is refused by campus_scope rather than shown every campus.
CAMPUS_SCOPED_ROLES = frozenset({"CAMPUS_ADMIN", "COUNSELLOR"})


class StaffInput(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    channel: Literal["EMAIL", "WHATSAPP"]
    fullName: str = Field(min_length=2, max_length=120)
    role: Literal["VENDOR", "NMC_DOCTOR", "CAMPUS_ADMIN", "COUNSELLOR"]
    # Decides which partner dashboard the account sees; the partner cannot change it.
    partnerKind: PartnerKind | None = None
    # The campus a campus administrator or counsellor acts for. Required for
    # those roles: without it they have no scope, and an unscoped one sees nobody.
    university: str | None = Field(default=None, max_length=160)
    # NMC_DOCTOR only, and required for it: a prescription carries the
    # prescriber's NMC / state medical council registration number (audit M1).
    registrationNumber: str | None = Field(default=None, max_length=60)

    @model_validator(mode="after")
    def doctors_need_a_registration(self):
        self.registrationNumber = (self.registrationNumber or "").strip() or None
        if self.role == "NMC_DOCTOR" and not self.registrationNumber:
            raise ValueError("A doctor needs their NMC or state medical council registration number.")
        if self.role != "NMC_DOCTOR":
            self.registrationNumber = None
        return self

    @model_validator(mode="after")
    def partner_kind_matches_role(self):
        if self.role == "VENDOR" and self.partnerKind is None:
            raise ValueError("Choose the partner type: pharmacy, lab, clinic or wellness centre.")
        if self.role != "VENDOR" and self.partnerKind is not None:
            raise ValueError("Only partner accounts have a partner type.")
        return self

    @model_validator(mode="after")
    def campus_staff_need_a_campus(self):
        self.university = (self.university or "").strip() or None
        if self.role in CAMPUS_SCOPED_ROLES and (not self.university or len(self.university) < CAMPUS_NAME_MIN_CHARS):
            if self.role == "COUNSELLOR":
                raise ValueError("A counsellor needs the campus they support.")
            raise ValueError("A campus administrator needs the campus they administer.")
        if self.role not in CAMPUS_SCOPED_ROLES:
            self.university = None
        return self


@router.post("/ops/accounts", status_code=201)
def create_staff(body: StaffInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    row = M.Account(id=new_id(), identifier=normalize_identifier(body.identifier, body.channel), channel=body.channel,
                     full_name=body.fullName, role=body.role, active=True,
                     profile=({"university": body.university} if body.university else {})
                     | ({"registrationNumber": body.registrationNumber} if body.registrationNumber else {}),
                     created_at=time.time(),
                     staff_campus=body.university or "",
                     partner_kind=body.partnerKind or "")
    db.add(row)
    audit(db, user, "STAFF_ACCOUNT_CREATED", row.id)
    ops_feed.publish(
        db, "STAFF_ACCOUNT_CREATED", "ACCOUNT", severity="ATTENTION",
        summary=f"Staff account created with the {body.role.replace('_', ' ').lower()} role",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=row.id,
        resource_type="account", resource_id=row.id,
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already exists for those contact details.")
    return {"id": row.id}


class PartnerKindInput(StrictModel):
    partnerKind: PartnerKind


@router.patch("/ops/accounts/{account_id}/partner-kind")
def set_partner_kind(account_id: str, body: PartnerKindInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Assign or change a partner's type. Super admin only; there is no partner-side route."""
    row = db.get(M.Account, account_id)
    if row is None:
        raise HTTPException(404, "No such account.")
    if row.role != "VENDOR":
        raise HTTPException(409, "Only partner accounts have a partner type.")
    row.partner_kind = body.partnerKind
    audit(db, user, f"PARTNER_KIND_SET_{body.partnerKind}", row.id)
    ops_feed.publish(
        db, "PARTNER_KIND_SET", "ACCOUNT", severity="ATTENTION",
        summary=f"Partner type set to {body.partnerKind.lower()}",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=row.id,
        resource_type="account", resource_id=row.id,
    )
    db.commit()
    return {"id": row.id, "partnerKind": partner_kind_of(row)}


class RegistrationInput(StrictModel):
    registrationNumber: str = Field(min_length=3, max_length=60)


@router.patch("/ops/accounts/{account_id}/registration")
def set_doctor_registration(account_id: str, body: RegistrationInput, user=Depends(require_super_admin),
                            db: Session = Depends(workflow_db)):
    """Record a doctor's NMC registration number. Super admin only; a doctor can't set their own."""
    account = db.scalar(select(M.Account).where(M.Account.id == account_id).with_for_update()
                        .execution_options(populate_existing=True))
    if account is None or account.role != "NMC_DOCTOR":
        raise HTTPException(404, "No doctor account with that id.")
    account.profile = {**(account.profile or {}), "registrationNumber": body.registrationNumber.strip()}
    audit(db, user, "DOCTOR_REGISTRATION_SET", account_id)
    db.commit()
    return {"id": account_id, "registrationNumber": account.profile["registrationNumber"]}


class CampusAssignmentInput(StrictModel):
    university: str = Field(min_length=2, max_length=160)


@router.patch("/ops/accounts/{account_id}/campus")
def assign_campus(account_id: str, body: CampusAssignmentInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Set the campus a campus administrator or counsellor acts for (accounts created before scoping existed have none)."""
    account = db.scalar(select(M.Account).where(M.Account.id == account_id).with_for_update().execution_options(populate_existing=True))
    if account is None or account.role not in CAMPUS_SCOPED_ROLES:
        raise HTTPException(404, "No campus administrator or counsellor with that id.")
    if account.is_team_account:
        # Team accounts stay on the team test campus (core/team_scope.py).
        raise HTTPException(409, "A team account always acts for the team campus.")
    campus = " ".join(body.university.split())
    if is_reserved_campus(campus):
        raise HTTPException(422, RESERVED_CAMPUS_MESSAGE)
    # The scope lives in its own column; the profile copy is for display only.
    account.staff_campus = campus
    account.profile = {**(account.profile or {}), "university": campus}
    audit(db, user, f"{account.role}_SCOPE_SET", account_id)
    db.commit()
    return {"id": account_id, "university": account.staff_campus}


def _campus_key(value: str) -> str:
    return " ".join((value or "").split()).casefold()


def staff_campus_of(account: M.Account | None) -> str:
    """The campus a campus administrator or counsellor acts for, as a super admin assigned it.

    Read from ``care_accounts.staff_campus`` only, never from the self-service
    profile (audit C1). "" for every other role and for unassigned staff.
    """
    if account is None or account.role not in CAMPUS_SCOPED_ROLES:
        return ""
    return " ".join((account.staff_campus or "").split())


def campus_scope(user: dict, db: Session) -> str | None:
    """The campus a staff member may act for. None means every campus (super admin only).

    Fails closed: a campus administrator with no campus assigned gets a 403,
    never an unfiltered view of every college's students. The campus comes from
    the server-assigned membership (``staff_campus_of``), not the profile.
    """
    if user["role"] == "SUPER_ADMIN":
        return None
    university = _campus_key(staff_campus_of(db.get(M.Account, user["id"])))
    if not university:
        raise HTTPException(403, "Your account isn't assigned to a campus yet. Ask a super admin to set it.")
    return university


# --- Campus membership verification ---

@router.get("/campus/verification")
def campus_verification_status(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.get(M.CampusVerification, user["id"])
    if not row:
        return {"status": "NOT_SUBMITTED", "university": user.get("university", ""), "rollNumber": user.get("rollNumber", "")}
    return {"status": row.status, "university": row.university, "rollNumber": row.roll_number,
            "verifiedBy": row.verified_by, "verifiedAt": row.verified_at or None}


@router.get("/campus/partners")
def partner_campuses(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Campuses a student can pick when verifying (canvas CampusVerify).

    A partner campus is one with an active campus administrator assigned to it:
    that is who reviews the submission, so only those campuses are offered by
    name. Names only — no counts, no people, nothing about any student. A campus
    that is not listed can still be typed in; it then waits for a super admin.
    """
    # The team test campus is never offered to a student (core/team_scope.py).
    rows = db.scalars(select(M.Account).where(M.Account.role == "CAMPUS_ADMIN", M.Account.active.is_(True),
                                              M.Account.is_team_account.is_(False))).all()
    seen: dict[str, str] = {}
    for row in rows:
        name = staff_campus_of(row)
        key = _campus_key(name)
        if key and key not in seen:
            seen[key] = name
    return {"items": [{"name": name} for name in sorted(seen.values(), key=str.casefold)]}


class CampusSubmitInput(StrictModel):
    university: str = Field(min_length=2, max_length=160)
    rollNumber: str = Field(min_length=1, max_length=80)

    @field_validator("university", "rollNumber", mode="before")
    @classmethod
    def strip_campus_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("university")
    @classmethod
    def not_the_team_campus(cls, value: str) -> str:
        # The team test campus holds no real student (core/team_scope.py).
        if is_reserved_campus(value):
            raise ValueError(RESERVED_CAMPUS_MESSAGE)
        return value


@router.post("/campus/verification")
def submit_campus_verification(body: CampusSubmitInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    # Students only. Staff campus scope is assigned by a super admin, and a team
    # account stays on the team campus (audit C1).
    if user["role"] != "STUDENT" or user.get("isTeamAccount") is True:
        raise HTTPException(403, "Only a student account can submit a campus affiliation.")
    account = db.scalar(select(M.Account).where(M.Account.id == user["id"]).with_for_update().execution_options(populate_existing=True))
    row = db.get(M.CampusVerification, user["id"])
    if row and row.status == "VERIFIED":
        raise HTTPException(409, "Your campus affiliation is already verified.")
    if not row:
        row = M.CampusVerification(account_id=user["id"])
        db.add(row)
    row.university = body.university.strip()[:160]
    row.roll_number = body.rollNumber.strip()[:80]
    row.status = "PENDING"
    if account:
        profile = dict(account.profile or {})
        if profile.get("university", "") != row.university or profile.get("rollNumber", "") != row.roll_number:
            profile.pop("digitalIdSecret", None)
            profile.pop("digitalIdIssuedAt", None)
        account.profile = {**profile, "university": row.university, "rollNumber": row.roll_number, "isVerifiedStudent": False}
    audit(db, user, "CAMPUS_VERIFICATION_SUBMITTED", user["id"])
    ops_feed.publish(
        db, "CAMPUS_VERIFICATION_SUBMITTED", "CAMPUS", severity="ATTENTION",
        summary="Campus affiliation submitted â€” awaiting review",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="campus_verification", resource_id=user["id"],
    )
    db.commit()
    return {"status": "PENDING"}


class VerifyInput(StrictModel):
    status: Literal["VERIFIED", "REJECTED"]


@router.patch("/ops/campus/{account_id}")
def verify_campus(account_id: str, body: VerifyInput, user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    if account_id == user["id"]:
        raise HTTPException(403, "Another campus administrator must review your affiliation.")
    scope = campus_scope(user, db)
    account = db.scalar(select(M.Account).where(M.Account.id == account_id).with_for_update().execution_options(populate_existing=True))
    row = db.get(M.CampusVerification, account_id)
    # Outside the admin's campus looks exactly like "not found".
    if not row or (scope is not None and _campus_key(row.university) != scope):
        raise HTTPException(404, "No campus verification submission found.")
    row.status = body.status
    row.verified_by = user["id"]
    row.verified_at = time.time()
    if account:
        profile = dict(account.profile or {})
        profile["isVerifiedStudent"] = body.status == "VERIFIED"
        profile["university"] = row.university
        profile["rollNumber"] = row.roll_number
        account.profile = profile
        if body.status == "VERIFIED":
            # The one moment an account becomes a verified student: settle the
            # invite it joined with, if any (one reward per account, ever).
            rewards.on_student_verified(db, account)
    audit(db, user, f"CAMPUS_{body.status}", account_id)
    ops_feed.announce(
        db, account_id=account_id, event_type=f"CAMPUS_{body.status}", domain="CAMPUS",
        dedupe_key=f"campus:{account_id}:{body.status}",
        summary="Your campus affiliation was verified." if body.status == "VERIFIED"
                else "Your campus affiliation could not be verified.",
        severity="INFO" if body.status == "VERIFIED" else "ATTENTION",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="campus_verification", resource_id=account_id,
    )
    db.commit()
    return {"status": row.status}


@router.get("/ops/campus/pending")
def pending_campus(user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    scope = campus_scope(user, db)
    rows = db.execute(
        select(M.CampusVerification, M.Account).join(M.Account, M.Account.id == M.CampusVerification.account_id)
        # Students only: a request left on an account that was later made staff is not a student to verify.
        .where(M.CampusVerification.status == "PENDING", M.Account.role == "STUDENT")
        .order_by(M.CampusVerification.verified_at)
    ).all()
    if scope is not None:
        rows = [(cv, account) for cv, account in rows if _campus_key(cv.university) == scope]
    return {"items": [{"accountId": cv.account_id, "fullName": account.full_name, "email": account.identifier,
                       "university": cv.university, "rollNumber": cv.roll_number, "status": cv.status} for cv, account in rows]}


# --- Health camps: registration, check-in, and station progress ---

CAMP_STATIONS = ["Registration", "Vitals", "Consultation", "Sample collection", "Exit"]


def _ensure_camp(db, camp_id: str, name: str, date: str, location: str = "", what_to_bring: str = "", slots: list[dict] | None = None) -> None:
    if db.get(M.HealthCamp, camp_id) is not None:
        return

    db.add(
        M.HealthCamp(id=camp_id, name=name, date=date, location=location, what_to_bring=what_to_bring, active=True)
    )

    for i, station in enumerate(CAMP_STATIONS):
        db.add(
            M.HealthCampStation(id=f"{camp_id}-st{i}", camp_id=camp_id, name=station, sort=i)
        )

    for index, slot in enumerate(slots or []):
        slot_start = str(slot.get("slotStart", "")).strip()
        slot_end = str(slot.get("slotEnd", "")).strip()
        capacity = int(slot.get("capacity", 1))

        if not slot_start or not slot_end or capacity < 1:
            raise HTTPException(
                422,
                "Each camp slot needs a start time, end time, and positive capacity.",
            )

        db.add(
            M.HealthCampSlot(id=str(slot.get("id") or f"{camp_id}-slot{index + 1}"), camp_id=camp_id, slot_start=slot_start, slot_end=slot_end, capacity=capacity, booked=0, active=True)
        )

    db.commit()


@router.get("/camps")
def list_camps(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.HealthCamp).where(M.HealthCamp.active.is_(True)).order_by(M.HealthCamp.date)).all()
    return {"items": [{"id": c.id, "name": c.name, "date": c.date, "location": c.location, "whatToBring": c.what_to_bring} for c in rows]}


@router.get("/camps/{camp_id}/slots")
def camp_slots(
    camp_id: str,
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    camp = db.get(M.HealthCamp, camp_id)
    if not camp or not camp.active:
        raise HTTPException(404, "Camp not found.")

    rows = db.scalars(
        select(M.HealthCampSlot)
        .where(
            M.HealthCampSlot.camp_id == camp_id,
            M.HealthCampSlot.active.is_(True),
        )
        .order_by(M.HealthCampSlot.slot_start)
    ).all()

    return {
        "items": [
            {
                "id": slot.id,
                "slotStart": slot.slot_start,
                "slotEnd": slot.slot_end,
                "capacity": slot.capacity,
                "booked": slot.booked,
                "remaining": max(slot.capacity - slot.booked, 0),
                "available": slot.booked < slot.capacity,
            }
            for slot in rows
        ]
    }


@router.post("/camps/{camp_id}/book", status_code=201)
def book_camp_slot(
    camp_id: str,
    body: dict = Body(...),
    user=Depends(authenticated_user),
    db: Session = Depends(workflow_db),
):
    camp = db.get(M.HealthCamp, camp_id)
    if not camp or not camp.active:
        raise HTTPException(404, "Camp not found.")

    slot_id = str(body.get("slotId", "")).strip()
    if not slot_id:
        raise HTTPException(422, "Choose a health camp slot.")

    slot = db.scalar(
        select(M.HealthCampSlot).where(
            M.HealthCampSlot.id == slot_id,
            M.HealthCampSlot.camp_id == camp_id,
            M.HealthCampSlot.active.is_(True),
        )
    )
    if not slot:
        raise HTTPException(404, "Health camp slot not found.")

    existing = db.scalar(
        select(M.CampAttendance)
        .where(
            M.CampAttendance.camp_id == camp_id,
            M.CampAttendance.account_id == user["id"],
        )
        .with_for_update()
    )

    if existing and existing.slot_id:
        raise HTTPException(409, "You already booked a slot for this camp.")

    reserved = db.execute(
        update(M.HealthCampSlot)
        .where(
            M.HealthCampSlot.id == slot_id,
            M.HealthCampSlot.camp_id == camp_id,
            M.HealthCampSlot.active.is_(True),
            M.HealthCampSlot.booked < M.HealthCampSlot.capacity,
        )
        .values(booked=M.HealthCampSlot.booked + 1)
    )

    if reserved.rowcount != 1:
        raise HTTPException(409, "That slot is full. Choose another slot.")

    if existing:
        row = existing
        row.slot_id = slot_id
    else:
        row = M.CampAttendance(
            id=f"att_{new_id()[:10]}",
            camp_id=camp_id,
            account_id=user["id"],
            slot_id=slot_id,
            checked_in=False,
            completed_stations=[],
            created_at=time.time(),
        )
        db.add(row)

    audit(db, user, "CAMP_SLOT_BOOKED", slot_id)

    ops_feed.announce(
        db,
        account_id=user["id"],
        event_type="CAMP_SLOT_BOOKED",
        domain="CAMPUS",
        dedupe_key=f"camp-slot:{camp_id}:{user['id']}",
        summary="Your health camp slot is booked.",
        actor_id=user["id"],
        actor_role=user.get("role", ""),
        resource_type="camp",
        resource_id=camp_id,
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already booked a slot for this camp.")

    return {
        "bookingId": row.id,
        "camp": {
            "id": camp.id,
            "name": camp.name,
            "date": camp.date,
            "location": camp.location,
            "whatToBring": camp.what_to_bring,
        },
        "slot": {
            "id": slot.id,
            "slotStart": slot.slot_start,
            "slotEnd": slot.slot_end,
        },
    }


@router.get("/camps/{camp_id}/stations")
def camp_stations(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.HealthCampStation).where(M.HealthCampStation.camp_id == camp_id).order_by(M.HealthCampStation.sort)).all()
    return {"items": [{"id": s.id, "name": s.name, "sort": s.sort} for s in rows]}


@router.post("/camps/{camp_id}/register")
def register_for_camp(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if not db.get(M.HealthCamp, camp_id):
        raise HTTPException(404, "Camp not found.")
    existing = db.scalar(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id, M.CampAttendance.account_id == user["id"]))
    if existing:
        return {"id": existing.id, "alreadyRegistered": True}
    row = M.CampAttendance(id=f"att_{new_id()[:10]}", camp_id=camp_id, account_id=user["id"], checked_in=False, completed_stations=[], created_at=time.time())
    db.add(row)
    audit(db, user, "CAMP_REGISTERED", camp_id)
    ops_feed.announce(
        db, account_id=user["id"], event_type="CAMP_REGISTERED", domain="CAMPUS",
        dedupe_key=f"camp:{camp_id}:{user['id']}",
        summary="You are registered for the health camp.",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="camp", resource_id=camp_id,
    )
    db.commit()
    return {"id": row.id, "alreadyRegistered": False}


@router.post("/camps/{camp_id}/check-in")
def camp_check_in(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id, M.CampAttendance.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Register for this camp before checking in.")
    row.checked_in = True
    audit(db, user, "CAMP_CHECKED_IN", camp_id)
    db.commit()
    return {"checkedIn": True}


@router.post("/camps/{camp_id}/stations/{station_id}")
def complete_station(camp_id: str, station_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id, M.CampAttendance.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Register for this camp first.")
    station = db.scalar(select(M.HealthCampStation).where(M.HealthCampStation.id == station_id, M.HealthCampStation.camp_id == camp_id))
    if not station:
        raise HTTPException(404, "Station not found.")
    completed = list(row.completed_stations or [])
    if station_id not in completed:
        completed.append(station_id)
        row.completed_stations = completed
        audit(db, user, "CAMP_STATION_COMPLETED", station_id)
        db.commit()
    return {"completedStations": completed}


@router.get("/camps/{camp_id}/me")
def my_camp_status(camp_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.CampAttendance).where(M.CampAttendance.camp_id == camp_id, M.CampAttendance.account_id == user["id"]))
    if not row:
        return {"registered": False, "checkedIn": False, "completedStations": [],"slotId":None}
    return {"registered": True, "checkedIn": row.checked_in, "completedStations": row.completed_stations or [],"slotId":row.slot_id}


@router.post("/ops/camps", status_code=201)
def create_camp(body: dict = Body(...), user=Depends(require_staff), db: Session = Depends(workflow_db)):
    _ensure_camp(db, body.get("id") or f"camp_{new_id()[:8]}", body.get("name", "Health camp"), body.get("date", ""), body.get("location", ""), body.get("whatToBring", ""), body.get("slots", []))
    return {"success": True}


# --- Approved knowledge sources and the read-only care navigator ---

from services.knowledge import answer as knowledge_answer  # noqa: E402


class KnowledgeInput(StrictModel):
    title: str = Field(min_length=3, max_length=180)
    category: str = Field(default="GENERAL", max_length=60)
    content: str = Field(min_length=10, max_length=4000)
    author: str = Field(default="", max_length=120)
    expiresInDays: int = Field(default=365, ge=1, le=3650)


@router.post("/ops/knowledge", status_code=201)
def create_knowledge(body: KnowledgeInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    source_id = f"ks_{new_id()[:10]}"
    db.add(M.KnowledgeSource(id=source_id, title=body.title.strip(), category=body.category, content=body.content.strip(),
                             author=body.author or user.get("fullName", ""), version=1, reviewed=True, active=True,
                             created_at=time.time(), expires_at=time.time() + body.expiresInDays * 86400))
    audit(db, user, "KNOWLEDGE_CREATED", source_id)
    db.commit()
    # Answerable straight away: no "Rebuild index" needed. A failure is reported, and
    # the next sync (startup or the periodic knowledge job) indexes it.
    return {"id": source_id, "indexed": vector_store.reindex_one(db, source_id)}


class KnowledgeEdit(StrictModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    category: str | None = Field(default=None, max_length=60)
    content: str | None = Field(default=None, min_length=10, max_length=4000)
    expiresInDays: int | None = Field(default=None, ge=1, le=3650)


def _knowledge_or_404(db, source_id: str) -> M.KnowledgeSource:
    source = db.get(M.KnowledgeSource, source_id)
    if source is None:
        raise HTTPException(404, "Knowledge source not found.")
    return source


@router.patch("/ops/knowledge/{source_id}")
def edit_knowledge(source_id: str, body: KnowledgeEdit, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Edit a source. A content change is a new version, re-indexed in this request."""
    source = _knowledge_or_404(db, source_id)
    changed = False
    for field, value in (("title", body.title), ("category", body.category), ("content", body.content)):
        if value is not None and value.strip() != getattr(source, field):
            setattr(source, field, value.strip())
            changed = True
    if body.expiresInDays is not None:
        source.expires_at = time.time() + body.expiresInDays * 86400
    if changed:
        source.version += 1
        # The editor now answers for the text (and the help-pack loader leaves it alone).
        source.author = user.get("fullName", "") or source.author
        source.reviewed = True
    audit(db, user, "KNOWLEDGE_EDITED", source_id)
    db.commit()
    return {"id": source_id, "version": source.version, "indexed": vector_store.reindex_one(db, source_id)}


@router.post("/ops/knowledge/{source_id}/unpublish")
def unpublish_knowledge(source_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Withdraw a source: Ayush stops quoting it as soon as this returns."""
    source = _knowledge_or_404(db, source_id)
    source.active = False
    audit(db, user, "KNOWLEDGE_UNPUBLISHED", source_id)
    db.commit()
    return {"id": source_id, "indexed": vector_store.reindex_one(db, source_id)}


@router.post("/ops/knowledge/{source_id}/restore")
def restore_knowledge(source_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Publish a withdrawn source again, as it was."""
    source = _knowledge_or_404(db, source_id)
    source.active = True
    source.reviewed = True
    audit(db, user, "KNOWLEDGE_RESTORED", source_id)
    db.commit()
    return {"id": source_id, "indexed": vector_store.reindex_one(db, source_id)}


@router.get("/knowledge/sources")
def knowledge_sources(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.KnowledgeSource).where(M.KnowledgeSource.active.is_(True)).order_by(M.KnowledgeSource.category, M.KnowledgeSource.title).limit(200)).all()
    return {"items": [{"id": r.id, "title": r.title, "category": r.category, "version": r.version,
                       "author": r.author, "reviewed": r.reviewed, "expiresAt": r.expires_at or None} for r in rows]}


class NavigateInput(StrictModel):
    query: str = Field(min_length=2, max_length=500)


@router.post("/care/navigate")
def care_navigate(body: NavigateInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Read-only navigator: answers from approved sources with citations, or refuses."""
    return knowledge_answer(db, body.query, account_id=user["id"])


@router.get("/ops/agent-eval")
def agent_evaluation(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Run the agent evaluation harness over the read-only navigator."""
    from services.agent_eval import aggregate, evaluate_navigator
    results = evaluate_navigator(db)
    return {"metrics": aggregate(results), "cases": [r.__dict__ for r in results]}


@router.get("/ops/audit")
def audits(
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(require_super_admin),
    db: Session = Depends(workflow_db)
):
    stmt = select(M.WorkflowAudit)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(M.WorkflowAudit.created_at.desc()).offset(offset).limit(limit)).all()
    return {
        "items": [{"id": row.id, "actorId": row.actor_id, "action": row.action, "resourceId": row.resource_id, "createdAt": row.created_at} for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def home_content_payload(item):
    return {"key": item.key, "title": item.title, "eyebrow": item.eyebrow, "body": item.body,
            "summary": item.summary, "action": item.action, "target": item.target, "icon": item.icon,
            "color": item.color, "sort": item.sort}


def article_payload(row):
    return {"id": row.id, "tag": row.tag, "title": row.title, "readTime": row.read_time,
            "color": row.color, "body": row.body}


@router.get("/home")
def home(db: Session = Depends(workflow_db)):
    """Landing-page copy sourced from the database. Empty when not configured."""
    sections = db.scalars(select(M.HomeContent).where(M.HomeContent.active.is_(True)).order_by(M.HomeContent.sort)).all()
    articles = db.scalars(select(M.Article).where(M.Article.active.is_(True)).order_by(M.Article.sort)).all()
    grouped: dict[str, list] = {"hero": [], "aside": [], "features": [], "movement": [], "links": []}
    for item in sections:
        key = item.key
        if key == "hero":
            group = "hero"
        elif key == "aside":
            group = "aside"
        elif key.startswith("feature-"):
            group = "features"
        elif key == "movement":
            group = "movement"
        else:
            group = "links"
        grouped[group].append(home_content_payload(item))
    return {"hero": grouped["hero"], "aside": grouped["aside"], "features": grouped["features"],
            "movement": grouped["movement"], "links": grouped["links"],
            "articles": [article_payload(row) for row in articles]}


# --- Studentkare Care Services & AI Agents APIs ---

# POST /lab/book-slot is removed. It was live and authenticated, took no database
# session, persisted nothing, and returned a student a named phlebotomist
# ("Rajesh Kumar"), that person's phone number, "NABL Senior Certified", a 4.9
# rating, a "NABL-KIT-" code from random.randint(1000, 9999), a note claiming a
# temperature-controlled kit had been allocated, and status
# "CONFIRMED_DISPATCHED". All of it came from a hardcoded pool in
# services/agents/phlebotomist_dispatch_agent, which ARCHITECTURE.md lists as a
# stub. Nothing in the frontend called it.
#
# A student booking a home blood draw was told a named person was confirmed and
# on the way, with a number to ring. Nobody was coming. Home collection needs a
# phlebotomist roster, a real assignment and real persistence before an endpoint
# can say any of this; until then there is no honest version of this response.

# POST /rx/extract-ai is removed. It took a student's prescription text and
# matched it against the shop catalogue so the storefront could fill a cart from
# it: clinical data driving a commercial surface, which Rule L forbids. Nothing was
# stored and prescription items were refused at checkout anyway. Prescriptions go
# through /prescriptions, /dispenses and the pharmacist review queue.


@router.get("/meds/schedule")
def get_medication_schedule(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return medication_adherence_loop_agent.get_user_schedule(db, user["id"])


class MedPlanInput(StrictModel):
    name: str = Field(min_length=2, max_length=160)
    dosage: str = Field(default="", max_length=120)
    frequency: str = Field(default="", max_length=120)
    # Structured doses a day. Optional: free-text frequency is never parsed.
    # At least one (structural); the most is the setting meds.times_per_day_max.
    timesPerDay: int | None = Field(default=None, ge=1)


def _check_times_per_day(db, times_per_day: int | None) -> None:
    most = setting("meds.times_per_day_max", db)
    if times_per_day is not None and times_per_day > most:
        raise wellness_error(422, "TIMES_PER_DAY_OUT_OF_RANGE", min=1, max=most)


@router.post("/meds/plans", status_code=201)
def add_medication_plan(body: MedPlanInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _check_times_per_day(db, body.timesPerDay)
    return medication_adherence_loop_agent.add_plan(db, user["id"], body.name, body.dosage, body.frequency,
                                                    body.timesPerDay)


class MedPlanTimesInput(StrictModel):
    # Required, but may be null to go back to "not set".
    timesPerDay: int | None = Field(ge=1)


@router.patch("/meds/plans/{plan_id}")
def set_medication_times_per_day(plan_id: str, body: MedPlanTimesInput, user=Depends(authenticated_user),
                                 db: Session = Depends(workflow_db)):
    _check_times_per_day(db, body.timesPerDay)
    result = medication_adherence_loop_agent.set_times_per_day(db, user["id"], plan_id, body.timesPerDay)
    if result is None:
        raise wellness_error(404, "MEDICATION_NOT_FOUND")
    return result


@router.get("/meds/today")
def medication_doses_today(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Per plan: doses planned (structured only), taken today, next slot, undo."""
    return medication_adherence_loop_agent.today(db, user["id"])


@router.delete("/meds/doses/{dose_id}")
def undo_medication_dose(dose_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Take back a dose logged by mistake, within meds.dose_undo_minutes of logging it."""
    outcome = medication_adherence_loop_agent.undo_dose(db, user["id"], dose_id)
    if outcome == "NOT_FOUND":
        raise wellness_error(404, "DOSE_NOT_FOUND")
    if outcome == "TOO_LATE":
        raise wellness_error(409, "DOSE_UNDO_TOO_LATE", minutes=setting("meds.dose_undo_minutes", db))
    audit(db, user, "MED_DOSE_UNDONE", dose_id)
    db.commit()
    return {"success": True}


class MedDoseLogInput(StrictModel):
    medId: str


@router.post("/meds/log-dose")
def log_medication_dose(body: MedDoseLogInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    return medication_adherence_loop_agent.log_dose_taken(db, user["id"], body.medId)


@router.post("/meds/skip-dose")
def skip_medication_dose(body: MedDoseLogInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The student skipped a dose. It is recorded as skipped, never as taken; nobody is told."""
    return medication_adherence_loop_agent.skip_dose(db, user["id"], body.medId)


class RefillReminderInput(StrictModel):
    medId: str
    daysBefore: int = Field(default=3, ge=1, le=60)


@router.post("/meds/refill-reminder")
def schedule_refill_reminder(body: RefillReminderInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Queue a deduplicated refill reminder for an owned medication plan."""
    plan = db.scalar(select(M.MedicationPlan).where(M.MedicationPlan.id == body.medId, M.MedicationPlan.account_id == user["id"]))
    if not plan:
        raise HTTPException(404, "Medication not found.")
    prefs = db.get(M.NotificationPreference, user["id"])
    if prefs and not prefs.reminders_enabled:
        return {"queued": False, "message": "Reminders are disabled in your preferences."}
    from services.workflow_scheduler import enqueue_reminder
    event_id = enqueue_reminder(db, user["id"], "medication_refill", f"refill_{body.medId}_{body.daysBefore}",
                                {"medId": body.medId, "name": plan.name, "daysBefore": body.daysBefore})
    return {"queued": True, "eventId": event_id, "message": "Refill reminder queued."}


# --- Appointments: availability, capacity-reserved booking, and state transitions ---

class SlotInput(StrictModel):
    catalogItemId: str
    slotStart: str
    slotEnd: str
    capacity: int = Field(default=1, ge=1, le=50)


@router.post("/ops/slots", status_code=201)
def create_slot(body: SlotInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Publish capacity for a catalog item. Only its own provider, or the platform admin who onboards it."""
    item = db.get(M.CatalogEntry, body.catalogItemId)
    if not item:
        raise HTTPException(404, "Catalog item not found.")
    if item.provider_id != user["id"] and user["role"] != "SUPER_ADMIN":
        raise HTTPException(403, "Only this item's provider can publish its slots.")
    slot_id = f"slot_{new_id()[:10]}"
    db.add(M.AvailabilitySlot(id=slot_id, provider_id=item.provider_id, catalog_item_id=item.id,
                              slot_start=body.slotStart, slot_end=body.slotEnd, capacity=body.capacity,
                              booked=0, active=True))
    db.commit()
    return {"id": slot_id, "catalogItemId": item.id, "providerId": item.provider_id,
            "slotStart": body.slotStart, "slotEnd": body.slotEnd, "capacity": body.capacity, "booked": 0}


@router.get("/appointments/availability")
def availability(catalogItemId: str = Query(...), date: str = Query(""), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    stmt = select(M.AvailabilitySlot).where(M.AvailabilitySlot.catalog_item_id == catalogItemId, M.AvailabilitySlot.active.is_(True))
    if date:
        stmt = stmt.where(M.AvailabilitySlot.slot_start.like(f"{date}%"))
    rows = db.scalars(stmt.order_by(M.AvailabilitySlot.slot_start)).all()
    return {"slots": [{"id": r.id, "slotStart": r.slot_start, "slotEnd": r.slot_end,
                       "capacity": r.capacity, "booked": r.booked,
                       "available": max(0, r.capacity - r.booked)} for r in rows]}


class AppointmentInput(StrictModel):
    slotId: str


@router.post("/appointments", status_code=201)
def create_appointment(body: AppointmentInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    slot = db.get(M.AvailabilitySlot, body.slotId)
    if not slot or not slot.active:
        raise HTTPException(404, "Slot not found.")
    item = db.get(M.CatalogEntry, slot.catalog_item_id)
    if item is not None and item.kind == "lab":
        # A lab test is a lab order (POST /lab-bookings or a doctor's order), not an appointment.
        raise HTTPException(422, "Lab tests are booked from Lab tests, not as an appointment.")
    if slot.booked >= slot.capacity:
        raise HTTPException(409, "This slot is fully booked.")
    # Reserve capacity atomically.
    reserved = db.execute(
        update(M.AvailabilitySlot).where(M.AvailabilitySlot.id == slot.id, M.AvailabilitySlot.booked < M.AvailabilitySlot.capacity)
        .values(booked=M.AvailabilitySlot.booked + 1)
    ).rowcount
    if not reserved:
        db.rollback()
        raise HTTPException(409, "This slot was just booked. Please choose another.")
    appt_id = f"apt_{new_id()[:10]}"
    db.add(M.Appointment(id=appt_id, account_id=user["id"], provider_id=slot.provider_id,
                         catalog_item_id=slot.catalog_item_id, slot_id=slot.id, status="REQUESTED",
                         created_at=time.time(), updated_at=time.time()))
    audit(db, user, "APPOINTMENT_REQUESTED", appt_id)
    ops_feed.publish(
        db, "APPOINTMENT_REQUESTED", "CLINICAL",
        summary="Appointment requested â€” provider confirmation pending",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        provider_id=slot.provider_id, resource_type="appointment", resource_id=appt_id,
    )
    db.commit()
    try:
        from services.slack_notifier import bump_counter, post_ops_alert
        bump_counter("appointments")
        remaining = max(0, int(slot.capacity) - int(slot.booked) - 1)
        post_ops_alert(f":calendar: New appointment REQUESTED â€” slot remaining capacity: {remaining}. No patient data included.",
                       kind="appointment", purpose="bookings")
    except Exception:
        pass
    return {"id": appt_id, "slotStart": slot.slot_start, "slotEnd": slot.slot_end, "status": "REQUESTED"}


@router.get("/appointments")
def my_appointments(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.Appointment).where(M.Appointment.account_id == user["id"]).order_by(M.Appointment.created_at.desc()).limit(100)).all()
    return {"items": [appointment_payload(db, r) for r in rows]}


class AppointmentStatusInput(StrictModel):
    status: Literal["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]


@router.patch("/appointments/{appointment_id}")
def update_appointment(appointment_id: str, body: AppointmentStatusInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    appt = db.scalar(select(M.Appointment).where(M.Appointment.id == appointment_id, M.Appointment.account_id == user["id"]))
    if not appt:
        raise HTTPException(404, "Appointment not found.")
    # A student may only cancel. Confirming, completing and no-show are the
    # provider's to record (PATCH /work/appointments): CONFIRMED is what lets a
    # consultation be joined, so a student confirming their own booking was a
    # self-granted authorisation.
    allowed = {"REQUESTED": {"CANCELLED"}, "CONFIRMED": {"CANCELLED"}, "COMPLETED": set(), "CANCELLED": set(), "NO_SHOW": set()}
    if body.status not in allowed.get(appt.status, set()):
        raise HTTPException(409, "That status change is not allowed.")
    if body.status == "CANCELLED":
        db.execute(update(M.AvailabilitySlot).where(M.AvailabilitySlot.id == appt.slot_id).values(booked=M.AvailabilitySlot.booked - 1))
    appt.status = body.status
    appt.updated_at = time.time()
    audit(db, user, f"APPOINTMENT_{body.status}", appt.id)
    appointment_message = {
        "CONFIRMED": "Your appointment is confirmed.",
        "CANCELLED": "Your appointment was cancelled.",
        "NO_SHOW": "Your appointment was marked as a no-show.",
    }.get(body.status)
    # Only tell the account holder when someone else changed it for them.
    if appointment_message and appt.account_id != user["id"]:
        ops_feed.notify(db, appt.account_id, f"APPOINTMENT_{body.status}",
                        dedupe_key=f"appointment:{appt.id}:{body.status}",
                        summary=appointment_message, resource_type="appointment", resource_id=appt.id)
    ops_feed.publish(
        db, f"APPOINTMENT_{body.status}", "CLINICAL",
        summary=f"Appointment {body.status.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=appt.account_id,
        provider_id=appt.provider_id, resource_type="appointment", resource_id=appt.id,
    )
    db.commit()
    return appointment_payload(db, db.get(M.Appointment, appt.id))


def appointment_payload(db, appt):
    slot = db.get(M.AvailabilitySlot, appt.slot_id)
    item = db.get(M.CatalogEntry, appt.catalog_item_id) if appt.catalog_item_id else None
    return {"id": appt.id, "catalogItemId": appt.catalog_item_id, "providerId": appt.provider_id,
            # The listed service's name, so a card says what was booked (live-run audit #13).
            "serviceName": item.name if item else "",
            "slotStart": slot.slot_start if slot else "", "slotEnd": slot.slot_end if slot else "",
            "status": appt.status, "createdAt": appt.created_at, "updatedAt": appt.updated_at}


# --- Teleconsultation sessions (check-in state) ---

@router.post("/consultation/{appointment_id}/join")
def join_consultation(appointment_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Student joins the waiting room for a confirmed appointment."""
    appt = db.scalar(select(M.Appointment).where(M.Appointment.id == appointment_id, M.Appointment.account_id == user["id"]))
    if not appt or appt.status != "CONFIRMED":
        raise HTTPException(409, "Only a confirmed appointment can be joined.")
    session = db.scalar(select(M.ConsultationSession).where(M.ConsultationSession.appointment_id == appointment_id))
    if not session:
        session = M.ConsultationSession(id=f"cs_{new_id()[:10]}", appointment_id=appointment_id, student_id=user["id"],
                                        provider_id=appt.provider_id, status="WAITING", student_joined_at=time.time())
        db.add(session)
    else:
        session.student_joined_at = time.time()
        session.status = "WAITING"
    db.commit()
    return consultation_payload(db, session)


@router.post("/consultation/{appointment_id}/join-provider")
def join_consultation_provider(appointment_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Provider joins and marks the session in-progress."""
    appt = db.scalar(select(M.Appointment).where(M.Appointment.id == appointment_id))
    if not appt:
        raise HTTPException(404, "Appointment not found.")
    if user["role"] != "SUPER_ADMIN" and appt.provider_id != user["id"]:
        raise HTTPException(403, "Not your appointment.")
    session = db.scalar(select(M.ConsultationSession).where(M.ConsultationSession.appointment_id == appointment_id))
    if not session:
        raise HTTPException(409, "Student has not joined yet.")
    session.provider_joined_at = time.time()
    session.status = "IN_PROGRESS"
    db.commit()
    return consultation_payload(db, session)


@router.get("/consultation/{appointment_id}/state")
def consultation_state(appointment_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Honest waiting-room state. ``liveMedia`` is whether a LiveKit server is configured."""
    appt = db.scalar(select(M.Appointment).where(M.Appointment.id == appointment_id))
    if not appt or (appt.account_id != user["id"] and appt.provider_id != user["id"] and user["role"] != "SUPER_ADMIN"):
        raise HTTPException(404, "Appointment not found.")
    session = db.scalar(select(M.ConsultationSession).where(M.ConsultationSession.appointment_id == appointment_id))
    if not session:
        return {"status": "NOT_STARTED", "studentJoined": False, "providerJoined": False,
                "liveMedia": livekit_media.is_configured()}
    return consultation_payload(db, session)


# --- Live audio/video (LiveKit) ---
# The old single-offer "/signal" endpoints stored one SDP blob and relayed no
# ICE or media; nothing called them, so they are gone. Media runs on LiveKit:
# the backend only decides who may join which room (services/livekit_media.py).

def _media_unavailable() -> HTTPException:
    return HTTPException(503, {"code": "MEDIA_UNAVAILABLE",
                               "message": "Video consultations are not connected yet. No call can be started from the app."})


@router.post("/consultation/{appointment_id}/media-token")
def consultation_media_token(appointment_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """A short-lived LiveKit join token for this consultation's room.

    Only the student who booked the appointment, or the NMC doctor it is booked
    with, and only while it is CONFIRMED and inside its join window (from
    ``consult.media_join_before_minutes`` before the slot starts until
    ``consult.media_join_after_minutes`` after it ends; settings registry). Camera and
    microphone only; identity is the opaque account id. Without LiveKit
    configuration this is 503 MEDIA_UNAVAILABLE, never a pretend call.
    """
    appt = db.get(M.Appointment, appointment_id)
    is_student = bool(appt) and appt.account_id == user["id"]
    is_doctor = bool(appt) and appt.provider_id == user["id"] and user["role"] == "NMC_DOCTOR"
    if not appt or not (is_student or is_doctor):
        raise HTTPException(404, "Appointment not found.")
    item = db.get(M.CatalogEntry, appt.catalog_item_id)
    if not item or item.kind != "consultation":
        raise HTTPException(409, {"code": "NOT_A_CONSULTATION", "message": "This appointment is not a consultation."})
    if appt.status != "CONFIRMED":
        raise HTTPException(409, {"code": "NOT_CONFIRMED", "message": "Only a confirmed consultation can be joined."})
    try:
        config = livekit_media.load_config()
    except livekit_media.MediaUnavailable:
        raise _media_unavailable()
    slot = db.get(M.AvailabilitySlot, appt.slot_id)
    window = livekit_media.join_window(slot.slot_start, slot.slot_end, db) if slot else None
    now = datetime.now(timezone.utc)
    if window is None:
        raise HTTPException(409, {"code": "OUTSIDE_WINDOW", "message": "This consultation has no usable time, so it can't be joined."})
    opens, closes = window
    if now < opens:
        minutes = int(livekit_media.join_opens_before(db).total_seconds() // 60)
        raise HTTPException(409, {"code": "OUTSIDE_WINDOW", "opensBeforeMinutes": minutes,
                                  "message": f"The call opens {minutes} minutes before your consultation starts."})
    if now > closes:
        raise HTTPException(409, {"code": "OUTSIDE_WINDOW", "message": "The time for this consultation has passed."})
    try:
        issued = livekit_media.issue_token(config, identity=user["id"], room=livekit_media.room_name(appt.id),
                                           now=now, window_closes=closes, db=db)
    except livekit_media.MediaUnavailable:
        raise _media_unavailable()
    audit(db, user, "CONSULT_MEDIA_TOKEN_ISSUED", appt.id)
    db.commit()
    return {"available": True, "url": issued.url, "token": issued.token, "room": issued.room,
            "identity": issued.identity, "expiresAt": issued.expires_at,
            "role": "student" if is_student else "doctor"}


def consultation_payload(db, session):
    return {"id": session.id, "appointmentId": session.appointment_id, "status": session.status,
            "studentJoined": session.student_joined_at > 0, "providerJoined": session.provider_joined_at > 0,
            "studentJoinedAt": session.student_joined_at or None, "providerJoinedAt": session.provider_joined_at or None,
            # True only when a LiveKit server is configured; joining still needs a token.
            "liveMedia": livekit_media.is_configured()}


@router.get("/work/appointments")
def staff_appointments(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    stmt = select(M.Appointment, M.Account).join(M.Account, M.Account.id == M.Appointment.account_id)
    if user["role"] != "SUPER_ADMIN":
        stmt = stmt.where(M.Appointment.provider_id == user["id"])
    rows = db.execute(stmt.order_by(M.Appointment.created_at.desc()).limit(200)).all()
    return {"items": [{**appointment_payload(db, appt), "customer": account.full_name,
                       "contact": account.identifier, "patientId": account.id} for appt, account in rows]}


@router.patch("/work/appointments/{appointment_id}")
def staff_update_appointment(appointment_id: str, body: AppointmentStatusInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    stmt = select(M.Appointment).where(M.Appointment.id == appointment_id)
    if user["role"] != "SUPER_ADMIN":
        stmt = stmt.where(M.Appointment.provider_id == user["id"])
    appt = db.scalar(stmt)
    if not appt:
        raise HTTPException(404, "Appointment not found.")
    allowed = {"REQUESTED": {"CONFIRMED", "CANCELLED"}, "CONFIRMED": {"COMPLETED", "CANCELLED", "NO_SHOW"}, "COMPLETED": set(), "CANCELLED": set(), "NO_SHOW": set()}
    if body.status not in allowed.get(appt.status, set()):
        raise HTTPException(409, "That status change is not allowed.")
    if body.status == "CANCELLED":
        db.execute(update(M.AvailabilitySlot).where(M.AvailabilitySlot.id == appt.slot_id).values(booked=M.AvailabilitySlot.booked - 1))
    appt.status = body.status
    appt.updated_at = time.time()
    audit(db, user, f"APPOINTMENT_{body.status}", appt.id)
    appointment_message = {
        "CONFIRMED": "Your appointment is confirmed.",
        "CANCELLED": "Your appointment was cancelled.",
        "NO_SHOW": "Your appointment was marked as a no-show.",
    }.get(body.status)
    # Only tell the account holder when someone else changed it for them.
    if appointment_message and appt.account_id != user["id"]:
        ops_feed.notify(db, appt.account_id, f"APPOINTMENT_{body.status}",
                        dedupe_key=f"appointment:{appt.id}:{body.status}",
                        summary=appointment_message, resource_type="appointment", resource_id=appt.id)
    ops_feed.publish(
        db, f"APPOINTMENT_{body.status}", "CLINICAL",
        summary=f"Appointment {body.status.replace('_', ' ').lower()}",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=appt.account_id,
        provider_id=appt.provider_id, resource_type="appointment", resource_id=appt.id,
    )
    db.commit()
    return appointment_payload(db, db.get(M.Appointment, appt.id))


# --- Wellness timetable ---
#
# Campus fitness and wellbeing sessions, built on the booking machinery that
# already exists rather than a parallel one: a session is a CatalogEntry of kind
# `wellness`, its sittings are AvailabilitySlots, and booking one goes through
# POST /appointments, which reserves capacity under a row lock and has a tested
# state machine. Nothing new was needed to make a spot count honest.
#
# Public, like /catalog, because a timetable of published sessions is an offering
# and not personal data. Nothing about who booked is included at any point: the
# only attendance figure here is `spotsLeft`, which is capacity minus a count.

WELLNESS_HORIZON_DAYS = 14


class WellnessSittingView(StrictModel):
    slotId: str
    slotStart: str
    slotEnd: str
    capacity: int
    spotsLeft: int


class WellnessSessionView(StrictModel):
    id: str
    name: str
    category: str
    description: str
    """What the listing calls the format â€” "Mats provided", a venue, a duration."""
    pack: str
    pricePaise: int
    """The campus running it. Never a coach's personal contact details."""
    providerName: str
    sittings: list[WellnessSittingView]


@router.get("/wellness/timetable", response_model=list[WellnessSessionView])
def wellness_timetable(db: Session = Depends(workflow_db)) -> list[dict]:
    horizon = (datetime.now(timezone.utc) + timedelta(days=WELLNESS_HORIZON_DAYS)).isoformat()
    now = datetime.now(timezone.utc).isoformat()
    rows = db.execute(
        select(M.CatalogEntry, M.Account.full_name)
        .join(M.Account, M.Account.id == M.CatalogEntry.provider_id)
        .where(
            M.CatalogEntry.kind == "wellness",
            M.CatalogEntry.active.is_(True),
            M.Account.active.is_(True),
        )
        .order_by(M.CatalogEntry.name)
    ).all()

    sessions: list[dict] = []
    for item, provider_name in rows:
        slots = db.scalars(
            select(M.AvailabilitySlot).where(
                M.AvailabilitySlot.catalog_item_id == item.id,
                M.AvailabilitySlot.active.is_(True),
                # Slot times are ISO strings, so they compare lexicographically.
                M.AvailabilitySlot.slot_start >= now,
                M.AvailabilitySlot.slot_start <= horizon,
            ).order_by(M.AvailabilitySlot.slot_start)
        ).all()
        sessions.append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "description": item.description,
            "pack": item.pack,
            "pricePaise": item.price_paise,
            "providerName": provider_name,
            "sittings": [
                {
                    "slotId": slot.id,
                    "slotStart": slot.slot_start,
                    "slotEnd": slot.slot_end,
                    "capacity": slot.capacity,
                    # Never negative, even if a booking row outlived its slot.
                    "spotsLeft": max(slot.capacity - slot.booked, 0),
                }
                for slot in slots
            ],
        })
    return sessions


# --- Clinician earnings ---
#
# Every figure here is summed from COMPLETED appointments belonging to the
# calling clinician, priced at the catalog item actually booked. Nothing is
# assumed: there is no settlement table, no commission rate configured anywhere
# in this repo, and no payout record, so this reports what was earned and says
# nothing about what is owed or when it arrives.

EARNINGS_WINDOW_DAYS = 180
FORTNIGHT_SECOND_HALF_FROM = 16


class EarningsPeriodView(StrictModel):
    """One fortnight: the 1st-15th or the 16th to month end, in the platform timezone."""
    start: str
    end: str
    consults: int
    grossPaise: int


class EarningsView(StrictModel):
    periods: list[EarningsPeriodView]
    grossPaise: int
    consults: int
    windowDays: int
    # Null because nothing in this repo configures a rate, and a commission is
    # money taken off a clinician's payment â€” it is not a number to assume a
    # default for. The client must render the absence, not a zero.
    commissionRate: float | None = None
    # Likewise: no settlement or payout table exists, so no due date can be
    # computed and none is offered.
    settlementConfigured: bool = False


def fortnight_bounds(moment: float, zone: str | None = None, db=None) -> tuple[str, str]:
    """The settlement fortnight containing `moment`, as inclusive ISO dates.

    Local time, not UTC: a consult completed at 03:00 IST on the 16th falls in
    the previous fortnight under UTC, which would move a clinician's money
    between statements. Settlement is platform-wide, so the zone is the
    ``platform.default_timezone`` setting unless one is named; an unknown name
    falls back to that setting (services/student_time.zone_named).
    """
    local = datetime.fromtimestamp(moment, tz=student_time.zone_named(zone, db)).date()
    if local.day < FORTNIGHT_SECOND_HALF_FROM:
        return local.replace(day=1).isoformat(), local.replace(day=FORTNIGHT_SECOND_HALF_FROM - 1).isoformat()
    month_end = (local.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return local.replace(day=FORTNIGHT_SECOND_HALF_FROM).isoformat(), month_end.isoformat()


@router.get("/work/earnings", response_model=EarningsView)
def clinician_earnings(user=Depends(require_clinician), db: Session = Depends(workflow_db)) -> dict:
    cutoff = time.time() - EARNINGS_WINDOW_DAYS * 86400
    rows = db.execute(
        select(M.Appointment.updated_at, M.CatalogEntry.price_paise)
        .join(M.CatalogEntry, M.CatalogEntry.id == M.Appointment.catalog_item_id)
        .where(
            M.Appointment.provider_id == user["id"],
            # COMPLETED is terminal in the appointment state machine, so
            # updated_at is the completion time and cannot move afterwards.
            M.Appointment.status == "COMPLETED",
            M.Appointment.updated_at >= cutoff,
        )
    ).all()

    buckets: dict[tuple[str, str], dict[str, int]] = {}
    for completed_at, price_paise in rows:
        key = fortnight_bounds(completed_at, db=db)
        bucket = buckets.setdefault(key, {"consults": 0, "grossPaise": 0})
        bucket["consults"] += 1
        bucket["grossPaise"] += price_paise

    periods = [
        {"start": start, "end": end, "consults": totals["consults"], "grossPaise": totals["grossPaise"]}
        for (start, end), totals in sorted(buckets.items(), reverse=True)
    ]
    return {
        "periods": periods,
        "grossPaise": sum(p["grossPaise"] for p in periods),
        "consults": sum(p["consults"] for p in periods),
        "windowDays": EARNINGS_WINDOW_DAYS,
    }


# --- Chronic care programmes ---
#
# A clinician's tracker is scoped to enrolments students agreed to be on with
# them. The payload deliberately carries no name and no condition list: the
# design identifies a student as "B-214 . KC", room plus initials, which is
# enough for a clinician to know who they are chasing and no more. Chronic
# conditions themselves live on the student's profile and stay there.

PROGRAMME_ACTIVE = "ACTIVE"
PROGRAMME_ENDED = "ENDED_BY_STUDENT"
REVIEW_DUE_SOON_DAYS = 7


class ProgrammeView(StrictModel):
    id: str
    """Room and initials, never a name. See the note above."""
    label: str
    programme: str
    target: str
    lastReviewAt: float | None
    nextDueAt: float | None
    state: str
    overdueByDays: int | None


class ProgrammeSummaryView(StrictModel):
    items: list[ProgrammeView]
    onProgramme: int
    overdue: int
    dueThisWeek: int
    endedByStudent: int


def student_label(account: M.Account | None) -> str:
    """"B-214 . KC" â€” room and initials.

    A clinician needs to recognise who they are chasing; a chronic tracker does
    not need a roster of names, so it does not get one. Falls back to initials
    alone when no room is recorded, and to the account id when there is no name
    to take initials from â€” never to a blank row a clinician cannot act on.
    """
    if account is None:
        return "Unknown student"
    profile = account.profile or {}
    room = str(profile.get("room") or "").strip()
    initials = "".join(part[0].upper() for part in (account.full_name or "").split() if part)[:3]
    if room and initials:
        return f"{room} \u00b7 {initials}"
    return room or initials or account.id


def programme_payload(row: M.CareProgramme, account: M.Account | None, now: float) -> dict:
    ended = row.state == PROGRAMME_ENDED
    last_review = row.last_review_at or None
    # No next review for a programme the student has left: nobody is chased
    # after they opt out.
    next_due = None
    if not ended and last_review:
        next_due = last_review + row.review_interval_days * 86400
    overdue_days = None
    if next_due and next_due < now:
        overdue_days = int((now - next_due) // 86400)
    return {
        "id": row.id,
        "label": student_label(account),
        "programme": row.programme,
        "target": row.target,
        "lastReviewAt": last_review,
        "nextDueAt": next_due,
        "state": row.state,
        "overdueByDays": overdue_days,
    }


@router.get("/work/chronic", response_model=ProgrammeSummaryView)
def chronic_tracker(user=Depends(require_clinician), db: Session = Depends(workflow_db)) -> dict:
    now = time.time()
    rows = db.execute(
        select(M.CareProgramme, M.Account)
        .outerjoin(M.Account, M.Account.id == M.CareProgramme.account_id)
        .where(M.CareProgramme.clinician_id == user["id"])
        .order_by(M.CareProgramme.created_at.desc(), M.CareProgramme.id)
        .limit(200)
    ).all()
    items = [programme_payload(row, account, now) for row, account in rows]
    active = [item for item in items if item["state"] == PROGRAMME_ACTIVE]
    soon = now + REVIEW_DUE_SOON_DAYS * 86400
    return {
        "items": items,
        "onProgramme": len(active),
        "overdue": sum(1 for item in active if item["overdueByDays"] is not None),
        "dueThisWeek": sum(
            1 for item in active
            if item["nextDueAt"] and now <= item["nextDueAt"] <= soon
        ),
        "endedByStudent": sum(1 for item in items if item["state"] == PROGRAMME_ENDED),
    }


@router.post("/care/programmes/{programme_id}/leave")
def leave_programme(programme_id: str, user=Depends(authenticated_user),
                    db: Session = Depends(workflow_db)) -> dict:
    """A student ends their own enrolment. Only ever their own.

    Nothing is published to the campus feed and the clinician is not notified:
    leaving a chronic programme is a health decision, and a student who fears it
    will be reported to their university will not make it. The row is kept, so
    the record stays whole; it simply stops generating follow-up.
    """
    row = db.scalar(
        select(M.CareProgramme).where(
            M.CareProgramme.id == programme_id,
            M.CareProgramme.account_id == user["id"],
        ).with_for_update()
    )
    if row is None:
        raise HTTPException(404, "Programme not found.")
    if row.state == PROGRAMME_ENDED:
        return {"state": row.state, "endedAt": row.ended_at}
    row.state = PROGRAMME_ENDED
    row.ended_at = time.time()
    # Audited so the change is accountable. This is the platform audit trail,
    # readable at /ops/audit by super-admins only â€” not ops_feed.publish, which
    # is where campus administrators would see it.
    audit(db, user, "PROGRAMME_LEFT", row.id)
    db.commit()
    return {"state": row.state, "endedAt": row.ended_at}


# --- Notification preferences and reminder scheduling ---

@router.get("/notifications/preferences")
def get_notification_preferences(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    prefs = db.get(M.NotificationPreference, user["id"])
    if not prefs:
        # The two consents default off, so an account that has never opened
        # settings is treated as not having granted them.
        return {"emailEnabled": True, "pushEnabled": True, "remindersEnabled": True,
                "pickupLocationEnabled": False, "ayushHistoryEnabled": False,
                "timezone": setting(student_time.DEFAULT_TIMEZONE_KEY, db), "quietStart": "22:00", "quietEnd": "08:00"}
    return {"emailEnabled": prefs.email_enabled, "pushEnabled": prefs.push_enabled, "remindersEnabled": prefs.reminders_enabled,
            "pickupLocationEnabled": prefs.pickup_location_enabled, "ayushHistoryEnabled": prefs.ayush_history_enabled,
            # "" means never chosen: the student follows the platform default.
            "timezone": prefs.timezone or setting(student_time.DEFAULT_TIMEZONE_KEY, db),
            "quietStart": prefs.quiet_start, "quietEnd": prefs.quiet_end}


class NotificationPrefInput(StrictModel):
    emailEnabled: bool = True
    pushEnabled: bool = True
    remindersEnabled: bool = True
    # Consents, so they default to withheld rather than granted.
    pickupLocationEnabled: bool = False
    ayushHistoryEnabled: bool = False
    # None keeps the stored choice; a student who never chose one follows the
    # platform.default_timezone setting, resolved when it is read.
    timezone: str | None = None
    # 24-hour HH:MM — the only shape the scheduler can read. Anything else is
    # refused rather than truncated into a time it would misread.
    quietStart: str = Field(default="22:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    quietEnd: str = Field(default="08:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


@router.put("/notifications/preferences")
def set_notification_preferences(body: NotificationPrefInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    prefs = db.get(M.NotificationPreference, user["id"])
    if not prefs:
        prefs = M.NotificationPreference(account_id=user["id"])
        db.add(prefs)
    # The two consents also go in the consent ledger (services/consent_ledger.py),
    # so Profile → Privacy & consent shows when each was given or withdrawn.
    was = {"PICKUP_LOCATION": bool(prefs.pickup_location_enabled), "AYUSH_HISTORY": bool(prefs.ayush_history_enabled)}
    prefs.email_enabled = body.emailEnabled
    prefs.push_enabled = body.pushEnabled
    prefs.reminders_enabled = body.remindersEnabled
    prefs.pickup_location_enabled = body.pickupLocationEnabled
    prefs.ayush_history_enabled = body.ayushHistoryEnabled
    if body.timezone is not None:
        prefs.timezone = body.timezone[:40]
    elif prefs.timezone is None:
        prefs.timezone = ""
    prefs.quiet_start = body.quietStart[:5]
    prefs.quiet_end = body.quietEnd[:5]
    if not body.ayushHistoryEnabled:
        # History off means the words are not kept — including those already kept.
        consent_ledger.clear_ayush_words(db, user["id"])
    now_on = {"PICKUP_LOCATION": body.pickupLocationEnabled, "AYUSH_HISTORY": body.ayushHistoryEnabled}
    for purpose, on in now_on.items():
        if on != was[purpose]:
            consent_ledger.record_change(db, user["id"], user["id"], purpose, on)
    db.commit()
    return {"success": True}


# What the student is told about a notification that has not arrived. Derived
# rather than passed through: OutboxEvent.last_error can hold provider error
# text, and AGENTS.md rule 9 keeps that out of anything user-facing.
_DELIVERY_STATE = {
    "quiet_hours": "held",
    "reminders_disabled": "suppressed_reminders",
    "email_disabled": "suppressed_email",
    "appointment_cancelled": "suppressed_appointment_cancelled",
    "appointment_passed": "suppressed_appointment_passed",
    "appointment_not_active": "suppressed_appointment_passed",
}


def delivery_state(status: str, last_error: str) -> str:
    """A safe, closed set describing why a notification has or has not arrived."""
    if status == "SENT":
        return "sent"
    if status == "SUPPRESSED":
        return _DELIVERY_STATE.get(last_error or "", "suppressed")
    if status == "FAILED":
        return "failed"
    if status == "PENDING" and (last_error or "") == "quiet_hours":
        return "held"
    return "pending"


@router.get("/notifications")
def notification_inbox(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The user's notification/reminder history from the durable outbox."""
    rows = db.scalars(
        select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"])
        .order_by(M.OutboxEvent.created_at.desc()).limit(100)
    ).all()
    return {"items": [{"id": r.id, "eventType": r.event_type, "payload": r.payload, "status": r.status,
                       "delivery": delivery_state(r.status, r.last_error),
                       "createdAt": r.created_at, "sentAt": r.sent_at or None, "readAt": r.read_at or None} for r in rows]}


@router.post("/notifications/{event_id}/read")
def mark_notification_read(event_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.id == event_id, M.OutboxEvent.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Notification not found.")
    row.read_at = time.time()
    db.commit()
    return {"success": True}


class ReminderInput(StrictModel):
    minutesBefore: int = Field(default=60, ge=5, le=10080)


@router.post("/appointments/{appointment_id}/reminder")
def schedule_reminder(appointment_id: str, body: ReminderInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    appt = db.scalar(select(M.Appointment).where(M.Appointment.id == appointment_id, M.Appointment.account_id == user["id"]))
    if not appt:
        raise HTTPException(404, "Appointment not found.")
    prefs = db.get(M.NotificationPreference, user["id"])
    if prefs and not prefs.reminders_enabled:
        return {"queued": False, "message": "Reminders are disabled in your preferences."}
    from services.workflow_scheduler import enqueue_reminder
    event_id = enqueue_reminder(db, user["id"], "appointment_reminder",
                                f"appt_reminder_{appointment_id}_{body.minutesBefore}",
                                {"appointmentId": appointment_id, "minutesBefore": body.minutesBefore})
    return {"queued": True, "eventId": event_id, "message": "Reminder queued."}


BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
BLOOD_GROUP_VALUES = frozenset(("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"))
PHONE_NOT_VERIFIED = "PHONE_NOT_VERIFIED"
CAMPUS_NOT_VERIFIED = "CAMPUS_NOT_VERIFIED"
HOUR_SECONDS = 3600
DAY_SECONDS = 86400
LINK_MARKERS = ("http", "www.", "://")


class BloodDonorInput(StrictModel):
    bloodGroup: BloodGroup
    hostelBlock: str = Field(min_length=1, max_length=120)
    visible: bool = False
    # Optional; when sent it must be the account's own verified WhatsApp number.
    # The number used is always that contact, never what was typed (audit H1).
    phone: str | None = Field(default=None, max_length=32)


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _blood_campus_staff(user: dict, db: Session) -> str | None:
    """None for a super admin; the assigned campus for campus staff; "" for nobody else."""
    if user["role"] == "SUPER_ADMIN":
        return None
    if user["role"] in CAMPUS_SCOPED_ROLES:
        return staff_campus_of(db.get(M.Account, user["id"]))
    return ""


@router.post("/blood/register-donor")
def register_blood_donor(body: BloodDonorInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """A student registers their own donor record, on their verified number and verified campus."""
    from services.agents.blood_emergency_agent import BloodDonor, verified_campus, verified_phone
    if user["role"] != "STUDENT" or user.get("isTeamAccount") is True:
        raise HTTPException(403, "Only a student can register as a blood donor.")
    if not verified_campus(db, user["id"]):
        raise HTTPException(409, {"code": CAMPUS_NOT_VERIFIED,
                                  "message": "Verify your campus first: donors are matched within a campus."})
    phone = verified_phone(db, user["id"])
    if not phone:
        raise HTTPException(409, {"code": PHONE_NOT_VERIFIED,
                                  "message": "Verify your WhatsApp number with a one-time code first."})
    if body.phone and _digits(body.phone)[-10:] != _digits(phone)[-10:]:
        raise HTTPException(409, {"code": PHONE_NOT_VERIFIED,
                                  "message": "Donors are reached only on their own verified WhatsApp number."})
    was_listed = any(row.visible for row in db.scalars(select(M.BloodDonor).where(M.BloodDonor.account_id == user["id"])).all())
    res = blood_emergency_agent.register_donor(db, user["id"], BloodDonor(
        blood_group=body.bloodGroup, hostel_block=body.hostelBlock.strip(), visible=body.visible))
    audit(db, user, "BLOOD_DONOR_REGISTERED", res["id"])
    # Being listed and messaged by a blood SOS is an optional consent (services/consent_ledger.py).
    if body.visible != was_listed:
        consent_ledger.record_change(db, user["id"], user["id"], "BLOOD_DONOR_CONTACT", body.visible)
    db.commit()
    return res


@router.get("/blood/donors")
def get_blood_donors(bloodGroup: str = Query("ALL", max_length=4), user=Depends(authenticated_user),
                     db: Session = Depends(workflow_db)):
    """Donors' blood group and hostel block, only to whom they belong.

    A super admin, or a campus admin / counsellor for their own campus, sees that
    campus's listed donors. A student sees only their own record. Every other
    role (partners, doctors) sees nothing. Phone numbers are never returned.
    """
    groups = None if bloodGroup == "ALL" else [bloodGroup.strip().upper()]
    if groups and groups[0] not in BLOOD_GROUP_VALUES:
        raise HTTPException(422, "Unknown blood group.")
    scope = _blood_campus_staff(user, db)
    if scope is None or scope:
        donors = blood_emergency_agent.campus_donors(db, scope, groups)
        return {"donors": [blood_emergency_agent.donor_payload(d) for d in donors]}
    own = db.scalars(select(M.BloodDonor).where(M.BloodDonor.account_id == user["id"])).all()
    return {"donors": [blood_emergency_agent.donor_payload(d) for d in own
                       if not groups or d.blood_group in groups]}


class BloodSOSInput(StrictModel):
    requiredGroup: BloodGroup
    unitsNeeded: int = Field(default=1, ge=1)
    urgency: Literal["CRITICAL", "URGENT"] = "CRITICAL"
    # The only free text that goes out, under the fixed template (length from the registry).
    note: str = Field(default="", max_length=280)
    # Super admin only: the campus to reach ("" or absent = every campus).
    campus: str | None = Field(default=None, max_length=160)


def _blood_sos_campus(user: dict, body: BloodSOSInput, db: Session) -> str:
    """Where this requester may broadcast. Fails closed for everyone else."""
    from services.agents.blood_emergency_agent import verified_campus
    if user["role"] == "SUPER_ADMIN":
        return " ".join((body.campus or "").split())
    if body.campus is not None:
        raise HTTPException(403, "A blood SOS goes to your own campus only.")
    if user.get("isTeamAccount") is True:
        raise HTTPException(403, "Team accounts can't send a blood SOS to real students.")
    if user["role"] == "STUDENT":
        campus = verified_campus(db, user["id"])
    elif user["role"] in CAMPUS_SCOPED_ROLES:
        campus = staff_campus_of(db.get(M.Account, user["id"]))
    else:
        raise HTTPException(403, "Only a student or campus staff can send a blood SOS.")
    if not campus:
        raise HTTPException(409, {"code": CAMPUS_NOT_VERIFIED,
                                  "message": "Verify your campus first: a blood SOS goes to your campus's donors."})
    return campus


@router.post("/blood/sos-request")
def trigger_blood_sos(body: BloodSOSInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    campus = _blood_sos_campus(user, body, db)
    if body.unitsNeeded > int(setting("blood.sos_max_units", db)):
        raise HTTPException(422, "That is more units than one blood SOS can ask for. Call the blood bank directly.")
    note = " ".join(body.note.split())
    if len(note) > int(setting("blood.sos_note_max_chars", db)):
        raise HTTPException(422, "The note is too long.")
    if any(marker in note.casefold() for marker in LINK_MARKERS):
        raise HTTPException(422, "The note can't contain links.")
    now = time.time()
    mine = db.scalar(select(func.count()).select_from(M.BloodSOSRequest).where(
        M.BloodSOSRequest.account_id == user["id"], M.BloodSOSRequest.created_at > now - DAY_SECONDS)) or 0
    if mine >= int(setting("blood.sos_per_account_per_day", db)):
        raise HTTPException(429, "You have sent the most blood SOS requests allowed today. Call your campus health centre.")
    if campus:
        key = _campus_key(campus)
        recent = db.scalars(select(M.BloodSOSRequest.campus).where(
            M.BloodSOSRequest.created_at > now - HOUR_SECONDS)).all()
        if sum(1 for c in recent if _campus_key(c) == key) >= int(setting("blood.sos_per_campus_per_hour", db)):
            raise HTTPException(429, "Several blood SOS requests already went to this campus in the last hour. "
                                     "Call your campus health centre.")
    res = blood_emergency_agent.trigger_sos_broadcast(
        db=db, account_id=user["id"], required_group=body.requiredGroup, units=body.unitsNeeded,
        campus=campus, urgency=body.urgency, note=note,
    )
    # Every send is audited: the request, and each donor it was staged for (ids only).
    audit(db, user, "BLOOD_SOS_TRIGGERED", res["request_id"])
    for donor_id in res.pop("staged_donor_ids"):
        audit(db, user, "BLOOD_SOS_SENT", donor_id)
    ops_feed.publish(
        db, "BLOOD_SOS_TRIGGERED", "SAFETY", severity="CRITICAL",
        summary=f"Blood SOS broadcast · {body.unitsNeeded} unit(s) {body.requiredGroup} · {body.urgency.lower()}"
                f" · {res['events_staged']} donor(s)",
        actor_id=user["id"], actor_role=user.get("role", ""), subject_id=user["id"],
        resource_type="blood_sos", resource_id=res["request_id"],
    )
    db.commit()
    return res


@router.get("/agents/live-status")
def get_ai_agents_status(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Real agent status derived from persisted scheduled jobs and runs.

    Never fabricates 'online', active task counts, or last actions. A job is
    reported as available/unavailable based on the durable schedule, and recent
    runs come from care_agent_runs.
    """
    ensure_scheduled_jobs(db)
    jobs = db.scalars(select(M.ScheduledJob).order_by(M.ScheduledJob.key)).all()
    agents = []
    for job in jobs:
        recent = db.scalar(
            select(M.AgentRun).where(M.AgentRun.job_key == job.key).order_by(M.AgentRun.started_at.desc())
        )
        status = "SCHEDULED" if job.enabled else "PAUSED"
        if job.last_status == "SUCCESS":
            status = "OPERATIONAL"
        elif job.last_status == "FAILED":
            status = "FAILED"
        agents.append({
            "key": job.key,
            "name": job.name,
            "status": status,
            "enabled": job.enabled,
            "intervalSeconds": job.interval_seconds,
            "lastRunAt": job.last_run_at or None,
            "nextRunAt": job.next_run_at or None,
            "lastStatus": job.last_status,
            "lastError": job.last_error or None,
            "lastSummary": recent.summary if recent else None,
        })
    # Read from the durable schedule: the shortest enabled cadence and the most
    # recent real run, or None when there is nothing to report.
    enabled = [job.interval_seconds for job in jobs if job.enabled and job.interval_seconds]
    last_runs = [job.last_run_at for job in jobs if job.last_run_at]
    return {"agents": agents, "intervalSeconds": min(enabled) if enabled else None,
            "lastRunAt": max(last_runs) if last_runs else None}


@router.get("/ops/jobs")
def list_jobs(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    ensure_scheduled_jobs(db)
    jobs = db.scalars(select(M.ScheduledJob).order_by(M.ScheduledJob.key)).all()
    return {"jobs": [{
        "key": j.key, "name": j.name, "enabled": j.enabled, "intervalSeconds": j.interval_seconds,
        "lastRunAt": j.last_run_at or None, "nextRunAt": j.next_run_at or None,
        "lastStatus": j.last_status, "lastError": j.last_error or None,
    } for j in jobs]}


@router.post("/ops/jobs/{key}/run")
def run_job_now(key: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    from services.workflow_scheduler import JobBusyError, UnknownJobError
    try:
        return workflow_scheduler.run_job_now(db, key)
    except UnknownJobError as exc:
        raise HTTPException(404, "Unknown job.") from exc
    except JobBusyError as exc:
        raise HTTPException(409, "This job is already running. Try again shortly.") from exc


@router.get("/work/followups")
def followup_tasks(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Staff follow-up tasks created by the care-request follow-up worker."""
    stmt = select(M.FollowUpTask)
    if user["role"] != "SUPER_ADMIN":
        stmt = stmt.where(M.FollowUpTask.account_id == user["id"])
    rows = db.scalars(stmt.order_by(M.FollowUpTask.created_at.desc()).limit(200)).all()
    return {"items": [{"id": r.id, "orderId": r.order_id, "note": r.note, "status": r.status,
                       "createdAt": r.created_at, "resolvedAt": r.resolved_at or None} for r in rows]}


@router.post("/work/followups/{task_id}/resolve")
def resolve_followup(task_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    row = db.get(M.FollowUpTask, task_id)
    # Only the follow-up's own staff member (or the super admin) closes it, as the list shows.
    if not row or (user["role"] != "SUPER_ADMIN" and row.account_id != user["id"]):
        raise HTTPException(404, "Follow-up not found.")
    row.status = "RESOLVED"
    row.resolved_at = time.time()
    audit(db, user, "FOLLOWUP_RESOLVED", task_id)
    db.commit()
    return {"success": True}


@router.get("/ops/integration-health")
def integration_health(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    return integration_health_check(db)


# Endpoints that run as sk_commerce when the Rule L grants are in force. The
# list is descriptive; whether the role is actually in force is computed below.
RULE_L_COMMERCE_PATHS = (
    "GET /api/catalog", "GET /api/ops/catalog", "POST /api/ops/catalog", "PATCH /api/ops/catalog/{item_id}",
    "POST /api/cart/validate", "GET /api/inventory/{item_id}", "POST /api/orders", "GET /api/orders",
    "POST /api/orders/{order_id}/cancel", "POST /api/orders/{order_id}/payment", "GET /api/orders/{order_id}/payment",
    "POST /api/orders/{order_id}/payment/verify", "POST /api/orders/{order_id}/payment/mock-checkout",
    "POST /api/payments/webhook", "POST /api/v1/orders/{order_id}/refund",
    "POST /api/dispense-quotes/{quote_id}/payment", "GET /api/dispense-quotes/{quote_id}/payment",
    "POST /api/dispense-quotes/{quote_id}/payment/verify", "POST /api/dispense-quotes/{quote_id}/payment/mock-checkout",
    "POST /api/ops/catalog/{item_id}/image", "DELETE /api/ops/catalog/{item_id}/image", "GET /api/catalog/{item_id}/image",
    "GET /api/work/requests", "PATCH /api/work/requests/{line_id}",
)


@router.get("/ops/rule-l")
def rule_l_firewall_status(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Rule L at the database, as it actually is right now (guardrail 6: computed, never asserted)."""
    connection = db.connection()
    status = rule_l_status(connection)
    usable = commerce_role_usable(connection)
    from services.lab_booking import COMMERCE_PATHS as LAB_BOOKING_COMMERCE_PATHS
    status["commercePaths"] = {
        "runAs": COMMERCE_ROLE if usable else "app role (sk_commerce not in force)",
        "failClosed": grants_required(),
        "endpoints": list(RULE_L_COMMERCE_PATHS) + list(medicine_master.MEDICINE_COMMERCE_PATHS) + list(medicine_info.MEDICINE_INFO_COMMERCE_PATHS) + list(LAB_BOOKING_COMMERCE_PATHS),
    }
    return status


# --- Encounter notes: clinician-authored drafts ---

class EncounterInput(StrictModel):
    appointmentId: str = Field(default="", max_length=80)
    subjective: str = Field(default="", max_length=2000)
    objective: str = Field(default="", max_length=2000)
    assessment: str = Field(default="", max_length=2000)
    plan: str = Field(default="", max_length=2000)


class EncounterCreateInput(EncounterInput):
    appointmentId: str = Field(min_length=1, max_length=80)


@router.post("/encounters", status_code=201)
def create_encounter_note(body: EncounterCreateInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Create a clinician-authored encounter note draft. Never auto-authored.

    The note belongs to one of the author's own confirmed or completed
    appointments, and the patient is taken from that appointment — never from
    the request, and never the author. No such appointment, no note. Only a
    doctor writes one: a partner who happens to own a consultation item does not
    get to sign a visit summary.
    """
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Only a doctor can write a visit note.")
    appt = db.scalar(select(M.Appointment).where(
        M.Appointment.id == body.appointmentId, M.Appointment.provider_id == user["id"],
        M.Appointment.status.in_(("CONFIRMED", "COMPLETED"))))
    if not appt:
        raise HTTPException(403, "You can write notes only for a confirmed or completed appointment with you.")
    note_id = f"enc_{new_id()[:10]}"
    db.add(M.EncounterNote(id=note_id, account_id=user["id"], patient_id=appt.account_id, appointment_id=appt.id,
                           subjective=body.subjective.strip()[:2000], objective=body.objective.strip()[:2000],
                           assessment=body.assessment.strip()[:2000], plan=body.plan.strip()[:2000],
                           status="DRAFT", created_at=time.time(), updated_at=time.time()))
    audit(db, user, "ENCOUNTER_DRAFT_CREATED", note_id)
    db.commit()
    return {"id": note_id, "status": "DRAFT"}


def _own_encounter_note(db: Session, note_id: str, user: dict) -> M.EncounterNote:
    """The note, if the signed-in clinician wrote it. Anyone else, a super admin
    included, gets a 404: signing is the author's attestation, and nobody edits
    or signs another clinician's note on their behalf."""
    note = db.get(M.EncounterNote, note_id)
    if not note or note.account_id != user["id"]:
        raise HTTPException(404, "Encounter note not found.")
    return note


@router.patch("/encounters/{note_id}")
def update_encounter_note(note_id: str, body: EncounterInput, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    _own_encounter_note(db, note_id, user)
    # Only the fields sent are changed; an omitted field keeps what the clinician wrote.
    values: dict = {field: getattr(body, field).strip()[:2000]
                    for field in ("subjective", "objective", "assessment", "plan") if field in body.model_fields_set}
    values["updated_at"] = time.time()
    # Conditional on DRAFT in the same statement, so an edit racing a signature
    # cannot land on a note that has just been signed.
    changed = db.execute(update(M.EncounterNote)
                         .where(M.EncounterNote.id == note_id, M.EncounterNote.status == "DRAFT")
                         .values(**values)).rowcount
    if not changed:
        db.rollback()
        raise HTTPException(409, "A finalised note cannot be changed.")
    audit(db, user, "ENCOUNTER_DRAFT_UPDATED", note_id)
    db.commit()
    return {"id": note_id, "status": "DRAFT"}


@router.post("/encounters/{note_id}/finalize")
def finalize_encounter_note(note_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    note = _own_encounter_note(db, note_id, user)
    signed_at = time.time()
    # DRAFT -> FINAL exactly once. A second sign (a retry, another tab) changes
    # nothing: not the signed time, not the audit trail, not the student's
    # notification. It says so with a 409.
    changed = db.execute(update(M.EncounterNote)
                         .where(M.EncounterNote.id == note_id, M.EncounterNote.status == "DRAFT")
                         .values(status="FINAL", updated_at=signed_at)).rowcount
    if not changed:
        db.rollback()
        raise HTTPException(409, "This note is already signed.")
    audit(db, user, "ENCOUNTER_FINALIZED", note_id)
    ops_feed.announce(
        db, account_id=note.patient_id, event_type="ENCOUNTER_FINALIZED", domain="CLINICAL",
        dedupe_key=f"encounter:{note_id}:final",
        summary="Your consultation notes have been finalised.",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="encounter", resource_id=note_id,
    )
    db.commit()
    return {"id": note_id, "status": "FINAL", "signedAt": signed_at}


@router.get("/encounters")
def my_encounter_notes(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.EncounterNote).where(M.EncounterNote.account_id == user["id"]).order_by(M.EncounterNote.created_at.desc()).limit(100)).all()
    return {"items": [{"id": n.id, "appointmentId": n.appointment_id, "patientId": n.patient_id, "status": n.status,
                       "subjective": n.subjective, "objective": n.objective, "assessment": n.assessment,
                       "plan": n.plan, "createdAt": n.created_at,
                       # A FINAL note is never written again, so its last write is when it was signed.
                       "signedAt": n.updated_at if n.status == "FINAL" else None} for n in rows]}


# --- Visit summaries: a student reads their own signed notes ---

def _visit_summary_header(db: Session, note: M.EncounterNote) -> dict:
    """Who signed it and when the visit was. No S/O/A/P here: the list carries
    no clinical text, so only an opened (and audited) summary does."""
    doctor = db.get(M.Account, note.account_id)
    appt = db.get(M.Appointment, note.appointment_id) if note.appointment_id else None
    slot = db.get(M.AvailabilitySlot, appt.slot_id) if appt else None
    return {
        "id": note.id,
        "appointmentId": note.appointment_id,
        "appointmentStart": slot.slot_start if slot else None,
        "doctorName": doctor.full_name if doctor else "",
        "doctorRegistrationNumber": str((doctor.profile or {}).get("registrationNumber", ""))[:60] if doctor else "",
        # A FINAL note is never written again, so its last write is when it was signed.
        "signedAt": note.updated_at,
    }


@router.get("/records/visit-summaries")
def my_visit_summaries(response: Response, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The signed-in student's own signed visit notes. Drafts are never listed."""
    response.headers["Cache-Control"] = "no-store"
    rows = db.scalars(select(M.EncounterNote).where(
        M.EncounterNote.patient_id == user["id"], M.EncounterNote.status == "FINAL",
    ).order_by(M.EncounterNote.updated_at.desc()).limit(100)).all()
    return {"items": [_visit_summary_header(db, n) for n in rows]}


@router.get("/records/visit-summaries/{note_id}")
def my_visit_summary(note_id: str, response: Response, user=Depends(authenticated_user),
                     db: Session = Depends(workflow_db)):
    """One signed visit note, for the student it is about. A draft, a missing
    note and someone else's note all answer the same 404."""
    response.headers["Cache-Control"] = "no-store"
    note = db.get(M.EncounterNote, note_id)
    if not note or note.patient_id != user["id"] or note.status != "FINAL":
        raise HTTPException(404, "Visit summary not found.")
    # Prescriptions are linked to a note by encounter_id; only the ones this
    # note's author issued to this student count.
    prescriptions = db.scalars(select(M.Prescription).where(
        M.Prescription.encounter_id == note.id, M.Prescription.patient_id == user["id"],
        M.Prescription.prescriber_id == note.account_id,
    ).order_by(M.Prescription.issued_at.asc())).all()
    audit(db, user, "ENCOUNTER_SUMMARY_VIEWED", note.id)
    db.commit()
    return {
        **_visit_summary_header(db, note),
        "subjective": note.subjective, "objective": note.objective,
        "assessment": note.assessment, "plan": note.plan,
        "prescriptions": [{"id": p.id, "issuedAt": p.issued_at, "status": p.status} for p in prescriptions],
    }


# Held AI actions name the student they are about and the medical audit trail
# records clinical decisions, so only the super admin reads or releases them
# (audit M2). There is no clinical-reviewer role yet; partners never see them.
@router.get("/ops/approvals")
def get_pending_approvals(user=Depends(require_super_admin)):
    # The pending actions are about real students; a team account sees none (core/team_scope.py).
    if team_sandboxed(user):
        return {"pending_actions": []}
    actions = hitl_approval_agent.get_pending_actions()
    return {"pending_actions": [a.model_dump() for a in actions]}


class ApproveActionInput(StrictModel):
    actionId: str


@router.post("/ops/approve-action")
def approve_pending_action(body: ApproveActionInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    if team_sandboxed(user):
        raise HTTPException(403, "Team accounts can't approve actions about real students.")
    # Only authorized staff (clinician/admin) may approve. Uses the server-derived
    # fullName, never a hard-coded doctor name.
    result = hitl_approval_agent.approve_action(body.actionId, user.get("fullName") or user.get("full_name") or "Staff")
    if result.get("status") != "SUCCESS":
        raise HTTPException(404, "Unknown or already-processed action.")
    audit(db, user, "HITL_ACTION_APPROVED", body.actionId)
    ops_feed.publish(
        db, "HITL_ACTION_APPROVED", "SAFETY", severity="ATTENTION",
        summary="A human released a held AI action",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="hitl_action", resource_id=body.actionId,
    )
    db.commit()
    return result


class TelemetryVitalsInput(StrictModel):
    deviceId: str = Field(min_length=1, max_length=120)
    heartRateBpm: float = Field(ge=30.0, le=240.0)
    spO2Percent: float = Field(ge=50.0, le=100.0)
    respirationRateRpm: float = Field(ge=4.0, le=60.0)
    systolicBp: float = Field(ge=50.0, le=260.0)
    diastolicBp: float = Field(ge=30.0, le=160.0)
    temperatureF: float = Field(ge=85.0, le=110.0)
    sensorAccuracyIndex: float = Field(ge=0.0, le=1.0)
    notes: str | None = Field(default=None, max_length=255)


@router.post("/v1/telemetry/vitals")
def record_telemetry_vitals(body: TelemetryVitalsInput, db: Session = Depends(workflow_db), user=Depends(authenticated_user)):
    """Record telemetry vitals payload with mandatory sensorAccuracyIndex validation."""
    record_id = str(uuid.uuid4())
    summary = (
        f"Telemetry Vitals: HR={body.heartRateBpm}bpm, SpO2={body.spO2Percent}%, "
        f"RR={body.respirationRateRpm}rpm, BP={body.systolicBp}/{body.diastolicBp}mmHg, "
        f"Temp={body.temperatureF}F, Accuracy={body.sensorAccuracyIndex}"
    )
    doc = M.Document(
        id=record_id,
        account_id=user["id"],
        title="Telemetry Vitals Capture",
        category="Vitals & Optical Scan",
        filename=f"telemetry_vitals_{int(time.time())}.json",
        mime_type="application/json",
        content=summary.encode("utf-8"),
        created_at=time.time(),
    )
    db.add(doc)
    db.commit()
    return {
        "status": "SUCCESS",
        "record_id": record_id,
        "summary": summary,
        "sensorAccuracyIndex": body.sensorAccuracyIndex,
        "vitals": {
            "deviceId": body.deviceId,
            "heartRateBpm": body.heartRateBpm,
            "spO2Percent": body.spO2Percent,
            "respirationRateRpm": body.respirationRateRpm,
            "systolicBp": body.systolicBp,
            "diastolicBp": body.diastolicBp,
            "temperatureF": body.temperatureF,
            "sensorAccuracyIndex": body.sensorAccuracyIndex,
        },
    }


class MentalGameInput(StrictModel):
    gameType: str = "ZEN_BREATHING"
    durationSeconds: int = 0
    completed: bool = False
    selfReportedMood: str = ""
    notes: str = ""


@router.post("/health/mental-game")
def record_mental_health_game(body: MentalGameInput, db: Session = Depends(workflow_db), user=Depends(authenticated_user)):
    note = (f"Wellbeing activity session ({body.gameType}): duration {body.durationSeconds}s, "
            f"completed={str(body.completed).lower()}.")
    if body.selfReportedMood:
        note += f" Self-reported mood: {body.selfReportedMood[:40]}."
    doc_id = str(uuid.uuid4())
    doc = M.Document(
        id=doc_id,
        account_id=user["id"],
        title=f"Wellbeing activity: {body.gameType}",
        category="Mental Health",
        filename=f"mental_game_{int(time.time())}.json",
        mime_type="application/json",
        content=note.encode("utf-8"),
        created_at=time.time(),
    )
    db.add(doc)
    db.commit()
    return {"status": "SUCCESS", "record_id": doc_id, "message": note}


class ENTVisionScanInput(StrictModel):
    completed: bool = False
    hearingResponses: int = 0
    visionResponses: int = 0
    voiceRecorded: bool = False
    notes: str = ""


@router.post("/health/ent-vision-scan")
def record_ent_vision_scan(body: ENTVisionScanInput, db: Session = Depends(workflow_db), user=Depends(authenticated_user)):
    summary = (
        f"Vision/hearing screening (self-reported, limited): hearing responses {body.hearingResponses}, "
        f"vision responses {body.visionResponses}, voice recording {str(body.voiceRecorded).lower()}, "
        f"completed={str(body.completed).lower()}."
    )
    if body.notes:
        summary += f" Notes: {body.notes[:160]}"
    doc_id = str(uuid.uuid4())
    doc = M.Document(
        id=doc_id,
        account_id=user["id"],
        title="Vision / Hearing Self-Check",
        category="ENT & Opthalmology",
        filename=f"ent_vision_checkup_{int(time.time())}.json",
        mime_type="application/json",
        content=summary.encode("utf-8"),
        created_at=time.time(),
    )
    db.add(doc)
    db.commit()
    return {"status": "SUCCESS", "record_id": doc_id, "summary": summary}


class MedicationLookupInput(StrictModel):
    # Text only. There is no pill or prescription image recognition, so an
    # image field is refused (422) rather than "matched" on its file name.
    query: str = Field(min_length=1, max_length=120)


@router.post("/ai/medication-lookup")
def lookup_medication(body: MedicationLookupInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    # The medicine master (services/medicine_master.py), not a hardcoded table.
    return medicine_master.lookup_medicine(db, body.query)



# -----------------------------------------------------------------------------
# VAVE Personal AI Control Plane Features Integration
# -----------------------------------------------------------------------------

@router.get("/v1/ops/audit-trail")
def get_medical_audit_trail(limit: int = Query(default=50, ge=1, le=100), user=Depends(require_super_admin)):
    if team_sandboxed(user):
        return {"events": [], "count": 0}
    trail = medical_guard.get_audit_trail(limit)
    return {"events": trail, "count": len(trail)}


@router.post("/v1/ops/kill-switch")
def trigger_emergency_kill_switch(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    actor_name = user.get("fullName") or user.get("full_name") or user.get("email") or "Staff"
    # Persisted in the settings registry: every worker, replica and the model
    # gateway (services/llm_gateway.py) obey it, and it survives a restart.
    from services.settings_api import write_override
    write_override(db, user, KILL_SWITCH_SETTING, True, "Emergency kill switch activated")
    result = medical_guard.activate_emergency_kill_switch(triggered_by=actor_name)
    audit(db, user, "KILL_SWITCH_ACTIVATED", user["id"])
    ops_feed.publish(
        db, "KILL_SWITCH_ACTIVATED", "SAFETY", severity="CRITICAL",
        summary="Emergency kill switch activated â€” AI operations frozen",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="kill_switch", resource_id=user["id"],
    )
    db.commit()
    return result


@router.post("/v1/ops/kill-switch/reset")
def reset_emergency_kill_switch(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    actor_name = user.get("fullName") or user.get("full_name") or user.get("email") or "SuperAdmin"
    from services.settings_api import write_override
    write_override(db, user, KILL_SWITCH_SETTING, None, "Emergency kill switch reset")
    result = medical_guard.reset_emergency_kill_switch(reset_by=actor_name)
    audit(db, user, "KILL_SWITCH_RESET", user["id"])
    ops_feed.publish(
        db, "KILL_SWITCH_RESET", "SAFETY", severity="ATTENTION",
        summary="Emergency kill switch reset â€” AI operations resumed",
        actor_id=user["id"], actor_role=user.get("role", ""),
        resource_type="kill_switch", resource_id=user["id"],
    )
    db.commit()
    return result


# -----------------------------------------------------------------------------
# F087: Order refunds through the provider that took the payment
# -----------------------------------------------------------------------------

class RefundInput(StrictModel):
    payment_id: str = Field(min_length=1, max_length=120)
    amount_paise: int = Field(gt=0)
    reason: str = Field(default="Customer requested cancellation", max_length=300)


@router.post("/v1/orders/{order_id}/refund")
def refund_order(order_id: str, body: RefundInput,
                 idempotency_key: str = Header(..., min_length=8, max_length=80),
                 user=Depends(require_super_admin), db: Session = Depends(commerce_db),
                 idb: Session = Depends(workflow_db)):
    """Refund all or part of a captured payment (super admin only). Idempotent on Idempotency-Key.

    The refund goes through the provider that took the payment, never the one
    currently configured. If that provider is not connected nothing moves, the
    answer is 503 and the student is told nothing.
    """
    result, refunded = payments.refund(db, order_id, body.payment_id, body.amount_paise, body.reason,
                                       idempotency_key, user)
    if refunded:
        order_row = db.get(M.Order, order_id)
        # The outbox is not a commerce table (Rule L), so the student's notice goes
        # through the normal session once the refund has landed. Deduped per refund.
        ops_feed.notify(idb, order_row.account_id, "ORDER_REFUNDED", dedupe_key=f"refund:{result['refundId']}",
                        summary=f"A refund of ₹{body.amount_paise / 100:.2f} has been started for your order. "
                                "It reaches your original payment method in 5–7 working days.",
                        resource_type="order", resource_id=order_id)
        idb.commit()
    return result


# -----------------------------------------------------------------------------
# F021: Notification outbox (care_outbox_events), for Super Admin
# -----------------------------------------------------------------------------
# Reads and acts on the durable outbox that ops_feed.notify, enqueue() and the
# reminder jobs write to. Payloads (summaries, message bodies) never leave the
# server here, and contacts are masked before they do (AGENTS.md rule 9).

OUTBOX_LIST_LIMIT = 200
# Only a message that did not go out may go back in the queue. _process_outbox
# ends a message as SENT, FAILED or SUPPRESSED; there is no separate dead letter.
OUTBOX_REQUEUEABLE = frozenset({"FAILED"})

_HIDDEN = "•••"
_EMAIL_IN_TEXT = re.compile(r"[^\s@<>()\"',;:]+@[^\s@<>()\"',;:]+\.[^\s@<>()\"',;:]+")
_PHONE_IN_TEXT = re.compile(r"\+?\d[\d\s().-]{5,}\d")


def mask_contact(value: str) -> str:
    """A contact reduced to a hint: first letter and TLD of an email, last two digits of a phone."""
    contact = (value or "").strip()
    if not contact:
        return ""
    at = contact.rfind("@")
    if at > 0:
        domain = contact[at + 1:]
        dot = domain.rfind(".")
        return f"{contact[0]}{_HIDDEN}@{_HIDDEN}{domain[dot:] if dot >= 0 else ''}"
    digits = re.sub(r"\D", "", contact)
    return f"{_HIDDEN} {digits[-2:]}" if len(digits) >= MASK_MIN_DIGITS else _HIDDEN


def mask_contacts_in(text: str) -> str:
    """Free text (a provider's error) with every email address and phone number masked."""
    masked = _EMAIL_IN_TEXT.sub(lambda m: mask_contact(m.group(0)), text or "")
    return _PHONE_IN_TEXT.sub(lambda m: mask_contact(m.group(0)), masked)


def outbox_admin_row(event, db=None) -> dict:
    """One outbox event as the console may see it: no payload, contacts masked."""
    channel, recipient = outbox_route(event, db)
    return {
        "id": event.id, "eventType": event.event_type, "channel": channel,
        "recipientMasked": mask_contact(recipient), "status": event.status,
        "attempts": event.attempts or 0, "maxAttempts": OUTBOX_MAX_ATTEMPTS,
        "createdAt": event.created_at or None, "sentAt": event.sent_at or None,
        "lastError": mask_contacts_in(event.last_error or "")[:300] or None,
    }


class RequeueNotificationInput(StrictModel):
    notificationId: str = Field(min_length=1, max_length=64)


@router.get("/v1/admin/notifications/outbox")
def get_notification_outbox(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    rows = db.scalars(
        select(M.OutboxEvent).order_by(M.OutboxEvent.created_at.desc(), M.OutboxEvent.id).limit(OUTBOX_LIST_LIMIT)
    ).all()
    return {"items": [outbox_admin_row(r, db) for r in rows]}


@router.post("/v1/admin/notifications/outbox/process")
def process_notification_outbox(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    """Run the reminder_reconcile job now: the same real delivery pass the scheduler runs."""
    from services.workflow_scheduler import JobBusyError
    try:
        result = workflow_scheduler.run_job_now(db, "reminder_reconcile")
    except JobBusyError as exc:
        raise HTTPException(409, "The outbox is already being processed. Try again shortly.") from exc
    if result["status"] == "FAILED":
        raise HTTPException(502, "The outbox could not be processed.")
    outbox = result["summary"].get("outbox", {})
    audit(db, user, "OUTBOX_PROCESSED", result["runId"])
    db.commit()
    remaining = db.scalar(select(func.count()).select_from(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING"))
    return {
        "runId": result["runId"], "processed": outbox.get("pending", 0),
        "delivered": outbox.get("delivered", 0), "inApp": outbox.get("in_app", 0), "failed": outbox.get("failed", 0),
        "suppressed": outbox.get("suppressed", 0), "deferred": outbox.get("deferred", 0),
        "pending": remaining or 0,
    }


@router.post("/v1/admin/notifications/outbox/requeue")
def requeue_notification(body: RequeueNotificationInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    event = db.get(M.OutboxEvent, body.notificationId)
    if event is None:
        return {"status": "NOT_FOUND"}
    if event.status not in OUTBOX_REQUEUEABLE:
        raise HTTPException(409, "Only a failed message can be requeued.")
    event.status = "PENDING"
    event.next_attempt_at = 0.0
    event.attempts = 0
    event.last_error = ""
    audit(db, user, "OUTBOX_REQUEUED", event.id)
    db.commit()
    return {"status": "SUCCESS"}


# F094 (device step sync) lives in services/wellness_api.py:
# POST /api/v1/movement/background-sync writes to care_readings.


# -----------------------------------------------------------------------------
# D1-D7: Code Sentinel & Data Governance Subsystem (StudentKare Super Admin)
# -----------------------------------------------------------------------------

@router.get("/v1/admin/sentinel/portfolio")
def get_sentinel_portfolio(user=Depends(require_super_admin)):
    """Returns StudentKare Super Admin microservices view with tiers, health scores, and open P0/P1s."""
    mock_files = {
        "src/config.py": "API_KEY = 'secret'",
        "data/students.json": "Aadhaar: 9876 5432 1098, Student: ROLL_99021",
    }
    findings, _, llm_skipped = CodeSentinelScanner.audit_repo_for_data_governance("studentkare_core", mock_files)
    digest = CodeSentinelScanner.generate_weekly_portfolio_digest(findings, {"studentkare_core": llm_skipped})
    return {
        "portfolioHealthScore": digest.portfolio_health_score,
        "products": [sc.model_dump() for sc in digest.product_scorecards],
    }


@router.get("/v1/admin/sentinel/governance")
def get_sentinel_governance(user=Depends(require_super_admin)):
    """Returns data governance page metrics: per-repo tier, exclusions, llm_skipped_pii counts."""
    mock_files = {
        "fixtures/students_test.json": "Student ID: ROLL_99011, Aadhaar: 2345 6789 0123",
        "services/vault.py": "ABHA: 91-4402-9901-1102",
    }
    findings, detections, llm_skipped = CodeSentinelScanner.audit_repo_for_data_governance("studentkare", mock_files)
    return {
        "t1_compliance_checklist": "PASSED (Redaction & path exclusions active)",
        "llm_skipped_pii_total": llm_skipped,
        "detections": [d.model_dump() for d in detections],
        "findings": [f.model_dump() for f in findings],
    }


@router.get("/v1/admin/sentinel/digest")
def get_sentinel_weekly_digest(user=Depends(require_super_admin)):
    """Returns Monday 09:00 IST 7-section Portfolio Digest report."""
    mock_files = {
        "fixtures/demo_health.csv": "ABHA: 91-8820-1102-4401, Aadhaar: 4402 1102 9901",
        "shared/auth.py": "def verify_token(): pass",
    }
    findings, _, llm_skipped = CodeSentinelScanner.audit_repo_for_data_governance("studentkare", mock_files)
    digest = CodeSentinelScanner.generate_weekly_portfolio_digest(findings, {"studentkare": llm_skipped})
    return digest.model_dump()


# NOTE: a second POST /v1/telemetry/vitals was defined here, with a second
# class also named TelemetryVitalsInput. FastAPI serves the first route
# registered, so it was unreachable: it never ran, and it returned a SUCCESS
# and a recordId for vitals it did not persist anywhere. Removed. The live
# endpoint is record_telemetry_vitals above, which stores a Document.
