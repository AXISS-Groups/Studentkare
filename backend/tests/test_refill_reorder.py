"""Refill reminders and one-tap reorder: counting, reminders, live prices, prescriptions, stock, Rule L.

The run-out date is the student's own counts divided out (no dosing advice);
reminders are ordinary REMINDER_EVENT_TYPES (the student's switch and quiet
hours apply, and they name nothing outside the app); a reorder is priced from
the live catalogue and refused if the price moved; prescription items are never
sold through the shop; and nothing on the commerce side can learn a refill exists.
"""
import inspect
import time
from datetime import date, timedelta

import pytest
from sqlalchemy import select
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M
from services import refill_tracker, reorder, workflow_scheduler
from services.commerce_session import commerce_db


@pytest.fixture(autouse=True)
def _mock_payments(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def seed(factory, item_id="item", *, price=12000, stock=20, rx=False, name="Cetirizine 10 mg strip"):
    with factory() as db:
        if db.get(M.Account, "prov") is None:
            db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Pharmacy",
                             role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id=item_id, provider_id="prov", kind="product", name=name, brand="B",
                              category="medicines", description="d", pack="Strip of 10", price_paise=price,
                              mrp_paise=price, stock=stock, active=True, requires_prescription=rx, preparation=""))
        db.commit()


DELIVERY = {"mode": "delivery", "address": "Room 214, Block C, Boys Hostel", "city": "Hyderabad", "pincode": "500090"}


def place(client, headers, items, key="order-key-1", **extra):
    return client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                       json={"items": items, "delivery": DELIVERY, **extra})


def ordered(client, headers, factory, quantity=2):
    seed(factory)
    res = place(client, headers, [{"id": "item", "quantity": quantity}])
    assert res.status_code == 201, res.text
    return res.json()


def track_order(client, headers, order_id, *, started=None, pack=10, per_dose=1, per_day=1, days_before=None):
    body = {"source": "ORDER", "orderId": order_id, "itemId": "item", "packSize": pack, "unitsPerDose": per_dose,
            "dosesPerDay": per_day}
    if started:
        body["startedOn"] = started.isoformat()
    if days_before:
        body["remindDaysBefore"] = days_before
    return client.post("/api/refill-tracker", headers=headers, json=body)


# --- counting -----------------------------------------------------------------------


def test_run_out_is_units_on_hand_divided_by_units_a_day():
    assert refill_tracker.runs_out_on(date(2026, 10, 1), 30, 2) == date(2026, 10, 16)
    assert refill_tracker.runs_out_on(date(2026, 10, 1), 31, 2) == date(2026, 10, 16)   # half a day is not a day
    assert refill_tracker.runs_out_on(date(2026, 10, 1), 1, 2) == date(2026, 10, 1)


