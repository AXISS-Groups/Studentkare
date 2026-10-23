"""Student passcode: an optional 4, 6 or 8 character secret instead of a one-time code.

Founder decision 2026-10-22 (plan tier1-canvas-wp03, amendment "passcode"). It
reuses the team-account PIN machinery (services/team_accounts.py) rather than a
copy of it: the same salted, peppered scrypt hash, the same lockout counting, the
same audit rows. Team accounts keep their own 6-digit PIN and their own page; the
two flows never share a screen.

What keeps it safe enough to offer:

* **Only on a device that has signed in to the account before.** A device learns
  the account through its remembered token (services/workflow_auth.remember_device),
  which is set only after a sign-in on that device, and the first sign-in on any
  device is always a one-time code. So someone who knows only the number or the
  email can't use a passcode from their own phone. A new device gets one answer,
  whatever was typed, so nothing about the account leaks.
* **Only a salted, peppered scrypt hash is stored** (``care_student_passcodes``,
  platform plane).
* **Online guessing is what a passcode has to survive.** Wrong tries count;
  after ``auth.passcode_max_attempts`` the passcode locks for
  ``auth.passcode_lockout_minutes`` (a code still works). Each address and each
  account is also rate limited.
* **One answer for everything that fails**: no passcode, not a student, locked,
  wrong. An account with no passcode still runs a hash, so the timing says nothing.
* **Weak passcodes are refused**: too short or long (only 4, 6 or 8), common ones
  (0000, 1234, 123456, "password"…), one character repeated, a repeated pattern, a
  run up or down, a keyboard row, and the student's own phone digits, email name
  or date of birth.
* **Every attempt and change is audited**, never with the passcode.
* **The code path always stays.** "Forgot passcode" is: sign in with a code, then
  set a new one. Replacing or removing a passcode needs the current one, or a
  sign-in proven with a code in the last ``auth.passcode_reset_window_minutes``.
* **A second step still applies**: an account with an authenticator gets it after
  the passcode, exactly as after a code.
* **Master switch** ``auth.passcode_login_enabled`` (public): off, every endpoint
  here refuses and the screens hide the option.
"""
from __future__ import annotations

import re
import time
from itertools import pairwise

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from core.settings_registry import setting
from services import twofa_store
from services.contact_store import verified_contact
from services.team_accounts import (
    ANONYMOUS_ACTOR,
    _burn_hash_time,
    _typed_id_digest,
    audit,
    clear_lock_if_run_out,
    count_wrong_attempt,
    hash_pin,
    is_locked,
    is_weak_pin,
    verify_pin,
)
from services.workflow_auth import (
    StrictModel,
    authenticated_user,
    check_origin,
    issue_session,
    limit,
    normalize_identifier,
    remember_device,
    remembered_account,
    resolve_session,
    session_payload,
    workflow_db,
)

router = APIRouter(prefix="/api/auth", tags=["Student passcode"])

# --- the passcode itself ------------------------------------------------------

PASSCODE_LENGTHS = (4, 6, 8)
RECOMMENDED_LENGTH = 8
# Printable ASCII without the space: digits, letters and symbols any phone or
# keyboard can type. Spaces are refused (fields trim them, which would change it).
PASSCODE_CHARACTERS = re.compile(r"^[\x21-\x7e]+$")
MAX_INPUT = 64

COMMON_PASSCODES = frozenset({
    "0000", "1111", "1212", "1234", "4321", "2580", "6969", "1004", "2000", "2468", "1357",
    "123456", "654321", "111111", "000000", "121212", "123123", "112233", "696969", "159753",
    "12345678", "87654321", "11111111", "00000000", "12341234", "11223344", "1q2w3e4r", "q1w2e3r4",
    "qwerty", "qwertyui", "asdfgh", "asdfghjk", "zxcvbn", "abcd", "abcdef", "abcdefgh", "abc123",
    "abcd1234", "qwer1234", "iloveyou", "letmein", "welcome", "monkey", "dragon", "sunshine",
    "admin", "admin123", "student", "students", "studentk", "kare", "india123",
})
# Any passcode containing one of these is refused, in any case and with common swaps.
COMMON_WORDS = ("password", "passw0rd", "p@ssword", "p@ssw0rd", "pass", "qwer", "asdf")
KEYBOARD_ROWS = ("1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm")
DIGITS = 10
ALPHABET = 26


class PasscodeRefused(ValueError):
    """Why a passcode can't be used: LENGTH, CHARACTERS or WEAK (with a reason)."""

    def __init__(self, code: str, reason: str = "") -> None:
        super().__init__(code)
        self.code, self.reason = code, reason


