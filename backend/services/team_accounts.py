"""Team accounts: one shared account per role, signed in with an ID and a PIN.

Founder decision 2026-10-22: so the team can open every dashboard on the live
site now, there is one fixed account per role, each with its own random 6-digit
PIN shown once. They are shared accounts and are replaced by individual logins
later (docs/guides/team-accounts.md).

What keeps them safe enough to exist:

* **Only a salted, peppered scrypt hash is stored** (``care_staff_pin_credentials``,
  platform plane). The pepper is the server's OTP_HASH_SECRET, so a copy of the
  table alone is not enough to try the million possible PINs offline.
* **Online guessing is what a PIN has to survive.** Every wrong PIN counts; after
  ``auth.staff_pin_max_attempts`` the account locks for
  ``auth.staff_pin_lockout_minutes``. Each network address and each ID is also
  rate limited, whoever is asking.
* **One answer for everything that fails**: an unknown ID, a student's address, a
  disabled or locked account and a wrong PIN all get the same 401 and message,
  and an unknown ID still runs a hash so the timing says nothing either.
* **Every attempt is audited** (success, failure, lockout, rotate, unlock,
  disable), never with the PIN.
* **No new kind of session**: success issues the normal session for the role. A
  role that must use two-step sign-in still does: an account with an
  authenticator gets the authenticator step, and one without is held to setting
  it up (``deny_until_two_factor``), as after an emailed code.
* **Never a student**: only accounts the team-accounts command created
  (``is_team_account``) with a staff role can hold a PIN.
* **Scoped away from real students** (core/team_scope.py). The super admin is a
  real super admin, platform-wide by nature.
* **Master switch** ``auth.staff_pin_login_enabled``: off, PIN sign-in is refused
  here and hidden on the page.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
import uuid
from dataclasses import dataclass
from itertools import pairwise

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.settings_registry import setting
from core.team_scope import TEAM_CAMPUS, TEAM_PARTNER_ORG
from services import twofa_store
from services.contact_store import save_contact
from services.integration_config import app_domain
from services.workflow_auth import (
    SESSION_COOKIE,
    StrictModel,
    _otp_secret,
    check_origin,
    digest,
    issue_session,
    limit,
    partner_kind_of,
    require_super_admin,
    session_payload,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Team accounts"])

# --- the accounts -------------------------------------------------------------


@dataclass(frozen=True)
class TeamAccountSpec:
    """One team account. ``local_part`` + the app domain is its sign-in ID."""
    local_part: str
    role: str
    partner_kind: str
    full_name: str

    @property
    def account_id(self) -> str:
        return f"team-{self.local_part}"

    @property
    def identifier(self) -> str:
        return f"{self.local_part}@{app_domain()}".lower()

    @property
    def profile(self) -> dict:
        if self.role in ("CAMPUS_ADMIN", "COUNSELLOR"):
            return {"university": TEAM_CAMPUS}
        if self.role == "VENDOR":
            return {"organisation": TEAM_PARTNER_ORG}
        return {}


# The names say what they are, so nobody mistakes one for a real person or business.
TEAM_ACCOUNTS: tuple[TeamAccountSpec, ...] = (
    TeamAccountSpec("superadmin", "SUPER_ADMIN", "", "StudentKare Team · Super admin"),
    TeamAccountSpec("campus", "CAMPUS_ADMIN", "", "StudentKare Team · Campus admin"),
    TeamAccountSpec("counsellor", "COUNSELLOR", "", "StudentKare Team · Counsellor"),
    TeamAccountSpec("doctor", "NMC_DOCTOR", "", "StudentKare Team · Doctor"),
    TeamAccountSpec("clinic", "VENDOR", "CLINIC", "StudentKare Team · Clinic"),
    TeamAccountSpec("pharmacy", "VENDOR", "PHARMACY", "StudentKare Team · Pharmacy"),
    TeamAccountSpec("lab", "VENDOR", "LAB", "StudentKare Team · Lab"),
    TeamAccountSpec("wellness", "VENDOR", "WELLNESS", "StudentKare Team · Wellness centre"),
)
TEAM_ROLES = frozenset(spec.role for spec in TEAM_ACCOUNTS)

# --- PINs ---------------------------------------------------------------------

PIN_LENGTH = 6
PIN_PATTERN = rf"^\d{{{PIN_LENGTH}}}$"
# A PIN with fewer different digits than this (000000, 121212, 112211) is weak.
MIN_DISTINCT_DIGITS = 3
DIGITS = 10
# The step between neighbouring digits, mod 10, in a run up (1234…, 8901…) or down (9876…).
RUN_UP = {1}
RUN_DOWN = {DIGITS - 1}
# scrypt cost: 2**15 x 8 x 1 is 32 MiB and a few tens of milliseconds per check.
# Stored with each hash, so raising them later only affects new and rotated PINs.
SCRYPT_N = 2 ** 15
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
SCRYPT_MAXMEM = 64 * 1024 * 1024
SALT_BYTES = 16
HASH_SCHEME = "scrypt"
HASH_FIELDS = 6


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _peppered(pin: str) -> bytes:
    """The PIN keyed with the server secret, so the stored hash alone can't be brute-forced."""
    return hmac.new(_otp_secret.encode(), pin.encode(), hashlib.sha256).digest()


