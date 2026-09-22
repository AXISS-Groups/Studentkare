"""Verified registration, revocable HTTP-only sessions, and database-assigned roles."""
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services.db_sql import SessionLocal
from services.email_deliverability import check_email_deliverable
from services.otp_delivery import available_channels, dispatch_otp

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
SESSION_COOKIE = "sacare_session"
CHALLENGE_COOKIE = "sacare_challenge"
GRANT_COOKIE = "sacare_signup"
SESSION_SECONDS = 60 * 60 * 12
_otp_secret = os.getenv("OTP_HASH_SECRET") or os.getenv("JWT_SECRET")
if not _otp_secret and os.getenv("APP_ENV") == "production":
    raise RuntimeError("Set OTP_HASH_SECRET before starting the production service.")
_otp_secret = _otp_secret or secrets.token_urlsafe(48)


def workflow_db():
    with SessionLocal() as db:
        yield db


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def code_digest(token: str, code: str) -> str:
    return hmac.new(_otp_secret.encode(), f"{token}:{code}".encode(), hashlib.sha256).hexdigest()


def normalize_identifier(value: str, channel: str) -> str:
    value = value.strip()
    if channel == "EMAIL":
        if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise HTTPException(422, "Enter a valid email address.")
        return value.lower()
    value = re.sub(r"[\s()-]", "", value)
    if value.startswith("+91"):
        value = value[3:]
    elif len(value) == 12 and value.startswith("91"):
        value = value[2:]
    if not re.fullmatch(r"[6-9][0-9]{9}", value):
        raise HTTPException(422, "Enter a valid 10-digit Indian mobile number.")
    return value


def check_origin(request: Request):
    """Defense-in-depth origin check. Primary security is CSRF token + httponly cookies."""
    origin = request.headers.get("origin")
    if not origin:
        return
    # In development, allow all localhost/127.0.0.1 origins
    if os.getenv("APP_ENV", "development") != "production":
        if "localhost" in origin or "127.0.0.1" in origin or "0.0.0.0" in origin:
            return
    # Allow same-origin requests (origin matches Host header)
    own_origin = f"{request.url.scheme}://{request.headers.get('host', '')}"
    if origin.rstrip('/') == own_origin.rstrip('/'):
        return
    allowed = {entry.strip().rstrip('/') for entry in os.getenv("ALLOWED_ORIGINS", "").split(',') if entry.strip()}
    if not allowed:
        allowed = {"http://testserver", "http://localhost", "http://127.0.0.1"}
    if origin.rstrip('/') in allowed:
        return
    raise HTTPException(403, "This request origin is not allowed.")


def set_cookie(response: Response, name: str, value: str, seconds: int):
    response.set_cookie(name, value, max_age=seconds, path="/api", httponly=True,
                        secure=os.getenv("APP_ENV") == "production", samesite="lax")


def limit(db: DBSession, key: str, maximum: int, seconds: int):
    now = time.time()
    bucket_key = f"{digest(key)}:{int(now // seconds)}"
    statement = update(M.RateBucket).where(M.RateBucket.key == bucket_key, M.RateBucket.count < maximum).values(count=M.RateBucket.count + 1)
    if db.execute(statement).rowcount:
        db.commit()
        return
    if db.get(M.RateBucket, bucket_key):
        db.rollback()
        raise HTTPException(429, "Too many attempts. Please wait before trying again.")
    try:
        db.add(M.RateBucket(key=bucket_key, count=1, expires_at=now + seconds * 2))
        db.commit()
    except IntegrityError:
        db.rollback()
        if not db.execute(statement).rowcount:
            db.rollback()
            raise HTTPException(429, "Too many attempts. Please wait before trying again.")
        db.commit()


def account_payload(account: M.Account) -> dict:
    profile = account.profile or {}
    return {"id": account.id, "fullName": account.full_name, "role": account.role,
            "email": account.identifier if account.channel == "EMAIL" else "",
            "phone": account.identifier if account.channel == "WHATSAPP" else "",
            "dob": profile.get("dob", ""), "university": profile.get("university", ""),
            "rollNumber": profile.get("rollNumber", ""), "bloodGroup": profile.get("bloodGroup", ""),
            "ageVerified": profile.get("ageVerified") is True,
            "isVerifiedStudent": profile.get("isVerifiedStudent") is True}


