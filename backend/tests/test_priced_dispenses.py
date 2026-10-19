"""A prescription that can be bought: choose a pharmacy, it verifies, it quotes, the student pays, it packs.

What these hold to, beyond the happy path:

* the directory lists only pharmacies that can lawfully take a prescription, and
  POST /dispenses refuses any other id;
* only the owning pharmacy prices a dispense, only once a pharmacist verified it,
  and never after the student started paying (the quote is frozen);
* the amount charged is the quote total exactly, or nothing is marked paid;
* a dispense is accepted only by a settled payment, and nothing unpaid is packed;
* Rule L: the commerce record holds a dispense id and amounts, never a medicine,
  and paying gives the payer nothing to read.
"""
import hashlib
import hmac
import json
import time

import pytest
from sqlalchemy import select
from test_clinical_fulfilment import (
    SUCCESS_CARD,
    make_provider,
    make_staff,
    pay_quote,
    put_in_care,
    quote_dispense,
    second_client,
)
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M

STUDENT = "rx-buyer@example.test"


@pytest.fixture(autouse=True)
def _mock_provider(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def signed_webhook(client, payload):
    body = json.dumps(payload).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-webhook-signature": sig})


def verified_dispense(client, factory, codes, mode="delivery", verify=True):
    """A student (on their own client) sends a two-item prescription to ph-1; the pharmacy verifies it.

    Returns a dict with the student's client and headers, the pharmacy's headers
    (signed in on ``client``), the dispense and the prescription.
    """
    student = second_client(client)
    patient, student_headers = register(student, codes, STUDENT)
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "pharm", "VENDOR", "pharm@example.test")
    make_provider(factory, "ph-1", "pharm", "PHARMACY", pincode="500001", legal_name="Alpha Chemists")
    put_in_care(factory, "doc", patient["id"])
    doc_headers = login(client, codes, "doc@example.test")
    prescription = client.post("/api/prescriptions", headers=doc_headers, json={
        "patientId": patient["id"],
        "items": [{"genericName": "Azithromycin", "strength": "500mg", "quantity": 3, "scheduleClass": "H"},
                  {"genericName": "Paracetamol", "strength": "650mg", "quantity": 10}],
    }).json()
    sent = student.post("/api/dispenses", headers=student_headers, json={
        "prescriptionId": prescription["id"], "pharmacyId": "ph-1",
        "delivery": {"mode": mode, "pincode": "500001"} if mode else {}})
    assert sent.status_code == 201, sent.text
    pharm_headers = login(client, codes, "pharm@example.test")
    if verify:
        ok = client.patch(f"/api/dispenses/{sent.json()['id']}", headers=pharm_headers,
                          json={"status": "RX_VERIFIED", "pharmacistName": "R. Iyer"})
        assert ok.status_code == 200, ok.text
    return {"student": student, "student_headers": student_headers, "patient": patient,
            "pharm_headers": pharm_headers, "dispense": sent.json(), "prescription": prescription}


def quoted(client, ctx, **kwargs):
    res = quote_dispense(client, ctx["dispense"]["id"], ctx["pharm_headers"], **kwargs)
    assert res.status_code == 200, res.text
    return res.json()["quote"]


def start_paying(ctx, quote):
    res = ctx["student"].post(f"/api/dispense-quotes/{quote['id']}/payment", headers=ctx["student_headers"],
                              json={"expectedTotalPaise": quote["totalPaise"]})
    assert res.status_code == 200, res.text
    return res.json()


def dispense_status(factory, dispense_id):
    with factory() as db:
        return db.get(M.Dispense, dispense_id).status


def quote_row(factory, quote_id):
    with factory() as db:
        return db.get(M.DispenseQuote, quote_id)


# ══════════════════════════════════════════════════════════════════════════════
# Choosing a pharmacy
# ══════════════════════════════════════════════════════════════════════════════

