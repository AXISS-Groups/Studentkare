"""Passwords: a sign-in password beside the PIN or the one-time code.

Plan tier1-auth-password-2026-10-22 (approved by the founder, 2026-10-22). Team
accounts set one on the server (``python -m scripts.team_accounts set-password``)
or by a super admin on Platform → Team accounts, and sign in on /staff-sign-in.
Students create one at sign-up, sign in with either verified contact
(``/auth/password/sign-in``), and change it on Sign-in & security. It reuses the team-account PIN machinery
(services/team_accounts.py) rather than a copy of it: the same salted, peppered
scrypt hash, the same lockout counting, the same audit rows.

What keeps it safe enough to offer:

* **Only a salted, peppered scrypt hash is stored** (``care_account_passwords``,
  platform plane). Never logged, never sent back, never kept on the device.
* **Online guessing is what a password has to survive**, and unlike a passcode it
  works on a new device. Wrong tries count; after ``auth.password_max_attempts``
  the password locks for ``auth.password_lockout_minutes`` (the PIN or a code
  still works). Each address and each ID is also rate limited.
* **One answer for everything that fails**: unknown ID, a student, no password,
  disabled, locked, wrong. An ID with no password still runs a hash, so the
  timing says nothing either.
* **Weak passwords are refused**: shorter than ``auth.password_min_length``,
  common ones, one character repeated or a repeated pattern, a run or a keyboard
  row, and the account's own email name, phone digits, name or birth date.
* **Setting a password signs the account out everywhere else**, and setting your
  own needs your current PIN or password.
* **A second step still applies**: an account with an authenticator gets it after
  the password, and a role that must use one is held to setting it up.
* **Every attempt and change is audited**, never with the password.
* **Master switch** ``auth.password_login_enabled`` (public): off, sign-in with a
  password is refused here and hidden on the page.
"""
from __future__ import annotations