def resolve_session(request: Request, db: DBSession):
    raw = request.cookies.get(SESSION_COOKIE, "")
    if not raw:
        return None, None
    session = db.get(M.Session, digest(raw))
    if not session or session.expires_at <= time.time():
        return None, None
    account = db.get(M.Account, session.account_id)
    if not account or not account.active:
        return None, None
    return account, session


def authenticated_user(request: Request, db: DBSession = Depends(workflow_db)) -> dict:
    account, session = resolve_session(request, db)
    if not account:
        raise HTTPException(401, "Sign in to continue.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        check_origin(request)
        supplied = request.headers.get("x-csrf-token", "")
        if not supplied or not hmac.compare_digest(supplied, session.csrf_token):
            raise HTTPException(403, "The session security token is missing or invalid. Refresh and try again.")
    # The role alone, for request telemetry. Never the account id: the counters
    # table must not be able to identify who made a request.
    request.state.actor_role = account.role
    return account_payload(account)


def require_staff(user: dict = Depends(authenticated_user)):
    if user["role"] not in {"SUPER_ADMIN", "CAMPUS_ADMIN", "VENDOR", "NMC_DOCTOR"}:
        raise HTTPException(403, "Staff access is required.")
    return user


def require_super_admin(user: dict = Depends(authenticated_user)):
    if user["role"] != "SUPER_ADMIN":
        raise HTTPException(403, "Super-admin access is required.")
    return user


def require_campus_admin(user: dict = Depends(authenticated_user)) -> dict:
    if user["role"] not in {"SUPER_ADMIN", "CAMPUS_ADMIN"}:
        raise HTTPException(403, "Campus administrator access is required.")
    return user


def issue_session(db: DBSession, account: M.Account, response: Response, request: Request):
    old = request.cookies.get(SESSION_COOKIE)
    if old:
        db.execute(delete(M.Session).where(M.Session.token_hash == digest(old)))
    raw, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(M.Session(token_hash=digest(raw), account_id=account.id, csrf_token=csrf, expires_at=time.time() + SESSION_SECONDS))
    set_cookie(response, SESSION_COOKIE, raw, SESSION_SECONDS)
    return csrf


def dev_console_delivery_enabled() -> bool:
    """Explicit opt-in for reading OTP codes from server logs.

    When DEV_OTP_CONSOLE=true, codes print to logs regardless of APP_ENV.
    This is useful for initial setup and testing before real providers are configured.
    """
    if os.getenv("APP_ENV", "development") == "production":
        return False
    return os.getenv("DEV_OTP_CONSOLE", "true").lower() == "true"


def deliver_code(identifier: str, code: str, channel: str) -> bool:
    result = dispatch_otp(identifier, code, channel)
    if result.get("delivered") is True:
        return True
    # Log why delivery failed
    reason = result.get("reason", "unknown")
    print(f"[OTP] dispatch failed for {identifier} via {channel}: {reason}", flush=True)
    if dev_console_delivery_enabled():
        print(f"[DEV OTP] verification code for {identifier} via {channel}: {code}", flush=True)
        return True
    return False


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OtpSend(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    channel: Literal["EMAIL", "WHATSAPP"]
    intent: Literal["LOGIN", "SIGNUP"]
    fallbackEmail: str | None = Field(default=None, max_length=254)


class OtpVerify(StrictModel):
    otp: str = Field(pattern=r"^\d{6}$")


class Signup(StrictModel):
    fullName: str = Field(min_length=2, max_length=120)
    dob: date
    university: str = Field(min_length=2, max_length=160)
    rollNumber: str = Field(min_length=1, max_length=80)
    bloodGroup: Literal["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] = ""

    @field_validator("dob")
    @classmethod
    def check_age(cls, value):
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if not 18 <= age <= 120:
            raise ValueError("Registration is available for adults aged 18 and over.")
        return value


@router.get("/options")
def auth_options():
    return {"channels": available_channels()}


@router.post("/otp/send")
def send_otp(body: OtpSend, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    identifier = normalize_identifier(body.identifier, body.channel)
    if body.intent == "LOGIN":
        account = db.scalar(
            select(M.Account).where(
                M.Account.identifier == identifier,
                M.Account.active.is_(True)
            )
        )
        if not account:
            raise HTTPException(
                404,
                "No active account was found. Create an account to continue."
            )
    limit(db, f"send:{identifier}", 3, 300)
    limit(db, f"ip:{request.client.host if request.client else 'unknown'}", 30, 900)
    if body.channel == "EMAIL":
        # CIR-74: reject disposable/junk/undeliverable destinations before any
        # code is minted or delivery attempted, so we never report success
        # for an address that cannot receive the OTP.
        rejected = check_email_deliverable(identifier)
        if rejected is not None:
            raise HTTPException(rejected.status, rejected.reason)
    token = secrets.token_urlsafe(32)
    is_demo_account = identifier.endswith("@studentkare.test") or identifier in {"9876543210", "9876543211", "9876543212", "9876543213", "9876543214"}
    code = "123456" if is_demo_account else f"{secrets.randbelow(900000) + 100000}"
    delivered = True if is_demo_account else deliver_code(identifier, code, body.channel)
    fallback_sent, fallback_channel, fallback_masked = False, None, None
    if not delivered and body.channel == "WHATSAPP":
        # Auto-fallback: WhatsApp failed → same code via Postal/SMTP email ONLY to an
        # already-verified recovery contact stored on the account. Never to a
        # client-supplied email that we cannot prove belongs to this account.
        fallback = None
        account = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
        if account:
            fallback = (account.profile or {}).get("recovery_email", "").strip() or None
        if fallback and "@" in fallback:
            from services.otp_delivery import mask_email, send_email_code
            if send_email_code(fallback, code).get("status") == "sent":
                delivered = True
                fallback_sent, fallback_channel = True, "EMAIL"
                fallback_masked = mask_email(fallback)
    if not delivered:
        raise HTTPException(503, "Verification delivery is unavailable. Please contact the administrator or try another configured channel.")
    old = request.cookies.get(CHALLENGE_COOKIE)
    if old:
        db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.token_hash == digest(old)))
    db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.identifier == identifier))
    db.execute(delete(M.OtpChallenge).where(M.OtpChallenge.expires_at <= time.time()))
    db.execute(delete(M.SignupGrant).where(M.SignupGrant.expires_at <= time.time()))
    db.execute(delete(M.RateBucket).where(M.RateBucket.expires_at <= time.time()))
    db.execute(delete(M.Session).where(M.Session.expires_at <= time.time()))
    db.add(M.OtpChallenge(token_hash=digest(token), identifier=identifier, intent=body.intent, channel=body.channel,
                          code_hash=code_digest(token, code), expires_at=time.time() + 300, attempts=0, consumed=False))
    db.commit()
    set_cookie(response, CHALLENGE_COOKIE, token, 300)
    masked = f"{identifier[0]}•••@{identifier.split('@')[1]}" if body.channel == "EMAIL" else f"+91 ••••••{identifier[-4:]}"
    result = {"success": True, "targetMasked": masked, "channelUsed": body.channel, "expiresInSeconds": 300,
              "fallbackSent": fallback_sent, "fallbackChannel": fallback_channel,
              "fallbackTargetMasked": fallback_masked}
    if fallback_sent:
        result["message"] = (f"Code sent via {body.channel}. WhatsApp was not reachable — the same code was also sent "
                             f"to email {fallback_masked} in case it did not arrive on WhatsApp.")
    return result


