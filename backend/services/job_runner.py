"""
services.job_runner — Recurring agent job runner (APScheduler).

Schedules the 30-minute multi-agent cycle and the daily autonomous audit swarm
using APScheduler.  Exposes start/stop/status so the Super Admin Console can
control the automation plane.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional

logger = logging.getLogger("services.job_runner")

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    _HAS_APSCHEDULER = True
except Exception:  # pragma: no cover
    _HAS_APSCHEDULER = False
    AsyncIOScheduler = None  # type: ignore
    IntervalTrigger = None  # type: ignore

from services.agents.agent_scheduler import agent_scheduler
from services.agents.daily_audit_agents import daily_audit_service
from services.agents.code_health_agent import code_health_agent


class JobRunner:
    def __init__(self) -> None:
        self._scheduler: Optional[object] = None
        self._running = False
        self._last_cycle: Dict = {}

    def is_available(self) -> bool:
        return _HAS_APSCHEDULER

    async def _run_agent_cycle(self) -> None:
        try:
            self._last_cycle = await agent_scheduler.run_cycle(db=None)
            await daily_audit_service.run_24hr_dossier(db=None)
        except Exception as exc:  # pragma: no cover
            logger.exception("Agent cycle failed: %s", exc)

    def start(self, interval_seconds: int = 1800) -> Dict:
        if not self.is_available():
            return {"success": False, "reason": "APScheduler not installed"}
        if self._running:
            return {"success": False, "reason": "already running"}
        loop = asyncio.get_event_loop()
        self._scheduler = AsyncIOScheduler()
        self._scheduler.add_job(
            self._run_agent_cycle,
            IntervalTrigger(seconds=interval_seconds),
            id="agent_cycle",
            replace_existing=True,
        )
        self._scheduler.start()
        self._running = True
        return {"success": True, "interval_seconds": interval_seconds}

    def stop(self) -> Dict:
        if self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
        self._running = False
        return {"success": True}

    def get_status(self) -> Dict:
        return {
            "running": self._running,
            "available": self.is_available(),
            "last_cycle": self._last_cycle,
        }


job_runner = JobRunner()
