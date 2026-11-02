"""
backend/tests/test_dailybuild_ai_features_unit.py — Unit tests for DailyBuild-inspired AI Features.
"""
import pytest
from test_workflow_api import harness, register

from core import workflow_models as M
from services.agents.hitl_approval_agent import hitl_approval_agent


def test_hitl_queue_holds_nothing_invented(harness):
    # No agent holds actions yet, so the queue is empty — and approving an id that
    # was never held is refused, not recorded. The queue is a table now, so a fresh
    # database has nothing in it.
    _, factory, _ = harness
    with factory() as db:
        assert hitl_approval_agent.get_pending_actions(db) == []
        assert hitl_approval_agent.approve_action(db, "act_02", "Dr. Test")["status"] == "NOT_FOUND"


def test_hitl_holds_then_approves_a_held_action_once(harness):
    # A held action persists to care_hitl_actions, appears in the queue, is released
    # exactly once, and a second release is refused as no longer pending.
    _, factory, _ = harness
    with factory() as db:
        held = hitl_approval_agent.hold_action(
            db, action_type="PRESCRIPTION_APPROVAL", title="Held",
            patient_id="student_1", patient_name="A Student",
            campus="Some University", requested_by="agent",
            assigned_clinician="Dr. Test")
        db.commit()
    with factory() as db:
        assert [a.id for a in hitl_approval_agent.get_pending_actions(db)] == [held.id]
        assert hitl_approval_agent.approve_action(db, held.id, "Dr. Test")["status"] == "SUCCESS"
        db.commit()
    with factory() as db:
        assert hitl_approval_agent.approve_action(db, held.id, "Dr. Test")["status"] == "NOT_PENDING"


def test_hitl_approval_is_scoped_to_the_caller_campus(harness):
    # A held action belongs to a campus; a scoped approver outside it neither sees
    # nor can release it (answer: not found, not "exists elsewhere"). The queue
    # also filters to the caller's campus on the read.
    _, factory, _ = harness
    with factory() as db:
        held = hitl_approval_agent.hold_action(
            db, action_type="PRESCRIPTION_APPROVAL", title="Held",
            patient_id="student_1", patient_name="A Student",
            campus="Some University", assigned_clinician="Dr. Test")
        db.commit()
    with factory() as db:
        assert [a.id for a in hitl_approval_agent.get_pending_actions(db, campus="Some University")] == [held.id]
        assert hitl_approval_agent.get_pending_actions(db, campus="Other University") == []
        assert hitl_approval_agent.approve_action(db, held.id, "Dr. Test", campus="Other University")["status"] == "NOT_FOUND"
        # The same approver, in the right campus, releases it.
        assert hitl_approval_agent.approve_action(db, held.id, "Dr. Test", campus="Some University")["status"] == "SUCCESS"


def test_hitl_holding_requires_an_assigned_clinician(harness):
    # A held action with no one assigned is refused at hold time, and a row that
    # somehow reached the queue unassigned is released by no one.
    _, factory, _ = harness
    with factory() as db:
        with pytest.raises(ValueError):
            hitl_approval_agent.hold_action(
                db, action_type="PRESCRIPTION_APPROVAL", title="Held",
                patient_id="student_1", assigned_clinician="")
        db.commit()
        # An unassigned row, inserted directly, is held but releasable by no one.
        unassigned = M.HitlAction(id="ua_1", action_type="PRESCRIPTION_APPROVAL", title="Unassigned",
                                  patient_id="student_1", status="PENDING_DOCTOR_APPROVAL",
                                  created_at="", assigned_clinician="")
        db.add(unassigned)
        db.commit()
    with factory() as db:
        assert hitl_approval_agent.approve_action(db, "ua_1", "Dr. Test")["status"] == "NOT_ASSIGNED"


def test_camera_scan_and_mental_game_endpoints(harness):
    client, factory, codes = harness
    # The lookup reads the medicine master; there is no hardcoded drug table.
    import time

    from core import workflow_models as M
    from core.medicine_composition import composition_key
    with factory() as db:
        db.add(M.Medicine(id="m-cipro", name="Ciplox 500", composition_key=composition_key([("Ciprofloxacin", 500, "mg")]),
                          dosage_form="TABLET", pack="Strip of 10 tablets", manufacturer="Test Pharma", schedule="H",
                          requires_prescription=True, active=True, created_at=time.time(), updated_at=time.time()))
        db.add(M.MedicineIngredient(id="m-cipro-0", medicine_id="m-cipro", position=0, salt="Ciprofloxacin",
                                    salt_key="ciprofloxacin", strength_value=500, strength_unit="mg"))
        db.commit()
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
    assert res_med.json()['activeMolecule'] == 'Ciprofloxacin 500 mg'
    assert res_med.json()['schedule'] == 'H'
    assert res_med.json()['prescriptionRequired'] is True
    # Only master facts: no invented monograph, indication or price.
    assert not {'indications', 'studentkarePrice', 'janAushadhiAlternative'} & set(res_med.json())

    # No match is an honest empty result, never a stand-in medicine.
    res_none = client.post('/api/ai/medication-lookup', json={'query': 'zzqx unknown'}, headers=headers)
    assert res_none.status_code == 200
    assert res_none.json() == {'status': 'NO_MATCH', 'query': 'zzqx unknown'}

    # There is no image recognition: a file name is refused, not "scanned".
    res_img = client.post('/api/ai/medication-lookup', json={'query': '', 'imageFileName': 'azithral_strip_scan.jpg'}, headers=headers)
    assert res_img.status_code == 422


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