def _is_run(text: str) -> bool:
    """Every step +1 or every step -1: 1234, 8901 (digits wrap), 9876, abcd, dcba."""
    if text.isdigit():
        steps = {(int(b) - int(a)) % DIGITS for a, b in pairwise(text)}
        return steps in ({1}, {DIGITS - 1})
    if text.isalpha():
        steps = {ord(b) - ord(a) for a, b in pairwise(text)}
        return steps in ({1}, {-1})
    return False


def _is_repeat(text: str) -> bool:
    """A shorter unit repeated: aaaa, abab, 121212, 123123, 12341234."""
    return any(len(text) % unit == 0 and text == text[:unit] * (len(text) // unit) for unit in range(1, len(text)))


def _personal_parts(account: M.Account | None) -> list[str]:
    """What a passcode must not contain or be: the student's phone digits, email name, name and birth date."""
    if account is None:
        return []
    parts: list[str] = []
    identifier = (account.identifier or "").lower()
    if "@" in identifier:
        parts.append(identifier.split("@")[0])
    else:
        digits = re.sub(r"\D", "", identifier)
        parts += [digits, f"91{digits}"]
    parts.append(re.sub(r"[^a-z]", "", (account.full_name or "").lower()))
    dob = str((account.profile or {}).get("dob") or "")
    match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", dob)
    if match:
        year, month, day = match.groups()
        parts += [f"{day}{month}{year}", f"{year}{month}{day}", f"{month}{day}{year}", f"{day}{month}{year[2:]}"]
    return [part for part in parts if part]


def check_passcode(passcode: str, account: M.Account | None = None) -> None:
    """Raises PasscodeRefused unless the passcode is 4, 6 or 8 allowed characters and not easy to guess."""
    if len(passcode) not in PASSCODE_LENGTHS:
        raise PasscodeRefused("LENGTH")
    if not PASSCODE_CHARACTERS.match(passcode):
        raise PasscodeRefused("CHARACTERS")
    lower = passcode.lower()
    if lower in COMMON_PASSCODES or any(word in lower for word in COMMON_WORDS):
        raise PasscodeRefused("WEAK", "COMMON")
    if _is_repeat(lower) or len(set(lower)) < len(lower) // 2:
        raise PasscodeRefused("WEAK", "REPEATED")
    if _is_run(lower) or any(lower in row or lower in row[::-1] for row in KEYBOARD_ROWS):
        raise PasscodeRefused("WEAK", "SEQUENCE")
    if lower.isdigit() and is_weak_pin(lower):
        raise PasscodeRefused("WEAK", "REPEATED")
    for part in _personal_parts(account):
        if lower in part or (len(part) >= min(PASSCODE_LENGTHS) and part in lower):
            raise PasscodeRefused("WEAK", "PERSONAL")


def _refusal(error: PasscodeRefused) -> HTTPException:
    messages = {
        "LENGTH": "A passcode is exactly 4, 6 or 8 characters.",
        "CHARACTERS": "Use digits, letters and symbols only (no spaces).",
        "WEAK": "That passcode is too easy to guess. Try a different one.",
    }
    return HTTPException(422, {"code": f"PASSCODE_{error.code}", "reason": error.reason,
                               "message": messages[error.code]})


# --- switch, state ------------------------------------------------------------

PASSCODE_DISABLED = "PASSCODE_DISABLED"
PASSCODE_FAILED = "PASSCODE_FAILED"
PASSCODE_NEW_DEVICE = "PASSCODE_NEW_DEVICE"
PASSCODE_PROOF_NEEDED = "PASSCODE_PROOF_NEEDED"
STUDENTS_ONLY = "PASSCODE_STUDENTS_ONLY"


def passcode_enabled(db: DBSession) -> bool:
    """The master switch. Fails closed: an unreadable value is off."""
    try:
        return setting("auth.passcode_login_enabled", db) is True
    except Exception:  # noqa: BLE001 — any failure to read the switch means passcodes stay off
        return False


def passcode_offered(db: DBSession, account: M.Account) -> bool:
    """Whether "Use my passcode" applies to this account (told only to a device that already holds it)."""
    return (passcode_enabled(db) and account.role == "STUDENT" and account.active is True
            and db.get(M.StudentPasscode, account.id) is not None)


def _disabled() -> HTTPException:
    return HTTPException(403, {"code": PASSCODE_DISABLED,
                               "message": "Signing in with a passcode is turned off. Use a code instead."})


def _failure_message(db: DBSession) -> str:
    return (f"That passcode didn't work, or it is locked for now. After {setting('auth.passcode_max_attempts', db)} "
            f"wrong tries it locks for {setting('auth.passcode_lockout_minutes', db)} minutes. "
            "You can always sign in with a code.")


def _refused(db: DBSession) -> HTTPException:
    return HTTPException(401, {"code": PASSCODE_FAILED, "message": _failure_message(db)})


def _student(db: DBSession, user: dict) -> M.Account:
    account = db.get(M.Account, user["id"])
    if account is None or account.role != "STUDENT":
        # Team accounts and staff have their own PIN on the staff page; never this.
        raise HTTPException(403, {"code": STUDENTS_ONLY, "message": "Only students can set a passcode."})
    return account


def _code_proven_until(db: DBSession, request: Request) -> float:
    """When the current session stops counting as freshly proven with a code (0 if it never was)."""
    _account, session = resolve_session(request, db)
    if session is None or not session.code_verified_at:
        return 0.0
    return session.code_verified_at + setting("auth.passcode_reset_window_minutes", db) * 60


@router.get("/passcode")
def passcode_status(request: Request, response: Response, user=Depends(authenticated_user),
                    db: DBSession = Depends(workflow_db)):
    """The student's own passcode state. Never the passcode or its hash."""
    response.headers["Cache-Control"] = "no-store"
    now = time.time()
    enabled = passcode_enabled(db)
    if user["role"] != "STUDENT":
        return {"available": False, "enabled": enabled}
    credential = db.get(M.StudentPasscode, user["id"])
    proven_until = _code_proven_until(db, request)
    return {
        "available": True, "enabled": enabled,
        "hasPasscode": credential is not None,
        "length": credential.length if credential else None,
        "updatedAt": (credential.updated_at or credential.created_at) if credential else None,
        "locked": is_locked(credential, now),
        "lengths": list(PASSCODE_LENGTHS), "recommendedLength": RECOMMENDED_LENGTH,
        # Replacing or removing without the current passcode is allowed until this time (a fresh code sign-in).
        "replaceWithoutCurrentUntil": proven_until if proven_until > now else None,
    }


# --- set, change, remove ------------------------------------------------------


class PasscodeInput(StrictModel):
    passcode: str = Field(min_length=1, max_length=MAX_INPUT)
    currentPasscode: str | None = Field(default=None, max_length=MAX_INPUT)


class PasscodeRemove(StrictModel):
    currentPasscode: str | None = Field(default=None, max_length=MAX_INPUT)


def _prove(db: DBSession, request: Request, account: M.Account, credential: M.StudentPasscode,
           current: str | None, now: float) -> str:
    """For an existing passcode: the current one, or a fresh code sign-in. Returns how it was proven."""
    if current:
        if is_locked(credential, now):
            _burn_hash_time(current)
            audit(db, account.id, "STUDENT_PASSCODE_PROOF_WHILE_LOCKED", account.id)
            db.commit()
            raise _proof_needed(locked=True)
        clear_lock_if_run_out(credential)
        if verify_pin(current, credential.passcode_hash):
            credential.failed_attempts = 0
            return "CURRENT"
        audit(db, account.id, "STUDENT_PASSCODE_PROOF_FAILED", account.id)
        if count_wrong_attempt(db, credential, setting("auth.passcode_max_attempts", db),
                               setting("auth.passcode_lockout_minutes", db), now):
            audit(db, account.id, "STUDENT_PASSCODE_LOCKED", account.id)
        db.commit()
        raise _proof_needed()
    if _code_proven_until(db, request) > now:
        return "CODE"
    raise _proof_needed()


def _proof_needed(locked: bool = False) -> HTTPException:
    return HTTPException(403, {"code": PASSCODE_PROOF_NEEDED, "locked": locked,
                               "message": "Enter your current passcode, or sign in again with a code to set a new one."})


@router.put("/passcode")
def set_passcode(body: PasscodeInput, request: Request, user=Depends(authenticated_user),
                 db: DBSession = Depends(workflow_db)):
    """Set a first passcode, or replace one (with the current passcode, or after a fresh code sign-in)."""
    if not passcode_enabled(db):
        raise _disabled()
    account = _student(db, user)
    limit(db, f"passcode_set:{account.id}", setting("auth.passcode_id_max_attempts", db),
          setting("auth.passcode_rate_window_minutes", db) * 60)
    now = time.time()
    credential = db.get(M.StudentPasscode, account.id)
    proof = _prove(db, request, account, credential, body.currentPasscode, now) if credential else "NEW"
    try:
        check_passcode(body.passcode, account)
    except PasscodeRefused as error:
        db.commit()
        raise _refusal(error) from None
    if credential is None:
        db.add(M.StudentPasscode(account_id=account.id, passcode_hash=hash_pin(body.passcode), length=len(body.passcode),
                                 failed_attempts=0, locked_until=0.0, created_at=now, updated_at=now,
                                 last_sign_in_at=0.0))
        action = "STUDENT_PASSCODE_SET"
    else:
        credential.passcode_hash, credential.length = hash_pin(body.passcode), len(body.passcode)
        credential.failed_attempts, credential.locked_until, credential.updated_at = 0, 0.0, now
        action = "STUDENT_PASSCODE_RESET" if proof == "CODE" else "STUDENT_PASSCODE_CHANGED"
    audit(db, account.id, action, account.id)
    db.commit()
    return {"hasPasscode": True, "length": len(body.passcode), "updatedAt": now}


@router.post("/passcode/remove")
def remove_passcode(body: PasscodeRemove, request: Request, user=Depends(authenticated_user),
                    db: DBSession = Depends(workflow_db)):
    """Turn the passcode off (same proof as replacing it). Works even when the switch is off."""
    account = _student(db, user)
    credential = db.get(M.StudentPasscode, account.id)
    if credential is None:
        return {"hasPasscode": False}
    _prove(db, request, account, credential, body.currentPasscode, time.time())
    db.delete(credential)
    audit(db, account.id, "STUDENT_PASSCODE_REMOVED", account.id)
    db.commit()
    return {"hasPasscode": False}


# --- sign in ------------------------------------------------------------------


class PasscodeSignIn(StrictModel):
    # Typed on the sign-in page, or left out on "Continue as …" (the device's remembered account).
    identifier: str | None = Field(default=None, min_length=3, max_length=254)
    passcode: str = Field(min_length=1, max_length=MAX_INPUT)


def _typed_account_matches(db: DBSession, account: M.Account, typed: str) -> bool:
    """The typed email or number is this account's sign-in ID or one of its verified contacts."""
    channel = "EMAIL" if "@" in typed else "WHATSAPP"
    value = normalize_identifier(typed, channel)
    return value == account.identifier or value == verified_contact(db, account, channel)


@router.post("/passcode/sign-in")
def passcode_sign_in(body: PasscodeSignIn, request: Request, response: Response, db: DBSession = Depends(workflow_db)):
    check_origin(request)
    if not passcode_enabled(db):
        raise _disabled()
    window = setting("auth.passcode_rate_window_minutes", db) * 60
    limit(db, f"passcode_ip:{request.client.host if request.client else 'unknown'}",
          setting("auth.passcode_ip_max_attempts", db), window)
    _device, known = remembered_account(request, db)
    typed = (body.identifier or "").strip()
    if typed:
        # Validated like the code path (422 for something that isn't an email or a number).
        normalize_identifier(typed, "EMAIL" if "@" in typed else "WHATSAPP")
    limit(db, f"passcode_id:{known.id if known else typed.lower()}", setting("auth.passcode_id_max_attempts", db), window)

    # A device that hasn't signed in to this account gets the same answer whatever was typed.
    if known is None or (typed and not _typed_account_matches(db, known, typed)):
        audit(db, ANONYMOUS_ACTOR, "STUDENT_PASSCODE_NEW_DEVICE_REFUSED", _typed_id_digest(typed or "remembered"))
        db.commit()
        raise HTTPException(403, {"code": PASSCODE_NEW_DEVICE,
                                  "message": "On this device, sign in with a code first. After that, your passcode works here."})

    now = time.time()
    account = known
    credential = db.get(M.StudentPasscode, account.id)
    if credential is None or account.role != "STUDENT" or account.active is not True:
        _burn_hash_time(body.passcode)
        audit(db, account.id, "STUDENT_PASSCODE_SIGN_IN_FAILED", account.id)
        db.commit()
        raise _refused(db)
    if is_locked(credential, now):
        _burn_hash_time(body.passcode)
        audit(db, account.id, "STUDENT_PASSCODE_SIGN_IN_WHILE_LOCKED", account.id)
        db.commit()
        raise _refused(db)
    clear_lock_if_run_out(credential)
    if not verify_pin(body.passcode, credential.passcode_hash):
        audit(db, account.id, "STUDENT_PASSCODE_SIGN_IN_FAILED", account.id)
        if count_wrong_attempt(db, credential, setting("auth.passcode_max_attempts", db),
                               setting("auth.passcode_lockout_minutes", db), now):
            audit(db, account.id, "STUDENT_PASSCODE_LOCKED", account.id)
        db.commit()
        raise _refused(db)

    credential.failed_attempts, credential.locked_until, credential.last_sign_in_at = 0, 0.0, now
    audit(db, account.id, "STUDENT_PASSCODE_SIGN_IN", account.id)
    if twofa_store.is_enabled(db, account.id):
        temp = twofa_store.create_pending(db, account.id, first_factor="PASSCODE")
        db.commit()
        return {"success": True, "requires2FA": True, "tempToken": temp, "user": None}
    # Not code-proven: replacing this passcode later needs the current one or a code.
    csrf = issue_session(db, account, response, request, code_verified_at=0.0)
    remember_device(db, account, request, response)
    db.commit()
    return {"success": True, "user": session_payload(db, account), "csrfToken": csrf, "requiresSignup": False}
