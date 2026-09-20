"""Runtime integration configuration (SuperAdmin-configurable).

Reads/writes to the care_system_settings table for persistence across restarts.
Environment variables serve as initial defaults (seeded on first boot).
"""
import os
import time

from sqlalchemy import select

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
        "from_email": os.getenv("POSTAL_FROM_EMAIL", f"StudentKare <noreply@{os.getenv('APP_DOMAIN', 'studentkare.co')}>"),
    },
    "slack": {
        "enabled": os.getenv("SLACK_ENABLED", "false").lower() == "true",
        "bot_token": os.getenv("SLACK_BOT_TOKEN", ""),
        "default_channel": os.getenv("SLACK_DEFAULT_CHANNEL", ""),
    },
    "firebase": {
        "enabled": os.getenv("FIREBASE_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("FIREBASE_API_KEY", ""),
        "auth_domain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "project_id": os.getenv("FIREBASE_PROJECT_ID", ""),
        "messaging_sender_id": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "app_id": os.getenv("FIREBASE_APP_ID", ""),
        "vapid_key": os.getenv("FIREBASE_VAPID_KEY", ""),
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
    "platform": {
        "app_domain": os.getenv("APP_DOMAIN", "studentkare.co"),
        "brand_name": os.getenv("BRAND_NAME", "StudentKare"),
        "support_email": os.getenv("SUPPORT_EMAIL", f"support@{os.getenv('APP_DOMAIN', 'studentkare.co')}"),
        "company_address": os.getenv("COMPANY_ADDRESS", "Plot 42, Knowledge Park, HITEC City, Hyderabad, Telangana 500081"),
        "copyright_text": os.getenv("COPYRIGHT_TEXT", "© 2026 StudentKare. All rights reserved."),
        "support_phone": os.getenv("SUPPORT_PHONE", "+91 80080 00000"),
        "logo_url": os.getenv("LOGO_URL", ""),
        "favicon_url": os.getenv("FAVICON_URL", ""),
    },
    "llm": {
        "enabled": os.getenv("LLM_ENABLED", "true").lower() == "true",
        "provider": os.getenv("LLM_PROVIDER", "openai"),
        "api_key": os.getenv("LLM_API_KEY", os.getenv("EMERGENT_LLM_KEY", "")),
        "model": os.getenv("LLM_MODEL", "llama3.1:8b"),
    },
    "apilayer": {
        "enabled": os.getenv("APILAYER_ENABLED", "false").lower() == "true",
        "api_key": os.getenv("APILAYER_API_KEY", ""),
        "numverify_enabled": True,
        "positionstack_enabled": True,
    },
}

SECRET_HINTS = ("key", "secret", "token", "password", "service_account_json")
_loaded_from_db = False


def platform_value(name: str, default: str = "") -> str:
    """Read a live platform setting (DB-first, then env, then default)."""
    cfg = INTEGRATIONS_DB.get("platform", {})
    return str(cfg.get(name) or os.getenv(name.upper()) or default)


def app_domain() -> str:
    return platform_value("app_domain", "studentkare.co")


def brand_name() -> str:
    return platform_value("brand_name", "StudentKare")


class LiveSetting:
    """A string that resolves to the live platform value inside f-strings."""

    def __init__(self, name: str, default: str = ""):
        self._name = name
        self._default = default

    def __str__(self) -> str:
        return platform_value(self._name, self._default)

    def __format__(self, spec: str) -> str:
        return format(str(self), spec)

    def upper(self):
        return str(self).upper()


def load_from_db():
    """Load persisted config from the database, merging over env-var defaults."""
    global _loaded_from_db
    if _loaded_from_db:
        return
    try:
        from sqlalchemy import select

        from core.workflow_models import SystemSetting
        from services.db_sql import SessionLocal
        with SessionLocal() as db:
            for provider in list(INTEGRATIONS_DB.keys()):
                row = db.scalar(select(SystemSetting).where(SystemSetting.key == f"integration:{provider}"))
                if row and isinstance(row.value, dict) and row.value:
                    INTEGRATIONS_DB[provider].update(row.value)
        _loaded_from_db = True
        print("[CONFIG] Loaded integrations from database", flush=True)
    except Exception as e:
        print(f"[CONFIG] Could not load from database: {e}", flush=True)
        _loaded_from_db = True


def save_to_db(provider: str):
    """Persist a provider's config to the database."""
    try:
        from core.workflow_models import SystemSetting
        from services.db_sql import SessionLocal
        with SessionLocal() as db:
            key = f"integration:{provider}"
            row = db.scalar(select(SystemSetting).where(SystemSetting.key == key))
            if row is None:
                row = SystemSetting(key=key, value=INTEGRATIONS_DB.get(provider, {}), updated_at=time.time())
                db.add(row)
            else:
                row.value = INTEGRATIONS_DB.get(provider, {})
                row.updated_at = time.time()
            db.commit()
    except Exception as e:
        print(f"[CONFIG] Could not persist {provider} to database: {e}", flush=True)


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
        "platform": {
            "appDomain": app_domain(),
            "brandName": brand_name(),
            "supportEmail": INTEGRATIONS_DB["platform"].get("support_email", f"support@{app_domain()}"),
            "companyAddress": INTEGRATIONS_DB["platform"].get("company_address", ""),
            "copyrightText": INTEGRATIONS_DB["platform"].get("copyright_text", ""),
            "supportPhone": INTEGRATIONS_DB["platform"].get("support_phone", ""),
            "logoUrl": INTEGRATIONS_DB["platform"].get("logo_url", ""),
            "faviconUrl": INTEGRATIONS_DB["platform"].get("favicon_url", ""),
        },
        "rtc": {
            "signallingUrl": os.getenv("RTC_SIGNALLING_URL", ""),
            "iceServers": os.getenv("RTC_ICE_SERVERS", ""),
        },
    }
