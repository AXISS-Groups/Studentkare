"""Care-request follow-up worker tests."""
import time

from sqlalchemy import select

from core import workflow_models as M
from services.workflow_scheduler import care_followup_check
from test_workflow_api import harness, register, login


def test_followup_opens_for_overdue_request(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer@example.test")
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind="product", name="Item", brand="B", category="devices", description="d", pack="1", price_paise=45000, mrp_paise=50000, stock=5, active=True, requires_prescription=False, preparation=""))
        db.add(M.Order(id="order1", account_id=user["id"], idempotency_key="k", request_hash="h", total_paise=45000, delivery={"mode": "pickup"}, created_at=time.time() - 3 * 86400))
        db.add(M.OrderLine(id="line1", order_id="order1", item_id="item", provider_id="prov", name="Item", kind="product", quantity=1, price_paise=45000, status="REQUESTED"))
        db.commit()

    with factory() as db:
        res = care_followup_check(db)
        assert res["summary"]["followups_created"] == 1
        # Deduplicated: running again must not create a second task.
        res2 = care_followup_check(db)
        assert res2["summary"]["followups_created"] == 0

    # Staff can list and resolve.
    staff_headers = login(client, codes, "prov@example.test")
    items = client.get("/api/work/followups", headers=staff_headers).json()["items"]
    assert len(items) == 1
    assert client.post(f"/api/work/followups/{items[0]['id']}/resolve", headers=staff_headers).status_code == 200


def test_followup_respects_account_scope(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer2@example.test")
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Provider", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.Account(id="otherprov", identifier="other@example.test", channel="EMAIL", full_name="Other", role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.Order(id="order1", account_id=user["id"], idempotency_key="k", request_hash="h", total_paise=1, delivery={"mode": "pickup"}, created_at=time.time() - 3 * 86400))
        db.add(M.OrderLine(id="line1", order_id="order1", item_id="item", provider_id="prov", name="Item", kind="product", quantity=1, price_paise=1, status="REQUESTED"))
        db.commit()
    with factory() as db:
        care_followup_check(db)
    # A different provider cannot see the follow-up.
    other_headers = login(client, codes, "other@example.test")
    assert client.get("/api/work/followups", headers=other_headers).json()["items"] == []
