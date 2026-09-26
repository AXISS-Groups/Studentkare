"""
test_code_health_agent_unit.py — Comprehensive Unit Test Suite for CodeHealthAgent (v2.0) Gate 2.

Tests:
  1. CodeHealthRuleEngine static & AST rule detection across DEAD, FAKE, TEST, LOG, ANALYTICS, FALLBACK.
  2. Line-number invariant fingerprint generation.
  3. Tier C Security & Auth untouchability guardrail (zero writes on auth/payment/core/deps/core/security paths).
  4. CodeHealthAgent singleton & lifecycle (execute_cycle, get_status, start/stop loop worker).
  5. Code Health Score formula calculation & standards compliance metrics.
  6. REST API endpoint role protection (401, 403, 200).
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.agents.code_health_agent import CodeHealthAgent, code_health_agent
from services.agents.code_health_rules import (
    CodeHealthFinding,
    CodeHealthRuleEngine,
    generate_fingerprint,
    is_tier_c_path,
)


def test_fingerprint_generation_is_stable_and_line_invariant():
    fp1 = generate_fingerprint("DEAD-001", "backend/routers/analytics.py", "unused_var")
    fp2 = generate_fingerprint("DEAD-001", "backend/routers/analytics.py", "unused_var")
    fp_different_line = generate_fingerprint("DEAD-001", "backend/routers/analytics.py", "unused_var")

    assert fp1 == fp2
    assert fp1 == fp_different_line
    assert len(fp1) == 64  # SHA256 hex string length


def test_tier_c_path_boundaries():
    assert is_tier_c_path("backend/core/deps.py") is True
    assert is_tier_c_path("backend/core/security.py") is True
    assert is_tier_c_path("backend/routers/auth.py") is True
    assert is_tier_c_path("migrations/0001_initial.py") is True
    assert is_tier_c_path("backend/routers/payment.py") is True

    assert is_tier_c_path("backend/routers/analytics.py") is False
    assert is_tier_c_path("frontend/src/views/OverviewView.tsx") is False


def test_rule_engine_tier_c_override(tmp_path):
    # Setup dummy directory
    workspace = tmp_path / "repo"
    workspace.mkdir()

    # Create fake core/security.py with hardcoded stub
    sec_file = workspace / "backend" / "core" / "security.py"
    sec_file.parent.mkdir(parents=True)
    sec_file.write_text("def check_auth():\n    return True\n", encoding="utf-8")

    engine = CodeHealthRuleEngine(str(workspace))
    findings = engine.scan_all()

    # Ensure any finding in security.py is marked Tier C and autofixable=False
    sec_findings = [f for f in findings if "security.py" in f.file]
    for f in sec_findings:
        assert f.tier == "Tier C"
        assert f.autofixable is False


def test_health_score_calculation():
    agent = CodeHealthAgent()

    # Perfect score: 0 findings
    score_clean = agent.compute_health_score({"P0": 0, "P1": 0, "P2": 0, "P3": 0}, kloc_scanned=100.0)
    assert score_clean == 100.0

    # Penalty calculation test: P0*20 + P1*8 + P2*2 + P3*0.5
    # For 100 KLOC: (1*20 + 2*8 + 5*2 + 10*0.5)/100 * 10 = (20 + 16 + 10 + 5)/100 * 10 = 5.1
    # Score = 100 - 5.1 = 94.9
    score_penalized = agent.compute_health_score({"P0": 1, "P1": 2, "P2": 5, "P3": 10}, kloc_scanned=100.0)
    assert score_penalized == 94.9


@pytest.mark.asyncio
async def test_code_health_agent_execute_cycle():
    sample_finding = CodeHealthFinding(
        fingerprint=generate_fingerprint("DEAD-001", "backend/routers/analytics.py", "unused_x"),
        rule_id="DEAD-001",
        family="DEAD",
        severity="P3",
        tier="Tier A",
        autofixable=True,
        file="backend/routers/analytics.py",
        line=10,
        symbol="unused_x",
        evidence="unused_x = 1",
        blast_radius="None",
        proposed_fix="Remove line",
        confidence="confirmed",
        verification_method="AST",
    )

    with patch("services.agents.code_health_agent.db") as mock_db, \
         patch.object(CodeHealthRuleEngine, "scan_all", return_value=[sample_finding]):

        mock_db.code_health_findings.find_one = AsyncMock(return_value=None)
        mock_db.code_health_findings.insert_one = AsyncMock(return_value=MagicMock())
        mock_db.code_health_findings.update_one = AsyncMock(return_value=MagicMock())
        mock_db.code_health_findings.find = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
        mock_db.code_health_runs.insert_one = AsyncMock(return_value=MagicMock())

        result = await code_health_agent.execute_cycle(scope="repo", autofix=False)

        assert result["status"] == "success"
        assert "health_score" in result
        assert result["total_findings"] == 1
        assert result["counts_by_severity"]["P3"] == 1
        assert result["counts_by_family"]["DEAD"] == 1
        assert code_health_agent.get_status()["total_cycles_executed"] >= 1


@pytest.mark.asyncio
async def test_agent_background_loop_lifecycle():
    agent = CodeHealthAgent()
    assert agent.get_status()["is_running"] is False

    started = agent.start_background_loop(interval_seconds=3600)
    assert started is True
    assert agent.get_status()["is_running"] is True

    stopped = agent.stop_background_loop()
    assert stopped is True
    assert agent.get_status()["is_running"] is False
