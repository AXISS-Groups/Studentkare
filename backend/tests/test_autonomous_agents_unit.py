"""
Unit tests for the Autonomous Agent Ecosystem:
- MetaGPT/ChatDev Swarm Pipeline
- AutoGPT Goal AutoPilot
- Synthetic QA Persona Simulator
- Specialized Operational Audits (Security, Data Hygiene, Moderation)
"""
import pytest

from services.agents.autopilot import autopilot_engine
from services.agents.qa_agent import qa_agent
from services.agents.specialized import specialized_agents
from services.agents.swarm import swarm_engine


@pytest.mark.anyio
async def test_swarm_pipeline_execution():
    result = await swarm_engine.run_swarm_pipeline(
        project_title="Alumni Mentorship Matcher",
        user_prompt="Automated matching system based on skills",
        domain="edtech"
    )
    assert result.session_id.startswith("swarm-")
    assert result.status == "completed"
    assert len(result.dialogue) >= 4
    assert "Product Requirements Document" in result.prd
    assert "System Architecture" in result.architecture
    assert "models.py" in result.code_files
    assert "APPROVED" in result.qa_report

@pytest.mark.anyio
async def test_autopilot_goal_execution():
    result = await autopilot_engine.execute_goal("Audit inactive users and send re-engagement emails")
    assert result.task_id.startswith("auto-")
    assert result.status == "completed"
    assert len(result.steps_executed) == 3
    assert result.iterations == 3

@pytest.mark.anyio
async def test_qa_persona_simulation():
    student_report = await qa_agent.run_persona_simulation("student")
    assert student_report.persona == "student"
    assert student_report.total_passed >= 2
    assert student_report.health_score == 100.0

    mentor_report = await qa_agent.run_persona_simulation("mentor")
    assert mentor_report.persona == "mentor"
    assert mentor_report.total_passed >= 2

@pytest.mark.anyio
async def test_specialized_agents():
    sec_report = await specialized_agents.run_security_audit()
    assert sec_report.findings_count == 4
    assert sec_report.status == "completed"

    hygiene_report = await specialized_agents.run_data_hygiene_audit()
    assert hygiene_report.findings_count == 3

    mod_report = await specialized_agents.run_content_moderation_audit()
    assert mod_report.findings_count == 2
