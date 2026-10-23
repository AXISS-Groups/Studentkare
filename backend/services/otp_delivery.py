"""OTP delivery boundary. Success means the configured provider accepted the message.

Reads SuperAdmin runtime config (services.integration_config) first, with
environment variables as fallback so the service boots without the admin UI.
"""
import html
import os
import re
import smtplib
import threading
import time
from email.message import EmailMessage

import httpx

from core.app_env import is_dev_or_test
from services.integration_config import INTEGRATIONS_DB, app_domain


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
    sender = cfg.get("from_email") or os.getenv("POSTAL_FROM_EMAIL") or f"StudentKare <noreply@{app_domain()}>"
    enabled = bool(cfg.get("enabled")) or bool(os.getenv("POSTAL_ENABLED", "false").lower() == "true") or bool(url and key)
    return {"enabled": enabled, "api_url": url, "server_api_key": key, "from_email": sender}


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def _openwa_configured(ow: dict | None = None) -> bool:
    ow = ow or _openwa()
    return bool(ow["enabled"] and ow["base_url"] and ow["api_key"] and ow["session_id"])


def _email_configured() -> bool:
    postal = _postal()
    return _smtp_configured() or bool(postal["enabled"] and postal["api_url"] and postal["server_api_key"])


# --- WhatsApp session health ------------------------------------------------
# OpenWA can be configured (URL, key, session id) and still unable to deliver:
# the WhatsApp session behind it logs out, or the gateway is down. Offering
# WhatsApp then traps a student on a form that can only fail. So the channel is
# offered only while GET /api/sessions/{id} (the same base _send_openwa posts to)
# says CONNECTED, and a channel-level send failure takes it out at once. Both
# are remembered for `auth.whatsapp_status_cache_seconds`; a later successful
# send brings it back sooner. Per process: every replica checks for itself.
# Nothing here ever logs or stores a phone number (guardrail 9): the session
# answer can carry the business number, and only its status is read.

# OpenWA reports CONNECTED; WAHA (the fallback API _send_openwa also speaks) WORKING.
# Some OpenWA builds answer READY for a linked, sendable session (verified against
# the deployed gateway: a READY session accepted a send with 201), while the same
# build answers INITIALIZING/QR_READY before the phone is linked.
WHATSAPP_CONNECTED_STATES = frozenset({"CONNECTED", "WORKING", "READY"})
# 400 / 422 mean "this recipient", not "this channel": one student's wrong number
# must not switch WhatsApp off for everyone.
_RECIPIENT_ERRORS = frozenset({400, 422})

_wa_lock = threading.Lock()
_wa_state: dict = {"checked_at": None, "connected": False, "reason": "", "checked_wall": None, "failed_wall": None}


def _wa_setting(key: str, db=None) -> int:
    from core.settings_registry import setting
    return int(setting(key, db))


def reset_whatsapp_status() -> None:
    """Forget the remembered session check (tests, and after an admin edits OpenWA)."""
    with _wa_lock:
        _wa_state.update(checked_at=None, connected=False, reason="", checked_wall=None, failed_wall=None)


def _probe_openwa_session(ow: dict, timeout: float) -> tuple[bool, str]:
    """(connected, reason). Reads only the session's status; never logs the body."""
    url = f"{ow['base_url'].rstrip('/')}/api/sessions/{ow['session_id']}"
    try:
        response = httpx.get(url, headers={"X-API-Key": ow["api_key"]}, timeout=timeout)
    except (httpx.HTTPError, OSError, ValueError) as err:
        return False, f"unreachable ({type(err).__name__})"
    if not response.is_success:
        return False, f"session_http_{response.status_code}"
    try:
        body = response.json()
    except ValueError:
        return False, "session_unreadable"
    if isinstance(body, dict) and isinstance(body.get("data"), dict):
        body = body["data"]
    status = str((body.get("status") or body.get("state") or "") if isinstance(body, dict) else "").strip().upper()
    if status in WHATSAPP_CONNECTED_STATES:
        return True, "connected"
    return False, f"session_{status.lower() or 'status_unknown'}"


def record_whatsapp_delivery(sent: bool, reason: str = "") -> None:
    """A WhatsApp send's outcome: a failure drops the channel, a success restores it."""
    now_wall = time.time()
    with _wa_lock:
        _wa_state["checked_at"] = time.monotonic()
        _wa_state["checked_wall"] = now_wall
        _wa_state["connected"] = sent
        if sent:
            _wa_state["reason"] = "connected"
        else:
            _wa_state["reason"] = f"send_failed ({reason[:80]})" if reason else "send_failed"
            _wa_state["failed_wall"] = now_wall


