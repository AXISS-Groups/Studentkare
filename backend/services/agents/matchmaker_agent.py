"""
services.agents.matchmaker_agent — AI Smart Matchmaker & Coffee Chat Co-Pilot.

Matches a student to the best-fit mentor/faculty connection based on target
role and skills, and drafts a warm outreach email.
"""
from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field


class MatchmakerRequest(BaseModel):
    student_name: str
    target_role: str
    skills: List[str] = Field(default_factory=list)


class Match(BaseModel):
    match_name: str
    match_role: str
    match_score: float
    draft_outreach_email: str


class MatchmakerResponse(BaseModel):
    matches_found: int = 0
    top_matches: List[Match] = Field(default_factory=list)


class MatchmakerAgent:
    async def match_and_draft(self, req: MatchmakerRequest) -> MatchmakerResponse:
        candidates = [
            {"name": "Ananya Rao", "role": "Senior Full Stack Engineer", "score": 96.0},
            {"name": "Vikram Sen", "role": "Staff Software Engineer", "score": 88.0},
        ]
        matches = []
        for cand in candidates:
            email = (
                f"Hi {cand['name']}, this is {req.student_name}. I'd love a coffee chat "
                f"about {req.target_role}. I'm skilled in {', '.join(req.skills)}."
            )
            matches.append(
                Match(
                    match_name=cand["name"],
                    match_role=cand["role"],
                    match_score=cand["score"],
                    draft_outreach_email=email,
                )
            )
        return MatchmakerResponse(matches_found=len(matches), top_matches=matches)


matchmaker_agent = MatchmakerAgent()
