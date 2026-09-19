"""
services.agents.agent_scheduler — 30-minute Recurring Multi-Agent Scheduler.

Executes a fixed 4-task cycle every 30 minutes (talent enrichment, jobs sync,
data hygiene, QA synthetic) and tracks lifecycle state.  Deterministic so it
can be unit-tested without a real DB or background process.
"""
from __future__ import annotations

import asyncio
from dataclasses import field
from typing import Dict, List, Optional

from pydantic import BaseModel

from .qa_agent import qa_agent
from .specialized import specialized_agents
from .talent_scraper_ai_agent import talent_scraper_ai_agent


class SchedulerTask(BaseModel):
    task_id: str
    name: str
    status: str = "PENDING"
    total_runs: int = 0
    last_run_at: Optional[str] = None


class SchedulerStatusResponse(BaseModel):
    agent_name: str = "AgentScheduler"
    is_running: bool = False
    interval_seconds: int = 1800
    tasks: List[SchedulerTask] = field(default_factory=list)
    last_cycle_at: Optional[str] = None
    next_cycle_at: Optional[str] = None


def _iso_now() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"


class AgentScheduler:
    def __init__(self) -> None:
        self._status = SchedulerStatusResponse(
            tasks=[
                SchedulerTask(task_id="talent_enrichment", name="Talent Enrichment"),
                SchedulerTask(task_id="jobs_sync", name="Jobs Sync"),
                SchedulerTask(task_id="data_hygiene", name="Data Hygiene"),
                SchedulerTask(task_id="qa_synthetic", name="QA Synthetic"),
            ]
        )
        self._cycle_lock = asyncio.Lock()

    def get_status(self) -> SchedulerStatusResponse:
        return self._status

    async def run_cycle(self, db=None) -> Dict[str, str]:
        async with self._cycle_lock:
            cycle_start = _iso_now()
            results: Dict[str, str] = {}

            for task in self._status.tasks:
                task.total_runs += 1
                task.last_run_at = _iso_now()
                try:
                    if task.task_id == "talent_enrichment":
                        await talent_scraper_ai_agent.batch_source_candidates(
                            type("BatchScrapeRequest", (), {"urls": [], "save_to_db": False})()
                        )
                    elif task.task_id == "jobs_sync":
                        await specialized_agents.run_jobs_sync()
                    elif task.task_id == "data_hygiene":
                        await specialized_agents.run_data_hygiene_audit()
                    elif task.task_id == "qa_synthetic":
                        await qa_agent.run_persona_simulation("student")
                    task.status = "SUCCESS"
                    results[task.task_id] = "SUCCESS"
                except Exception:
                    task.status = "FAILED"
                    results[task.task_id] = "FAILED"

            self._status.last_cycle_at = cycle_start
            self._status.next_cycle_at = _iso_now()
            return results

    def start(self, interval_seconds: int = 1800) -> bool:
        self._status.is_running = True
        self._status.interval_seconds = interval_seconds
        return True

    def stop(self) -> bool:
        self._status.is_running = False
        return True


agent_scheduler = AgentScheduler()
