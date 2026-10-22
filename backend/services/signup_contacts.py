"""Sign-up: verify the other contact before the account exists.

Plan tier1-auth-password-2026-10-22 (section B, D-2), approved by the founder
2026-10-22. A student who has proven one contact (the sign-up grant) proves the
other with its own code: the email if they started with WhatsApp, or the other
way round. POST /auth/signup then saves both as verified, and refuses to create
the account without the second one whenever its channel can deliver a code.

* **Bound to the grant.** The code's challenge records the grant it belongs to,
  so it can't verify a contact for any other sign-up, and it is never a sign-in.
* **One value, one account**, as everywhere (services/contact_store.py).
* **Rate limited** per grant and per value, and email goes through the
  deliverability check, exactly like the first code.
"""
from __future__ import annotations

import hmac
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import delete, update
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services import workflow_auth
from services.contact_store import contact_in_use
from services.email_deliverability import check_email_deliverable
from services.workflow_auth import (
    GRANT_COOKIE,
    StrictModel,
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

router = APIRouter(prefix="/api/auth", tags=["Sign-up contacts"])

SECOND_COOKIE = "sacare_signup_contact"
CODE_SECONDS = 300
MAX_CODE_ATTEMPTS = 5
SENDS_PER_GRANT = 5
SENDS_PER_GRANT_WINDOW = 900
SENDS_PER_VALUE = 3
SENDS_PER_VALUE_WINDOW = 300

CONTACT_IN_USE = "CONTACT_IN_USE"
CONTACT_CODE_FAILED = "CONTACT_CODE_FAILED"


def _grant(db: DBSession, request: Request) -> M.SignupGrant:
    """The live sign-up grant this browser holds, checked against its CSRF token. Fails closed."""
    grant = db.get(M.SignupGrant, digest(request.cookies.get(GRANT_COOKIE, "")))
    if grant is None or grant.consumed or grant.expires_at <= time.time():
        raise HTTPException(401, "Verify your contact details before completing registration.")
    if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), grant.csrf_token):
        raise HTTPException(403, "Refresh the signup flow and verify your contact details again.")
    return grant


def _other(grant: M.SignupGrant) -> str:
    return "WHATSAPP" if grant.channel == "EMAIL" else "EMAIL"


class SecondContactSend(StrictModel):
    value: str = Field(min_length=3, max_length=254)


@router.post("/signup/contact/send-code")
def send_second_code(body: SecondContactSend, request: Request, response: Response,
                     db: DBSession = Depends(workflow_db)):
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    grant = _grant(db, request)
    kind = _other(grant)
    value = normalize_identifier(body.value, kind)
    if contact_in_use(db, value):
        raise HTTPException(409, {"code": CONTACT_IN_USE, "message": "That is already used by another account."})
    limit(db, f"signup_second:{grant.token_hash}", SENDS_PER_GRANT, SENDS_PER_GRANT_WINDOW)
    limit(db, f"send:{value}", SENDS_PER_VALUE, SENDS_PER_VALUE_WINDOW)
    if kind == "EMAIL":
        rejected = check_email_deliverable(value)
        if rejected is not None:
            raise HTTPException(rejected.status, rejected.reason)
    token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(900000) + 100000}"
    if not workflow_auth.deliver_code(value, code, kind):   # looked up at call time, like /otp/send
        raise channel_unavailable(kind, db)
    old = request.cookies.get(SECOND_COOKIE)
    if old:
        db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.token_hash == digest(old)))
    db.add(M.OtpChallenge(token_hash=digest(token), identifier=value, intent="SIGNUP2", channel=kind,
                          code_hash=code_digest(token, code), expires_at=time.time() + CODE_SECONDS, attempts=0,
                          consumed=False, account_id=grant.token_hash))
    # A new value replaces whatever was verified before: only the latest proven one is kept.
    grant.second_channel, grant.second_identifier, grant.second_verified_at = kind, value, 0.0
    db.commit()
    set_cookie(response, SECOND_COOKIE, token, CODE_SECONDS)
    return {"success": True, "channel": kind, "targetMasked": mask_identifier(value, kind),
            "expiresInSeconds": CODE_SECONDS}


class SecondContactVerify(StrictModel):
    otp: str = Field(pattern=r"^\d{6}$")


def _code_failed() -> HTTPException:
    return HTTPException(401, {"code": CONTACT_CODE_FAILED,
                               "message": "That code is wrong or has expired. Send a new one if needed."})


@router.post("/signup/contact/verify")
def verify_second_code(body: SecondContactVerify, request: Request, response: Response,
                       db: DBSession = Depends(workflow_db)):
    check_origin(request)
    response.headers["Cache-Control"] = "no-store"
    grant = _grant(db, request)
    token = request.cookies.get(SECOND_COOKIE, "")
    key = digest(token)
    challenge = db.get(M.OtpChallenge, key)
    if (challenge is None or challenge.intent != "SIGNUP2" or challenge.account_id != grant.token_hash
            or challenge.identifier != grant.second_identifier):
        raise _code_failed()
    counted = db.execute(update(M.OtpChallenge).where(
        M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False),
        M.OtpChallenge.expires_at > time.time(), M.OtpChallenge.attempts < MAX_CODE_ATTEMPTS,
    ).values(attempts=M.OtpChallenge.attempts + 1)).rowcount
    db.commit()
    if not counted or not hmac.compare_digest(challenge.code_hash, code_digest(token, body.otp)):
        raise _code_failed()
    if not db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False))
                      .values(consumed=True)).rowcount:
        db.rollback()
        raise _code_failed()
    grant.second_verified_at = time.time()
    db.commit()
    response.delete_cookie(SECOND_COOKIE, path="/api")
    return {"success": True, "channel": grant.second_channel, "verified": True}
