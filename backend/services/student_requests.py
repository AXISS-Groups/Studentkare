"""Student requests: returns, hostel room visits, refills — and one "My requests" list.

Design page 2: MyRequests, ReturnRequest, HostelVisit, RefillRequest (Tier 3);
page 3 WebRequests; page 6 VendorReturns. Data model approved by the owner.

Honesty rules carried into the code:
- A return can be approved and picked up, but no money moves here: no order
  payment provider is connected, so the student is told the refund is
  arranged with the provider (refundStatus "TO_ARRANGE"), never "refunded".
- Partners see only requests that involve them; super admins see all.
- Notifications carry no health data (no medicine names for refills).
"""
from __future__ import annotations

import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import Field, model_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import ops_feed
from services.workflow_auth import StrictModel, authenticated_user, require_staff, workflow_db

router = APIRouter(prefix="/api", tags=["Student requests"])

RETURNABLE_LINE_STATUSES = ("DISPATCHED", "COMPLETED")
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_MAGIC = {"image/png": b"\x89PNG", "image/jpeg": b"\xff\xd8\xff"}


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> float:
    return time.time()


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=_now()))


def _student(user: dict) -> None:
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Only a student account can make this request.")


def _tell(db: Session, account_id: str, kind: str, key: str, summary: str, resource_type: str, resource_id: str) -> None:
    ops_feed.notify(db, account_id, kind, dedupe_key=key, summary=summary, resource_type=resource_type, resource_id=resource_id)


# --- payloads -----------------------------------------------------------------------------

def _return_payload(db: Session, r: M.ReturnRequest) -> dict:
    line = db.get(M.OrderLine, r.order_line_id)
    return {"id": r.id, "orderLineId": r.order_line_id, "item": line.name if line else "", "reason": r.reason,
            "note": r.note or None, "hasPhoto": r.photo is not None, "status": r.status,
            "refundPaise": r.refund_paise or None,
            "refundStatus": "TO_ARRANGE" if r.status in ("APPROVED", "PICKED_UP") else None,
            "decisionNote": r.decision_note or None, "createdAt": r.created_at, "updatedAt": r.updated_at or None}


def _visit_payload(v: M.HostelVisitRequest) -> dict:
    return {"id": v.id, "service": v.service, "hostelBlock": v.hostel_block, "room": v.room,
            "windowStart": v.window_start, "windowEnd": v.window_end, "note": v.note or None, "status": v.status,
            "assigned": v.assigned_provider_id is not None, "decisionNote": v.decision_note or None,
            "createdAt": v.created_at, "updatedAt": v.updated_at or None}


def _refill_payload(db: Session, r: M.RefillRequest, *, for_staff: bool = False) -> dict:
    plan = db.get(M.MedicationPlan, r.plan_id)
    provider = db.get(M.Account, r.provider_id)
    payload = {"id": r.id, "planId": r.plan_id, "medicine": plan.name if plan else "", "dosage": plan.dosage if plan else "",
               "pharmacy": provider.full_name if provider else "", "quantity": r.quantity, "note": r.note or None,
               "status": r.status, "decisionNote": r.decision_note or None, "createdAt": r.created_at,
               "updatedAt": r.updated_at or None}
    if for_staff:
        student = db.get(M.Account, r.account_id)
        payload["student"] = student.full_name if student else ""
    return payload


# --- returns (student) ------------------------------------------------------------------------

class ReturnInput(StrictModel):
    orderLineId: str = Field(min_length=1, max_length=64)
    reason: Literal["WRONG_ITEM", "DAMAGED", "NOT_NEEDED", "OTHER"]
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def other_needs_words(self):
        self.note = self.note.strip()
        if self.reason == "OTHER" and len(self.note) < 3:
            raise ValueError("Tell us what's wrong.")
        return self


