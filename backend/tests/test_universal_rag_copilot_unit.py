"""
Unit tests for the 4 Universal AI Pillars:
  1. Universal RAG Engine
  2. Student AI Resume ATS Matcher
  3. AI Technical Mock Interviewer
  4. Super Admin LLM & RAG Observability Telemetry
"""
import pytest
from services.universal_rag_engine import (
    universal_rag_engine,
    RAGQueryRequest,
)
from services.agents.career_copilot_agent import (
    career_copilot_agent,
    ATSScoreRequest,
    MockInterviewTurnRequest,
)
from services.agents.ai_observability import (
    ai_observability,
)

@pytest.mark.anyio
async def test_universal_rag_query():
    req = RAGQueryRequest(
        query="Who are the alumni mentors working at top tech firms?",
        target_domains=["alumni", "jobs", "campus"],
        user_role="student"
    )
    res = await universal_rag_engine.query_knowledge_fabric(req)
    assert len(res.citations) >= 1
    assert "mentor" in res.answer.lower() or "alumni" in res.answer.lower()
    assert res.confidence >= 0.9

@pytest.mark.anyio
async def test_career_copilot_ats_scoring():
    req = ATSScoreRequest(
        resume_text="Experienced in Python, FastAPI, React, Docker, and REST APIs. Built scalable web applications.",
        target_role="Senior Full Stack Engineer"
    )
    res = await career_copilot_agent.analyze_ats_resume(req)
    assert res.overall_match_score >= 50
    assert "Fastapi" in res.matched_skills or "Python" in res.matched_skills
    assert len(res.suggested_bullet_points) >= 2

@pytest.mark.anyio
async def test_career_copilot_mock_interview():
    req = MockInterviewTurnRequest(
        role="Full Stack Developer",
        difficulty="Mid",
        turn_index=1,
        student_response="I architected a distributed FastAPI service with MongoDB connection pooling and Redis cache."
    )
    res = await career_copilot_agent.conduct_mock_interview_turn(req)
    assert len(res.next_question) > 20
    assert res.score_for_turn is not None
    assert res.is_final_turn is False

@pytest.mark.anyio
def test_ai_observability_telemetry():
    res = ai_observability.get_system_telemetry()
    assert res.total_requests_24h > 0
    assert res.total_tokens_24h > 0
    assert len(res.models) >= 3
    assert len(res.vector_collections) >= 4
    assert res.agent_health_score >= 99.0