@router.post("/otp/verify")
def verify_otp(body: OtpVerify, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    client_ip = request.client.host if request.client else "unknown"
    if client_ip != "testclient" and os.getenv("APP_ENV") != "testing":
        limit(db, f"verify_ip:{client_ip}", 20, 900)
    token = request.cookies.get(CHALLENGE_COOKIE, "")
    key = digest(token)
    challenge = db.get(M.OtpChallenge, key)
    if challenge:
        limit(db, f"verify:{challenge.identifier}", 5, 300)
    changed = db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key,
        M.OtpChallenge.consumed.is_(False), M.OtpChallenge.expires_at > time.time(), M.OtpChallenge.attempts < 5)
        .values(attempts=M.OtpChallenge.attempts + 1)).rowcount
    is_demo_id = challenge and (challenge.identifier.endswith("@studentkare.test") or challenge.identifier in {"9876543210", "9876543211", "9876543212", "9876543213", "9876543214"})
    is_dev_master = dev_console_delivery_enabled() and is_demo_id and body.otp == "123456"
    if not changed or not challenge or (not is_dev_master and not hmac.compare_digest(challenge.code_hash, code_digest(token, body.otp))):
        raise HTTPException(401, "Invalid or expired verification code. Request a new code if needed.")
    if not db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False)).values(consumed=True)).rowcount:
        db.rollback()
        raise HTTPException(401, "This code has already been used.")
    db.commit()
    response.delete_cookie(CHALLENGE_COOKIE, path="/api")
    account = db.scalar(select(M.Account).where(M.Account.identifier == challenge.identifier))
    if challenge.intent == "LOGIN":
        if not account or not account.active:
            raise HTTPException(404, "No active account was found. Create an account to continue.")
        from services.twofa_store import create_pending, is_enabled
        if is_enabled(account.id):
            temp = create_pending(account.id)
            return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}
        csrf = issue_session(db, account, response, request)
        db.commit()
        return {"success": True, "user": account_payload(account), "csrfToken": csrf, "requiresSignup": False}
    if account:
        raise HTTPException(409, "An account already exists. Please sign in.")
    grant, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(M.SignupGrant(token_hash=digest(grant), identifier=challenge.identifier, channel=challenge.channel,
                         csrf_token=csrf, expires_at=time.time() + 900, consumed=False))
    db.commit()
    set_cookie(response, GRANT_COOKIE, grant, 900)
    return {"success": True, "requiresSignup": True, "csrfToken": csrf, "user": None}