import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.settings_registry import setting
from services import twofa_store
from services.contact_store import CONTACT_KINDS, account_for_sign_in, verified_contact
from services.otp_delivery import dispatch_message
from services.student_passcode import (
    COMMON_PASSCODES,
    KEYBOARD_ROWS,
    _code_proven_until,
    _is_repeat,
    _is_run,
    _personal_parts,
)
from services.team_accounts import (
    ANONYMOUS_ACTOR,
    PIN_PATTERN,
    TEAM_ROLES,
    _burn_hash_time,
    _target,
    _typed_id_digest,
    account_row,
    audit,
    clear_lock_if_run_out,
    count_wrong_attempt,
    end_sessions,
    hash_pin,
    is_locked,
    verify_pin,
)
from services.workflow_auth import (
    SESSION_COOKIE,
    StrictModel,
    authenticated_user,
    check_origin,
    digest,
    issue_session,
    limit,
    normalize_identifier,
    remember_device,
    remembered_account,
    require_super_admin,
    session_payload,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Passwords"])

# --- the password itself ------------------------------------------------------

MAX_PASSWORD_LENGTH = 128
# Printable ASCII, spaces allowed inside (passphrases) but not at either end:
# fields trim them, which would quietly change the password.
PASSWORD_CHARACTERS = re.compile(r"^[\x21-\x7e]([\x20-\x7e]*[\x21-\x7e])?$")
# Fewer different characters than this (aaaaaaaaaa, abababab12) is too easy.
MIN_DISTINCT_CHARACTERS = 5
# A personal part shorter than this (a two-letter name) is too common to refuse on.
MIN_PERSONAL_PART = 4
# Any password containing one of these is refused, in any case.
COMMON_PASSWORD_WORDS = ("password", "passw0rd", "p@ssword", "p@ssw0rd", "qwerty", "123456", "studentkare",
                         "letmein", "welcome", "iloveyou", "admin")
TRAILING_DIGITS_AND_SYMBOLS = re.compile(r"[\d\W_]+$")


class PasswordRefused(ValueError):
    """Why a password can't be used: LENGTH, CHARACTERS or WEAK (with a reason)."""

    def __init__(self, code: str, reason: str = "") -> None:
        super().__init__(code)
        self.code, self.reason = code, reason


def check_password(password: str, min_length: int, account: M.Account | None = None) -> None:
    """Raises PasswordRefused unless the password is long enough, typeable and not easy to guess."""
    if not min_length <= len(password) <= MAX_PASSWORD_LENGTH:
        raise PasswordRefused("LENGTH")
    if not PASSWORD_CHARACTERS.match(password):
        raise PasswordRefused("CHARACTERS")
    lower = password.lower()
    stem = TRAILING_DIGITS_AND_SYMBOLS.sub("", lower)
    if any(word in lower for word in COMMON_PASSWORD_WORDS) or lower in COMMON_PASSCODES or stem in COMMON_PASSCODES:
        raise PasswordRefused("WEAK", "COMMON")
    if _is_repeat(lower) or len(set(lower)) < MIN_DISTINCT_CHARACTERS:
        raise PasswordRefused("WEAK", "REPEATED")
    if _is_run(lower) or any(lower in row or lower in row[::-1] for row in KEYBOARD_ROWS):
        raise PasswordRefused("WEAK", "SEQUENCE")
    for part in _personal_parts(account):
        if len(part) >= MIN_PERSONAL_PART and (part in lower or lower in part):
            raise PasswordRefused("WEAK", "PERSONAL")


def refusal(error: PasswordRefused, min_length: int) -> HTTPException:
    messages = {
        "LENGTH": f"A password is {min_length} to {MAX_PASSWORD_LENGTH} characters.",
        "CHARACTERS": "Use letters, digits, symbols and spaces, with no space at the start or end.",
        "WEAK": "That password is too easy to guess. Try a longer or less common one.",
    }
    return HTTPException(422, {"code": f"PASSWORD_{error.code}", "reason": error.reason,
                               "message": messages[error.code]})


def store_new_password(db: DBSession, account: M.Account, password: str) -> None:
    """A brand-new account's password, already checked (sign-up, an invite claim). Doesn't commit."""
    db.add(M.AccountPassword(account_id=account.id, password_hash=hash_pin(password), failed_attempts=0,
                             locked_until=0.0, created_at=time.time(), updated_at=0.0, last_sign_in_at=0.0))
    audit(db, account.id, "PASSWORD_SET", account.id)


def set_password(db: DBSession, account: M.Account, password: str, actor_id: str, keep_token_hash: str = "") -> None:
    """Hashes and stores the password, clears its lock and ends the account's other sessions.

    Raises PasswordRefused for a weak one. Commits.
    """
    check_password(password, setting("auth.password_min_length", db), account)
    now = time.time()
    credential = db.get(M.AccountPassword, account.id)
    if credential is None:
        db.add(M.AccountPassword(account_id=account.id, password_hash=hash_pin(password), failed_attempts=0,
                                 locked_until=0.0, created_at=now, updated_at=0.0, last_sign_in_at=0.0))
        action = "PASSWORD_SET"
    else:
        credential.password_hash = hash_pin(password)
        credential.failed_attempts, credential.locked_until, credential.updated_at = 0, 0.0, now
        action = "PASSWORD_CHANGED"
    end_sessions(db, account.id, keep_token_hash)
    audit(db, actor_id, action, account.id)
    db.commit()


# --- switch -------------------------------------------------------------------

PASSWORD_DISABLED = "PASSWORD_DISABLED"  # noqa: S105 — an error code, not a password
PASSWORD_FAILED = "PASSWORD_FAILED"  # noqa: S105 — an error code, not a password
SET_SELF_REFUSED = "PASSWORD_SELF_NEEDS_CURRENT"


def password_login_enabled(db: DBSession) -> bool:
    """The master switch. Fails closed: an unreadable value is off."""
    try:
        return setting("auth.password_login_enabled", db) is True
    except Exception:  # noqa: BLE001 — any failure to read the switch means password sign-in stays off
        return False


def failure_message(db: DBSession) -> str:
    return (f"That ID and password don't match, or the account is locked. After "
            f"{setting('auth.password_max_attempts', db)} wrong passwords it locks for "
            f"{setting('auth.password_lockout_minutes', db)} minutes.")


def _refused(db: DBSession) -> HTTPException:
    return HTTPException(401, {"code": PASSWORD_FAILED, "message": failure_message(db)})


# --- sign-in (shared by the staff page and the student page) --------------------


class PasswordSignIn(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


def _disabled(other: str) -> HTTPException:
    return HTTPException(403, {"code": PASSWORD_DISABLED, "message": f"Sign-in with a password is turned off. {other}"})


def _limit_tries(db: DBSession, request: Request, key: str) -> None:
    window = setting("auth.password_rate_window_minutes", db) * 60
    limit(db, f"password_ip:{request.client.host if request.client else 'unknown'}",
          setting("auth.password_ip_max_attempts", db), window)
    limit(db, f"password_id:{key}", setting("auth.password_id_max_attempts", db), window)


def _check(db: DBSession, account: M.Account | None, eligible: bool, password: str, typed: str,
           named: bool) -> M.AccountPassword:
    """The account's password row if the password is right; otherwise the one refusal. Commits on refusal.

    ``named``: the audit row may name the account (a team account); anything else is
    only a digest of what was typed, so the log never links a person to it.
    """
    now = time.time()
    credential = db.get(M.AccountPassword, account.id) if account is not None else None
    if account is None or credential is None or not eligible:
        _burn_hash_time(password)
        audit(db, account.id if named and account else ANONYMOUS_ACTOR, "PASSWORD_SIGN_IN_FAILED",
              account.id if named and account else _typed_id_digest(typed))
        db.commit()
        raise _refused(db)
    if is_locked(credential, now):
        _burn_hash_time(password)
        audit(db, account.id, "PASSWORD_SIGN_IN_WHILE_LOCKED", account.id)
        db.commit()
        raise _refused(db)
    clear_lock_if_run_out(credential)
    if not verify_pin(password, credential.password_hash):
        audit(db, account.id, "PASSWORD_SIGN_IN_FAILED", account.id)
        if count_wrong_attempt(db, credential, setting("auth.password_max_attempts", db),
                               setting("auth.password_lockout_minutes", db), now):
            audit(db, account.id, "PASSWORD_LOCKED", account.id)
        db.commit()
        raise _refused(db)
    credential.failed_attempts, credential.locked_until, credential.last_sign_in_at = 0, 0.0, now
    audit(db, account.id, "PASSWORD_SIGN_IN", account.id)
    return credential


def _pending_second_step(db: DBSession, account: M.Account) -> dict | None:
    """The password replaces the PIN or code, never the authenticator: same branch as /auth/otp/verify."""
    if not twofa_store.is_enabled(db, account.id):
        return None
    temp = twofa_store.create_pending(db, account.id, first_factor="PASSWORD")
    db.commit()
    return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}


@router.post("/auth/staff-password/sign-in")
def staff_password_sign_in(body: PasswordSignIn, request: Request, response: Response,
                           db: DBSession = Depends(workflow_db)):
    """Team accounts on /staff-sign-in. Individual staff accounts keep the emailed code."""
    check_origin(request)
    if not password_login_enabled(db):
        raise _disabled("Use your PIN or the emailed code.")
    identifier = body.identifier.strip().lower()
    _limit_tries(db, request, identifier)
    account = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
    team = account is not None and account.is_team_account is True
    eligible = team and account.active is True and account.role in TEAM_ROLES and account.role != "STUDENT"
    _check(db, account, eligible, body.password, identifier, named=team)
    pending = _pending_second_step(db, account)
    if pending:
        return pending
    csrf = issue_session(db, account, response, request)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}


