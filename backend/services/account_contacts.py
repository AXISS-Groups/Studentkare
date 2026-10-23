"""Profile → Sign-in & security → your email and WhatsApp number.

Plan tier1-auth-password-2026-10-22 (section A), approved by the founder
2026-10-22. A signed-in account can see its two contacts, add or verify the one
it doesn't have yet, and remove a second contact. The rules:

* **Only while signed in.** A code sent here proves a contact *for this account*:
  the challenge records the account, and verifying from any other session fails.
  It is never a sign-in or a sign-up (``/auth/otp/verify`` refuses it).
* **One value, one account.** A value another account uses, verified or not, is
  refused, and nothing says whose it is.
* **The sign-in ID can't be swapped here.** Its kind is fixed; changing it is a
  separate, later flow.
* **Codes are rate limited** per account and per value, cost a delivery check
  for email, and are audited (never the code or the value).

Contacts an admin typed for a B2B student start unverified and are verified here
(amendment b, B4).
"""
from __future__ import annotations

import hmac
import secrets
import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services import workflow_auth
from services.contact_store import (
    CONTACT_KINDS,
    contact_in_use,
    contact_of_kind,
    contacts_of,
    save_contact,
)
from services.email_deliverability import check_email_deliverable
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    channel_unavailable,
    check_origin,
    code_digest,
    digest,
    limit,
    mask_identifier,
    normalize_identifier,
    set_cookie,
    workflow_db,
)

router = APIRouter(prefix="/api/auth", tags=["Contacts"])

CONTACT_COOKIE = "sacare_contact"
CODE_SECONDS = 300
MAX_CODE_ATTEMPTS = 5
SENDS_PER_ACCOUNT = 5
SENDS_PER_ACCOUNT_WINDOW = 900
SENDS_PER_VALUE = 3
SENDS_PER_VALUE_WINDOW = 300

CONTACT_IN_USE = "CONTACT_IN_USE"
CONTACT_PRIMARY = "CONTACT_PRIMARY"
CONTACT_CODE_FAILED = "CONTACT_CODE_FAILED"


def _audit(db: DBSession, account_id: str, action: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=account_id, action=action, resource_id=account_id,
                           created_at=time.time()))


def _account(db: DBSession, user: dict) -> M.Account:
    account = db.get(M.Account, user["id"])
    if account is None:
        raise HTTPException(401, "Sign in to continue.")
    return account


def contact_list(db: DBSession, account: M.Account) -> dict:
    rows = {row.kind: row for row in contacts_of(db, account.id)}
    items = []
    for kind in CONTACT_KINDS:
        row = rows.get(kind)
        if row is not None:
            items.append({"kind": kind, "value": row.value, "verified": bool(row.verified_at),
                          "primary": account.channel == kind})
        elif account.channel == kind:
            items.append({"kind": kind, "value": account.identifier, "verified": True, "primary": True})
    return {"items": items}


