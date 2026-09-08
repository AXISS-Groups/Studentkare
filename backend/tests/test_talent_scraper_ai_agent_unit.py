"""
Unit tests for the Talent Scraper AI Agent suite:
  1. AI Talent Web Scraper (GitHub / LinkedIn / Resume parser)
  2. AI Skill Extractor & Seniority Evaluator
  3. Batch Sourcing Concurrent Execution
"""
import pytest
from services.agents.talent_scraper_ai_agent import (
    talent_scraper_ai_agent,
    ScrapeProfileRequest,
    BatchScrapeRequest,
)

@pytest.mark.anyio
async def test_ai_talent_scraper_github():
    req = ScrapeProfileRequest(
        url_or_text="https://github.com/torvalds",
        save_to_db=False
    )
    res = await talent_scraper_ai_agent.scrape_and_enrich_candidate(req)
    assert res.success is True
    assert res.candidate.full_name == "Torvalds"
    assert "github.com/torvalds" in (res.candidate.github_url or "")
    assert len(res.candidate.skills) >= 3
    assert res.candidate.seniority in ["Mid", "Senior", "Lead"]

@pytest.mark.anyio
async def test_ai_talent_scraper_linkedin():
    req = ScrapeProfileRequest(
        url_or_text="https://linkedin.com/in/sundarpichai",
        save_to_db=False
    )
    res = await talent_scraper_ai_agent.scrape_and_enrich_candidate(req)
    assert res.success is True
    assert res.candidate.full_name == "Sundarpichai"
    assert "linkedin.com/in/sundarpichai" in (res.candidate.linkedin_url or "")
    assert res.candidate.experience_years >= 4.0

@pytest.mark.anyio
async def test_ai_batch_source_candidates():
    req = BatchScrapeRequest(
        urls=[
            "https://github.com/octocat",
            "https://github.com/developer01",
            "https://linkedin.com/in/sarah-connor"
        ],
        save_to_db=False
    )
    res = await talent_scraper_ai_agent.batch_source_candidates(req)
    assert res.total_processed == 3
    assert res.successful_imports == 3
    assert len(res.candidates) == 3
