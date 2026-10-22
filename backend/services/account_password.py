"""Passwords: a sign-in password beside the PIN or the one-time code.

Plan tier1-auth-password-2026-10-22 (approved by the founder, 2026-10-22). Team
accounts get one first, set on the server (``python -m scripts.team_accounts
set-password``) or by a super admin on Platform → Team accounts; students follow
in a later change. It reuses the team-account PIN machinery
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
from services.student_passcode import (
    COMMON_PASSCODES,
    KEYBOARD_ROWS,
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
    check_origin,
    digest,
    issue_session,
    limit,
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


# --- sign-in (team accounts, on /staff-sign-in) -------------------------------


class PasswordSignIn(StrictModel):
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


@router.post("/auth/staff-password/sign-in")
def staff_password_sign_in(body: PasswordSignIn, request: Request, response: Response,
                           db: DBSession = Depends(workflow_db)):
    check_origin(request)
    if not password_login_enabled(db):
        raise HTTPException(403, {"code": PASSWORD_DISABLED,
                                  "message": "Sign-in with a password is turned off. Use your PIN or the emailed code."})
    identifier = body.identifier.strip().lower()
    window = setting("auth.password_rate_window_minutes", db) * 60
    limit(db, f"password_ip:{request.client.host if request.client else 'unknown'}",
          setting("auth.password_ip_max_attempts", db), window)
    limit(db, f"password_id:{identifier}", setting("auth.password_id_max_attempts", db), window)

    now = time.time()
    account = db.scalar(select(M.Account).where(M.Account.identifier == identifier))
    credential = db.get(M.AccountPassword, account.id) if account is not None else None
    eligible = (account is not None and credential is not None and account.active is True
                and account.is_team_account is True and account.role in TEAM_ROLES and account.role != "STUDENT")
    if not eligible:
        _burn_hash_time(body.password)
        # A team account is named; anything else is only a digest of what was typed,
        # so the log never links a person to it.
        team = account is not None and account.is_team_account is True
        audit(db, account.id if team else ANONYMOUS_ACTOR, "PASSWORD_SIGN_IN_FAILED",
              account.id if team else _typed_id_digest(identifier))
        db.commit()
        raise _refused(db)

    if is_locked(credential, now):
        _burn_hash_time(body.password)
        audit(db, account.id, "PASSWORD_SIGN_IN_WHILE_LOCKED", account.id)
        db.commit()
        raise _refused(db)
    clear_lock_if_run_out(credential)

    if not verify_pin(body.password, credential.password_hash):
        audit(db, account.id, "PASSWORD_SIGN_IN_FAILED", account.id)
        if count_wrong_attempt(db, credential, setting("auth.password_max_attempts", db),
                               setting("auth.password_lockout_minutes", db), now):
            audit(db, account.id, "PASSWORD_LOCKED", account.id)
        db.commit()
        raise _refused(db)

    credential.failed_attempts, credential.locked_until, credential.last_sign_in_at = 0, 0.0, now
    audit(db, account.id, "PASSWORD_SIGN_IN", account.id)
    # The password replaces the PIN or code, never the authenticator: same branch as /auth/otp/verify.
    if twofa_store.is_enabled(db, account.id):
        temp = twofa_store.create_pending(db, account.id, first_factor="PASSWORD")
        db.commit()
        return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}
    csrf = issue_session(db, account, response, request)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}


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
