"""Cross-dashboard activity feed, and the four fulfilment rules it routes.

The feed exists so that an action on any surface reaches the dashboard responsible
for it — an order to the super admin and the fulfilling vendor, a crisis to clinical
staff, a critical lab value to a clinician. These tests assert the routing and, just
as importantly, what each role must *not* see.
"""
import time

from core import workflow_models as M
from services import ops_feed
from test_clinical_fulfilment import make_document, make_provider, make_staff
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures


def seed_catalog(factory, item_id="cat-1", provider_id="vendor-a", price=45000, stock=10):
    with factory() as db:
        db.add(M.CatalogEntry(id=item_id, provider_id=provider_id, kind="product", name="Vitamin D3",
                              brand="Generic", category="supplement", description="d", pack="30 tablets",
                              price_paise=price, mrp_paise=price, stock=stock, active=True,
                              requires_prescription=False, preparation=""))
        db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# An order reaches the super admin and the fulfilling vendor
# ══════════════════════════════════════════════════════════════════════════════

def test_order_reaches_super_admin_and_the_fulfilling_vendor(harness):
    client, factory, codes = harness
    student, headers = register(client, codes, "buyer@example.test")
    make_staff(factory, "vendor-a", "VENDOR", "vendor-a@example.test", "Vendor A")
    make_staff(factory, "vendor-b", "VENDOR", "vendor-b@example.test", "Vendor B")
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test", "Admin")
    seed_catalog(factory)

    placed = client.post("/api/orders", json={
        "items": [{"id": "cat-1", "quantity": 2}],
        "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"},
        "requestedSlot": "",
    }, headers={**headers, "Idempotency-Key": "ops-feed-order-key-0001"})
    assert placed.status_code == 201, placed.text

    admin_headers = login(client, codes, "admin@example.test")
    admin_feed = client.get("/api/ops/feed", headers=admin_headers).json()
    kinds = {item["kind"] for item in admin_feed["items"]}
    assert "ORDER_PLACED" in kinds
    assert admin_feed["scope"] == "all"

    vendor_a = login(client, codes, "vendor-a@example.test")
    seller_feed = client.get("/api/ops/feed", headers=vendor_a).json()
    assert [item["kind"] for item in seller_feed["items"]] == ["ORDER_LINE_ASSIGNED"]

    # A vendor with nothing on the order sees nothing.
    vendor_b = login(client, codes, "vendor-b@example.test")
    assert client.get("/api/ops/feed", headers=vendor_b).json()["total"] == 0


def test_support_and_campus_events_reach_the_super_admin(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "raiser@example.test")
    client.post("/api/support", json={"subject": "Cannot upload", "message": "The upload fails every time."},
                headers=headers)
    client.post("/api/campus/verification", json={"university": "Osmania University", "rollNumber": "OU-1"},
                headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    kinds = {item["kind"] for item in client.get("/api/ops/feed", headers=admin_headers).json()["items"]}
    assert {"SUPPORT_RAISED", "CAMPUS_VERIFICATION_SUBMITTED"} <= kinds

    counts = client.get("/api/ops/feed/counts", headers=admin_headers).json()["domains"]
    assert counts.get("SUPPORT") == 1
    assert counts.get("CAMPUS") == 1


def test_clinic_events_reach_the_super_admin_feed(harness):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "clinic-pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Paracetamol", "quantity": 10}],
    }, headers=doc_headers)

    admin_headers = login(client, codes, "admin@example.test")
    kinds = {item["kind"] for item in client.get("/api/ops/feed", headers=admin_headers).json()["items"]}
    assert "PRESCRIPTION_ISSUED" in kinds


# ══════════════════════════════════════════════════════════════════════════════
# Scoping — what each role must not see
# ══════════════════════════════════════════════════════════════════════════════

