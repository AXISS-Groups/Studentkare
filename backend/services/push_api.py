"""Push notification endpoints: devices, the Web Push key, and super-admin announcements.

Students (any signed-in account) register the phone or browser they are on;
the token is tied to that sign-in, so signing out revokes it
(services/workflow_auth.logout). Super admins send a non-health announcement
to a campus or everyone, now or later, after a preview that shows only counts.
Every create and cancel is audited; offers additionally reach only students
who opted in to offers (Rule L).
"""
from __future__ import annotations

import re
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core import push_copy as P
from core import workflow_models as M
from core.settings_registry import setting
from services import push_dispatch, push_providers
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    require_super_admin,
    resolve_session,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Push notifications"])

DAY_SECONDS = 86400
EXPO_TOKEN = re.compile(r"^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,200}\]$")


def _id() -> str:
    return uuid.uuid4().hex


def _audit(db: Session, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=_id(), actor_id=actor_id, action=action, resource_id=resource_id, created_at=time.time()))


def push_error(status: int, code: str, message: str, **values) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message, "values": values})


# --- devices -------------------------------------------------------------------------

class DeviceKeys(StrictModel):
    p256dh: str = Field(min_length=80, max_length=128)
    auth: str = Field(min_length=16, max_length=64)


class DeviceInput(StrictModel):
    kind: Literal["EXPO", "WEB"]
    token: str = Field(min_length=10, max_length=1024)
    keys: DeviceKeys | None = None
    platform: Literal["ios", "android", "web"]
    locale: str = Field(default="en", max_length=8)


def _device_row(device: M.PushDevice) -> dict:
    return {"id": device.id, "kind": device.kind, "platform": device.platform, "createdAt": device.created_at,
            "lastSeenAt": device.last_seen_at or None}


@router.get("/notifications/web-push-key")
def web_push_key(user=Depends(authenticated_user)) -> dict:
    """The VAPID public key the browser subscribes with; null when Web Push is not set up."""
    keys = push_providers.vapid_keys()
    return {"publicKey": keys.public_key_b64 if keys else None}


