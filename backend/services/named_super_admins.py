"""Named super admins, and retiring the shared one (audit H3).

The shared team account ``superadmin@`` gives the whole platform to whoever holds
its PIN, so the audit log can't say which person acted. This replaces it:

1. A super admin creates a **named** super admin: one person's work email and name
   (``POST /ops/super-admins``). Audited, and raised on the ops feed.
2. That person signs in on the staff page with the emailed code. A named super
   admin must use an authenticator whatever the 2FA policy says
   (``workflow_auth.two_factor_required``), so the first sign-in is held until they
   set one up.
3. They sign out and sign in again, this time through the authenticator step.
   That first sign-in with TOTP is recorded (``totp_signed_in_at``, in
   ``integrations.challenge_2fa``).
4. Only then can a named super admin **retire the shared one**
   (``POST /ops/super-admins/retire-shared``): the team ``superadmin@`` account is
   disabled and signed out everywhere, and can't be rotated back on.

Nothing here runs by itself. docs/guides/team-accounts.md has the steps.
"""
from __future__ import annotations

import time
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from core import workflow_models as M
from services import ops_feed, twofa_store
from services.team_accounts import SUPERADMIN_RETIRED, end_sessions, is_retired
from services.workflow_auth import (
    StrictModel,
    normalize_identifier,
    require_super_admin,
    workflow_db,
)

router = APIRouter(prefix="/api/ops/super-admins", tags=["Named super admins"])

SHARED_SUPER_ADMIN_ID = "team-superadmin"
NOT_READY = "NO_NAMED_SUPER_ADMIN_SIGNED_IN_WITH_TOTP"
USE_NAMED = "RETIRE_FROM_A_NAMED_ACCOUNT"
CONFIRM_WORD = "RETIRE"


def _audit(db: DBSession, actor_id: str, action: str, resource_id: str) -> None:
    db.add(M.WorkflowAudit(id=uuid.uuid4().hex, actor_id=actor_id, action=action, resource_id=resource_id,
                           created_at=time.time()))


def _shared(db: DBSession) -> M.Account | None:
    account = db.get(M.Account, SHARED_SUPER_ADMIN_ID)
    return account if account is not None and account.is_team_account and account.role == "SUPER_ADMIN" else None


def _signed_in_with_totp(db: DBSession) -> list[M.NamedSuperAdmin]:
    """Named super admins whose account is active and who have signed in through the authenticator."""
    rows = db.scalars(select(M.NamedSuperAdmin).where(M.NamedSuperAdmin.totp_signed_in_at > 0)).all()
    out = []
    for row in rows:
        account = db.get(M.Account, row.account_id)
        if account is not None and account.active and account.role == "SUPER_ADMIN" and twofa_store.is_enabled(db, account.id):
            out.append(row)
    return out


def _state(db: DBSession, viewer_id: str) -> dict:
    named = db.scalars(select(M.NamedSuperAdmin).order_by(M.NamedSuperAdmin.created_at)).all()
    items = []
    for row in named:
        account = db.get(M.Account, row.account_id)
        if account is None:
            continue
        items.append({"id": account.id, "fullName": account.full_name, "identifier": account.identifier,
                      "active": account.active is True, "twoFactorEnabled": twofa_store.is_enabled(db, account.id),
                      "createdAt": row.created_at, "totpSignedInAt": row.totp_signed_in_at or None,
                      "isSelf": account.id == viewer_id})
    shared = _shared(db)
    ready = bool(_signed_in_with_totp(db))
    viewer_named = db.get(M.NamedSuperAdmin, viewer_id) is not None
    return {
        "items": items,
        "shared": None if shared is None else {"id": shared.id, "identifier": shared.identifier,
                                                "active": shared.active is True, "retired": is_retired(db, shared)},
        "readyToRetire": ready,
        "viewerIsNamed": viewer_named,
    }


@router.get("")
def named_super_admins(response: Response, user=Depends(require_super_admin), db: DBSession = Depends(workflow_db)):
    response.headers["Cache-Control"] = "no-store"
    return _state(db, user["id"])


class NamedSuperAdminInput(StrictModel):
    email: str = Field(min_length=3, max_length=254)
    fullName: str = Field(min_length=2, max_length=120)


@router.post("", status_code=201)
def create_named(body: NamedSuperAdminInput, response: Response, user=Depends(require_super_admin),
                 db: DBSession = Depends(workflow_db)):
    """One person's super admin account. They sign in with an emailed code, then must set up an authenticator."""
    response.headers["Cache-Control"] = "no-store"
    try:
        identifier = normalize_identifier(body.email, "EMAIL")
    except (ValueError, HTTPException):
        raise HTTPException(422, "Enter the person's work email.") from None
    if "@" not in identifier:
        raise HTTPException(422, "Enter the person's work email.")
    now = time.time()
    account = M.Account(id=str(uuid.uuid4()), identifier=identifier, channel="EMAIL", full_name=" ".join(body.fullName.split()),
                        role="SUPER_ADMIN", active=True, profile={}, created_at=now, is_team_account=False)
    db.add(account)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account already exists for that email.") from None
    db.add(M.NamedSuperAdmin(account_id=account.id, created_by=user["id"], created_at=now, totp_signed_in_at=0.0))
    _audit(db, user["id"], "NAMED_SUPER_ADMIN_CREATED", account.id)
    ops_feed.publish(db, "NAMED_SUPER_ADMIN_CREATED", "ACCOUNT", severity="CRITICAL",
                     summary="A named super admin account was created. It must set up an authenticator on first sign-in.",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=account.id,
                     resource_type="account", resource_id=account.id)
    db.commit()
    return _state(db, user["id"])


class RetireInput(StrictModel):
    # Typed by the person, so the button alone can't do it.
    confirm: Literal["RETIRE"]


@router.post("/retire-shared")
def retire_shared(body: RetireInput, response: Response, user=Depends(require_super_admin),
                  db: DBSession = Depends(workflow_db)):
    """Disables the shared ``superadmin@`` team account, once a named super admin has signed in with TOTP."""
    response.headers["Cache-Control"] = "no-store"
    if db.get(M.NamedSuperAdmin, user["id"]) is None:
        raise HTTPException(403, {"code": USE_NAMED,
                                  "message": "Sign in with your own named super admin account to retire the shared one."})
    if not _signed_in_with_totp(db):
        raise HTTPException(409, {"code": NOT_READY,
                                  "message": "First, a named super admin signs in with their authenticator."})
    shared = _shared(db)
    if shared is None:
        raise HTTPException(404, "There is no shared super admin account.")
    if is_retired(db, shared):
        return _state(db, user["id"])
    shared.active = False
    ended = end_sessions(db, shared.id)
    _audit(db, user["id"], SUPERADMIN_RETIRED, shared.id)
    ops_feed.publish(db, SUPERADMIN_RETIRED, "ACCOUNT", severity="CRITICAL",
                     summary=f"The shared super admin team account was retired; {ended} session(s) ended.",
                     actor_id=user["id"], actor_role=user.get("role", ""), subject_id=shared.id,
                     resource_type="account", resource_id=shared.id)
    db.commit()
    return _state(db, user["id"])