def test_a_vendor_never_sees_clinical_events(harness):
    """Rule L: clinical activity must not reach a commercial surface."""
    client, factory, codes = harness
    patient, _headers = register(client, codes, "scoped-pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "vendor-a", "VENDOR", "vendor-a@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    client.post("/api/prescriptions", json={
        "patientId": patient["id"], "items": [{"genericName": "Paracetamol", "quantity": 10}],
    }, headers=doc_headers)

    vendor_headers = login(client, codes, "vendor-a@example.test")
    assert client.get("/api/ops/feed", headers=vendor_headers).json()["total"] == 0


def test_a_student_cannot_read_the_ops_feed(harness):
    client, _factory, codes = harness
    _student, headers = register(client, codes, "nosy@example.test")
    assert client.get("/api/ops/feed", headers=headers).status_code == 403


def test_the_summary_never_carries_clinical_detail(harness):
    """The feed routes attention; it is not a place clinical specifics may leak."""
    client, factory, codes = harness
    patient, _headers = register(client, codes, "leak-pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    client.post("/api/prescriptions", json={
        "patientId": patient["id"], "advice": "Take after food",
        "items": [{"genericName": "Azithromycin", "brandName": "Azithral", "quantity": 3}],
    }, headers=doc_headers)

    admin_headers = login(client, codes, "admin@example.test")
    summaries = " ".join(item["summary"] for item in client.get("/api/ops/feed", headers=admin_headers).json()["items"])
    assert "Azithromycin" not in summaries
    assert "Azithral" not in summaries
    assert "after food" not in summaries


def test_crisis_events_are_critical_and_sort_to_the_front(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "feed-crisis@example.test")
    client.post("/api/support", json={"subject": "Routine", "message": "A normal question about billing."},
                headers=headers)
    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    feed = client.get("/api/ops/feed", headers=admin_headers).json()
    assert feed["critical"] == 1
    assert feed["items"][0]["kind"] == "CRISIS_GATE_TRIGGERED"
    assert feed["items"][0]["severity"] == "CRITICAL"


def test_acknowledging_clears_an_event_from_the_outstanding_count(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "ack@example.test")
    client.post("/api/support", json={"subject": "Billing question",
                                      "message": "I have a question about my plan."}, headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    event = client.get("/api/ops/feed", headers=admin_headers).json()["items"][0]
    done = client.post(f"/api/ops/feed/{event['id']}/acknowledge", headers=admin_headers)
    assert done.status_code == 200
    assert done.json()["acknowledgedBy"] == "admin"
    assert client.get("/api/ops/feed?unacknowledgedOnly=true", headers=admin_headers).json()["total"] == 0


def test_a_vendor_cannot_acknowledge_an_event_outside_their_scope(harness):
    client, factory, codes = harness
    _student, headers = register(client, codes, "scope-ack@example.test")
    client.post("/api/support", json={"subject": "Billing question",
                                      "message": "I have a question about my plan."}, headers=headers)
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")
    make_staff(factory, "vendor-a", "VENDOR", "vendor-a@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    event = client.get("/api/ops/feed", headers=admin_headers).json()["items"][0]

    vendor_headers = login(client, codes, "vendor-a@example.test")
    assert client.post(f"/api/ops/feed/{event['id']}/acknowledge", headers=vendor_headers).status_code == 404


def test_publishing_never_breaks_the_action_it_describes():
    """A feed failure must not roll back the order that caused it."""
    class BrokenSession:
        def add(self, _row):
            raise RuntimeError("database is on fire")

    assert ops_feed.publish(BrokenSession(), "ORDER_PLACED", "MARKETPLACE", summary="x") is None
    assert ops_feed.publish(BrokenSession(), "X", "NOT_A_DOMAIN", summary="x") is None


# ══════════════════════════════════════════════════════════════════════════════
# Fix 1 — the prescriber decides a substitution, not the pharmacy
# ══════════════════════════════════════════════════════════════════════════════

def prepare_dispense(client, factory, codes, substitution_allowed=True):
    patient, _ = register(client, codes, "sub-pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "pharm", "VENDOR", "pharm@example.test")
    make_provider(factory, "ph-1", "pharm", "PHARMACY", pincode="500001")
    doc_headers = login(client, codes, "doc@example.test")
    prescription = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Azithromycin", "quantity": 3, "scheduleClass": "H1",
                   "substitutionAllowed": substitution_allowed}],
    }, headers=doc_headers).json()
    patient_headers = login(client, codes, "sub-pt@example.test")
    dispense = client.post("/api/dispenses", json={
        "prescriptionId": prescription["id"], "pharmacyId": "ph-1",
    }, headers=patient_headers).json()
    pharm_headers = login(client, codes, "pharm@example.test")
    client.patch(f"/api/dispenses/{dispense['id']}",
                 json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"}, headers=pharm_headers)
    return prescription, dispense, pharm_headers


def test_pharmacy_cannot_approve_its_own_substitution(harness):
    client, factory, codes = harness
    prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)

    proposed = client.post(f"/api/dispenses/{dispense['id']}/substitutions", json={
        "prescriptionItemId": prescription["items"][0]["id"],
        "proposedGeneric": "Azithromycin (generic)", "reason": "Branded pack out of stock",
    }, headers=pharm_headers)
    assert proposed.status_code == 201, proposed.text

    # The old transition table let the pharmacy walk straight to ACCEPTED.
    self_approve = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "ACCEPTED"},
                                headers=pharm_headers)
    assert self_approve.status_code == 409


