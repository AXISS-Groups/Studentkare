"""Insurer eligibility and claim-submission tests (honest unconfigured contract)."""
import time

from sqlalchemy import select

from core import workflow_models as M
from test_workflow_api import harness, register


def _policy(factory, uid):
    with factory() as db:
        db.add(M.Policy(id="pol1", account_id=uid, insurer="Sample Insurer", policy_number="POL-1", sum_insured=500000, valid_until="2027-01-01", created_at=time.time()))
        db.commit()


def test_eligibility_is_honest_unconfigured(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "insured@example.test")
    _policy(factory, user["id"])
    monkeypatch.delenv("INSURER_PROVIDER", raising=False)
    res = client.get("/api/insurance/eligibility", params={"policyId": "pol1"}, headers=headers).json()
    assert res["configured"] is False
    assert res["status"] == "UNAVAILABLE"
    assert "not" in res["message"] and "connected" in res["message"]


def test_claim_submit_is_honest_unconfigured(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = register(client, codes, "insured2@example.test")
    _policy(factory, user["id"])
    monkeypatch.delenv("INSURER_PROVIDER", raising=False)
    claim_id = client.post("/api/insurance/claims", json={"policyId": "pol1", "service": "Room rent", "amountPaise": 10000}, headers=headers).json()["id"]
    res = client.post(f"/api/insurance/claims/{claim_id}/submit", headers=headers).json()
    assert res["submitted"] is False
    assert res["status"] == "UNAVAILABLE"
    # Claim stays a draft, not falsely submitted.
    items = client.get("/api/insurance/claims", headers=headers).json()["items"]
    assert items[0]["status"] == "DRAFT"


def test_eligibility_requires_owned_policy(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "insured3@example.test")
    with factory() as db:
        db.add(M.Account(id="other", identifier="other@example.test", channel="EMAIL", full_name="Other", role="STUDENT", active=True, profile={}, created_at=time.time()))
        db.add(M.Policy(id="pol2", account_id="other", insurer="Other", policy_number="P", sum_insured=1, valid_until="2027-01-01", created_at=time.time()))
        db.commit()
    assert client.get("/api/insurance/eligibility", params={"policyId": "pol2"}, headers=headers).status_code == 404
