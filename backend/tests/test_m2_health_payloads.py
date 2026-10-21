"""Package A of the Mobile 2.0 health plan: the payload additions its screens read.

- GET /preventive/report-reviews names the reviewing doctor once approved (M2Insights).
- GET /health/documents counts the owner's documents per category (M2Profile).
- shop.cart_line_max bounds a cart line (M2Product's stepper), on the server too.
"""
from test_honest_data import override
from test_inventory import _seed as seed_stock
from test_preventive_care import ROOT, assigned_review, guidance, report
from test_workflow_api import harness, login, register  # noqa: F401

from core import settings_registry as R
from core import workflow_models as M


def test_reviewer_name_only_once_approved_and_only_for_the_owner(harness):
    client, _factory, codes = harness
    _user, _doc, review, _share = assigned_review(harness)
    login(client, codes, "member@example.test")
    pending = client.get(f"{ROOT}/report-reviews").json()["items"][0]
    assert pending["status"] == "ASSIGNED" and pending["reviewedByName"] is None
    doctor_headers = login(client, codes, "doctor@example.test")
    approved = client.post(f"{ROOT}/work/report-reviews/{review['id']}/review", headers=doctor_headers,
                           json=guidance(review["version"]))
    assert approved.status_code == 200, approved.text
    member_headers = login(client, codes, "member@example.test")
    mine = client.get(f"{ROOT}/report-reviews").json()["items"][0]
    assert mine["status"] == "APPROVED" and mine["reviewedByName"] == "Test NMC_DOCTOR"
    client.post("/api/auth/logout", headers=member_headers)
    register(client, codes, "other@example.test")
    assert client.get(f"{ROOT}/report-reviews").json()["items"] == []


def test_document_category_counts_are_the_owners_only(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    report(client, headers)
    report(client, headers)
    upload = client.post("/api/health/documents", headers=headers, data={"title": "Old card", "category": "VACCINE"},
                         files={"file": ("card.pdf", b"%PDF-1.4\nSynthetic card", "application/pdf")})
    assert upload.status_code == 201, upload.text
    body = client.get("/api/health/documents?limit=1").json()
    assert body["total"] == 3 and len(body["items"]) == 1
    assert body["categoryCounts"] == {"LAB": 2, "VACCINE": 1}
    client.post("/api/auth/logout", headers=headers)
    _other, other_headers = register(client, codes, "other@example.test")
    other = client.get("/api/health/documents").json()
    assert other["total"] == 0 and other["categoryCounts"] == {}
    client.post("/api/auth/logout", headers=other_headers)
    assert client.get("/api/health/documents").status_code == 401


def test_cart_line_max_bounds_validate_and_orders(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@example.test")
    seed_stock(factory)
    assert R.setting("shop.cart_line_max") == 10
    assert any(s.key == "shop.cart_line_max" for s in R.public_settings())
    override(factory, "shop.cart_line_max", 2)
    res = client.post("/api/cart/validate", headers=headers,
                      json={"items": [{"id": "in-stock", "quantity": 3}], "pincode": "500001"}).json()
    assert res["serviceable"] is False and res["items"][0]["available"] is False
    ok = client.post("/api/cart/validate", headers=headers,
                     json={"items": [{"id": "in-stock", "quantity": 2}], "pincode": "500001"}).json()
    assert ok["items"][0]["available"] is True
    refused = client.post("/api/orders", headers={**headers, "Idempotency-Key": "m2-line-max-1"}, json={
        "items": [{"id": "in-stock", "quantity": 3}],
        "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"},
    })
    assert refused.status_code == 422, refused.text
    with factory() as db:
        assert db.get(M.CatalogEntry, "in-stock").stock == 5
    R.reset_cache()
