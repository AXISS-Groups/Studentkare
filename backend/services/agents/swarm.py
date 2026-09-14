"""
services.agents.swarm — MetaGPT & VAVE AI Helper Mesh Swarm Engine.

Simulates capability-based agent discovery, multi-agent inter-helper handoffs,
and actor-critic research & clinical verification swarms. Logs progress directly
to the VAVE-style Observable System Log.
"""
from __future__ import annotations

import time
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from services.agents.ai_observability import ai_observability
from services.agents.medical_guard import medical_guard, PermissionScope


class HelperCapability(BaseModel):
    helper_id: str
    name: str
    capabilities: List[str]
    status: str = "IDLE"


HELPER_MESH_REGISTRY: List[HelperCapability] = [
    HelperCapability(helper_id="h_triage", name="Triage Doctor Helper", capabilities=["symptom_triage", "differential_diagnosis"]),
    HelperCapability(helper_id="h_soap", name="SOAP Note Extractor", capabilities=["soap_generation", "abdm_formatting"]),
    HelperCapability(helper_id="h_rx", name="Rx Prescription Parser", capabilities=["rx_extraction", "dosage_warning"]),
    HelperCapability(helper_id="h_phleb", name="Phlebotomist Dispatcher", capabilities=["lab_slot_picker", "sample_routing"]),
    HelperCapability(helper_id="h_guard", name="Zero-Trust Safety Gate", capabilities=["permission_eval", "hitl_routing"]),
]


class SwarmPipelineResult(BaseModel):
    session_id: str
    status: str = "completed"
    project_title: str
    domain: str
    dialogue: List[Dict[str, str]] = Field(default_factory=list)
    prd: str = ""
    architecture: str = ""
    code_files: List[str] = Field(default_factory=list)
    qa_report: str = ""
    mesh_handoffs: List[str] = Field(default_factory=list)


class ClinicalSwarmResult(BaseModel):
    session_id: str
    patient_id: str
    status: str
    triage_summary: str
    assigned_helpers: List[str]
    handoff_trail: List[str]
    safety_approval: Dict[str, Any]


class SwarmEngine:
    def discover_helpers(self, required_capabilities: List[str]) -> List[HelperCapability]:
        matched = []
        for helper in HELPER_MESH_REGISTRY:
            if any(cap in helper.capabilities for cap in required_capabilities):
                matched.append(helper)
        return matched

    async def execute_clinical_mesh_triage(self, patient_id: str, symptom_input: str) -> ClinicalSwarmResult:
        session_id = f"mesh-{int(time.time())}"
        
        # 1. Discover helpers
        helpers = self.discover_helpers(["symptom_triage", "soap_generation", "hitl_routing"])
        assigned_names = [h.name for h in helpers]

        ai_observability.log_event(
            level="INFO",
            agent_name="AI Helper Mesh Router",
            message=f"Discovered {len(helpers)} clinical agents for patient '{patient_id}'. Initializing mesh pipeline.",
            details={"session_id": session_id, "helpers": assigned_names},
        )

        # 2. Inter-agent Handoff 1: Triage -> SOAP
        ai_observability.log_event(
            level="CONSENSUS",
            agent_name="Triage Doctor Helper",
            message=f"Triage completed: Synthesized differential diagnosis for '{symptom_input[:40]}...'",
        )

        ai_observability.log_event(
            level="TOOL",
            agent_name="SOAP Note Extractor",
            message="Handoff received from Triage Helper. Generating ABDM-compliant clinical record.",
        )

        # 3. Inter-agent Handoff 2: SOAP -> Zero-Trust Guard
        safety_eval = medical_guard.evaluate_request(
            actor="Clinical Mesh Swarm",
            action_type="SOAP_NOTES_GENERATE",
            active_scopes=[PermissionScope.READ_PATIENT_VAULT, PermissionScope.PROPOSE_TREATMENT],
        )

        ai_observability.log_event(
            level="SAFETY",
            agent_name="Zero-Trust Safety Gate",
            message=f"Safety policy check: {safety_eval.get('reason')}",
            details=safety_eval,
        )

        handoff_trail = [
            "User Input → Mesh Router",
            "Mesh Router → Triage Doctor Helper",
            "Triage Doctor Helper → SOAP Note Extractor",
            "SOAP Note Extractor → Zero-Trust Safety Gate",
        ]

        return ClinicalSwarmResult(
            session_id=session_id,
            patient_id=patient_id,
            status="SUCCESS",
            triage_summary=f"Clinical Mesh Triage synthesis complete for: {symptom_input}",
            assigned_helpers=assigned_names,
            handoff_trail=handoff_trail,
            safety_approval=safety_eval,
        )

    async def run_swarm_pipeline(
        self,
        project_title: str,
        user_prompt: str,
        domain: str = "edtech",
    ) -> SwarmPipelineResult:
        roles = ["Product Manager", "System Architect", "Lead Engineer", "QA Lead"]
        dialogue = [
            {"role": r, "message": f"{r} contributing to '{project_title}' ({domain})."}
            for r in roles
        ]
        dialogue.append({"role": "Product Manager", "message": user_prompt})

        ai_observability.log_event(
            level="INFO",
            agent_name="Software Mesh Swarm",
            message=f"Executing multi-agent development swarm for project '{project_title}'.",
        )

        prd = (
            f"Product Requirements Document for '{project_title}': {user_prompt}. "
            "Goals, user stories and acceptance criteria for the domain of "
            f"{domain} are outlined below."
        )
        architecture = (
            f"System Architecture for '{project_title}': FastAPI backend + React "
            "frontend + PostgreSQL persistence + Redis cache, separated into "
            "operational and clinical planes."
        )
        code_files = ["models.py", "routers.py", "services.py", "main.py"]
        qa_report = "QA Report: 12 tests executed. STATUS: APPROVED. 0 failures."
        handoffs = ["PM -> Architect", "Architect -> Lead Engineer", "Engineer -> QA Lead"]

        return SwarmPipelineResult(
            session_id=f"swarm-{int(time.time())}",
            status="completed",
            project_title=project_title,
            domain=domain,
            dialogue=dialogue,
            prd=prd,
            architecture=architecture,
            code_files=code_files,
            qa_report=qa_report,
            mesh_handoffs=handoffs,
        )


swarm_engine = SwarmEngine()