def test_directory_lists_only_pharmacies_that_can_take_a_prescription(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "dir@example.test")
    make_staff(factory, "v1", "VENDOR", "v1@example.test")
    make_provider(factory, "p-in", "v1", "PHARMACY", pincode="500001", legal_name="Alpha Chemists", pickup=False)
    make_provider(factory, "p-serves", "v1", "PHARMACY", pincode="500002", serviceable=["500001"],
                  legal_name="Beta Pharma", delivery=False)
    make_provider(factory, "p-far", "v1", "PHARMACY", pincode="560001", legal_name="Gamma Medicals")
    make_provider(factory, "p-expired", "v1", "PHARMACY", pincode="500001", licence_expiry=time.time() - 86400)
    make_provider(factory, "p-unlicensed", "v1", "PHARMACY", pincode="500001", licence_no="")
    make_provider(factory, "p-off", "v1", "PHARMACY", pincode="500001", active=False)
    make_provider(factory, "l-1", "v1", "LAB", pincode="500001", legal_name="Delta Diagnostics")

    everywhere = client.get("/api/pharmacies", headers=headers).json()
    assert {p["id"] for p in everywhere["items"]} == {"p-in", "p-serves", "p-far"}

    near = client.get("/api/pharmacies?pincode=500001", headers=headers).json()
    assert [p["id"] for p in near["items"]] == ["p-in", "p-serves"]
    assert near["items"][0] == {
        "id": "p-in", "name": "Alpha Chemists", "area": "500001", "address": "", "pincode": "500001", "serviceablePincodes": [],
        "openHours": "", "delivery": True, "pickup": False, "servesPincode": True,
    }
    assert near["items"][1]["delivery"] is False and near["items"][1]["pickup"] is True
    assert "commission" in near["rankedBy"]


def test_directory_needs_a_session_and_a_real_pincode(harness):
    client, _factory, codes = harness
    assert client.get("/api/pharmacies").status_code == 401
    _user, headers = register(client, codes, "dir2@example.test")
    assert client.get("/api/pharmacies?pincode=12", headers=headers).status_code == 422


@pytest.mark.parametrize("pharmacy_id, delivery, status", [
    ("nope", {}, 404),                                          # no such provider
    ("l-1", {}, 404),                                           # a lab is not a pharmacy
    ("p-off", {}, 404),                                         # inactive
    ("p-expired", {}, 409),                                     # licence lapsed
    ("p-pickup-only", {"mode": "delivery", "pincode": "500001"}, 409),
    ("p-delivery-only", {"mode": "pickup"}, 409),
    ("p-ok", {"mode": "delivery", "pincode": "560001"}, 409),   # does not deliver there
    ("p-ok", {"mode": "drone"}, 422),
    ("p-ok", {"mode": "delivery", "pincode": "500001"}, 201),
])
def test_a_prescription_goes_only_to_a_pharmacy_that_can_fill_it(harness, pharmacy_id, delivery, status):
    client, factory, codes = harness
    patient, _ = register(client, codes, "send@example.test")
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test")
    make_staff(factory, "v1", "VENDOR", "v1@example.test")
    make_provider(factory, "p-ok", "v1", "PHARMACY", pincode="500001")
    make_provider(factory, "p-off", "v1", "PHARMACY", active=False)
    make_provider(factory, "p-expired", "v1", "PHARMACY", licence_expiry=time.time() - 86400)
    make_provider(factory, "p-pickup-only", "v1", "PHARMACY", delivery=False)
    make_provider(factory, "p-delivery-only", "v1", "PHARMACY", pickup=False)
    make_provider(factory, "l-1", "v1", "LAB")
    put_in_care(factory, "doc", patient["id"])
    doc_headers = login(client, codes, "doc@example.test")
    rx = client.post("/api/prescriptions", headers=doc_headers, json={
        "patientId": patient["id"], "items": [{"genericName": "Paracetamol", "quantity": 10}]}).json()
    headers = login(client, codes, "send@example.test")
    res = client.post("/api/dispenses", headers=headers,
                      json={"prescriptionId": rx["id"], "pharmacyId": pharmacy_id, "delivery": delivery})
    assert res.status_code == status, res.text
    with factory() as db:
        assert len(db.scalars(select(M.Dispense)).all()) == (1 if status == 201 else 0)


