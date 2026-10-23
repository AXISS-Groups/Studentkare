"""Which fail-closed features are switched off for want of a key (audit TD-40).

Two-step sign-in, check-in passes, DPDP erasure and the integration-secret vault
each refuse to run without their own key, which is correct. What was missing is
anyone finding out: a deploy without the keys booted "healthy" while super admins
and counsellors were held at 2FA setup and erasures sat paused.

This module only reports. It asks each feature's own check (so the answer cannot
drift from what the feature actually does), logs one line per disabled feature at
startup, and in production raises one CRITICAL ops-feed event until someone
acknowledges it. It names keys, never their values.
"""
from __future__ import annotations

import logging
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

FEATURE_KEYS_ALERT_KIND = "FEATURE_KEYS_MISSING"


def _two_factor() -> str:
    from services import twofa_store
    try:
        if twofa_store._fernet() is not None:
            return ""
    except (ValueError, TypeError):
        return "TWO_FACTOR_ENCRYPTION_KEY is not a valid Fernet key."
    if twofa_store._dev_or_test():
        return ""
    return "TWO_FACTOR_ENCRYPTION_KEY is not set; enforced roles cannot finish 2FA setup."


def _check_in_pass() -> str:
    from services.check_in_pass import PassSigningUnavailable, _key
    try:
        _key()
        return ""
    except PassSigningUnavailable:
        return "PASS_SIGNING_SECRET is not set; check-in passes cannot be issued."


def _dpdp_erasure() -> str:
    from services.erasure import erasure_blocker
    return erasure_blocker()


def _integration_vault() -> str:
    from services import integration_secret_vault
    if integration_secret_vault._fernet() is not None:
        return ""
    return "INTEGRATIONS_ENCRYPTION_KEY is not set to a valid Fernet key; provider secrets are not sealed."


CHECKS = {
    "two_factor": _two_factor,
    "check_in_pass": _check_in_pass,
    "dpdp_erasure": _dpdp_erasure,
    "integration_vault": _integration_vault,
}


def disabled_features() -> dict[str, str]:
    """Feature name -> why it is off. Empty when every feature has its key."""
    out: dict[str, str] = {}
    for name, check in CHECKS.items():
        try:
            reason = check()
        except Exception as e:  # noqa: BLE001 — a check that cannot answer counts as disabled
            reason = f"could not be checked ({type(e).__name__})"
        if reason:
            out[name] = reason
    return out


def _is_production() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() == "production"


def report_disabled_features(db: Session) -> dict[str, str]:
    """Log every disabled feature; in production, raise one open CRITICAL alert."""
    from core import workflow_models as M
    from services import ops_feed

    disabled = disabled_features()
    for name, reason in disabled.items():
        logger.error("[FEATURES] %s disabled: %s", name, reason)
    if not disabled or not _is_production():
        return disabled
    open_alert = db.scalar(select(M.OpsEvent.id).where(M.OpsEvent.kind == FEATURE_KEYS_ALERT_KIND,
                                                       M.OpsEvent.acknowledged_at == 0).limit(1))
    if open_alert is None:
        ops_feed.publish(db, FEATURE_KEYS_ALERT_KIND, "ACCOUNT", severity="CRITICAL",
                         summary=("Features disabled for a missing key: " + "; ".join(disabled.values()))[:300],
                         resource_type="feature_keys")
        db.commit()
    return disabled
