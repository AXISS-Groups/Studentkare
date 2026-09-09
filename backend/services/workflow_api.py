"""Owned health data, configured catalog, durable requests, and role-scoped operations."""
import hashlib
import json
import re
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile
from pydantic import Field, field_validator, model_validator
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.workflow_auth import StrictModel, authenticated_user, require_staff, require_super_admin, workflow_db, normalize_identifier

router = APIRouter(prefix="/api", tags=["Care workflows"])

METRICS = {
    "heart": ("Resting heart rate", "bpm", 1, 300),
    "oxygen": ("Blood oxygen", "%", 0, 100),
    "sleep": ("Sleep duration", "hrs", 0, 24),
    "steps": ("Daily movement", "steps", 0, 100000),
    "temperature": ("Temperature", "°C", 20, 50),
    "weight": ("Weight", "kg", 0.1, 500),
    "systolic": ("Systolic blood pressure", "mmHg", 30, 300),
    "diastolic": ("Diastolic blood pressure", "mmHg", 10, 200),
    "glucose": ("Blood glucose", "mg/dL", 1, 1000),
}


def new_id():
    return str(uuid.uuid4())


def audit(db, user, action, resource_id):
    db.add(M.WorkflowAudit(id=new_id(), actor_id=user["id"], action=action, resource_id=resource_id, created_at=time.time()))


def catalog_payload(item):
    return {"id": item.id, "providerId": item.provider_id, "kind": item.kind, "name": item.name,
            "brand": item.brand, "category": item.category, "description": item.description, "pack": item.pack,
            "pricePaise": item.price_paise, "mrpPaise": item.mrp_paise, "stock": item.stock, "active": item.active,
            "requiresPrescription": item.requires_prescription, "preparation": item.preparation}


def line_payload(line):
    return {"id": line.id, "itemId": line.item_id, "name": line.name, "kind": line.kind, "quantity": line.quantity,
            "pricePaise": line.price_paise, "status": line.status}