def test_a_super_admin_records_how_a_pharmacy_hands_over(harness, super_admin_client):
    client, headers = super_admin_client
    created = client.post("/api/ops/service-providers", headers=headers, json={
        "accountId": "admin", "kind": "PHARMACY", "legalName": "Campus Chemists", "licenceNo": "DL-20B-1",
        "pincode": "500001", "pickupAvailable": True})
    assert created.status_code == 201, created.text
    assert created.json()["deliveryAvailable"] is False and created.json()["pickupAvailable"] is True
    updated = client.patch(f"/api/ops/service-providers/{created.json()['id']}", headers=headers,
                           json={"deliveryAvailable": True})
    assert updated.status_code == 200 and updated.json()["deliveryAvailable"] is True


# ══════════════════════════════════════════════════════════════════════════════
# Quoting
# ══════════════════════════════════════════════════════════════════════════════

def test_the_owning_pharmacy_quotes_every_line_and_the_student_sees_the_total(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx, unit_price=2500, delivery_fee=4000)
    # 3 x ₹25 + 10 x ₹25 + ₹40 delivery
    assert (quote["itemsSubtotalPaise"], quote["deliveryFeePaise"], quote["totalPaise"]) == (32500, 4000, 36500)
    assert quote["status"] == "QUOTED" and quote["partial"] is False

    seen = ctx["student"].get(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=ctx["student_headers"]).json()
    assert seen["canPay"] is True and seen["dispenseStatus"] == "RX_VERIFIED"
    assert seen["quote"]["totalPaise"] == 36500
    assert {i["genericName"] for i in seen["quote"]["items"]} == {"Azithromycin", "Paracetamol"}
    assert sum(i["linePaise"] for i in seen["quote"]["items"]) == seen["quote"]["itemsSubtotalPaise"]

    mine = ctx["student"].get("/api/dispenses", headers=ctx["student_headers"]).json()["items"]
    assert mine[0]["quoteStatus"] == "QUOTED" and mine[0]["totalPaise"] == 36500
    assert mine[0]["pharmacyName"] == "Alpha Chemists"
    inbox = ctx["student"].get("/api/notifications", headers=ctx["student_headers"]).json()["items"]
    assert any(e["eventType"] == "DISPENSE_QUOTED" and "₹365.00" in e["payload"]["summary"] for e in inbox)


def test_another_pharmacy_cannot_quote_or_read_the_quote(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    make_staff(factory, "rival", "VENDOR", "rival@example.test")
    make_provider(factory, "ph-2", "rival", "PHARMACY")
    rival = second_client(client)
    rival_headers = login(rival, codes, "rival@example.test")
    body = {"items": [{"prescriptionItemId": i["id"], "quantity": 1, "unitPricePaise": 100}
                      for i in ctx["prescription"]["items"]]}
    assert rival.put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=rival_headers, json=body).status_code == 404
    assert rival.get(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=rival_headers).status_code == 404


def test_a_lab_partner_cannot_quote_a_dispense(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    make_staff(factory, "labco", "VENDOR", "labco@example.test")
    make_provider(factory, "lab-1", "labco", "LAB")
    lab = second_client(client)
    lab_headers = login(lab, codes, "labco@example.test")
    body = {"items": [{"prescriptionItemId": i["id"], "quantity": 1, "unitPricePaise": 100}
                      for i in ctx["prescription"]["items"]]}
    assert lab.put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=lab_headers, json=body).status_code == 404


def test_only_a_partner_account_may_quote(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    body = {"items": [{"prescriptionItemId": i["id"], "quantity": 1, "unitPricePaise": 100}
                      for i in ctx["prescription"]["items"]]}
    # The patient, and the prescribing doctor, are not pharmacies.
    assert ctx["student"].put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=ctx["student_headers"],
                              json=body).status_code == 403
    doctor = second_client(client)
    doc_headers = login(doctor, codes, "doc@example.test")
    assert doctor.put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=doc_headers, json=body).status_code == 403


