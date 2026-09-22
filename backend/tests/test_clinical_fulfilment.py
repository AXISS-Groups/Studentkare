"""Crisis follow-up, prescribing, dispensing and lab fulfilment contracts.

These assert the rules that make the flows safe rather than the happy path alone:
a dispense cannot skip pharmacist verification, a report cannot be released without
a sample, an allergy blocks a prescription, and a crisis record never carries the
student's words.
"""
import time

import pytest

from core import workflow_models as M
from services import clinical_fulfilment as F
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures


def make_staff(factory, account_id, role, identifier, name="Staff", profile=None):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name=name,
                         role=role, active=True, profile=profile or {}, created_at=time.time()))
        db.commit()


def set_allergies(factory, account_id, allergies):
    with factory() as db:
        account = db.get(M.Account, account_id)
        profile = dict(account.profile or {})
        profile["allergies"] = allergies
        account.profile = profile
        db.commit()


def make_document(factory, document_id, account_id, title="Lab report"):
    with factory() as db:
        db.add(M.Document(id=document_id, account_id=account_id, title=title, category="LAB",
                          filename="report.pdf", mime_type="application/pdf", content=b"%PDF-",
                          created_at=time.time()))
        db.commit()


def make_provider(factory, provider_id, account_id, kind, pincode="500001", **kwargs):
    with factory() as db:
        db.add(M.ServiceProvider(
            id=provider_id, account_id=account_id, kind=kind, legal_name=kwargs.get("legal_name", f"{kind} One"),
            licence_no=kwargs.get("licence_no", "LIC-1"), licence_expiry=kwargs.get("licence_expiry", 0.0),
            accreditation="", address="", pincode=pincode, latitude=0.0, longitude=0.0,
            serviceable_pincodes=kwargs.get("serviceable", []), open_hours="",
            home_collection=kwargs.get("home_collection", False), source_url="",
            verified_at=0.0, active=True, updated_at=time.time(),
        ))
        db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# Crisis follow-up
# ══════════════════════════════════════════════════════════════════════════════

def test_navigator_crisis_records_an_event_without_the_query(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "crisis-audit@example.test")

    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)

    with factory() as db:
        events = db.query(M.CrisisEvent).all()
        assert len(events) == 1
        event = events[0]
        assert event.kind == "CRISIS_SELF_HARM"
        assert event.detected_by == "SERVER"
        assert event.outcome == "PENDING"
        # Rule 9: nothing on the row may carry what the student wrote.
        assert "end my life" not in " ".join(
            str(getattr(event, column.name)) for column in M.CrisisEvent.__table__.columns
        )
        audits = db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "CRISIS_GATE_TRIGGERED").all()
        assert len(audits) == 1
        assert audits[0].resource_id == event.id


def test_client_detected_crisis_is_recorded_without_sending_the_message(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "crisis-client@example.test")

    res = client.post("/api/care/crisis-signal", json={"kind": "CRISIS_SELF_HARM"}, headers=headers)

    assert res.status_code == 201, res.text
    with factory() as db:
        event = db.query(M.CrisisEvent).one()
        assert event.detected_by == "CLIENT"
        assert event.surface == "care_navigator"


