"""Closed-schema crash metadata and a final envelope boundary for Sentry."""
from __future__ import annotations

from uuid import uuid4

from sentry_sdk.envelope import Envelope
from sentry_sdk.transport import HttpTransport

from core.app_env import app_env

ERROR_TYPES = frozenset({
    "Exception", "RuntimeError", "TypeError", "ValueError", "KeyError", "IndexError",
    "AttributeError", "ImportError", "ModuleNotFoundError", "OSError", "TimeoutError",
    "ConnectionError", "AssertionError", "ZeroDivisionError", "HTTPException",
    "IntegrityError", "OperationalError", "DatabaseError", "ValidationError",
})
LEVELS = frozenset({"fatal", "error", "warning", "info", "debug"})
WITHHELD_ERROR = "Error details withheld"


def scrub_event(event: object, hint: object = None) -> dict[str, object] | None:
    """Discard arbitrary keys and values, not just strings matching a keyword."""
    try:
        if not isinstance(event, dict) or event.get("type") is not None:
            return None
        level = event.get("level")
        level = level if isinstance(level, str) and level in LEVELS else "error"
        exception = event.get("exception")
        values = exception.get("values") if isinstance(exception, dict) else None
        last = values[-1] if isinstance(values, list) and values else None
        error_type = last.get("type") if isinstance(last, dict) else None
        error_type = (
            error_type if isinstance(error_type, str) and error_type in ERROR_TYPES else "Exception"
        )
        return {
            "event_id": uuid4().hex,
            "platform": "python", "environment": app_env(), "level": level,
            "exception": {"values": [{"type": error_type, "value": WITHHELD_ERROR}]},
        }
    except Exception:
        # No exception text or rejected payload is logged by this boundary.
        return None


def scrub_envelope(envelope: Envelope) -> Envelope | None:
    """SDK-generated side envelopes and attachments must not bypass the gate."""
    try:
        for item in envelope.items:
            if item.type != "event":
                continue
            event = scrub_event(item.get_event())
            if event is None:
                continue
            safe = Envelope(headers={"event_id": event["event_id"]})
            safe.add_event(event)
            return safe
    except Exception:
        return None
    return None


class PrivacyTransport(HttpTransport):
    """Apply the allowlist immediately before the actual HTTP transport."""

    def capture_envelope(self, envelope: Envelope) -> None:
        safe = scrub_envelope(envelope)
        if safe is not None:
            super().capture_envelope(safe)
