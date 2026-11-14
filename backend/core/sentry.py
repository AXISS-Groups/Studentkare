"""Optional crash reporting: only closed-schema operational metadata can leave."""
from __future__ import annotations

import logging
import os

from core.app_env import app_env

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    from core.sentry_privacy import PrivacyTransport, scrub_event
except ImportError:
    sentry_sdk = None

logger = logging.getLogger("core.sentry")
SENTRY_DSN = os.getenv("SENTRY_DSN")
APP_ENV = app_env()


def _before_send(event: object, hint: object = None) -> dict[str, object] | None:
    if sentry_sdk is None:
        return None
    return scrub_event(event, hint)


def _before_send_transaction(event: object, hint: object = None) -> None:
    # Detailed tracing has no approved metadata schema. It is denied independently.
    return None


def init_sentry() -> bool:
    if not SENTRY_DSN or sentry_sdk is None:
        logger.info("Sentry disabled")
        return False
    try:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=APP_ENV,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                LoggingIntegration(level=None, event_level=logging.ERROR),
            ],
            transport=PrivacyTransport,
            before_send=_before_send,
            before_send_transaction=_before_send_transaction,
            traces_sample_rate=0,
            profiles_sample_rate=0,
            auto_session_tracking=False,
            send_client_reports=False,
            send_default_pii=False,
            attach_stacktrace=False,
            max_breadcrumbs=0,
        )
        logger.info("Sentry initialized with restricted crash metadata")
        return True
    except Exception:
        logger.error("Sentry initialization failed")
        return False
