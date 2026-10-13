"""GET /admin/integrations used to return every secret in plain text beside its masked copy."""
from services import integration_config as cfg
from services import integrations as api


def _with(monkeypatch, provider: dict):
    monkeypatch.setitem(cfg.INTEGRATIONS_DB, "testprov", provider)


def test_admin_view_never_contains_a_secret_value(monkeypatch):
    secret = "sk_live_abcdefghijklmnop1234"
    _with(monkeypatch, {"enabled": True, "base_url": "https://wa.example", "api_key": secret,
                        "service_account_json": {"private_key": "-----BEGIN"}, "webhook_secret": ""})
    out = cfg.sanitize("testprov")
    assert secret not in repr(out) and "BEGIN" not in repr(out)
    assert "api_key" not in out and "service_account_json" not in out
    assert out["api_key_masked"] == "••••••34" and out["api_key_set"] is True
    assert out["service_account_json_masked"] == "••••"
    assert out["webhook_secret_set"] is False and out["webhook_secret_masked"] == ""
    assert out["base_url"] == "https://wa.example" and out["enabled"] is True


def test_short_secrets_reveal_nothing():
    assert cfg.mask_secret("abcdefgh") == "••••"


def test_saving_the_masked_placeholder_keeps_the_real_secret(monkeypatch):
    _with(monkeypatch, {"api_key": "real-secret-value-xyz", "base_url": "a"})
    monkeypatch.setattr(api, "save_to_db", lambda provider: None)
    monkeypatch.setattr(api, "_audit", lambda *args: None)
    body = api.ConfigUpdate(config={"api_key": "••••••yz", "api_key_masked": "••••••yz", "api_key_set": True, "base_url": "b"})
    out = api.update_integration("testprov", body, user={"id": "admin"}, db=None)
    assert cfg.INTEGRATIONS_DB["testprov"] == {"api_key": "real-secret-value-xyz", "base_url": "b"}
    assert "real-secret-value-xyz" not in repr(out)
    body = api.ConfigUpdate(config={"api_key": "new-secret-value-123"})
    api.update_integration("testprov", body, user={"id": "admin"}, db=None)
    assert cfg.INTEGRATIONS_DB["testprov"]["api_key"] == "new-secret-value-123"