def test_an_unverified_prescription_cannot_be_priced(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes, verify=False)
    res = quote_dispense(client, ctx["dispense"]["id"], ctx["pharm_headers"])
    assert res.status_code == 409
    assert "verifies" in res.json()["detail"]


@pytest.mark.parametrize("mutate, detail", [
    (lambda items: items[:1], "every item"),
    (lambda items: items + items[:1], "every item"),
    (lambda items: [{**items[0], "quantity": 99}, items[1]], "exceed"),
    (lambda items: [{**items[0], "unitPricePaise": 0}, items[1]], "unit price"),
    (lambda items: [{**i, "quantity": 0} for i in items], "Reject"),
])
def test_a_quote_must_price_the_prescription_as_written(harness, mutate, detail):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    items = [{"prescriptionItemId": i["id"], "quantity": i["quantity"], "unitPricePaise": 2500}
             for i in ctx["prescription"]["items"]]
    res = client.put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=ctx["pharm_headers"],
                     json={"items": mutate(items)})
    assert res.status_code == 422
    assert detail in res.json()["detail"]
    with factory() as db:
        assert db.scalars(select(M.DispenseQuote)).all() == []


def test_a_pickup_order_carries_no_delivery_fee(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes, mode="pickup")
    res = quote_dispense(client, ctx["dispense"]["id"], ctx["pharm_headers"], delivery_fee=3000)
    assert res.status_code == 422


def test_a_requote_before_payment_replaces_the_total_and_a_stale_total_is_refused(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    first = quoted(client, ctx, unit_price=2500)
    second = quoted(client, ctx, unit_price=3000)
    assert second["id"] == first["id"] and second["totalPaise"] == 39000
    stale = ctx["student"].post(f"/api/dispense-quotes/{first['id']}/payment", headers=ctx["student_headers"],
                                json={"expectedTotalPaise": first["totalPaise"]})
    assert stale.status_code == 409
    assert quote_row(factory, first["id"]).status == "QUOTED"


# ══════════════════════════════════════════════════════════════════════════════
# Paying
# ══════════════════════════════════════════════════════════════════════════════

def test_paying_the_quote_accepts_the_dispense_and_only_then_can_it_be_packed(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx, delivery_fee=4000)

    # Unpaid: not acceptable by hand, not packable.
    for status in ("ACCEPTED", "PARTIALLY_ACCEPTED", "PACKED"):
        res = client.patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["pharm_headers"],
                           json={"status": status})
        assert res.status_code == 409, status
    queue = client.get("/api/work/dispenses", headers=ctx["pharm_headers"]).json()["items"][0]
    assert "ACCEPTED" not in queue["nextStates"] and "PARTIALLY_ACCEPTED" not in queue["nextStates"]

    intent = start_paying(ctx, quote)
    assert intent["amountPaise"] == quote["totalPaise"] and intent["testMode"] is True
    assert quote_row(factory, quote["id"]).status == "PAYMENT_STARTED"
    assert client.patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["pharm_headers"],
                        json={"status": "PACKED"}).status_code == 409   # started is not paid

    verified = pay_quote(ctx["student"], quote, ctx["student_headers"])
    assert verified.json()["paymentStatus"] == "PAID" and verified.json()["outcome"] == "PAID"
    assert dispense_status(factory, ctx["dispense"]["id"]) == "ACCEPTED"
    packed = client.patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["pharm_headers"],
                          json={"status": "PACKED"})
    assert packed.status_code == 200, packed.text
    assert packed.json()["quoteStatus"] == "PAID"
    inbox = ctx["student"].get("/api/notifications", headers=ctx["student_headers"]).json()["items"]
    assert any("Payment received" in e["payload"]["summary"] for e in inbox)