# --- students: sign-in with the email or WhatsApp number and the password -------

NEW_SIGN_IN_SUBJECT = "New sign-in to your StudentKare account"
NEW_SIGN_IN_TEXT = ("Someone just signed in to your StudentKare account with its password, on a device it hasn't "
                    "been used on before.\nIf this was you, there is nothing to do.\nIf it wasn't, sign in with a "
                    "code, change your password in Sign-in & security, and use \"Lost your phone?\" to sign out "
                    "everywhere else.")


def notify_new_sign_in(db: DBSession, account: M.Account) -> None:
    """Tells both verified contacts about a password sign-in on a new device (plan D-4). Never raises."""
    for kind in CONTACT_KINDS:
        value = verified_contact(db, account, kind)
        if value:
            dispatch_message(value, kind, NEW_SIGN_IN_SUBJECT, NEW_SIGN_IN_TEXT, db)


def _student_for(db: DBSession, typed: str) -> M.Account | None:
    """The student whose *verified* email or number this is (services/contact_store.py), or None."""
    kind = "EMAIL" if "@" in typed else "WHATSAPP"
    try:
        value = normalize_identifier(typed, kind)
    except HTTPException:
        return None
    return account_for_sign_in(db, value, kind)


@router.post("/auth/password/sign-in")
def student_password_sign_in(body: PasswordSignIn, request: Request, response: Response,
                             db: DBSession = Depends(workflow_db)):
    """Students, by their verified email or WhatsApp number. Works on a new device; both contacts are told."""
    check_origin(request)
    if not password_login_enabled(db):
        raise _disabled("Sign in with a code.")
    typed = body.identifier.strip().lower()
    _limit_tries(db, request, typed)
    account = _student_for(db, typed)
    eligible = account is not None and account.role == "STUDENT" and account.active is True
    _check(db, account, eligible, body.password, typed, named=False)
    _device, known = remembered_account(request, db)
    new_device = known is None or known.id != account.id
    pending = _pending_second_step(db, account)
    if new_device:
        notify_new_sign_in(db, account)
    if pending:
        return pending
    # A password is not a code: the session is not "code-proven" (no passcode or password reset from it).
    csrf = issue_session(db, account, response, request)
    remember_device(db, account, request, response)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}