def test_prescriber_approves_a_substitution_and_the_dispense_resumes(harness):
    client, factory, codes = harness
    prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)
    proposal = client.post(f"/api/dispenses/{dispense['id']}/substitutions", json={
        "prescriptionItemId": prescription["items"][0]["id"],
        "proposedGeneric": "Azithromycin (generic)", "reason": "Branded pack out of stock",
    }, headers=pharm_headers).json()

    doc_headers = login(client, codes, "doc@example.test")
    pending = client.get("/api/work/substitutions", headers=doc_headers).json()
    assert pending["total"] == 1

    decided = client.post(f"/api/substitutions/{proposal['id']}/decide",
                          json={"approve": True, "note": "Generic is fine."}, headers=doc_headers)
    assert decided.status_code == 200
    assert decided.json()["status"] == "APPROVED"

    pharm_headers = login(client, codes, "pharm@example.test")
    resumed = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "ACCEPTED"}, headers=pharm_headers)
    assert resumed.status_code == 200


def test_no_substitution_item_cannot_be_proposed_against(harness):
    client, factory, codes = harness
    prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes, substitution_allowed=False)
    blocked = client.post(f"/api/dispenses/{dispense['id']}/substitutions", json={
        "prescriptionItemId": prescription["items"][0]["id"],
        "proposedGeneric": "Something else", "reason": "Cheaper",
    }, headers=pharm_headers)
    assert blocked.status_code == 409
    assert "no-substitution" in blocked.json()["detail"]


def test_only_the_prescribing_clinician_may_decide(harness):
    client, factory, codes = harness
    prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)
    proposal = client.post(f"/api/dispenses/{dispense['id']}/substitutions", json={
        "prescriptionItemId": prescription["items"][0]["id"],
        "proposedGeneric": "Generic", "reason": "Out of stock",
    }, headers=pharm_headers).json()
    make_staff(factory, "doc2", "NMC_DOCTOR", "doc2@example.test", "Dr Other")

    other_doc = login(client, codes, "doc2@example.test")
    assert client.post(f"/api/substitutions/{proposal['id']}/decide",
                       json={"approve": True}, headers=other_doc).status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Fix 2 — a critical value must be acknowledged
# ══════════════════════════════════════════════════════════════════════════════

