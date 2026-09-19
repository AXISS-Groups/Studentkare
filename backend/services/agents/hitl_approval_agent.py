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


PENDING_ACTIONS_REGISTRY: List[PendingAction] = [
    PendingAction(
        id="act_01",
        action_type="PRESCRIPTION_APPROVAL",
        title="Rx Prescription Order #rx_94102 Review",
        patient_name="Demo Student",
        requested_by="Rx Extractor AI Agent",
        summary="Extracted items: Paracetamol 650mg & Vitamin D3 60K. Requires doctor signature sign-off.",
        risk_level="MEDIUM",
        status="PENDING_DOCTOR_APPROVAL",
        created_at="15 mins ago",
    ),
    PendingAction(
        id="act_02",
        action_type="EMERGENCY_SOS_BROADCAST",
        title="Campus O- Blood SOS Alert #sos_3104",
        patient_name="Rohan Verma",
        requested_by="Campus Blood Emergency Agent",
        summary="Requesting urgent dispatch of SMS/WhatsApp alert to 5 campus O- donors.",
        risk_level="HIGH",
        status="PENDING_CLINICIAN_APPROVAL",
        created_at="5 mins ago",
    ),
]


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

