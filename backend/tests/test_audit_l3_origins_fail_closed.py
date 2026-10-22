"""Audit L3: with ALLOWED_ORIGINS unset, production trusts no cross-origin caller (no localhost)."""
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from services.workflow_auth import allowed_origins, check_origin


def request(origin: str, host: str = "api.studentkare.co") -> Request:
    return Request({"type": "http", "method": "POST", "scheme": "https", "path": "/", "query_string": b"",
                    "headers": [(b"origin", origin.encode()), (b"host", host.encode())]})


def test_production_with_no_allow_list_allows_no_cross_origin(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    assert allowed_origins() == []
    for origin in ("http://localhost:3000", "http://localhost", "http://127.0.0.1", "http://testserver"):
        with pytest.raises(HTTPException):
            check_origin(request(origin))
    check_origin(request("https://api.studentkare.co"))     # same origin still works


def test_an_explicit_allow_list_is_used_as_given(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://studentkare.co, https://www.studentkare.co/")
    assert allowed_origins() == ["https://studentkare.co", "https://www.studentkare.co"]
    check_origin(request("https://www.studentkare.co"))
    with pytest.raises(HTTPException):
        check_origin(request("http://localhost:3000"))


def test_development_keeps_local_origins(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    assert "http://localhost:3000" in allowed_origins()
