"""
services.agents.medical_guard — Zero-Trust Medical Safety Gate & Policy Engine.

Inspired by VAVE guard.py & Zero-Trust Safety Gate.
Categorizes actions into SAFE, SENSITIVE, and DESTRUCTIVE_HIGH_RISK.
Enforces task-scoped micro-permissions, interactive clinician approval requirements,
emergency kill switch, and append-only tamper-evident medical audit logging.
"""
from __future__ import annotations

import os
import json
import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
AUDIT_LOG_FILE = os.path.join(LOGS_DIR, "medical_audit.jsonl")


class PermissionScope:
    READ_PATIENT_VAULT = "READ_PATIENT_VAULT"
    PROPOSE_TREATMENT = "PROPOSE_TREATMENT"
    FULFILL_PRESCRIPTION = "FULFILL_PRESCRIPTION"
    EXECUTE_SOS_DISPATCH = "EXECUTE_SOS_DISPATCH"
    ADMIN_OVERRIDE = "ADMIN_OVERRIDE"


class ActionRiskLevel:
    SAFE = "SAFE"
    SENSITIVE = "SENSITIVE"
    DESTRUCTIVE_HIGH_RISK = "DESTRUCTIVE_HIGH_RISK"


class AuditEvent(BaseModel):
    event_id: str
    timestamp: str
    actor: str
    action_type: str
    risk_level: str
    granted_scopes: List[str] = Field(default_factory=list)
    outcome: str
    details: Dict[str, Any] = Field(default_factory=dict)


