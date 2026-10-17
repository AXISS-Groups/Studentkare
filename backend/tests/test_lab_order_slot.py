"""A student chooses the collection time for a test their doctor ordered.

Asserts the rules: only their own order (404 for anyone else's), only while it
is BOOKED (409 once the lab has assigned a collector), capacity reserved and
given back on a change, audited, the lab told, and no price anywhere.
"""
from test_doctor_lab_orders import body, setup_order
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M

FUTURE_A = "2099-01-05T08:00:00+05:30"
FUTURE_B = "2099-01-05T09:00:00+05:30"
PAST = "2020-01-05T08:00:00+05:30"


def add_slot(factory, slot_id, start, capacity=2, booked=0, item_id="cbc", provider="labco"):
    with factory() as db:
        db.add(M.AvailabilitySlot(id=slot_id, provider_id=provider, catalog_item_id=item_id, slot_start=start,
                                  slot_end=start.replace(":00:00", ":30:00"),
                                  capacity=capacity, booked=booked, active=True))
        db.commit()


def ordered(harness, fasting=True):
    """A doctor-ordered BOOKED test, and the student signed in."""
    client, factory, codes = harness
    patient, doc = setup_order(harness)
    order = client.post("/api/work/doctor-lab-orders", json=body(patient["id"], fastingRequired=fasting),
                        headers=doc).json()
    client.post("/api/auth/logout", headers=doc)
    add_slot(factory, "s-a", FUTURE_A)
    add_slot(factory, "s-b", FUTURE_B)
    add_slot(factory, "s-past", PAST)
    add_slot(factory, "s-full", "2099-01-06T08:00:00+05:30", capacity=1, booked=1)
    return order, login(client, codes, "pt@example.test")


def test_student_sees_future_open_slots_without_a_price(harness):
    client, _factory, _codes = harness
    order, student = ordered(harness)
    res = client.get(f"/api/lab-orders/{order['id']}/slots", headers=student)
    assert res.status_code == 200, res.text
    slots = res.json()["slots"]
    assert [s["id"] for s in slots] == ["s-a", "s-b"]
    assert not any("price" in key.lower() for s in slots for key in s)


def test_student_chooses_and_changes_a_slot(harness):
    client, factory, _codes = harness
    order, student = ordered(harness)
    res = client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": "s-a"}, headers=student)
    assert res.status_code == 200, res.text
    chosen = res.json()
    assert chosen["slotStart"] == FUTURE_A and chosen["status"] == "BOOKED"
    assert chosen["orderedByDoctor"] == "Dr Rao"
    assert not any("price" in key.lower() for key in chosen)

    res = client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": "s-b"}, headers=student)
    assert res.status_code == 200 and res.json()["slotStart"] == FUTURE_B

    with factory() as db:
        assert db.get(M.AvailabilitySlot, "s-a").booked == 0  # given back
        assert db.get(M.AvailabilitySlot, "s-b").booked == 1
        actions = [a.action for a in db.query(M.WorkflowAudit).filter(M.WorkflowAudit.resource_id == order["id"])]
        assert "LAB_ORDER_SLOT_CHOSEN" in actions and "LAB_ORDER_SLOT_CHANGED" in actions
        events = db.query(M.OpsEvent).filter(M.OpsEvent.resource_id == order["id"],
                                             M.OpsEvent.kind.like("LAB_ORDER_SLOT_%")).all()
        assert {e.provider_id for e in events} == {"lab-labco"} and len(events) == 2
        assert db.query(M.Order).count() == 0  # nothing charged


def test_someone_elses_order_is_not_found(harness):
    client, factory, codes = harness
    order, student = ordered(harness)
    client.post("/api/auth/logout", headers=student)
    _other, other = register(client, codes, "other@example.test")
    assert client.get(f"/api/lab-orders/{order['id']}/slots", headers=other).status_code == 404
    assert client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": "s-a"}, headers=other).status_code == 404
    assert client.put("/api/lab-orders/nope/slot", json={"slotId": "s-a"}, headers=other).status_code == 404
    with factory() as db:
        assert db.get(M.LabOrder, order["id"]).slot_start == ""
        assert db.get(M.AvailabilitySlot, "s-a").booked == 0


def test_past_full_and_foreign_slots_are_refused(harness):
    client, factory, _codes = harness
    order, student = ordered(harness)
    add_slot(factory, "s-other-test", FUTURE_A, item_id="consult-doc", provider="doc")
    put = lambda slot: client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": slot}, headers=student)  # noqa: E731
    assert put("s-past").status_code == 409
    assert put("s-full").status_code == 409
    assert put("s-other-test").status_code == 404
    assert put("missing").status_code == 404
    with factory() as db:
        assert db.get(M.LabOrder, order["id"]).slot_start == ""


def test_no_change_once_the_lab_has_assigned(harness):
    client, factory, codes = harness
    order, student = ordered(harness)
    assert client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": "s-a"}, headers=student).status_code == 200
    client.post("/api/auth/logout", headers=student)

    lab = login(client, codes, "labco@example.test")
    assigned = client.patch(f"/api/lab-orders/{order['id']}", json={"status": "ASSIGNED", "collectorName": "P. Rao"},
                            headers=lab)
    assert assigned.status_code == 200, assigned.text
    queue = client.get("/api/work/lab-orders", headers=lab).json()["items"]
    assert queue[0]["slotStart"] == FUTURE_A  # the lab sees the chosen time
    client.post("/api/auth/logout", headers=lab)

    student = login(client, codes, "pt@example.test")
    assert client.put(f"/api/lab-orders/{order['id']}/slot", json={"slotId": "s-b"}, headers=student).status_code == 409
    assert client.get(f"/api/lab-orders/{order['id']}/slots", headers=student).status_code == 409
    with factory() as db:
        assert db.get(M.LabOrder, order["id"]).slot_start == FUTURE_A
        assert db.get(M.AvailabilitySlot, "s-b").booked == 0
