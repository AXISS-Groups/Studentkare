"""Clinician encounter-note draft tests."""
from test_clinical_fulfilment import make_staff, put_in_care
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M

NOTE = {"subjective": "Patient reports mild fever.", "objective": "Temp 100.4F.", "assessment": "Likely viral.", "plan": "Rest and hydrate."}


def doctor_with_patient(client, factory, codes, status="CONFIRMED"):
    patient, _ = register(client, codes, "pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    put_in_care(factory, "doc", patient["id"], status=status)
    return patient, f"apt-doc-{patient['id']}"[:44], login(client, codes, "doc@example.test")


def test_encounter_note_lifecycle(harness):
    client, factory, codes = harness
    patient, appt_id, headers = doctor_with_patient(client, factory, codes)

    created = client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=headers).json()
    assert created["status"] == "DRAFT"
    note_id = created["id"]

    client.patch(f"/api/encounters/{note_id}", json={"assessment": "Likely viral infection."}, headers=headers)
    finalized = client.post(f"/api/encounters/{note_id}/finalize", headers=headers).json()
    assert finalized["status"] == "FINAL"

    items = client.get("/api/encounters", headers=headers).json()["items"]
    assert len(items) == 1
    assert items[0]["status"] == "FINAL"
    assert items[0]["assessment"] == "Likely viral infection."


def test_the_patient_is_the_appointments_patient_not_the_author(harness):
    client, factory, codes = harness
    patient, appt_id, headers = doctor_with_patient(client, factory, codes)
    note_id = client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=headers).json()["id"]
    with factory() as db:
        note = db.get(M.EncounterNote, note_id)
        assert note.patient_id == patient["id"]
        assert note.account_id == "doc"


def test_a_note_needs_a_confirmed_appointment_with_the_author(harness):
    client, factory, codes = harness
    _, appt_id, headers = doctor_with_patient(client, factory, codes, status="REQUESTED")
    assert client.post("/api/encounters", json=NOTE, headers=headers).status_code == 422
    assert client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=headers).status_code == 403
    assert client.post("/api/encounters", json={**NOTE, "appointmentId": "apt-not-mine"}, headers=headers).status_code == 403
    with factory() as db:
        assert db.query(M.EncounterNote).count() == 0


def test_a_partial_update_keeps_the_other_fields(harness):
    client, factory, codes = harness
    _, appt_id, headers = doctor_with_patient(client, factory, codes)
    note_id = client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=headers).json()["id"]
    client.patch(f"/api/encounters/{note_id}", json={"plan": "Review in 3 days."}, headers=headers)
    item = client.get("/api/encounters", headers=headers).json()["items"][0]
    assert item["subjective"] == NOTE["subjective"]
    assert item["assessment"] == NOTE["assessment"]
    assert item["plan"] == "Review in 3 days."


def test_a_finalised_note_cannot_be_edited(harness):
    client, factory, codes = harness
    _, appt_id, headers = doctor_with_patient(client, factory, codes)
    note_id = client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=headers).json()["id"]
    client.post(f"/api/encounters/{note_id}/finalize", headers=headers)
    assert client.patch(f"/api/encounters/{note_id}", json={"plan": "changed"}, headers=headers).status_code == 409


def test_student_cannot_create_encounter(harness):
    client, _, codes = harness
    _, headers = register(client, codes, "student@example.test")
    assert client.post("/api/encounters", json={"subjective": "x", "objective": "y", "appointmentId": "a"}, headers=headers).status_code == 403
