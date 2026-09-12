"""OTP delivery boundary. Success means the configured provider accepted the message.

Reads SuperAdmin runtime config (services.integration_config) first, with
environment variables as fallback so the service boots without the admin UI.
"""
import os
import re
import smtplib
from email.message import EmailMessage

import httpx

from services.integration_config import INTEGRATIONS_DB


def _openwa() -> dict:
    cfg = INTEGRATIONS_DB.get("openwa", {})
    base = (cfg.get("base_url") or os.getenv("OPENWA_BASE_URL") or "").rstrip("/")
    key = cfg.get("api_key") or os.getenv("OPENWA_API_KEY") or ""
    session = cfg.get("session_id") or os.getenv("OPENWA_SESSION_ID") or ""
    cc = (cfg.get("default_country_code") or os.getenv("OPENWA_DEFAULT_COUNTRY_CODE") or "91").lstrip("+")
    enabled = bool(cfg.get("enabled")) or bool(os.getenv("OPENWA_ENABLED", "false").lower() == "true") or bool(base and key and session)
    return {"enabled": enabled, "base_url": base, "api_key": key, "session_id": session, "cc": cc}


def _postal() -> dict:
    cfg = INTEGRATIONS_DB.get("postal", {})
    url = (cfg.get("api_url") or os.getenv("POSTAL_API_URL") or "").rstrip("/")
    key = cfg.get("server_api_key") or os.getenv("POSTAL_SERVER_API_KEY") or ""
    sender = cfg.get("from_email") or os.getenv("POSTAL_FROM_EMAIL") or "StudentKare <noreply@studentkare.in>"
    enabled = bool(cfg.get("enabled")) or bool(os.getenv("POSTAL_ENABLED", "false").lower() == "true") or bool(url and key)
    return {"enabled": enabled, "api_url": url, "server_api_key": key, "from_email": sender}


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def available_channels() -> list[str]:
    channels = []
    if _smtp_configured() or (_postal()["enabled"] and _postal()["api_url"] and _postal()["server_api_key"]):
        channels.append("EMAIL")
    ow = _openwa()
    if ow["enabled"] and ow["base_url"] and ow["api_key"] and ow["session_id"]:
        channels.append("WHATSAPP")
    # In development, always offer both channels (dev console delivers OTP to logs)
    if not channels and os.getenv("APP_ENV", "development") != "production":
        channels = ["EMAIL", "WHATSAPP"]
    return channels


