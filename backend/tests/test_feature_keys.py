"""Startup report of fail-closed features that are off for want of a key (audit TD-40).

Each feature already refuses to run without its key; these tests pin that the
report asks the feature's own check, names keys but never values, and raises one
CRITICAL ops-feed alert in production only.
"""
import time

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from core.workflow_models import Base
from services.feature_keys import (
    FEATURE_KEYS_ALERT_KIND,
    disabled_features,
    report_disabled_features,
)

KEYS = ("TWO_FACTOR_ENCRYPTION_KEY", "PASS_SIGNING_SECRET", "DPDP_ARCHIVE_KEY",
        "DPDP_ARCHIVE_RETENTION_DAYS", "INTEGRATIONS_ENCRYPTION_KEY")


def _session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def _clear(monkeypatch):
    for key in KEYS:
        monkeypatch.delenv(key, raising=False)


def _all_keys(monkeypatch):
    monkeypatch.setenv("TWO_FACTOR_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("PASS_SIGNING_SECRET", "p" * 64)
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("DPDP_ARCHIVE_RETENTION_DAYS", "30")
    monkeypatch.setenv("INTEGRATIONS_ENCRYPTION_KEY", Fernet.generate_key().decode())


def test_production_without_keys_reports_every_feature(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    assert set(disabled_features()) == {"two_factor", "check_in_pass", "dpdp_erasure", "integration_vault"}


def test_all_keys_present_reports_nothing(monkeypatch):
    _all_keys(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    assert disabled_features() == {}


def test_an_invalid_fernet_key_counts_as_disabled(monkeypatch):
    _all_keys(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("TWO_FACTOR_ENCRYPTION_KEY", "not-a-fernet-key")
    assert set(disabled_features()) == {"two_factor"}


def test_development_fallbacks_are_not_reported(monkeypatch):
    # 2FA and passes have explicit dev/test fallbacks; erasure and the vault do not.
    _clear(monkeypatch)
    monkeypatch.setenv("APP_ENV", "development")
    assert set(disabled_features()) == {"dpdp_erasure", "integration_vault"}


def test_report_names_keys_never_values(monkeypatch):
    _all_keys(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    secret = "not-a-fernet-key-but-a-secret-value"
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", secret)
    reasons = " ".join(disabled_features().values())
    assert "DPDP_ARCHIVE_KEY" in reasons and secret not in reasons


def test_production_alert_is_raised_once_until_acknowledged(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    db = _session()
    report_disabled_features(db)
    report_disabled_features(db)
    events = db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == FEATURE_KEYS_ALERT_KIND)).all()
    assert len(events) == 1 and events[0].severity == "CRITICAL" and events[0].domain == "ACCOUNT"
    assert "TWO_FACTOR_ENCRYPTION_KEY" in events[0].summary
    events[0].acknowledged_at = time.time()
    db.commit()
    report_disabled_features(db)
    assert len(db.scalars(select(M.OpsEvent).where(M.OpsEvent.kind == FEATURE_KEYS_ALERT_KIND)).all()) == 2


def test_no_alert_outside_production(monkeypatch):
    _clear(monkeypatch)
    monkeypatch.setenv("APP_ENV", "testing")
    db = _session()
    assert report_disabled_features(db)
    assert db.scalar(select(M.OpsEvent).where(M.OpsEvent.kind == FEATURE_KEYS_ALERT_KIND)) is None
