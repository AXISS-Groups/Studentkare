"""
Unit tests for the Newsletter AI Agent:
  - Real-time data synthesis
  - Subject line A/B variants
  - Multi-channel copy (Email, Push, WhatsApp)
  - Deliverability & Spam score audit
"""
import pytest
from services.agents.newsletter_ai_agent import (
    newsletter_ai_agent,
    NewsletterDraftRequest,
)

@pytest.mark.anyio
async def test_ai_newsletter_drafter():
    req = NewsletterDraftRequest(
        audience="all",
        edition_theme="Weekly Career & ECHO 2026 Digest",
        tone="engaging"
    )
    res = await newsletter_ai_agent.draft_live_newsletter(req)
    assert res.draft_id.startswith("nl-")
    assert len(res.subject_variants) >= 2
    assert "Student Alumni" in res.intro or "Platform" in res.intro
    assert "ECHO 2026" in res.body_html
    assert len(res.multi_channel.whatsapp_text) > 20
    assert res.deliverability.spam_score <= 2.0
    assert res.deliverability.spam_risk_level == "LOW"
