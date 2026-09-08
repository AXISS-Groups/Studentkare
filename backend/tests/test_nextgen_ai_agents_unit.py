"""
Unit tests for the 5 Next-Generation Platform AI Agents:
  1. AI Voice & Speech Coach Agent
  2. AI Hackathon Project Auto-Grader Agent
  3. AI Smart Matchmaker & Coffee Chat Co-Pilot
  4. AI Campus Ambassador Marketing Kit Generator
  5. AI College Accreditation & NIRF / NAAC Report Builder
"""
import pytest
from services.agents.voice_coach_agent import (
    voice_coach_agent,
    VoiceCoachingRequest,
)
from services.agents.hackathon_grader_agent import (
    hackathon_grader_agent,
    HackathonSubmissionGradeRequest,
)
from services.agents.matchmaker_agent import (
    matchmaker_agent,
    MatchmakerRequest,
)
from services.agents.ambassador_kit_agent import (
    ambassador_kit_agent,
    AmbassadorKitRequest,
)
from services.agents.accreditation_agent import (
    accreditation_agent,
    AccreditationReportRequest,
)

@pytest.mark.anyio
async def test_voice_coach_agent():
    req = VoiceCoachingRequest(
        transcript_text="Um, hello everyone. I basically built a distributed microservice using FastAPI and React, you know, to reduce latency.",
        audio_duration_seconds=15.0
    )
    res = await voice_coach_agent.analyze_speech(req)
    assert res.words_per_minute > 50
    assert res.filler_word_count >= 2
    assert "um" in res.detected_fillers or "basically" in res.detected_fillers
    assert len(res.coaching_tips) >= 1

@pytest.mark.anyio
async def test_hackathon_grader_agent():
    req = HackathonSubmissionGradeRequest(
        project_title="StudentAlumni Autonomous Copilot",
        github_url="https://github.com/studentalumni/copilot",
        track="AI & Distributed Systems"
    )
    res = await hackathon_grader_agent.evaluate_project(req)
    assert res.total_score >= 80
    assert res.security_audit_passed is True
    assert len(res.rubric_breakdown) == 4
    assert len(res.detected_tech_stack) >= 4

@pytest.mark.anyio
async def test_matchmaker_agent():
    req = MatchmakerRequest(
        student_name="Rahul V",
        target_role="Senior Full Stack Engineer",
        skills=["Python", "FastAPI", "React"]
    )
    res = await matchmaker_agent.match_and_draft(req)
    assert res.matches_found >= 1
    assert res.top_matches[0].match_score >= 90
    assert "Rahul V" in res.top_matches[0].draft_outreach_email

@pytest.mark.anyio
async def test_ambassador_kit_agent():
    req = AmbassadorKitRequest(
        ambassador_name="Aditya Verma",
        college_name="National Institute of Technology",
        ambassador_code="NIT-AMB-2026"
    )
    res = await ambassador_kit_agent.generate_toolkit(req)
    assert "NIT-AMB-2026" in res.referral_url
    assert len(res.posts) == 3
    assert len(res.talking_points) >= 2

@pytest.mark.anyio
async def test_accreditation_agent():
    req = AccreditationReportRequest(
        college_name="National Institute of Technology",
        academic_year="2025-2026"
    )
    res = await accreditation_agent.generate_dossier(req)
    assert res.total_students_engaged > 500
    assert res.compliance_score_percent >= 95.0
    assert len(res.key_metrics) == 4
    assert "NAAC" in res.naac_criterion_5_statement
