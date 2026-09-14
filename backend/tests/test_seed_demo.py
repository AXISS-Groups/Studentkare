"""Demo seed safety, catalog visibility, and seeded order fulfilment."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from core import workflow_models as M
from scripts.seed_demo import main as seed_main
from services.demo_seed import DEMO_ADMIN, DEMO_STUDENT, DEMO_VENDOR, seed_catalog_data, seed_demo_data
from services.db_sql import Base
from services.workflow_auth import workflow_db
from test_workflow_api import harness  # noqa: F401  (shared isolated-database fixture)


@pytest.fixture
def plain_harness():
    """Isolated database WITHOUT mocking the delivery boundary."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def database():
        with factory() as session:
            yield session

    app.dependency_overrides[workflow_db] = database
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    client.close()
    engine.dispose()


def seed(factory):
    with factory() as db:
        return seed_demo_data(db)


def test_seed_is_idempotent_and_marks_samples(harness):
    _, factory, _ = harness
    first = seed(factory)
    assert first == {"accounts": 10, "catalog": 30, "content": 11, "articles": 3}
    assert seed(factory) == {"accounts": 0, "catalog": 0, "content": 0, "articles": 0}
    with factory() as db:
        roles = {row.identifier: row.role for row in db.scalars(select(M.Account)).all()}
        assert roles[DEMO_STUDENT] == "STUDENT"
        assert roles[DEMO_ADMIN] == "SUPER_ADMIN"
        assert roles[DEMO_VENDOR] == "VENDOR"
        entries = db.scalars(select(M.CatalogEntry)).all()
        assert len(entries) == 30
        assert all("Sample development entry" in entry.description for entry in entries)
        assert all(entry.active for entry in entries)


def test_seed_refused_in_production(harness, monkeypatch):
    _, factory, _ = harness
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(SystemExit):
        seed_main()
    with factory() as db:
        assert db.scalar(select(M.Account)) is None


def test_catalog_seed_publishes_without_demo_users(harness):
    _, factory, _ = harness
    with factory() as db:
        created = seed_catalog_data(db)
    assert created["catalog"] == 30
    assert created["content"] == 11
    assert created["articles"] == 3
    with factory() as db:
        identifiers = {row.identifier for row in db.scalars(select(M.Account)).all()}
        assert identifiers == {DEMO_VENDOR}
        entries = db.scalars(select(M.CatalogEntry)).all()
        assert len(entries) == 30
        assert all(entry.active for entry in entries)


def test_console_delivery_opt_in_and_production_refusal(plain_harness, monkeypatch, capsys):
    client = plain_harness
    body = {"identifier": "console@example.test", "channel": "EMAIL", "intent": "LOGIN"}
    monkeypatch.setenv("DEV_OTP_CONSOLE", "true")
    monkeypatch.setenv("APP_ENV", "development")
    assert client.post("/api/auth/otp/send", json=body).status_code == 200
    assert "[DEV OTP] verification code for console@example.test" in capsys.readouterr().out
    monkeypatch.setenv("APP_ENV", "production")
    assert client.post("/api/auth/otp/send", json=body).status_code == 503


def test_seeded_catalog_order_and_vendor_fulfilment(harness):
    client, factory, codes = harness
    seed(factory)
    assert client.get("/api/catalog").json()["total"] == 30
    home = client.get("/api/home").json()
    assert len(home["hero"]) == 1
    assert len(home["features"]) == 4
    assert len(home["links"]) == 4
    assert len(home["articles"]) == 3
    assert home["hero"][0]["target"] == "health"
    assert home["movement"][0]["title"] == "Movement for everyday life."

    client.post("/api/auth/otp/send", json={"identifier": "buyer@example.test", "channel": "EMAIL", "intent": "SIGNUP"})
    csrf = client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]
    client.post("/api/auth/signup", headers={"X-CSRF-Token": csrf},
                json={"fullName": "Buyer", "dob": "2000-01-01", "university": "Test", "rollNumber": "B1"})
    buyer_headers = {"X-CSRF-Token": client.get("/api/auth/session").json()["csrfToken"]}
    order = client.post("/api/orders", headers={**buyer_headers, "Idempotency-Key": "seeded-order-1"},
                        json={"items": [{"id": "demo-vitamin-c", "quantity": 1}],
                              "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"},
                              "requestedSlot": ""})
    assert order.status_code == 201, order.text
    assert order.json()["totalPaise"] == 34900
    client.post("/api/auth/logout", headers=buyer_headers)

    client.post("/api/auth/otp/send", json={"identifier": DEMO_VENDOR, "channel": "EMAIL", "intent": "LOGIN"})
    client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    vendor_headers = {"X-CSRF-Token": client.get("/api/auth/session").json()["csrfToken"]}
    requests = client.get("/api/work/requests").json()["items"]
    assert len(requests) == 1
    assert requests[0]["name"] == "Vitamin C + Zinc Daily Support"
    line_id = requests[0]["id"]
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor_headers, json={"status": "ACCEPTED"}).status_code == 200
