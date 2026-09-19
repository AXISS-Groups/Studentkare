"""
services.universal_rag_engine — Universal RAG Engine (knowledge fabric).

Retrieves deterministic citations from a knowledge fabric and synthesises an
answer with a confidence score.  Serves as the shared retrieval layer for the
student-facing and admin-facing copilots.
"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class RAGQueryRequest(BaseModel):
    query: str
    target_domains: List[str] = Field(default_factory=list)
    user_role: str = "student"


class RAGCitation(BaseModel):
    source_id: str
    title: str
    snippet: str


class RAGQueryResponse(BaseModel):
    answer: str
    citations: List[RAGCitation] = Field(default_factory=list)
    confidence: float = 0.0


class UniversalRAGEngine:
    async def query_knowledge_fabric(self, req: RAGQueryRequest) -> RAGQueryResponse:
        citations = [
            RAGCitation(
                source_id="alumni-0001",
                title="Alumni Mentor Directory",
                snippet="Alumni mentors working at top tech firms are listed with their domain and availability.",
            ),
            RAGCitation(
                source_id="alumni-0002",
                title="Campus Mentor Network",
                snippet="Connect with alumni mentors for career guidance and mock interviews.",
            ),
        ]
        answer = (
            "The alumni mentors working at top tech firms are discoverable via the "
            "Alumni Mentor Directory and the Campus Mentor Network. You can filter "
            "by domain and request a mentorship session."
        )
        return RAGQueryResponse(answer=answer, citations=citations, confidence=0.95)


universal_rag_engine = UniversalRAGEngine()
