"""Crisis follow-up, prescribing, dispensing and lab fulfilment contracts.

These assert the rules that make the flows safe rather than the happy path alone:
a dispense cannot skip pharmacist verification, a report cannot be released without
a sample, an allergy blocks a prescription, and a crisis record never carries the
student's words.
"""
import time

import pytest
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import clinical_fulfilment as F

# The medicine master the prescribing tests read schedules from (audit M1: the
# server takes the schedule from here, never from the client). Each schedule also
# has a record addressable by id, for tests that need one particular schedule.
TEST_MASTER = {"Paracetamol": "OTC", "Azithromycin": "H1", "Amoxicillin": "H", "Pantoprazole": "H"}
SCHEDULE_MEDICINE_IDS = {"OTC": "med-otc", "H": "med-h", "H1": "med-h1", "X": "med-x"}


def seed_medicine_master(factory):
    rows = [(f"med-{name.lower()}", name, schedule) for name, schedule in TEST_MASTER.items()]
    rows += [(medicine_id, f"Test {schedule} medicine", schedule) for schedule, medicine_id in SCHEDULE_MEDICINE_IDS.items()]
    with factory() as db:
        for medicine_id, name, schedule in rows:
            if db.get(M.Medicine, medicine_id) is None:
                db.add(M.Medicine(id=medicine_id, name=name, composition_key=name.lower(), dosage_form="TABLET",
                                  pack="10 tablets", manufacturer="Test Pharma", schedule=schedule,
                                  requires_prescription=schedule != "OTC", active=True, source="ADMIN",
                                  created_at=time.time(), updated_at=time.time()))
        db.commit()


def make_staff(factory, account_id, role, identifier, name="Staff", profile=None):
    if role == "NMC_DOCTOR" and profile is None:
        # A real doctor account carries its NMC registration (audit M1).
        profile = {"registrationNumber": f"NMC-{account_id}"}
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name=name,
                         role=role, active=True, profile=profile or {}, created_at=time.time(),
                         # Campus scope is the server-assigned column (audit C1).
                         staff_campus=(profile or {}).get("university", "")
                         if role in ("CAMPUS_ADMIN", "COUNSELLOR") else ""))
        db.commit()


def put_in_care(factory, doctor_id, patient_id, status="CONFIRMED"):
    """A confirmed appointment between doctor and patient — the relationship prescribing requires."""
    suffix = f"{doctor_id}-{patient_id}"[:40]
    seed_medicine_master(factory)
    with factory() as db:
        if not db.get(M.CatalogEntry, f"consult-{doctor_id}"):
            db.add(M.CatalogEntry(id=f"consult-{doctor_id}", provider_id=doctor_id, kind="consultation", name="Consult",
                                  brand="Clinic", category="consultation", description="d", pack="1 visit",
                                  price_paise=0, stock=0, active=True, requires_prescription=False, preparation=""))
        db.add(M.AvailabilitySlot(id=f"slot-{suffix}", provider_id=doctor_id, catalog_item_id=f"consult-{doctor_id}",
                                  slot_start="2026-10-10T09:00", slot_end="2026-10-10T09:15", capacity=1, booked=1, active=True))
        db.add(M.Appointment(id=f"apt-{suffix}", account_id=patient_id, provider_id=doctor_id,
                             catalog_item_id=f"consult-{doctor_id}", slot_id=f"slot-{suffix}", status=status,
                             created_at=time.time(), updated_at=time.time()))
        db.commit()


def set_allergies(factory, account_id, allergies):
    # Allergies are on the clinical plane (services/clinical_profile.py), not the identity row.
    from services import clinical_profile

    with factory() as db:
        clinical_profile.write(db, account_id, {"allergies": allergies})
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
            delivery_available=kwargs.get("delivery", True), pickup_available=kwargs.get("pickup", True),
            verified_at=0.0, active=kwargs.get("active", True), updated_at=time.time(),
        ))
        db.commit()
    if kind == "LAB":
        # Assignment takes one of the lab's own collector accounts.
        for index, name in enumerate(kwargs.get("collectors", ("P. Rao", "S. Devi")), start=1):
            make_collector(factory, provider_id, f"{provider_id}-col-{index}", name)


