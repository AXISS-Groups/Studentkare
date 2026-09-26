"""Inventory, serviceability, and cart-validation tests."""
import time

from sqlalchemy import select
from test_workflow_api import harness, register

from core import workflow_models as M


def _seed(factory):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="in-stock", provider_id="prov", kind="product", name="In Stock", brand="B", category="devices", description="d", pack="1", price_paise=100, mrp_paise=200, stock=5, active=True, requires_prescription=False, preparation=""))
        db.add(M.CatalogEntry(id="out-of-stock", provider_id="prov", kind="product", name="Out", brand="B", category="devices", description="d", pack="1", price_paise=100, mrp_paise=200, stock=0, active=True, requires_prescription=False, preparation=""))
        db.add(M.CatalogEntry(id="rx-item", provider_id="prov", kind="product", name="Rx", brand="B", category="medicines", description="d", pack="1", price_paise=100, mrp_paise=200, stock=5, active=True, requires_prescription=True, preparation=""))
        db.commit()


def test_cart_validate_stock_and_serviceability(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "buyer@example.test")
    _seed(factory)

    res = client.post("/api/cart/validate", json={"items": [{"id": "in-stock", "quantity": 2}, {"id": "out-of-stock", "quantity": 1}], "pincode": "500001"}, headers=headers).json()
    assert res["serviceable"] is False
    by_id = {i["id"]: i for i in res["items"]}
    assert by_id["in-stock"]["available"] is True
    assert by_id["out-of-stock"]["available"] is False


def test_cart_validate_prescription_requires_review(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "buyer2@example.test")
    _seed(factory)
    res = client.post("/api/cart/validate", json={"items": [{"id": "rx-item", "quantity": 1}], "pincode": "500001"}, headers=headers).json()
    assert res["serviceable"] is False
    assert res["items"][0]["reason"] == "prescription review required"


def test_cart_validate_invalid_pincode(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "buyer3@example.test")
    _seed(factory)
    res = client.post("/api/cart/validate", json={"items": [{"id": "in-stock", "quantity": 1}], "pincode": "123"}, headers=headers).json()
    assert res["serviceable"] is False
    assert res["serviceabilityNote"]


def test_inventory_status(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "buyer4@example.test")
    _seed(factory)
    res = client.get("/api/inventory/in-stock", headers=headers).json()
    assert res["stock"] == 5 and res["available"] is True
