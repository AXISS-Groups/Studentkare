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
from services import medals, rewards
from services.commerce_session import commerce_db
from services.integration_config import app_domain
from services.workflow_auth import (
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


def _student(user: dict) -> dict:
    if user["role"] != "STUDENT":
        raise HTTPException(403, "Invites, points and medals are for student accounts.")
    return user


def share_url(code: str) -> str:
    """The sign-up link a friend opens. The domain is the configured APP_DOMAIN."""
    return f"https://{app_domain()}/signup?ref={code}"


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
        "pointsPerReferral": rewards.REFERRAL_POINTS,
        "monthlyCap": rewards.REFERRAL_MONTHLY_CAP,
        "rewardedThisMonth": rewards.rewarded_this_month(db, user["id"]),
        "pointsNote": rewards.POINTS_NOTE,
    }


class ClaimInput(StrictModel):
    code: str = Field(min_length=1, max_length=32)


@router.post("/referrals/claim")
def claim_referral(body: ClaimInput, response: Response, user=Depends(authenticated_user),
                   db: Session = Depends(workflow_db)):
    """Add an invite code after signing up. Only on the account's first day, only once."""
    _student(user)
    _no_store(response)
    limit(db, f"referral-claim:{user['id']}", 5, 3600)
    account = db.get(M.Account, user["id"])
    if account is None or not account.active:
        raise HTTPException(401, "Sign in to continue.")
    if db.scalar(select(M.Referral.id).where(M.Referral.referred_account_id == account.id)):
        raise HTTPException(409, "Your account already has an invite code. It can't be changed.")
    if time.time() - float(account.created_at or 0) > rewards.REFERRAL_CLAIM_WINDOW_SECONDS:
        raise HTTPException(409, "An invite code can only be added on the day you join.")
    if not rewards.attach_referral(db, account, body.code):
        db.rollback()
        raise HTTPException(422, "That invite code can't be used. Check it with the friend who sent it.")
    db.commit()
    return {"applied": True}


@router.get("/points/me")
def my_points(response: Response, user=Depends(authenticated_user), db: Session = Depends(commerce_db)):
    _no_store(response)
    rows = db.scalars(select(M.PointsEntry).where(M.PointsEntry.account_id == user["id"])
                      .order_by(M.PointsEntry.created_at.desc(), M.PointsEntry.id).limit(50)).all()
    return {
        "balance": rewards.balance(db, user["id"]),
        "entries": [{"id": e.id, "amount": e.amount, "reason": e.reason, "createdAt": e.created_at,
                     "reversesEntryId": e.reverses_entry_id or None} for e in rows],
        "redeemable": False,
        "pointsNote": rewards.POINTS_NOTE,
    }


@router.get("/medals/me")
def my_medals(response: Response, user=Depends(authenticated_user), db: Session = Depends(workflow_db)):
    _student(user)
    _no_store(response)
    account = db.get(M.Account, user["id"])
    if account is None:
        raise HTTPException(401, "Sign in to continue.")
    return {"items": medals.medals_payload(db, account)}


@router.post("/ops/points/entries/{entry_id}/reverse")
def reverse_entry(entry_id: str, user=Depends(require_super_admin),
                  db: Session = Depends(commerce_db)):
    """Cancel an award (e.g. a fraudulent referral) with an opposite entry. Idempotent."""
    try:
        entry, created = rewards.reverse(db, entry_id, actor_id=user["id"])
    except LookupError:
        raise HTTPException(404, "No such ledger entry.") from None
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    if created:
        db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=user["id"], action="POINTS_REVERSED",
                               resource_id=entry_id, created_at=time.time()))
    db.commit()
    return {"id": entry.id, "amount": entry.amount, "reason": entry.reason, "reversesEntryId": entry.reverses_entry_id,
            "created": created}
