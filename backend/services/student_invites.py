"""B2B: a partner college creates a student's account and invites them to claim it.

Plan tier1-auth-password-2026-10-22, amendment (b), approved by the founder
2026-10-22 (D-B1 to D-B6). One student at a time; CSV upload follows later (D-B4).

How it works and what keeps it safe:

* **Who.** A campus admin invites students to **their own campus only**; a super
  admin to any partner campus. Never staff, never the team test campus.
* **What the college types** (name, email and/or WhatsApp number, roll number)
  becomes a *pending* account whose contacts are **unverified**, so no sign-in
  code is ever sent to them and nothing can sign in to it. Creating it gives the
  college no access to anything (Rule L and consent are unchanged).
* **A value belongs to one account.** One already in use gets "already has an
  account" and nothing about whose it is.
* **The link and the temporary password travel apart** (D-B3). The link goes to
  the student by email or WhatsApp; the temporary password is shown once to the
  admin to hand over. Only hashes of both are stored; both expire after
  ``auth.invite_link_hours`` (D-B2); the temporary password works once.
* **The token is in the link's fragment** (``/claim#token=``), so it never reaches
  a server log or a Referer header.
* **Claiming** (all in one request; nothing gives a session until it succeeds):
  the temporary password, a new password of the student's own (section C rules),
  the student's own date of birth (18+, fail closed, D-B6) and the student's own
  consent (the same versioned consent as B2C). The contact the link went to is
  verified by the claim (D-B5); the other stays to verify in Sign-in & security.
* **One answer** for an unknown, used, cancelled or expired link. Wrong temporary
  passwords lock the invite like a password; every step is audited, never a
  password, token or contact.
"""
from __future__ import annotations