def counter_verified(factory, order_id, counter_id="labco"):
    """Record that ``counter_id`` verified the order's student's live pass just now.

    Exactly the row POST /identity/verify writes on a 200 (DIGITAL_ID_VERIFIED,
    actor = the counter account, subject = the student). A lab may record a
    sample as collected only after one (services.clinical_api
    .student_verified_at_counter); test_lab_collect_verification.py drives the
    real endpoint end to end.
    """
    with factory() as db:
        student = db.get(M.LabOrder, order_id).patient_id
        db.add(M.WorkflowAudit(id=f"verify-{order_id}-{time.time_ns()}", actor_id=counter_id,
                               action="DIGITAL_ID_VERIFIED", resource_id=student, created_at=time.time()))
        db.commit()


def make_collector(factory, lab_id, account_id, name):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name=name,
                         role="LAB_COLLECTOR", active=True, profile={}, created_at=time.time()))
        db.flush()
        db.add(M.LabCollector(id=f"lc-{account_id}", lab_id=lab_id, account_id=account_id, active=True,
                              created_by="test", created_at=time.time()))
        db.commit()


SUCCESS_CARD = "4111 1111 1111 1111"


def quote_dispense(client, dispense_id, pharm_headers, unit_price=2500, delivery_fee=0, quantities=None):
    """The owning pharmacy prices every line of a verified dispense. Returns the response."""
    lines = client.get("/api/work/dispenses?limit=200", headers=pharm_headers).json()["items"]
    dispense = next(d for d in lines if d["id"] == dispense_id)
    items = [{"prescriptionItemId": i["id"],
              "quantity": (quantities or {}).get(i["id"], i["quantity"] or 1),
              "unitPricePaise": unit_price} for i in dispense["prescription"]["items"]]
    return client.put(f"/api/dispenses/{dispense_id}/quote", headers=pharm_headers,
                      json={"items": items, "deliveryFeePaise": delivery_fee})


def pay_quote(client, quote, patient_headers, card=SUCCESS_CARD):
    """The student accepts the quote at its total and pays through the mock provider."""
    started = client.post(f"/api/dispense-quotes/{quote['id']}/payment", headers=patient_headers,
                          json={"expectedTotalPaise": quote["totalPaise"]})
    assert started.status_code == 200, started.text
    started = started.json()
    paid = client.post(f"/api/dispense-quotes/{quote['id']}/payment/mock-checkout", headers=patient_headers,
                       json={"providerOrderId": started["providerOrderId"], "cardNumber": card}).json()
    return client.post(f"/api/dispense-quotes/{quote['id']}/payment/verify", headers=patient_headers,
                       json={"providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
                             "signature": paid["signature"]})


def second_client(client):
    """Another browser on the same app: signing in on one client ends the session already there."""
    from fastapi.testclient import TestClient
    return TestClient(client.app)


def quote_and_pay(client, codes, dispense_id, pharm_headers, patient_identifier, **quote_kwargs):
    """Verified -> priced -> paid. The pharmacy (signed in on ``client``) quotes; the student pays
    from a second client. Returns (pharmacy headers, (student client, student headers))."""
    quoted = quote_dispense(client, dispense_id, pharm_headers, **quote_kwargs)
    assert quoted.status_code == 200, quoted.text
    student_client = second_client(client)
    student_headers = login(student_client, codes, patient_identifier)
    verified = pay_quote(student_client, quoted.json()["quote"], student_headers)
    assert verified.status_code == 200, verified.text
    assert verified.json()["paymentStatus"] == "PAID", verified.text
    return pharm_headers, (student_client, student_headers)


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


def test_super_admin_sees_pending_crises_and_can_close_the_loop(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "crisis-pt@example.test")
    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)
    make_staff(factory, "safety-admin", "SUPER_ADMIN", "safety-admin@example.test", "Safety Admin")

    admin_headers = login(client, codes, "safety-admin@example.test")
    queue = client.get("/api/ops/crisis-events", headers=admin_headers).json()
    assert queue["pending"] == 1
    event = queue["items"][0]
    assert event["kind"] == "CRISIS_SELF_HARM"
    assert event["studentName"]

    done = client.post(f"/api/ops/crisis-events/{event['id']}/acknowledge",
                       json={"outcome": "CONTACTED", "note": "Spoke with student, counsellor booked."},
                       headers=admin_headers)
    assert done.status_code == 200, done.text
    assert done.json()["outcome"] == "CONTACTED"
    with factory() as db:
        assert db.get(M.CrisisEvent, event["id"]).acknowledged_by == "safety-admin"

    assert client.get("/api/ops/crisis-events", headers=admin_headers).json()["pending"] == 0