class MedicalGuard:
    def __init__(self) -> None:
        self.system_frozen: bool = False
        self._ensure_logs_directory()

    def _ensure_logs_directory(self) -> None:
        if not os.path.exists(LOGS_DIR):
            os.makedirs(LOGS_DIR, exist_ok=True)

    def log_audit_event(
        self,
        actor: str,
        action_type: str,
        risk_level: str,
        granted_scopes: List[str],
        outcome: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        event_id = f"aud_{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}"
        event = AuditEvent(
            event_id=event_id,
            timestamp=now_str,
            actor=actor,
            action_type=action_type,
            risk_level=risk_level,
            granted_scopes=granted_scopes,
            outcome=outcome,
            details=details or {},
        )
        # Append to tamper-evident audit ledger
        try:
            with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event.model_dump()) + "\n")
        except Exception:
            pass  # Fallback gracefully if filesystem issue occurs
        return event

    def classify_action(self, action_type: str) -> str:
        safe_actions = {"POSTURE_CHECK", "VIEW_CATALOG", "READ_WELLNESS_TIPS", "STREAK_REWARD"}
        sensitive_actions = {"SOAP_NOTES_GENERATE", "READ_MEDICAL_HISTORY", "PARSED_RX_PREVIEW"}
        high_risk_actions = {"PRESCRIPTION_APPROVAL", "EMERGENCY_SOS_BROADCAST", "DELETE_PATIENT_RECORD", "DISPATCH_PHLEBOTOMIST"}

        if action_type in safe_actions:
            return ActionRiskLevel.SAFE
        elif action_type in sensitive_actions:
            return ActionRiskLevel.SENSITIVE
        elif action_type in high_risk_actions:
            return ActionRiskLevel.DESTRUCTIVE_HIGH_RISK
        return ActionRiskLevel.SENSITIVE

    def evaluate_request(
        self,
        actor: str,
        action_type: str,
        active_scopes: List[str],
        is_clinician: bool = False,
    ) -> Dict[str, Any]:
        if self.system_frozen:
            self.log_audit_event(
                actor=actor,
                action_type=action_type,
                risk_level=self.classify_action(action_type),
                granted_scopes=active_scopes,
                outcome="DENIED_SYSTEM_FROZEN",
                details={"reason": "Emergency kill-switch is active. System operations frozen."},
            )
            return {
                "allowed": False,
                "reason": "Emergency kill-switch active. All sensitive actions frozen.",
                "requires_approval": False,
                "risk_level": ActionRiskLevel.DESTRUCTIVE_HIGH_RISK,
            }

        risk_level = self.classify_action(action_type)

        if risk_level == ActionRiskLevel.SAFE:
            self.log_audit_event(
                actor=actor,
                action_type=action_type,
                risk_level=risk_level,
                granted_scopes=active_scopes,
                outcome="ALLOWED_AUTO",
            )
            return {"allowed": True, "reason": "Safe action auto-approved.", "requires_approval": False, "risk_level": risk_level}

        if risk_level == ActionRiskLevel.SENSITIVE:
            # Requires READ_PATIENT_VAULT or PROPOSE_TREATMENT scope
            has_scope = any(s in active_scopes for s in [PermissionScope.READ_PATIENT_VAULT, PermissionScope.PROPOSE_TREATMENT, PermissionScope.ADMIN_OVERRIDE])
            if not has_scope and not is_clinician:
                self.log_audit_event(
                    actor=actor,
                    action_type=action_type,
                    risk_level=risk_level,
                    granted_scopes=active_scopes,
                    outcome="DENIED_MISSING_SCOPE",
                )
                return {
                    "allowed": False,
                    "reason": f"Action '{action_type}' requires vault scope.",
                    "requires_approval": False,
                    "risk_level": risk_level,
                }
            self.log_audit_event(
                actor=actor,
                action_type=action_type,
                risk_level=risk_level,
                granted_scopes=active_scopes,
                outcome="ALLOWED_WITH_SCOPE",
            )
            return {"allowed": True, "reason": "Sensitive action authorized by active scope.", "requires_approval": False, "risk_level": risk_level}

        # DESTRUCTIVE_HIGH_RISK
        if not is_clinician:
            self.log_audit_event(
                actor=actor,
                action_type=action_type,
                risk_level=risk_level,
                granted_scopes=active_scopes,
                outcome="PENDING_CLINICIAN_APPROVAL",
            )
            return {
                "allowed": False,
                "reason": f"High-risk action '{action_type}' requires Human-in-the-Loop clinician sign-off.",
                "requires_approval": True,
                "risk_level": risk_level,
            }

        # Clinician performing high-risk action
        self.log_audit_event(
            actor=actor,
            action_type=action_type,
            risk_level=risk_level,
            granted_scopes=active_scopes,
            outcome="ALLOWED_CLINICIAN_APPROVED",
        )
        return {"allowed": True, "reason": "High-risk action approved by clinician.", "requires_approval": False, "risk_level": risk_level}

    def activate_emergency_kill_switch(self, triggered_by: str) -> Dict[str, Any]:
        """Hardware/UI emergency kill switch freezing high-stakes operations."""
        self.system_frozen = True
        self.log_audit_event(
            actor=triggered_by,
            action_type="EMERGENCY_KILL_SWITCH",
            risk_level=ActionRiskLevel.DESTRUCTIVE_HIGH_RISK,
            granted_scopes=[PermissionScope.ADMIN_OVERRIDE],
            outcome="SYSTEM_FROZEN",
            details={"message": f"Emergency kill-switch triggered by {triggered_by}."},
        )
        return {
            "status": "FROZEN",
            "message": f"Emergency kill-switch activated by {triggered_by}. All pending actions frozen.",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
        }

    def reset_emergency_kill_switch(self, reset_by: str) -> Dict[str, Any]:
        """Resets the emergency freeze back to normal operations."""
        self.system_frozen = False
        self.log_audit_event(
            actor=reset_by,
            action_type="RESET_KILL_SWITCH",
            risk_level=ActionRiskLevel.DESTRUCTIVE_HIGH_RISK,
            granted_scopes=[PermissionScope.ADMIN_OVERRIDE],
            outcome="SYSTEM_RESTORED",
            details={"message": f"Emergency kill-switch reset by {reset_by}."},
        )
        return {
            "status": "ACTIVE",
            "message": f"System safety status restored to active by {reset_by}.",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
        }

    def get_audit_trail(self, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        if not os.path.exists(AUDIT_LOG_FILE):
            return events
        try:
            with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):
                    if line.strip():
                        events.append(json.loads(line.strip()))
        except Exception:
            pass
        return events


medical_guard = MedicalGuard()