def test_crisis_signal_rejects_an_unknown_kind(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-bad@example.test")
    assert client.post("/api/care/crisis-signal", json={"kind": "NOT_A_KIND"}, headers=headers).status_code == 422


def test_crisis_queue_is_staff_only_and_students_cannot_read_it(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes, "crisis-student@example.test")
    assert client.get("/api/ops/crisis-events", headers=headers).status_code == 403


def test_clinician_sees_pending_crises_and_can_close_the_loop(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "crisis-pt@example.test")
    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")

    doc_headers = login(client, codes, "doc@example.test")
    queue = client.get("/api/ops/crisis-events", headers=doc_headers).json()
    assert queue["pending"] == 1
    event = queue["items"][0]
    assert event["kind"] == "CRISIS_SELF_HARM"
    assert event["studentName"]

    done = client.post(f"/api/ops/crisis-events/{event['id']}/acknowledge",
                       json={"outcome": "CONTACTED", "note": "Spoke with student, counsellor booked."},
                       headers=doc_headers)
    assert done.status_code == 200, done.text
    assert done.json()["outcome"] == "CONTACTED"
    assert done.json()["acknowledgedBy"] == "doc"

    assert client.get("/api/ops/crisis-events", headers=doc_headers).json()["pending"] == 0


def test_eval_harness_does_not_create_crisis_events(harness):
    """Measuring the gate must not manufacture care events for a real student."""
    client, factory, codes = harness
    register(client, codes, "crisis-eval@example.test")
    from services.agent_eval import evaluate_navigator
    with factory() as db:
        evaluate_navigator(db)
        assert db.query(M.CrisisEvent).count() == 0


# ══════════════════════════════════════════════════════════════════════════════
# Allergy cross-check
# ══════════════════════════════════════════════════════════════════════════════

def test_allergy_cross_check_flags_direct_and_cross_reactive_matches():
    assert F.cross_check_allergies("Amoxicillin", ["Penicillin"], "SUB_PENICILLIN")["hasConflict"] is True
    assert F.cross_check_allergies("Sulfamethoxazole", ["Sulfa drugs"], "SUB_SULFA_COMPOUND")["hasConflict"] is True
    assert F.cross_check_allergies("Paracetamol", ["Penicillin"])["hasConflict"] is False


def test_allergy_cross_check_makes_no_safety_claim_without_a_record():
    """An empty allergy list means 'nothing recorded', never 'no allergies'."""
    result = F.cross_check_allergies("Amoxicillin", [])
    assert result["hasConflict"] is False
    assert result["conflicts"] == []


def test_allergy_cross_check_declares_when_families_were_not_checked():
    """Without a substance code only names are compared; the caller must not overstate it."""
    named_only = F.cross_check_allergies("Amoxicillin", ["Penicillin"])
    assert named_only["crossReactivityChecked"] is False
    assert named_only["hasConflict"] is False  # name-only cannot know the family

    with_code = F.cross_check_allergies("Amoxicillin", ["Penicillin"], "SUB_PENICILLIN")
    assert with_code["crossReactivityChecked"] is True
    assert with_code["hasConflict"] is True


# ══════════════════════════════════════════════════════════════════════════════
# Prescribing
# ══════════════════════════════════════════════════════════════════════════════

def test_only_a_clinician_may_prescribe(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "rx-student@example.test")
    res = client.post("/api/prescriptions", json={
        "patientId": user["id"],
        "items": [{"genericName": "Paracetamol", "dose": "500mg", "frequency": "TDS", "quantity": 10}],
    }, headers=headers)
    assert res.status_code == 403


def test_prescription_is_blocked_by_a_recorded_allergy(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "rx-allergy@example.test")
    set_allergies(factory, patient["id"], ["Penicillin"])
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao", {"registrationNumber": "NMC-12345"})
    doc_headers = login(client, codes, "doc@example.test")

    res = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Amoxicillin", "substanceCode": "SUB_PENICILLIN",
                   "dose": "500mg", "frequency": "TDS", "quantity": 21, "scheduleClass": "H"}],
    }, headers=doc_headers)

    assert res.status_code == 409
    assert "allergy" in str(res.json()).lower()
    with factory() as db:
        assert db.query(M.Prescription).count() == 0


def test_prescriber_may_proceed_over_an_acknowledged_allergy_and_it_is_recorded(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "rx-ack@example.test")
    set_allergies(factory, patient["id"], ["Penicillin"])
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao", {"registrationNumber": "NMC-12345"})
    doc_headers = login(client, codes, "doc@example.test")

    res = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "acknowledgeAllergyConflict": True,
        "items": [{"genericName": "Amoxicillin", "substanceCode": "SUB_PENICILLIN",
                   "dose": "500mg", "frequency": "TDS", "quantity": 21, "scheduleClass": "H"}],
    }, headers=doc_headers)

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["allergyCheck"]["acknowledged"] is True
    assert body["allergyCheck"]["conflicts"]
    assert body["prescriberRegNo"] == "NMC-12345"


