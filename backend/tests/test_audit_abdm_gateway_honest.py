"""Audit 2026-10-22 (Low): the ABDM gateway never fakes success, and the sandbox is refused in production."""
import asyncio

import pytest

from services.abdm_gateway import NOT_CONFIGURED, SANDBOX_BLOCKED, ABDMGateway


@pytest.fixture
def unconfigured(monkeypatch):
    for name in ("ABDM_BASE_URL", "ABDM_CLIENT_ID", "ABDM_CLIENT_SECRET", "ABDM_FACILITY_ID"):
        monkeypatch.delenv(name, raising=False)


def test_without_credentials_it_reports_not_configured_and_does_nothing(unconfigured):
    gateway = ABDMGateway()
    token = asyncio.run(gateway.get_access_token())
    assert token == {"token": None, "expires_in": 0, "mode": NOT_CONFIGURED}
    synced = asyncio.run(gateway.sync_fhir_bundle("s1", {"entry": [{}, {}]}))
    assert synced["success"] is False and synced["reason"] == NOT_CONFIGURED
    status = asyncio.run(gateway.get_status())
    assert status == {"configured": False, "mode": NOT_CONFIGURED, "baseUrl": None, "facilityId": None}


def test_the_sandbox_is_refused_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ABDM_BASE_URL", "https://sandbox.abdm.gov.in")
    monkeypatch.setenv("ABDM_CLIENT_ID", "id")
    monkeypatch.setenv("ABDM_CLIENT_SECRET", "secret")
    gateway = ABDMGateway()
    assert gateway.blocker() == SANDBOX_BLOCKED and not gateway.is_configured()
    synced = asyncio.run(gateway.sync_fhir_bundle("s1", {"entry": []}))
    assert synced == {"success": False, "reason": SANDBOX_BLOCKED, "studentId": "s1"}
    monkeypatch.setenv("APP_ENV", "development")
    assert gateway.is_configured()
