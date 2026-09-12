"""
backend/tests/test_dailybuild_ai_features_unit.py — Unit tests for DailyBuild-inspired AI Features.
"""
from services.agents.triage_council_agent import triage_council_agent
from services.agents.soap_notes_agent import soap_notes_agent
from services.agents.hitl_approval_agent import hitl_approval_agent


def test_triage_council_agent():
    res = triage_council_agent.evaluate_symptoms(
        symptoms_text="Experiencing study fatigue and headache after evening lectures.",
        student_name="Demo Student",
    )
    assert res.case_id != ""
    assert res.clinical_trust_score > 90.0
    assert "Dr. A. K. Sen, MD" in res.physician_opinion.doctor_name
    assert "Tele-Mental Health Specialist" in res.mental_health_opinion.doctor_role
    assert "Clinical Pharmacist" in res.pharmacist_opinion.doctor_role


def test_soap_notes_agent():
    res = soap_notes_agent.generate_soap_note(
        raw_notes="Patient complains of headache and mild evening fever (99.2 F) following late-night study sessions.",
        patient_name="Demo Student",
        doctor_name="Dr. A. K. Sen, MD",
    )
    assert res.note_id != ""
    assert "Patient presents with" in res.subjective
    assert "Vitals" in res.objective
    assert "Clinical Impression" in res.assessment
    assert "1. Hydration" in res.plan


def test_hitl_approval_agent():
    actions = hitl_approval_agent.get_pending_actions()
    assert len(actions) > 0

    app_res = hitl_approval_agent.approve_action(actions[0].id, "Dr. A. K. Sen, MD")
    assert app_res["status"] == "SUCCESS"
    assert app_res["action_id"] == actions[0].id
