"""Points ledger and referrals: the rules, with no HTTP in them.

What earns points: exactly one thing. A friend who joined with your invite code
became a verified, 18+ student (``REFERRAL_VERIFIED``, 50 points). Nothing
about the body, a reading, a result, a health camp or adding a health record
earns points, ever (AGENTS.md guardrail 4, Rule L; commit 38c8ecf removed the
last such award). The database enforces the list of reasons
(``ck_care_points_ledger_reason``), so a new reason needs a migration.

Points have no cash value and cannot be redeemed, exchanged or spent on
anything: there is no redemption path in this codebase. ``POINTS_NOTE`` says so
in every response that shows a balance.

The ledger is append-only. A balance is the sum of an account's entries; a
mistake is undone with a ``REVERSAL`` entry, never by editing or deleting a row.
Every award carries an idempotency key (``referral:<referred account id>``), so
one referred account can earn its inviter points once, whatever retries,
re-verifications or races happen.

Plane: the three tables are commerce (core/rule_l.py). Nothing here reads a
clinical table. The verification hook runs inside the campus-verification
transaction on the ordinary session because it needs the referred account's
profile (date of birth, campus) which sk_commerce cannot read.
"""
from __future__ import annotations

import secrets
import time
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.workflow_auth import MAXIMUM_AGE, MINIMUM_AGE, age_in_years

REFERRAL_POINTS = 50
# Rewards an inviter can earn per calendar month (Asia/Kolkata). Verifications
# past the cap are recorded as CAPPED and never paid later, so holding friends
# back to next month gains nothing.
REFERRAL_MONTHLY_CAP = 20
# A new account can add an invite code only on its first day; after that the
# referral it has (or doesn't) is final.
REFERRAL_CLAIM_WINDOW_SECONDS = 24 * 60 * 60

REASON_REFERRAL_VERIFIED = "REFERRAL_VERIFIED"
REASON_REVERSAL = "REVERSAL"
REASONS = M.POINTS_REASONS

POINTS_NOTE = "Points have no cash value and can't be exchanged, redeemed or spent on anything yet."

# No 0/O, 1/I/L: a code read aloud or typed from a screenshot is unambiguous.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8

IST = timezone(timedelta(hours=5, minutes=30))


def _id() -> str:
    return uuid.uuid4().hex


def normalize_code(raw: str | None) -> str | None:
    """The code in canonical form, or None if it cannot be one of ours."""
    if not raw:
        return None
    code = "".join(raw.split()).upper().replace("-", "")
    if len(code) != CODE_LENGTH or any(ch not in CODE_ALPHABET for ch in code):
        return None
    return code


def _new_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def ensure_code(db: Session, account_id: str) -> str:
    """The account's invite code, issued on first use and never changed after."""
    row = db.get(M.ReferralCode, account_id)
    if row:
        return row.code
    for _ in range(5):
        nested = db.begin_nested()
        try:
            db.add(M.ReferralCode(account_id=account_id, code=_new_code(), created_at=time.time()))
            db.flush()
        except IntegrityError:
            nested.rollback()
            # Either this account got a code concurrently, or the code collided.
            row = db.get(M.ReferralCode, account_id)
            if row:
                return row.code
            continue
        nested.commit()
        return db.get(M.ReferralCode, account_id).code
    raise RuntimeError("could not issue an invite code")


def attach_referral(db: Session, referred: M.Account, raw_code: str | None) -> bool:
    """Record that ``referred`` joined with ``raw_code``. False if it cannot apply.

    Not applied: an unknown or malformed code, your own code, an inviter who is
    not an active student, or an account that already has a referral (the first
    one stands; it is never changed).
    """
    code = normalize_code(raw_code)
    if not code or referred.role != "STUDENT":
        return False
    owner = db.scalar(select(M.ReferralCode).where(M.ReferralCode.code == code))
    if owner is None or owner.account_id == referred.id:
        return False
    inviter = db.get(M.Account, owner.account_id)
    if inviter is None or not inviter.active or inviter.role != "STUDENT":
        return False
    if db.scalar(select(M.Referral.id).where(M.Referral.referred_account_id == referred.id)):
        return False
    nested = db.begin_nested()
    try:
        db.add(M.Referral(id=_id(), referred_account_id=referred.id, inviter_account_id=inviter.id, code=code,
                          status="PENDING", created_at=time.time()))
        db.flush()
    except IntegrityError:
        nested.rollback()
        return False
    nested.commit()
    return True


def _adult(profile: dict) -> bool:
    """18+ from the stored date of birth. Missing or unreadable fails closed."""
    try:
        dob = date.fromisoformat(str(profile.get("dob", "")))
    except ValueError:
        return False
    return MINIMUM_AGE <= age_in_years(dob) <= MAXIMUM_AGE


def _same_person(a: dict, b: dict) -> bool:
    """Two accounts claiming the same campus roll number are treated as one person."""
    def key(p: dict) -> tuple[str, str]:
        return (" ".join(str(p.get("university", "")).split()).casefold(),
                " ".join(str(p.get("rollNumber", "")).split()).casefold())
    ka, kb = key(a), key(b)
    return bool(ka[0] and ka[1]) and ka == kb


