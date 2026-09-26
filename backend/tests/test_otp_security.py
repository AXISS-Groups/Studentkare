"""OTP verification must fail closed: rejected, replayed, expired, rate-limited.

These cover guardrail 2 — no auth fallback grants a session. They used to open
a real SessionLocal against DATABASE_URL, so they errored during collection on
any machine without a live Postgres, and CI has no Postgres service: the whole
file has been erroring rather than running. They now use the same in-memory
harness as the rest of the suite, so they actually guard something.
"""
import secrets
import time

import pytest
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from services.workflow_auth import code_digest, digest

CHALLENGE_COOKIE = "sacare_challenge"


def seed_challenge(factory, token, *, code, identifier, expires_in=300.0,
                   consumed=False, attempts=0, intent="LOGIN"):
    """An OTP challenge already in flight, as /otp/send would have left it."""
    with factory() as db:
        db.add(M.OtpChallenge(
            token_hash=digest(token),
            identifier=identifier,
            intent=intent,
            channel="WHATSAPP",
            code_hash=code_digest(token, code),
            expires_at=time.time() + expires_in,
            attempts=attempts,
            consumed=consumed,
        ))
        db.commit()


def seed_account(factory, identifier):
    with factory() as db:
        db.add(M.Account(
            id=f"user_{secrets.token_hex(4)}", identifier=identifier, channel="WHATSAPP",
            full_name="Test User", role="STUDENT", active=True, profile={},
            created_at=time.time(),
        ))
        db.commit()


@pytest.fixture
def phone():
    return f"98765{secrets.randbelow(89999) + 10000}"


def test_a_wrong_code_is_refused(harness, phone):
    client, _factory, _codes = harness
    sent = client.post("/api/auth/otp/send", json={
        "identifier": phone, "channel": "WHATSAPP", "intent": "SIGNUP",
    })
    assert sent.status_code == 200, sent.text

    refused = client.post("/api/auth/otp/verify", json={"otp": "000000"})

    assert refused.status_code == 401
    assert "Invalid or expired verification code" in refused.json()["detail"]
    assert client.get("/api/auth/session").json()["user"] is None


def test_a_consumed_code_cannot_be_replayed(harness, phone):
    client, factory, _codes = harness
    token = f"token_replay_{secrets.token_hex(8)}"
    seed_account(factory, phone)
    seed_challenge(factory, token, code="654321", identifier=phone)

    client.cookies.set(CHALLENGE_COOKIE, token)
    assert client.post("/api/auth/otp/verify", json={"otp": "654321"}).status_code == 200

    client.cookies.set(CHALLENGE_COOKIE, token)
    replayed = client.post("/api/auth/otp/verify", json={"otp": "654321"})

    assert replayed.status_code == 401


def test_an_expired_code_is_refused(harness, phone):
    client, factory, _codes = harness
    token = f"token_expired_{secrets.token_hex(8)}"
    seed_challenge(factory, token, code="112233", identifier=phone, expires_in=-10.0)

    client.cookies.set(CHALLENGE_COOKIE, token)
    refused = client.post("/api/auth/otp/verify", json={"otp": "112233"})

    assert refused.status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_repeated_wrong_codes_stop_being_accepted(harness, phone):
    client, factory, _codes = harness
    token = f"token_ratelimit_{secrets.token_hex(8)}"
    seed_challenge(factory, token, code="999999", identifier=phone)

    client.cookies.set(CHALLENGE_COOKIE, token)
    codes = [
        client.post("/api/auth/otp/verify", json={"otp": "123123"}).status_code
        for _ in range(6)
    ]

    # Whether the attempt limit or the rate limiter answers first, what must
    # never appear is a 200.
    assert 200 not in codes
    assert codes[-1] in (401, 429)


def test_the_right_code_after_the_limit_still_does_not_let_you_in(harness, phone):
    """The point of the limit: burning the attempts must close the challenge,
    not merely delay it. A guessed code arriving late is still a guessed code."""
    client, factory, _codes = harness
    token = f"token_burn_{secrets.token_hex(8)}"
    seed_account(factory, phone)
    seed_challenge(factory, token, code="424242", identifier=phone)

    client.cookies.set(CHALLENGE_COOKIE, token)
    for _ in range(6):
        client.post("/api/auth/otp/verify", json={"otp": "123123"})

    client.cookies.set(CHALLENGE_COOKIE, token)
    late = client.post("/api/auth/otp/verify", json={"otp": "424242"})

    assert late.status_code in (401, 429)
    assert client.get("/api/auth/session").json()["user"] is None


def test_no_challenge_cookie_is_not_a_way_in(harness):
    """An empty or absent cookie must not match a challenge row."""
    client, _factory, _codes = harness
    client.cookies.clear()

    refused = client.post("/api/auth/otp/verify", json={"otp": "000000"})

    assert refused.status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None
