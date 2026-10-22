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
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.app_env import is_dev_or_test, is_production, is_testing
from core.settings_registry import setting
from core.team_scope import RESERVED_CAMPUS_MESSAGE, is_reserved_campus
from services import clinical_profile, twofa_store
from services.contact_store import (
    account_for_sign_in,
    account_holding,
    save_contact,
    verified_contact,
)
from services.db_sql import SessionLocal
from services.demo_seed import is_demo_identifier
from services.email_deliverability import check_email_deliverable
from services.integration_config import INTEGRATIONS_DB
from services.otp_delivery import available_channels, dispatch_otp

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
SESSION_COOKIE = "sacare_session"
CHALLENGE_COOKIE = "sacare_challenge"
GRANT_COOKIE = "sacare_signup"
SESSION_SECONDS = 60 * 60 * 12
_otp_secret = os.getenv("OTP_HASH_SECRET") or os.getenv("JWT_SECRET")
# Only an explicit development/test environment may run on a per-process
# secret. An unset or misspelt APP_ENV is production: refuse to start rather
# than hash codes differently on every worker.
if not _otp_secret and not is_dev_or_test():
    raise RuntimeError("Set OTP_HASH_SECRET before starting the service.")
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
    # Only an explicit development/test environment trusts a local origin, and
    # only by exact hostname: a substring match let https://localhost.evil.example
    # through. Unset APP_ENV is production here as everywhere else.
    if is_dev_or_test():
        host = urlsplit(origin).hostname or ""
        if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:  # noqa: S104 — compares an Origin header, binds nothing, never in production
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
                        secure=is_production(), samesite="lax")


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


PARTNER_KINDS = ("PHARMACY", "LAB", "CLINIC", "WELLNESS")


def partner_kind_of(account: M.Account) -> str:
    """The partner type a super admin assigned, or "" — never a guess, never for other roles."""
    kind = account.partner_kind or ""
    return kind if account.role == "VENDOR" and kind in PARTNER_KINDS else ""


