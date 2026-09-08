"""
services.agents.code_health_agent — CodeHealthAgent (v2.0) Gate 2.

Singleton agent that runs a code-health scan cycle over a workspace, computes a
health score, and persists findings/runs to MongoDB.  Also exposes a background
loop lifecycle (start/stop).
"""
from __future__ import annotations

import asyncio
from typing import Dict, Optional

from .code_health_rules import CodeHealthRuleEngine, CodeHealthFinding

# Module-global DB handle (patched in unit tests). In production set via `set_db`.
db = None  # type: ignore


def set_db(handle) -> None:
    global db
    db = handle


class CodeHealthAgent:
    def __init__(self) -> None:
        self._total_cycles = 0
        self._is_running = False
        self._loop_task: Optional[asyncio.Task] = None

    def compute_health_score(self, counts: Dict[str, int], kloc_scanned: float) -> float:
        p0 = counts.get("P0", 0)
        p1 = counts.get("P1", 0)
        p2 = counts.get("P2", 0)
        p3 = counts.get("P3", 0)
        penalty = (p0 * 20 + p1 * 8 + p2 * 2 + p3 * 0.5) / kloc_scanned * 10
        score = 100.0 - penalty
        return round(max(0.0, score), 1)

    def get_status(self) -> Dict:
        return {
            "agent_name": "CodeHealthAgent",
            "is_running": self._is_running,
            "total_cycles_executed": self._total_cycles,
        }

    async def execute_cycle(self, scope: str = "repo", autofix: bool = False) -> Dict:
        engine = CodeHealthRuleEngine(scope)
        findings = engine.scan_all()

        counts_by_severity: Dict[str, int] = {}
        counts_by_family: Dict[str, int] = {}
        for f in findings:
            counts_by_severity[f.severity] = counts_by_severity.get(f.severity, 0) + 1
            counts_by_family[f.family] = counts_by_family.get(f.family, 0) + 1

        kloc_scanned = max(len(findings), 1) / 10.0
        if kloc_scanned == 0:
            kloc_scanned = 1.0
        health_score = self.compute_health_score(counts_by_severity, kloc_scanned)

        # Persist to DB when available
        if db is not None:
            for f in findings:
                existing = await db.code_health_findings.find_one({"fingerprint": f.fingerprint})
                if existing:
                    await db.code_health_findings.update_one(
                        {"fingerprint": f.fingerprint}, {"$set": f.__dict__}
                    )
                else:
                    await db.code_health_findings.insert_one(f.__dict__)
            await db.code_health_runs.insert_one(
                {
                    "scope": scope,
                    "autofix": autofix,
                    "health_score": health_score,
                    "total_findings": len(findings),
                    "counts_by_severity": counts_by_severity,
                    "counts_by_family": counts_by_family,
                    "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat() + "Z",
                }
            )

        self._total_cycles += 1
        return {
            "status": "success",
            "health_score": health_score,
            "total_findings": len(findings),
            "counts_by_severity": counts_by_severity,
            "counts_by_family": counts_by_family,
        }

    def start_background_loop(self, interval_seconds: int = 3600) -> bool:
        if self._is_running:
            return False
        self._is_running = True
        return True

    def stop_background_loop(self) -> bool:
        if not self._is_running:
            return False
        self._is_running = False
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None
        return True


code_health_agent = CodeHealthAgent()
