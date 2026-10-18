"""The one meaning of APP_ENV (audit ENV-01).

Only an explicit "development" or "testing" (any case, surrounding spaces
ignored) is a non-production environment. Anything else — unset, misspelt,
"prod", "staging" — is production: the secret guard runs, migrations apply,
cookies are Secure, no dev delivery channels or demo accounts exist.

Before this module the codebase had two answers. Auth, demo and 2FA code read
unset as production, while app/main.py, the session cookie and the OTP channel
list read unset as development, so a deploy that forgot APP_ENV skipped
migrations and the production guard and issued non-Secure cookies.
"""
from __future__ import annotations

import os

DEVELOPMENT = "development"
TESTING = "testing"
PRODUCTION = "production"


def app_env() -> str:
    """'development', 'testing' or 'production'. Unset or unknown is production."""
    raw = os.getenv("APP_ENV", "").strip().lower()
    return raw if raw in (DEVELOPMENT, TESTING) else PRODUCTION


def is_dev_or_test() -> bool:
    return app_env() != PRODUCTION


def is_production() -> bool:
    return app_env() == PRODUCTION


def is_testing() -> bool:
    return app_env() == TESTING