def account_payload(account: M.Account) -> dict:
    profile = account.profile or {}
    return {"id": account.id, "fullName": account.full_name, "role": account.role,
            "partnerKind": partner_kind_of(account),
            # A shared team account (services/team_accounts.py): the consoles show a
            # "Team account" badge, and core/team_scope.team_sandboxed reads it.
            "isTeamAccount": account.is_team_account is True,
            "email": account.identifier if account.channel == "EMAIL" else "",
            "phone": account.identifier if account.channel == "WHATSAPP" else "",
            "dob": profile.get("dob", ""), "university": profile.get("university", ""),
            "rollNumber": profile.get("rollNumber", ""),
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


TWO_FACTOR_SETUP_REQUIRED = "TWO_FACTOR_SETUP_REQUIRED"
# Counsellors are here because the crisis queue shows students' names and contacts.
_FAIL_CLOSED_ENFORCED_ROLES = frozenset({"SUPER_ADMIN", "COUNSELLOR"})


def two_factor_enforced_roles() -> frozenset[str]:
    """The roles that must have two-step sign-in on before they can do anything.

    Fail closed: a policy that is missing or not a list of role names is read
    as "SUPER_ADMIN and COUNSELLOR must have it", never as "nobody must".
    """
    try:
        raw = INTEGRATIONS_DB["twofa"]["enforced_roles"]
    except (KeyError, TypeError):
        return _FAIL_CLOSED_ENFORCED_ROLES
    if isinstance(raw, str):
        raw = raw.split(",")
    if not isinstance(raw, (list, tuple)) or not all(isinstance(role, str) for role in raw):
        return _FAIL_CLOSED_ENFORCED_ROLES
    return frozenset(role.strip().upper() for role in raw if role.strip())


def two_factor_setup_required(db: DBSession, account: M.Account) -> bool:
    """True while an account whose role must use 2FA has not turned it on."""
    return account.role in two_factor_enforced_roles() and not twofa_store.is_enabled(db, account.id)


def session_payload(db: DBSession, account: M.Account) -> dict:
    """The signed-in user, plus whether the session is held to 2FA set-up.

    bloodGroup is the account's own, read from the clinical plane
    (services/clinical_profile.py) so the session shape the apps read is unchanged.
    It is not in account_payload: that is the identity every handler receives.
    """
    return {**account_payload(account), "bloodGroup": clinical_profile.blood_group(db, account.id),
            # Both verified contacts, not only the sign-in ID (services/contact_store.py).
            "email": verified_contact(db, account, "EMAIL"), "phone": verified_contact(db, account, "WHATSAPP"),
            "twoFactorSetupRequired": two_factor_setup_required(db, account)}


def _signed_in(request: Request, db: DBSession) -> M.Account:
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
    return account


def deny_until_two_factor(db: DBSession, account: M.Account) -> None:
    if two_factor_setup_required(db, account):
        raise HTTPException(403, {"code": TWO_FACTOR_SETUP_REQUIRED,
                                  "message": "Your role needs two-step sign-in. Turn it on to continue."})


def two_factor_setup_user(request: Request, db: DBSession = Depends(workflow_db)) -> dict:
    """Signed in, even while 2FA set-up is still owed.

    Only the endpoints a held session needs may use this: 2FA status, setup and
    enable, and sign-out. Everything else goes through authenticated_user.
    """
    return account_payload(_signed_in(request, db))


def authenticated_user(request: Request, db: DBSession = Depends(workflow_db)) -> dict:
    account = _signed_in(request, db)
    # An account whose role must use 2FA and has not turned it on is held to
    # the set-up endpoints: every other route refuses (fail closed).
    deny_until_two_factor(db, account)
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


# Who may open the crisis follow-up queue. It carries a student's name and a way
# to reach them, so it is deliberately not every campus administrator: only a
# counsellor (scoped to their own campus) and the super admin. Least privilege
# (P48): a counsellor is not "staff" for any other gate, so require_staff and
# require_campus_admin both still refuse them.
CRISIS_FOLLOW_UP_ROLES = frozenset({"SUPER_ADMIN", "COUNSELLOR"})


def require_crisis_follow_up(user: dict = Depends(authenticated_user)) -> dict:
    if user["role"] not in CRISIS_FOLLOW_UP_ROLES:
        raise HTTPException(403, "Crisis follow-up is limited to campus counsellors.")
    return user


def require_clinician(user: dict = Depends(authenticated_user)) -> dict:
    """Beside the other role gates, so there is one of it rather than one per module.

    It lived in preventive_care, which left the next caller elsewhere to either
    import across service modules or write a second copy — and two copies of a
    role gate drift, the way registration and profile edits drifted apart over
    the age check.
    """
    if user["role"] != "NMC_DOCTOR":
        raise HTTPException(403, "Clinician access is required.")
    return user


def issue_session(db: DBSession, account: M.Account, response: Response, request: Request, *,
                  code_verified_at: float = 0.0):
    """A new session cookie. ``code_verified_at``: when this sign-in was proven with a one-time code (0 if not)."""
    old = request.cookies.get(SESSION_COOKIE)
    if old:
        db.execute(delete(M.Session).where(M.Session.token_hash == digest(old)))
    raw, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(M.Session(token_hash=digest(raw), account_id=account.id, csrf_token=csrf, expires_at=time.time() + SESSION_SECONDS,
                     code_verified_at=code_verified_at))
    set_cookie(response, SESSION_COOKIE, raw, SESSION_SECONDS)
    return csrf


def dev_console_delivery_enabled() -> bool:
    """Explicit opt-in for reading OTP codes from server logs.

    Codes print to logs only when APP_ENV is explicitly development or testing
    AND DEV_OTP_CONSOLE is explicitly "true" (off by default). An unset or
    unknown APP_ENV is treated as production: a deploy that forgot APP_ENV must
    not log sign-in codes.
    """
    if not is_dev_or_test():
        return False
    return os.getenv("DEV_OTP_CONSOLE", "false").strip().lower() == "true"


def deliver_code(identifier: str, code: str, channel: str) -> bool:
    result = dispatch_otp(identifier, code, channel)
    if result.get("delivered") is True:
        return True
    # Log why delivery failed
    reason = result.get("reason", "unknown")
    # The identifier is a phone number or email: never written to logs (guardrail 9).
    print(f"[OTP] dispatch failed via {channel}: {reason}", flush=True)
    if dev_console_delivery_enabled():
        print(f"[DEV OTP] verification code for {mask_identifier(identifier, channel)} via {channel}: {code}", flush=True)
        return True
    return False


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OtpSend(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    channel: Literal["EMAIL", "WHATSAPP"]
    intent: Literal["LOGIN", "SIGNUP"]
    fallbackEmail: str | None = Field(default=None, max_length=254)
    # The staff sign-in page (AdminSignIn) asks for STAFF: a code is then sent
    # only to an active account whose role is not STUDENT, by email only.
    audience: Literal["STUDENT", "STAFF"] = "STUDENT"


class OtpVerify(StrictModel):
    otp: str = Field(pattern=r"^\d{6}$")


MINIMUM_AGE = 18
MAXIMUM_AGE = 120


def age_in_years(dob: date, today: date | None = None) -> int:
    """Completed years between dob and today. Negative for a date in the future."""
    today = today or date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def adult_birth_date(value: date, today: date | None = None) -> date:
    """Guardrail 8 — 18+ only. Every path that can set a birth date runs this,
    not just registration: a profile edit that reopens the question has to
    answer it the same way, or the signup gate is decorative."""
    if not MINIMUM_AGE <= age_in_years(value, today) <= MAXIMUM_AGE:
        raise ValueError("Studentkare is available to adults aged 18 and over.")
    return value


# The signup consent wording, versioned. Change the copy (EN/TE/HI,
# "member.consent.*" in src/i18n/areas/member.ts) → change this version, so
# every record says exactly which wording was agreed to.
SIGNUP_CONSENT_VERSION = "signup-2026-10-16b"
# The three purposes an account cannot exist without. Each is ticked by the
# student, never pre-ticked.
SIGNUP_REQUIRED_PURPOSES = ("RECORDS_STORAGE", "CAMPUS_ENROLMENT", "ADULT_18_PLUS")


class SignupConsent(StrictModel):
    version: str = Field(max_length=40)
    purposes: list[str] = Field(max_length=10)
    language: Literal["en", "te", "hi"] = "en"

    @field_validator("version")
    @classmethod
    def current_version(cls, value: str) -> str:
        if value != SIGNUP_CONSENT_VERSION:
            raise ValueError("The consent wording has changed. Reload and read it again.")
        return value

    @field_validator("purposes")
    @classmethod
    def all_required(cls, value: list[str]) -> list[str]:
        missing = [p for p in SIGNUP_REQUIRED_PURPOSES if p not in value]
        if missing:
            raise ValueError("Agree to each required item to create an account.")
        return sorted(set(value) & set(SIGNUP_REQUIRED_PURPOSES))


# Longest invite code input accepted: a code is 8 characters (services/rewards.py),
# with room for the spaces or dashes someone types between them. An input bound.
REFERRAL_CODE_INPUT_MAX_LENGTH = 32


class Signup(StrictModel):
    fullName: str = Field(min_length=2, max_length=120)
    dob: date
    university: str = Field(min_length=2, max_length=160)
    rollNumber: str = Field(min_length=1, max_length=80)
    bloodGroup: Literal["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] = ""
    # A friend's invite code (from the ?ref= link). Optional; an unknown code
    # never blocks registration, it just isn't applied (services/rewards.py).
    referralCode: str | None = Field(default=None, max_length=REFERRAL_CODE_INPUT_MAX_LENGTH)

    @field_validator("dob")
    @classmethod
    def check_age(cls, value):
        return adult_birth_date(value)

    @field_validator("university")
    @classmethod
    def not_the_team_campus(cls, value: str) -> str:
        # The team test campus holds no real student (core/team_scope.py).
        if is_reserved_campus(value):
            raise ValueError(RESERVED_CAMPUS_MESSAGE)
        return value

    # Required: no consent, no account (fail closed). Validated before the
    # signup grant is spent, so a refusal doesn't burn the verification.
    consent: SignupConsent
    # Required (plan tier1-auth-password-2026-10-22, D-3). Checked for strength
    # before the grant is spent, like consent. Never logged or sent back.
    password: str = Field(min_length=1, max_length=128)


@router.get("/consent")
def signup_consent_terms():
    """The consent version and required purposes the signup screen must show."""
    return {"version": SIGNUP_CONSENT_VERSION, "required": list(SIGNUP_REQUIRED_PURPOSES)}


@router.get("/options")
def auth_options(db: DBSession = Depends(workflow_db)):
    """The channels a code can be sent on right now. WhatsApp only while its session is connected."""
    return {"channels": available_channels(db)}


CHANNEL_UNAVAILABLE = "CHANNEL_UNAVAILABLE"
CHANNEL_UNAVAILABLE_MESSAGE = "We couldn't send your code that way just now. Try another way, or try again in a few minutes."


def channel_unavailable(channel: str, db: DBSession) -> HTTPException:
    """503 the screens can act on: which channel failed and what still works (never the identifier)."""
    remaining = [c for c in available_channels(db) if c != channel]
    return HTTPException(503, {"code": CHANNEL_UNAVAILABLE, "channel": channel, "channels": remaining,
                               "message": CHANNEL_UNAVAILABLE_MESSAGE})


SECOND_CONTACT_REQUIRED = "SECOND_CONTACT_REQUIRED"
STAFF_NOT_FOUND = "No staff account uses this email. Staff accounts are created by an administrator."


@router.post("/otp/send")
def send_otp(body: OtpSend, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    identifier = normalize_identifier(body.identifier, body.channel)
    if body.audience == "STAFF" and (body.intent != "LOGIN" or body.channel != "EMAIL"):
        raise HTTPException(422, "Staff sign in with a work email.")
    if body.intent == "LOGIN":
        # Only a verified contact gets a sign-in code (services/contact_store.py).
        account = account_for_sign_in(db, identifier, body.channel)
        if body.audience == "STAFF" and (not account or account.role == "STUDENT"):
            # One answer for "no account" and "a student account": the staff page
            # never tells anyone which emails belong to students.
            raise HTTPException(404, STAFF_NOT_FOUND)
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
    # The fixed demo code needs both demo accounts and the console opt-in; with
    # either off, a demo identifier gets a random code like anyone else.
    is_demo_account = is_demo_identifier(identifier) and dev_console_delivery_enabled()
    code = "123456" if is_demo_account else f"{secrets.randbelow(900000) + 100000}"
    delivered = True if is_demo_account else deliver_code(identifier, code, body.channel)
    fallback_sent, fallback_channel, fallback_masked = False, None, None
    if not delivered and body.channel == "WHATSAPP":
        # Auto-fallback: WhatsApp failed → same code via Postal/SMTP email ONLY to an
        # already-verified recovery contact stored on the account. Never to a
        # client-supplied email that we cannot prove belongs to this account.
        fallback = None
        account = account_for_sign_in(db, identifier, body.channel)
        if account:
            fallback = (account.profile or {}).get("recovery_email", "").strip() or None
        if fallback and "@" in fallback:
            from services.otp_delivery import mask_email, send_email_code
            if send_email_code(fallback, code).get("status") == "sent":
                delivered = True
                fallback_sent, fallback_channel = True, "EMAIL"
                fallback_masked = mask_email(fallback)
    if not delivered:
        raise channel_unavailable(body.channel, db)
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
    masked = mask_identifier(identifier, body.channel)
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
    if client_ip != "testclient" and not is_testing():
        limit(db, f"verify_ip:{client_ip}", 20, 900)
    token = request.cookies.get(CHALLENGE_COOKIE, "")
    key = digest(token)
    challenge = db.get(M.OtpChallenge, key)
    if challenge:
        limit(db, f"verify:{challenge.identifier}", 5, 300)
    changed = db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key,
        M.OtpChallenge.consumed.is_(False), M.OtpChallenge.expires_at > time.time(), M.OtpChallenge.attempts < 5)
        .values(attempts=M.OtpChallenge.attempts + 1)).rowcount
    is_demo_id = bool(challenge) and is_demo_identifier(challenge.identifier)
    is_dev_master = dev_console_delivery_enabled() and is_demo_id and body.otp == "123456"
    if not changed or not challenge or (not is_dev_master and not hmac.compare_digest(challenge.code_hash, code_digest(token, body.otp))):
        raise HTTPException(401, "Invalid or expired verification code. Request a new code if needed.")
    if not db.execute(update(M.OtpChallenge).where(M.OtpChallenge.token_hash == key, M.OtpChallenge.consumed.is_(False)).values(consumed=True)).rowcount:
        db.rollback()
        raise HTTPException(401, "This code has already been used.")
    db.commit()
    response.delete_cookie(CHALLENGE_COOKIE, path="/api")
    if challenge.intent not in ("LOGIN", "SIGNUP"):
        # A contact-verification code (services/account_contacts.py) is never a sign-in or a sign-up.
        raise HTTPException(401, "Invalid or expired verification code. Request a new code if needed.")
    if challenge.intent == "LOGIN":
        account = account_for_sign_in(db, challenge.identifier, challenge.channel)
        if not account or not account.active:
            raise HTTPException(404, "No active account was found. Create an account to continue.")
        if twofa_store.is_enabled(db, account.id):
            temp = twofa_store.create_pending(db, account.id, first_factor="CODE")
            db.commit()
            return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}
        csrf = issue_session(db, account, response, request, code_verified_at=time.time())
        remember_device(db, account, request, response)
        db.commit()
        return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}
    if account_holding(db, challenge.identifier) is not None:
        # Any account using this address, verified or not: never a second account on it.
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
    # Both refusals below come before the grant is spent, so the student can fix them and go on.
    from services.account_password import PasswordRefused, refusal, store_new_password
    from services.account_password import check_password as check_new_password
    min_length = setting("auth.password_min_length", db)
    draft = M.Account(id="", identifier=grant.identifier, channel=grant.channel, full_name=body.fullName,
                      profile={"dob": body.dob.isoformat()})
    try:
        check_new_password(body.password, min_length, draft)
    except PasswordRefused as error:
        raise refusal(error, min_length) from error
    other = "WHATSAPP" if grant.channel == "EMAIL" else "EMAIL"
    if other in available_channels(db) and not grant.second_verified_at:
        # D-2: both contacts are verified at sign-up, whenever the other channel can deliver a code.
        raise HTTPException(422, {"code": SECOND_CONTACT_REQUIRED, "channel": other,
                                  "message": "Verify your other contact with a code before creating your account."})
    if not db.execute(update(M.SignupGrant).where(M.SignupGrant.token_hash == grant.token_hash, M.SignupGrant.consumed.is_(False)).values(consumed=True)).rowcount:
        db.rollback()
        raise HTTPException(409, "This registration verification has already been used.")
    account = M.Account(id=str(uuid.uuid4()), identifier=grant.identifier, channel=grant.channel, full_name=body.fullName,
                         role="STUDENT", active=True, profile={**body.model_dump(mode="json", exclude={"consent", "referralCode", "bloodGroup"}), "ageVerified": False, "isVerifiedStudent": False}, created_at=time.time())
    try:
        db.add(account)
        db.flush()
        # The contact it signed up with was just proven by the code, and so was the other one if given.
        save_contact(db, account.id, grant.channel, grant.identifier, verified=True)
        if grant.second_verified_at and grant.second_identifier:
            save_contact(db, account.id, grant.second_channel, grant.second_identifier, verified=True)
        store_new_password(db, account, body.password)
        # Blood group is clinical: it goes to care_clinical_profiles, never the identity row.
        if body.bloodGroup:
            clinical_profile.write(db, account.id, {"bloodGroup": body.bloodGroup})
        # Same transaction as the account: there is never an account without its consent record.
        db.add(M.ConsentRecord(id=str(uuid.uuid4()), account_id=account.id, version=body.consent.version,
                               purposes=body.consent.purposes, language=body.consent.language, recorded_at=time.time()))
        referral_applied = False
        if body.referralCode:
            from services.rewards import attach_referral
            referral_applied = attach_referral(db, account, body.referralCode)
        csrf = issue_session(db, account, response, request, code_verified_at=time.time())
        remember_device(db, account, request, response)
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
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "referralApplied": referral_applied}