def run_to_critical(client, factory, codes):
    patient, headers = register(client, codes, "crit-pt@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    make_document(factory, "rep-1", patient["id"])
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["Electrolytes"]},
                        headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-9"},
                    {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"},
                    {"status": "REPORT_READY", "reportDocumentId": "rep-1", "criticalFlag": True,
                     "criticalNote": "Potassium 6.8"}]:
        step = client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)
        assert step.status_code == 200, step.text
    return order, lab_headers


def test_critical_result_waits_in_a_clinician_queue_until_acknowledged(harness):
    client, factory, codes = harness
    order, _lab_headers = run_to_critical(client, factory, codes)

    doc_headers = login(client, codes, "doc@example.test")
    queue = client.get("/api/work/critical-results", headers=doc_headers).json()
    assert queue["total"] == 1
    assert queue["items"][0]["id"] == order["id"]
    assert queue["items"][0]["waitingSeconds"] >= 0

    done = client.post(f"/api/lab-orders/{order['id']}/acknowledge-critical",
                       json={"note": "Called the student, admitted for review."}, headers=doc_headers)
    assert done.status_code == 200
    assert done.json()["criticalAcknowledgedBy"] == "doc"
    assert client.get("/api/work/critical-results", headers=doc_headers).json()["total"] == 0


def test_a_lab_cannot_acknowledge_its_own_critical_result(harness):
    client, factory, codes = harness
    order, lab_headers = run_to_critical(client, factory, codes)
    assert client.post(f"/api/lab-orders/{order['id']}/acknowledge-critical",
                       json={"note": "Seen"}, headers=lab_headers).status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Fix 3 — a rejected sample can be recollected
# ══════════════════════════════════════════════════════════════════════════════

def test_rejected_sample_can_be_recollected_without_losing_the_booking(harness):
    client, factory, codes = harness
    patient, headers = register(client, codes, "reject-pt@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    client.patch(f"/api/lab-orders/{order['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"},
                 headers=lab_headers)
    client.patch(f"/api/lab-orders/{order['id']}", json={"status": "SAMPLE_COLLECTED", "sampleId": "SMP-1"},
                 headers=lab_headers)

    silent = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "SAMPLE_REJECTED"}, headers=lab_headers)
    assert silent.status_code == 422, "a rejection must say why"

    rejected = client.patch(f"/api/lab-orders/{order['id']}",
                            json={"status": "SAMPLE_REJECTED", "rejectionReason": "Haemolysed"},
                            headers=lab_headers)
    assert rejected.status_code == 200
    assert rejected.json()["rejectionReason"] == "Haemolysed"

    again = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "RECOLLECTION_REQUIRED"},
                         headers=lab_headers)
    assert again.status_code == 200
    # The stale identifier is cleared so custody restarts cleanly.
    assert again.json()["sampleId"] == ""

    reassigned = client.patch(f"/api/lab-orders/{order['id']}",
                              json={"status": "ASSIGNED", "collectorName": "S. Devi"}, headers=lab_headers)
    assert reassigned.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# Fix 4 — the report document must be real, and the patient's
# ══════════════════════════════════════════════════════════════════════════════

def test_report_document_must_exist(harness):
    client, factory, codes = harness
    patient, headers = register(client, codes, "doc-pt@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-1"},
                    {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"}]:
        client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)

    assert client.patch(f"/api/lab-orders/{order['id']}",
                        json={"status": "REPORT_READY", "reportDocumentId": "not-a-real-document"},
                        headers=lab_headers).status_code == 404


def test_report_document_belonging_to_another_account_is_refused(harness):
    client, factory, codes = harness
    patient, headers = register(client, codes, "doc-own@example.test")
    make_staff(factory, "stranger", "STUDENT", "stranger@example.test", "Someone Else")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    make_document(factory, "theirs", "stranger")
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-1"},
                    {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"}]:
        client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)

    leaked = client.patch(f"/api/lab-orders/{order['id']}",
                          json={"status": "REPORT_READY", "reportDocumentId": "theirs"}, headers=lab_headers)
    assert leaked.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# Fix 5 — partial dispense