def test_a_refill_from_a_past_order_takes_the_line_and_counts_its_packs(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf1@example.test")
    order = ordered(client, headers, factory, quantity=2)
    today = date.today()
    res = track_order(client, headers, order["id"], started=today, pack=10, per_dose=1, per_day=2)
    assert res.status_code == 201, res.text
    refill = res.json()["refill"]
    assert refill["label"] == "Cetirizine 10 mg strip"
    assert refill["packs"] == 2 and refill["unitsLeft"] == 20 and refill["unitsPerDay"] == 2
    assert refill["runsOutOn"] == (today + timedelta(days=10)).isoformat()
    assert refill["remindDaysBefore"] == 3   # refill.remind_days_before_default
    assert refill["canReorder"] is True
    # The same item twice is refused; listing returns it.
    assert track_order(client, headers, order["id"]).status_code == 409
    assert [r["id"] for r in client.get("/api/refill-tracker", headers=headers).json()["items"]] == [refill["id"]]


def test_someone_elses_order_cannot_be_tracked(harness):
    client, factory, codes = harness
    _a, a_headers = register(client, codes, "rf-a@example.test")
    order = ordered(client, a_headers, factory)
    client.post("/api/auth/logout", headers=a_headers)
    _b, b_headers = register(client, codes, "rf-b@example.test")
    res = track_order(client, b_headers, order["id"])
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "ORDER_NOT_FOUND"


def test_a_refill_from_a_pill_reminder_uses_the_plan(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes, "rf2@example.test")
    plan = client.post("/api/meds/plans", json={"name": "Vitamin D3", "dosage": "1 capsule", "timesPerDay": 1},
                       headers=headers).json()
    plans = client.get("/api/refill-tracker/plans", headers=headers).json()["items"]
    assert plans == [{"id": plan["id"], "name": "Vitamin D3", "timesPerDay": 1}]
    res = client.post("/api/refill-tracker", headers=headers, json={
        "source": "PLAN", "planId": plan["id"], "packSize": 30, "unitsPerDose": 1, "dosesPerDay": 1})
    assert res.status_code == 201, res.text
    assert res.json()["refill"]["canReorder"] is False   # a plan's refill goes to a pharmacy, not the shop
    assert client.get("/api/refill-tracker/plans", headers=headers).json()["items"] == []


def test_counts_and_dates_are_bounded_by_the_registry(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf3@example.test")
    order = ordered(client, headers, factory)
    too_big = track_order(client, headers, order["id"], pack=100001)
    assert too_big.status_code == 422 and too_big.json()["detail"]["code"] == "PACK_SIZE_OUT_OF_RANGE"
    future = track_order(client, headers, order["id"], started=date.today() + timedelta(days=2))
    assert future.status_code == 422 and future.json()["detail"]["code"] == "START_DATE_OUT_OF_RANGE"
    far = track_order(client, headers, order["id"], days_before=99)
    assert far.status_code == 422 and far.json()["detail"]["code"] == "REMIND_DAYS_OUT_OF_RANGE"


def test_still_have_some_restock_toggle_snooze_and_delete(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf4@example.test")
    order = ordered(client, headers, factory, quantity=1)
    today = date.today()
    refill = track_order(client, headers, order["id"], started=today, pack=10).json()["refill"]
    url = f"/api/refill-tracker/{refill['id']}"

    adjusted = client.post(f"{url}/adjust", headers=headers, json={"unitsLeft": 4}).json()["refill"]
    assert adjusted["unitsLeft"] == 4 and adjusted["runsOutOn"] == (today + timedelta(days=4)).isoformat()
    restocked = client.post(f"{url}/restock", headers=headers, json={"packs": 1}).json()["refill"]
    assert restocked["unitsLeft"] == 14

    off = client.patch(url, headers=headers, json={"enabled": False}).json()["refill"]
    assert off["enabled"] is False
    snoozed = client.post(f"{url}/snooze", headers=headers, json={}).json()["refill"]
    assert snoozed["snoozedUntil"] > time.time()

    assert client.delete(url, headers=headers).json() == {"success": True}
    assert client.get("/api/refill-tracker", headers=headers).json()["items"] == []
    assert client.post(f"{url}/snooze", headers=headers, json={}).status_code == 404


# --- reminders ----------------------------------------------------------------------


def due_refill(client, headers, factory):
    """A pack of 10, one a day, started 8 days ago: runs out in 2 days, reminder (3 before) is due."""
    order = ordered(client, headers, factory, quantity=1)
    res = track_order(client, headers, order["id"], started=date.today() - timedelta(days=8), pack=10)
    assert res.status_code == 201, res.text
    return res.json()["refill"]


def refill_events(factory):
    with factory() as db:
        return db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "medication_refill")).all()


def test_a_due_refill_is_reminded_once_with_ids_only(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf5@example.test")
    refill = due_refill(client, headers, factory)
    with factory() as db:
        assert refill_tracker.queue_due_reminders(db)["summary"]["queued"] == 1
        assert refill_tracker.queue_due_reminders(db)["summary"]["queued"] == 0   # one per run-out date
    events = refill_events(factory)
    assert len(events) == 1
    assert events[0].payload == {"resourceType": "refill_tracker", "resourceId": refill["id"]}
    # The type is a reminder: the student's switch and quiet hours apply to it.
    assert "medication_refill" in workflow_scheduler.REMINDER_EVENT_TYPES
    # Outside the app it names no medicine.
    assert "Cetirizine" not in workflow_scheduler.reminder_message("medication_refill")


def test_reminders_off_snoozed_or_switched_off_are_not_sent(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf6@example.test")
    refill = due_refill(client, headers, factory)
    url = f"/api/refill-tracker/{refill['id']}"

    client.patch(url, headers=headers, json={"enabled": False})
    with factory() as db:
        assert refill_tracker.queue_due_reminders(db)["summary"]["queued"] == 0
    client.patch(url, headers=headers, json={"enabled": True})
    client.post(f"{url}/snooze", headers=headers, json={})
    with factory() as db:
        assert refill_tracker.queue_due_reminders(db)["summary"]["queued"] == 0
        # After the snooze it comes back for the same run-out date.
        later = time.time() + 2 * refill_tracker.DAY_SECONDS
        assert refill_tracker.queue_due_reminders(db, at=later)["summary"]["queued"] == 1

    # The student's "reminders" switch suppresses delivery.
    assert client.put("/api/notifications/preferences", json={"remindersEnabled": False}, headers=headers).status_code == 200
    with factory() as db:
        workflow_scheduler._process_outbox(db)
    assert [e.status for e in refill_events(factory)] == ["SUPPRESSED"]


# --- reorder: live prices, prescriptions, stock ----------------------------------------


def test_the_quote_is_todays_price_and_a_stale_total_is_refused(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf7@example.test")
    order = ordered(client, headers, factory, quantity=2)
    with factory() as db:
        db.get(M.CatalogEntry, "item").price_paise = 15000
        db.commit()
    quote = client.post(f"/api/orders/{order['id']}/reorder-quote", headers=headers, json={}).json()
    assert quote["lines"][0]["pricePaise"] == 15000 and quote["lines"][0]["state"] == "OK"
    assert quote["totalPaise"] == 30000 and quote["ready"] is True
    assert quote["delivery"] == DELIVERY

    stale = place(client, headers, [{"id": "item", "quantity": 2}], key="reorder-key-1", expectedTotalPaise=24000)
    assert stale.status_code == 409 and stale.json()["detail"]["code"] == "PRICE_CHANGED"
    fresh = place(client, headers, [{"id": "item", "quantity": 2}], key="reorder-key-2", expectedTotalPaise=quote["totalPaise"])
    assert fresh.status_code == 201 and fresh.json()["totalPaise"] == 30000


def test_prescription_and_out_of_stock_lines_are_not_priced_in_and_never_substituted(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "rf8@example.test")
    order = ordered(client, headers, factory, quantity=1)
    with factory() as db:
        db.get(M.CatalogEntry, "item").stock = 0
        db.add(M.OrderLine(id="rx-line", order_id=order["id"], item_id="rx", provider_id="prov", name="Rx item",
                           kind="product", quantity=1, price_paise=5000, status="COMPLETED"))
        db.commit()
    seed(factory, "rx", price=5000, rx=True, name="Rx item")
    quote = client.post(f"/api/orders/{order['id']}/reorder-quote", headers=headers, json={}).json()
    states = {line["itemId"]: line["state"] for line in quote["lines"]}
    assert states == {"item": "OUT_OF_STOCK", "rx": "PRESCRIPTION"}
    # The pharmacy quotes a prescription item's price after its check; the shop shows none.
    assert next(line for line in quote["lines"] if line["itemId"] == "rx")["pricePaise"] is None
    assert quote["totalPaise"] == 0 and quote["ready"] is False
    assert set(quote) == {"orderId", "quotedAt", "delivery", "lines", "totalPaise", "ready"}   # no alternatives
    # The shop still refuses the prescription item outright.
    assert place(client, headers, [{"id": "rx", "quantity": 1}], key="rx-order-key-1").status_code == 409


def test_back_in_stock_alert_tells_the_student_once_without_naming_the_item(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "rf9@example.test")
    order = ordered(client, headers, factory, quantity=1)
    with factory() as db:
        db.get(M.CatalogEntry, "item").stock = 0
        db.commit()
    assert client.post("/api/catalog/item/stock-alert", headers=headers).json()["status"] == "WAITING"
    quote = client.post(f"/api/orders/{order['id']}/reorder-quote", headers=headers, json={}).json()
    assert quote["lines"][0]["stockAlert"] is True
    with factory() as db:
        assert reorder.notify_back_in_stock(db)["summary"]["notified"] == 0
        db.get(M.CatalogEntry, "item").stock = 5
        db.commit()
        assert reorder.notify_back_in_stock(db)["summary"]["notified"] == 1
        assert reorder.notify_back_in_stock(db)["summary"]["notified"] == 0
        notices = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "STOCK_BACK")).all()
    assert len(notices) == 1 and notices[0].account_id == user["id"]
    assert "Cetirizine" not in notices[0].payload["summary"]
    assert client.get("/api/stock-alerts", headers=headers).json()["items"] == []


def test_prescription_status_counts_only_unexpired_issued_prescriptions(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "rf10@example.test")
    assert client.get("/api/refill-tracker/rx-status", headers=headers).json() == {"validCount": 0, "latestValidUntil": None}
    now = time.time()
    with factory() as db:
        for rx_id, valid_until in (("rx-valid", now + 86400 * 10), ("rx-expired", now - 60), ("rx-no-expiry", 0.0)):
            db.add(M.Prescription(id=rx_id, prescriber_id="prov", patient_id=user["id"], issued_at=now - 86400,
                                  valid_until=valid_until, status="ISSUED"))
        db.commit()
    status = client.get("/api/refill-tracker/rx-status", headers=headers).json()
    assert status["validCount"] == 1   # expired and "no recorded expiry" both fail closed
    assert status["latestValidUntil"] == pytest.approx(now + 86400 * 10)


# --- Rule L ---------------------------------------------------------------------------


def _routes(router):
    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)
    return {f"{m} {r.path}": set(deps(r.dependant)) for r in router.routes for m in r.methods}


def test_planes_refills_are_clinical_and_stock_alerts_commerce():
    assert rule_l.TABLE_PLANES["care_refill_trackers"] == rule_l.CLINICAL
    assert rule_l.TABLE_PLANES["care_stock_alerts"] == rule_l.COMMERCE
    assert "care_refill_trackers" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]