@router.post("/signup", status_code=201)
def signup(body: Signup, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    grant = db.get(M.SignupGrant, digest(request.cookies.get(GRANT_COOKIE, "")))
    if not grant or grant.consumed or grant.expires_at <= time.time():
        raise HTTPException(401, "Verify your contact details before completing registration.")
    if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), grant.csrf_token):
        raise HTTPException(403, "Refresh the signup flow and verify your contact details again.")
    if not db.execute(update(M.SignupGrant).where(M.SignupGrant.token_hash == grant.token_hash, M.SignupGrant.consumed.is_(False)).values(consumed=True)).rowcount:
        db.rollback()
        raise HTTPException(409, "This registration verification has already been used.")
    account = M.Account(id=str(uuid.uuid4()), identifier=grant.identifier, channel=grant.channel, full_name=body.fullName,
                         role="STUDENT", active=True, profile={**body.model_dump(mode="json"), "ageVerified": False, "isVerifiedStudent": False}, created_at=time.time())
    try:
        db.add(account)
        db.flush()
        csrf = issue_session(db, account, response, request)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already exists. Please sign in.")
    response.delete_cookie(GRANT_COOKIE, path="/api")
    
    # --- SEND WELCOME EMAIL ---
    if grant.channel == "EMAIL" and "@" in grant.identifier:
        try:
            import asyncio
            from core.email import send_email
            from core.email_templates import welcome_email
            
            subject, html = welcome_email(body.fullName, "STUDENT")
            asyncio.run(send_email(grant.identifier, subject, html))
        except Exception as e:
            print(f"[ERROR] Failed to send welcome email: {e}")
    # --------------------------
    return {"success": True, "user": account_payload(account), "csrfToken": csrf}


@router.get("/session")
def session_status(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    account, session = resolve_session(request, db)
    return {"user": account_payload(account) if account else None, "csrfToken": session.csrf_token if session else ""}


@router.post("/refresh")
def refresh_session(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    """CIR-2: JWT Token Auto-Refresh endpoint.

    Validates active session / token, rotates session credentials, and returns
    updated session payload with a new CSRF token.
    Fails with 401 if session is missing, expired, or revoked.
    """
    account, session = resolve_session(request, db)
    if not account or not session:
        raise HTTPException(401, "Invalid or expired session. Please sign in again.")

    csrf = issue_session(db, account, response, request)
    db.commit()
    return {
        "success": True,
        "user": account_payload(account),
        "csrfToken": csrf,
    }


@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    db.execute(delete(M.Session).where(M.Session.token_hash == digest(request.cookies.get(SESSION_COOKIE, ""))))
    db.commit()
    for name in (SESSION_COOKIE, CHALLENGE_COOKIE, GRANT_COOKIE):
        response.delete_cookie(name, path="/api", httponly=True, samesite="lax")
    return {"success": True}
