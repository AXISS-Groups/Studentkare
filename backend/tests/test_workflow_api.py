"""Real request contracts, isolated SQL storage, and a mocked delivery boundary."""
import time
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from services.db_sql import Base
from services.workflow_auth import workflow_db
from services import workflow_auth
from core import workflow_models as M


@pytest.fixture
def harness(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    def database():
        with factory() as session:
            yield session
    codes = []
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda identifier, code, channel: codes.append(code) or True)
    app.dependency_overrides[workflow_db] = database
    client = TestClient(app)
    yield client, factory, codes
    app.dependency_overrides.clear()
    client.close()
    engine.dispose()


def register(client, codes, identifier="member@example.test"):
    sent = client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": "EMAIL", "intent": "SIGNUP"})
    assert sent.status_code == 200, sent.text
    checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    assert checked.status_code == 200, checked.text
    assert checked.json()["requiresSignup"] is True
    assert client.get("/api/auth/session").json()["user"] is None
    headers = {"X-CSRF-Token": checked.json()["csrfToken"]}
    result = client.post("/api/auth/signup", headers=headers, json={"fullName": "Test Member", "dob": "2000-03-14", "university": "Test University", "rollNumber": "TEST-42"})
    assert result.status_code == 201, result.text
    return result.json()["user"], {"X-CSRF-Token": result.json()["csrfToken"]}


def login(client, codes, identifier):
    assert client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": "EMAIL", "intent": "LOGIN"}).status_code == 200
    response = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    assert response.status_code == 200, response.text
    return {"X-CSRF-Token": response.json()["csrfToken"]}


def test_signup_is_verified_pending_and_persistent(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    assert user["role"] == "STUDENT"
    assert user["ageVerified"] is False
    assert user["isVerifiedStudent"] is False
    assert user["email"] == "member@example.test"
    assert client.get("/api/auth/session").json()["user"]["id"] == user["id"]
    with factory() as db:
        assert len(db.scalars(select(M.Account)).all()) == 1
    assert "HttpOnly" in client.post("/api/auth/logout", headers=headers).headers["set-cookie"]
    assert client.get("/api/auth/session").json()["user"] is None
    assert client.get("/api/health/readings").status_code == 401


def test_no_signup_without_verified_grant_or_role_injection(harness):
    client, _, codes = harness
    body = {"fullName": "Test", "dob": "2000-01-01", "university": "Test", "rollNumber": "T1"}
    assert client.post("/api/auth/signup", json=body).status_code == 401
    client.post("/api/auth/otp/send", json={"identifier": "new@example.test", "channel": "EMAIL", "intent": "SIGNUP"})
    check = client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()
    assert client.post("/api/auth/signup", json=body, headers={"X-CSRF-Token": "bad"}).status_code == 403
    assert client.post("/api/auth/signup", json={**body, "role": "SUPER_ADMIN"}, headers={"X-CSRF-Token": check["csrfToken"]}).status_code == 422


def test_delivery_failure_does_not_claim_success(harness, monkeypatch):
    client, _, _ = harness
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda *_: False)
    response = client.post("/api/auth/otp/send", json={"identifier": "a@example.test", "channel": "EMAIL", "intent": "LOGIN"})
    assert response.status_code == 503
    assert not client.cookies.get("sacare_challenge")


def test_otp_single_use_attempt_limit_and_no_auto_account(harness):
    client, factory, codes = harness
    body = {"identifier": "missing@example.test", "channel": "EMAIL", "intent": "LOGIN"}
    client.post("/api/auth/otp/send", json=body)
    for _ in range(5):
        assert client.post("/api/auth/otp/verify", json={"otp": "000000"}).status_code == 401
    assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).status_code in (401, 429)
    with factory() as db:
        assert db.scalar(select(M.Account)) is None
    client.post("/api/auth/otp/send", json=body)
    assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).status_code in (404, 429)
    assert client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).status_code in (401, 429)


