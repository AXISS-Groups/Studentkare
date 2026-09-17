"""
backend/core/code_sentinel_portfolio.py — AXISS Code Sentinel Portfolio & Data Governance Models.
Defines product tiers (T1, T2, T3), portfolio health metrics, PII recognizer definitions,
staggered review schedules, and portfolio findings schemas.
"""
from enum import Enum
from typing import Dict, List, Optional, Any
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


# ─── AXISS Group Portfolio Product Directory (D1 & D3 Schedule) ───────────────
PORTFOLIO_PRODUCTS: Dict[str, ProductDefinition] = {
    "studentkare": ProductDefinition(
        id="studentkare",
        name="StudentKare",
        tier=DataGovernanceTier.T1,
        description="Student health data, clinical AI triage, ABDM health vault (Highest Sensitivity)",
        repos=["kktejas07/Studentkare"],
        score_weight=1.5,
        deep_review_day="Monday",
        path_exclusions=[
            "seed_data/*", "fixtures/*", "data_exports/*", "*.csv", "*.xlsx", "*.json",
            ".env*", "logs/*", "backups/*", "uploads/*", "*.ipynb"
        ]
    ),
    "studentalumni": ProductDefinition(
        id="studentalumni",
        name="StudentAlumni.ai",
        tier=DataGovernanceTier.T1,
        description="Student demographic, career & educational records",
        repos=["axiss/StudentAlumni-ai"],
        score_weight=1.5,
        deep_review_day="Tuesday",
        path_exclusions=[
            "fixtures/*", "exports/*", "*.csv", "*.json", ".env*", "logs/*", "*.ipynb"
        ]
    ),
    "hyra": ProductDefinition(
        id="hyra",
        name="Hyra",
        tier=DataGovernanceTier.T2,
        description="Employee & candidate onboarding PII",
        repos=["axiss/Hyra"],
        score_weight=1.0,
        deep_review_day="Wednesday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "applylane": ProductDefinition(
        id="applylane",
        name="ApplyLane (incl. Otto)",
        tier=DataGovernanceTier.T2,
        description="Candidate application PII and automated resume parsing",
        repos=["axiss/ApplyLane"],
        score_weight=1.0,
        deep_review_day="Wednesday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "immi_axiss": ProductDefinition(
        id="immi_axiss",
        name="Immi Axiss",
        tier=DataGovernanceTier.T2,
        description="Immigration case files, visa records & passport data",
        repos=["axiss/Immi-Axiss"],
        score_weight=1.0,
        deep_review_day="Thursday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "fixtax360": ProductDefinition(
        id="fixtax360",
        name="FixTax360",
        tier=DataGovernanceTier.T2,
        description="Tax returns, financial ledgers & banking PII",
        repos=["axiss/FixTax360"],
        score_weight=1.0,
        deep_review_day="Thursday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "wehive": ProductDefinition(
        id="wehive",
        name="WeHive",
        tier=DataGovernanceTier.T2,
        description="Traveler profiles & global applicant PII",
        repos=["axiss/WeHive"],
        score_weight=1.0,
        deep_review_day="Friday",
        path_exclusions=["fixtures/*", ".env*"]
    ),
    "codespectra": ProductDefinition(
        id="codespectra",
        name="Code Spectra",
        tier=DataGovernanceTier.T3,
        description="Coding assessment data & candidate submission code",
        repos=["axiss/CodeSpectra"],
        score_weight=1.0,
        deep_review_day="Friday",
        path_exclusions=[".env*"]
    ),
    "axisscortex": ProductDefinition(
        id="axisscortex",
        name="AXISS Cortex",
        tier=DataGovernanceTier.T3,
        description="Platform knowledge base & shared intelligence models",
        repos=["axiss/AXISS-Cortex"],
        score_weight=1.0,
        deep_review_day="Saturday",
        path_exclusions=[".env*"]
    ),
    "shared_infra": ProductDefinition(
        id="shared_infra",
        name="Shared Infra & Libraries",
        tier=DataGovernanceTier.T1,  # Inherits highest tier of consumers
        description="Shared auth, encryption, and telemetry libraries",
        repos=["axiss/shared-libs"],
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