def test_a_part_filled_quote_is_partially_accepted_once_paid(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    paracetamol = next(i["id"] for i in ctx["prescription"]["items"] if i["genericName"] == "Paracetamol")
    quote = quoted(client, ctx, quantities={paracetamol: 0})
    assert quote["partial"] is True and quote["totalPaise"] == 7500
    pay_quote(ctx["student"], quote, ctx["student_headers"])
    assert dispense_status(factory, ctx["dispense"]["id"]) == "PARTIALLY_ACCEPTED"


def test_the_quote_is_frozen_once_the_student_starts_paying(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    start_paying(ctx, quote)
    res = quote_dispense(client, ctx["dispense"]["id"], ctx["pharm_headers"], unit_price=1)
    assert res.status_code == 409
    row = quote_row(factory, quote["id"])
    assert (row.status, row.total_paise) == ("PAYMENT_STARTED", quote["totalPaise"])
    with factory() as db:
        items = db.scalars(select(M.DispenseItem).where(M.DispenseItem.dispense_id == ctx["dispense"]["id"])).all()
        assert {i.unit_price_paise for i in items} == {2500}


def test_a_settlement_for_any_other_amount_marks_nothing_paid(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    intent = start_paying(ctx, quote)
    for amount in (quote["totalPaise"] - 1, quote["totalPaise"] + 100, float(quote["totalPaise"]), str(quote["totalPaise"])):
        res = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                      "providerRef": f"pay-{amount}", "amountPaise": amount})
        assert res.status_code == 409, amount
    assert quote_row(factory, quote["id"]).status == "PAYMENT_STARTED"
    assert dispense_status(factory, ctx["dispense"]["id"]) == "RX_VERIFIED"
    with factory() as db:
        assert db.scalars(select(M.Payment)).all() == []


def test_the_webhook_alone_settles_the_quote_and_accepts_the_dispense(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    intent = start_paying(ctx, quote)
    payload = {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
               "providerRef": "pay_hook_1", "amountPaise": quote["totalPaise"]}
    assert signed_webhook(client, payload).json()["outcome"] == "PAID"
    assert signed_webhook(client, payload).json()["outcome"] == "DUPLICATE"
    assert dispense_status(factory, ctx["dispense"]["id"]) == "ACCEPTED"
    with factory() as db:
        payments = db.scalars(select(M.Payment)).all()
        assert len(payments) == 1
        assert (payments[0].payable_kind, payments[0].payable_id, payments[0].order_id) == ("dispense_quote", quote["id"], None)


def test_a_paid_quote_whose_clinical_step_did_not_run_heals_on_the_next_read(harness, monkeypatch):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    intent = start_paying(ctx, quote)
    from services import workflow_api
    monkeypatch.setattr(workflow_api, "_settle_quote_dispense", lambda *a, **k: None)   # the crash
    signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                            "providerRef": "pay_crash", "amountPaise": quote["totalPaise"]})
    assert dispense_status(factory, ctx["dispense"]["id"]) == "RX_VERIFIED"
    # The pharmacy's next move applies the payment first, then packs.
    assert client.patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["pharm_headers"],
                        json={"status": "PACKED"}).status_code == 200


