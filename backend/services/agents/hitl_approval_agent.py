"""
services.agents.hitl_approval_agent — Human-in-the-Loop Clinician & Admin Approval Agent.
Manages high-stakes action approvals (Rx prescription fulfillment, emergency SOS dispatches, claims).
Inspired by DailyBuild Day 48 (Human-in-the-Loop).
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List

from pydantic import BaseModel

from services.agents.medical_guard import ActionRiskLevel, PermissionScope, medical_guard


class PendingAction(BaseModel):
    id: str
    action_type: str
    title: str
    patient_name: str
    requested_by: str
    summary: str
    risk_level: str
    status: str
    created_at: str


# Held actions are added only by the agents that hold them. None does yet, so the
# queue is empty. It used to be seeded with two invented actions — one naming a
# student and asking to "dispatch" a blood SOS — that a staff member could
# "approve", which logged an SOS-dispatch scope for something that never existed.
PENDING_ACTIONS_REGISTRY: List[PendingAction] = []


class HITLApprovalAgent:
    def __init__(self) -> None:
        self.agent_name = "Human-in-the-Loop Approval Agent"
        self.version = "1.1.0"

    def get_pending_actions(self) -> List[PendingAction]:
        """Returns list of pending high-stakes actions requiring clinician approval."""
        if medical_guard.system_frozen:
            return []
        return PENDING_ACTIONS_REGISTRY

    def approve_action(self, action_id: str, approver_name: str = "Staff") -> Dict[str, Any]:
        """Approves a high-stakes action. Checks Zero-Trust safety gate & logs audit event."""
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

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        for act in PENDING_ACTIONS_REGISTRY:
            if act.id == action_id:
                if act.status != "PENDING_DOCTOR_APPROVAL" and act.status != "PENDING_CLINICIAN_APPROVAL":
                    return {"status": "NOT_PENDING", "message": "Action is not awaiting approval."}

                act.status = "APPROVED_BY_CLINICIAN"

                # Log to medical audit ledger
                medical_guard.log_audit_event(
                    actor=approver_name,
                    action_type=act.action_type,
                    risk_level=act.risk_level,
                    granted_scopes=[PermissionScope.PROPOSE_TREATMENT, PermissionScope.EXECUTE_SOS_DISPATCH],
                    outcome="APPROVED_BY_CLINICIAN",
                    details={"action_id": action_id, "title": act.title, "patient": act.patient_name},
                )

                return {
                    "status": "SUCCESS",
                    "action_id": action_id,
                    "approved_by": approver_name,
                    "approved_at": now_str,
                    "message": f"Action '{act.title}' approved by {approver_name}.",
                }

        return {
            "status": "NOT_FOUND",
            "action_id": action_id,
            "approved_by": approver_name,
            "message": "Action not found.",
        }


hitl_approval_agent = HITLApprovalAgent()