def test_prescription_stamps_registration_number_and_marks_register_classes(harness):
    client, factory, codes = harness
    patient, patient_headers = register(client, codes, "rx-ok@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao", {"registrationNumber": "NMC-999"})
    doc_headers = login(client, codes, "doc@example.test")

    res = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "advice": "Complete the full course.",
        "items": [
            {"genericName": "Azithromycin", "dose": "500mg", "frequency": "OD", "durationDays": 3,
             "quantity": 3, "scheduleClass": "H1"},
            {"genericName": "Paracetamol", "dose": "650mg", "frequency": "SOS", "quantity": 10},
        ],
    }, headers=doc_headers).json()

    assert res["prescriberRegNo"] == "NMC-999"
    assert res["validUntil"] > res["issuedAt"]
    by_name = {i["genericName"]: i for i in res["items"]}
    assert by_name["Azithromycin"]["registerRequired"] is True
    assert by_name["Paracetamol"]["registerRequired"] is False

    # The patient sees it on their own account; the clinician sees it on theirs.
    patient_headers = login(client, codes, "rx-ok@example.test")
    assert client.get("/api/prescriptions", headers=patient_headers).json()["total"] == 1


def test_a_student_only_sees_their_own_prescriptions(harness):
    client, factory, codes = harness
    register(client, codes, "rx-mine@example.test")
    make_staff(factory, "other", "STUDENT", "rx-theirs@example.test", "Other Student")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    issued = client.post("/api/prescriptions", json={
        "patientId": "other",
        "items": [{"genericName": "Paracetamol", "quantity": 10}],
    }, headers=doc_headers)
    assert issued.status_code == 201, issued.text

    mine = login(client, codes, "rx-mine@example.test")
    assert client.get("/api/prescriptions", headers=mine).json()["total"] == 0


# ══════════════════════════════════════════════════════════════════════════════
# Nearby providers
# ══════════════════════════════════════════════════════════════════════════════

def test_nearby_providers_rank_by_pincode_and_declare_their_basis(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "near@example.test")
    make_staff(factory, "v1", "VENDOR", "v1@example.test")
    make_provider(factory, "p-in", "v1", "PHARMACY", pincode="500001", legal_name="Alpha Chemists")
    make_provider(factory, "p-serves", "v1", "PHARMACY", pincode="500002", serviceable=["500001"], legal_name="Beta Pharma")
    make_provider(factory, "p-far", "v1", "PHARMACY", pincode="560001", legal_name="Gamma Medicals")
    make_provider(factory, "l-1", "v1", "LAB", pincode="500001", legal_name="Delta Diagnostics")

    res = client.get("/api/providers/nearby?pincode=500001&kind=PHARMACY", headers=headers).json()

    assert [p["id"] for p in res["items"]] == ["p-in", "p-serves"]
    assert res["items"][0]["inPincode"] is True
    assert "commission" in res["rankedBy"]


def test_expired_licence_is_reported_not_hidden(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "lic@example.test")
    make_staff(factory, "v1", "VENDOR", "v1@example.test")
    make_provider(factory, "p-exp", "v1", "PHARMACY", pincode="500001", licence_expiry=time.time() - 86400)

    item = client.get("/api/providers/nearby?pincode=500001", headers=headers).json()["items"][0]
    assert item["licenceValid"] is False


# ══════════════════════════════════════════════════════════════════════════════
# Dispensing
# ══════════════════════════════════════════════════════════════════════════════

def issue_and_send(client, factory, codes, patient_identifier="disp@example.test", schedule="H1"):
    patient, _ = register(client, codes, patient_identifier)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "pharm", "VENDOR", "pharm@example.test")
    make_provider(factory, "ph-1", "pharm", "PHARMACY", pincode="500001")
    doc_headers = login(client, codes, "doc@example.test")
    prescription = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Azithromycin", "dose": "500mg", "quantity": 3, "scheduleClass": schedule}],
    }, headers=doc_headers).json()
    patient_headers = login(client, codes, patient_identifier)
    dispense = client.post("/api/dispenses", json={
        "prescriptionId": prescription["id"], "pharmacyId": "ph-1",
        "delivery": {"mode": "delivery", "pincode": "500001"},
    }, headers=patient_headers)
    assert dispense.status_code == 201, dispense.text
    return patient, prescription, dispense.json(), patient_headers