# ══════════════════════════════════════════════════════════════════════════════

def test_dispense_creates_a_row_per_prescribed_item(harness):
    client, factory, codes = harness
    patient, _ = register(client, codes, "partial-pt@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "pharm", "VENDOR", "pharm@example.test")
    make_provider(factory, "ph-1", "pharm", "PHARMACY", pincode="500001")
    doc_headers = login(client, codes, "doc@example.test")
    prescription = client.post("/api/prescriptions", json={
        "patientId": patient["id"],
        "items": [{"genericName": "Azithromycin", "quantity": 3},
                  {"genericName": "Paracetamol", "quantity": 10},
                  {"genericName": "Pantoprazole", "quantity": 14}],
    }, headers=doc_headers).json()
    patient_headers = login(client, codes, "partial-pt@example.test")
    dispense = client.post("/api/dispenses", json={
        "prescriptionId": prescription["id"], "pharmacyId": "ph-1"}, headers=patient_headers).json()

    with factory() as db:
        rows = db.query(M.DispenseItem).filter(M.DispenseItem.dispense_id == dispense["id"]).all()
        assert len(rows) == 3
        assert {r.quantity_requested for r in rows} == {3, 10, 14}
        assert all(r.quantity_dispensed == 0 and r.status == "PENDING" for r in rows)


def test_partially_accepted_is_a_reachable_state(harness):
    client, factory, codes = harness
    _prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)
    partial = client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "PARTIALLY_ACCEPTED"},
                           headers=pharm_headers)
    assert partial.status_code == 200
    assert "PACKED" in partial.json()["nextStates"]


# ══════════════════════════════════════════════════════════════════════════════
# Notifications reach the person, not just the dashboard
# ══════════════════════════════════════════════════════════════════════════════

def inbox(client, headers):
    return client.get("/api/notifications", headers=headers).json()["items"]


def test_student_is_told_when_a_prescription_is_issued(harness):
    client, factory, codes = harness
    patient, _ = register(client, codes, "notify-rx@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    doc_headers = login(client, codes, "doc@example.test")
    client.post("/api/prescriptions", json={
        "patientId": patient["id"], "items": [{"genericName": "Paracetamol", "quantity": 10}],
    }, headers=doc_headers)

    patient_headers = login(client, codes, "notify-rx@example.test")
    events = inbox(client, patient_headers)
    assert [e["eventType"] for e in events] == ["PRESCRIPTION_ISSUED"]
    assert "issued a prescription" in events[0]["payload"]["summary"]


def test_student_is_told_at_the_dispense_milestones_that_matter(harness):
    client, factory, codes = harness
    _prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)
    for payload in [{"status": "ACCEPTED"}, {"status": "PACKED"},
                    {"status": "OUT_FOR_DELIVERY"}, {"status": "DELIVERED"}]:
        client.patch(f"/api/dispenses/{dispense['id']}", json=payload, headers=pharm_headers)

    patient_headers = login(client, codes, "sub-pt@example.test")
    kinds = [e["eventType"] for e in inbox(client, patient_headers)]
    assert "DISPENSE_RX_VERIFIED" in kinds
    assert "DISPENSE_OUT_FOR_DELIVERY" in kinds
    assert "DISPENSE_DELIVERED" in kinds
    # "Packed" is pharmacy housekeeping; the student does not need telling.
    assert "DISPENSE_PACKED" not in kinds