def test_a_clinician_cannot_open_the_campus_crisis_queue(harness):
    """An external clinician is not campus-scoped, so the queue would show them
    every college's students. Crisis follow-up is a counsellor's job."""
    client, factory, codes = harness
    _user, headers = register(client, codes, "crisis-doc-pt@example.test")
    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    doc_headers = login(client, codes, "doc@example.test")
    assert client.get("/api/ops/crisis-events", headers=doc_headers).status_code == 403
    with factory() as db:
        event_id = db.query(M.CrisisEvent).one().id
    assert client.post(f"/api/ops/crisis-events/{event_id}/acknowledge",
                       json={"outcome": "CONTACTED"}, headers=doc_headers).status_code == 403


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


def test_a_clinician_cannot_prescribe_for_someone_not_in_their_care(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "rx-stranger@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    doc_headers = login(client, codes, "doc@example.test")
    body = {"patientId": patient["id"], "items": [{"genericName": "Paracetamol", "quantity": 10}]}

    assert client.post("/api/prescriptions", json=body, headers=doc_headers).status_code == 403
    put_in_care(factory, "doc", patient["id"], status="REQUESTED")
    assert client.post("/api/prescriptions", json=body, headers=doc_headers).status_code == 403
    with factory() as db:
        assert db.query(M.Prescription).count() == 0


def test_staff_appointments_carry_the_patient_id_for_prescribing(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "rx-apt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    put_in_care(factory, "doc", patient["id"])
    doc_headers = login(client, codes, "doc@example.test")
    items = client.get("/api/work/appointments", headers=doc_headers).json()["items"]
    assert [item["patientId"] for item in items] == [patient["id"]]


def test_prescription_is_blocked_by_a_recorded_allergy(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "rx-allergy@example.test")
    set_allergies(factory, patient["id"], ["Penicillin"])
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao", {"registrationNumber": "NMC-12345"})
    doc_headers = login(client, codes, "doc@example.test")

    put_in_care(factory, "doc", patient["id"])
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

    put_in_care(factory, "doc", patient["id"])
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

    put_in_care(factory, "doc", patient["id"])
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
    put_in_care(factory, "doc", "other")
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
    put_in_care(factory, "doc", patient["id"])
    prescription = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Azithromycin", "dose": "500mg", "quantity": 3,
                   "medicineId": SCHEDULE_MEDICINE_IDS[schedule]}],
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
    verified = client.patch(f"/api/dispenses/{dispense['id']}",
                            json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, headers=pharm_headers)
    assert verified.status_code == 200, verified.text
    pharm_headers, _student = quote_and_pay(client, codes, dispense["id"], pharm_headers, "disp@example.test")

    for payload in [{"status": "PACKED"}, {"status": "OUT_FOR_DELIVERY"}, {"status": "DELIVERED"}]:
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
    client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"},
                 headers=pharm_headers)
    pharm_headers, _student = quote_and_pay(client, codes, dispense["id"], pharm_headers, "disp@example.test")
    for payload in [{"status": "PACKED"}, {"status": "OUT_FOR_DELIVERY"}, {"status": "DELIVERED"}]:
        assert client.patch(f"/api/dispenses/{dispense['id']}", json=payload, headers=pharm_headers).status_code == 200
    assert client.get("/api/ops/dispense-register", headers=pharm_headers).json()["total"] == 0


def test_rejection_must_carry_a_reason_for_the_patient(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    silent = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "REJECTED"}, headers=pharm_headers)
    assert silent.status_code == 422


def test_rejection_reason_is_held_to_its_column_size(harness):
    """`note` allows 500 for substitutions; care_dispenses.rejection_reason holds 300."""
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    url = f"/api/dispenses/{dispense['id']}"

    too_long = client.patch(url, json={"status": "REJECTED", "note": "x" * 301}, headers=pharm_headers)
    assert too_long.status_code == 422
    with factory() as db:
        assert db.get(M.Dispense, dispense["id"]).status == "RX_ISSUED"

    at_limit = client.patch(url, json={"status": "REJECTED", "note": "x" * 300}, headers=pharm_headers)
    assert at_limit.status_code == 200, at_limit.text
    assert len(at_limit.json()["rejectionReason"]) == 300


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


