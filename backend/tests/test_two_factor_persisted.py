"""Two-step sign-in survives a restart and never fails open."""
import pytest
from test_clinical_fulfilment import make_staff
from test_workflow_api import harness, login  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import twofa_store


def _code(secret, offset=0):
    import base64
    import hashlib
    import hmac
    import struct
    import time
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack(">Q", int(time.time() // 30) + offset), hashlib.sha1).digest()
    o = digest[-1] & 0x0F
    return str((struct.unpack(">I", digest[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000).zfill(6)


def _first_factor(client, codes, identifier):
    assert client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": "EMAIL", "intent": "LOGIN"}).status_code == 200
    return client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()


def _enable(client, codes, factory, identifier):
    headers = login(client, codes, identifier)
    secret = client.post("/api/auth/2fa/setup", headers=headers).json()["secret"]
    assert client.post("/api/auth/2fa/enable", json={"token": _code(secret, -1)}, headers=headers).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    return secret


def test_two_factor_is_stored_in_the_database_and_still_required_after_restart(harness):
    client, factory, codes = harness
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test")
    secret = _enable(client, codes, factory, "root@example.test")

    # A "restart": nothing in process memory is consulted any more.
    with factory() as db:
        assert db.get(M.TwoFactorSecret, "root").enabled is True
    step = _first_factor(client, codes, "root@example.test")
    assert step["requires2FA"] is True and step["user"] is None
    assert client.get("/api/auth/session").json()["user"] is None

    done = client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)})
    assert done.status_code == 200, done.text
    assert client.get("/api/auth/session").json()["user"]["id"] == "root"


def test_a_code_is_accepted_once_and_a_wrong_code_spends_the_second_step(harness):
    client, factory, codes = harness
    make_staff(factory, "root2", "SUPER_ADMIN", "root2@example.test")
    secret = _enable(client, codes, factory, "root2@example.test")

    step = _first_factor(client, codes, "root2@example.test")
    assert client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": "000000"}).status_code == 400
    # The pending token is gone: even the right code needs a fresh first factor.
    assert client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)}).status_code == 401
    assert client.get("/api/auth/session").json()["user"] is None


def test_a_secret_that_cannot_be_opened_denies(harness):
    client, factory, codes = harness
    make_staff(factory, "root3", "SUPER_ADMIN", "root3@example.test")
    secret = _enable(client, codes, factory, "root3@example.test")
    with factory() as db:
        db.get(M.TwoFactorSecret, "root3").secret_sealed = "fernet:not-openable"
        db.commit()
    step = _first_factor(client, codes, "root3@example.test")
    assert step["requires2FA"] is True
    assert client.post("/api/auth/2fa/challenge", json={"tempToken": step["tempToken"], "token": _code(secret)}).status_code == 400
    assert client.get("/api/auth/session").json()["user"] is None


def test_secrets_are_sealed_when_a_key_is_set_and_refused_without_one_in_production(monkeypatch):
    from cryptography.fernet import Fernet
    monkeypatch.setenv("TWO_FACTOR_ENCRYPTION_KEY", Fernet.generate_key().decode())
    sealed = twofa_store.seal("JBSWY3DPEHPK3PXP")
    assert sealed.startswith("fernet:")
    assert "JBSWY3DPEHPK3PXP" not in sealed
    assert twofa_store.unseal(sealed) == "JBSWY3DPEHPK3PXP"

    monkeypatch.delenv("TWO_FACTOR_ENCRYPTION_KEY")
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(twofa_store.TwoFactorUnavailable):
        twofa_store.seal("JBSWY3DPEHPK3PXP")
    assert twofa_store.unseal("plain:JBSWY3DPEHPK3PXP") is None