@router.get("/consents")
def my_consents(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    """What you agreed to, which wording, and when."""
    response.headers["Cache-Control"] = "no-store"
    account, _session = resolve_session(request, db)
    if not account:
        raise HTTPException(401, "Sign in to continue.")
    deny_until_two_factor(db, account)
    rows = db.scalars(select(M.ConsentRecord).where(M.ConsentRecord.account_id == account.id)
                      .order_by(M.ConsentRecord.recorded_at.desc())).all()
    return {"items": [{"version": r.version, "purposes": r.purposes, "language": r.language,
                       "recordedAt": r.recorded_at, "withdrawnAt": r.withdrawn_at or None} for r in rows]}


@router.get("/session")
def session_status(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    account, session = resolve_session(request, db)
    return {"user": session_payload(db, account) if account else None, "csrfToken": session.csrf_token if session else ""}


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

    # A refresh keeps how the sign-in was proven; it never makes a passcode sign-in code-proven.
    csrf = issue_session(db, account, response, request, code_verified_at=session.code_verified_at or 0.0)
    db.commit()
    return {
        "success": True,
        "user": session_payload(db, account),
        "csrfToken": csrf,
    }


@router.post("/sessions/revoke-others")
def revoke_other_sessions(request: Request, user=Depends(authenticated_user), db: DBSession = Depends(workflow_db)):
    """Lost phone: sign out every session except this one, and cancel the check-in pass.

    The pass (digital ID) is signed with a per-account secret; removing it makes
    the QR on the lost phone stop verifying. The student re-issues it from this
    device. Only what actually happened is reported back.
    """
    current = digest(request.cookies.get(SESSION_COOKIE, ""))
    revoked = db.execute(delete(M.Session).where(M.Session.account_id == user["id"], M.Session.token_hash != current)).rowcount
    # Every other device forgets the account too, so a passcode stops working there
    # (it needs a device that has signed in before) and no "Continue as" is offered.
    this_device = digest(request.cookies.get(REMEMBER_COOKIE, ""))
    db.execute(delete(M.RememberedDevice).where(M.RememberedDevice.account_id == user["id"],
                                                M.RememberedDevice.token_hash != this_device))
    account = db.scalar(select(M.Account).where(M.Account.id == user["id"]).with_for_update().execution_options(populate_existing=True))
    pass_cancelled = False
    if account is not None:
        profile = dict(account.profile or {})
        pass_cancelled = profile.pop("digitalIdSecret", None) is not None
        profile.pop("digitalIdIssuedAt", None)
        account.profile = profile
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action="SESSIONS_REVOKED_OTHERS",
                           resource_id=user["id"], created_at=time.time()))
    db.commit()
    return {"sessionsRevoked": revoked, "passCancelled": pass_cancelled}


