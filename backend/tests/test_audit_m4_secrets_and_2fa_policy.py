"""Audit M4: no plaintext provider secrets in production, and the 2FA floor can't be switched off."""
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException

from services import integration_config as cfg
from services import integration_secret_vault as vault
from services import integrations as api
from services import workflow_auth


@pytest.fixture
def production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setitem(cfg.INTEGRATIONS_DB, "testprov", {"api_key": "", "base_url": "a"})
    saved = []
    monkeypatch.setattr(api, "save_to_db", saved.append)
    monkeypatch.setattr(api, "_audit", lambda *args: None)
    return saved


def test_production_refuses_a_secret_without_the_encryption_key(production, provider, monkeypatch):
    monkeypatch.delenv("INTEGRATIONS_ENCRYPTION_KEY", raising=False)
    body = api.ConfigUpdate(config={"api_key": "sk_live_new_secret_value", "base_url": "b"})
    with pytest.raises(HTTPException) as refused:
        api.update_integration("testprov", body, user={"id": "admin"}, db=None)
    assert refused.value.status_code == 503
    assert refused.value.detail["code"] == "INTEGRATIONS_KEY_MISSING"
    assert "INTEGRATIONS_ENCRYPTION_KEY" in refused.value.detail["message"]
    # Nothing changed in memory and nothing was written.
    assert cfg.INTEGRATIONS_DB["testprov"] == {"api_key": "", "base_url": "a"} and provider == []
    # The vault itself never writes plaintext in production either.
    with pytest.raises(vault.VaultKeyMissing):
        vault.encrypt_config({"api_key": "sk_live_x"})
    # A config with no secret in it still saves.
    assert api.update_integration("testprov", api.ConfigUpdate(config={"base_url": "c"}),
                                  user={"id": "admin"}, db=None)["success"] is True


def test_production_with_a_key_encrypts(production, provider, monkeypatch):
    monkeypatch.setenv("INTEGRATIONS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    sealed = vault.encrypt_config({"api_key": "sk_live_x", "base_url": "b"})
    assert sealed["api_key"][vault.MARKER] == vault.VERSION and sealed["base_url"] == "b"
    body = api.ConfigUpdate(config={"api_key": "sk_live_new_secret_value"})
    assert api.update_integration("testprov", body, user={"id": "admin"}, db=None)["success"] is True


def test_development_keeps_the_plaintext_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("INTEGRATIONS_ENCRYPTION_KEY", raising=False)
    assert vault.encrypt_config({"api_key": "dev"}) == {"api_key": "dev"}


@pytest.mark.parametrize("roles", [[], ["SUPER_ADMIN"], ["COUNSELLOR"], "", "SUPER_ADMIN"])
def test_production_2fa_floor_cannot_be_removed_through_the_api(production, monkeypatch, roles):
    monkeypatch.setitem(cfg.INTEGRATIONS_DB, "twofa", {"enforced_roles": ["SUPER_ADMIN", "COUNSELLOR"], "issuer": "SK"})
    monkeypatch.setattr(api, "save_to_db", lambda provider: None)
    monkeypatch.setattr(api, "_audit", lambda *args: None)
    with pytest.raises(HTTPException) as refused:
        api.update_integration("twofa", api.ConfigUpdate(config={"enforced_roles": roles}), user={"id": "a"}, db=None)
    assert refused.value.status_code == 422
    assert cfg.INTEGRATIONS_DB["twofa"]["enforced_roles"] == ["SUPER_ADMIN", "COUNSELLOR"]


def test_2fa_policy_can_be_tightened_but_takes_no_unknown_keys_or_roles(production, monkeypatch):
    monkeypatch.setitem(cfg.INTEGRATIONS_DB, "twofa", {"enforced_roles": ["SUPER_ADMIN", "COUNSELLOR"], "issuer": "SK"})
    monkeypatch.setattr(api, "save_to_db", lambda provider: None)
    monkeypatch.setattr(api, "_audit", lambda *args: None)
    tightened = ["SUPER_ADMIN", "COUNSELLOR", "CAMPUS_ADMIN"]
    api.update_integration("twofa", api.ConfigUpdate(config={"enforced_roles": tightened}), user={"id": "a"}, db=None)
    assert set(cfg.INTEGRATIONS_DB["twofa"]["enforced_roles"]) == set(tightened)
    for bad in ({"enforced_roles": ["SUPER_ADMIN", "COUNSELLOR", "ROOT"]}, {"disabled": True}):
        with pytest.raises(HTTPException):
            api.update_integration("twofa", api.ConfigUpdate(config=bad), user={"id": "a"}, db=None)


def test_a_weakened_stored_policy_still_enforces_the_floor_in_production(production, monkeypatch):
    """A config loaded from the database (or one worker's memory) can't lower the floor."""
    monkeypatch.setitem(cfg.INTEGRATIONS_DB, "twofa", {"enforced_roles": [], "issuer": "SK"})
    assert {"SUPER_ADMIN", "COUNSELLOR"} <= workflow_auth.two_factor_enforced_roles()
