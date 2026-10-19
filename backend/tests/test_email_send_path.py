"""The outbound email path (core.email): no MongoDB, no addresses in logs.

Audit TD-48: provider settings and a bounce-suppression lookup used to be read
from MongoDB, which no deployment runs. With Postal unconfigured, the SendGrid
fallback crashed on the missing client, so the welcome email failed silently.
Audit TD-15: every send attempt printed the recipient's address.
"""
import asyncio
import logging

import pytest

from core import email as core_email
from core import email_quality


@pytest.fixture(autouse=True)
def _offline_quality_list(monkeypatch):
    async def no_refresh(force=False):
        return None
    monkeypatch.setattr(email_quality, "_refresh_list", no_refresh)
    for key in ("POSTAL_API_URL", "POSTAL_SERVER_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    for provider in ("postal", "gmail", "sendgrid"):
        monkeypatch.setitem(core_email.INTEGRATIONS_DB, provider, {})


def test_no_provider_returns_false_without_raising(caplog):
    caplog.set_level(logging.WARNING, logger="core.email")
    assert asyncio.run(core_email.send_email("priya.n@college.example.in", "Welcome", "<p>Hi</p>")) is False
    assert "no email provider configured" in caplog.text


def test_logs_never_contain_the_recipient_address(caplog):
    caplog.set_level(logging.INFO, logger="core.email")
    asyncio.run(core_email.send_email("priya.n@college.example.in", "Welcome", "<p>Hi</p>"))
    assert "priya.n@college.example.in" not in caplog.text
    assert "p•••@college.example.in" in caplog.text


def test_quality_gate_blocks_disposable_and_placeholder_addresses():
    assert asyncio.run(email_quality.allow_send("someone@mailinator.com"))[0] is False
    assert asyncio.run(email_quality.allow_send("test@gmail.com"))[0] is False
    assert asyncio.run(email_quality.allow_send("priya.n@college.example.in")) == (True, "")


def test_saved_sendgrid_settings_are_used_when_postal_is_absent(monkeypatch):
    monkeypatch.setitem(core_email.INTEGRATIONS_DB, "sendgrid", {"enabled": True, "api_key": "SG.test"})
    sent = {}

    async def fake_sendgrid(config, to_email, subject, body_html, attachments=None):
        sent["to"] = to_email
        return True

    monkeypatch.setattr(core_email, "_send_via_sendgrid", fake_sendgrid)
    assert asyncio.run(core_email.send_email("priya.n@college.example.in", "Welcome", "<p>Hi</p>")) is True
    assert sent["to"] == "priya.n@college.example.in"


def test_masking():
    assert core_email._masked("priya@college.edu") == "p•••@college.edu"
    assert core_email._masked("not-an-address") == "•••"
