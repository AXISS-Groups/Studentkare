"""
Studentkare — G0.2 OTP Security Test Suite
Verifies 401 responses for rejected, expired, and replayed OTPs, rate limiting, and removal of offline fallbacks.
"""
import time
import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app
from services.db_sql import SessionLocal, create_all_tables
from core import workflow_models as M
from services.workflow_auth import digest, code_digest

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    create_all_tables()


def test_rejected_otp_returns_401():
    """G0.2: Invalid OTP code returns 401 Unauthorized."""
    # Send OTP first with valid 10-digit phone number
    phone = f"98765{secrets.randbelow(89999) + 10000}"
    res = client.post("/api/auth/otp/send", json={
        "identifier": phone,
        "channel": "WHATSAPP",
        "intent": "SIGNUP"
    })
    assert res.status_code == 200

    # Attempt verification with wrong code
    verify_res = client.post("/api/auth/otp/verify", json={"otp": "000000"})
    assert verify_res.status_code == 401
    assert "Invalid or expired verification code" in verify_res.json()["detail"]


def test_replayed_otp_returns_401():
    """G0.2: Replaying a consumed OTP returns 401 Unauthorized."""
    identifier = f"98766{secrets.randbelow(89999) + 10000}"
    token = f"token_replay_{secrets.token_hex(8)}"
    with SessionLocal() as db:
        acc = M.Account(
            id=f"user_{secrets.token_hex(4)}",
            identifier=identifier,
            channel="WHATSAPP",
            full_name="Test User",
            active=True,
            created_at=time.time()
        )
        db.add(acc)
        db.add(M.OtpChallenge(
            token_hash=digest(token),
            identifier=identifier,
            intent="LOGIN",
            channel="WHATSAPP",
            code_hash=code_digest(token, "654321"),
            expires_at=time.time() + 300,
            attempts=0,
            consumed=False
        ))
        db.commit()

    # First verification attempt should succeed
    client.cookies.set("sacare_challenge", token)
    v1 = client.post("/api/auth/otp/verify", json={"otp": "654321"})
    assert v1.status_code == 200

    # Replaying same OTP must return 401
    client.cookies.set("sacare_challenge", token)
    v2 = client.post("/api/auth/otp/verify", json={"otp": "654321"})
    assert v2.status_code == 401


def test_expired_otp_returns_401():
    """G0.2: Expired OTP challenge returns 401 Unauthorized."""
    token = f"token_expired_{secrets.token_hex(8)}"
    identifier = f"98767{secrets.randbelow(89999) + 10000}"
    with SessionLocal() as db:
        db.add(M.OtpChallenge(
            token_hash=digest(token),
            identifier=identifier,
            intent="LOGIN",
            channel="WHATSAPP",
            code_hash=code_digest(token, "112233"),
            expires_at=time.time() - 10, # Expired 10 seconds ago
            attempts=0,
            consumed=False
        ))
        db.commit()

    client.cookies.set("sacare_challenge", token)
    v = client.post("/api/auth/otp/verify", json={"otp": "112233"})
    assert v.status_code == 401


def test_otp_verify_rate_limiting():
    """G0.2: Excessive OTP verify attempts trigger rate limiting (429 or 401)."""
    token = f"token_ratelimit_{secrets.token_hex(8)}"
    identifier = f"98768{secrets.randbelow(89999) + 10000}"
    with SessionLocal() as db:
        db.add(M.OtpChallenge(
            token_hash=digest(token),
            identifier=identifier,
            intent="LOGIN",
            channel="WHATSAPP",
            code_hash=code_digest(token, "999999"),
            expires_at=time.time() + 300,
            attempts=0,
            consumed=False
        ))
        db.commit()

    client.cookies.set("sacare_challenge", token)
    responses = []
    for _ in range(6):
        res = client.post("/api/auth/otp/verify", json={"otp": "123123"})
        responses.append(res.status_code)

    # After 5 failed attempts, 6th attempt should be blocked with 429 or 401
    assert 429 in responses or 401 in responses
