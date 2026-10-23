"""Demo seed safety, catalog visibility, and seeded order fulfilment."""
import pytest

# send_otp mints this fixed code for demo identifiers instead of delivering one.
DEMO_OTP = "123456"
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from test_workflow_api import (  # noqa: F401  (shared isolated-database fixture)
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    verify_second_contact,
)

from app.main import app
from core import workflow_models as M
from scripts.seed_demo import main as seed_main
from services.db_sql import Base
from services.demo_medicines import DEMO_MEDICINES
from services.demo_seed import (
    DEMO_ADMIN,
    DEMO_CATALOG,
    DEMO_STUDENT,
    DEMO_VENDOR,
    seed_catalog_data,
    seed_demo_data,
)
from services.newsroom_samples import SAMPLES as NEWSROOM_SAMPLES
from services.workflow_auth import workflow_db


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
    lab = first.pop("lab")
    assert first.pop("consultSlots") > 0   # the demo doctor's consult times (live-run audit #7)
    assert first == {"accounts": 10, "catalog": len(DEMO_CATALOG), "medicines": len(DEMO_MEDICINES), "content": 11, "articles": 3,
                     "posts": len(NEWSROOM_SAMPLES), "camps": 1}   # newsroom samples and the sample camp: demo builds only, "Sample:"
    # The demo lab: its partner account and two collectors, and a week of slots.
    assert lab["accounts"] == 3 and lab["collectors"] == 2 and lab["slots"] > 0
    assert seed(factory) == {"accounts": 0, "catalog": 0, "medicines": 0, "content": 0, "articles": 0, "posts": 0, "camps": 0,
                             "lab": {"accounts": 0, "collectors": 0, "slots": 0}, "consultSlots": 0}
    with factory() as db:
        roles = {row.identifier: row.role for row in db.scalars(select(M.Account)).all()}
        assert roles[DEMO_STUDENT] == "STUDENT"
        assert roles[DEMO_ADMIN] == "SUPER_ADMIN"
        assert roles[DEMO_VENDOR] == "VENDOR"
        entries = db.scalars(select(M.CatalogEntry)).all()
        assert len(entries) == len(DEMO_CATALOG)
        assert all("Sample development entry" in entry.description for entry in entries)
        assert all(entry.active for entry in entries)
        posts = db.scalars(select(M.Post)).all()
        assert posts and all(p.sample and p.title.startswith("Sample:") for p in posts)
        camps = db.scalars(select(M.HealthCamp)).all()
        assert camps and all(c.name.startswith("Sample:") and c.location.startswith("Sample:") for c in camps)


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
    assert created["catalog"] == len(DEMO_CATALOG)
    assert created["content"] == 11
    assert created["articles"] == 3
    with factory() as db:
        identifiers = {row.identifier for row in db.scalars(select(M.Account)).all()}
        assert identifiers == {DEMO_VENDOR}
        entries = db.scalars(select(M.CatalogEntry)).all()
        assert len(entries) == len(DEMO_CATALOG)
        assert all(entry.active for entry in entries)


def test_console_delivery_opt_in_and_production_refusal(plain_harness, monkeypatch, capsys):
    client = plain_harness
    body = {"identifier": "console@example.test", "channel": "EMAIL", "intent": "SIGNUP"}
    monkeypatch.setenv("DEV_OTP_CONSOLE", "true")
    monkeypatch.setenv("APP_ENV", "development")
    assert client.post("/api/auth/otp/send", json=body).status_code == 200
    logged = capsys.readouterr().out
    # The code is printed; the address is masked (guardrail 9: no identifiers in logs).
    assert "[DEV OTP] verification code for c•••@example.test" in logged
    assert "console@example.test" not in logged
    monkeypatch.setenv("APP_ENV", "production")
    assert client.post("/api/auth/otp/send", json=body).status_code == 503