@router.get("/returns/eligible")
def eligible_lines(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Order lines the student could return: delivered or dispatched, and no open return yet."""
    rows = db.execute(select(M.OrderLine, M.Order).join(M.Order, M.Order.id == M.OrderLine.order_id)
                      .where(M.Order.account_id == user["id"], M.OrderLine.status.in_(RETURNABLE_LINE_STATUSES))
                      .order_by(M.Order.created_at.desc()).limit(100)).all()
    open_lines = set(db.scalars(select(M.ReturnRequest.order_line_id).where(
        M.ReturnRequest.account_id == user["id"], M.ReturnRequest.status.in_(("REQUESTED", "APPROVED", "PICKED_UP")))).all())
    return {"items": [{"orderLineId": line.id, "orderId": order.id, "item": line.name, "quantity": line.quantity,
                       "pricePaise": line.price_paise * line.quantity, "orderedAt": order.created_at}
                      for line, order in rows if line.id not in open_lines]}


@router.post("/returns", status_code=201)
def create_return(body: ReturnInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    row = db.execute(select(M.OrderLine, M.Order).join(M.Order, M.Order.id == M.OrderLine.order_id)
                     .where(M.OrderLine.id == body.orderLineId)).first()
    if row is None or row[1].account_id != user["id"]:
        raise HTTPException(404, "That item isn't in your orders.")
    line = row[0]
    if line.status not in RETURNABLE_LINE_STATUSES:
        raise HTTPException(409, "Only an item that has been dispatched or delivered can be returned.")
    if db.scalar(select(M.ReturnRequest).where(M.ReturnRequest.order_line_id == line.id,
                                               M.ReturnRequest.status.in_(("REQUESTED", "APPROVED", "PICKED_UP")))):
        raise HTTPException(409, "There's already an open return for this item.")
    request = M.ReturnRequest(id=_id(), account_id=user["id"], order_line_id=line.id, provider_id=line.provider_id,
                              reason=body.reason, note=body.note, created_at=_now())
    db.add(request)
    _audit(db, user["id"], "RETURN_REQUESTED", request.id)
    ops_feed.publish(db, "RETURN_REQUESTED", "MARKETPLACE", summary="A return was requested",
                     actor_id=user["id"], actor_role="STUDENT", subject_id=user["id"], provider_id=line.provider_id,
                     resource_type="return_request", resource_id=request.id)
    db.commit()
    return {"return": _return_payload(db, request)}


@router.post("/returns/{return_id}/photo")
async def add_return_photo(return_id: str, file: UploadFile = File(...), user=Depends(authenticated_user),
                           db: Session = Depends(workflow_db)):
    request = db.get(M.ReturnRequest, return_id)
    if request is None or request.account_id != user["id"]:
        raise HTTPException(404, "Return not found.")
    if request.status != "REQUESTED":
        raise HTTPException(409, "A photo can only be added before the partner decides.")
    content = await file.read(MAX_PHOTO_BYTES + 1)
    magic = PHOTO_MAGIC.get(file.content_type or "")
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Photos can be up to 5 MB.")
    if magic is None or not content.startswith(magic):
        raise HTTPException(415, "Use a PNG or JPEG photo.")
    request.photo, request.photo_mime, request.updated_at = content, file.content_type or "", _now()
    db.commit()
    return {"return": _return_payload(db, request)}


@router.post("/returns/{return_id}/cancel")
def cancel_return(return_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    request = db.get(M.ReturnRequest, return_id)
    if request is None or request.account_id != user["id"]:
        raise HTTPException(404, "Return not found.")
    if request.status != "REQUESTED":
        raise HTTPException(409, "This return has already been decided.")
    request.status, request.updated_at = "CANCELLED", _now()
    _audit(db, user["id"], "RETURN_CANCELLED", request.id)
    db.commit()
    return {"return": _return_payload(db, request)}


# --- returns (partner) ------------------------------------------------------------------------

def _partner_scope(stmt, column, user: dict):
    return stmt if user["role"] == "SUPER_ADMIN" else stmt.where(column == user["id"])


@router.get("/work/returns")
def partner_returns(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    stmt = _partner_scope(select(M.ReturnRequest), M.ReturnRequest.provider_id, user)
    rows = db.scalars(stmt.order_by(M.ReturnRequest.created_at.desc()).limit(200)).all()
    out = []
    for r in rows:
        payload = _return_payload(db, r)
        student = db.get(M.Account, r.account_id)
        payload["student"] = student.full_name if student else ""
        out.append(payload)
    return {"items": out}


@router.get("/work/returns/{return_id}/photo")
def partner_return_photo(return_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    request = db.get(M.ReturnRequest, return_id)
    if request is None or (user["role"] != "SUPER_ADMIN" and request.provider_id != user["id"]) or request.photo is None:
        raise HTTPException(404, "Photo not found.")
    return Response(content=request.photo, media_type=request.photo_mime, headers={"Cache-Control": "no-store"})


class ReturnDecision(StrictModel):
    decision: Literal["APPROVED", "DECLINED"]
    refundPaise: int = Field(default=0, ge=0)
    note: str = Field(default="", max_length=500)


@router.post("/work/returns/{return_id}/decide")
def decide_return(return_id: str, body: ReturnDecision, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    request = db.get(M.ReturnRequest, return_id)
    if request is None or (user["role"] != "SUPER_ADMIN" and request.provider_id != user["id"]):
        raise HTTPException(404, "Return not found.")
    if request.status != "REQUESTED":
        raise HTTPException(409, "This return has already been decided.")
    line = db.get(M.OrderLine, request.order_line_id)
    paid = (line.price_paise * line.quantity) if line else 0
    if body.decision == "APPROVED" and not 0 < body.refundPaise <= paid:
        raise HTTPException(422, "Set a refund between ₹0.01 and what was paid for this item.")
    if body.decision == "DECLINED" and len(body.note.strip()) < 3:
        raise HTTPException(422, "Tell the student why it was declined.")
    request.status = body.decision
    request.refund_paise = body.refundPaise if body.decision == "APPROVED" else 0
    request.decision_note, request.decided_by, request.updated_at = body.note.strip(), user["id"], _now()
    _audit(db, user["id"], f"RETURN_{body.decision}", request.id)
    ops_feed.publish(db, f"RETURN_{body.decision}", "MARKETPLACE", summary=f"A return was {body.decision.lower()}",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=request.account_id,
                     provider_id=request.provider_id, resource_type="return_request", resource_id=request.id)
    _tell(db, request.account_id, f"RETURN_{body.decision}", f"return:{request.id}:{body.decision}",
          "Your return was approved. The refund is arranged with the partner." if body.decision == "APPROVED"
          else "Your return was declined. Open My requests for the reason.", "return_request", request.id)
    db.commit()
    return {"return": _return_payload(db, request)}


@router.post("/work/returns/{return_id}/picked-up")
def return_picked_up(return_id: str, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    request = db.get(M.ReturnRequest, return_id)
    if request is None or (user["role"] != "SUPER_ADMIN" and request.provider_id != user["id"]):
        raise HTTPException(404, "Return not found.")
    if request.status != "APPROVED":
        raise HTTPException(409, "Only an approved return can be marked picked up.")
    request.status, request.updated_at = "PICKED_UP", _now()
    _audit(db, user["id"], "RETURN_PICKED_UP", request.id)
    ops_feed.publish(db, "RETURN_PICKED_UP", "MARKETPLACE", summary="A returned item was picked up",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=request.account_id,
                     provider_id=request.provider_id, resource_type="return_request", resource_id=request.id)
    db.commit()
    return {"return": _return_payload(db, request)}


# --- hostel visits -------------------------------------------------------------------------

class VisitInput(StrictModel):
    service: Literal["LAB_PICKUP", "NURSE_VISIT"]
    hostelBlock: str = Field(min_length=1, max_length=80)
    room: str = Field(min_length=1, max_length=40)
    windowStart: float
    windowEnd: float
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def sane_window(self):
        now = _now()
        if self.windowStart < now - 300:
            raise ValueError("Choose a time from now onwards.")
        if not 1800 <= self.windowEnd - self.windowStart <= 6 * 3600:
            raise ValueError("A visit window is between 30 minutes and 6 hours.")
        if self.windowStart > now + 30 * 86400:
            raise ValueError("Choose a time within the next 30 days.")
        return self


@router.post("/hostel-visits", status_code=201)
def create_visit(body: VisitInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    visit = M.HostelVisitRequest(id=_id(), account_id=user["id"], service=body.service, hostel_block=body.hostelBlock.strip(),
                                 room=body.room.strip(), window_start=body.windowStart, window_end=body.windowEnd,
                                 note=body.note.strip(), created_at=_now())
    db.add(visit)
    _audit(db, user["id"], "HOSTEL_VISIT_REQUESTED", visit.id)
    ops_feed.publish(db, "HOSTEL_VISIT_REQUESTED", "LAB" if body.service == "LAB_PICKUP" else "CLINICAL",
                     summary="A hostel room visit was requested", actor_id=user["id"], actor_role="STUDENT",
                     subject_id=user["id"], resource_type="hostel_visit", resource_id=visit.id)
    db.commit()
    return {"visit": _visit_payload(visit)}


@router.post("/hostel-visits/{visit_id}/cancel")
def cancel_visit(visit_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    visit = db.get(M.HostelVisitRequest, visit_id)
    if visit is None or visit.account_id != user["id"]:
        raise HTTPException(404, "Visit not found.")
    if visit.status not in ("REQUESTED", "ASSIGNED"):
        raise HTTPException(409, "This visit can no longer be cancelled.")
    visit.status, visit.updated_at = "CANCELLED", _now()
    _audit(db, user["id"], "HOSTEL_VISIT_CANCELLED", visit.id)
    db.commit()
    return {"visit": _visit_payload(visit)}


@router.get("/work/hostel-visits")
def partner_visits(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    """Open requests any partner can take, plus the ones this partner took."""
    stmt = select(M.HostelVisitRequest)
    if user["role"] != "SUPER_ADMIN":
        stmt = stmt.where(or_(M.HostelVisitRequest.status == "REQUESTED", M.HostelVisitRequest.assigned_provider_id == user["id"]))
    rows = db.scalars(stmt.order_by(M.HostelVisitRequest.window_start).limit(200)).all()
    return {"items": [{**_visit_payload(v), "mine": v.assigned_provider_id == user["id"]} for v in rows]}


class VisitAction(StrictModel):
    action: Literal["CLAIM", "COMPLETE", "DECLINE"]
    note: str = Field(default="", max_length=500)


@router.post("/work/hostel-visits/{visit_id}")
def act_on_visit(visit_id: str, body: VisitAction, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    visit = db.scalar(select(M.HostelVisitRequest).where(M.HostelVisitRequest.id == visit_id).with_for_update()
                      .execution_options(populate_existing=True))
    if visit is None:
        raise HTTPException(404, "Visit not found.")
    if body.action == "CLAIM":
        if visit.status != "REQUESTED":
            raise HTTPException(409, "Someone has already taken this visit.")
        visit.status, visit.assigned_provider_id = "ASSIGNED", user["id"]
        summary = "A partner has taken your hostel visit. They'll come in your chosen window."
    else:
        if visit.assigned_provider_id != user["id"] and user["role"] != "SUPER_ADMIN":
            raise HTTPException(404, "Visit not found.")
        if visit.status != "ASSIGNED":
            raise HTTPException(409, "Only a taken visit can be completed or declined.")
        if body.action == "DECLINE" and len(body.note.strip()) < 3:
            raise HTTPException(422, "Tell the student why.")
        visit.status = "COMPLETED" if body.action == "COMPLETE" else "DECLINED"
        summary = "Your hostel visit is complete." if body.action == "COMPLETE" else "Your hostel visit couldn't go ahead. Open My requests for why."
    visit.decision_note, visit.updated_at = body.note.strip(), _now()
    _audit(db, user["id"], f"HOSTEL_VISIT_{body.action}", visit.id)
    ops_feed.publish(db, f"HOSTEL_VISIT_{body.action}", "LAB" if visit.service == "LAB_PICKUP" else "CLINICAL",
                     summary=f"Hostel visit: {body.action.lower()}", actor_id=user["id"], actor_role=user.get("role", ""),
                     subject_id=visit.account_id, resource_type="hostel_visit", resource_id=visit.id)
    _tell(db, visit.account_id, f"HOSTEL_VISIT_{body.action}", f"visit:{visit.id}:{body.action}", summary, "hostel_visit", visit.id)
    db.commit()
    return {"visit": _visit_payload(visit)}


# --- refills ------------------------------------------------------------------------------

@router.get("/refills/pharmacies")
def pharmacies(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Partner accounts that list at least one active product — the ones that can refill."""
    provider_ids = set(db.scalars(select(M.CatalogEntry.provider_id).where(M.CatalogEntry.kind == "product",
                                                                           M.CatalogEntry.active.is_(True))).all())
    rows = db.scalars(select(M.Account).where(M.Account.id.in_(provider_ids), M.Account.active.is_(True))).all() if provider_ids else []
    return {"items": [{"id": a.id, "name": a.full_name} for a in sorted(rows, key=lambda a: a.full_name)]}


@router.get("/refills/plans")
def refillable_plans(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The student's own active medication plans."""
    rows = db.scalars(select(M.MedicationPlan).where(M.MedicationPlan.account_id == user["id"], M.MedicationPlan.active.is_(True))
                      .order_by(M.MedicationPlan.name)).all()
    return {"items": [{"id": p.id, "name": p.name, "dosage": p.dosage} for p in rows]}


class RefillInput(StrictModel):
    planId: str = Field(min_length=1, max_length=64)
    providerId: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=12)
    note: str = Field(default="", max_length=500)


@router.post("/refills", status_code=201)
def create_refill(body: RefillInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    plan = db.get(M.MedicationPlan, body.planId)
    if plan is None or plan.account_id != user["id"] or not plan.active:
        raise HTTPException(404, "That medicine isn't in your active plans.")
    if body.providerId not in {p["id"] for p in pharmacies(user, db)["items"]}:
        raise HTTPException(422, "Choose a pharmacy from the list.")
    if db.scalar(select(M.RefillRequest).where(M.RefillRequest.plan_id == plan.id,
                                               M.RefillRequest.status.in_(("REQUESTED", "ACCEPTED")))):
        raise HTTPException(409, "There's already an open refill for this medicine.")
    refill = M.RefillRequest(id=_id(), account_id=user["id"], plan_id=plan.id, provider_id=body.providerId,
                             quantity=body.quantity, note=body.note.strip(), created_at=_now())
    db.add(refill)
    _audit(db, user["id"], "REFILL_REQUESTED", refill.id)
    ops_feed.publish(db, "REFILL_REQUESTED", "PHARMACY", summary="A refill was requested", actor_id=user["id"],
                     actor_role="STUDENT", subject_id=user["id"], provider_id=body.providerId,
                     resource_type="refill_request", resource_id=refill.id)
    db.commit()
    return {"refill": _refill_payload(db, refill)}


@router.post("/refills/{refill_id}/cancel")
def cancel_refill(refill_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    refill = db.get(M.RefillRequest, refill_id)
    if refill is None or refill.account_id != user["id"]:
        raise HTTPException(404, "Refill not found.")
    if refill.status != "REQUESTED":
        raise HTTPException(409, "The pharmacy has already responded.")
    refill.status, refill.updated_at = "CANCELLED", _now()
    _audit(db, user["id"], "REFILL_CANCELLED", refill.id)
    db.commit()
    return {"refill": _refill_payload(db, refill)}


@router.get("/work/refills")
def partner_refills(user=Depends(require_staff), db: Session = Depends(workflow_db)):
    stmt = _partner_scope(select(M.RefillRequest), M.RefillRequest.provider_id, user)
    rows = db.scalars(stmt.order_by(M.RefillRequest.created_at.desc()).limit(200)).all()
    return {"items": [_refill_payload(db, r, for_staff=True) for r in rows]}


class RefillAction(StrictModel):
    action: Literal["ACCEPT", "DECLINE", "READY"]
    note: str = Field(default="", max_length=500)


@router.post("/work/refills/{refill_id}")
def act_on_refill(refill_id: str, body: RefillAction, user=Depends(require_staff), db: Session = Depends(workflow_db)):
    refill = db.get(M.RefillRequest, refill_id)
    if refill is None or (user["role"] != "SUPER_ADMIN" and refill.provider_id != user["id"]):
        raise HTTPException(404, "Refill not found.")
    allowed = {"ACCEPT": ("REQUESTED",), "DECLINE": ("REQUESTED", "ACCEPTED"), "READY": ("ACCEPTED",)}[body.action]
    if refill.status not in allowed:
        raise HTTPException(409, "That step doesn't apply to this refill now.")
    if body.action == "DECLINE" and len(body.note.strip()) < 3:
        raise HTTPException(422, "Tell the student why.")
    refill.status = {"ACCEPT": "ACCEPTED", "DECLINE": "DECLINED", "READY": "READY"}[body.action]
    refill.decision_note, refill.updated_at = body.note.strip(), _now()
    _audit(db, user["id"], f"REFILL_{refill.status}", refill.id)
    ops_feed.publish(db, f"REFILL_{refill.status}", "PHARMACY", summary=f"A refill is {refill.status.lower()}",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=refill.account_id,
                     provider_id=refill.provider_id, resource_type="refill_request", resource_id=refill.id)
    # No medicine name in the message (DESIGN.md §7).
    summary = {"ACCEPTED": "A pharmacy accepted your refill.", "DECLINED": "Your refill was declined. Open My requests for why.",
               "READY": "Your refill is ready to collect."}[refill.status]
    _tell(db, refill.account_id, f"REFILL_{refill.status}", f"refill:{refill.id}:{refill.status}", summary, "refill_request", refill.id)
    db.commit()
    return {"refill": _refill_payload(db, refill, for_staff=True)}


# --- My requests --------------------------------------------------------------------------

@router.get("/my-requests")
def my_requests(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """Everything the student has asked for, newest first, in one shape."""
    items: list[dict] = []
    for line, order in db.execute(select(M.OrderLine, M.Order).join(M.Order, M.Order.id == M.OrderLine.order_id)
                                  .where(M.Order.account_id == user["id"]).order_by(M.Order.created_at.desc()).limit(100)).all():
        items.append({"kind": "ORDER", "id": line.id, "title": line.name, "status": line.status, "createdAt": order.created_at})
    for appt in db.scalars(select(M.Appointment).where(M.Appointment.account_id == user["id"]).limit(100)).all():
        entry = db.get(M.CatalogEntry, appt.catalog_item_id)
        items.append({"kind": "APPOINTMENT", "id": appt.id, "title": entry.name if entry else "Appointment",
                      "status": appt.status, "createdAt": appt.created_at})
    for r in db.scalars(select(M.ReturnRequest).where(M.ReturnRequest.account_id == user["id"]).limit(100)).all():
        p = _return_payload(db, r)
        items.append({"kind": "RETURN", "id": r.id, "title": f"Return: {p['item']}", "status": r.status,
                      "createdAt": r.created_at, "detail": p})
    for v in db.scalars(select(M.HostelVisitRequest).where(M.HostelVisitRequest.account_id == user["id"]).limit(100)).all():
        items.append({"kind": "HOSTEL_VISIT", "id": v.id,
                      "title": "Lab sample pickup" if v.service == "LAB_PICKUP" else "Nurse visit",
                      "status": v.status, "createdAt": v.created_at, "detail": _visit_payload(v)})
    for r in db.scalars(select(M.RefillRequest).where(M.RefillRequest.account_id == user["id"]).limit(100)).all():
        p = _refill_payload(db, r)
        items.append({"kind": "REFILL", "id": r.id, "title": f"Refill: {p['medicine']}", "status": r.status,
                      "createdAt": r.created_at, "detail": p})
    for s in db.scalars(select(M.SupportRequest).where(M.SupportRequest.account_id == user["id"]).limit(100)).all():
        items.append({"kind": "SUPPORT", "id": s.id, "title": s.subject, "status": s.status, "createdAt": s.created_at})
    items.sort(key=lambda i: i["createdAt"] or 0, reverse=True)
    return {"items": items}
