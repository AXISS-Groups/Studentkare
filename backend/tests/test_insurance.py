"""Insurance benefits directory and honest claim-request tests."""
import time

from core import workflow_models as M
from test_workflow_api import harness, register


def test_benefits_directory_is_reviewed_and_grouped(harness):
    client, _, _ = harness
    res = client.get('/api/insurance/benefits')
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) > 0
    assert all(b["reviewed"] for b in items)
    categories = {b["category"] for b in items}
    assert "hospitalisation" in categories


def test_claim_request_requires_owned_policy_and_is_not_submitted(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "insured@example.test")
    uid = user["id"]
    with factory() as db:
        db.add(M.Account(id="other", identifier="other@example.test", channel="EMAIL", full_name="Other", role="STUDENT", active=True, profile={}, created_at=time.time()))
        db.add(M.Policy(id="mypolicy", account_id=uid, insurer="Sample Insurer", policy_number="POL-1", sum_insured=500000, valid_until="2027-01-01", created_at=time.time()))
        db.add(M.Policy(id="otherpolicy", account_id="other", insurer="Other Insurer", policy_number="POL-2", sum_insured=500000, valid_until="2027-01-01", created_at=time.time()))
        db.commit()

    # Cannot claim against another account's policy.
    res = client.post('/api/insurance/claims', json={"policyId": "otherpolicy", "amountPaise": 5000}, headers=headers)
    assert res.status_code == 404

    res = client.post('/api/insurance/claims', json={"policyId": "mypolicy", "providerName": "City Hospital", "service": "Room rent", "amountPaise": 10000}, headers=headers)
    assert res.status_code == 201
    assert res.json()["status"] == "DRAFT"

    items = client.get('/api/insurance/claims', headers=headers).json()["items"]
    assert len(items) == 1
    assert items[0]["amountPaise"] == 10000