def test_seeded_catalog_order_and_vendor_fulfilment(harness):
    client, factory, codes = harness
    seed(factory)
    assert client.get("/api/catalog").json()["total"] == len(DEMO_CATALOG)
    home = client.get("/api/home").json()
    assert len(home["hero"]) == 1
    assert len(home["features"]) == 4
    assert len(home["links"]) == 4
    assert len(home["articles"]) == 3
    assert home["hero"][0]["target"] == "health"
    assert home["movement"][0]["title"] == "Movement for everyday life."

    client.post("/api/auth/otp/send", json={"identifier": "buyer@example.test", "channel": "EMAIL", "intent": "SIGNUP"})
    csrf = client.post("/api/auth/otp/verify", json={"otp": codes[-1] if codes else "123456"}).json()["csrfToken"]
    verify_second_contact(client, codes, {"X-CSRF-Token": csrf})
    client.post("/api/auth/signup", headers={"X-CSRF-Token": csrf},
                json={"fullName": "Buyer", "dob": "2000-01-01", "university": "Test", "rollNumber": "B1",
                      "consent": SIGNUP_CONSENT, "password": SIGNUP_PASSWORD})
    buyer_headers = {"X-CSRF-Token": client.get("/api/auth/session").json()["csrfToken"]}
    order = client.post("/api/orders", headers={**buyer_headers, "Idempotency-Key": "seeded-order-1"},
                        json={"items": [{"id": "demo-vitamin-c", "quantity": 1}],
                              "delivery": {"mode": "pickup", "address": "", "city": "Hyderabad", "pincode": "500001"},
                              "requestedSlot": ""})
    assert order.status_code == 201, order.text
    assert order.json()["totalPaise"] == 34900
    # The partner sees it only once it is paid (live-run audit #1): pay on the test gateway.
    order_id = order.json()["id"]
    intent = client.post(f"/api/orders/{order_id}/payment", headers=buyer_headers).json()
    paid = client.post(f"/api/orders/{order_id}/payment/mock-checkout", headers=buyer_headers,
                       json={"providerOrderId": intent["providerOrderId"], "cardNumber": "4111111111111111"}).json()
    assert client.post(f"/api/orders/{order_id}/payment/verify", headers=buyer_headers, json={
        "providerOrderId": paid["providerOrderId"], "providerPaymentId": paid["providerPaymentId"],
        "signature": paid["signature"]}).json()["paymentStatus"] == "PAID"
    client.post("/api/auth/logout", headers=buyer_headers)

    client.post("/api/auth/otp/send", json={"identifier": DEMO_VENDOR, "channel": "EMAIL", "intent": "LOGIN"})
    # DEV_OTP_CONSOLE is off by default, so the demo vendor gets a real code too.
    client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    vendor_headers = {"X-CSRF-Token": client.get("/api/auth/session").json()["csrfToken"]}
    requests = client.get("/api/work/requests").json()["items"]
    assert len(requests) == 1
    assert requests[0]["name"] == "Vitamin C + Zinc Daily Support"
    line_id = requests[0]["id"]
    assert client.patch(f"/api/work/requests/{line_id}", headers=vendor_headers, json={"status": "ACCEPTED"}).status_code == 200


def test_seeded_catalog_exposes_vaccines_and_health_concerns(harness):
    """The published catalog covers adult vaccination and every health-concern shelf."""
    client, factory, _ = harness
    seed(factory)

    vaccines = client.get("/api/catalog?kind=vaccine").json()
    assert vaccines["total"] >= 1
    assert all(item["kind"] == "vaccine" for item in vaccines["items"])
    assert all(item["category"] == "vaccines" for item in vaccines["items"])
    assert all(item["description"].startswith("Sample development entry") for item in vaccines["items"])

    for category in ("diabetes", "heart", "stomach", "liver", "bone-joint", "kidney", "respiratory", "eye", "vaccines"):
        page = client.get(f"/api/catalog?category={category}").json()
        assert page["total"] >= 1, f"no published entries for {category}"
        assert all(item["category"] == category for item in page["items"])


@pytest.mark.parametrize("app_env", [None, "", "production", "prod", "staging", "Production "])
def test_demo_accounts_fail_closed_outside_dev_and_test(monkeypatch, app_env):
    from services.demo_seed import demo_accounts_enabled, is_demo_identifier

    if app_env is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", app_env)
    assert demo_accounts_enabled() is False
    assert is_demo_identifier(DEMO_ADMIN) is False
    assert is_demo_identifier("9876543211") is False


