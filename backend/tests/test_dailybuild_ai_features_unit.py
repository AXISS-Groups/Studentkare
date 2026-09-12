"""
backend/tests/test_dailybuild_ai_features_unit.py — Unit tests for DailyBuild-inspired AI Features.
"""
from services.agents.triage_council_agent import triage_council_agent
from services.agents.soap_notes_agent import soap_notes_agent
from services.agents.hitl_approval_agent import hitl_approval_agent
from test_workflow_api import harness, register


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


def test_camera_scan_and_mental_game_endpoints(harness):
    client, _, codes = harness
    user, headers = register(client, codes, identifier="sensor.test@studentkare.test")

    # Test Camera Scan endpoint
    res_scan = client.post('/api/health/camera-scan', json={
        'heartRate': 72, 'bpSystolic': 118, 'bpDiastolic': 78, 'spo2': 99, 'tempC': 36.8,
        'skinType': 'Combination', 'skinHydration': 72, 'sunDamageScore': 12, 'rednessIndex': 'Low'
    }, headers=headers)
    assert res_scan.status_code == 200
    assert res_scan.json()['status'] == 'SUCCESS'
    assert 'rPPG Optical Camera Scan' in res_scan.json()['summary']

    # Test Mental Health Game endpoint
    res_game = client.post('/api/health/mental-game', json={
        'gameType': 'ZEN_BREATHING', 'score': 100, 'mood': 'relaxed', 'pointsEarned': 25
    }, headers=headers)
    assert res_game.status_code == 200
    assert res_game.json()['status'] == 'SUCCESS'
    assert res_game.json()['pointsEarned'] == 25

    # Test ENT & Vision Scan endpoint
    res_ent = client.post('/api/health/ent-vision-scan', json={
        'hearingScoreDb': 14.5, 'hearingStatus': 'Normal Hearing', 'visualAcuity': '20/20',
        'colorVisionScore': 100, 'vocalJitterPct': 0.38, 'vocalShimmerPct': 1.10,
        'f0FrequencyHz': 140.0, 'vocalStrainStatus': 'Healthy Vocal Resonance'
    }, headers=headers)
    assert res_ent.status_code == 200
    assert res_ent.json()['status'] == 'SUCCESS'
    assert 'ENT Hearing & Vision Interactive Checkup' in res_ent.json()['summary']

    # Test Medication Lookup endpoint
    res_med = client.post('/api/ai/medication-lookup', json={'query': 'Amoxicillin 500mg'}, headers=headers)
    assert res_med.status_code == 200
    assert res_med.json()['status'] == 'SUCCESS'
    assert 'Acetaminophen' in res_med.json()['activeMolecule'] or 'Analgesic' in res_med.json()['category']

    # Test X-Ray Diagnostic Scan endpoint
    res_xray = client.post('/api/ai/xray-diagnostic-scan', json={
        'scanType': 'Chest X-Ray (PA View)', 'imageFileName': 'chest_xray.png', 'clinicalNotesText': 'Dry cough 3 days'
    }, headers=headers)
    assert res_xray.status_code == 200
    assert res_xray.json()['status'] == 'SUCCESS'
    assert 'AI Radiology Analysis' in res_xray.json()['impression']

    # Test AI Voice Prescription endpoint
    res_voice = client.post('/api/ai/voice-prescription', json={
        'dictatedText': 'Patient has mild fever 100F and headache. Prescribe Dolo 650mg 1 tab thrice daily.',
        'doctorName': 'Dr. A. K. Sen, MD'
    }, headers=headers)
    assert res_voice.status_code == 200
    assert res_voice.json()['status'] == 'SUCCESS'
    assert len(res_voice.json()['parsedItems']) >= 2
    assert 'AI Voice Prescription' in res_voice.json()['summary']





