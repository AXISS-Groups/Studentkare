"""
Unit tests for the 3 Certificate AI Agents:
  1. AI Citation Drafter & Personalizer Agent
  2. AI Authenticity & Tamper Detection Agent
  3. AI Skill Extractor & Profile Badge Sync Agent
"""
import pytest
from services.agents.certificate_ai_agent import (
    certificate_ai_agent,
    CitationDraftRequest,
    TamperAnalysisRequest,
    SkillExtractionRequest,
)

@pytest.mark.anyio
async def test_ai_citation_drafter_agent():
    req = CitationDraftRequest(
        recipient_name="Sethu Rohith",
        role="Lead Campus Ambassador",
        event_or_programme="ECHO 2026 × HackWave 3.0",
        institution="VNR VJIET",
        key_achievements="Organized 1200+ student hackathon participants"
    )
    res = await certificate_ai_agent.draft_citation(req)
    assert "leadership" in res.citation.lower()
    assert "ECHO 2026" in res.citation
    assert "Award of Excellence" in res.suggested_honor
    assert len(res.key_competencies) >= 2
    assert res.confidence_score >= 0.9

@pytest.mark.anyio
async def test_ai_tamper_detection_agent():
    req = TamperAnalysisRequest(
        certificate_id="SA-AMB-2026-0001",
        recipient_name="Sri Valli",
        issue_date="10 August 2026",
        issuer="StudentAlumni.ai"
    )
    res = await certificate_ai_agent.detect_tamper(req)
    assert res.authenticity_status == "VERIFIED_AUTHENTIC"
    assert res.trust_score >= 95.0
    assert len(res.checks) == 3
    assert len(res.risk_flags) == 0

@pytest.mark.anyio
async def test_ai_skill_extractor_badge_sync_agent():
    req = SkillExtractionRequest(
        certificate_title="Certificate of Project Completion",
        citation_text="designed, built and delivered full stack React and FastAPI web applications.",
        recipient_email="student01@test.com"
    )
    res = await certificate_ai_agent.extract_skills_and_sync_badges(req)
    assert len(res.skills) >= 1
    assert any("Engineering" in s.name for s in res.skills)
    assert len(res.badges_awarded) >= 1
