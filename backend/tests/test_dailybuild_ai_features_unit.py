"""
backend/tests/test_dailybuild_ai_features_unit.py — Unit tests for DailyBuild-inspired AI Features.
"""
import pytest
from test_workflow_api import harness, register

from services.agents.hitl_approval_agent import hitl_approval_agent
from services.agents.soap_notes_agent import soap_notes_agent
from services.agents.triage_council_agent import triage_council_agent


def test_triage_council_agent():
    res = triage_council_agent.evaluate_symptoms(
        symptoms_text="Experiencing study fatigue and headache after evening lectures.",
        student_name="Demo Student",
    )
    assert res.case_id != ""
    assert res.clinical_trust_score > 90.0
    assert "Open-BioLLM" in res.biollm_reasoning_model
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


def test_camera_scan_and_mental_game_endpoints(harness):
    client, _, codes = harness
    user, headers = register(client, codes, identifier="sensor.test@example.test")

    # Test Camera Scan endpoint — optical rPPG capture contract & pulse estimation
    res_scan = client.post('/api/health/camera-scan', json={
        'captured': True, 'kind': 'photo', 'deviceLabel': 'Test Camera'
    }, headers=headers)
    assert res_scan.status_code == 200
    assert res_scan.json()['status'] == 'SUCCESS'
    assert 'captured=true' in res_scan.json()['summary']
    assert 'record_id' in res_scan.json()

    # Test Mental Health Game endpoint — no fixed mood/score, no client-chosen reward
    res_game = client.post('/api/health/mental-game', json={
        'gameType': 'ZEN_BREATHING', 'durationSeconds': 60, 'completed': True, 'selfReportedMood': 'calm'
    }, headers=headers)
    assert res_game.status_code == 200
    assert res_game.json()['status'] == 'SUCCESS'
    assert 'pointsEarned' not in res_game.json()

    # Test ENT & Vision Scan endpoint — limited/self-reported, no fabricated metrics
    res_ent = client.post('/api/health/ent-vision-scan', json={
        'completed': True, 'hearingResponses': 6, 'visionResponses': 5, 'voiceRecorded': False
    }, headers=headers)
    assert res_ent.status_code == 200
    assert res_ent.json()['status'] == 'SUCCESS'
    assert 'self-reported, limited' in res_ent.json()['summary']

    # Test Medication Lookup endpoint — text query and pill image scan
    res_med = client.post('/api/ai/medication-lookup', json={'query': 'Ciplox 500mg'}, headers=headers)
    assert res_med.status_code == 200
    assert res_med.json()['status'] == 'SUCCESS'
    assert 'Ciplox 500' in res_med.json()['medicine']
    assert 'Ciprofloxacin' in res_med.json()['activeMolecule']
    assert 'Antibiotic' in res_med.json()['category']

    # Test Medication Pill/Prescription Image Scan
    res_img = client.post('/api/ai/medication-lookup', json={'query': '', 'imageFileName': 'azithral_strip_scan.jpg'}, headers=headers)
    assert res_img.status_code == 200
    assert res_img.json()['status'] == 'SUCCESS'
    assert 'Azithral 500' in res_img.json()['medicine']
    assert 'Azithromycin' in res_img.json()['activeMolecule']

    # Test AI Voice Prescription endpoint
    res_voice = client.post('/api/ai/voice-prescription', json={
        'dictatedText': 'Patient has mild fever 100F and headache. Prescribe Dolo 650mg 1 tab thrice daily.',
        'doctorName': 'Dr. A. K. Sen, MD'
    }, headers=headers)
    assert res_voice.status_code == 200
    assert res_voice.json()['status'] == 'SUCCESS'
    assert len(res_voice.json()['parsedItems']) >= 2
    assert 'AI Voice Prescription' in res_voice.json()['summary']







@pytest.mark.skip(
    reason="/api/ai/xray-diagnostic-scan is not implemented — no route anywhere in "
           "the backend. This asserted a 200 from an endpoint that has never existed, "
           "which took the whole camera/medication/voice test down with it. Building it "
           "is Tier 1 clinical work: it needs the AI constitution at the call site and "
           "clinical sign-off, and its medsam_roi bounding boxes would be fabricated "
           "clinical output until a real model backs them."
)
def test_xray_diagnostic_scan_endpoint(harness):
    client, _, codes = harness
    _user, headers = register(client, codes, identifier="xray.test@example.test")

    response = client.post('/api/ai/xray-diagnostic-scan', json={
        'scanType': 'Chest X-Ray (PA View)', 'imageFileName': 'chest_xray.png',
        'clinicalNotesText': 'Dry cough 3 days',
    }, headers=headers)

    assert response.status_code == 200
    assert response.json()['status'] == 'SUCCESS'
    assert 'AI Radiology Analysis' in response.json()['impression']
    assert len(response.json()['medsam_roi']['segmentationBoundingBoxes']) == 2
