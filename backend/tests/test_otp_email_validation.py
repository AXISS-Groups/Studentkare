"""CIR-74: OTP send must not claim success for undeliverable email destinations."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from services import email_deliverability, workflow_auth
from services.db_sql import Base
from services.email_deliverability import check_email_deliverable
from services.workflow_auth import workflow_db
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
    monkeypatch.setattr(
        workflow_auth, "deliver_code",
        lambda identifier, code, channel: codes.append((identifier, code, channel)) or True,
    )
    # Default probe: deliverable. Individual tests override. Never hits real DNS.
    monkeypatch.setattr(email_deliverability, "_resolve_domain", lambda domain: True)
    app.dependency_overrides[workflow_db] = database
    client = TestClient(app)
    yield client, factory, codes
    app.dependency_overrides.clear()
    client.close()
    engine.dispose()


def _send(client, identifier, channel="EMAIL", intent="SIGNUP"):
    return client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": channel, "intent": intent})


def _no_challenge_created(client, factory, codes, identifier):
    assert codes == []
    assert client.cookies.get("sacare_challenge") is None
    with factory() as db:
        assert db.scalar(select(M.OtpChallenge).where(M.OtpChallenge.identifier == identifier)) is None


def test_nonexistent_domain_rejected(harness, monkeypatch):
    """CIR-74 repro: syntactically valid but non-existent domain must not get success:true."""
    client, factory, codes = harness
    monkeypatch.setattr(email_deliverability, "_resolve_domain", lambda domain: False)
    identifier = "test@thisdomainshouldnotexist123456.com"
    response = _send(client, identifier)
    assert response.status_code == 422
    assert "cannot receive mail" in response.json()["detail"]
    _no_challenge_created(client, factory, codes, identifier)


def test_disposable_domain_rejected(harness):
    client, factory, codes = harness
    identifier = "someone@mailinator.com"
    response = _send(client, identifier)
    assert response.status_code == 400
    _no_challenge_created(client, factory, codes, identifier)


def test_junk_local_part_rejected(harness):
    client, factory, codes = harness
    identifier = "test@gmail.com"
    response = _send(client, identifier)
    assert response.status_code == 400
    _no_challenge_created(client, factory, codes, identifier)


def test_valid_email_still_sends(harness):
    client, _, codes = harness
    response = _send(client, "someone@gmail.com")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(codes) == 1
    assert client.cookies.get("sacare_challenge") is not None


def test_dns_timeout_fails_open(harness, monkeypatch):
    """DNS outage must not lock users out: unknown outcome still attempts delivery."""
    client, _, codes = harness
    monkeypatch.setattr(email_deliverability, "_resolve_domain", lambda domain: None)
    response = _send(client, "someone@gmail.com")
    assert response.status_code == 200
    assert len(codes) == 1


def test_fixture_domains_skip_dns(harness, monkeypatch):
    """@example.test / @studentkare.test never hit DNS, even on hard DNS negative."""
    client, _, codes = harness
    monkeypatch.setattr(email_deliverability, "_resolve_domain", lambda domain: False)
    assert _send(client, "member@example.test").status_code == 200
    assert _send(client, "demo@studentkare.test").status_code == 200
    assert len(codes) == 1  # demo account bypasses delivery; fixture account sends


def test_whatsapp_channel_unaffected(harness, monkeypatch):
    client, _, codes = harness
    monkeypatch.setattr(email_deliverability, "_resolve_domain", lambda domain: False)
    response = _send(client, "9123456780", channel="WHATSAPP", intent="SIGNUP")
    assert response.status_code == 200
    assert len(codes) == 1


def test_gate_unit_shapes():
    assert check_email_deliverable("not-an-email").status == 422
    assert check_email_deliverable("a@b").status == 422
    assert check_email_deliverable("ok@gmail.com", dns_check=lambda d: True) is None
    assert check_email_deliverable("ok@gmail.com", dns_check=lambda d: None) is None
    assert check_email_deliverable("ok@gmail.com", dns_check=lambda d: False).status == 422
    assert check_email_deliverable("ok@gmail.com", dns_check=lambda d: (_ for _ in ()).throw(RuntimeError())) is None
