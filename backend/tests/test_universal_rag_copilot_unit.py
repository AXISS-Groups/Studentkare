"""
Unit tests for the Universal RAG Engine.
"""
import pytest

from services.universal_rag_engine import (
    RAGQueryRequest,
    universal_rag_engine,
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