def test_a_declined_card_leaves_the_quote_payable(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    declined = pay_quote(ctx["student"], quote, ctx["student_headers"], card="4000 0000 0000 0002")
    assert declined.json()["outcome"] == "FAILED" and declined.json()["paymentStatus"] == "UNPAID"
    assert dispense_status(factory, ctx["dispense"]["id"]) == "RX_VERIFIED"
    assert pay_quote(ctx["student"], quote, ctx["student_headers"], card=SUCCESS_CARD).json()["paymentStatus"] == "PAID"


def test_with_no_provider_connected_nothing_is_frozen_or_charged(harness, monkeypatch):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    monkeypatch.setenv("PAYMENT_PROVIDER", "razorpay")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    res = ctx["student"].post(f"/api/dispense-quotes/{quote['id']}/payment", headers=ctx["student_headers"],
                              json={"expectedTotalPaise": quote["totalPaise"]}).json()
    assert res["configured"] is False and res["status"] == "UNAVAILABLE"
    assert quote_row(factory, quote["id"]).status == "QUOTED"   # the pharmacy may still change it


def test_someone_else_cannot_pay_or_read_a_quote(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    stranger = second_client(client)
    _user, headers = register(stranger, codes, "stranger@example.test")
    assert stranger.post(f"/api/dispense-quotes/{quote['id']}/payment", headers=headers,
                         json={"expectedTotalPaise": quote["totalPaise"]}).status_code == 404
    assert stranger.get(f"/api/dispense-quotes/{quote['id']}/payment", headers=headers).status_code == 404
    assert stranger.get(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=headers).status_code == 404
    assert stranger.get("/api/dispenses", headers=headers).json()["items"] == []
    assert quote_row(factory, quote["id"]).status == "QUOTED"


# ══════════════════════════════════════════════════════════════════════════════
# Ending a priced dispense
# ══════════════════════════════════════════════════════════════════════════════

def test_cancelling_mid_payment_closes_the_quote_and_a_late_capture_is_raised_for_refund(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    intent = start_paying(ctx, quote)
    cancelled = ctx["student"].patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["student_headers"],
                                     json={"status": "CANCELLED"})
    assert cancelled.status_code == 200 and cancelled.json()["quoteStatus"] == "CANCELLED"
    with factory() as db:
        assert db.scalar(select(M.PaymentIntent.status).where(M.PaymentIntent.payable_id == quote["id"])) == "CANCELLED"
    late = signed_webhook(client, {"event": "payment.captured", "providerOrderId": intent["providerOrderId"],
                                   "providerRef": "pay_late", "amountPaise": quote["totalPaise"]})
    assert late.json()["outcome"] == "LATE"
    assert dispense_status(factory, ctx["dispense"]["id"]) == "CANCELLED"
    with factory() as db:
        assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "PAYMENT_NEEDS_REFUND")) is not None


def test_a_paid_dispense_is_not_cancelled_by_the_student_and_a_rejection_raises_a_refund(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    pay_quote(ctx["student"], quote, ctx["student_headers"])
    refused = ctx["student"].patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["student_headers"],
                                   json={"status": "CANCELLED"})
    assert refused.status_code == 409 and "refund" in refused.json()["detail"]
    rejected = client.patch(f"/api/dispenses/{ctx['dispense']['id']}", headers=ctx["pharm_headers"],
                            json={"status": "REJECTED", "note": "Out of stock"})
    assert rejected.status_code == 200
    with factory() as db:
        event = db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == "PAYMENT_NEEDS_REFUND"))
        assert event is not None and event.resource_id == quote["id"]
        assert "Azithromycin" not in event.summary
    assert quote_row(factory, quote["id"]).status == "PAID"   # the money is real until refunded


def test_a_substitution_voids_an_unpaid_quote_and_is_refused_once_payment_starts(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    item = ctx["prescription"]["items"][0]["id"]
    proposal = {"prescriptionItemId": item, "proposedGeneric": "Azithromycin (generic)", "reason": "Pack out of stock"}
    first = quoted(client, ctx)
    assert client.post(f"/api/dispenses/{ctx['dispense']['id']}/substitutions", headers=ctx["pharm_headers"],
                       json=proposal).status_code == 201
    assert quote_row(factory, first["id"]).status == "CANCELLED"

    doctor = second_client(client)
    decided = doctor.post(f"/api/substitutions/{_proposal_id(factory)}/decide",
                          headers=login(doctor, codes, "doc@example.test"), json={"approve": True})
    assert decided.status_code == 200
    second = quoted(client, ctx)
    assert second["id"] != first["id"]
    start_paying(ctx, second)
    assert client.post(f"/api/dispenses/{ctx['dispense']['id']}/substitutions", headers=ctx["pharm_headers"],
                       json=proposal).status_code == 409


def _proposal_id(factory):
    with factory() as db:
        return db.scalar(select(M.SubstitutionRequest.id))


# ══════════════════════════════════════════════════════════════════════════════
# Rule L
# ══════════════════════════════════════════════════════════════════════════════

def test_the_quote_is_commerce_and_its_line_prices_are_clinical():
    assert rule_l.TABLE_PLANES["care_dispense_quotes"] == rule_l.COMMERCE
    assert rule_l.TABLE_PLANES["care_dispense_items"] == rule_l.CLINICAL
    assert "care_dispense_quotes" in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert "care_dispense_items" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert "care_dispense_quotes" not in rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]