@router.get("/contacts")
def list_contacts(response: Response, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    return contact_list(db, _account(db, user))


class ContactCodeSend(StrictModel):
    kind: Literal["EMAIL", "WHATSAPP"]
    value: str = Field(min_length=3, max_length=254)


@router.post("/contacts/send-code")
def send_contact_code(body: ContactCodeSend, request: Request, response: Response,
                      user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    """Sends a code to the email or number being added or verified. Proves it for this account only."""
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    account = _account(db, user)
    value = normalize_identifier(body.value, body.kind)
    if body.kind == account.channel:
        raise HTTPException(409, {"code": CONTACT_PRIMARY,
                                  "message": "This is how you sign up and sign in, so it can't be changed here."})
    existing = contact_of_kind(db, account.id, body.kind)
    if existing is not None and existing.value == value and existing.verified_at:
        return {"success": True, "alreadyVerified": True, **contact_list(db, account)}
    if contact_in_use(db, value, account.id):
        raise HTTPException(409, {"code": CONTACT_IN_USE, "message": "That is already used by another account."})
    limit(db, f"contact_send:{account.id}", SENDS_PER_ACCOUNT, SENDS_PER_ACCOUNT_WINDOW)
    limit(db, f"send:{value}", SENDS_PER_VALUE, SENDS_PER_VALUE_WINDOW)
    if body.kind == "EMAIL":
        rejected = check_email_deliverable(value)
        if rejected is not None:
            raise HTTPException(rejected.status, rejected.reason)
    token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(900000) + 100000}"
    if not workflow_auth.deliver_code(value, code, body.kind):   # looked up at call time, like /otp/send
        raise channel_unavailable(body.kind, db)
    old = request.cookies.get(CONTACT_COOKIE)
    if old:
        db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.token_hash == digest(old)))
    db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.expires_at <= time.time()))
    db.add(M.OtpChallenge(token_hash=digest(token), identifier=value, intent="VERIFY", channel=body.kind,
                          code_hash=code_digest(token, code), expires_at=time.time() + CODE_SECONDS, attempts=0,
                          consumed=False, account_id=account.id))
    _audit(db, account.id, "CONTACT_CODE_SENT")
    db.commit()
    set_cookie(response, CONTACT_COOKIE, token, CODE_SECONDS)
    return {"success": True, "alreadyVerified": False, "targetMasked": mask_identifier(value, body.kind),
            "expiresInSeconds": CODE_SECONDS}


class ContactCodeVerify(StrictModel):
    otp: str = Field(pattern=r"^\d{6}$")


def _code_failed() -> HTTPException:
    return HTTPException(401, {"code": CONTACT_CODE_FAILED,
                               "message": "That code is wrong or has expired. Send a new one if needed."})


@router.post("/contacts/verify")
def verify_contact(body: ContactCodeVerify, request: Request, response: Response,
                   user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    """Enters the code: the contact is saved as verified on this account."""
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    account = _account(db, user)
    token = request.cookies.get(CONTACT_COOKIE, "")
    key = digest(token)
    challenge = db.get(M.OtpChallenge, key)
    if challenge is None or challenge.intent != "VERIFY" or challenge.account_id != account.id:
        raise _code_failed()
    counted = db.execute(update(M.OtpChallenge).where(
        M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False),
        M.OtpChallenge.expires_at > time.time(), M.OtpChallenge.attempts < MAX_CODE_ATTEMPTS,
    ).values(attempts=M.OtpChallenge.attempts + 1)).rowcount
    db.commit()
    if not counted or not hmac.compare_digest(challenge.code_hash, code_digest(token, body.otp)):
        _audit(db, account.id, "CONTACT_VERIFY_FAILED")
        db.commit()
        raise _code_failed()
    if not db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False))
                      .values(consumed=True)).rowcount:
        db.rollback()
        raise _code_failed()
    if challenge.channel == account.channel or contact_in_use(db, challenge.identifier, account.id):
        # Taken by another account since the code was sent: nothing is saved.
        db.commit()
        raise HTTPException(409, {"code": CONTACT_IN_USE, "message": "That is already used by another account."})
    try:
        save_contact(db, account.id, challenge.channel, challenge.identifier, verified=True)
        _audit(db, account.id, "CONTACT_VERIFIED")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, {"code": CONTACT_IN_USE, "message": "That is already used by another account."}) from None
    response.delete_cookie(CONTACT_COOKIE, path="/api")
    return contact_list(db, account)


@router.delete("/contacts/{kind}")
def remove_contact(kind: Literal["EMAIL", "WHATSAPP"], request: Request,
                   user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    """Removes the second contact. The sign-in ID stays."""
    check_origin(request)
    account = _account(db, user)
    if kind == account.channel:
        raise HTTPException(409, {"code": CONTACT_PRIMARY,
                                  "message": "This is how you sign up and sign in, so it can't be removed."})
    row = contact_of_kind(db, account.id, kind)
    if row is not None:
        db.delete(row)
        _audit(db, account.id, "CONTACT_REMOVED")
        db.commit()
    return contact_list(db, account)
