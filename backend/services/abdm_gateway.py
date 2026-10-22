"""
services.abdm_gateway — ABDM (Ayushman Bharat Digital Mission) gateway client.

Kept for planned ABDM work (backend/ARCHITECTURE.md); nothing calls it yet.

Honest by construction (audit 2026-10-22): without credentials it reports
"not configured" and does nothing. It used to return a made-up token, a
successful "sync" and a fixed latency, which anything wired to it later would
have shown as a working ABDM link. The ABDM sandbox is refused in production:
records pushed there are test data, never a student's real health record.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Dict, Optional

import httpx

from core.app_env import is_production

logger = logging.getLogger("services.abdm_gateway")

NOT_CONFIGURED = "not-configured"
SANDBOX_BLOCKED = "sandbox-blocked-in-production"


def _base_url() -> str:
    return os.environ.get("ABDM_BASE_URL", "").strip().rstrip("/")


def is_sandbox(url: str) -> bool:
    return "sandbox" in url.lower()


class ABDMGateway:
    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

    @property
    def base_url(self) -> str:
        return _base_url()

    @property
    def client_id(self) -> str:
        return os.environ.get("ABDM_CLIENT_ID", "")

    @property
    def client_secret(self) -> str:
        return os.environ.get("ABDM_CLIENT_SECRET", "")

    @property
    def facility_id(self) -> str:
        return os.environ.get("ABDM_FACILITY_ID", "")

    def blocker(self) -> str:
        """Why the gateway can't be used, or "" when it can."""
        if not (self.base_url and self.client_id and self.client_secret):
            return NOT_CONFIGURED
        if is_production() and is_sandbox(self.base_url):
            return SANDBOX_BLOCKED
        return ""

    def is_configured(self) -> bool:
        return self.blocker() == ""

    async def get_access_token(self) -> Dict:
        reason = self.blocker()
        if reason:
            return {"token": None, "expires_in": 0, "mode": reason}
        if self._token and time.time() < self._token_expiry:
            return {"token": self._token, "expires_in": int(self._token_expiry - time.time()), "mode": "real"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.base_url}/v1/auth/token",
                    data={"client_id": self.client_id, "client_secret": self.client_secret},
                )
                resp.raise_for_status()
                data = resp.json()
                self._token = data.get("access_token")
                self._token_expiry = time.time() + int(data.get("expires_in", 0) or 0)
                return {"token": self._token, "expires_in": data.get("expires_in", 0), "mode": "real"}
        except Exception as exc:  # pragma: no cover — network
            logger.warning("ABDM token fetch failed: %s", type(exc).__name__)
            return {"token": None, "expires_in": 0, "mode": "error"}

    async def sync_fhir_bundle(self, student_id: str, bundle: Dict) -> Dict:
        reason = self.blocker()
        if reason:
            return {"success": False, "reason": reason, "studentId": student_id}
        token = await self.get_access_token()
        if not token.get("token"):
            return {"success": False, "reason": "no-token", "studentId": student_id}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{self.base_url}/v3/fhir/Patient/{student_id}/$push",
                    headers={"Authorization": f"Bearer {token['token']}"},
                    json=bundle,
                )
                resp.raise_for_status()
                return {"success": True, "mode": "real", "status_code": resp.status_code, "studentId": student_id}
        except Exception as exc:  # pragma: no cover — network
            logger.warning("ABDM FHIR sync failed: %s", type(exc).__name__)
            return {"success": False, "reason": "sync-error", "studentId": student_id}

    async def get_status(self) -> Dict:
        """What is true now. No token is fetched and no latency is invented."""
        reason = self.blocker()
        return {"configured": reason == "", "mode": reason or "real", "baseUrl": self.base_url or None,
                "facilityId": self.facility_id or None}


abdm_gateway = ABDMGateway()