def test_the_pharmacy_queue_carries_fulfilment_fields_only(harness):
    """/work/dispenses must agree with the pharmacist review view (Rule L)."""
    client, factory, codes = harness
    issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    [item] = client.get("/api/work/dispenses", headers=pharm_headers).json()["items"]
    prescription = item["prescription"]
    assert prescription["items"] and prescription["prescriberRegNo"] is not None
    for clinical in ("patientId", "advice", "allergyCheck", "encounterId", "prescriberId"):
        assert clinical not in prescription


def test_platform_admin_has_no_pharmacy_powers(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    root_headers = login(client, codes, "root@example.test")

    assert client.get("/api/work/dispenses", headers=root_headers).json()["total"] == 0
    verify = client.patch(f"/api/dispenses/{dispense['id']}",
                          json={"status": "RX_VERIFIED", "pharmacistName": "Anyone"}, headers=root_headers)
    assert verify.status_code == 403
    with factory() as db:
        assert db.get(M.Dispense, dispense["id"]).status == "RX_ISSUED"


def test_a_laboratory_cannot_act_on_a_dispense(harness):
    """partner_kind is enforced on the server, not only in the UI."""
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-x", "labco", "LAB", pincode="500001")
    with factory() as db:
        # Point the dispense at a provider id the lab account owns, but of the wrong kind.
        db.get(M.Dispense, dispense["id"]).pharmacy_id = "lab-x"
        db.commit()
    lab_headers = login(client, codes, "labco@example.test")
    res = client.patch(f"/api/dispenses/{dispense['id']}",
                       json={"status": "RX_VERIFIED", "pharmacistName": "Lab tech"}, headers=lab_headers)
    assert res.status_code == 403
    assert client.get("/api/work/dispenses", headers=lab_headers).json()["total"] == 0


def test_platform_admin_has_no_lab_queue_and_no_clinical_fields_when_chasing(harness):
    client, factory, codes = harness
    order, _headers, _patient = book_lab(client, factory, codes)
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    root_headers = login(client, codes, "root@example.test")
    assert client.get("/api/work/lab-orders", headers=root_headers).json()["total"] == 0
    with factory() as db:
        db.get(M.LabOrder, order["id"]).created_at = time.time() - 10 * 86400
        db.commit()
    chasing = client.get("/api/work/lab-orders/awaiting-collection", headers=root_headers).json()["items"]
    assert chasing, "the stale booking should be listed for the admin to chase"
    for item in chasing:
        assert "clinicalIndication" not in item and "patientId" not in item and "criticalNote" not in item


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


REPORT_PDF = ("report.pdf", b"%PDF-1.4 lab report", "application/pdf")


def file_report(client, order_id, lab_headers, critical_note=""):
    data = {"criticalFlag": "true", "criticalNote": critical_note} if critical_note else {}
    return client.post(f"/api/work/lab-orders/{order_id}/report", files={"file": REPORT_PDF},
                       data=data, headers=lab_headers)


def run_to_analysis(client, order_id, lab_headers, factory):
    counter_verified(factory, order_id)
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-0001"},
                    {"status": "IN_TRANSIT"}, {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"}]:
        step = client.patch(f"/api/lab-orders/{order_id}", json=payload, headers=lab_headers)
        assert step.status_code == 200, f"{payload['status']}: {step.text}"


def test_full_lab_run_and_critical_value_sorts_to_the_front(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")
    run_to_analysis(client, order["id"], lab_headers, factory)
    filed = file_report(client, order["id"], lab_headers, critical_note="Potassium 6.8 mmol/L")
    assert filed.status_code == 200, filed.text
    assert filed.json()["status"] == "REPORT_READY"

    queue = client.get("/api/work/lab-orders", headers=lab_headers).json()
    assert queue["critical"] == 1
    assert queue["items"][0]["criticalFlag"] is True
    assert queue["items"][0]["sampleId"] == "SMP-0001"

    with factory() as db:
        assert db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "LAB_CRITICAL_VALUE").count() == 1


def test_a_report_is_filed_as_a_file_never_by_status_alone(harness):
    client, factory, codes = harness
    order, _headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")
    run_to_analysis(client, order["id"], lab_headers, factory)

    assert client.patch(f"/api/lab-orders/{order['id']}", json={"status": "REPORT_READY"}, headers=lab_headers).status_code == 409
    bad = client.post(f"/api/work/lab-orders/{order['id']}/report",
                      files={"file": ("x.pdf", b"not a pdf", "application/pdf")}, headers=lab_headers)
    assert bad.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# A doctor reviews, approves and releases every lab report
# ══════════════════════════════════════════════════════════════════════════════

def _filed_for_review(client, factory, codes, critical_note=""):
    order, patient_headers, patient = book_lab(client, factory, codes)
    lab_headers = login(client, codes, "labco@example.test")
    run_to_analysis(client, order["id"], lab_headers, factory)
    assert file_report(client, order["id"], lab_headers, critical_note).status_code == 200
    return order, patient, lab_headers


def test_the_student_sees_nothing_of_the_result_until_a_doctor_releases_it(harness):
    client, factory, codes = harness
    order, patient, lab_headers = _filed_for_review(client, factory, codes, critical_note="Potassium 6.8")
    client.post("/api/auth/logout", headers=lab_headers)

    student = login(client, codes, "lab@example.test")
    mine = client.get("/api/lab-orders", headers=student).json()["items"][0]
    assert mine["status"] == "REPORT_READY" and mine["awaitingDoctorReview"] is True
    assert mine["criticalFlag"] is False and mine["criticalNote"] == "" and mine["reportDocumentId"] == ""
    assert client.get("/api/health/documents", headers=student).json()["total"] == 0
    with factory() as db:
        assert db.query(M.OutboxEvent).filter(M.OutboxEvent.event_type.like("LAB_REPORT%")).count() == 0


def test_the_lab_cannot_release_its_own_report(harness):
    client, factory, codes = harness
    order, _patient, lab_headers = _filed_for_review(client, factory, codes)
    assert client.patch(f"/api/lab-orders/{order['id']}", json={"status": "REPORT_RELEASED"}, headers=lab_headers).status_code == 403
    assert client.post(f"/api/work/lab-reviews/{order['id']}/release", json={"note": "Looks fine"},
                       headers=lab_headers).status_code == 403


def test_a_doctor_with_no_relationship_sees_and_releases_nothing(harness):
    client, factory, codes = harness
    order, _patient, _lab = _filed_for_review(client, factory, codes, critical_note="Potassium 6.8")
    make_staff(factory, "stranger", "NMC_DOCTOR", "stranger@example.test")
    doc = login(client, codes, "stranger@example.test")
    assert client.get("/api/work/lab-reviews", headers=doc).json()["total"] == 0
    assert client.get("/api/work/critical-results", headers=doc).json()["total"] == 0
    assert client.get(f"/api/work/lab-reviews/{order['id']}/report", headers=doc).status_code == 403
    assert client.post(f"/api/work/lab-reviews/{order['id']}/release", json={"note": "ok ok"}, headers=doc).status_code == 403


def test_a_doctor_caring_for_the_student_reviews_approves_and_shares(harness):
    client, factory, codes = harness
    order, patient, _lab = _filed_for_review(client, factory, codes, critical_note="Potassium 6.8")
    make_staff(factory, "carer", "NMC_DOCTOR", "carer@example.test")
    put_in_care(factory, "carer", patient["id"])
    doc = login(client, codes, "carer@example.test")

    queue = client.get("/api/work/lab-reviews", headers=doc).json()
    assert [i["id"] for i in queue["items"]] == [order["id"]] and queue["items"][0]["criticalFlag"] is True
    held = client.get(f"/api/work/lab-reviews/{order['id']}/report", headers=doc)
    assert held.status_code == 200 and held.content.startswith(b"%PDF-")

    released = client.post(f"/api/work/lab-reviews/{order['id']}/release",
                           json={"note": "Potassium is high. I've called you; please come in today."}, headers=doc)
    assert released.status_code == 200, released.text
    body = released.json()
    assert body["status"] == "REPORT_RELEASED" and body["reviewerId"] == "carer"
    assert body["criticalAcknowledgedBy"] == "carer" and body["hasHeldReport"] is False
    client.post("/api/auth/logout", headers=doc)

    student = login(client, codes, "lab@example.test")
    mine = client.get("/api/lab-orders", headers=student).json()["items"][0]
    assert mine["reviewNote"].startswith("Potassium is high") and mine["reportDocumentId"]
    docs = client.get("/api/health/documents", headers=student).json()
    assert docs["total"] == 1 and docs["items"][0]["category"] == "LAB"


def test_a_self_booked_test_waits_for_a_super_admin_to_assign_a_doctor(harness):
    client, factory, codes = harness
    order, _patient, _lab = _filed_for_review(client, factory, codes)
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    make_staff(factory, "oncall", "NMC_DOCTOR", "oncall@example.test")

    admin = login(client, codes, "root@example.test")
    waiting = client.get("/api/work/lab-reviews", headers=admin).json()
    assert [i["id"] for i in waiting["items"]] == [order["id"]]
    assert "criticalNote" not in waiting["items"][0]  # the admin assigns; they don't read results
    assert client.get(f"/api/work/lab-reviews/{order['id']}/report", headers=admin).status_code == 403
    assert client.post(f"/api/work/lab-reviews/{order['id']}/release", json={"note": "fine"}, headers=admin).status_code == 403
    assert client.post(f"/api/work/lab-reviews/{order['id']}/assign", json={"doctorId": "oncall"}, headers=admin).status_code == 200
    client.post("/api/auth/logout", headers=admin)

    doc = login(client, codes, "oncall@example.test")
    assert client.post(f"/api/work/lab-reviews/{order['id']}/release", json={"note": "Normal range."},
                       headers=doc).status_code == 200


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
    ("REPORT_READY", "REPORT_RELEASED", True),
    ("REPORT_RELEASED", "IN_ANALYSIS", False),
])
def test_lab_transition_table(current, target, allowed):
    if allowed:
        F.assert_transition(F.LAB_TRANSITIONS, current, target, "lab order")
    else:
        with pytest.raises(F.TransitionError):
            F.assert_transition(F.LAB_TRANSITIONS, current, target, "lab order")


