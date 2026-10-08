"""SOS: a student raises an alert; the campus and their emergency contact are told.

Design page 2: SosBeacon, SosDebrief (Tier 1, approved by the repository owner
as named reviewer). Replaces a client that showed an invented ambulance, driver
and ETA for every press because no endpoint existed.

What happens on POST /emergency/sos, in order, each step recorded honestly:
1. The alert row is committed first, so the campus console has it even if
   every outbound message fails.
2. CAMPUS_CONSOLE: a CRITICAL ops-feed event for the campus and super admins.
3. CAMPUS_SECURITY: WhatsApp to each number the student's campus configured.
4. EMERGENCY_CONTACT: WhatsApp to the emergency contact on the student's profile.
The response lists every attempt with its real status (SENT / FAILED /
SKIPPED). Nothing is reported as sent unless the gateway said so. There is no
SMS provider in this codebase, so SMS is not offered. Messages carry no health
data. Calling 112 is always shown by the client regardless of outcome.
"""
from __future__ import annotations

import re
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services import ops_feed
from services.otp_delivery import _send_openwa, normalize_chat_id
from services.workflow_api import _campus_key, campus_scope
from services.workflow_auth import StrictModel, authenticated_user, require_campus_admin, workflow_db

router = APIRouter(prefix="/api", tags=["Emergency"])

OPEN_STATUSES = ("ACTIVE", "ACKNOWLEDGED")


def _id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=time.time()))


def _student_campus(db: Session, account: M.Account) -> str:
    verification = db.get(M.CampusVerification, account.id)
    if verification and verification.university:
        return verification.university
    return (account.profile or {}).get("university", "") or ""


def _deliveries(db: Session, alert_id: str) -> list[dict]:
    rows = db.scalars(select(M.SosDelivery).where(M.SosDelivery.alert_id == alert_id).order_by(M.SosDelivery.created_at)).all()
    return [{"recipientKind": r.recipient_kind, "channel": r.channel, "recipient": r.recipient_label,
             "status": r.status, "detail": r.detail} for r in rows]


def _alert_payload(db: Session, alert: M.SosAlert, *, for_staff: bool = False) -> dict:
    payload = {
        "id": alert.id, "status": alert.status, "campus": alert.campus, "locationNote": alert.location_note or None,
        "createdAt": alert.created_at, "acknowledgedAt": alert.acknowledged_at or None,
        "resolvedAt": alert.resolved_at or None, "cancelledAt": alert.cancelled_at or None,
        "resolutionNote": alert.resolution_note or None, "deliveries": _deliveries(db, alert.id),
    }
    if alert.latitude is not None and alert.longitude is not None:
        payload["coordinates"] = {"latitude": alert.latitude, "longitude": alert.longitude}
    if for_staff:
        account = db.get(M.Account, alert.account_id)
        profile = (account.profile or {}) if account else {}
        payload["student"] = {
            "name": account.full_name if account else "",
            "contact": account.identifier if account else "",
            "hostel": " ".join(x for x in (profile.get("hostelBlock", ""), profile.get("room", "")) if x) or None,
        }
    return payload


def _record(db: Session, alert_id: str, kind: str, channel: str, label: str, status: str, detail: str = "") -> None:
    db.add(M.SosDelivery(id=_id(), alert_id=alert_id, recipient_kind=kind, channel=channel,
                         recipient_label=label[:160], status=status, detail=detail[:200], created_at=time.time()))


