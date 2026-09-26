"""Fail-closed Slack ops alert sender — non-PHI only.

- Reads config from services.integration_config.INTEGRATIONS_DB["slack"].
- Refuses to send when disabled/unconfigured (fail closed).
- Refuses to send any text containing PHI keywords (fail closed, never scrub-and-send).
- Storm guard: at most one post per kind per window (per process); excess is
  dropped with a "suppressed" count attached to the next sent message.
- Volumetric counters (counts only, never identifiers) for periodic digests.
- Never logs the bot token, never echoes it in return values or error messages.
- Never raises: all transport/parse failures return {"success": False, ...}.
"""
from __future__ import annotations

import logging
import time
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

# Storm guard: one post per kind per window, per process. Best-effort across
# workers (each uvicorn worker holds its own counters); the window bounds the
# worst case to ~workers posts per 5 minutes instead of unbounded.
STORM_WINDOW_SECONDS = 300.0
# Kinds exempt from suppression: inherently rate-limited by construction
# (the periodic digest fires at most once per scheduler run).
STORM_EXEMPT_KINDS = frozenset({"digest", "selftest"})

_SEND_STATE: Dict[str, Dict[str, float]] = {}
_COUNTERS: Dict[str, int] = {}


def contains_phi(text: str) -> bool:
    lowered = (text or "").lower()
    return any(k in lowered for k in PHI_KEYWORDS)


def bump_counter(name: str) -> None:
    """Best-effort volumetric counter (counts only). Never raises."""
    try:
        _COUNTERS[name] = _COUNTERS.get(name, 0) + 1
    except Exception:
        pass


def take_counters() -> Dict[str, int]:
    """Return a snapshot of volumetric counters and reset them. Never raises."""
    try:
        snapshot = dict(_COUNTERS)
        _COUNTERS.clear()
        return snapshot
    except Exception:
        return {}


def _storm_gate(kind: str) -> tuple[bool, int]:
    """Return (allowed, previously_suppressed). Resets expired windows."""
    now = time.monotonic()
    state = _SEND_STATE.get(kind)
    if state is None or now - state["window_start"] >= STORM_WINDOW_SECONDS:
        suppressed = int(state["suppressed"]) if state else 0
        _SEND_STATE[kind] = {"window_start": now, "suppressed": 0}
        return True, suppressed
    state["suppressed"] = float(int(state["suppressed"]) + 1)
    return False, int(state["suppressed"])


def resolve_channel(cfg: Dict[str, Any], purpose: str = "") -> str:
    """Purpose-routed channel with fail-safe fallback to the default channel.

    purposes: "ops" -> ops_channel, "bookings" -> booking_channel.
    Unknown/empty purposes and unconfigured purpose channels fall back to
    default_channel (never empty-string routing, never an exception).
    """
    try:
        if purpose == "ops":
            specific = str(cfg.get("ops_channel") or "").strip()
            if specific:
                return specific
        elif purpose == "bookings":
            specific = str(cfg.get("booking_channel") or "").strip()
            if specific:
                return specific
        return str(cfg.get("default_channel") or "")
    except Exception:
        return ""


def post_ops_alert(text: str, channel: Optional[str] = None, *,
                   kind: str = "ops", purpose: str = "") -> Dict[str, Any]:
    """Post a non-PHI ops alert to Slack via chat.postMessage. Never raises."""
    from services.integration_config import INTEGRATIONS_DB

    cfg = INTEGRATIONS_DB.get("slack", {})
    if not cfg.get("enabled"):
        return {"success": False, "reason": "disabled"}
    token = str(cfg.get("bot_token") or "")
    if channel is not None:
        target = str(channel or "")
    else:
        target = resolve_channel(cfg, purpose)
    if not token or not target:
        return {"success": False, "reason": "not_configured"}
    safe = (text or "").strip()
    if not safe:
        return {"success": False, "reason": "empty_text"}
    safe = safe[:MAX_TEXT_LEN]
    if contains_phi(safe):
        logger.warning("[slack] REFUSED to send: payload matched PHI blocklist")
        return {"success": False, "reason": "phi_blocked"}

    if kind not in STORM_EXEMPT_KINDS:
        allowed, suppressed_before = _storm_gate(kind)
        if not allowed:
            return {"success": False, "reason": "suppressed_storm_guard",
                    "suppressed": suppressed_before}
        if suppressed_before:
            note = f" (+{suppressed_before} similar alerts suppressed in the last 5 min)"
            safe = (safe + note)[:MAX_TEXT_LEN]

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