# ══════════════════════════════════════════════════════════════════════════════
# Pharmacist prescription review (/v1/pharmacy/rx-reviews)
# ══════════════════════════════════════════════════════════════════════════════

ALL_CHECKS = {"prescriberRegistration": True, "prescriptionDate": True, "patientMatches": True,
              "allergyChecked": True, "scheduleLogged": True}


def test_rx_review_queue_is_the_pharmacys_own_unreviewed_dispenses(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")

    queue = client.get("/api/v1/pharmacy/rx-reviews", headers=pharm_headers).json()

    assert queue["total"] == 1
    review = queue["reviews"][0]
    assert review["dispenseId"] == dispense["id"]
    assert review["items"][0]["genericName"] == "Azithromycin"
    assert review["items"][0]["scheduleClass"] == "H1"
    assert review["expired"] is False


def test_rx_review_carries_fulfilment_fields_only(harness):
    """Rule L: the pharmacist sees the prescription lines, never the student's other data."""
    client, factory, codes = harness
    patient, _rx, _dispense, _headers = issue_and_send(client, factory, codes)
    set_allergies(factory, patient["id"], ["Penicillin"])
    pharm_headers = login(client, codes, "pharm@example.test")

    review = client.get("/api/v1/pharmacy/rx-reviews", headers=pharm_headers).json()["reviews"][0]

    assert set(review) == {"dispenseId", "receivedAt", "prescriberRegNo", "issuedAt", "validUntil",
                           "expired", "items"}
    assert set(review["items"][0]) == {
        "id", "genericName", "brandName", "strength", "form", "dose", "frequency", "durationDays",
        "quantity", "scheduleClass", "registerRequired", "substitutionAllowed",
    }
    flat = str(review)
    assert patient["id"] not in flat
    assert "Penicillin" not in flat


def test_rx_review_is_scoped_to_the_pharmacys_own_provider(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    make_staff(factory, "rival", "VENDOR", "rival@example.test")
    make_provider(factory, "ph-2", "rival", "PHARMACY", pincode="500001")
    rival = login(client, codes, "rival@example.test")

    assert client.get("/api/v1/pharmacy/rx-reviews", headers=rival).json() == {"reviews": [], "total": 0, "uploads": [], "uploadsTotal": 0}
    approve = client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve",
                          json={"pharmacistName": "Rival", "checks": ALL_CHECKS}, headers=rival)
    reject = client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/reject",
                         json={"reason": "Not ours"}, headers=rival)
    assert approve.status_code == 404
    assert reject.status_code == 404
    with factory() as db:
        assert db.get(M.Dispense, dispense["id"]).status == "RX_ISSUED"