def _whatsapp(phone: str, text: str) -> tuple[str, str]:
    """(status, detail). Only the gateway's own success counts as SENT."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) < 10:
        return "SKIPPED", "No valid number on file."
    result = _send_openwa(normalize_chat_id(phone), text)
    if result.get("status") == "sent":
        return "SENT", ""
    if result.get("status") == "skipped":
        return "SKIPPED", "WhatsApp isn't configured for Studentkare."
    return "FAILED", "WhatsApp delivery failed."


class SosInput(StrictModel):
    locationNote: str | None = Field(default=None, max_length=300)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("locationNote", mode="before")
    @classmethod
    def strip_note(cls, value):
        return value.strip() or None if isinstance(value, str) else value


@router.post("/emergency/sos", status_code=201)
def raise_sos(body: SosInput, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    if user["role"] != "STUDENT":
        raise HTTPException(403, "SOS is for student accounts. Call 112 in an emergency.")
    account = db.get(M.Account, user["id"])
    if account is None:
        raise HTTPException(404, "Account not found.")
    existing = db.scalar(select(M.SosAlert).where(M.SosAlert.account_id == user["id"], M.SosAlert.status.in_(OPEN_STATUSES)))
    if existing:
        # A second press never duplicates the alert or re-sends messages.
        return {"alert": _alert_payload(db, existing), "alreadyActive": True}

    campus = _student_campus(db, account)
    alert = M.SosAlert(id=_id(), account_id=account.id, campus=campus, location_note=body.locationNote or "",
                       latitude=body.latitude, longitude=body.longitude, status="ACTIVE", created_at=time.time())
    db.add(alert)
    _audit(db, account.id, "SOS_RAISED", alert.id)
    event = ops_feed.publish(
        db, "SOS_RAISED", "SAFETY", severity="CRITICAL",
        summary=f"SOS raised{f' at {campus}' if campus else ''} — respond now",
        actor_id=account.id, actor_role="STUDENT", subject_id=account.id,
        resource_type="sos_alert", resource_id=alert.id,
    )
    _record(db, alert.id, "CAMPUS_CONSOLE", "CONSOLE", campus or "Studentkare operations",
            "SENT" if event else "FAILED", "" if event else "The console alert could not be recorded.")
    db.commit()  # the alert exists now, whatever happens to the messages below

    when = time.strftime("%H:%M", time.localtime(alert.created_at))
    where = alert.location_note or "not shared"
    profile = account.profile or {}
    security = []
    if campus:
        key = _campus_key(campus)
        security = [c for c in db.scalars(select(M.CampusSecurityContact)).all() if _campus_key(c.campus) == key]
    if not security:
        _record(db, alert.id, "CAMPUS_SECURITY", "WHATSAPP", campus or "No campus", "SKIPPED",
                "Your campus hasn't set up security contacts.")
    for contact in security:
        status, detail = _whatsapp(contact.phone, f"STUDENTKARE SOS — {account.full_name} needs help now ({when}). "
                                                  f"Location: {where}. Open the Studentkare campus console to acknowledge.")
        _record(db, alert.id, "CAMPUS_SECURITY", "WHATSAPP", contact.name, status, detail)

    ice_name = profile.get("emergencyContactName", "") or "Emergency contact"
    ice_phone = profile.get("emergencyContactPhone", "")
    if not ice_phone:
        _record(db, alert.id, "EMERGENCY_CONTACT", "WHATSAPP", "", "SKIPPED", "No emergency contact on your profile.")
    else:
        status, detail = _whatsapp(ice_phone, f"{account.full_name} pressed SOS on Studentkare at {when}. "
                                              f"Location: {where}. Please try to reach them now; call 112 if you can't.")
        _record(db, alert.id, "EMERGENCY_CONTACT", "WHATSAPP", ice_name, status, detail)
    db.commit()
    return {"alert": _alert_payload(db, alert), "alreadyActive": False}


@router.get("/emergency/sos/current")
def current_sos(user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    """The student's most recent alert, open or closed, so the after-SOS view can show what happened."""
    alert = db.scalar(select(M.SosAlert).where(M.SosAlert.account_id == user["id"]).order_by(M.SosAlert.created_at.desc()).limit(1))
    return {"alert": _alert_payload(db, alert) if alert else None}