def test_every_reorder_route_runs_as_commerce_and_is_listed():
    routes = _routes(reorder.router)
    assert set(routes) == set(reorder.REORDER_COMMERCE_PATHS)
    assert all(commerce_db in calls for calls in routes.values())


def test_refill_routes_stay_clinical_except_reading_the_order_line():
    routes = _routes(refill_tracker.router)
    assert {k for k, calls in routes.items() if commerce_db in calls} == {"POST /api/refill-tracker"}


def test_commerce_code_never_names_a_refill_or_health_record():
    source = inspect.getsource(reorder)
    code = "\n".join(line for line in source.splitlines() if not line.lstrip().startswith("#"))
    body = code.split('"""', 2)[2]   # past the module docstring, which explains the rule
    for name in ("RefillTracker", "refill_tracker", "MedicationPlan", "M.Prescription", "care_prescriptions", "care_refill",
                 "care_medication"):
        assert name not in body, f"services/reorder.py mentions {name}"
    # The quote asks only for item ids: a reminder or plan id cannot be passed to commerce.
    assert set(reorder.QuoteInput.model_fields) == {"itemIds"}


def test_offers_and_rewards_never_read_refill_reminders():
    from services import consent_ledger, preventive_care, rewards, rewards_api
    for module in (preventive_care, rewards, rewards_api, consent_ledger):
        source = inspect.getsource(module)
        assert "RefillTracker" not in source and "refill_tracker" not in source and "medication_refill" not in source
