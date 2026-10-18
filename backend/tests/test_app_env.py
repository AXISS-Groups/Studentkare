"""One meaning of APP_ENV everywhere: unset or unknown is production (audit ENV-01).

Before core/app_env.py, auth read unset as production while app/main.py, the
session cookie and the OTP channel list read it as development, so a deploy that
forgot APP_ENV skipped migrations and the production guard, and issued
non-Secure session cookies.
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import Response

from core.app_env import app_env, is_dev_or_test, is_production

BACKEND = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize("raw,expected", [
    (None, "production"), ("", "production"), ("production", "production"),
    ("prod", "production"), ("staging", "production"), ("Production", "production"),
    ("development", "development"), (" Development ", "development"), ("TESTING", "testing"),
])
def test_only_explicit_dev_or_test_is_non_production(monkeypatch, raw, expected):
    if raw is None:
        monkeypatch.delenv("APP_ENV", raising=False)
    else:
        monkeypatch.setenv("APP_ENV", raw)
    assert app_env() == expected
    assert is_production() is (expected == "production")
    assert is_dev_or_test() is (expected != "production")


def test_session_cookie_is_secure_when_app_env_is_unset(monkeypatch):
    from services.workflow_auth import set_cookie
    monkeypatch.delenv("APP_ENV", raising=False)
    response = Response()
    set_cookie(response, "sacare_session", "value", 60)
    assert "secure" in response.headers["set-cookie"].lower()


def test_no_dev_delivery_channels_when_app_env_is_unset(monkeypatch):
    from services import otp_delivery
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.setattr(otp_delivery, "_smtp_configured", lambda: False)
    monkeypatch.setattr(otp_delivery, "_postal", lambda: {"enabled": False, "api_url": "", "server_api_key": ""})
    monkeypatch.setattr(otp_delivery, "_openwa", lambda: {"enabled": False, "base_url": "", "api_key": "", "session_id": ""})
    assert otp_delivery.available_channels() == []


def test_dev_origin_check_matches_hostnames_exactly(monkeypatch):
    from fastapi import HTTPException
    from starlette.requests import Request

    from services.workflow_auth import check_origin

    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://studentkare.example")

    def request(origin):
        return Request({"type": "http", "method": "POST", "path": "/", "scheme": "https", "query_string": b"",
                        "headers": [(b"origin", origin.encode()), (b"host", b"api.studentkare.example")]})

    check_origin(request("http://localhost:3000"))  # allowed in development
    with pytest.raises(HTTPException):
        check_origin(request("https://localhost.attacker.example"))


def test_backend_refuses_to_start_without_secrets_when_app_env_is_unset():
    # The production guard used to be skipped when APP_ENV was unset.
    env = {k: v for k, v in os.environ.items() if k not in ("APP_ENV", "OTP_HASH_SECRET", "JWT_SECRET")}
    env["PYTHONPATH"] = f".{os.pathsep}app{os.pathsep}.."
    env["DATABASE_URL"] = "postgresql://ci:ci@localhost:5432/ci"
    result = subprocess.run([sys.executable, "-c", "import app.main"], cwd=BACKEND, env=env,
                            capture_output=True, text=True, timeout=120)
    assert result.returncode != 0
    assert "OTP_HASH_SECRET" in (result.stderr + result.stdout)
