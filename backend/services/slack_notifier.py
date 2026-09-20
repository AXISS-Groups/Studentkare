"""Fail-closed Slack ops alert sender — non-PHI only.

- Reads config from services.integration_config.INTEGRATIONS_DB["slack"].
- Refuses to send when disabled/unconfigured (fail closed).
- Refuses to send any text containing PHI keywords (fail closed, never scrub-and-send).
- Never logs the bot token, never echoes it in return values or error messages.
- Never raises: all transport/parse failures return {"success": False, ...}.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("services.slack_notifier")

PHI_KEYWORDS = (
    "diagnosis",
    "prescription",
    "hiv",
    "cancer",
    "mental health",
    "therapy",
    "blood test result",
    "aadhaar",
    "abha",
    "patient",
)

MAX_TEXT_LEN = 2800


def contains_phi(text: str) -> bool:
    lowered = (text or "").lower()
    return any(k in lowered for k in PHI_KEYWORDS)


def post_ops_alert(text: str, channel: Optional[str] = None) -> Dict[str, Any]:
    """Post a non-PHI ops alert to Slack via chat.postMessage. Never raises."""
    from services.integration_config import INTEGRATIONS_DB

    cfg = INTEGRATIONS_DB.get("slack", {})
    if not cfg.get("enabled"):
        return {"success": False, "reason": "disabled"}
    token = str(cfg.get("bot_token") or "")
    target = str(channel or cfg.get("default_channel") or "")
    if not token or not target:
        return {"success": False, "reason": "not_configured"}
    safe = (text or "").strip()
    if not safe:
        return {"success": False, "reason": "empty_text"}
    safe = safe[:MAX_TEXT_LEN]
    if contains_phi(safe):
        logger.warning("[slack] REFUSED to send: payload matched PHI blocklist")
        return {"success": False, "reason": "phi_blocked"}

    try:
        r = httpx.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {token}"},
            json={"channel": target, "text": safe},
            timeout=10,
        )
    except (httpx.HTTPError, OSError, ValueError) as err:
        logger.warning("[slack] post failed: %s", str(err)[:120])
        return {"success": False, "reason": "transport_error"}

    try:
        data = r.json()
    except ValueError:
        logger.warning("[slack] post failed: non-JSON response HTTP %s", r.status_code)
        return {"success": False, "reason": "bad_response"}

    if 200 <= r.status_code < 300 and data.get("ok") is True:
        return {"success": True, "channel": target, "ts": str(data.get("ts") or "")[:32]}

    err_code = str(data.get("error") or "unknown_error")[:120]
    logger.warning("[slack] Slack rejected post: %s", err_code)
    return {"success": False, "reason": err_code}