@router.post("/emergency/sos/{alert_id}/cancel")
def cancel_sos(alert_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    alert = db.get(M.SosAlert, alert_id)
    if alert is None or alert.account_id != user["id"]:
        raise HTTPException(404, "SOS not found.")
    if alert.status not in OPEN_STATUSES:
        raise HTTPException(409, "This SOS is already closed.")
    alert.status = "CANCELLED"
    alert.cancelled_at = time.time()
    _audit(db, user["id"], "SOS_CANCELLED", alert.id)
    ops_feed.publish(db, "SOS_CANCELLED", "SAFETY", severity="ATTENTION",
                     summary="SOS cancelled by the student", actor_id=user["id"], actor_role=user.get("role", ""),
                     subject_id=user["id"], resource_type="sos_alert", resource_id=alert.id)
    db.commit()
    return {"alert": _alert_payload(db, alert)}


# --- Campus console -----------------------------------------------------------------

def _scoped_alert(db: Session, user: dict, alert_id: str) -> M.SosAlert:
    scope = campus_scope(user, db)
    alert = db.get(M.SosAlert, alert_id)
    if alert is None or (scope is not None and _campus_key(alert.campus) != scope):
        raise HTTPException(404, "SOS not found.")
    return alert


@router.get("/ops/sos")
def list_sos(open_only: bool = Query(True, alias="open"), user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    scope = campus_scope(user, db)
    stmt = select(M.SosAlert).order_by(M.SosAlert.created_at.desc()).limit(100)
    if open_only:
        stmt = stmt.where(M.SosAlert.status.in_(OPEN_STATUSES))
    alerts = [a for a in db.scalars(stmt).all() if scope is None or _campus_key(a.campus) == scope]
    return {"items": [_alert_payload(db, a, for_staff=True) for a in alerts]}


@router.post("/ops/sos/{alert_id}/acknowledge")
def acknowledge_sos(alert_id: str, user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    alert = _scoped_alert(db, user, alert_id)
    if alert.status != "ACTIVE":
        raise HTTPException(409, "Only an active SOS can be acknowledged.")
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = user["id"]
    alert.acknowledged_at = time.time()
    _audit(db, user["id"], "SOS_ACKNOWLEDGED", alert.id)
    ops_feed.announce(db, account_id=alert.account_id, event_type="SOS_ACKNOWLEDGED", domain="SAFETY",
                      dedupe_key=f"sos:{alert.id}:ack", summary="Your campus has seen your SOS and is responding.",
                      severity="CRITICAL", actor_id=user["id"], actor_role=user.get("role", ""),
                      resource_type="sos_alert", resource_id=alert.id)
    db.commit()
    return {"alert": _alert_payload(db, alert, for_staff=True)}


class ResolveInput(StrictModel):
    note: str = Field(min_length=2, max_length=1000)


@router.post("/ops/sos/{alert_id}/resolve")
def resolve_sos(alert_id: str, body: ResolveInput, user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    alert = _scoped_alert(db, user, alert_id)
    if alert.status not in OPEN_STATUSES:
        raise HTTPException(409, "This SOS is already closed.")
    alert.status = "RESOLVED"
    alert.resolved_at = time.time()
    alert.resolution_note = body.note.strip()
    _audit(db, user["id"], "SOS_RESOLVED", alert.id)
    ops_feed.announce(db, account_id=alert.account_id, event_type="SOS_RESOLVED", domain="SAFETY",
                      dedupe_key=f"sos:{alert.id}:resolved", summary="Your SOS has been closed by your campus.",
                      actor_id=user["id"], actor_role=user.get("role", ""), resource_type="sos_alert", resource_id=alert.id)
    db.commit()
    return {"alert": _alert_payload(db, alert, for_staff=True)}


class SecurityContactInput(StrictModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=32)
    campus: str | None = Field(default=None, max_length=160)  # super admins name the campus; campus admins use their own

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, value: str) -> str:
        if len(re.sub(r"\D", "", value)) < 10:
            raise ValueError("Enter a full phone number.")
        return value.strip()


def _contact_campus(db: Session, user: dict, requested: str | None) -> str:
    scope = campus_scope(user, db)
    if scope is None:
        if not requested or len(requested.strip()) < 2:
            raise HTTPException(422, "Name the campus these contacts are for.")
        return requested.strip()
    account = db.get(M.Account, user["id"])
    return (account.profile or {}).get("university", "").strip()


@router.get("/ops/campus/security-contacts")
def list_security_contacts(campus: str | None = Query(None, max_length=160), user=Depends(require_campus_admin),
                           db: Session = Depends(workflow_db)):
    key = _campus_key(_contact_campus(db, user, campus))
    rows = [c for c in db.scalars(select(M.CampusSecurityContact).order_by(M.CampusSecurityContact.created_at)).all()
            if _campus_key(c.campus) == key]
    # Numbers are shown masked; staff re-enter a number to change it.
    return {"items": [{"id": c.id, "name": c.name, "phone": "•••••" + re.sub(r"\D", "", c.phone)[-4:]} for c in rows]}


@router.post("/ops/campus/security-contacts", status_code=201)
def add_security_contact(body: SecurityContactInput, user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    campus = _contact_campus(db, user, body.campus)
    row = M.CampusSecurityContact(id=_id(), campus=campus, name=body.name.strip(), phone=body.phone,
                                  created_by=user["id"], created_at=time.time())
    db.add(row)
    _audit(db, user["id"], "CAMPUS_SECURITY_CONTACT_ADDED", row.id)
    db.commit()
    return {"id": row.id}


@router.delete("/ops/campus/security-contacts/{contact_id}")
def remove_security_contact(contact_id: str, user=Depends(require_campus_admin), db: Session = Depends(workflow_db)):
    row = db.get(M.CampusSecurityContact, contact_id)
    scope = campus_scope(user, db)
    if row is None or (scope is not None and _campus_key(row.campus) != scope):
        raise HTTPException(404, "Contact not found.")
    db.delete(row)
    _audit(db, user["id"], "CAMPUS_SECURITY_CONTACT_REMOVED", contact_id)
    db.commit()
    return {"success": True}
