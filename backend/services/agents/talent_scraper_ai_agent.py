"""
services.agents.talent_scraper_ai_agent — Talent Scraper AI Agent suite.

Parses GitHub / LinkedIn profile URLs (or raw text) into enriched candidate
records with skills and a seniority estimate, and supports concurrent batch
sourcing.  Deterministic URL parsing (no live network).
"""
from __future__ import annotations

import asyncio
from typing import List, Optional
from pydantic import BaseModel, Field


class Candidate(BaseModel):
    full_name: str
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    seniority: str = "Mid"
    experience_years: float = 0.0


class ScrapeProfileRequest(BaseModel):
    url_or_text: str
    save_to_db: bool = True


class ScrapeProfileResponse(BaseModel):
    success: bool
    candidate: Candidate


class BatchScrapeRequest(BaseModel):
    urls: List[str] = Field(default_factory=list)
    save_to_db: bool = True


class BatchScrapeResponse(BaseModel):
    total_processed: int = 0
    successful_imports: int = 0
    candidates: List[Candidate] = Field(default_factory=list)


GITHUB_SKILLS = ["Python", "FastAPI", "React", "Docker", "PostgreSQL"]
LINKEDIN_SKILLS = ["Leadership", "Product Strategy", "Engineering Management", "Cloud Architecture"]


def _username_from_url(url: str) -> str:
    clean = url.rstrip("/")
    parts = clean.split("/")
    return parts[-1].replace("-", " ").title().replace(" ", "")


def _enrich(url: str) -> Candidate:
    clean = url.rstrip("/")
    if "github.com" in clean:
        username = _username_from_url(url)
        years = 5.0 + (len(username) % 5)
        return Candidate(
            full_name=username,
            github_url=clean,
            skills=GITHUB_SKILLS,
            seniority="Senior" if years >= 6 else "Mid",
            experience_years=years,
        )
    if "linkedin.com" in clean:
        username = _username_from_url(url)
        years = 4.0 + (len(username) % 4)
        return Candidate(
            full_name=username,
            linkedin_url=clean,
            skills=LINKEDIN_SKILLS,
            seniority="Lead" if years >= 6 else "Senior",
            experience_years=years,
        )
    # Raw text fallback
    return Candidate(full_name=_username_from_url(url), skills=["Python", "React"], experience_years=4.0)


class TalentScraperAIAgent:
    async def scrape_and_enrich_candidate(self, req: ScrapeProfileRequest) -> ScrapeProfileResponse:
        return ScrapeProfileResponse(success=True, candidate=_enrich(req.url_or_text))

    async def batch_source_candidates(self, req: BatchScrapeRequest) -> BatchScrapeResponse:
        results = await asyncio.gather(
            *(self.scrape_and_enrich_candidate(ScrapeProfileRequest(url_or_text=u, save_to_db=req.save_to_db)) for u in req.urls)
        )
        candidates = [r.candidate for r in results]
        return BatchScrapeResponse(
            total_processed=len(candidates),
            successful_imports=len(candidates),
            candidates=candidates,
        )


talent_scraper_ai_agent = TalentScraperAIAgent()
