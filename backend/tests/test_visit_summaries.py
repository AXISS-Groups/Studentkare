"""A student reads their own signed visit notes — and nothing else."""
from test_clinical_fulfilment import make_staff, put_in_care
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M

NOTE = {"subjective": "Sore throat two days.", "objective": "Tonsils inflamed.",
        "assessment": "Pharyngitis.", "plan": "Warm fluids; review in 3 days."}
RX_ITEM = {"genericName": "Paracetamol", "strength": "500 mg", "form": "tablet", "dose": "1",
           "frequency": "TDS", "durationDays": 3, "quantity": 9, "scheduleClass": "OTC"}


def setup(client, factory, codes):
    student, student_headers = register(client, codes, "pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao", profile={"registrationNumber": "TSMC-12345"})
    put_in_care(factory, "doc", student["id"])
    appt_id = f"apt-doc-{student['id']}"[:44]
    doctor = login(client, codes, "doc@example.test")
    return student, student_headers, doctor, appt_id


def write_note(client, doctor, appt_id, sign=True):
    note_id = client.post("/api/encounters", json={**NOTE, "appointmentId": appt_id}, headers=doctor).json()["id"]
    if sign:
        assert client.post(f"/api/encounters/{note_id}/finalize", headers=doctor).status_code == 200
    return note_id


def test_student_sees_only_their_signed_notes(harness):
    client, factory, codes = harness
    student, headers, doctor, appt_id = setup(client, factory, codes)
    signed = write_note(client, doctor, appt_id)
    draft = write_note(client, doctor, appt_id, sign=False)
    headers = login(client, codes, "pt@example.test")  # one cookie session per client

    listing = client.get("/api/records/visit-summaries", headers=headers)
    assert listing.status_code == 200
    assert listing.headers["cache-control"] == "no-store"
    items = listing.json()["items"]
    assert [i["id"] for i in items] == [signed]
    item = items[0]
    assert item["doctorName"] == "Dr Rao"
    assert item["doctorRegistrationNumber"] == "TSMC-12345"
    assert item["appointmentStart"] == "2026-10-10T09:00"
    assert item["signedAt"]
    # The list carries no clinical text.
    assert "assessment" not in item and "subjective" not in item

    detail = client.get(f"/api/records/visit-summaries/{signed}", headers=headers)
    assert detail.status_code == 200
    assert detail.headers["cache-control"] == "no-store"
    body = detail.json()
    assert body["assessment"] == NOTE["assessment"]
    assert body["plan"] == NOTE["plan"]
    assert body["prescriptions"] == []

    assert client.get(f"/api/records/visit-summaries/{draft}", headers=headers).status_code == 404
    with factory() as db:
        viewed = db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "ENCOUNTER_SUMMARY_VIEWED").all()
        assert [(a.actor_id, a.resource_id) for a in viewed] == [(student["id"], signed)]


def test_another_student_gets_404(harness):
    client, factory, codes = harness
    _, _, doctor, appt_id = setup(client, factory, codes)
    signed = write_note(client, doctor, appt_id)
    client.cookies.clear()
    _, other = register(client, codes, "other@example.test")
    assert client.get("/api/records/visit-summaries", headers=other).json()["items"] == []
    assert client.get(f"/api/records/visit-summaries/{signed}", headers=other).status_code == 404
    assert client.get("/api/records/visit-summaries/enc_missing", headers=other).status_code == 404


def test_the_author_is_not_the_patient(harness):
    client, factory, codes = harness
    _, _, doctor, appt_id = setup(client, factory, codes)
    signed = write_note(client, doctor, appt_id)
    assert client.get("/api/records/visit-summaries", headers=doctor).json()["items"] == []
    assert client.get(f"/api/records/visit-summaries/{signed}", headers=doctor).status_code == 404


def test_signed_out_is_refused(harness):
    client, _, _ = harness
    assert client.get("/api/records/visit-summaries").status_code == 401


def test_prescriptions_linked_to_the_note_are_listed(harness):
    client, factory, codes = harness
    student, headers, doctor, appt_id = setup(client, factory, codes)
    signed = write_note(client, doctor, appt_id)
    rx = client.post("/api/prescriptions", headers=doctor,
                     json={"patientId": student["id"], "encounterId": signed, "items": [RX_ITEM]})
    assert rx.status_code == 201, rx.text
    unlinked = client.post("/api/prescriptions", headers=doctor,
                           json={"patientId": student["id"], "items": [RX_ITEM]})
    assert unlinked.status_code == 201
    headers = login(client, codes, "pt@example.test")
    body = client.get(f"/api/records/visit-summaries/{signed}", headers=headers).json()
    assert [p["id"] for p in body["prescriptions"]] == [rx.json()["id"]]