def test_student_is_told_when_their_report_is_released(harness):
    client, factory, codes = harness
    order, headers = None, None
    patient, headers = register(client, codes, "notify-lab@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    make_document(factory, "rep-9", patient["id"])
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    for payload in [{"status": "ASSIGNED", "collectorName": "P. Rao"},
                    {"status": "SAMPLE_COLLECTED", "sampleId": "SMP-3"},
                    {"status": "RECEIVED_AT_LAB"}, {"status": "IN_ANALYSIS"},
                    {"status": "REPORT_READY", "reportDocumentId": "rep-9"},
                    {"status": "REPORT_RELEASED"}]:
        client.patch(f"/api/lab-orders/{order['id']}", json=payload, headers=lab_headers)

    patient_headers = login(client, codes, "notify-lab@example.test")
    summaries = " ".join(e["payload"]["summary"] for e in inbox(client, patient_headers))
    assert "sample has been collected" in summaries
    assert "report is ready" in summaries


def test_a_rejected_sample_tells_the_student_why(harness):
    client, factory, codes = harness
    patient, headers = register(client, codes, "notify-reject@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB", pincode="500001")
    order = client.post("/api/lab-orders", json={"labId": "lab-1", "testPanel": ["CBC"]}, headers=headers).json()
    lab_headers = login(client, codes, "labco@example.test")
    client.patch(f"/api/lab-orders/{order['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"}, headers=lab_headers)
    client.patch(f"/api/lab-orders/{order['id']}", json={"status": "SAMPLE_COLLECTED", "sampleId": "S1"}, headers=lab_headers)
    client.patch(f"/api/lab-orders/{order['id']}",
                 json={"status": "SAMPLE_REJECTED", "rejectionReason": "Haemolysed"}, headers=lab_headers)

    patient_headers = login(client, codes, "notify-reject@example.test")
    summaries = " ".join(e["payload"]["summary"] for e in inbox(client, patient_headers))
    assert "Haemolysed" in summaries


def test_notifications_are_idempotent(harness):
    """A retried transition must not notify the student twice."""
    client, factory, codes = harness
    _prescription, dispense, pharm_headers = prepare_dispense(client, factory, codes)
    client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "ACCEPTED"}, headers=pharm_headers)
    client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "PACKED"}, headers=pharm_headers)
    for _ in range(3):
        client.patch(f"/api/dispenses/{dispense['id']}", json={"status": "OUT_FOR_DELIVERY"}, headers=pharm_headers)

    patient_headers = login(client, codes, "sub-pt@example.test")
    kinds = [e["eventType"] for e in inbox(client, patient_headers)]
    assert kinds.count("DISPENSE_OUT_FOR_DELIVERY") == 1


def test_a_student_is_not_notified_about_their_own_action(harness):
    """Cancelling your own appointment does not need a message telling you so."""
    client, factory, codes = harness
    _student, headers = register(client, codes, "self-act@example.test")
    assert inbox(client, headers) == []


# ══════════════════════════════════════════════════════════════════════════════
# The remaining surfaces publish
# ══════════════════════════════════════════════════════════════════════════════

def test_claims_and_record_shares_reach_the_super_admin(harness):
    client, factory, codes = harness
    student, headers = register(client, codes, "surface@example.test")
    with factory() as db:
        db.add(M.Policy(id="pol-1", account_id=student["id"], insurer="Test Insurer",
                        policy_number="POL-0001", sum_insured=500000, valid_until="2030-01-01",
                        created_at=time.time()))
        db.commit()
    claimed = client.post("/api/insurance/claims", json={
        "policyId": "pol-1", "providerName": "City Clinic", "service": "Consultation",
        "amountPaise": 100000}, headers=headers)
    assert claimed.status_code == 201, claimed.text
    make_staff(factory, "admin", "SUPER_ADMIN", "admin@example.test")

    admin_headers = login(client, codes, "admin@example.test")
    kinds = {item["kind"] for item in client.get("/api/ops/feed", headers=admin_headers).json()["items"]}
    assert "CLAIM_REQUEST_CREATED" in kinds


# ══════════════════════════════════════════════════════════════════════════════
# Coverage — which surfaces must publish, and which deliberately must not
# ══════════════════════════════════════════════════════════════════════════════