def test_the_commerce_quote_holds_ids_and_amounts_only():
    # Adding a column here is a Rule L decision: no medicine, quantity, prescription or patient field.
    assert set(M.DispenseQuote.__table__.c.keys()) == {
        "id", "dispense_id", "pharmacy_id", "account_id", "items_subtotal_paise", "delivery_fee_paise",
        "total_paise", "currency", "status", "quoted_by", "quoted_at", "payment_started_at", "paid_at", "updated_at"}
    assert not M.DispenseQuote.__table__.foreign_keys   # no reach into a clinical table, even by constraint


def test_nothing_commercial_says_what_was_prescribed(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    intent = start_paying(ctx, quote)
    pay_quote(ctx["student"], quote, ctx["student_headers"])
    status = ctx["student"].get(f"/api/dispense-quotes/{quote['id']}/payment", headers=ctx["student_headers"]).json()
    assert status["paymentStatus"] == "PAID" and status["amountPaise"] == quote["totalPaise"]
    clinical_words = ("Azithromycin", "Paracetamol", "500mg", "650mg", ctx["prescription"]["id"],
                      ctx["dispense"]["id"], "genericName", "prescription")
    for payload in (intent, status):
        text = json.dumps(payload)
        assert not any(word in text for word in clinical_words), text
    with factory() as db:
        commerce_rows = (db.scalars(select(M.DispenseQuote)).all() + db.scalars(select(M.PaymentIntent)).all()
                         + db.scalars(select(M.Payment)).all() + db.scalars(select(M.MockGatewayPayment)).all())
        for row in commerce_rows:
            values = " ".join(str(getattr(row, c)) for c in row.__table__.c.keys())
            assert not any(word in values for word in clinical_words[:4]), values
        events = db.scalars(select(M.OpsEvent).where(M.OpsEvent.resource_type == "dispense_quote")).all()
        assert events and not any(w in e.summary for e in events for w in clinical_words[:4])


def test_the_clinical_dispense_learns_paid_or_unpaid_and_nothing_else(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    pay_quote(ctx["student"], quote, ctx["student_headers"])
    item = client.get("/api/work/dispenses", headers=ctx["pharm_headers"]).json()["items"][0]
    assert item["quoteStatus"] == "PAID"
    text = json.dumps(item)
    for leaked in ("providerRef", "providerOrderId", "provider", "amountPaise", "totalPaise", "mock_pay", "testMode"):
        assert leaked not in text, leaked


def test_paying_grants_the_payer_no_view_of_anyone_elses_records(harness):
    client, factory, codes = harness
    ctx = verified_dispense(client, factory, codes)
    quote = quoted(client, ctx)
    pay_quote(ctx["student"], quote, ctx["student_headers"])
    student = ctx["student"]
    headers = ctx["student_headers"]
    # Paying for medicines does not make a student a pharmacy, a prescriber or an admin.
    assert student.get("/api/work/dispenses", headers=headers).status_code == 403
    assert student.get("/api/v1/pharmacy/rx-reviews", headers=headers).status_code == 403
    assert student.get("/api/ops/dispense-register", headers=headers).status_code == 403
    assert student.put(f"/api/dispenses/{ctx['dispense']['id']}/quote", headers=headers,
                       json={"items": [{"prescriptionItemId": "x", "quantity": 1, "unitPricePaise": 1}]}).status_code == 403
