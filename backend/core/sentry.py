"""
Sentry initialization for Studentkare backend.
Fail-closed: no DSN = no Sentry. PHI scrubbing before send.
"""

import os
import logging
from typing import Any, Dict, Optional

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from services.slack_notifier import PHI_KEYWORDS

logger = logging.getLogger("core.sentry")

SENTRY_DSN = os.getenv("SENTRY_DSN")
APP_VERSION = os.getenv("APP_VERSION", "dev")
APP_ENV = os.getenv("APP_ENV", "development")


def _contains_phi(text: str) -> bool:
    """Check if text contains PHI keywords (mirrors slack_notifier)."""
    if not text:
        return False
    lowered = text.lower()
    return any(k in lowered for k in PHI_KEYWORDS)


def _scrub_dict(data: Any) -> Any:
    """Recursively scrub PHI from any JSON-serializable data."""
    if data is None:
        return None
    if isinstance(data, str):
        return "[REDACTED: PHI]" if _contains_phi(data) else data
    if isinstance(data, list):
        return [_scrub_dict(item) for item in data]
    if isinstance(data, dict):
        scrubbed = {}
        for key, value in data.items():
            scrubbed[key] = _scrub_dict(value)
        return scrubbed
    return data


def _before_send(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Sentry before_send hook: scrub PHI from event data."""
    try:
        # Scrub exception values
        if "exception" in event and "values" in event["exception"]:
            for exc in event["exception"]["values"]:
                if "value" in exc and _contains_phi(exc["value"]):
                    exc["value"] = "[REDACTED: PHI]"
                if "stacktrace" in exc and "frames" in exc["stacktrace"]:
                    for frame in exc["stacktrace"]["frames"]:
                        if "vars" in frame:
                            frame["vars"] = _scrub_dict(frame["vars"])

        # Scrub breadcrumbs
        if "breadcrumbs" in event and "values" in event["breadcrumbs"]:
            for crumb in event["breadcrumbs"]["values"]:
                if "data" in crumb:
                    crumb["data"] = _scrub_dict(crumb["data"])
                if "message" in crumb and _contains_phi(crumb["message"]):
                    crumb["message"] = "[REDACTED: PHI]"

        # Scrub contexts
        if "contexts" in event:
            event["contexts"] = _scrub_dict(event["contexts"])

        # Scrub user data if it contains PHI
        if "user" in event and event["user"]:
            event["user"] = _scrub_dict(event["user"])

        # Scrub tags
        if "tags" in event and event["tags"]:
            event["tags"] = _scrub_dict(event["tags"])

        # Final check: if event still contains PHI in any string field, drop it
        event_str = str(event)
        if _contains_phi(event_str):
            logger.warning("[Sentry] Dropping event: PHI detected after scrubbing")
            return None

    except Exception as e:
        logger.warning("[Sentry] Error in before_send scrubbing: %s", e)
        # Fail closed: drop event if scrubbing fails
        return None

    return event


def init_sentry() -> bool:
    """Initialize Sentry SDK. Returns True on success, False if disabled (fail-closed)."""
    if not SENTRY_DSN:
        logger.info("SENTRY_DSN not set; Sentry disabled (fail-closed)")
        return False

    try:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=APP_ENV,
            release=APP_VERSION,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            before_send=_before_send,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            send_default_pii=False,  # We handle PII/PHI manually
            attach_stacktrace=True,
            max_breadcrumbs=50,
        )
        logger.info("Sentry initialized for environment=%s, release=%s", APP_ENV, APP_VERSION)
        return True
    except Exception as e:
        logger.error("Failed to initialize Sentry (fail-closed): %s", e)
        return False


def set_user_context(user_id: str, role: str, email: str = "") -> None:
    """Set user context for Sentry (non-PHI only)."""
    if not SENTRY_DSN:
        return
    sentry_sdk.set_user({
        "id": user_id,
        "role": role,
        # email is optional; only set if not PHI-sensitive
        **({"email": email} if email and not _contains_phi(email) else {}),
    })


def clear_user_context() -> None:
    """Clear user context on logout."""
    if not SENTRY_DSN:
        return
    sentry_sdk.set_user(None)


def capture_message(message: str, level: str = "info") -> None:
    """Capture a custom message (with PHI scrubbing)."""
    if not SENTRY_DSN:
        return
    if _contains_phi(message):
        logger.warning("[Sentry] Refused to capture message: PHI detected")
        return
    sentry_sdk.capture_message(message, level=level)