def whatsapp_status(db=None, *, refresh: bool = False) -> dict:
    """Whether WhatsApp can deliver now, for /auth/options, /api/health and Integrations.

    ``state`` is ``connected``, ``not_connected`` (configured, but the session
    check or the last send failed) or ``not_configured``.
    """
    ow = _openwa()
    if not _openwa_configured(ow):
        return {"state": "not_configured", "configured": False, "connected": False, "reason": "",
                "checkedAt": None, "lastFailureAt": None}
    ttl = _wa_setting("auth.whatsapp_status_cache_seconds", db)
    with _wa_lock:
        fresh = _wa_state["checked_at"] is not None and time.monotonic() - _wa_state["checked_at"] < ttl
    if refresh or not fresh:
        connected, reason = _probe_openwa_session(ow, _wa_setting("auth.whatsapp_status_timeout_seconds", db))
        with _wa_lock:
            _wa_state.update(checked_at=time.monotonic(), checked_wall=time.time(), connected=connected, reason=reason)
        if not connected:
            print(f"[OTP] WhatsApp not offered: {reason}", flush=True)
    with _wa_lock:
        snapshot = dict(_wa_state)
    return {"state": "connected" if snapshot["connected"] else "not_connected", "configured": True,
            "connected": bool(snapshot["connected"]), "reason": snapshot["reason"],
            "checkedAt": snapshot["checked_wall"], "lastFailureAt": snapshot["failed_wall"]}


def available_channels(db=None) -> list[str]:
    """The channels a sign-in code can be sent on right now, in the board's order."""
    channels = []
    if _email_configured():
        channels.append("EMAIL")
    whatsapp_configured = _openwa_configured()
    if whatsapp_configured and whatsapp_status(db)["connected"]:
        channels.append("WHATSAPP")
    # Development with no provider configured at all: offer both (the dev console
    # prints the code). A configured provider that is down is never papered over.
    if not channels and not whatsapp_configured and is_dev_or_test():
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
    """Send one WhatsApp text. Logs status codes only: the body can echo the chat id (a phone number)."""
    ow = _openwa()
    if not _openwa_configured(ow):
        return {"status": "skipped", "reason": "openwa_not_configured"}
    try:
        url = f"{ow['base_url'].rstrip('/')}/api/sessions/{ow['session_id']}/messages/send-text"
        print("[OTP] OpenWA request sent", flush=True)  # no chat id: it is a phone number (guardrail 9)
        response = httpx.post(
            url,
            headers={"X-API-Key": ow["api_key"]},
            json={"chatId": chat_id, "text": text[:4096]}, timeout=10,
        )
        print(f"[OTP] OpenWA response: status={response.status_code}", flush=True)
        if response.is_success:
            record_whatsapp_delivery(True)
            return {"status": "sent", "chat_id": chat_id}
        status = response.status_code
        if status in (404, 405):
            alt = httpx.post(
                f"{ow['base_url'].rstrip('/')}/api/sendText",
                headers={"X-API-Key": ow["api_key"]},
                json={"session": ow["session_id"], "chatId": chat_id, "text": text[:4096]}, timeout=10,
            )
            print(f"[OTP] OpenWA WAHA fallback: status={alt.status_code}", flush=True)
            if alt.is_success:
                record_whatsapp_delivery(True)
                return {"status": "sent", "chat_id": chat_id, "fallback": "waha"}
            status = alt.status_code
        reason = f"http_{status}"
        if status not in _RECIPIENT_ERRORS:
            record_whatsapp_delivery(False, reason)
        return {"status": "failed", "reason": reason}
    except (httpx.HTTPError, OSError, ValueError) as err:
        reason = f"unreachable ({type(err).__name__})"
        print(f"[OTP] OpenWA exception: {reason}", flush=True)
        record_whatsapp_delivery(False, reason)
        return {"status": "failed", "reason": reason}


def _send_email(to_email: str, code: str) -> dict:
    from core.email_templates import otp_verification_email
    subject, html_body, plain_body = otp_verification_email(code)
    return _deliver_email(to_email, subject, html_body, plain_body)


def send_notification_email(to_email: str, subject: str, html_body: str, plain_body: str) -> dict:
    """Send a non-OTP notification email (a reminder) over the same SMTP/Postal route. Never raises."""
    return _deliver_email(to_email, subject, html_body, plain_body)