# Actions a super admin has to be able to see. Adding a state change of this kind
# without an event is the bug this test exists to catch.
MUST_PUBLISH = {
    "/orders": "a student ordering something",
    "/orders/{order_id}/cancel": "an order being cancelled",
    "/work/requests/{line_id}": "a provider accepting or declining a request",
    "/support": "a support request being raised",
    "/ops/support/{request_id}": "a support request being resolved",
    "/campus/verification": "a campus affiliation being submitted",
    "/ops/campus/{account_id}": "a campus affiliation being decided",
    "/ops/accounts": "a staff account, and therefore privilege, being granted",
    "/records/shares": "a student granting a clinician access",
    "/records/shares/{share_id}/revoke": "a student withdrawing that access",
    "/records/deletion-request": "a statutory erasure request",
    "/insurance/claims": "an insurance claim being drafted",
    "/appointments": "an appointment being requested",
    "/camps/{camp_id}/register": "a camp registration",
    "/encounters/{note_id}/finalize": "consultation notes being finalised",
    "/v1/ops/kill-switch": "the platform being frozen",
    "/v1/ops/kill-switch/reset": "the platform being unfrozen",
    # Money moving. A super admin is asked about these before anything else.
    "/subscription/checkout": "a subscription starting",
    "/subscription/cancel": "a subscription being cancelled",
    "/v1/orders/{order_id}/refund": "money leaving the platform",
    "/admin/contracts": "an enterprise contract being drafted",
    "/admin/contracts/{contract_id}/activate": "an enterprise contract granting entitlement",
    "/inquiries": "an enterprise sales inquiry",
    "/ops/catalog": "what students can buy changing",
    # Safety releases and emergencies.
    "/ops/approve-action": "a human releasing a held AI action",
    "/blood/sos-request": "an emergency blood broadcast",
    "/v1/pharmacy/rx-reviews/approve": "a pharmacist releasing a reviewed prescription",
}

# Deliberately silent. These are a person's own routine activity, and routing them
# to an ops dashboard would be both noise and, for the clinical ones, a Rule L
# problem — a student's vitals are not operational telemetry.
MUST_NOT_PUBLISH = {
    "/health/readings": "a student recording their own blood pressure",
    "/meds/log-dose": "a student taking a tablet",
    "/health/preferences": "a personal preference",
    "/notifications/preferences": "a notification preference",
    "/notifications/{event_id}/read": "reading your own notification",
    "/health/exercise-sessions": "a personal exercise session",
}


def _handler_bodies():
    """Map every state-changing route to its handler source."""
    import glob
    import re
    bodies = {}
    for path in glob.glob("services/**/*.py", recursive=True) + glob.glob("app/*.py"):
        if ".venv" in path or "__pycache__" in path:
            continue
        source = open(path, encoding="utf-8", errors="ignore").read()
        parts = re.split(r'(@(?:app|router)\.(?:post|patch|put|delete)\("([^"]+)"[^)]*\))', source)
        for index in range(1, len(parts), 3):
            route = parts[index + 1]
            body = parts[index + 2] if index + 2 < len(parts) else ""
            body = body.split("@router.")[0].split("@app.")[0]
            bodies.setdefault(route, "")
            bodies[route] += body
    return bodies


def test_every_surface_the_super_admin_needs_publishes_an_event():
    bodies = _handler_bodies()
    missing = {
        route: reason for route, reason in MUST_PUBLISH.items()
        if "ops_feed." not in bodies.get(route, "")
    }
    assert not missing, "These surfaces must reach the ops feed:\n" + "\n".join(
        f"  {route} — {reason}" for route, reason in sorted(missing.items())
    )


def test_routine_personal_activity_stays_off_the_ops_feed():
    """Rule L and plain signal-to-noise: not everything belongs on a dashboard."""
    bodies = _handler_bodies()
    leaking = {
        route: reason for route, reason in MUST_NOT_PUBLISH.items()
        if "ops_feed.publish" in bodies.get(route, "")
    }
    assert not leaking, "These must not reach the ops feed:\n" + "\n".join(
        f"  {route} — {reason}" for route, reason in sorted(leaking.items())
    )
