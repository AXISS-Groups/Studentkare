import os
import re
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders as email_encoders
from typing import Optional, List
from core.db import db


def _plain_text(html: str) -> str:
    """Strip HTML to a plain-text fallback for Postal's text_body field."""
    text = re.sub(r"<style.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_postal_config() -> Optional[dict]:
    """Fetch Postal (postalserver.io) email configuration from environment variables."""
    api_url = (os.environ.get("POSTAL_API_URL") or "").strip().rstrip("/")
    server_api_key = (os.environ.get("POSTAL_SERVER_API_KEY") or "").strip()
    if not api_url or not server_api_key:
        return None
    return {
        "api_url": api_url,
        "server_api_key": server_api_key,
        "from_email": (os.environ.get("POSTAL_FROM_EMAIL") or "").strip()
                      or "Student Alumni <noreply@studentalumni.ai>",
    }


async def _get_postal_from_db() -> Optional[dict]:
    """Fetch Postal config from installed_tools in the database (superadmin settings UI)."""
    try:
        config = await db.installed_tools.find_one({
            "tool_id": "postal",
            "status": {"$in": ["connected", "mock_connected"]}
        })
        if not config:
            return None
        creds = config.get("credentials") or config.get("config") or {}
        api_url = (creds.get("api_url") or "").strip().rstrip("/")
        server_api_key = (creds.get("server_api_key") or "").strip()
        if not api_url or not server_api_key:
            return None
        return {
            "api_url": api_url,
            "server_api_key": server_api_key,
            "from_email": (creds.get("from_email") or "").strip()
                          or "Student Alumni <noreply@studentalumni.ai>",
        }
    except Exception:
        return None


async def get_gmail_config():
    """Fetch Gmail integration config from installed_tools or settings collection."""
    # 1) Check installed_tools (superadmin Tools UI)
    config = await db.installed_tools.find_one({
        "tool_id": "gmail",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    if config:
        return config

    # 2) Fallback: check settings collection (flat SMTP fields from admin settings)
    settings = await db.settings.find_one({"id": "global"})
    if settings and settings.get("email_provider") == "gmail":
        smtp_user = settings.get("smtp_user") or ""
        smtp_pass = settings.get("smtp_password") or ""
        if smtp_user and smtp_pass:
            return {
                "tool_id": "gmail",
                "status": "connected",
                "credentials": {
                    "smtp_user": smtp_user,
                    "app_password": smtp_pass,
                    "smtp_host": settings.get("smtp_host", "smtp.gmail.com"),
                    "smtp_port": settings.get("smtp_port", "587"),
                },
            }
    return None


async def get_sendgrid_config():
    """Fetch SendGrid integration config from installed_tools."""
    config = await db.installed_tools.find_one({
        "tool_id": "sendgrid",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    return config


def _sendgrid_default_from():
    return "Student Alumni <noreply@studentalumni.ai>"


async def generate_pdf_from_html(html: str) -> Optional[bytes]:
    """Render an HTML string to PDF bytes using Playwright (headless Chromium).
    Returns None if Playwright is not available or rendering fails.
    """
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.set_content(html, wait_until="networkidle")
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
            )
            await browser.close()
            return pdf_bytes
    except Exception as e:
        print(f"[WARN] PDF generation failed: {e}")
        return None


async def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    attachments: Optional[List[dict]] = None,
):
    """Send an email with optional PDF attachments.

    attachments format: [{"filename": "invoice.pdf", "content": <bytes>}]

    Provider priority (all providers are optional):
      1. Postal (env-configured) — the platform's primary mail server
      2. SendGrid (marketplace API key)
      3. Gmail SMTP (marketplace credentials)

    Returns True on success, False if no provider is configured or sending fails.
    A failed delivery is never silently swallowed — it is logged at WARN/ERROR
    and recorded in the `email_failures` collection for admin visibility.
    """
    from core.email_quality import allow_send
    ok, why = await allow_send(to_email)
    if not ok:
        print(f"[WARN] Skipping send to {to_email}: {why}")
        await _record_failure(to_email, subject, why)
        return False

    postal = get_postal_config()
    if not postal:
        postal = await _get_postal_from_db()
    if postal:
        ok = await _send_via_postal(postal, to_email, subject, body_html, attachments)
        if ok:
            return True

    sendgrid = await get_sendgrid_config()
    if sendgrid:
        ok = await _send_via_sendgrid(sendgrid, to_email, subject, body_html, attachments)
        if ok:
            return True

    gmail = await get_gmail_config()
    if gmail:
        ok = await _send_via_gmail(gmail, to_email, subject, body_html, attachments)
        if ok:
            return True

    print(f"[WARN] No email provider configured. Cannot send email to {to_email}.")
    await _record_failure(to_email, subject, "No email provider configured")
    return False


async def _record_failure(to_email: str, subject: str, reason: str):
    """Persist a failed delivery so silent drops are visible to admins."""
    try:
        from datetime import datetime, timezone
        await db.email_failures.insert_one({
            "email": to_email,
            "subject": subject[:200],
            "reason": reason[:500],
            "created_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        print(f"[WARN] Could not persist email failure: {e}")


async def _send_via_postal(
    config: dict, to_email: str, subject: str, body_html: str,
    attachments: Optional[List[dict]] = None,
) -> bool:
    """Send via a Postal (postalserver.io) HTTP JSON API.

    Docs: https://docs.postalserver.io/developer/api
    Attachments: list of {"filename": str, "content": bytes}
    """
    try:
        import httpx
        from email.utils import parseaddr

        from_email = config.get("from_email") or "Student Alumni <noreply@studentalumni.ai>"
        api_url = (config.get("api_url") or "").rstrip("/")
        endpoint = f"{api_url}/api/v1/send/message"

        # Postal requires a clean RFC 5322 display name for the From header.
        display_name, addr = parseaddr(from_email)
        if not addr:
            addr = from_email.strip()
            display_name = "Student Alumni"
        from_header = f"{display_name} <{addr}>" if display_name else addr

        payload: dict = {
            "to": to_email,
            "from": from_header,
            "subject": subject,
            "html_body": body_html,
            "text_body": _plain_text(body_html),
            "tag": "student-alumni",
        }

        # Attach PDF files as base64
        if attachments:
            payload["attachments"] = [
                {
                    "name": att["filename"],
                    "content_type": "application/pdf",
                    "data": base64.b64encode(att["content"]).decode(),
                }
                for att in attachments
                if att.get("content")
            ]

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                endpoint,
                headers={
                    "X-Server-API-Key": config.get("server_api_key"),
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code in (200, 201):
                print(f"[INFO] Postal: sent email to {to_email}")
                return True
            print(f"[ERROR] Postal send failed to {to_email}: HTTP {r.status_code} {r.text[:300]}")
            await _record_failure(to_email, subject, f"Postal HTTP {r.status_code} {r.text[:200]}")
            return False
    except Exception as e:
        print(f"[ERROR] Postal send exception to {to_email}: {e}")
        await _record_failure(to_email, subject, f"Postal exception: {e}")
        return False


async def _send_via_sendgrid(
    config: dict, to_email: str, subject: str, body_html: str,
    attachments: Optional[List[dict]] = None,
) -> bool:
    try:
        import httpx
        creds = config.get("credentials", {})
        api_key = (creds.get("api_key") or "").strip()
        from_email = (creds.get("from_email") or "").strip() or _sendgrid_default_from()
        if not api_key:
            return False

        payload: dict = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": body_html}],
        }

        if attachments:
            payload["attachments"] = [
                {
                    "content": base64.b64encode(att["content"]).decode(),
                    "type": "application/pdf",
                    "filename": att["filename"],
                    "disposition": "attachment",
                }
                for att in attachments
                if att.get("content")
            ]

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code in (200, 201, 202):
                print(f"[INFO] SendGrid: sent email to {to_email}")
                return True
            print(f"[ERROR] SendGrid send failed to {to_email}: HTTP {r.status_code} {r.text[:300]}")
            return False
    except Exception as e:
        print(f"[ERROR] SendGrid send exception to {to_email}: {e}")
        await _record_failure(to_email, subject, f"SendGrid exception: {e}")
        return False


async def _send_via_gmail(
    config: dict, to_email: str, subject: str, body_html: str,
    attachments: Optional[List[dict]] = None,
) -> bool:
    """Send via Gmail SMTP. Supports SMTP app-password creds stored either as
    (client_id/client_secret) [legacy] or (smtp_user/app_password) [preferred]."""
    creds = config.get("credentials", {})
    sender_email = creds.get("smtp_user") or creds.get("client_id")
    app_password = creds.get("app_password") or creds.get("client_secret")

    if not sender_email or not app_password:
        print(f"[WARN] Gmail credentials missing. Cannot send email to {to_email}.")
        await _record_failure(to_email, subject, "Gmail credentials missing")
        return False

    # Use 'mixed' so we can attach files; alternative is for text/html only
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    # Attach HTML body
    body_part = MIMEMultipart("alternative")
    body_part.attach(MIMEText(body_html, "html"))
    msg.attach(body_part)

    # Attach PDF files
    if attachments:
        for att in attachments:
            if not att.get("content"):
                continue
            part = MIMEBase("application", "pdf")
            part.set_payload(att["content"])
            email_encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=att.get("filename", "attachment.pdf"),
            )
            msg.attach(part)

    try:
        smtp_host = creds.get("smtp_host", "smtp.gmail.com")
        smtp_port = int(creds.get("smtp_port", 587))
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.ehlo()
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.close()
        print(f"[INFO] Gmail: successfully sent email to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Gmail send failed to {to_email}: {e}")
        await _record_failure(to_email, subject, f"Gmail exception: {e}")
        return False


def render_html_email(content_html: str) -> str:
    """Wrap a content fragment in a clean, professional email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 28px 0;text-align:center;">
              <div style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#524FD9,#4441b8);border-radius:12px;">
                <span style="font-size:17px;font-weight:800;color:#fff;letter-spacing:2px;">STUDENTKARE</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e6ee;box-shadow:0 4px 24px rgba(22,22,92,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 32px;color:#16165c;font-size:15px;line-height:1.65;">
                    {content_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;color:#6d6d84;font-size:12px;line-height:1.6;">
                This is an automated message from <strong style="color:#4a4a63;">StudentKare</strong>.
              </p>
              <p style="margin:0 0 4px 0;color:#d1d5db;font-size:11px;">
                A little care, right where you left it.
              </p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">
                Questions? Visit <a href="https://care.studentalumni.ai" style="color:#524FD9;text-decoration:none;">care.studentalumni.ai</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
