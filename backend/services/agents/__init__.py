"""services.agents — Autonomous Agent Ecosystem for Studentkare.

Public API:
    from services.agents.agent_scheduler import agent_scheduler
    from services.agents.swarm import swarm_engine
    from services.agents.autopilot import autopilot_engine
    from services.agents.qa_agent import qa_agent
    from services.agents.specialized import specialized_agents
    from services.agents.code_health_agent import code_health_agent
    from services.agents.daily_audit_agents import daily_audit_service
    from services.agents.phlebotomist_dispatch_agent import phlebotomist_dispatch_agent
    from services.agents.rx_extractor_ai_agent import rx_extractor_ai_agent
    from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
    from services.agents.blood_emergency_agent import blood_emergency_agent
    from services.agents.triage_council_agent import triage_council_agent
    from services.agents.soap_notes_agent import soap_notes_agent
    from services.agents.hitl_approval_agent import hitl_approval_agent
"""
from services.agents.blood_emergency_agent import blood_emergency_agent
from services.agents.hitl_approval_agent import hitl_approval_agent
from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
from services.agents.phlebotomist_dispatch_agent import phlebotomist_dispatch_agent
from services.agents.rx_extractor_ai_agent import rx_extractor_ai_agent
from services.agents.soap_notes_agent import soap_notes_agent
from services.agents.triage_council_agent import triage_council_agent

# A barrel: these are re-exported for callers, not used in this module.
__all__ = [
    "blood_emergency_agent",
    "hitl_approval_agent",
    "medication_adherence_loop_agent",
    "phlebotomist_dispatch_agent",
    "rx_extractor_ai_agent",
    "soap_notes_agent",
    "triage_council_agent",
]