def _deliver_email(to_email: str, subject: str, html_body: str, plain_body: str) -> dict:
    if _smtp_configured():
        try:
            message = EmailMessage()
            message["From"] = os.environ["SMTP_FROM"]
            message["To"] = to_email
            message["Subject"] = subject
            message.set_content(plain_body)
            message.add_alternative(html_body, subtype="html")
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
        print(f"[OTP] Postal request: POST {url}, to={mask_email(to_email)}, from={postal['from_email']}", flush=True)
        response = httpx.post(
            url,
            headers={"X-Server-API-Key": postal["server_api_key"]},
            json={"to": [to_email], "from": postal["from_email"],
                  "subject": subject, "html_body": html_body, "plain_body": plain_body},
            timeout=15,
        )
        print(f"[OTP] Postal response: status={response.status_code}", flush=True)
        if response.status_code >= 400:
            return {"status": "failed", "reason": f"postal_http_{response.status_code}: {response.text[:200]}"}
        resp_json = response.json()
        if resp_json.get("status") == "success" or resp_json.get("data", {}).get("message_id"):
            return {"status": "sent", "channel": "EMAIL"}
        return {"status": "failed", "reason": f"postal_response: {str(resp_json)[:200]}"}
    except (httpx.HTTPError, OSError, ValueError) as err:
        print(f"[OTP] Postal exception: {err}", flush=True)
        return {"status": "failed", "reason": str(err)[:200]}


def _whatsapp_otp_text(code: str) -> str:
    """The sign-in code as one WhatsApp message: code, site link, then footer.

    A linked Web session has no interactive buttons — WhatsApp Business API
    templates are the only way to render a real one. The site link is the CTA
    here: WhatsApp previews it as a tappable link in the same bubble.
    """
    from core.email_templates import branding_footer_text
    from services.integration_config import app_domain

    text = f"Your Studentkare verification code is {code}. It expires in 5 minutes. Do not share it."
    lines = [text, "", f"Visit website: https://{app_domain()}"]
    footer = branding_footer_text()
    if footer:
        lines.append(footer)
    return "\n".join(lines)


def dispatch_with_fallback(identifier: str, code: str, channel: str = "EMAIL", fallback_email: str | None = None) -> dict:
    """Send OTP on the requested channel; on WhatsApp failure auto-retry via email.

    Returns {"delivered", "channel", "fallback_sent", "fallback_channel",
    "fallback_masked", "reason"} — never raises.
    """
    text = _whatsapp_otp_text(code)
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


def dispatch_otp(identifier: str, code: str, channel: str = "EMAIL", db=None) -> dict:
    """Legacy boundary: success means the provider accepted the message.

    Never logs the identifier: it is a phone number or an email address (guardrail 9).
    """
    channels = available_channels(db)
    if channel not in channels:
        print(f"[OTP] channel '{channel}' not in available channels: {channels}", flush=True)
        return {"delivered": False, "reason": f"channel-unavailable (available: {channels})", "channel": channel}
    if channel == "WHATSAPP":
        ow = _openwa()
        text = _whatsapp_otp_text(code)
        result = _send_openwa(normalize_chat_id(identifier, ow["cc"]), text)
        print(f"[OTP] WhatsApp result: {result.get('status')} {result.get('reason', '')}".rstrip(), flush=True)
        return {"delivered": result.get("status") == "sent",
                "reason": result.get("reason", ""), "channel": channel}
    postal = _postal()
    print(f"[OTP] sending Email to {mask_email(identifier)} (postal_enabled={postal.get('enabled')}, smtp={_smtp_configured()})", flush=True)
    result = _send_email(identifier, code)
    print(f"[OTP] Email result: {result.get('status')}", flush=True)
    return {"delivered": result.get("status") == "sent",
            "reason": result.get("reason", ""), "channel": channel}


def dispatch_message(identifier: str, channel: str, subject: str, text: str, db=None) -> bool:
    """Send one plain message (an invite link, a new-sign-in notice) by email or WhatsApp.

    True when the provider accepted it. Never raises and never logs the identifier
    (guardrail 9). Only channels that can deliver right now are tried.
    """
    if channel not in available_channels(db):
        return False
    try:
        if channel == "WHATSAPP":
            ow = _openwa()
            return _send_openwa(normalize_chat_id(identifier, ow["cc"]), text).get("status") == "sent"
        html_body = "".join(f"<p>{html.escape(line)}</p>" for line in text.split("\n") if line.strip())
        return send_notification_email(identifier, subject, html_body, text).get("status") == "sent"
    except Exception as err:  # noqa: BLE001 — a message that can't go out is reported as not sent, never raised
        print(f"[MESSAGE] {channel} send failed ({type(err).__name__})", flush=True)
        return False
