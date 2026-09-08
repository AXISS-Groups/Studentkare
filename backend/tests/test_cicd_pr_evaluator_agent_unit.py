"""
Unit tests for GitRepoScoutAgent, CICDPREvaluatorAgent & CICDLoopAgent suite.
"""
import pytest
from services.agents.cicd_pr_evaluator_agent import (
    git_repo_scout_agent,
    cicd_pr_evaluator_agent,
    cicd_loop_agent,
    PREvalRequest,
)

@pytest.mark.anyio
async def test_git_repo_scout_agent():
    """Verify GitRepoScoutAgent workflow analysis & health score calculation."""
    report = await git_repo_scout_agent.scout_repository("https://github.com/kktejas07/Student-Alumni-Master")
    assert report.scout_id.startswith("scout-")
    assert report.ci_health_score >= 80
    assert report.security_scans_enabled is True
    assert len(report.workflows_analyzed) >= 3


@pytest.mark.anyio
async def test_cicd_pr_evaluator_agent_clean_pr():
    """Verify evaluation of a clean PR with unit test coverage."""
    req = PREvalRequest(
        pr_title="feat(echo): ECHO Showcase Certificates & SA Check",
        branch_name="feature/echo-certificates-and-profile-loop-agent",
        diff_text="+ def new_feature(): pass",
        files_changed=[
            "backend/echo_showcase.py",
            "backend/tests/test_echo_certificates_profile_agent_unit.py"
        ],
        author="dev"
    )
    report = await cicd_pr_evaluator_agent.evaluate_pr(req)
    assert report.overall_score >= 80
    assert report.verdict == "APPROVED"
    assert report.security_score == 100
    assert report.breaking_change_risk in ["LOW", "MEDIUM", "HIGH"]


@pytest.mark.anyio
async def test_cicd_pr_evaluator_agent_security_block():
    """Verify security block verdict when hardcoded secrets exist in diff."""
    req = PREvalRequest(
        pr_title="fix: hardcoded token test",
        branch_name="patch-secrets",
        diff_text="+ API_KEY = 'sk-proj-secretkey12345'",
        files_changed=["backend/server.py"],
        author="dev"
    )
    report = await cicd_pr_evaluator_agent.evaluate_pr(req)
    assert report.security_score < 80
    assert report.verdict == "SECURITY_BLOCK"
    assert any("secret" in issue.lower() for issue in report.issues_found)


@pytest.mark.anyio
async def test_cicd_loop_agent_controls():
    """Verify CICDLoopAgent status, start, run_cycle, and stop controls."""
    status = cicd_loop_agent.get_status()
    assert status["agent_name"] == "CICDLoopAgent"
    assert "is_running" in status

    cycle_res = await cicd_loop_agent.run_cycle()
    assert cycle_res["status"] == "success"
    assert "latest_evaluation" in cycle_res

    started = cicd_loop_agent.start_loop(interval_seconds=1800)
    assert started is True or cicd_loop_agent.get_status()["is_running"] is True

    stopped = cicd_loop_agent.stop_loop()
    assert stopped is True or cicd_loop_agent.get_status()["is_running"] is False