def test_rx_review_is_closed_to_everyone_but_partner_pharmacies(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, patient_headers = issue_and_send(client, factory, codes)
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    admin_headers = login(client, codes, "root@example.test")
    for headers in (patient_headers, doc_headers, admin_headers):
        assert client.get("/api/v1/pharmacy/rx-reviews", headers=headers).status_code == 403
        assert client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve",
                           json={"pharmacistName": "X", "checks": ALL_CHECKS}, headers=headers).status_code == 403


def test_rx_review_approve_is_the_named_pharmacist_transition(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    url = f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve"

    res = client.post(url, json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm_headers)

    assert res.status_code == 200, res.text
    assert res.json()["status"] == "RX_VERIFIED"
    assert res.json()["verifiedBy"] == "R. Iyer"
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharm_headers).json()["total"] == 0
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(
            action="DISPENSE_RX_VERIFIED", resource_id=dispense["id"]).count() == 1
        assert db.query(M.OpsEvent).filter_by(kind="DISPENSE_RX_VERIFIED").count() == 1

    again = client.post(url, json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm_headers)
    assert again.status_code == 409


@pytest.mark.parametrize("payload", [
    {"pharmacistName": "R. Iyer", "checks": {**ALL_CHECKS, "allergyChecked": False}},
    {"pharmacistName": "R. Iyer", "checks": {}},
    {"pharmacistName": "   ", "checks": ALL_CHECKS},
    {"checks": ALL_CHECKS},
])
def test_rx_review_approve_needs_every_check_and_a_name(harness, payload):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")

    res = client.post(f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/approve", json=payload, headers=pharm_headers)

    assert res.status_code == 422
    with factory() as db:
        assert db.get(M.Dispense, dispense["id"]).status == "RX_ISSUED"


def test_rx_review_cannot_verify_an_expired_prescription(harness):
    client, factory, codes = harness
    _patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    with factory() as db:
        db.query(M.Prescription).one().valid_until = time.time() - 10
        db.commit()
    pharm_headers = login(client, codes, "pharm@example.test")
    base = f"/api/v1/pharmacy/rx-reviews/{dispense['id']}"

    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharm_headers).json()["reviews"][0]["expired"] is True
    res = client.post(f"{base}/approve", json={"pharmacistName": "R. Iyer", "checks": ALL_CHECKS}, headers=pharm_headers)
    assert res.status_code == 409
    rejected = client.post(f"{base}/reject", json={"reason": "Expired; ask your doctor to reissue it."},
                           headers=pharm_headers)
    assert rejected.status_code == 200


def test_rx_review_reject_needs_a_reason_and_tells_the_student(harness):
    client, factory, codes = harness
    patient, _rx, dispense, _headers = issue_and_send(client, factory, codes)
    pharm_headers = login(client, codes, "pharm@example.test")
    url = f"/api/v1/pharmacy/rx-reviews/{dispense['id']}/reject"

    assert client.post(url, json={"reason": "  "}, headers=pharm_headers).status_code == 422
    assert client.post(url, json={}, headers=pharm_headers).status_code == 422
    assert client.post(url, json={"reason": "x" * 301}, headers=pharm_headers).status_code == 422

    res = client.post(url, json={"reason": "Strength is illegible; please ask your doctor."}, headers=pharm_headers)
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "REJECTED"
    assert res.json()["rejectionReason"] == "Strength is illegible; please ask your doctor."
    with factory() as db:
        assert db.query(M.OpsEvent).filter_by(kind="DISPENSE_REJECTED", subject_id=patient["id"]).count() == 1
    assert client.post(url, json={"reason": "Again"}, headers=pharm_headers).status_code == 409
