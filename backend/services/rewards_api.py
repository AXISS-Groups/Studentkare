"""Invite friends, points and medals: the student's own view, and the admin reversal.

Every read is the caller's own: no endpoint takes another account's id, so one
student can never see another's code, ledger, referrals or medals. Referral
counts are numbers only, never who joined.

The points and referral endpoints run on ``commerce_db`` (sk_commerce when Rule
L grants are in force): they touch only the commerce-plane tables. The medals
endpoint answers "does a record exist" from clinical tables, so it runs on the
ordinary session and returns booleans only.
"""
from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from core.settings_registry import setting
from services import medals, rewards
from services.commerce_session import commerce_db
from services.integration_config import app_domain
from services.workflow_auth import (
    REFERRAL_CODE_INPUT_MAX_LENGTH,
    StrictModel,
    authenticated_user,
    limit,
    require_super_admin,
    workflow_db,
)

router = APIRouter(prefix="/api", tags=["Rewards"])

# The endpoints that run as sk_commerce. tests/test_rewards.py checks the list.
REWARDS_COMMERCE_PATHS = (
    "GET /api/referrals/me",
    "GET /api/points/me",
    "POST /api/ops/points/entries/{entry_id}/reverse",
)

SECONDS_PER_MINUTE = 60

# Refusals carry a stable ``code`` (for the app to localise) and the English
# ``message`` (the shape services/workflow_api.py uses for consult refusals).
STUDENTS_ONLY = "REWARDS_STUDENTS_ONLY"
SIGN_IN_REQUIRED = "SIGN_IN_REQUIRED"
REFERRAL_ALREADY_SET = "REFERRAL_ALREADY_SET"
CLAIM_WINDOW_CLOSED = "REFERRAL_CLAIM_WINDOW_CLOSED"
CODE_NOT_USABLE = "REFERRAL_CODE_NOT_USABLE"
ENTRY_NOT_FOUND = "LEDGER_ENTRY_NOT_FOUND"
REVERSAL_REFUSED = "LEDGER_REVERSAL_REFUSED"
MESSAGES = {
    STUDENTS_ONLY: "Invites, points and medals are for student accounts.",
    SIGN_IN_REQUIRED: "Sign in to continue.",
    REFERRAL_ALREADY_SET: "Your account already has an invite code. It can't be changed.",
    CLAIM_WINDOW_CLOSED: "The time to add an invite code after joining has passed.",
    CODE_NOT_USABLE: "That invite code can't be used. Check it with the friend who sent it.",
    ENTRY_NOT_FOUND: "No such ledger entry.",
    REVERSAL_REFUSED: "A reversal can't itself be reversed.",
}


def refusal(status: int, code: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": MESSAGES[code]})


def _student(user: dict) -> dict:
    if user["role"] != "STUDENT":
        raise refusal(403, STUDENTS_ONLY)
    return user


def share_url(code: str) -> str:
    """The sign-up link a friend opens, on the configured app domain (platform setting / APP_DOMAIN)."""
    return rewards.invite_link(app_domain(), code)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@router.get("/referrals/me")
def my_referrals(response: Response, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    _student(user)
    _no_store(response)
    code = rewards.ensure_code(db, user["id"])
    db.commit()
    return {
        "code": code,
        "shareUrl": share_url(code),
        "counts": rewards.referral_counts(db, user["id"]),
        "pointsPerReferral": rewards.referral_points(db),
        "monthlyCap": rewards.referral_monthly_cap(db),
        "rewardedThisMonth": rewards.rewarded_this_month(db, user["id"]),
        "pointsNoteCode": rewards.POINTS_NOTE_CODE,
        "pointsNote": rewards.POINTS_NOTE,
    }


class ClaimInput(StrictModel):
    code: str = Field(min_length=1, max_length=REFERRAL_CODE_INPUT_MAX_LENGTH)


@router.post("/referrals/claim")
def claim_referral(body: ClaimInput, response: Response, user=Depends(authenticated_user),
                   db: Session = Depends(workflow_db)):
    """Add an invite code after signing up. Only on the account's first day, only once."""
    _student(user)
    _no_store(response)
    limit(db, f"referral-claim:{user['id']}", setting("rewards.referral_claim_attempts", db),
          setting("rewards.referral_claim_attempt_window_minutes", db) * SECONDS_PER_MINUTE)
    account = db.get(M.Account, user["id"])
    if account is None or not account.active:
        raise refusal(401, SIGN_IN_REQUIRED)
    if db.scalar(select(M.Referral.id).where(M.Referral.referred_account_id == account.id)):
        raise refusal(409, REFERRAL_ALREADY_SET)
    if time.time() - float(account.created_at or 0) > rewards.claim_window_seconds(db):
        raise refusal(409, CLAIM_WINDOW_CLOSED)
    if not rewards.attach_referral(db, account, body.code):
        db.rollback()
        raise refusal(422, CODE_NOT_USABLE)
    db.commit()
    return {"applied": True}


@router.get("/points/me")
def my_points(response: Response, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    _no_store(response)
    rows = db.scalars(select(M.PointsEntry).where(M.PointsEntry.account_id == user["id"])
                      .order_by(M.PointsEntry.created_at.desc(), M.PointsEntry.id)
                      .limit(setting("rewards.ledger_entries_shown", db))).all()
    return {
        "balance": rewards.balance(db, user["id"]),
        "entries": [{"id": e.id, "amount": e.amount, "reason": e.reason, "createdAt": e.created_at,
                     "reversesEntryId": e.reverses_entry_id or None} for e in rows],
        "redeemable": False,
        "pointsNoteCode": rewards.POINTS_NOTE_CODE,
        "pointsNote": rewards.POINTS_NOTE,
    }


@router.get("/medals/me")
def my_medals(response: Response, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    _no_store(response)
    account = db.get(M.Account, user["id"])
    if account is None:
        raise refusal(401, SIGN_IN_REQUIRED)
    return {"items": medals.medals_payload(db, account)}


@router.post("/ops/points/entries/{entry_id}/reverse")
def reverse_entry(entry_id: str, user=Depends(require_super_admin),
                  db: Session = Depends(commerce_db)):
    """Cancel an award (e.g. a fraudulent referral) with an opposite entry. Idempotent."""
    try:
        entry, created = rewards.reverse(db, entry_id, actor_id=user["id"])
    except LookupError:
        raise refusal(404, ENTRY_NOT_FOUND) from None
    except ValueError:
        raise refusal(409, REVERSAL_REFUSED) from None
    if created:
        db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action="POINTS_REVERSED",
                               resource_id=entry_id, created_at=time.time()))
    db.commit()
    return {"id": entry.id, "amount": entry.amount, "reason": entry.reason, "reversesEntryId": entry.reverses_entry_id,
            "created": created}
