"""Returns, hostel visits, refills and My requests."""
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures


def partner(client, codes, factory, identifier="pharmacy@x.test"):
    user, h = register(client, codes, identifier)
    with factory() as db:
        db.get(M.Account, user["id"]).role = "VENDOR"
        db.add(M.CatalogEntry(id=f"cat-{user['id'][:6]}", provider_id=user["id"], kind="product", name="Paracetamol 500",
                              brand="B", category="medicines", description="d", pack="10", price_paise=5000, stock=5, active=True))
        db.commit()
    client.post("/api/auth/logout", headers=h)
    return user


def student_with_line(client, codes, factory, provider_id, line_status="COMPLETED"):
    user, headers = register(client, codes, "stu@x.test")
    with factory() as db:
        db.add(M.Order(id="o1", account_id=user["id"], idempotency_key="k", request_hash="h", total_paise=10000,
                       delivery={}, created_at=time.time()))
        db.add(M.OrderLine(id="l1", order_id="o1", item_id=f"cat-{provider_id[:6]}", provider_id=provider_id, name="Paracetamol 500",
                           kind="product", quantity=2, price_paise=5000, status=line_status))
        db.commit()
    return user, headers


def test_return_flow_is_scoped_capped_and_never_claims_a_refund(harness):
    client, factory, codes = harness
    pharm = partner(client, codes, factory)
    other = partner(client, codes, factory, "other@x.test")
    user, headers = student_with_line(client, codes, factory, pharm["id"])

    assert [i["orderLineId"] for i in client.get("/api/returns/eligible").json()["items"]] == ["l1"]
    assert client.post("/api/returns", headers=headers, json={"orderLineId": "l1", "reason": "OTHER", "note": ""}).status_code == 422
    created = client.post("/api/returns", headers=headers, json={"orderLineId": "l1", "reason": "DAMAGED", "note": "Seal broken"})
    assert created.status_code == 201
    rid = created.json()["return"]["id"]
    assert client.post("/api/returns", headers=headers, json={"orderLineId": "l1", "reason": "DAMAGED"}).status_code == 409
    assert client.get("/api/returns/eligible").json()["items"] == []
    bad = client.post(f"/api/returns/{rid}/photo", headers=headers, files={"file": ("x.png", b"not a png", "image/png")})
    assert bad.status_code == 415
    ok = client.post(f"/api/returns/{rid}/photo", headers=headers, files={"file": ("x.png", b"\x89PNG....", "image/png")})
    assert ok.json()["return"]["hasPhoto"] is True
    client.post("/api/auth/logout", headers=headers)

    oh = login(client, codes, "other@x.test")
    assert client.get("/api/work/returns").json()["items"] == []
    assert client.post(f"/api/work/returns/{rid}/decide", headers=oh, json={"decision": "APPROVED", "refundPaise": 100}).status_code == 404
    client.post("/api/auth/logout", headers=oh)

    ph = login(client, codes, "pharmacy@x.test")
    assert client.post(f"/api/work/returns/{rid}/decide", headers=ph, json={"decision": "APPROVED", "refundPaise": 999999}).status_code == 422
    decided = client.post(f"/api/work/returns/{rid}/decide", headers=ph, json={"decision": "APPROVED", "refundPaise": 10000}).json()["return"]
    assert decided["status"] == "APPROVED" and decided["refundStatus"] == "TO_ARRANGE"
    assert client.post(f"/api/work/returns/{rid}/picked-up", headers=ph).json()["return"]["status"] == "PICKED_UP"
    with factory() as db:
        note = db.scalar(select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"], M.OutboxEvent.event_type == "RETURN_APPROVED"))
        assert note is not None


def test_undelivered_items_cannot_be_returned(harness):
    client, factory, codes = harness
    pharm = partner(client, codes, factory)
    _, headers = student_with_line(client, codes, factory, pharm["id"], line_status="REQUESTED")
    assert client.post("/api/returns", headers=headers, json={"orderLineId": "l1", "reason": "NOT_NEEDED"}).status_code == 409


def test_hostel_visit_claim_complete_and_decline_rules(harness):
    client, factory, codes = harness
    partner(client, codes, factory)
    _, headers = register(client, codes, "stu@x.test")
    start = time.time() + 3600
    assert client.post("/api/hostel-visits", headers=headers, json={"service": "LAB_PICKUP", "hostelBlock": "B", "room": "214",
                                                                   "windowStart": start, "windowEnd": start + 600}).status_code == 422
    vid = client.post("/api/hostel-visits", headers=headers, json={"service": "LAB_PICKUP", "hostelBlock": "B", "room": "214",
                                                                  "windowStart": start, "windowEnd": start + 3600}).json()["visit"]["id"]
    client.post("/api/auth/logout", headers=headers)
    ph = login(client, codes, "pharmacy@x.test")
    assert [v["id"] for v in client.get("/api/work/hostel-visits").json()["items"]] == [vid]
    # Not taken by this partner yet: completing it is refused as not found.
    assert client.post(f"/api/work/hostel-visits/{vid}", headers=ph, json={"action": "COMPLETE"}).status_code == 404
    assert client.post(f"/api/work/hostel-visits/{vid}", headers=ph, json={"action": "CLAIM"}).json()["visit"]["status"] == "ASSIGNED"
    assert client.post(f"/api/work/hostel-visits/{vid}", headers=ph, json={"action": "DECLINE"}).status_code == 422
    assert client.post(f"/api/work/hostel-visits/{vid}", headers=ph, json={"action": "COMPLETE"}).json()["visit"]["status"] == "COMPLETED"


def test_refill_only_for_own_active_plan_and_messages_hold_no_medicine_name(harness):
    client, factory, codes = harness
    pharm = partner(client, codes, factory)
    user, headers = register(client, codes, "stu@x.test")
    with factory() as db:
        db.add(M.MedicationPlan(id="p1", account_id=user["id"], name="Sertraline", dosage="50 mg", frequency="daily", created_at=time.time()))
        db.commit()
    assert [p["id"] for p in client.get("/api/refills/pharmacies").json()["items"]] == [pharm["id"]]
    assert client.post("/api/refills", headers=headers, json={"planId": "nope", "providerId": pharm["id"], "quantity": 1}).status_code == 404
    rid = client.post("/api/refills", headers=headers, json={"planId": "p1", "providerId": pharm["id"], "quantity": 1}).json()["refill"]["id"]
    assert client.post("/api/refills", headers=headers, json={"planId": "p1", "providerId": pharm["id"], "quantity": 1}).status_code == 409
    client.post("/api/auth/logout", headers=headers)
    ph = login(client, codes, "pharmacy@x.test")
    assert client.post(f"/api/work/refills/{rid}", headers=ph, json={"action": "READY"}).status_code == 409
    client.post(f"/api/work/refills/{rid}", headers=ph, json={"action": "ACCEPT"})
    client.post(f"/api/work/refills/{rid}", headers=ph, json={"action": "READY"})
    with factory() as db:
        summaries = [e.payload for e in db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"])).all()]
    assert summaries and all("Sertraline" not in str(s) for s in summaries)


def test_my_requests_lists_everything_newest_first(harness):
    client, factory, codes = harness
    pharm = partner(client, codes, factory)
    user, headers = student_with_line(client, codes, factory, pharm["id"])
    client.post("/api/returns", headers=headers, json={"orderLineId": "l1", "reason": "WRONG_ITEM"})
    kinds = [i["kind"] for i in client.get("/api/my-requests").json()["items"]]
    assert kinds[0] == "RETURN" and "ORDER" in kinds
