"""Audit M5: /auth/otp/send must not say whether an account exists.

The attack: send LOGIN codes for a list of identifiers and read 404 "No active
account" for the ones that have no account, before any rate limit applied.
"""
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

SEND = "/api/auth/otp/send"


def login_send(client, identifier):
    return client.post(SEND, json={"identifier": identifier, "channel": "EMAIL", "intent": "LOGIN"})


def test_an_unknown_identifier_gets_the_same_answer_as_a_real_one(harness):  # noqa: F811
    client, _factory, codes = harness
    _user, headers = register(client, codes, "real@example.test")
    client.post("/api/auth/logout", headers=headers)
    client.cookies.clear()
    before = len(codes)

    real = login_send(client, "real@example.test")
    unknown = login_send(client, "nobody@example.test")
    assert real.status_code == unknown.status_code == 200
    assert set(real.json()) == set(unknown.json())
    assert real.json()["expiresInSeconds"] == unknown.json()["expiresInSeconds"]
    assert unknown.json()["targetMasked"] and unknown.json()["targetMasked"] != "nobody@example.test"
    assert "sacare_challenge=" in real.headers["set-cookie"] and "sacare_challenge=" in unknown.headers["set-cookie"]
    # Only the real account was sent a code.
    assert len(codes) == before + 1


def test_the_per_identifier_limit_runs_before_the_lookup(harness):  # noqa: F811
    client, _factory, _codes = harness
    statuses = [login_send(client, "nobody@example.test").status_code for _ in range(4)]
    # The fourth send for an unknown identifier is rate limited, exactly like a real one.
    assert statuses == [200, 200, 200, 429]


def test_the_decoy_challenge_never_signs_anyone_in(harness):  # noqa: F811
    client, _factory, _codes = harness
    assert login_send(client, "nobody@example.test").status_code == 200
    verified = client.post("/api/auth/otp/verify", json={"otp": "123456"})
    assert verified.status_code >= 400
    assert client.get("/api/auth/session").json()["user"] is None