import secrets
import time
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.email_templates import APP_BASE_URL
from core.settings_registry import setting
from core.team_scope import RESERVED_CAMPUS_MESSAGE, is_reserved_campus
from services.account_password import PasswordRefused, check_password, refusal, store_new_password
from services.contact_store import contact_in_use, save_contact
from services.otp_delivery import dispatch_message
from services.team_accounts import (
    _burn_hash_time,
    audit,
    clear_lock_if_run_out,
    count_wrong_attempt,
    hash_pin,
    is_locked,
    verify_pin,
)
from services.workflow_auth import (
    SignupConsent,
    StrictModel,
    adult_birth_date,
    check_origin,
    digest,
    issue_session,
    limit,
    mask_identifier,
    normalize_identifier,
    remember_device,
    require_campus_admin,
    session_payload,
    shown_legal_versions,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Student invites"])

# A temporary password: random, unambiguous characters (no 0/O, 1/l/I), shown once.
TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
TEMP_LENGTH = 12
TOKEN_BYTES = 32
SECONDS_PER_HOUR = 3600
CLAIMS_PER_ADDRESS = 20
CLAIMS_WINDOW = 900

INVITE_INVALID = "INVITE_INVALID"
INVITE_FAILED = "INVITE_FAILED"
INVITE_CONTACT_IN_USE = "INVITE_CONTACT_IN_USE"
INVITE_SAME_PASSWORD = "INVITE_SAME_PASSWORD"  # noqa: S105 — an error code, not a password
INVALID_MESSAGE = "This link has expired or has already been used. Ask your college to send a new one."


def _temp_password() -> str:
    return "".join(secrets.choice(TEMP_ALPHABET) for _ in range(TEMP_LENGTH))


def _link(token: str) -> str:
    return f"{APP_BASE_URL}/claim#token={token}"


def _message(account: M.Account, university: str, token: str, hours: int) -> str:
    first = (account.full_name or "").split(" ")[0]
    return (f"Hi {first}, {university} has made you a StudentKare account.\n"
            f"Open this link to claim it: {_link(token)}\n"
            f"Your college will give you a temporary password separately. The link works for {hours} hours.\n"
            "If you weren't expecting this, you can ignore it.")


def _status(invite: M.StudentInvite, now: float) -> str:
    if invite.claimed_at:
        return "CLAIMED"
    return "EXPIRED" if invite.expires_at <= now else "PENDING"


def _row(db: DBSession, invite: M.StudentInvite, now: float) -> dict:
    account = db.get(M.Account, invite.account_id)
    profile = (account.profile or {}) if account else {}
    contacts = {row.kind: row.value for row in db.scalars(select(M.AccountContact)
                                                           .where(M.AccountContact.account_id == invite.account_id))}
    return {"id": invite.id, "fullName": account.full_name if account else "", "rollNumber": profile.get("rollNumber", ""),
            "university": invite.university, "email": contacts.get("EMAIL", ""), "phone": contacts.get("WHATSAPP", ""),
            "sentBy": invite.link_channel, "status": _status(invite, now), "linkSent": bool(invite.sent_at),
            "createdAt": invite.created_at, "expiresAt": invite.expires_at, "claimedAt": invite.claimed_at or None,
            "locked": is_locked(invite, now)}


def _campus_of(db: DBSession, user: dict, asked: str | None) -> str:
    """A campus admin's own campus (never what was typed); a super admin names one. Fails closed."""
    if user["role"] == "SUPER_ADMIN":
        campus = (asked or "").strip()
    else:
        # The super-admin-assigned campus, never the self-service profile (audit C1).
        from services.workflow_api import staff_campus_of
        campus = staff_campus_of(db.get(M.Account, user["id"]))
    if not campus:
        raise HTTPException(422, "Choose the campus these students belong to.")
    if is_reserved_campus(campus):
        raise HTTPException(422, RESERVED_CAMPUS_MESSAGE)
    return campus


def _issue(db: DBSession, invite: M.StudentInvite, account: M.Account, hours: int) -> tuple[str, str]:
    """A fresh link token and temporary password for the invite (earlier ones stop working). Doesn't commit.

    ``hours`` is read by the caller before anything is written: reading a setting
    can end the transaction, which would drop the rows written so far.
    """
    token, temp = secrets.token_urlsafe(TOKEN_BYTES), _temp_password()
    invite.token_hash, invite.temp_password_hash = digest(token), hash_pin(temp)
    invite.expires_at = time.time() + hours * SECONDS_PER_HOUR
    invite.failed_attempts, invite.locked_until, invite.sent_at = 0, 0.0, 0.0
    value = db.scalar(select(M.AccountContact.value).where(M.AccountContact.account_id == account.id,
                                                           M.AccountContact.kind == invite.link_channel))
    if value and dispatch_message(value, invite.link_channel, "Your StudentKare account is ready to claim",
                                  _message(account, invite.university, token, hours), db):
        invite.sent_at = time.time()
    return token, temp


# --- the college: create, list, resend, cancel ------------------------------------


class InviteCreate(StrictModel):
    fullName: str = Field(min_length=2, max_length=120)
    rollNumber: str = Field(min_length=1, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=20)
    sendBy: Literal["EMAIL", "WHATSAPP"]
    # Super admin only; a campus admin always invites to their own campus.
    university: str | None = Field(default=None, max_length=160)


@router.post("/campus/invites", status_code=201)
def create_invite(body: InviteCreate, request: Request, response: Response,
                  user=Depends(require_campus_admin), db: DBSession = Depends(workflow_db)):
    """Creates the pending account and its invite. The temporary password is in this answer only."""
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    campus = _campus_of(db, user, body.university)
    hours = setting("auth.invite_link_hours", db)
    given = {kind: normalize_identifier(raw, kind) for kind, raw in (("EMAIL", body.email), ("WHATSAPP", body.phone))
             if raw and raw.strip()}
    if body.sendBy not in given:
        raise HTTPException(422, "Add the email or WhatsApp number the link should go to.")
    for kind, value in given.items():
        if contact_in_use(db, value):
            raise HTTPException(409, {"code": INVITE_CONTACT_IN_USE, "field": kind,
                                      "message": "This student already has an account."})
    now = time.time()
    account = M.Account(id=str(uuid.uuid4()), identifier=given[body.sendBy], channel=body.sendBy,
                        full_name=body.fullName, role="STUDENT", active=True, created_at=now,
                        profile={"university": campus, "rollNumber": body.rollNumber, "invitePending": True,
                                 "ageVerified": False, "isVerifiedStudent": False})
    db.add(account)
    db.flush()
    for kind, value in given.items():
        save_contact(db, account.id, kind, value, verified=False)
    invite = M.StudentInvite(id=uuid.uuid4().hex, account_id=account.id, token_hash="", temp_password_hash="",
                             link_channel=body.sendBy, university=campus, created_by=user["id"], created_at=now,
                             expires_at=now)
    db.add(invite)
    _token, temp = _issue(db, invite, account, hours)
    audit(db, user["id"], "INVITE_CREATED", invite.id)
    db.commit()
    return {**_row(db, invite, time.time()), "tempPassword": temp}


def _visible(db: DBSession, user: dict):
    statement = select(M.StudentInvite).order_by(M.StudentInvite.created_at.desc())
    if user["role"] != "SUPER_ADMIN":
        statement = statement.where(M.StudentInvite.university == _campus_of(db, user, None))
    return statement


@router.get("/campus/invites")
def list_invites(response: Response, user=Depends(require_campus_admin), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    now = time.time()
    # Whether this admin names the campus on the form (a super admin) or always invites to their own.
    return {"items": [_row(db, invite, now) for invite in db.scalars(_visible(db, user)).all()],
            "chooseCampus": user["role"] == "SUPER_ADMIN"}


def _own_invite(db: DBSession, user: dict, invite_id: str) -> M.StudentInvite:
    invite = db.get(M.StudentInvite, invite_id)
    if invite is None or (user["role"] != "SUPER_ADMIN" and invite.university != _campus_of(db, user, None)):
        raise HTTPException(404, "No invite with that id.")
    return invite


@router.post("/campus/invites/{invite_id}/resend")
def resend_invite(invite_id: str, request: Request, response: Response,
                  user=Depends(require_campus_admin), db: DBSession = Depends(workflow_db)):
    """A new link and a new temporary password; the old ones stop working."""
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    invite = _own_invite(db, user, invite_id)
    if invite.claimed_at:
        raise HTTPException(409, "This student has already claimed their account.")
    hours = setting("auth.invite_link_hours", db)
    _token, temp = _issue(db, invite, db.get(M.Account, invite.account_id), hours)
    audit(db, user["id"], "INVITE_RESENT", invite.id)
    db.commit()
    return {**_row(db, invite, time.time()), "tempPassword": temp}


@router.post("/campus/invites/{invite_id}/cancel")
def cancel_invite(invite_id: str, request: Request, user=Depends(require_campus_admin),
                  db: DBSession = Depends(workflow_db)):
    """Cancels an unclaimed invite and removes its pending account, freeing the email and number."""
    check_origin(request)
    invite = _own_invite(db, user, invite_id)
    if invite.claimed_at:
        raise HTTPException(409, "This student has already claimed their account.")
    account_id = invite.account_id
    db.delete(invite)
    db.execute(delete(M.AccountContact).where(M.AccountContact.account_id == account_id))
    db.execute(delete(M.Account).where(M.Account.id == account_id))
    audit(db, user["id"], "INVITE_CANCELLED", invite_id)
    db.commit()
    return {"success": True}


# --- the student: look at the link, then claim -----------------------------------


def _live_invite(db: DBSession, token: str) -> M.StudentInvite | None:
    invite = db.scalar(select(M.StudentInvite).where(M.StudentInvite.token_hash == digest(token))) if token else None
    if invite is None or invite.claimed_at or invite.expires_at <= time.time():
        return None
    account = db.get(M.Account, invite.account_id)
    return invite if account is not None and account.active and (account.profile or {}).get("invitePending") else None


def _invalid() -> HTTPException:
    return HTTPException(404, {"code": INVITE_INVALID, "message": INVALID_MESSAGE})


class InviteLookup(StrictModel):
    token: str = Field(min_length=10, max_length=100)


@router.post("/auth/invite/lookup")
def look_up_invite(body: InviteLookup, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    """What the claim page shows before anything is typed. POST, so the token is never in a URL."""
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    limit(db, f"invite_ip:{request.client.host if request.client else 'unknown'}", CLAIMS_PER_ADDRESS, CLAIMS_WINDOW)
    invite = _live_invite(db, body.token)
    if invite is None:
        db.commit()
        raise _invalid()
    account = db.get(M.Account, invite.account_id)
    db.commit()
    return {"firstName": (account.full_name or "").split(" ")[0], "university": invite.university,
            "sentTo": mask_identifier(account.identifier, invite.link_channel),
            "minLength": setting("auth.password_min_length", db), "expiresAt": invite.expires_at}


class InviteClaim(StrictModel):
    token: str = Field(min_length=10, max_length=100)
    tempPassword: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)
    dob: date
    consent: SignupConsent

    @field_validator("dob")
    @classmethod
    def check_age(cls, value):
        return adult_birth_date(value)


def _claim_failed(db: DBSession) -> HTTPException:
    return HTTPException(401, {"code": INVITE_FAILED, "message": (
        f"That temporary password doesn't match, or the link is locked. After {setting('auth.password_max_attempts', db)} "
        f"wrong tries it locks for {setting('auth.password_lockout_minutes', db)} minutes; your college can send a new one.")})


@router.post("/auth/invite/claim")
def claim_invite(body: InviteClaim, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    """The temporary password, the student's own new password, birth date and consent; then the session."""
    check_origin(request)
    limit(db, f"invite_ip:{request.client.host if request.client else 'unknown'}", CLAIMS_PER_ADDRESS, CLAIMS_WINDOW)
    invite = _live_invite(db, body.token)
    if invite is None:
        _burn_hash_time(body.tempPassword)
        db.commit()
        raise _invalid()
    # Settings first: reading one can end the transaction (see _issue).
    max_attempts, lockout = setting("auth.password_max_attempts", db), setting("auth.password_lockout_minutes", db)
    min_length = setting("auth.password_min_length", db)
    now = time.time()
    if is_locked(invite, now):
        _burn_hash_time(body.tempPassword)
        audit(db, invite.account_id, "INVITE_CLAIM_WHILE_LOCKED", invite.id)
        db.commit()
        raise _claim_failed(db)
    clear_lock_if_run_out(invite)
    if not verify_pin(body.tempPassword, invite.temp_password_hash):
        audit(db, invite.account_id, "INVITE_CLAIM_FAILED", invite.id)
        if count_wrong_attempt(db, invite, max_attempts, lockout, now):
            audit(db, invite.account_id, "INVITE_LOCKED", invite.id)
        db.commit()
        raise _claim_failed(db)

    account = db.get(M.Account, invite.account_id)
    if body.password == body.tempPassword:
        db.commit()
        raise HTTPException(422, {"code": INVITE_SAME_PASSWORD, "message": "Choose a new password of your own."})
    draft = M.Account(id=account.id, identifier=account.identifier, channel=account.channel,
                      full_name=account.full_name, profile={"dob": body.dob.isoformat()})
    try:
        check_password(body.password, min_length, draft)
    except PasswordRefused as error:
        db.commit()
        raise refusal(error, min_length) from error

    try:
        notice_version, terms_version = shown_legal_versions(db, body.consent)
    except HTTPException:
        db.commit()
        raise

    # Everything checked: the account becomes the student's, in one transaction.
    invite.claimed_at = now
    profile = {**(account.profile or {}), "dob": body.dob.isoformat()}
    profile.pop("invitePending", None)
    account.profile = profile
    store_new_password(db, account, body.password)
    save_contact(db, account.id, invite.link_channel, account.identifier, verified=True)   # D-B5
    db.add(M.ConsentRecord(id=str(uuid.uuid4()), account_id=account.id, version=body.consent.version,
                           purposes=body.consent.purposes, language=body.consent.language, recorded_at=now,
                           notice_version=notice_version, terms_version=terms_version))
    audit(db, account.id, "INVITE_CLAIMED", invite.id)
    csrf = issue_session(db, account, response, request)
    remember_device(db, account, request, response)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf}