def test_dispense_cannot_skip_pharmacist_verification(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")

    jump = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "PACKED"}, headers=pharm_headers)

    assert jump.status_code == 409
    assert "RX_VERIFIED" in jump.json()["detail"]


def test_verification_requires_a_named_pharmacist(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")

    anonymous = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "RX_VERIFIED"}, headers=pharm_headers)
    assert anonymous.status_code == 422

    named = client.patch(f"/api/dispenses/{dispense['id']}",
                         json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, headers=pharm_headers)
    assert named.status_code == 200
    assert named.json()["verifiedBy"] == "R. Iyer"
    assert named.json()["verifiedAt"] > 0


def test_full_dispense_run_reaches_the_h1_register(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes, schedule="H1")
    pharm_headers = login(client, codes, "pharm@example.test")

    for payload in [{"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, {"status": "ACCEPTED"},
                    {"status": "PACKED"}, {"status": "OUT_FOR_DELIVERY"}, {"status": "DELIVERED"}]:
        step = client.patch(f"/api/dispenses/{dispense['id']}", json=payload, headers=pharm_headers)
        assert step.status_code == 200, step.text

    register_entries = client.get("/api/ops/dispense-register", headers=pharm_headers).json()
    assert register_entries["total"] == 1
    assert register_entries["items"][0]["verifiedBy"] == "R. Iyer"
    assert register_entries["items"][0]["items"][0]["scheduleClass"] == "H1"


def test_otc_only_dispense_stays_off_the_register(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes, schedule="OTC")
    pharm_headers = login(client, codes, "pharm@example.test")
    for payload in [{"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, {"status": "ACCEPTED"},
                    {"status": "PACKED"}, {"status": "OUT_FOR_DELIVERY"}, {"status": "DELIVERED"}]:
        client.patch(f"/api/dispenses/{dispense['id']}", json=payload, headers=pharm_headers)
    assert client.get("/api/ops/dispense-register", headers=pharm_headers).json()["total"] == 0


def test_rejection_must_carry_a_reason_for_the_patient(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    silent = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "REJECTED"}, headers=pharm_headers)
    assert silent.status_code == 422


def test_patient_may_cancel_but_not_dispense_to_themselves(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, patient_headers = issue_and_send(client, factory, codes)

    forbidden = client.patch(f"/api/dispenses/{dispense['id']}",
                             json={"status": "RX_VERIFIED", "pharmacistName": "Me"}, headers=patient_headers)
    assert forbidden.status_code == 403

    cancelled = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "CANCELLED"}, headers=patient_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"


def test_a_pharmacy_never_sees_another_pharmacys_queue(harness):
    client, factory, codes = harness
    _patient, _rx, _dispense, _headers = issue_and_send(client, factory, codes)
    make_staff(factory, "rival", "VENDOR", "rival@example.test")
    make_provider(factory, "ph-2", "rival", "PHARMACY", pincode="500001")

    rival_headers = login(client, codes, "rival@example.test")
    assert client.get("/api/work/dispenses", headers=rival_headers).json()["total"] == 0

    pharm_headers = login(client, codes, "pharm@example.test")
    assert client.get("/api/work/dispenses", headers=pharm_headers).json()["total"] == 1


def test_expired_prescription_cannot_be_sent_to_a_pharmacy(harness):
    client, factory, codes = harness
    patient, _rx, dispense, patient_headers = issue_and_send(client, factory, codes)
    client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "CANCELLED"}, headers=patient_headers)
    with factory() as db:
        prescription = db.query(M.Prescription).one()
        prescription.valid_until = time.time() - 10
        db.commit()
        prescription_id = prescription.id

    res = client.post("/api/dispenses", json={"prescriptionId": prescription_id, "pharmacyId": "ph-1"},
                      headers=patient_headers)
    assert res.status_code == 409
    assert "expired" in res.json()["detail"].lower()


# ══════════════════════════════════════════════════════════════════════════════
# Lab orders
# ══════════════════════════════════════════════════════════════════════════════