def test_readings_are_owned_and_mutations_require_csrf(harness):
    client, _, codes = harness
    first, headers = register(client, codes)
    reading = {"metric": "heart", "value": 74, "recordedAt": datetime.now(timezone.utc).isoformat()}
    assert client.post("/api/health/readings", json=reading).status_code == 403
    assert client.post("/api/health/readings", json={**reading, "accountId": "someone-else"}, headers=headers).status_code == 422
    assert client.post("/api/health/readings", json=reading, headers=headers).status_code == 201
    assert len(client.get("/api/health/readings").json()["items"]) == 1
    assert client.get("/api/ops/summary").status_code == 403
    client.post("/api/auth/logout", headers=headers)
    register(client, codes, "second@example.test")
    assert client.get("/api/health/readings").json()["items"] == []


def test_private_documents_validate_content_and_ownership(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    invalid = client.post("/api/health/documents", headers=headers, data={"title": "Report", "category": "LAB"}, files={"file": ("report.pdf", b"not a pdf", "application/pdf")})
    assert invalid.status_code == 422
    uploaded = client.post("/api/health/documents", headers=headers, data={"title": "Report", "category": "LAB"}, files={"file": ("report.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")})
    assert uploaded.status_code == 201, uploaded.text
    document_id = uploaded.json()["id"]
    assert client.get(f"/api/health/documents/{document_id}/file").status_code == 200
    client.post("/api/auth/logout", headers=headers)
    register(client, codes, "second@example.test")
    assert client.get(f"/api/health/documents/{document_id}/file").status_code == 404


def test_catalog_orders_authoritative_prices_and_vendor_isolation(harness):
    client, factory, codes = harness
    student, headers = register(client, codes)
    with factory() as db:
        for key, role in [("admin", "SUPER_ADMIN"), ("vendor", "VENDOR"), ("other", "VENDOR")]:
            db.add(M.Account(id=key, identifier=f"{key}@example.test", channel="EMAIL", full_name=key, role=role, active=True, profile={}, created_at=time.time()))
        db.commit()
    client.post("/api/auth/logout", headers=headers)
    admin_headers = login(client, codes, "admin@example.test")
    item = {"name": "Test device", "brand": "Test", "kind": "product", "category": "devices", "description": "Inventory supplied by a test fixture.", "pack": "1 device", "pricePaise": 25000, "stock": 3, "providerId": "vendor"}
    created = client.post("/api/ops/catalog", headers=admin_headers, json=item)
    assert created.status_code == 201, created.text
    item_id = created.json()["id"]
    client.post("/api/auth/logout", headers=admin_headers)
    student_headers = login(client, codes, "member@example.test")
    assert client.post("/api/ops/catalog", headers=student_headers, json=item).status_code == 403
    request = {"items": [{"id": item_id, "quantity": 2}], "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"}, "requestedSlot": ""}
    order_headers = {**student_headers, "Idempotency-Key": "order-test-unique-key"}
    first = client.post("/api/orders", json=request, headers=order_headers)
    assert first.status_code == 201, first.text
    assert first.json()["totalPaise"] == 50000
    assert first.json()["lines"][0]["status"] == "REQUESTED"
    again = client.post("/api/orders", json=request, headers=order_headers)
    assert again.json()["id"] == first.json()["id"]
    changed = {**request, "items": [{"id": item_id, "quantity": 1}]}
    assert client.post("/api/orders", json=changed, headers=order_headers).status_code == 409
    assert client.post("/api/orders", json=request, headers={**student_headers, "Idempotency-Key": "different-order-key"}).status_code == 409
    client.post("/api/auth/logout", headers=student_headers)
    other_headers = login(client, codes, "other@example.test")
    line_id = first.json()["lines"][0]["id"]
    assert client.get("/api/work/requests").json()["items"] == []
    assert client.patch(f"/api/work/requests/{line_id}", headers=other_headers, json={"status": "ACCEPTED"}).status_code == 404
    client.post("/api/auth/logout", headers=other_headers)
    vendor_headers = login(client, codes, "vendor@example.test")
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor_headers, json={"status": "COMPLETED"}).status_code == 409
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor_headers, json={"status": "ACCEPTED"}).status_code == 200


def test_empty_services_are_not_seeded_demos(harness):
    client, _, _ = harness
    assert client.get("/api/catalog").json()["items"] == []
    assert client.get("/api/auth/demo-credentials").status_code == 404
    assert client.get("/api/health").json()["integrations"]["payments"] is False