def _scrypt(pin: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(_peppered(pin), salt=salt, n=n, r=r, p=p, dklen=SCRYPT_DKLEN, maxmem=SCRYPT_MAXMEM)


def hash_pin(pin: str) -> str:
    """``scrypt$n$r$p$salt$hash``, base64. A fresh salt every time."""
    salt = secrets.token_bytes(SALT_BYTES)
    derived = _scrypt(pin, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    return "$".join((HASH_SCHEME, str(SCRYPT_N), str(SCRYPT_R), str(SCRYPT_P), _b64(salt), _b64(derived)))


def verify_pin(pin: str, stored: str) -> bool:
    """Constant-time check of a PIN against a stored hash. Anything malformed is a no (fail closed)."""
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != HASH_SCHEME:
            return False
        derived = _scrypt(pin, base64.b64decode(salt), int(n), int(r), int(p))
        return hmac.compare_digest(derived, base64.b64decode(expected))
    except (ValueError, TypeError):
        return False


def is_weak_pin(pin: str) -> bool:
    """Too few different digits, a run up or down (123456, 987654, 901234), or a repeated half/third."""
    if len(set(pin)) < MIN_DISTINCT_DIGITS:
        return True
    steps = {(int(b) - int(a)) % DIGITS for a, b in pairwise(pin)}
    if steps in (RUN_UP, RUN_DOWN):
        return True
    half, third = len(pin) // 2, len(pin) // 3
    return pin == pin[:half] * 2 or pin == pin[:third] * 3


def generate_pin() -> str:
    """A cryptographically random PIN that is not one of the weak shapes."""
    while True:
        pin = f"{secrets.randbelow(DIGITS ** PIN_LENGTH):0{PIN_LENGTH}d}"
        if not is_weak_pin(pin):
            return pin


_dummy_hash: str | None = None


def _burn_hash_time(pin: str) -> None:
    """Runs one full check for an ID with no PIN, so its answer takes as long as a real one."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_pin(generate_pin())
    verify_pin(pin, _dummy_hash)


# --- audit --------------------------------------------------------------------

CLI_ACTOR = "cli:team_accounts"
ANONYMOUS_ACTOR = "anonymous"


def audit(db: DBSession, actor_id: str, action: str, resource_id: str) -> None:
    """One audit row. Never a PIN; for an unknown ID only a short digest of what was typed."""
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=time.time()))


def _typed_id_digest(identifier: str) -> str:
    return f"id:{digest(identifier)[:16]}"


# --- creating, rotating, disabling (shared by the command and the screen) -----


@dataclass(frozen=True)
class CreateResult:
    identifier: str
    role: str
    partner_kind: str
    pin: str | None      # set only when a PIN was made now
    note: str            # "created", "pin-added", "exists", "skipped: …"


def team_account(db: DBSession, key: str) -> M.Account | None:
    """A team account by account id, sign-in ID or local part (``campus``). Never a non-team account."""
    key = key.strip().lower()
    candidates = {key, f"team-{key}", f"{key}@{app_domain()}".lower()}
    rows = db.scalars(select(M.Account).where(
        (M.Account.id.in_(candidates)) | (M.Account.identifier.in_(candidates)))).all()
    return next((row for row in rows if row.is_team_account), None)


def _set_pin(db: DBSession, account: M.Account, now: float) -> str:
    pin = generate_pin()
    credential = db.get(M.StaffPinCredential, account.id)
    if credential is None:
        db.add(M.StaffPinCredential(account_id=account.id, pin_hash=hash_pin(pin), failed_attempts=0,
                                    locked_until=0.0, created_at=now, rotated_at=0.0, last_sign_in_at=0.0))
    else:
        credential.pin_hash = hash_pin(pin)
        credential.failed_attempts = 0
        credential.locked_until = 0.0
        credential.rotated_at = now
    return pin


def create_missing(db: DBSession, actor_id: str = CLI_ACTOR) -> list[CreateResult]:
    """Creates every team account that does not exist yet, each with a new PIN.

    Idempotent: an existing team account keeps its PIN and none is printed
    (rotate it to get a new one). An address already used by a real account is
    left alone, never taken over.
    """
    now = time.time()
    results: list[CreateResult] = []
    for spec in TEAM_ACCOUNTS:
        account = db.scalar(select(M.Account).where(M.Account.identifier == spec.identifier))
        if account is None and db.get(M.Account, spec.account_id) is not None:
            results.append(CreateResult(spec.identifier, spec.role, spec.partner_kind, None,
                                        f"skipped: account id {spec.account_id} is already used by another address"))
            continue
        if account is not None and not account.is_team_account:
            results.append(CreateResult(spec.identifier, spec.role, spec.partner_kind, None,
                                        "skipped: a real account already uses this address"))
            continue
        if account is None:
            account = M.Account(id=spec.account_id, identifier=spec.identifier, channel="EMAIL",
                                full_name=spec.full_name, role=spec.role, active=True, profile=spec.profile,
                                created_at=now, partner_kind=spec.partner_kind, is_team_account=True)
            db.add(account)
            db.flush()
            save_contact(db, account.id, "EMAIL", spec.identifier, verified=True)
            pin = _set_pin(db, account, now)
            audit(db, actor_id, "TEAM_ACCOUNT_CREATED", account.id)
            results.append(CreateResult(spec.identifier, spec.role, spec.partner_kind, pin, "created"))
            continue
        if db.get(M.StaffPinCredential, account.id) is None:
            pin = _set_pin(db, account, now)
            audit(db, actor_id, "TEAM_ACCOUNT_PIN_SET", account.id)
            results.append(CreateResult(spec.identifier, spec.role, spec.partner_kind, pin, "pin-added"))
            continue
        results.append(CreateResult(spec.identifier, spec.role, spec.partner_kind, None, "exists"))
    db.commit()
    return results


def end_sessions(db: DBSession, account_id: str, keep_token_hash: str = "") -> int:
    statement = delete(M.Session).where(M.Session.account_id == account_id)
    if keep_token_hash:
        statement = statement.where(M.Session.token_hash != keep_token_hash)
    return db.execute(statement).rowcount or 0


def rotate(db: DBSession, account: M.Account, actor_id: str, keep_token_hash: str = "") -> str:
    """A new PIN (returned once), the lock cleared, every other session of the account ended.

    Rotating also turns a disabled team account back on: issuing a new PIN is the
    deliberate act of handing the account out again.
    """
    pin = _set_pin(db, account, time.time())
    account.active = True
    end_sessions(db, account.id, keep_token_hash)
    audit(db, actor_id, "TEAM_ACCOUNT_PIN_ROTATED", account.id)
    db.commit()
    return pin


def unlock(db: DBSession, account: M.Account, actor_id: str) -> None:
    """Clears the PIN lockout and the password lockout."""
    for credential in (db.get(M.StaffPinCredential, account.id), db.get(M.AccountPassword, account.id)):
        if credential is not None:
            credential.failed_attempts = 0
            credential.locked_until = 0.0
    audit(db, actor_id, "TEAM_ACCOUNT_UNLOCKED", account.id)
    db.commit()


def disable(db: DBSession, account: M.Account, actor_id: str) -> int:
    """Turns the account off and ends its sessions. Its PIN stops working at once."""
    account.active = False
    ended = end_sessions(db, account.id)
    audit(db, actor_id, "TEAM_ACCOUNT_DISABLED", account.id)
    db.commit()
    return ended


def is_locked(credential: M.StaffPinCredential | M.StudentPasscode | M.AccountPassword | None, now: float) -> bool:
    return credential is not None and credential.locked_until > now


# --- lockout (shared with the student passcode and passwords, services/student_passcode.py,
# services/account_password.py) ---


def clear_lock_if_run_out(credential: M.StaffPinCredential | M.StudentPasscode | M.AccountPassword) -> None:
    """A lock that has run out gives a fresh set of tries. Call only after ``is_locked`` said no."""
    if credential.locked_until:
        credential.failed_attempts, credential.locked_until = 0, 0.0


def count_wrong_attempt(db: DBSession, credential: M.StaffPinCredential | M.StudentPasscode | M.AccountPassword,
                        max_attempts: int, lockout_minutes: int, now: float) -> bool:
    """Adds one wrong try (atomically, so parallel guesses all count); locks at the limit. True when it locked now."""
    model = type(credential)
    db.execute(update(model).where(model.account_id == credential.account_id)
               .values(failed_attempts=model.failed_attempts + 1))
    db.refresh(credential)
    if credential.failed_attempts >= max_attempts:
        credential.locked_until = now + lockout_minutes * 60
        return True
    return False


def account_row(db: DBSession, account: M.Account, now: float, viewer_id: str = "") -> dict:
    credential = db.get(M.StaffPinCredential, account.id)
    password = db.get(M.AccountPassword, account.id)
    last_sign_in = max([row.last_sign_in_at or 0.0 for row in (credential, password) if row is not None], default=0.0)
    profile = account.profile or {}
    return {
        "id": account.id, "identifier": account.identifier, "fullName": account.full_name, "role": account.role,
        "partnerKind": partner_kind_of(account), "active": account.active is True,
        "scope": profile.get("university") or profile.get("organisation") or "",
        "hasPin": credential is not None,
        "locked": is_locked(credential, now),
        "lockedUntil": credential.locked_until if is_locked(credential, now) else None,
        "failedAttempts": credential.failed_attempts if credential else 0,
        "hasPassword": password is not None,
        "passwordLocked": is_locked(password, now),
        "lastSignInAt": last_sign_in or None,
        "rotatedAt": (credential.rotated_at or None) if credential else None,
        "isSelf": account.id == viewer_id,
    }


# --- sign-in ------------------------------------------------------------------

STAFF_PIN_DISABLED = "STAFF_PIN_DISABLED"
SIGN_IN_FAILED = "STAFF_PIN_FAILED"


def switch_on(db: DBSession, key: str) -> bool:
    """A sign-in master switch. Fails closed: an unreadable value is off."""
    try:
        return setting(key, db) is True
    except Exception:  # noqa: BLE001 — any failure to read the switch means that sign-in stays off
        return False


def pin_login_enabled(db: DBSession) -> bool:
    return switch_on(db, "auth.staff_pin_login_enabled")


def failure_message(db: DBSession) -> str:
    return (f"That ID and PIN don't match, or the account is locked. After {setting('auth.staff_pin_max_attempts', db)} "
            f"wrong PINs an account locks for {setting('auth.staff_pin_lockout_minutes', db)} minutes.")


def _refused(db: DBSession) -> HTTPException:
    return HTTPException(401, {"code": SIGN_IN_FAILED, "message": failure_message(db)})


class PinSignIn(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    pin: str = Field(pattern=PIN_PATTERN)


@router.post("/auth/staff-pin/sign-in")
def pin_sign_in(body: PinSignIn, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    if not pin_login_enabled(db):
        raise HTTPException(403, {"code": STAFF_PIN_DISABLED, "message": "Sign-in with a PIN is turned off. Use the emailed code."})
    identifier = body.identifier.strip().lower()
    window = setting("auth.staff_pin_rate_window_minutes", db) * 60
    limit(db, f"pin_ip:{request.client.host if request.client else 'unknown'}",
          setting("auth.staff_pin_ip_max_attempts", db), window)
    limit(db, f"pin_id:{identifier}", setting("auth.staff_pin_id_max_attempts", db), window)

    now = time.time()
    account = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
    credential = db.get(M.StaffPinCredential, account.id) if account is not None else None
    eligible = (account is not None and credential is not None and account.active is True
                and account.is_team_account is True and account.role in TEAM_ROLES and account.role != "STUDENT")
    if not eligible:
        _burn_hash_time(body.pin)
        # A disabled team account is named; anything else (unknown, a student, a real staff
        # address) is only a digest of what was typed, so the log never links a person to it.
        team = account is not None and account.is_team_account is True
        audit(db, account.id if team else ANONYMOUS_ACTOR, "STAFF_PIN_SIGN_IN_FAILED",
              account.id if team else _typed_id_digest(identifier))
        db.commit()
        raise _refused(db)

    if is_locked(credential, now):
        _burn_hash_time(body.pin)
        audit(db, account.id, "STAFF_PIN_SIGN_IN_WHILE_LOCKED", account.id)
        db.commit()
        raise _refused(db)
    clear_lock_if_run_out(credential)

    if not verify_pin(body.pin, credential.pin_hash):
        audit(db, account.id, "STAFF_PIN_SIGN_IN_FAILED", account.id)
        if count_wrong_attempt(db, credential, setting("auth.staff_pin_max_attempts", db),
                               setting("auth.staff_pin_lockout_minutes", db), now):
            audit(db, account.id, "STAFF_PIN_LOCKED", account.id)
        db.commit()
        raise _refused(db)

    credential.failed_attempts, credential.locked_until, credential.last_sign_in_at = 0, 0.0, now
    audit(db, account.id, "STAFF_PIN_SIGN_IN", account.id)
    # The PIN replaces the emailed code, never the authenticator: same branch as /auth/otp/verify.
    if twofa_store.is_enabled(db, account.id):
        temp = twofa_store.create_pending(db, account.id, first_factor="PIN")
        db.commit()
        return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}
    csrf = issue_session(db, account, response, request)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}


# --- Super admin → Team accounts ----------------------------------------------


def _target(db: DBSession, account_id: str) -> M.Account:
    account = db.get(M.Account, account_id)
    if account is None or not account.is_team_account:
        raise HTTPException(404, "No team account with that id.")
    return account


@router.get("/ops/team-accounts")
def list_team_accounts(response: Response, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    now = time.time()
    rows = db.scalars(select(M.Account).where(M.Account.is_team_account.is_(True))
                      .order_by(M.Account.role, M.Account.identifier)).all()
    return {"items": [account_row(db, row, now, user["id"]) for row in rows],
            "pinSignInEnabled": pin_login_enabled(db),
            "passwordSignInEnabled": switch_on(db, "auth.password_login_enabled")}


class RotateInput(StrictModel):
    # Only when rotating your own PIN: the one you have now.
    currentPin: str | None = Field(default=None, pattern=PIN_PATTERN)


ROTATE_SELF_REFUSED = "ROTATE_SELF_NEEDS_CURRENT_PIN"


@router.post("/ops/team-accounts/{account_id}/rotate")
def rotate_pin(account_id: str, body: RotateInput, request: Request, response: Response,
               user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    """A new PIN, shown once in this answer and never again."""
    response.headers["Cache-Control"] = "no-store"
    account = _target(db, account_id)
    keep = ""
    if account.id == user["id"]:
        # Your own PIN: prove you hold it first, so a walked-away session can't take the account over.
        limit(db, f"pin_rotate_self:{account.id}", setting("auth.staff_pin_max_attempts", db),
              setting("auth.staff_pin_lockout_minutes", db) * 60)
        credential = db.get(M.StaffPinCredential, account.id)
        if not body.currentPin or credential is None or not verify_pin(body.currentPin, credential.pin_hash):
            audit(db, user["id"], "TEAM_ACCOUNT_ROTATE_SELF_REFUSED", account.id)
            db.commit()
            raise HTTPException(403, {"code": ROTATE_SELF_REFUSED, "message": "Enter your current PIN to change it."})
        keep = digest(request.cookies.get(SESSION_COOKIE, ""))
    pin = rotate(db, account, user["id"], keep)
    return {"id": account.id, "identifier": account.identifier, "pin": pin}


@router.post("/ops/team-accounts/{account_id}/unlock")
def unlock_account(account_id: str, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    account = _target(db, account_id)
    unlock(db, account, user["id"])
    return account_row(db, account, time.time(), user["id"])


@router.post("/ops/team-accounts/{account_id}/disable")
def disable_account(account_id: str, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    account = _target(db, account_id)
    if account.id == user["id"]:
        raise HTTPException(409, "You can't disable the account you are signed in with.")
    disable(db, account, user["id"])
    return account_row(db, account, time.time(), user["id"])
