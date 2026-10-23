"""Audit M1: prescribing rules (Drugs and Cosmetics Rules; NMC Telemedicine Guidelines 2020).

- The schedule (OTC / H / H1 / X) comes from the medicine master, never the client,
  so an H1 drug can't be filed as OTC to skip the retained register.
- Schedule X is never prescribed in a teleconsultation.
- A doctor account needs an NMC registration number before it can prescribe; the
  shared team doctor may prescribe only for team-campus test students.
"""
import time

from test_clinical_fulfilment import SCHEDULE_MEDICINE_IDS, make_staff, put_in_care
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from core.team_scope import TEAM_CAMPUS


def prescribe(client, headers, patient_id, **item):
    return client.post("/api/prescriptions", headers=headers,
                       json={"patientId": patient_id, "items": [{"quantity": 3, **item}]})


def test_the_client_cannot_downgrade_an_h1_drug_to_otc(harness):  # noqa: F811
    client, factory, codes = harness
    patient, _ = register(client, codes, "pt@x.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@x.test")
    put_in_care(factory, "doc", patient["id"])
    headers = login(client, codes, "doc@x.test")

    res = prescribe(client, headers, patient["id"], genericName="Azithromycin", scheduleClass="OTC")
    assert res.status_code == 201, res.text
    item = res.json()["items"][0]
    assert item["scheduleClass"] == "H1" and item["registerRequired"] is True
    # Matching is by name or single salt, case and spacing ignored.
    again = prescribe(client, headers, patient["id"], genericName="  azithromycin ", scheduleClass="OTC")
    assert again.json()["items"][0]["scheduleClass"] == "H1"


def test_an_unknown_medicine_fails_closed(harness):  # noqa: F811
    client, factory, codes = harness
    patient, _ = register(client, codes, "pt@x.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@x.test")
    put_in_care(factory, "doc", patient["id"])
    headers = login(client, codes, "doc@x.test")
    res = prescribe(client, headers, patient["id"], genericName="Madeupamycin", scheduleClass="OTC")
    assert res.status_code == 422 and res.json()["detail"]["code"] == "SCHEDULE_UNKNOWN"
    assert prescribe(client, headers, patient["id"], genericName="Anything",
                     medicineId="no-such-medicine").status_code == 422
    with factory() as db:
        assert db.query(M.Prescription).count() == 0


def test_schedule_x_is_refused_in_a_teleconsultation(harness):  # noqa: F811
    client, factory, codes = harness
    patient, _ = register(client, codes, "pt@x.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@x.test")
    put_in_care(factory, "doc", patient["id"])
    headers = login(client, codes, "doc@x.test")
    # Even when the client claims it is OTC.
    res = prescribe(client, headers, patient["id"], genericName="Test X medicine",
                    medicineId=SCHEDULE_MEDICINE_IDS["X"], scheduleClass="OTC")
    assert res.status_code == 422 and res.json()["detail"]["code"] == "SCHEDULE_X_PROHIBITED"
    with factory() as db:
        assert db.query(M.Prescription).count() == 0


def test_a_doctor_without_an_nmc_registration_cannot_prescribe(harness):  # noqa: F811
    client, factory, codes = harness
    patient, _ = register(client, codes, "pt@x.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@x.test", profile={})
    put_in_care(factory, "doc", patient["id"])
    headers = login(client, codes, "doc@x.test")
    res = prescribe(client, headers, patient["id"], genericName="Paracetamol")
    assert res.status_code == 403 and res.json()["detail"]["code"] == "NMC_REGISTRATION_REQUIRED"
    # A doctor can't add one through their own profile.
    assert client.patch("/api/profile", headers=headers, json={"registrationNumber": "FAKE"}).status_code == 422

    make_staff(factory, "root", "SUPER_ADMIN", "root@x.test")
    admin = login(client, codes, "root@x.test")
    assert client.patch("/api/ops/accounts/doc/registration", headers=admin,
                        json={"registrationNumber": "TSMC-4242"}).status_code == 200
    headers = login(client, codes, "doc@x.test")
    ok = prescribe(client, headers, patient["id"], genericName="Paracetamol")
    assert ok.status_code == 201 and ok.json()["prescriberRegNo"] == "TSMC-4242"


def test_a_doctor_account_is_created_only_with_a_registration_number(harness):  # noqa: F811
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@x.test")
    admin = login(client, codes, "root@x.test")
    body = {"identifier": "newdoc@x.test", "channel": "EMAIL", "fullName": "Dr New", "role": "NMC_DOCTOR"}
    assert client.post("/api/ops/accounts", headers=admin, json=body).status_code == 422
    created = client.post("/api/ops/accounts", headers=admin, json={**body, "registrationNumber": "NMC-77"})
    assert created.status_code == 201, created.text
    with factory() as db:
        assert db.get(M.Account, created.json()["id"]).profile["registrationNumber"] == "NMC-77"


def test_the_team_doctor_prescribes_only_for_team_campus_students(harness):  # noqa: F811
    client, factory, codes = harness
    real, _ = register(client, codes, "real@x.test")
    client.cookies.clear()
    test_student, _ = register(client, codes, "teamstudent@x.test")
    with factory() as db:
        db.merge(M.CampusVerification(account_id=test_student["id"], university=TEAM_CAMPUS, roll_number="T1",
                                    status="VERIFIED", verified_at=time.time()))
        db.add(M.Account(id="team-doctor", identifier="doctor@team.test", channel="EMAIL", full_name="Team doctor",
                         role="NMC_DOCTOR", active=True, profile={}, is_team_account=True, created_at=time.time()))
        db.commit()
    put_in_care(factory, "team-doctor", real["id"])
    put_in_care(factory, "team-doctor", test_student["id"])
    headers = login(client, codes, "doctor@team.test")
    assert prescribe(client, headers, real["id"], genericName="Paracetamol").status_code == 403
    assert prescribe(client, headers, test_student["id"], genericName="Paracetamol").status_code == 201
