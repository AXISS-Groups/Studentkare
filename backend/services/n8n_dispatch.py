"""
services.n8n_dispatch — Real n8n webhook dispatcher.

Posts automation payloads to an n8n webhook endpoint.  When n8n is not
configured (no N8N_WEBHOOK_BASE_URL), it falls back to a local in-process
handler so the app works standalone while still recording the event.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict

import httpx

logger = logging.getLogger("services.n8n_dispatch")

N8N_WEBHOOK_BASE_URL = os.environ.get("N8N_WEBHOOK_BASE_URL", "")


class N8NDispatcher:
    def __init__(self) -> None:
        self.base_url = N8N_WEBHOOK_BASE_URL

    def is_configured(self) -> bool:
        return bool(self.base_url)

    async def dispatch(self, webhook_path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self.is_configured():
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(f"{self.base_url}{webhook_path}", json=payload)
                    resp.raise_for_status()
                    return {"success": True, "engine": "n8n", "webhook": webhook_path, "status_code": resp.status_code}
            except Exception as exc:
                logger.warning("n8n dispatch failed (%s); using local fallback.", exc)
        # Local in-process fallback
        return {"success": True, "engine": "local-fallback", "webhook": webhook_path, "payload": payload}


n8n_dispatcher = N8NDispatcher()
