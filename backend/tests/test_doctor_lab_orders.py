"""A doctor orders a lab test for a patient in their care.

Asserts the rules rather than the happy path alone: no care relationship, no
order; no typed indication, no order; no price reaches the doctor; and the
ordering doctor — not whoever happens along — reviews the report.
"""
from test_clinical_fulfilment import (
    book_and_pay_lab,
    file_report,
    lab_booking_body,
    make_provider,
    make_staff,
    put_in_care,
    run_to_analysis,
    seed_lab_test,
)
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M


def make_lab_test(factory, item_id="cbc", provider="labco", home=False):
    make_staff(factory, provider, "VENDOR", f"{provider}@example.test", "Kare Labs")
    make_provider(factory, f"lab-{provider}", provider, "LAB", legal_name="Kare Labs", home_collection=home)
    with factory() as db:
        db.add(M.CatalogEntry(id=item_id, provider_id=provider, kind="lab", name="Complete Blood Count",
                              brand="Kare Labs", category="lab", description="Complete blood count panel",
                              pack="1 test", price_paise=45000, stock=100, active=True,
                              requires_prescription=False, preparation="No fasting"))
        db.commit()


def setup_order(harness, in_care=True, home=False):
    client, factory, codes = harness
    patient, _headers = register(client, codes, "pt@example.test")
    client.post("/api/auth/logout", headers=_headers)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", "Dr Rao")
    make_lab_test(factory, home=home)
    if in_care:
        put_in_care(factory, "doc", patient["id"], status="COMPLETED")
    return patient, login(client, codes, "doc@example.test")


def body(patient_id, **overrides):
    return {"patientId": patient_id, "catalogItemId": "cbc", "collectionMode": "WALK_IN",
            "fastingRequired": False, "clinicalIndication": "Post-fever follow-up", **overrides}


def test_no_care_relationship_means_no_order(harness):
    client, factory, _codes = harness
    patient, doc = setup_order(harness, in_care=False)
    assert client.post("/api/work/doctor-lab-orders", json=body(patient["id"]), headers=doc).status_code == 403
    put_in_care(factory, "doc", patient["id"], status="REQUESTED")
    assert client.post("/api/work/doctor-lab-orders", json=body(patient["id"]), headers=doc).status_code == 403
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0


def test_only_a_doctor_may_order_for_someone_else(harness):
    client, _factory, codes = harness
    patient, _doc = setup_order(harness)
    client.post("/api/auth/logout", headers=_doc)
    student = login(client, codes, "pt@example.test")
    assert client.post("/api/work/doctor-lab-orders", json=body(patient["id"]), headers=student).status_code == 403
    assert client.get("/api/work/lab-tests", headers=student).status_code == 403


def test_a_typed_indication_is_required(harness):
    client, factory, _codes = harness
    patient, doc = setup_order(harness)
    for indication in ["", "  ", "ab", "x" * 501]:
        res = client.post("/api/work/doctor-lab-orders", json=body(patient["id"], clinicalIndication=indication),
                          headers=doc)
        assert res.status_code == 422, indication
    missing = body(patient["id"])
    del missing["clinicalIndication"]
    assert client.post("/api/work/doctor-lab-orders", json=missing, headers=doc).status_code == 422
    with factory() as db:
        assert db.query(M.LabOrder).count() == 0


def test_the_test_list_carries_no_price(harness):
    client, _factory, _codes = harness
    _patient, doc = setup_order(harness)
    tests = client.get("/api/work/lab-tests", headers=doc).json()["items"]
    assert [t["id"] for t in tests] == ["cbc"]
    assert not any("price" in key.lower() or "mrp" in key.lower() for key in tests[0])


def test_hostel_collection_needs_a_lab_that_offers_it(harness):
    client, _factory, _codes = harness
    patient, doc = setup_order(harness, home=False)
    res = client.post("/api/work/doctor-lab-orders", json=body(patient["id"], collectionMode="HOME"), headers=doc)
    assert res.status_code == 409


def test_order_is_booked_uncharged_notified_audited_and_listed(harness):
    client, factory, codes = harness
    patient, doc = setup_order(harness)
    res = client.post("/api/work/doctor-lab-orders", json=body(patient["id"], fastingRequired=True), headers=doc)
    assert res.status_code == 201, res.text
    order = res.json()
    assert order["status"] == "BOOKED" and order["orderedBy"] == "doc" and order["patientId"] == patient["id"]
    assert order["charged"] is False and order["testPanel"] == ["Complete Blood Count"]

    with factory() as db:
        assert db.query(M.Order).count() == 0  # a clinical order, not a purchase
        assert db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "LAB_ORDERED_BY_DOCTOR").count() == 1
        note = db.query(M.OutboxEvent).filter(M.OutboxEvent.event_type == "LAB_ORDERED_BY_DOCTOR").one()
        assert note.account_id == patient["id"]
        assert "fever" not in note.payload["summary"].lower()  # no clinical detail in the message

    mine = client.get("/api/work/doctor-lab-orders", headers=doc).json()["items"]
    assert [(i["id"], i["status"], i["labName"]) for i in mine] == [(order["id"], "BOOKED", "Kare Labs")]
    client.post("/api/auth/logout", headers=doc)

    student = login(client, codes, "pt@example.test")
    theirs = client.get("/api/lab-orders", headers=student).json()["items"]
    assert [i["id"] for i in theirs] == [order["id"]] and theirs[0]["orderedByDoctor"] == "Dr Rao"


def test_a_self_booked_test_names_no_doctor(harness):
    client, factory, codes = harness
    _patient, headers = register(client, codes, "self@example.test")
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB")
    seed_lab_test(factory)
    book_and_pay_lab(client, headers, lab_booking_body())
    assert client.get("/api/lab-orders", headers=headers).json()["items"][0]["orderedByDoctor"] == ""


def test_the_ordering_doctor_becomes_the_reviewer_when_the_lab_files(harness):
    client, factory, codes = harness
    patient, doc = setup_order(harness)
    order = client.post("/api/work/doctor-lab-orders", json=body(patient["id"]), headers=doc).json()
    client.post("/api/auth/logout", headers=doc)

    # Another doctor also caring for the student: the order's doctor still reviews.
    make_staff(factory, "other", "NMC_DOCTOR", "other@example.test")
    put_in_care(factory, "other", patient["id"])

    lab = login(client, codes, "labco@example.test")
    run_to_analysis(client, order["id"], lab)
    filed = file_report(client, order["id"], lab)
    assert filed.status_code == 200 and filed.json()["reviewerId"] == "doc"
    client.post("/api/auth/logout", headers=lab)

    other = login(client, codes, "other@example.test")
    assert client.get("/api/work/lab-reviews", headers=other).json()["total"] == 0
    client.post("/api/auth/logout", headers=other)

    doc = login(client, codes, "doc@example.test")
    assert [i["id"] for i in client.get("/api/work/lab-reviews", headers=doc).json()["items"]] == [order["id"]]
