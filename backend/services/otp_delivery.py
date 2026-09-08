"""
services.otp_delivery — Best-effort OTP delivery (OpenWA / Postal) with fallback.

Dispatches an OTP to a phone (WhatsApp) or email address when a provider is
configured, and always logs the attempt so auth remains auditable.  When no
provider is configured (local demo) it simply records the simulated send.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("services.otp_delivery")


def _is_email(identifier: str) -> bool:
    return "@" in identifier


def dispatch_otp(identifier: str, code: str, channel: str = "WHATSAPP") -> dict:
    """
    Attempt real delivery.  Returns a dict describing the outcome.
    Never raises — auth must not break if delivery is unavailable.
    """
    channel = (channel or "WHATSAPP").upper()
    message = f"Your StudentKare verification code is {code}. It expires in 5 minutes. Do not share it."

    if _is_email(identifier) or channel == "EMAIL":
        return _dispatch_email(identifier, code, message)
    return _dispatch_whatsapp(identifier, code, message)


def _dispatch_whatsapp(phone: str, code: str, message: str) -> dict:
    if not os.environ.get("OPENWA_BASE_URL"):
        logger.info("[OTP] WhatsApp delivery skipped (OpenWA not configured). phone=%s", phone)
        return {"channel": "whatsapp", "delivered": False, "reason": "provider-not-configured"}

    try:
        from core.whatsapp import send_wa_message

        # Best-effort; send_wa_message handles opt-out / unreachable internally.
        import asyncio
        asyncio.get_event_loop().run_until_complete(
            send_wa_message(phone=phone, text=message, kind="text", opt_in=True)
        )
        return {"channel": "whatsapp", "delivered": True}
    except Exception as exc:  # pragma: no cover
        logger.warning("[OTP] WhatsApp delivery failed: %s", exc)
        return {"channel": "whatsapp", "delivered": False, "reason": "provider-error"}


def _dispatch_email(email: str, code: str, message: str) -> dict:
    if not (os.environ.get("POSTAL_API_URL") or os.environ.get("SENDGRID_API_KEY") or os.environ.get("GMAIL_SMTP")):
        logger.info("[OTP] Email delivery skipped (no email provider configured). email=%s", email)
        return {"channel": "email", "delivered": False, "reason": "provider-not-configured"}

    try:
        from core.email import send_email
        import asyncio
        asyncio.get_event_loop().run_until_complete(
            send_email(email, "Your StudentKare verification code", f"<p>{message}</p>")
        )
        return {"channel": "email", "delivered": True}
    except Exception as exc:  # pragma: no cover
        logger.warning("[OTP] Email delivery failed: %s", exc)
        return {"channel": "email", "delivered": False, "reason": "provider-error"}