REMEMBER_COOKIE = "sacare_remember"
REMEMBER_SECONDS = 60 * 60 * 24 * 30


def mask_identifier(identifier: str, channel: str) -> str:
    return f"{identifier[0]}•••@{identifier.split('@')[1]}" if channel == "EMAIL" else f"+91 ••••••{identifier[-4:]}"


def remembered_account(request: Request, db: DBSession):
    """The device row and its active account, or (None, None). Never a session."""
    raw = request.cookies.get(REMEMBER_COOKIE, "")
    if not raw:
        return None, None
    device = db.get(M.RememberedDevice, digest(raw))
    if not device or device.expires_at <= time.time():
        return None, None
    account = db.get(M.Account, device.account_id)
    if not account or not account.active:
        return None, None
    return device, account


def remember_device(db: DBSession, account: M.Account, request: Request, response: Response) -> None:
    """After a student signs in, this device remembers the account (founder decision 2026-10-22).

    The browser or phone keeps only an opaque HttpOnly token; the identifier is
    never written where page scripts can read it (guardrail 9). The screen shows it
    masked. Another account signing in on the device replaces it (a fresh token);
    staff accounts are not remembered. "Forget this device" and a sign-out without
    "remember me" clear it.
    """
    if account.role != "STUDENT":
        return
    now = time.time()
    raw = request.cookies.get(REMEMBER_COOKIE, "")
    row = db.get(M.RememberedDevice, digest(raw)) if raw else None
    if row is not None and row.account_id == account.id and row.expires_at > now:
        row.expires_at = now + REMEMBER_SECONDS
    else:
        if row is not None:
            db.delete(row)
        raw = secrets.token_urlsafe(32)
        db.add(M.RememberedDevice(token_hash=digest(raw), account_id=account.id, last_route="",
                                  expires_at=now + REMEMBER_SECONDS))
    set_cookie(response, REMEMBER_COOKIE, raw, REMEMBER_SECONDS)


