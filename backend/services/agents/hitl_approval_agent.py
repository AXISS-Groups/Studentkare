"""
services.agents.hitl_approval_agent — Human-in-the-Loop Clinician & Admin Approval Agent.
Manages high-stakes action approvals (Rx prescription fulfillment, emergency SOS dispatches, claims).
Inspired by DailyBuild Day 48 (Human-in-the-Loop).

The queue is a Postgres table (care_hitl_actions), not a module-level list (audit M2):
it survives a restart, is shared across replicas, and every row is scoped to the
student it is about and the clinician who must release it.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from core import workflow_models as M
from services.agents.medical_guard import ActionRiskLevel, PermissionScope, medical_guard

# The two states a held action may sit in before a clinician releases it.
PENDING_STATUSES = ("PENDING_DOCTOR_APPROVAL", "PENDING_CLINICIAN_APPROVAL")


class PendingAction(BaseModel):
    """The wire shape the approval console reads.

    Deliberately the nine fields the frontend already renders; the scoping ids
    (patient, campus, assigned clinician) live on the care_hitl_actions row and are
    not serialized here, so the JSON contract stays byte-stable.
    """
    id: str
    action_type: str
    title: str
    patient_name: str
    requested_by: str
    summary: str
    risk_level: str
    status: str
    created_at: str


def _campus_key(value: str) -> str:
    """The campus-scoping key: whitespace-collapsed and casefolded, matching
    services.workflow_api._campus_key so a held action lands in the same bucket."""
    return " ".join((value or "").split()).casefold()


class HITLApprovalAgent:
    def __init__(self) -> None:
        self.agent_name = "Human-in-the-Loop Approval Agent"
        self.version = "1.2.0"

    # --- reading the queue ----------------------------------------------------

    def get_pending_actions(
        self,
        db: Session,
        *,
        campus: Optional[str] = None,
        patient_id: Optional[str] = None,
    ) -> List[PendingAction]:
        """The held actions still awaiting sign-off, scoped to a campus and/or patient.

        A frozen system hides everything: nothing is held up for release while the
        kill switch is on. ``campus``/``patient_id`` are optional filters (None means
        "every", which is what the super admin reads). Rows come straight from the
        queue table, so they survive a restart and every replica sees the same ones.
        """
        if medical_guard.system_frozen:
            return []
        query = select(M.HitlAction).where(M.HitlAction.status.in_(PENDING_STATUSES))
        if campus is not None:
            query = query.where(M.HitlAction.campus == _campus_key(campus))
        if patient_id is not None:
            query = query.where(M.HitlAction.patient_id == patient_id)
        rows = db.scalars(query).all()
        return [self._to_pending(row) for row in rows]

    @staticmethod
    def _to_pending(row: M.HitlAction) -> PendingAction:
        return PendingAction(
            id=row.id,
            action_type=row.action_type,
            title=row.title,
            patient_name=row.patient_name,
            requested_by=row.requested_by,
            summary=row.summary,
            risk_level=row.risk_level,
            status=row.status,
            created_at=row.created_at,
        )

    # --- holding an action ----------------------------------------------------

    def hold_action(
        self,
        db: Session,
        *,
        action_type: str,
        title: str,
        patient_id: str,
        patient_name: str = "",
        campus: str = "",
        requested_by: str = "",
        summary: str = "",
        risk_level: str = "",
        assigned_clinician: str,
    ) -> M.HitlAction:
        """Hold a high-stakes action for clinician sign-off. Staged, never commits.

        The caller must name the student the action is about and the clinician who
        will release it; a held action without an assignee is refused at the door,
        because a row nobody is accountable for must not enter the queue. No agent
        holds actions yet, so the queue stays empty — this is the only writer.
        """
        if not assigned_clinician:
            raise ValueError("A held action must name the clinician who will release it.")
        row = M.HitlAction(
            id=uuid.uuid4().hex,
            action_type=action_type,
            title=title,
            patient_name=patient_name,
            requested_by=requested_by,
            summary=summary,
            risk_level=risk_level,
            status="PENDING_DOCTOR_APPROVAL",
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            patient_id=patient_id,
            campus=_campus_key(campus),
            assigned_clinician=assigned_clinician,
        )
        db.add(row)
        db.flush()
        return row

    # --- releasing an action --------------------------------------------------

    def approve_action(
        self,
        db: Session,
        action_id: str,
        approver_name: str = "Staff",
        *,
        campus: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Release a held action. Staged, never commits: the caller owns the transaction.

        Rejects an id that was never held — or lives in another campus when the
        caller's scope is one (``NOT_FOUND``, so a scoped staff member neither sees
        nor can release a row outside their campus) — one that is no longer pending
        (``NOT_PENDING`` — already processed or stale), and one held without an
        assigned clinician (``NOT_ASSIGNED``). A frozen system releases nothing.
        """
        if medical_guard.system_frozen:
            medical_guard.log_audit_event(
                actor=approver_name,
                action_type="APPROVE_ACTION_FAILED",
                risk_level=ActionRiskLevel.DESTRUCTIVE_HIGH_RISK,
                granted_scopes=[],
                outcome="DENIED_SYSTEM_FROZEN",
                details={"action_id": action_id},
            )
            return {"status": "FROZEN", "message": "Emergency kill-switch is active. Action approvals blocked."}

        row = db.get(M.HitlAction, action_id)
        if row is None:
            return {"status": "NOT_FOUND", "action_id": action_id, "approved_by": approver_name,
                    "message": "Action not found."}
        if campus is not None and row.campus != _campus_key(campus):
            # Out of the caller's campus scope: answer as unknown, not "exists elsewhere".
            return {"status": "NOT_FOUND", "action_id": action_id, "approved_by": approver_name,
                    "message": "Action not found."}
        if row.status not in PENDING_STATUSES:
            return {"status": "NOT_PENDING", "action_id": action_id, "approved_by": approver_name,
                    "message": "Action is not awaiting approval."}
        if not row.assigned_clinician:
            return {"status": "NOT_ASSIGNED", "action_id": action_id, "approved_by": approver_name,
                    "message": "Action was held without an assigned clinician."}

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        row.status = "APPROVED_BY_CLINICIAN"
        db.flush()

        # Log to the medical audit ledger
        medical_guard.log_audit_event(
            actor=approver_name,
            action_type=row.action_type,
            risk_level=row.risk_level,
            granted_scopes=[PermissionScope.PROPOSE_TREATMENT, PermissionScope.EXECUTE_SOS_DISPATCH],
            outcome="APPROVED_BY_CLINICIAN",
            details={"action_id": action_id, "title": row.title, "patient": row.patient_name},
        )

        return {
            "status": "SUCCESS",
            "action_id": action_id,
            "approved_by": approver_name,
            "approved_at": now_str,
            "message": f"Action '{row.title}' approved by {approver_name}.",
        }


hitl_approval_agent = HITLApprovalAgent()