def book_lab(client, factory, codes, home=False):
    patient, headers = register(client, codes, "lab@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001", home_collection=home)
    res = client.post("/api/lab-orders", json={
        "labId": "lab-1", "testPanel": ["CBC", "HbA1c"],
        "collectionMode": "HOME" if home else "WALK_IN",
        "fastingRequired": True, "clinicalIndication": "Routine screening",
    }, headers=headers)
    assert res.status_code == 201, res.text
    return res.json(), headers, patient


def test_lab_booking_persists(harness):
    """The previous endpoint returned a dispatch dict and stored nothing."""
    client, factory, codes = harness
    order, headers, patient = book_lab(client, factory, codes)
    assert order["status"] == "BOOKED"
    with factory() as db:
        assert db.query(M.LabOrder).count() == 1
    assert client.get("/api/lab-orders", headers=headers).json()["total"] == 1


def test_home_collection_is_refused_when_the_lab_does_not_offer_it(harness):
    client, factory, codes = harness
    _patient, headers = register(client, codes, "lab-home@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001", home_collection=False)
    res = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"], "collectionMode": "HOME"},
                      headers=headers)
    assert res.status_code == 409


def test_report_cannot_be_released_without_a_collected_sample(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")

    jump = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "REPORT_READY"}, headers=lab_headers)
    assert jump.status_code == 409


def test_collected_sample_requires_an_identifier(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")
    client.patch(f"/api/lab-orders/{order['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"},
                 headers=lab_headers)

    unlabelled = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "SAMPLE_COLLECTED"}, headers=lab_headers)
    assert unlabelled.status_code == 422


def test_full_lab_run_and_critical_value_sorts_to_the_front(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    make_document(factory, "doc-1", patient["id"])
    lab_headers = login(client, codes, "labco@example.test")

    steps = [
        {"status": "ASSIGNED", "collectorName": "P. Rao"},
        {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-0001"},
        {"status": "IN_TRANSIT"},
        {"status": "RECEIVED_AT_LAB"},
        {"status": "IN_ANALYSIS"},
        {"status": "REPORT_READY", "reportDocumentId": "doc-1", "criticalFlag": True,
         "criticalNote": "Potassium 6.8 mmol/L"},  # doc-1 is created below
        {"status": "REPORT_RELEASED"},
    ]
    for payload in steps:
        step = client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)
        assert step.status_code == 200, f"{payload['status']}: {step.text}"

    queue = client.get("/api/work/lab-orders", headers=lab_headers).json()
    assert queue["critical"] == 1
    assert queue["items"][0]["criticalFlag"] is True
    assert queue["items"][0]["sampleId"] == "SMP-0001"

    with factory() as db:
        assert db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "LAB_CRITICAL_VALUE").count() == 1


def test_report_ready_requires_the_report_document(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-1"},
                    {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"}]:
        client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)

    res = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "REPORT_READY"}, headers=lab_headers)
    assert res.status_code == 422


@pytest.mark.parametrize("current,target,allowed", [
    ("RX_ISSUED", "RX_VERIFIED", True),
    ("RX_ISSUED", "DELIVERED", False),
    ("ACCEPTED", "PACKED", True),
    ("DELIVERED", "PACKED", False),
])
def test_dispense_transition_table(current, target, allowed):
    if allowed:
        F.assert_transition(F.DISPENSE_TRANSITIONS, current, target, "dispense")
    else:
        with pytest.raises(F.TransitionError):
            F.assert_transition(F.DISPENSE_TRANSITIONS, current, target, "dispense")


@pytest.mark.parametrize("current,target,allowed", [
    ("BOOKED", "ASSIGNED", True),
    ("BOOKED", "REPORT_RELEASED", False),
    ("IN_ANALYSIS", "REPORT_READY", True),
    ("REPORT_RELEASED", "IN_ANALYSIS", False),
])
def test_lab_transition_table(current, target, allowed):
    if allowed:
        F.assert_transition(F.LAB_TRANSITIONS, current, target, "lab order")
    else:
        with pytest.raises(F.TransitionError):
            F.assert_transition(F.LAB_TRANSITIONS, current, target, "lab order")