def forget_device(request: Request, response: Response, db: DBSession):
    raw = request.cookies.get(REMEMBER_COOKIE, "")
    if raw:
        db.execute(delete(M.RememberedDevice).where(M.RememberedDevice.token_hash == digest(raw)))
    response.delete_cookie(REMEMBER_COOKIE, path="/api", httponly=True, samesite="lax")


class Logout(StrictModel):
    remember: bool = False
    # A route name, never a URL: the client checks it against the signed-in role before using it.
    lastRoute: str = Field(default="", max_length=60, pattern=r"^([a-z0-9][a-z0-9/-]*)?$")


@router.post("/logout")
def logout(request: Request, response: Response, body: Logout | None = None, user=Depends(two_factor_setup_user), db: DBSession = Depends(workflow_db)):
    db.execute(delete(M.Session).where(M.Session.token_hash == digest(request.cookies.get(SESSION_COOKIE, ""))))
    # Every sign-out is a fresh choice: an earlier "remember me" never outlives a later "no".
    forget_device(request, response, db)
    db.execute(delete(M.RememberedDevice).where(M.RememberedDevice.expires_at <= time.time()))
    if body and body.remember:
        raw = secrets.token_urlsafe(32)
        db.add(M.RememberedDevice(token_hash=digest(raw), account_id=user["id"], last_route=body.lastRoute,
                                  expires_at=time.time() + REMEMBER_SECONDS))
        set_cookie(response, REMEMBER_COOKIE, raw, REMEMBER_SECONDS)
    db.commit()
    for name in (SESSION_COOKIE, CHALLENGE_COOKIE, GRANT_COOKIE):
        response.delete_cookie(name, path="/api", httponly=True, samesite="lax")
    return {"success": True}


@router.get("/remembered")
def remembered(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    device, account = remembered_account(request, db)
    if not device or not account:
        if request.cookies.get(REMEMBER_COOKIE):
            forget_device(request, response, db)
            db.commit()
        return {"remembered": False}
    from services.student_passcode import passcode_offered
    return {"remembered": True, "targetMasked": mask_identifier(account.identifier, account.channel),
            "channel": account.channel, "lastRoute": device.last_route,
            # Only to the device that already holds this account: whether "Use my passcode" applies.
            "passcode": passcode_offered(db, account)}


@router.post("/remembered/send")
def remembered_send(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    """Starts a normal LOGIN challenge for the remembered account. The code is still required."""
    check_origin(request)
    device, account = remembered_account(request, db)
    if not device or not account:
        forget_device(request, response, db)
        db.commit()
        raise HTTPException(404, "This device no longer remembers an account. Sign in with your email or number.")
    return send_otp(OtpSend(identifier=account.identifier, channel=account.channel, intent="LOGIN"), request, response, db)


@router.post("/remembered/forget")
def remembered_forget(request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    forget_device(request, response, db)
    db.commit()
    return {"success": True}