@router.get("/notifications/devices")
def list_devices(user=Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    rows = push_dispatch.active_devices(db, user["id"])
    return {"items": [_device_row(row) for row in rows],
            "providers": {"phone": push_providers.expo_configured(), "web": push_providers.web_push_configured()}}


@router.post("/notifications/devices", status_code=201)
def register_device(body: DeviceInput, request: Request, user=Depends(authenticated_user),
                    db: Session = Depends(workflow_db)) -> dict:
    if body.kind == "EXPO":
        if not EXPO_TOKEN.match(body.token) or body.platform == "web":
            raise push_error(422, "BAD_TOKEN", "That is not a phone push token.")
    else:
        if body.platform != "web" or body.keys is None or not push_providers.web_push_host_allowed(body.token) \
                or not push_providers.valid_subscription_keys(body.keys.p256dh, body.keys.auth):
            raise push_error(422, "BAD_SUBSCRIPTION", "That is not a browser push subscription we can use.")
    _, session = resolve_session(request, db)
    sign_in_at = float(getattr(session, "signed_in_at", 0.0) or 0.0)
    now = time.time()
    device = db.scalar(select(M.PushDevice).where(M.PushDevice.token == body.token))
    if device is not None and device.account_id != user["id"]:
        # The same phone, now someone else's: the earlier account stops getting pushes on it.
        db.delete(device)
        db.flush()
        device = None
    if device is None:
        device = M.PushDevice(id=_id(), account_id=user["id"], kind=body.kind, token=body.token, created_at=now)
        db.add(device)
        _audit(db, user["id"], f"PUSH_DEVICE_REGISTERED:{body.kind}", device.id)
    device.p256dh = body.keys.p256dh if body.keys else ""
    device.auth = body.keys.auth if body.keys else ""
    device.platform = body.platform
    device.locale = P.normal_locale(body.locale)
    device.sign_in_at = sign_in_at
    device.last_seen_at = now
    device.revoked_at = 0.0
    device.revoke_reason = ""
    db.flush()
    active = push_dispatch.active_devices(db, user["id"])
    limit = setting("push.devices_per_account_max", db)
    for old in active[:max(len(active) - limit, 0)]:
        if old.id != device.id:
            push_dispatch.revoke_device(db, old, "replaced")
    db.commit()
    return _device_row(device)


@router.delete("/notifications/devices/{device_id}")
def revoke_device(device_id: str, user=Depends(authenticated_user), db: Session = Depends(workflow_db)) -> dict:
    device = db.scalar(select(M.PushDevice).where(M.PushDevice.id == device_id, M.PushDevice.account_id == user["id"]))
    if device is None:
        raise push_error(404, "NOT_FOUND", "That device is not registered.")
    push_dispatch.revoke_device(db, device, "turned_off")
    _audit(db, user["id"], "PUSH_DEVICE_REVOKED", device.id)
    db.commit()
    return {"success": True}


# --- announcements (super admin) --------------------------------------------------

class AnnouncementInput(StrictModel):
    kind: Literal["ANNOUNCEMENT", "OFFER"] = "ANNOUNCEMENT"
    title: str = Field(max_length=200)
    body: str = Field(max_length=600)
    campus: str = Field(default="", max_length=160)
    # Epoch seconds; omitted or in the past means now.
    scheduledAt: float | None = None


def _limits(db: Session) -> dict[str, int]:
    return {"titleMax": setting("push.announcement_title_max", db), "bodyMax": setting("push.announcement_body_max", db),
            "scheduleMaxDays": setting("push.announcement_schedule_max_days", db)}


def _check(db: Session, body: AnnouncementInput) -> list[str]:
    limits = _limits(db)
    problems = P.check_announcement(body.title, body.body, title_max=limits["titleMax"], body_max=limits["bodyMax"])
    if body.scheduledAt is not None and body.scheduledAt > time.time() + limits["scheduleMaxDays"] * DAY_SECONDS:
        problems.append("SCHEDULE_TOO_FAR")
    if body.campus.strip() and not db.scalar(select(M.CampusVerification.account_id).where(
            M.CampusVerification.status == "VERIFIED",
            func.lower(func.trim(M.CampusVerification.university)) == body.campus.strip().lower()).limit(1)):
        problems.append("UNKNOWN_CAMPUS")
    return problems


def _announcement_row(db: Session, row: M.Announcement) -> dict:
    return {"id": row.id, "kind": row.kind, "title": row.title, "body": row.body, "campus": row.campus,
            "status": row.status, "scheduledAt": row.scheduled_at, "createdAt": row.created_at,
            "sentAt": row.sent_at or None, "recipients": row.recipients,
            "counts": push_dispatch.announcement_counts(db, row.id)}


@router.get("/v1/admin/announcements")
def list_announcements(user=Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    rows = db.scalars(select(M.Announcement).order_by(M.Announcement.created_at.desc()).limit(100)).all()
    campuses = db.execute(select(func.trim(M.CampusVerification.university), func.count())
                          .where(M.CampusVerification.status == "VERIFIED", M.CampusVerification.university != "")
                          .group_by(func.trim(M.CampusVerification.university))
                          .order_by(func.trim(M.CampusVerification.university))).all()
    return {"items": [_announcement_row(db, row) for row in rows],
            "campuses": [{"name": name, "students": count} for name, count in campuses],
            "providers": {"phone": push_providers.expo_configured(), "web": push_providers.web_push_configured()},
            "limits": _limits(db)}


@router.post("/v1/admin/announcements/preview")
def preview_announcement(body: AnnouncementInput, user=Depends(require_super_admin),
                         db: Session = Depends(workflow_db)) -> dict:
    """What it would say and how many it would reach now. Counts only, never names."""
    problems = _check(db, body)
    counts = push_dispatch.audience_counts(db, body.campus, body.kind)
    return {"problems": problems, "students": counts["students"], "devices": counts["devices"],
            "lockScreen": {"title": body.title.strip(), "body": body.body.strip()}}


@router.post("/v1/admin/announcements", status_code=201)
def create_announcement(body: AnnouncementInput, user=Depends(require_super_admin),
                        db: Session = Depends(workflow_db)) -> dict:
    problems = _check(db, body)
    if problems:
        raise push_error(422, "ANNOUNCEMENT_REFUSED", "This announcement can't be sent as written.", problems=problems)
    now = time.time()
    row = M.Announcement(id=_id(), kind=body.kind, title=body.title.strip(), body=body.body.strip(),
                         campus=body.campus.strip(), status="SCHEDULED",
                         scheduled_at=max(float(body.scheduledAt or now), now), created_by=user["id"], created_at=now)
    db.add(row)
    _audit(db, user["id"], f"{body.kind}_SCHEDULED", row.id)
    db.commit()
    return _announcement_row(db, row)


@router.post("/v1/admin/announcements/{announcement_id}/cancel")
def cancel_announcement(announcement_id: str, user=Depends(require_super_admin), db: Session = Depends(workflow_db)) -> dict:
    row = db.get(M.Announcement, announcement_id)
    if row is None:
        raise push_error(404, "NOT_FOUND", "Announcement not found.")
    if row.status != "SCHEDULED":
        raise push_error(409, "NOT_SCHEDULED", "Only a scheduled announcement can be cancelled.")
    row.status = "CANCELLED"
    row.cancelled_by = user["id"]
    row.cancelled_at = time.time()
    _audit(db, user["id"], f"{row.kind}_CANCELLED", row.id)
    db.commit()
    return _announcement_row(db, row)
