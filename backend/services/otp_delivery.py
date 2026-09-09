"""OTP delivery boundary. Success means the configured provider accepted the message."""
import os
import smtplib
from email.message import EmailMessage
import httpx


def available_channels() -> list[str]:
    channels = []
    if (os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM")) or all(os.getenv(key) for key in ("POSTAL_API_URL", "POSTAL_SERVER_API_KEY", "POSTAL_FROM_EMAIL")):
        channels.append("EMAIL")
    if all(os.getenv(key) for key in ("OPENWA_BASE_URL", "OPENWA_API_KEY", "OPENWA_SESSION_ID")):
        channels.append("WHATSAPP")
    return channels


def dispatch_otp(identifier: str, code: str, channel: str = "EMAIL") -> dict:
    if channel not in available_channels():
        return {"delivered": False, "reason": "provider-not-configured"}
    text = f"Your Studentkare verification code is {code}. It expires in 5 minutes. Do not share it."
    try:
        if channel == "EMAIL" and os.getenv("SMTP_HOST"):
            message = EmailMessage()
            message["From"] = os.environ["SMTP_FROM"]
            message["To"] = identifier
            message["Subject"] = "Your Studentkare verification code"
            message.set_content(text)
            mode = os.getenv("SMTP_TLS", "starttls").lower()
            host = os.environ["SMTP_HOST"]
            if mode == "none" and host not in ("localhost", "127.0.0.1"):
                return {"delivered": False, "reason": "tls-required"}
            client_class = smtplib.SMTP_SSL if mode == "ssl" else smtplib.SMTP
            with client_class(host, int(os.getenv("SMTP_PORT", "465" if mode == "ssl" else "587")), timeout=10) as client:
                if mode == "starttls":
                    client.starttls()
                if os.getenv("SMTP_USERNAME"):
                    client.login(os.environ["SMTP_USERNAME"], os.environ.get("SMTP_PASSWORD", ""))
                refused = client.send_message(message)
                return {"delivered": not bool(refused), "channel": channel}
        if channel == "EMAIL":
            response = httpx.post(
                f"{os.environ['POSTAL_API_URL'].rstrip('/')}/api/v1/send/message",
                headers={"X-Server-API-Key": os.environ["POSTAL_SERVER_API_KEY"]},
                json={"to": [identifier], "from": os.environ["POSTAL_FROM_EMAIL"], "subject": "Your Studentkare verification code", "plain_body": text},
                timeout=10,
            )
            response.raise_for_status()
            return {"delivered": response.json().get("status") == "success", "channel": channel}
        response = httpx.post(
            f"{os.environ['OPENWA_BASE_URL'].rstrip('/')}/api/sessions/{os.environ['OPENWA_SESSION_ID']}/messages/send-text",
            headers={"X-API-Key": os.environ["OPENWA_API_KEY"]},
            json={"chatId": f"91{identifier}@c.us", "text": text}, timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        return {"delivered": result.get("success") is True or bool(result.get("id")), "channel": channel}
    except (httpx.HTTPError, smtplib.SMTPException, OSError, ValueError):
        return {"delivered": False, "reason": "provider-error"}
