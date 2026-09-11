"""Runtime integration configuration (SuperAdmin-configurable).

Leaf module — stdlib/os only, no app imports (imported by otp_delivery,
workflow_auth, and the integrations router). Secrets live in-memory here,
seeded from environment; swap to a persistent table for multi-instance prod.
Public (non-secret) values are exposed via GET /api/config/public.
"""
import os

INTEGRATIONS_DB: dict = {
    "posthog": {
        "enabled": os.getenv("POSTHOG_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("POSTHOG_API_KEY", ""),
        "host": os.getenv("POSTHOG_HOST", "https://app.posthog.com"),
        "autocapture": True,
    },
    "openwa": {
        "enabled": os.getenv("OPENWA_ENABLED", "false").lower() == "true",
        "base_url": os.getenv("OPENWA_BASE_URL", ""),
        "api_key": os.getenv("OPENWA_API_KEY", ""),
        "session_id": os.getenv("OPENWA_SESSION_ID", ""),
        "default_country_code": os.getenv("OPENWA_DEFAULT_COUNTRY_CODE", "91"),
    },
    "postal": {
        "enabled": os.getenv("POSTAL_ENABLED", "false").lower() == "true",
        "api_url": os.getenv("POSTAL_API_URL", ""),
        "server_api_key": os.getenv("POSTAL_SERVER_API_KEY", ""),
        "from_email": os.getenv("POSTAL_FROM_EMAIL", "StudentKare <noreply@studentkare.in>"),
    },
    "firebase": {
        "enabled": os.getenv("FIREBASE_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("FIREBASE_API_KEY", ""),
        "auth_domain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "project_id": os.getenv("FIREBASE_PROJECT_ID", ""),
        "messaging_sender_id": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "app_id": os.getenv("FIREBASE_APP_ID", ""),
        "vapid_key": os.getenv("FIREBASE_VAPID_KEY", ""),
        # Server-side (never exposed publicly):
        "server_key": os.getenv("FIREBASE_SERVER_KEY", ""),
        "service_account_json": os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
    },
    "otp": {
        "channel": os.getenv("OTP_CHANNEL", "WHATSAPP"),
        "length": int(os.getenv("OTP_LENGTH", "6")),
        "ttl_seconds": int(os.getenv("OTP_TTL_SECONDS", "300")),
        "max_attempts": int(os.getenv("OTP_MAX_ATTEMPTS", "5")),
    },
    "twofa": {
        "enforced_roles": [r for r in os.getenv("TWOFA_ENFORCED_ROLES", "SUPER_ADMIN").split(",") if r],
        "issuer": os.getenv("TWOFA_ISSUER", "StudentKare"),
    },
}

SECRET_HINTS = ("key", "secret", "token", "password", "service_account_json")


def mask_secret(value: str) -> str:
    if not value:
        return ""
    s = str(value)
    if len(s) <= 4:
        return "••••"
    return f"{s[:2]}••••••{s[-2:]}"


def sanitize(provider: str) -> dict:
    out: dict = {}
    for k, v in INTEGRATIONS_DB.get(provider, {}).items():
        out[k] = v
        if isinstance(v, str) and any(h in k for h in SECRET_HINTS):
            out[f"{k}_masked"] = mask_secret(v)
    return out


def public_config() -> dict:
    return {
        "posthog": {
            "enabled": bool(INTEGRATIONS_DB["posthog"].get("enabled")),
            "apiKey": INTEGRATIONS_DB["posthog"].get("api_key", ""),
            "host": INTEGRATIONS_DB["posthog"].get("host", "https://app.posthog.com"),
        },
        "firebase": {
            "enabled": bool(INTEGRATIONS_DB["firebase"].get("enabled")),
            "apiKey": INTEGRATIONS_DB["firebase"].get("api_key", ""),
            "authDomain": INTEGRATIONS_DB["firebase"].get("auth_domain", ""),
            "projectId": INTEGRATIONS_DB["firebase"].get("project_id", ""),
            "messagingSenderId": INTEGRATIONS_DB["firebase"].get("messaging_sender_id", ""),
            "appId": INTEGRATIONS_DB["firebase"].get("app_id", ""),
            "vapidKey": INTEGRATIONS_DB["firebase"].get("vapid_key", ""),
        },
        "otp": {
            "channel": INTEGRATIONS_DB["otp"].get("channel", "WHATSAPP"),
            "ttlSeconds": INTEGRATIONS_DB["otp"].get("ttl_seconds", 300),
        },
        "twofa": {
            "enforcedRoles": INTEGRATIONS_DB["twofa"].get("enforced_roles", ["SUPER_ADMIN"]),
            "issuer": INTEGRATIONS_DB["twofa"].get("issuer", "StudentKare"),
        },
    }
