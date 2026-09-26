"""
backend/core/code_sentinel_portfolio.py — AXISS Code Sentinel Portfolio & Data Governance Models.
Defines product tiers (T1, T2, T3), portfolio health metrics, PII recognizer definitions,
staggered review schedules, and portfolio findings schemas.
"""
from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class DataGovernanceTier(str, Enum):
    T1 = "T1"  # Highest sensitivity — Student data & student health data (1.5x score weight)
    T2 = "T2"  # Medium sensitivity — Employee/candidate PII, tax/financial, visa/immigration
    T3 = "T3"  # Standard sensitivity — Assessment data, platform/knowledge base


class ReviewCadence(str, Enum):
    PR_REVIEW = "PR_REVIEW"
    PUSH_SCAN = "PUSH_SCAN"
    NIGHTLY_SCAN = "NIGHTLY_SCAN"
    WEEKLY_DEEP_REVIEW = "WEEKLY_DEEP_REVIEW"
    MONTHLY_BASELINE = "MONTHLY_BASELINE"


class ProductDefinition(BaseModel):
    id: str
    name: str
    tier: DataGovernanceTier
    description: str
    repos: List[str]
    score_weight: float = 1.0
    deep_review_day: str  # Monday .. Saturday
    path_exclusions: List[str] = Field(default_factory=list)


# ─── StudentKare Super Admin Product Directory & Schedule ───────────────
PORTFOLIO_PRODUCTS: Dict[str, ProductDefinition] = {
    "studentkare_core": ProductDefinition(
        id="studentkare_core",
        name="StudentKare Core API & Auth",
        tier=DataGovernanceTier.T1,
        description="FastAPI Backend core API, JWT Auth, and PostgreSQL datastore (Highest Sensitivity)",
        repos=["kktejas07/Studentkare/backend/core"],
        score_weight=1.5,
        deep_review_day="Monday",
        path_exclusions=[
            "seed_data/*", "fixtures/*", "data_exports/*", "*.csv", "*.xlsx", "*.json",
            ".env*", "logs/*", "backups/*", "uploads/*", "*.ipynb"
        ]
    ),
    "studentkare_clinical_ai": ProductDefinition(
        id="studentkare_clinical_ai",
        name="Clinical AI Triage & SOAP Generator",
        tier=DataGovernanceTier.T1,
        description="PyHealth & Open-BioLLM multi-doctor triage council & clinical SOAP notes generator",
        repos=["kktejas07/Studentkare/backend/services/ai_triage"],
        score_weight=1.5,
        deep_review_day="Tuesday",
        path_exclusions=[
            "fixtures/*", "exports/*", "*.csv", "*.json", ".env*", "logs/*", "*.ipynb"
        ]
    ),
    "studentkare_abdm_vault": ProductDefinition(
        id="studentkare_abdm_vault",
        name="ABDM Health Vault & FHIR MCP",
        tier=DataGovernanceTier.T1,
        description="Ayushman Bharat Digital Mission (ABDM) health vault & FHIR interoperability server",
        repos=["kktejas07/Studentkare/backend/services/abdm"],
        score_weight=1.5,
        deep_review_day="Wednesday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "studentkare_mobile_app": ProductDefinition(
        id="studentkare_mobile_app",
        name="StudentKare Mobile & Web UI",
        tier=DataGovernanceTier.T1,
        description="React Native (Expo) & React Web application UI components",
        repos=["kktejas07/Studentkare/src"],
        score_weight=1.5,
        deep_review_day="Thursday",
        path_exclusions=["fixtures/*", ".env*", "node_modules/*"]
    ),
    "studentkare_rppg_vitals": ProductDefinition(
        id="studentkare_rppg_vitals",
        name="rPPG Vitals & Sensing Coach",
        tier=DataGovernanceTier.T1,
        description="Contactless webcam rPPG vitals estimation and eye strain / posture coach",
        repos=["kktejas07/Studentkare/backend/services/rppg"],
        score_weight=1.5,
        deep_review_day="Friday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "studentkare_shared_infra": ProductDefinition(
        id="studentkare_shared_infra",
        name="Shared Infra & Security Guards",
        tier=DataGovernanceTier.T1,
        description="Shared DB connection pools, Redis cache, and AI security guardrails",
        repos=["kktejas07/Studentkare/backend/services/infra"],
        score_weight=1.5,
        deep_review_day="Saturday",
        path_exclusions=["*.csv", ".env*"]
    ),
}


# ─── PII & Secret Detection Findings Schemas (D2 & D4) ───────────────────────
class PIIDetectionResult(BaseModel):
    file_path: str
    line_number: int
    pii_type: str  # Aadhaar, PAN, Phone, Email, DOB, ABHA, Passport, RollNumber, SSN
    detected_value_masked: str
    redacted_content: str
    skipped_for_llm: bool = False
    action_taken: str  # "REDACTED", "LLM_SKIPPED", "P0_ALERT_RAISED"


class PortfolioFinding(BaseModel):
    id: str
    product_id: str
    tier: DataGovernanceTier
    severity: str  # P0, P1, P2, P3
    rule_fingerprint: str
    title: str
    description: str
    affected_repo: str
    file_path: str
    line_number: int
    pii_skipped_count: int = 0
    is_cross_product_pattern: bool = False
    cross_product_matches: List[str] = Field(default_factory=list)
    created_at: str


class PortfolioScorecard(BaseModel):
    product_id: str
    product_name: str
    tier: DataGovernanceTier
    health_score: float  # 0 to 100
    trend: str  # "UP", "DOWN", "STABLE"
    open_p0_count: int
    open_p1_count: int
    llm_skipped_pii_count: int
    last_deep_review_date: str
    next_scheduled_review_day: str


class PortfolioDigestReport(BaseModel):
    report_date: str
    portfolio_health_score: float
    product_scorecards: List[PortfolioScorecard]
    new_p0_p1_findings: List[PortfolioFinding]
    sensitive_data_governance_summary: Dict[str, Any]
    cross_product_patterns: List[Dict[str, Any]]
    resolved_findings_count: int
    agent_reliability: Dict[str, Any]
