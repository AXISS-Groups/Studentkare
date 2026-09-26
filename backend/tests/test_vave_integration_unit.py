"""
Unit tests for VAVE features integration in Studentkare.
Tests MedicalGuard zero-trust safety gate, Emergency Kill Switch,
JSONL Audit Logging, Observable System Log Telemetry, and AI Helper Mesh.
"""
import os

import pytest

from services.agents.ai_observability import ai_observability
from services.agents.hitl_approval_agent import hitl_approval_agent
from services.agents.medical_guard import ActionRiskLevel, PermissionScope, medical_guard
from services.agents.swarm import swarm_engine


def test_medical_guard_action_classification():
    assert medical_guard.classify_action("POSTURE_CHECK") == ActionRiskLevel.SAFE
    assert medical_guard.classify_action("SOAP_NOTES_GENERATE") == ActionRiskLevel.SENSITIVE
    assert medical_guard.classify_action("EMERGENCY_SOS_BROADCAST") == ActionRiskLevel.DESTRUCTIVE_HIGH_RISK


def test_medical_guard_permission_evaluation():
    # Reset state if frozen
    medical_guard.reset_emergency_kill_switch(reset_by="test_suite")

    # Safe action is auto approved
    res_safe = medical_guard.evaluate_request(actor="student_1", action_type="POSTURE_CHECK", active_scopes=[])
    assert res_safe["allowed"] is True
    assert res_safe["requires_approval"] is False

    # Sensitive action without scope is denied
    res_sensitive_denied = medical_guard.evaluate_request(actor="student_1", action_type="SOAP_NOTES_GENERATE", active_scopes=[])
    assert res_sensitive_denied["allowed"] is False

    # Sensitive action with vault scope is allowed
    res_sensitive_allowed = medical_guard.evaluate_request(
        actor="student_1",
        action_type="SOAP_NOTES_GENERATE",
        active_scopes=[PermissionScope.READ_PATIENT_VAULT],
    )
    assert res_sensitive_allowed["allowed"] is True

    # High-risk action by non-clinician requires approval
    res_high_risk = medical_guard.evaluate_request(actor="student_1", action_type="EMERGENCY_SOS_BROADCAST", active_scopes=[])
    assert res_high_risk["allowed"] is False
    assert res_high_risk["requires_approval"] is True


def test_emergency_kill_switch_and_audit_logging():
    # Activate emergency freeze
    freeze_res = medical_guard.activate_emergency_kill_switch(triggered_by="Dr. Test")
    assert freeze_res["status"] == "FROZEN"
    assert medical_guard.system_frozen is True

    # High-risk approval attempt while frozen must fail
    eval_frozen = medical_guard.evaluate_request(actor="Dr. Test", action_type="EMERGENCY_SOS_BROADCAST", active_scopes=[], is_clinician=True)
    assert eval_frozen["allowed"] is False
    assert eval_frozen["reason"].startswith("Emergency kill-switch active")

    # Audit trail verification
    audit_trail = medical_guard.get_audit_trail(limit=10)
    assert len(audit_trail) > 0
    assert any(e.get("action_type") == "EMERGENCY_KILL_SWITCH" for e in audit_trail)

    # Reset freeze
    reset_res = medical_guard.reset_emergency_kill_switch(reset_by="SuperAdmin Test")
    assert reset_res["status"] == "ACTIVE"
    assert medical_guard.system_frozen is False


def test_ai_observability_system_log():
    log_entry = ai_observability.log_event(
        level="SAFETY",
        agent_name="Zero-Trust Medical Guard Test",
        message="Test event logged for observable system log",
    )
    assert log_entry.level == "SAFETY"

    live_logs = ai_observability.get_live_logs(limit=10)
    assert any(entry.message == "Test event logged for observable system log" for entry in live_logs)

    telemetry = ai_observability.get_system_telemetry()
    assert telemetry.agent_health_score == 99.5
    assert "qwen2.5-clinical" in telemetry.models


@pytest.mark.asyncio
async def test_clinical_mesh_swarm_triage():
    res = await swarm_engine.execute_clinical_mesh_triage(
        patient_id="student_unit_test",
        symptom_input="Fever and severe eye strain",
    )
    assert res.status == "SUCCESS"
    assert len(res.assigned_helpers) >= 2
    assert len(res.handoff_trail) >= 3