# --- students: Sign-in & security → Password -----------------------------------


@router.get("/auth/password")
def password_status(request: Request, response: Response, user=Depends(authenticated_user),
                    db: DBSession = Depends(workflow_db)):
    """Whether this student has a password, and until when it can be replaced without the current one."""
    response.headers["Cache-Control"] = "no-store"
    credential = db.get(M.AccountPassword, user["id"])
    until = _code_proven_until(db, request)
    return {"enabled": password_login_enabled(db), "hasPassword": credential is not None,
            "locked": is_locked(credential, time.time()), "minLength": setting("auth.password_min_length", db),
            "replaceWithoutCurrentUntil": until if until > time.time() else None}


class StudentPasswordInput(StrictModel):
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)
    currentPassword: str | None = Field(default=None, max_length=MAX_PASSWORD_LENGTH)


PROOF_NEEDED = "PASSWORD_PROOF_NEEDED"  # noqa: S105 — an error code, not a password


@router.post("/auth/password")
def set_own_password(body: StudentPasswordInput, request: Request, user=Depends(authenticated_user),
                     db: DBSession = Depends(workflow_db)):
    """Set or change your password. Changing one needs the current password, or a code sign-in just now
    ("Forgot password" is: sign in with a code, then set a new one). Your other sessions are signed out."""
    check_origin(request)
    account = db.get(M.Account, user["id"])
    if account is None or account.role != "STUDENT":
        raise HTTPException(403, {"code": "PASSWORD_STUDENTS_ONLY", "message": "Team accounts set passwords on Team accounts."})
    credential = db.get(M.AccountPassword, account.id)
    if credential is not None and _code_proven_until(db, request) <= time.time():
        limit(db, f"password_set_self:{account.id}", setting("auth.password_max_attempts", db),
              setting("auth.password_lockout_minutes", db) * 60)
        if not body.currentPassword or not verify_pin(body.currentPassword, credential.password_hash):
            audit(db, account.id, "PASSWORD_SET_SELF_REFUSED", account.id)
            db.commit()
            raise HTTPException(403, {"code": PROOF_NEEDED,
                                      "message": "Enter your current password, or sign in with a code first."})
    try:
        set_password(db, account, body.password, account.id, digest(request.cookies.get(SESSION_COOKIE, "")))
    except PasswordRefused as error:
        raise refusal(error, setting("auth.password_min_length", db)) from error
    return {"success": True, "hasPassword": True}


# --- Super admin → Team accounts → Set password -------------------------------


class SetPasswordInput(StrictModel):
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)
    # Only when setting your own: the PIN or the password you have now.
    currentPin: str | None = Field(default=None, pattern=PIN_PATTERN)
    currentPassword: str | None = Field(default=None, max_length=MAX_PASSWORD_LENGTH)


def _holds_current(db: DBSession, account: M.Account, body: SetPasswordInput) -> bool:
    pin = db.get(M.StaffPinCredential, account.id)
    password = db.get(M.AccountPassword, account.id)
    if body.currentPin and pin is not None and verify_pin(body.currentPin, pin.pin_hash):
        return True
    return bool(body.currentPassword and password is not None
                and verify_pin(body.currentPassword, password.password_hash))


@router.post("/ops/team-accounts/{account_id}/password")
def set_team_password(account_id: str, body: SetPasswordInput, request: Request, response: Response,
                      user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    """Sets or replaces a team account's password. The password is never sent back."""
    response.headers["Cache-Control"] = "no-store"
    account = _target(db, account_id)
    keep = ""
    if account.id == user["id"]:
        # Your own: prove you hold it first, so a walked-away session can't take the account over.
        limit(db, f"password_set_self:{account.id}", setting("auth.password_max_attempts", db),
              setting("auth.password_lockout_minutes", db) * 60)
        if not _holds_current(db, account, body):
            audit(db, user["id"], "PASSWORD_SET_SELF_REFUSED", account.id)
            db.commit()
            raise HTTPException(403, {"code": SET_SELF_REFUSED,
                                      "message": "Enter your current PIN or password to change it."})
        keep = digest(request.cookies.get(SESSION_COOKIE, ""))
    min_length = setting("auth.password_min_length", db)
    try:
        set_password(db, account, body.password, user["id"], keep)
    except PasswordRefused as error:
        raise refusal(error, min_length) from error
    return account_row(db, account, time.time(), user["id"])
