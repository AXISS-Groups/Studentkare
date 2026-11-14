"""A delivery is refused unless the provider has said it delivers to that pincode (strict)."""
import time

import pytest
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M

SERVED = "500090"
HOME = "500001"
ELSEWHERE = "560001"


@pytest.fixture(autouse=True)
def _mock_payments(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def seed(factory, *, provider=True, delivery=True, active=True, serviceable=(SERVED,), kind="product"):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Pharmacy",
                         role="VENDOR", active=True, profile={}, created_at=time.time()))
        if provider:
            db.add(M.ServiceProvider(id="prov-pharmacy", account_id="prov", kind="PHARMACY", legal_name="Pharmacy",
                                     pincode=HOME, serviceable_pincodes=list(serviceable), delivery_available=delivery,
                                     pickup_available=True, active=active, updated_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind=kind, name="Thermometer", brand="B",
                              category="devices", description="d", pack="1", price_paise=25000, mrp_paise=25000,
                              stock=5, active=True, requires_prescription=False, preparation=""))
        db.commit()


def order(client, headers, pincode, mode="delivery", key="k-00000001"):
    delivery = {"mode": mode, "city": "Hyderabad", "pincode": pincode,
                "address": "Room 214, Block C, Boys Hostel" if mode == "delivery" else ""}
    return client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                       json={"items": [{"id": "item", "quantity": 1}], "delivery": delivery})


def validate(client, headers, pincode, mode=None):
    body = {"items": [{"id": "item", "quantity": 1}], "pincode": pincode}
    if mode:
        body["mode"] = mode
    return client.post("/api/cart/validate", headers=headers, json=body).json()


@pytest.mark.parametrize("pincode", [SERVED, HOME])
def test_delivery_to_a_listed_pincode_or_the_providers_own_is_accepted(harness, pincode):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    seed(factory)
    assert validate(client, headers, pincode)["serviceable"] is True
    assert order(client, headers, pincode).status_code == 201


@pytest.mark.parametrize("setup", [
    {},                               # the provider serves other pincodes, not this one
    {"serviceable": ()},              # the provider listed nothing beyond its own pincode
    {"provider": False},              # the seller has no provider record at all
    {"delivery": False},              # the provider has not said it delivers
    {"active": False},                # the provider record is switched off
])
def test_delivery_anywhere_else_is_refused_and_nothing_is_ordered(harness, setup):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer@x.test")
    seed(factory, **setup)

    check = validate(client, headers, ELSEWHERE)
    assert check["serviceable"] is False
    # The item is in stock; it is the delivery that is refused.
    assert check["items"] == [{"id": "item", "available": True, "stock": 5, "reason": ""}]
    assert "pickup" in check["serviceabilityNote"] and "another address" in check["serviceabilityNote"]

    res = order(client, headers, ELSEWHERE)
    assert res.status_code == 409
    assert res.json()["detail"]["code"] == "NOT_DELIVERED"
    with factory() as db:
        assert db.query(M.Order).filter(M.Order.account_id == user["id"]).count() == 0
        assert db.get(M.CatalogEntry, "item").stock == 5      # nothing was held


def test_the_order_endpoint_refuses_even_when_the_cart_check_is_skipped(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    seed(factory, provider=False)
    assert order(client, headers, SERVED).status_code == 409


@pytest.mark.parametrize("setup", [{}, {"provider": False}, {"delivery": False}])
def test_pickup_needs_no_delivery_cover(harness, setup):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    seed(factory, **setup)
    assert validate(client, headers, ELSEWHERE, mode="pickup")["serviceable"] is True
    assert order(client, headers, ELSEWHERE, mode="pickup").status_code == 201


def test_a_cart_check_without_a_mode_is_treated_as_delivery(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    seed(factory)
    assert validate(client, headers, ELSEWHERE)["serviceable"] is False


def test_a_malformed_pincode_is_refused_before_anything_else(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    seed(factory)
    check = validate(client, headers, "05000")
    assert check["serviceable"] is False and check["serviceabilityNote"] == "Enter a 6-digit pincode."