def month_start(now: float | None = None) -> float:
    current = datetime.fromtimestamp(now if now is not None else time.time(), IST)
    return current.replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp()


def rewarded_this_month(db: Session, inviter_id: str, now: float | None = None) -> int:
    return db.scalar(select(func.count()).select_from(M.PointsEntry).where(
        M.PointsEntry.account_id == inviter_id, M.PointsEntry.reason == REASON_REFERRAL_VERIFIED,
        M.PointsEntry.created_at >= month_start(now))) or 0


def award(db: Session, *, account_id: str, amount: int, reason: str, key: str, reference_id: str = "",
          reverses_entry_id: str = "", created_by: str = "system") -> tuple[M.PointsEntry, bool]:
    """Append one entry. Returns (entry, created). The same key never writes twice."""
    if reason not in REASONS:
        raise ValueError(f"not a points reason: {reason}")
    if amount == 0:
        raise ValueError("a ledger entry moves points")
    existing = db.scalar(select(M.PointsEntry).where(M.PointsEntry.idempotency_key == key))
    if existing:
        return existing, False
    entry = M.PointsEntry(id=_id(), account_id=account_id, amount=amount, reason=reason, idempotency_key=key,
                          reference_id=reference_id, reverses_entry_id=reverses_entry_id,
                          created_by=created_by, created_at=time.time())
    nested = db.begin_nested()
    try:
        db.add(entry)
        db.flush()
    except IntegrityError:
        nested.rollback()
        return db.scalar(select(M.PointsEntry).where(M.PointsEntry.idempotency_key == key)), False
    nested.commit()
    return entry, True


def reverse(db: Session, entry_id: str, *, actor_id: str) -> tuple[M.PointsEntry, bool]:
    """Cancel an entry with an equal and opposite one. A reversal cannot itself be reversed."""
    original = db.get(M.PointsEntry, entry_id)
    if original is None:
        raise LookupError("no such ledger entry")
    if original.reason == REASON_REVERSAL:
        raise ValueError("a reversal cannot be reversed")
    return award(db, account_id=original.account_id, amount=-original.amount, reason=REASON_REVERSAL,
                 key=f"reversal:{original.id}", reverses_entry_id=original.id, created_by=actor_id)


def balance(db: Session, account_id: str) -> int:
    return int(db.scalar(select(func.coalesce(func.sum(M.PointsEntry.amount), 0))
                         .where(M.PointsEntry.account_id == account_id)) or 0)


def on_student_verified(db: Session, referred: M.Account, now: float | None = None) -> str | None:
    """Called in the transaction that makes ``referred`` a verified student.

    Resolves its PENDING referral, if any, and returns the new status. Pays the
    inviter only when the referred account is an active STUDENT, verified, and
    18+ by its stored date of birth; the inviter is an active STUDENT and not
    the same person; and the inviter is under the monthly cap. Anything else is
    recorded (INELIGIBLE / CAPPED) and never paid.
    """
    referral = db.scalar(select(M.Referral).where(M.Referral.referred_account_id == referred.id,
                                                  M.Referral.status == "PENDING"))
    if referral is None:
        return None
    profile = referred.profile or {}
    if not (referred.active and referred.role == "STUDENT" and profile.get("isVerifiedStudent") is True):
        return None   # not verified yet: stays PENDING
    referral.verified_at = now if now is not None else time.time()
    # Lock the inviter so two verifications at once cannot both slip under the cap.
    inviter = db.scalar(select(M.Account).where(M.Account.id == referral.inviter_account_id)
                        .with_for_update().execution_options(populate_existing=True))
    eligible = (inviter is not None and inviter.active and inviter.role == "STUDENT"
                and inviter.id != referred.id and _adult(profile)
                and not _same_person(profile, inviter.profile or {}))
    if not eligible:
        referral.status = "INELIGIBLE"
    elif rewarded_this_month(db, inviter.id, now) >= REFERRAL_MONTHLY_CAP:
        referral.status = "CAPPED"
    else:
        award(db, account_id=inviter.id, amount=REFERRAL_POINTS, reason=REASON_REFERRAL_VERIFIED,
              key=f"referral:{referred.id}", reference_id=referral.id)
        referral.status = "REWARDED"
    return referral.status


def referral_counts(db: Session, inviter_id: str) -> dict[str, int]:
    """invited: accounts that signed up with your code; joined: of those, now
    verified students; rewarded: of those, the ones that earned you points."""
    rows = dict(db.execute(select(M.Referral.status, func.count()).where(M.Referral.inviter_account_id == inviter_id)
                           .group_by(M.Referral.status)).all())
    invited = sum(rows.values())
    return {"invited": invited, "joined": invited - rows.get("PENDING", 0) - rows.get("INELIGIBLE", 0),
            "rewarded": rows.get("REWARDED", 0)}
