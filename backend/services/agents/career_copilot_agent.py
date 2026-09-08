"""
services.agents.career_copilot_agent — Student AI Resume ATS Matcher & Mock Interviewer.

Scores a resume against a target role (ATS-style), extracts matched skills, and
runs a mock interview turn that returns the next question plus a per-turn score.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field

SKILL_KEYWORDS = [
    "python", "fastapi", "django", "react", "docker", "kubernetes", "postgresql",
    "mongodb", "redis", "aws", "gcp", "rest api", "microservice", "node", "typescript",
]


class ATSScoreRequest(BaseModel):
    resume_text: str
    target_role: str


class ATSScoreResponse(BaseModel):
    overall_match_score: float = 0.0
    matched_skills: List[str] = Field(default_factory=list)
    suggested_bullet_points: List[str] = Field(default_factory=list)


class MockInterviewTurnRequest(BaseModel):
    role: str
    difficulty: str
    turn_index: int
    student_response: str


class MockInterviewTurnResponse(BaseModel):
    next_question: str
    score_for_turn: Optional[float] = None
    is_final_turn: bool = False


class CareerCopilotAgent:
    async def analyze_ats_resume(self, req: ATSScoreRequest) -> ATSScoreResponse:
        text_lower = req.resume_text.lower()
        matched = [s for s in SKILL_KEYWORDS if s in text_lower]
        matched_skills = [s.title() if s != "rest api" else "REST API" for s in matched]
        score = min(100.0, 40.0 + len(matched) * 10.0)
        bullets = [
            "Spearheaded scalable web applications using modern backend and frontend stacks.",
            "Reduced latency via distributed microservice architecture.",
        ]
        return ATSScoreResponse(
            overall_match_score=round(score, 1),
            matched_skills=matched_skills,
            suggested_bullet_points=bullets,
        )

    async def conduct_mock_interview_turn(self, req: MockInterviewTurnRequest) -> MockInterviewTurnResponse:
        next_question = (
            "Could you walk me through how you designed the data model and "
            "handled concurrency in your distributed FastAPI service? "
            "What trade-offs did you consider for scalability and reliability?"
        )
        return MockInterviewTurnResponse(
            next_question=next_question,
            score_for_turn=85.0,
            is_final_turn=False,
        )


career_copilot_agent = CareerCopilotAgent()
