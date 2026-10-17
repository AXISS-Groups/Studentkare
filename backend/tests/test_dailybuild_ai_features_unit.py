"""
backend/tests/test_dailybuild_ai_features_unit.py — Unit tests for DailyBuild-inspired AI Features.
"""
import pytest
from test_workflow_api import harness, register

from services.agents.hitl_approval_agent import hitl_approval_agent


def test_hitl_queue_holds_nothing_invented():
    # No agent holds actions yet, so there is nothing to approve — and approving
    # an id that was never held is refused, not recorded.
    assert hitl_approval_agent.get_pending_actions() == []
    assert hitl_approval_agent.approve_action("act_02", "Dr. Test")["status"] == "NOT_FOUND"


def test_hitl_approves_a_held_action_once(monkeypatch):
    import importlib
    module = importlib.import_module("services.agents.hitl_approval_agent")
    held = module.PendingAction(id="act_x", action_type="PRESCRIPTION_APPROVAL", title="Held", patient_name="",
                                requested_by="agent", summary="", risk_level="MEDIUM",
                                status="PENDING_DOCTOR_APPROVAL", created_at="")
    monkeypatch.setattr(module, "PENDING_ACTIONS_REGISTRY", [held])
    assert hitl_approval_agent.approve_action("act_x", "Dr. Test")["status"] == "SUCCESS"
    assert hitl_approval_agent.approve_action("act_x", "Dr. Test")["status"] == "NOT_PENDING"


def test_camera_scan_and_mental_game_endpoints(harness):
    client, _, codes = harness
    user, headers = register(client, codes, identifier="sensor.test@example.test")

    # The camera-scan endpoint is gone: it filed a 'Vitals & Optical Scan'
    # record with no image in it. Photos go to /health/documents.
    assert client.post('/api/health/camera-scan', json={'captured': True}, headers=headers).status_code in (404, 405)

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


@pytest.mark.parametrize(("method", "path"), [
    ("post", "/api/triage/council-eval"),
    ("post", "/api/records/generate-soap"),
    ("post", "/api/ai/voice-prescription"),
    ("post", "/api/v1/agents/mesh-triage"),
    ("get", "/api/v1/agents/system-log"),
])
def test_fixed_clinical_output_endpoints_are_gone(harness, method, path):
    # These returned canned triage opinions, fixed vitals, keyword-picked
    # medicines and hardcoded telemetry to any signed-in user. Clinician
    # decision support belongs to M18, not this app (AGENTS.md guardrail 5).
    client, _, codes = harness
    _user, headers = register(client, codes, identifier="gone.endpoint@example.test")
    if method == "post":
        response = client.post(path, json={}, headers=headers)
    else:
        response = client.get(path, headers=headers)
    assert response.status_code == 404


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