@pytest.mark.parametrize("app_env", ["development", "testing"])
def test_demo_accounts_on_in_dev_and_test_only_for_demo_ids(monkeypatch, app_env):
    from services.demo_seed import is_demo_identifier

    monkeypatch.setenv("APP_ENV", app_env)
    assert is_demo_identifier(DEMO_ADMIN) is True
    assert is_demo_identifier("9876543211") is True
    assert is_demo_identifier("real.student@iith.ac.in") is False


def test_fixed_otp_refused_when_app_env_unset(plain_harness, monkeypatch):
    client = plain_harness
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.setenv("DEV_OTP_CONSOLE", "true")
    sent = client.post("/api/auth/otp/send", json={"identifier": DEMO_STUDENT, "channel": "EMAIL", "intent": "SIGNUP"})
    if sent.status_code == 200:
        assert client.post("/api/auth/otp/verify", json={"otp": DEMO_OTP}).status_code == 401


def test_otp_console_is_off_when_app_env_is_unset_or_unknown(monkeypatch):
    from services.workflow_auth import dev_console_delivery_enabled
    monkeypatch.setenv("DEV_OTP_CONSOLE", "true")
    for env in ("", "production", "staging", "prod"):
        monkeypatch.setenv("APP_ENV", env)
        assert dev_console_delivery_enabled() is False
    monkeypatch.delenv("APP_ENV")
    assert dev_console_delivery_enabled() is False
    monkeypatch.setenv("APP_ENV", "development")
    assert dev_console_delivery_enabled() is True


def test_demo_accounts_need_an_explicit_opt_in_even_in_dev(monkeypatch):
    # A shared box labelled APP_ENV=testing must not grow a demo super admin by default.
    from services.demo_seed import demo_accounts_enabled, is_demo_identifier
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.delenv("SEED_DEMO_DATA", raising=False)
    assert demo_accounts_enabled() is False
    assert is_demo_identifier(DEMO_ADMIN) is False
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    assert demo_accounts_enabled() is True


def test_otp_console_is_off_by_default(monkeypatch):
    from services.workflow_auth import dev_console_delivery_enabled
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("DEV_OTP_CONSOLE", raising=False)
    assert dev_console_delivery_enabled() is False


def test_demo_identifier_gets_no_fixed_code_without_console_opt_in(plain_harness, monkeypatch):
    client = plain_harness
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    monkeypatch.setenv("DEV_OTP_CONSOLE", "false")
    client.post("/api/auth/otp/send", json={"identifier": DEMO_STUDENT, "channel": "EMAIL", "intent": "SIGNUP"})
    assert client.post("/api/auth/otp/verify", json={"otp": DEMO_OTP}).status_code == 401


def test_any_localhost_origin_is_trusted_only_in_explicit_dev(monkeypatch):
    from fastapi import HTTPException
    from starlette.requests import Request

    from services.workflow_auth import check_origin

    def request(origin):
        return Request({"type": "http", "scheme": "https", "path": "/", "headers": [
            (b"origin", origin.encode()), (b"host", b"api.studentkare.in")]})
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://studentkare.in")
    monkeypatch.delenv("APP_ENV", raising=False)
    with pytest.raises(HTTPException):
        check_origin(request("http://localhost:5173"))
    monkeypatch.setenv("APP_ENV", "development")
    check_origin(request("http://localhost:5173"))


@pytest.mark.parametrize("app_env", [None, "", "production", "staging"])
def test_virus_scan_is_never_skipped_outside_explicit_dev(monkeypatch, app_env):
    from fastapi import HTTPException

    from services import security_scanner
    if app_env is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", app_env)
    monkeypatch.setattr(security_scanner, "CLAMAV_HOST", "127.0.0.1")
    monkeypatch.setattr(security_scanner, "CLAMAV_PORT", 9)  # nothing listens: scanner offline
    with pytest.raises(HTTPException):
        security_scanner.scan_file_for_viruses(b"%PDF-1.4")