def order_payload(db, order):
    lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order.id)).all()
    return {"id": order.id, "createdAt": order.created_at, "totalPaise": order.total_paise,
            "delivery": order.delivery, "requestedSlot": order.requested_slot, "lines": [line_payload(line) for line in lines]}


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
                      .order_by(M.Reading.recorded_at.desc()).limit(1000)).all()
    return {"items": [{"id": row.id, "metric": row.metric, "value": row.value, "unit": METRICS[row.metric][1], "recordedAt": row.recorded_at, "source": row.source} for row in reversed(rows)]}


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
def documents(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.execute(select(M.Document.id, M.Document.title, M.Document.category, M.Document.filename, M.Document.mime_type, M.Document.created_at)
                      .where(M.Document.account_id == user["id"]).order_by(M.Document.created_at.desc()).limit(200)).all()
    return {"items": [{"id": row.id, "title": row.title, "category": row.category, "filename": row.filename,
                       "mimeType": row.mime_type, "createdAt": row.created_at} for row in rows]}


@router.post("/health/documents", status_code=201)
def upload_document(title: str = Form(..., min_length=1, max_length=160), category: str = Form(...), file: UploadFile = File(...),
                    user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if not title.strip():
        raise HTTPException(422, "Enter a record title.")
    if category not in {"LAB", "PRESCRIPTION", "VACCINE", "CAMP_REPORT", "DISCHARGE_SUMMARY", "OTHER"}:
        raise HTTPException(422, "Choose a supported record category.")
    content = file.file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Files must be 10 MB or smaller.")
    valid = {"application/pdf": content.startswith(b"%PDF-"), "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"), "image/jpeg": content.startswith(b"\xff\xd8\xff")}
    if not valid.get(file.content_type, False):
        raise HTTPException(422, "Upload a valid PDF, PNG, or JPEG file.")
    filename = re.sub(r"[^a-zA-Z0-9._ -]", "_", (file.filename or "record").replace('\\', '/').split('/')[-1])[:180]
    row = M.Document(id=new_id(), account_id=user["id"], title=title.strip(), category=category, filename=filename,
                     mime_type=file.content_type, content=content, created_at=time.time())
    db.add(row)
    audit(db, user, "DOCUMENT_UPLOADED", row.id)
    db.commit()
    return {"id": row.id}


@router.get("/health/documents/{document_id}/file")
def download_document(document_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Record not found.")
    return Response(row.content, media_type=row.mime_type, headers={"Content-Disposition": f'attachment; filename="{row.filename}"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.delete("/health/documents/{document_id}")
def delete_document(document_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    changed = db.execute(delete(M.Document).where(M.Document.id == document_id, M.Document.account_id == user["id"])).rowcount
    if not changed:
        raise HTTPException(404, "Record not found.")
    audit(db, user, "DOCUMENT_DELETED", document_id)
    db.commit()
    return {"success": True}


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


@router.get("/catalog")
def catalog(kind: Literal["product", "lab", "consultation"] | None = None, query: str = Query("", max_length=160), category: str = Query("", max_length=30), offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(workflow_db)):
    statement = select(M.CatalogEntry).join(M.Account, M.Account.id == M.CatalogEntry.provider_id).where(M.CatalogEntry.active.is_(True), M.Account.active.is_(True))
    if kind:
        statement = statement.where(M.CatalogEntry.kind == kind)
    if query:
        statement = statement.where(or_(M.CatalogEntry.name.icontains(query, autoescape=True), M.CatalogEntry.brand.icontains(query, autoescape=True), M.CatalogEntry.category.icontains(query, autoescape=True)))
    if category:
        statement = statement.where(M.CatalogEntry.category == category)
    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    rows = db.scalars(statement.order_by(M.CatalogEntry.name, M.CatalogEntry.id).offset(offset).limit(limit)).all()
    return {"items": [catalog_payload(row) for row in rows], "total": total, "offset": offset, "limit": limit}


class CatalogInput(StrictModel):
    providerId: str = Field(min_length=1, max_length=80)
    kind: Literal["product", "lab", "consultation"]
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


@router.post("/ops/catalog", status_code=201)
def create_catalog(body: CatalogInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    provider = db.get(M.Account, body.providerId)
    expected_role = "NMC_DOCTOR" if body.kind == "consultation" else "VENDOR"
    if not provider or provider.role != expected_role or not provider.active:
        raise HTTPException(422, f"Select an active {expected_role.lower().replace('_', ' ')} account.")
    row = M.CatalogEntry(id=new_id(), provider_id=body.providerId, kind=body.kind, name=body.name, brand=body.brand,
                         category=body.category, description=body.description, pack=body.pack, price_paise=body.pricePaise,
                         mrp_paise=body.mrpPaise, stock=body.stock, active=True, requires_prescription=body.requiresPrescription, preparation=body.preparation)
    db.add(row)
    audit(db, user, "CATALOG_CREATED", row.id)
    db.commit()
    return catalog_payload(row)


class CatalogUpdate(StrictModel):
    active: bool
    stock: int = Field(ge=0, le=1000000)


@router.patch("/ops/catalog/{item_id}")
def update_catalog(item_id: str, body: CatalogUpdate, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    if not db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == item_id).values(active=body.active, stock=body.stock)).rowcount:
        raise HTTPException(404, "Catalog item not found.")
    audit(db, user, "CATALOG_UPDATED", item_id)
    db.commit()
    return {"success": True}


class CartLineInput(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=1, le=10)


class DeliveryInput(StrictModel):
    mode: Literal["delivery", "pickup"]
    address: str = Field(default="", max_length=300)
    city: str = Field(min_length=2, max_length=100)
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")

    @model_validator(mode="after")
    def delivery_address(self):
        if self.mode == "delivery" and len(self.address) < 10:
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
def place_order(body: OrderInput, idempotency_key: str = Header(..., min_length=8, max_length=80), user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    request_hash = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True).encode()).hexdigest()
    existing = db.scalar(select(M.Order).where(M.Order.account_id == user["id"], M.Order.idempotency_key == idempotency_key))
    if existing:
        if existing.request_hash != request_hash:
            raise HTTPException(409, "This request key was already used for different items.")
        return order_payload(db, existing)
    items = []
    for line in sorted(body.items, key=lambda item: item.id):
        item = db.get(M.CatalogEntry, line.id)
        provider = db.get(M.Account, item.provider_id) if item else None
        if not item or not item.active or not provider or not provider.active:
            raise HTTPException(409, "An item is no longer available. Refresh the catalog.")
        if item.requires_prescription:
            raise HTTPException(409, "Prescription review is not connected. Contact your care provider before ordering this item.")
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
                    total_paise=sum(item.price_paise * quantity for item, quantity in items), delivery=body.delivery.model_dump(), requested_slot=body.requestedSlot, created_at=time.time())
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
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(M.Order).where(M.Order.account_id == user["id"], M.Order.idempotency_key == idempotency_key))
        if existing and existing.request_hash == request_hash:
            return order_payload(db, existing)
        raise HTTPException(409, "The order could not be created. Refresh and try again.")
    return order_payload(db, order)


@router.get("/orders")
def orders(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.Order).where(M.Order.account_id == user["id"]).order_by(M.Order.created_at.desc()).limit(100)).all()
    return {"items": [order_payload(db, row) for row in rows]}


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = db.scalar(select(M.Order).where(M.Order.id == order_id, M.Order.account_id == user["id"]))
    if not row:
        raise HTTPException(404, "Order not found.")
    lines = db.scalars(select(M.OrderLine).where(M.OrderLine.order_id == order_id)).all()
    if all(line.status == "CANCELLED" for line in lines):
        return {"success": True}
    for line in lines:
        if not db.execute(update(M.OrderLine).where(M.OrderLine.id == line.id, M.OrderLine.status == "REQUESTED").values(status="CANCELLED")).rowcount:
            db.rollback()
            raise HTTPException(409, "A provider has already processed this request. Contact support to make changes.")
        if line.kind == "product":
            db.execute(update(M.CatalogEntry).where(M.CatalogEntry.id == line.item_id).values(stock=M.CatalogEntry.stock + line.quantity))
    audit(db, user, "ORDER_CANCELLED", order_id)
    db.commit()
    return {"success": True}


@router.get("/work/requests")
def provider_requests(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    statement = select(M.OrderLine, M.Order, M.Account).join(M.Order, M.Order.id == M.OrderLine.order_id).join(M.Account, M.Account.id == M.Order.account_id)
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.OrderLine.provider_id == user["id"])
    rows = db.execute(statement.order_by(M.Order.created_at.desc()).limit(200)).all()
    return {"items": [{**line_payload(line), "orderId": order.id, "customer": account.full_name, "contact": account.identifier,
                       "delivery": order.delivery, "requestedSlot": order.requested_slot, "createdAt": order.created_at} for line, order, account in rows]}


class RequestStatus(StrictModel):
    status: Literal["ACCEPTED", "DECLINED", "DISPATCHED", "COMPLETED"]


@router.patch("/work/requests/{line_id}")
def update_request(line_id: str, body: RequestStatus, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    statement = select(M.OrderLine).where(M.OrderLine.id == line_id)
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.OrderLine.provider_id == user["id"])
    line = db.scalar(statement)
    if not line:
        raise HTTPException(404, "Request not found.")
    if line.status == body.status:
        return line_payload(line)
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
    db.commit()
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
    return {"items": [{"id": row.id, "subject": row.subject, "message": row.message, "status": row.status, "createdAt": row.created_at} for row in rows]}


@router.post("/support", status_code=201)
def create_support(body: SupportInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    row = M.SupportRequest(id=new_id(), account_id=user["id"], subject=body.subject, message=body.message, status="OPEN", created_at=time.time())
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.patch("/ops/support/{request_id}")
def resolve_support(request_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    if not db.execute(update(M.SupportRequest).where(M.SupportRequest.id == request_id).values(status="RESOLVED")).rowcount:
        raise HTTPException(404, "Support request not found.")
    audit(db, user, "SUPPORT_RESOLVED", request_id)
    db.commit()
    return {"success": True}


@router.get("/ops/summary")
def operations_summary(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    return {"accounts": db.scalar(select(func.count()).select_from(M.Account)), "catalogItems": db.scalar(select(func.count()).select_from(M.CatalogEntry)),
            "orderRequests": db.scalar(select(func.count()).select_from(M.Order)),
            "openSupport": db.scalar(select(func.count()).select_from(M.SupportRequest).where(M.SupportRequest.status == "OPEN")),
            "statuses": dict(db.execute(select(M.OrderLine.status, func.count()).group_by(M.OrderLine.status)).all())}


@router.get("/ops/catalog")
def operations_catalog(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    return {"items": [catalog_payload(item) for item in db.scalars(select(M.CatalogEntry).order_by(M.CatalogEntry.name).limit(500)).all()]}


@router.get("/ops/accounts")
def accounts(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.Account).order_by(M.Account.created_at.desc()).limit(500)).all()
    return {"items": [{"id": row.id, "fullName": row.full_name, "identifier": row.identifier, "role": row.role, "active": row.active} for row in rows]}


class StaffInput(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    channel: Literal["EMAIL", "WHATSAPP"]
    fullName: str = Field(min_length=2, max_length=120)
    role: Literal["VENDOR", "NMC_DOCTOR", "CAMPUS_ADMIN"]


@router.post("/ops/accounts", status_code=201)
def create_staff(body: StaffInput, user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    row = M.Account(id=new_id(), identifier=normalize_identifier(body.identifier, body.channel), channel=body.channel,
                     full_name=body.fullName, role=body.role, active=True, profile={}, created_at=time.time())
    db.add(row)
    audit(db, user, "STAFF_ACCOUNT_CREATED", row.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already exists for those contact details.")
    return {"id": row.id}


@router.get("/ops/audit")
def audits(user=Depends(require_super_admin), db: Session = Depends(workflow_db)):
    rows = db.scalars(select(M.WorkflowAudit).order_by(M.WorkflowAudit.created_at.desc()).limit(200)).all()
    return {"items": [{"id": row.id, "actorId": row.actor_id, "action": row.action, "resourceId": row.resource_id, "createdAt": row.created_at} for row in rows]}


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