def normalize_chat_id(phone: str, cc: str = "91") -> str:
    """Raw phone -> OpenWA chatId (<cc><national>@c.us)."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) in (10, 11):
        digits = digits.lstrip("0")
    if len(digits) == 10:
        digits = f"{cc}{digits}"
    return f"{digits}@c.us"


def mask_email(email: str) -> str:
    local, _, domain = (email or "").strip().partition("@")
    return f"{local[:1]}•••••@{domain}" if local and domain else email


def _send_openwa(chat_id: str, text: str) -> dict:
    ow = _openwa()
    if not (ow["enabled"] and ow["base_url"] and ow["api_key"] and ow["session_id"]):
        return {"status": "skipped", "reason": "openwa_not_configured"}
    try:
        url = f"{ow['base_url'].rstrip('/')}/api/sessions/{ow['session_id']}/messages/send-text"
        print(f"[OTP] OpenWA request: POST {url}, chatId={chat_id}", flush=True)
        response = httpx.post(
            url,
            headers={"X-API-Key": ow["api_key"]},
            json={"chatId": chat_id, "text": text[:4096]}, timeout=10,
        )
        print(f"[OTP] OpenWA response: status={response.status_code}, body={response.text[:300]}", flush=True)
        if response.is_success:
            return {"status": "sent", "chat_id": chat_id}
        if response.status_code in (404, 405):
            alt = httpx.post(
                f"{ow['base_url'].rstrip('/')}/api/sendText",
                headers={"X-API-Key": ow["api_key"]},
                json={"session": ow["session_id"], "chatId": chat_id, "text": text[:4096]}, timeout=10,
            )
            print(f"[OTP] OpenWA WAHA fallback: status={alt.status_code}, body={alt.text[:300]}", flush=True)
            if alt.is_success:
                return {"status": "sent", "chat_id": chat_id, "fallback": "waha"}
        return {"status": "failed", "reason": f"http_{response.status_code}: {response.text[:200]}"}
    except (httpx.HTTPError, OSError, ValueError) as err:
        print(f"[OTP] OpenWA exception: {err}", flush=True)
        return {"status": "failed", "reason": str(err)[:200]}


def _send_email(to_email: str, code: str) -> dict:
    text = f"Your Studentkare verification code is {code}. It expires in 5 minutes. Do not share it."
    if _smtp_configured():
        try:
            message = EmailMessage()
            message["From"] = os.environ["SMTP_FROM"]
            message["To"] = to_email
            message["Subject"] = "Your Studentkare verification code"
            message.set_content(text)
            mode = os.getenv("SMTP_TLS", "starttls").lower()
            host = os.environ["SMTP_HOST"]
            if mode == "none" and host not in ("localhost", "127.0.0.1"):
                return {"status": "failed", "reason": "tls-required"}
            client_class = smtplib.SMTP_SSL if mode == "ssl" else smtplib.SMTP
            with client_class(host, int(os.getenv("SMTP_PORT", "465" if mode == "ssl" else "587")), timeout=10) as client:
                if mode == "starttls":
                    client.starttls()
                if os.getenv("SMTP_USERNAME"):
                    client.login(os.environ["SMTP_USERNAME"], os.environ.get("SMTP_PASSWORD", ""))
                refused = client.send_message(message)
                return {"status": "sent" if not refused else "failed", "channel": "EMAIL"}
        except (smtplib.SMTPException, OSError, ValueError) as err:
            return {"status": "failed", "reason": str(err)[:200]}
    postal = _postal()
    if not (postal["enabled"] and postal["api_url"] and postal["server_api_key"]):
        return {"status": "skipped", "reason": "email_not_configured"}
    try:
        url = f"{postal['api_url'].rstrip('/')}/api/v1/send/message"
        print(f"[OTP] Postal request: POST {url}, to={to_email}, from={postal['from_email']}", flush=True)
        response = httpx.post(
            url,
            headers={"X-Server-API-Key": postal["server_api_key"]},
            json={"to": [to_email], "from": postal["from_email"],
                  "subject": "Your Studentkare verification code", "plain_body": text},
            timeout=15,
        )
        print(f"[OTP] Postal response: status={response.status_code}, body={response.text[:500]}", flush=True)
        if response.status_code >= 400:
            return {"status": "failed", "reason": f"postal_http_{response.status_code}: {response.text[:200]}"}
        resp_json = response.json()
        if resp_json.get("status") == "success" or resp_json.get("data", {}).get("message_id"):
            return {"status": "sent", "channel": "EMAIL"}
        return {"status": "failed", "reason": f"postal_response: {str(resp_json)[:200]}"}
    except (httpx.HTTPError, OSError, ValueError) as err:
        print(f"[OTP] Postal exception: {err}", flush=True)
        return {"status": "failed", "reason": str(err)[:200]}


def dispatch_with_fallback(identifier: str, code: str, channel: str = "EMAIL", fallback_email: str | None = None) -> dict:
    """Send OTP on the requested channel; on WhatsApp failure auto-retry via email.

    Returns {"delivered", "channel", "fallback_sent", "fallback_channel",
    "fallback_masked", "reason"} — never raises.
    """
    text = f"Your Studentkare verification code is {code}. It expires in 5 minutes. Do not share it."
    out = {"delivered": False, "channel": channel, "fallback_sent": False,
           "fallback_channel": None, "fallback_masked": None, "reason": ""}
    if channel == "WHATSAPP":
        result = _send_openwa(normalize_chat_id(identifier, _openwa()["cc"]), text)
        if result.get("status") == "sent":
            out["delivered"] = True
            return out
        if result.get("status") == "skipped":
            out["reason"] = result.get("reason", "")
            return out
        out["reason"] = result.get("reason", "")
        if fallback_email and "@" in fallback_email:
            fb = _send_email(fallback_email.strip(), code)
            if fb.get("status") == "sent":
                out["delivered"] = True
                out["fallback_sent"] = True
                out["fallback_channel"] = "EMAIL"
                out["fallback_masked"] = mask_email(fallback_email)
            else:
                out["reason"] = f"whatsapp_{out['reason']}; email_{fb.get('reason', fb.get('status'))}"
        return out
    result = _send_email(identifier, code)
    out["delivered"] = result.get("status") == "sent"
    out["reason"] = "" if out["delivered"] else result.get("reason", result.get("status", ""))
    return out


def send_email_code(to_email: str, code: str) -> dict:
    """Public wrapper: send an OTP code to an email address. Never raises."""
    return _send_email(to_email, code)


def dispatch_otp(identifier: str, code: str, channel: str = "EMAIL") -> dict:
    """Legacy boundary: success means the provider accepted the message."""
    channels = available_channels()
    if channel not in channels:
        print(f"[OTP] channel '{channel}' not in available channels: {channels}", flush=True)
        return {"delivered": False, "reason": f"provider-not-configured (available: {channels})"}
    if channel == "WHATSAPP":
        ow = _openwa()
        text = f"Your Studentkare verification code is {code}. It expires in 5 minutes. Do not share it."
        print(f"[OTP] sending WhatsApp to {identifier} via OpenWA (base_url={ow.get('base_url', 'NOT SET')})", flush=True)
        result = _send_openwa(normalize_chat_id(identifier, ow["cc"]), text)
        print(f"[OTP] WhatsApp result: {result}", flush=True)
        return {"delivered": result.get("status") == "sent",
                "reason": result.get("reason", ""), "channel": channel}
    postal = _postal()
    smtp = _smtp_configured()
    print(f"[OTP] sending Email to {identifier} (postal_enabled={postal.get('enabled')}, postal_url={postal.get('api_url', 'NOT SET')}, smtp={smtp})", flush=True)
    result = _send_email(identifier, code)
    print(f"[OTP] Email result: {result}", flush=True)
    return {"delivered": result.get("status") == "sent",
            "reason": result.get("reason", ""), "channel": channel}
