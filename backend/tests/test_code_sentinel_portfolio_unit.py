"""
backend/tests/test_code_sentinel_portfolio_unit.py — Comprehensive unit tests for Code Sentinel
Portfolio Subsystem & Sensitive Data Governance (D1–D7).
"""
import pytest
from core.code_sentinel_portfolio import (
    PORTFOLIO_PRODUCTS,
    DataGovernanceTier,
    PortfolioFinding,
    PortfolioScorecard,
)
from services.code_sentinel_scanner import CodeSentinelScanner
from test_workflow_api import harness, register


def test_pii_scanner_redacts_aadhaar_pan_and_abha_id():
    sample_code = """
    # Fixture configuration
    student_aadhaar = "9876 5432 1098"
    student_pan = "ABCDE1234F"
    health_id = "91-4402-9901-1102"
    roll_no = "ROLL_99012"
    """
    processed, detections, is_skipped = CodeSentinelScanner.scan_chunk_for_pii_and_secrets(
        sample_code, "services/vault.py", "studentkare"
    )

    assert is_skipped is True
    assert len(detections) >= 3
    pii_types = {d.pii_type for d in detections}
    assert "Aadhaar" in pii_types or "PAN" in pii_types or "ABHAHealthID" in pii_types
    assert "9876 5432 1098" not in processed
    assert "ABCDE1234F" not in processed


def test_t1_real_student_data_raises_p0_critical_finding():
    mock_files = {
        "fixtures/student_records.json": "Aadhaar: 2345 6789 0123, ABHA: 91-8820-1102-4401, Roll: ROLL_99812",
        "backend/main.py": "app = FastAPI()",
    }
    findings, detections, llm_skipped = CodeSentinelScanner.audit_repo_for_data_governance(
        "studentkare", mock_files
    )

    assert llm_skipped >= 1
    p0_findings = [f for f in findings if f.severity == "P0"]
    assert len(p0_findings) >= 1
    assert "Real student" in p0_findings[0].title or "committed" in p0_findings[0].title


def test_t1_weighted_portfolio_health_score_calculation():
    scorecards = [
        PortfolioScorecard(
            product_id="studentkare",
            product_name="StudentKare",
            tier=DataGovernanceTier.T1,
            health_score=80.0,  # T1 (1.5x weight)
            trend="DOWN",
            open_p0_count=1,
            open_p1_count=0,
            llm_skipped_pii_count=2,
            last_deep_review_date="2026-09-17",
            next_scheduled_review_day="Monday",
        ),
        PortfolioScorecard(
            product_id="codespectra",
            product_name="Code Spectra",
            tier=DataGovernanceTier.T3,
            health_score=100.0,  # T3 (1.0x weight)
            trend="STABLE",
            open_p0_count=0,
            open_p1_count=0,
            llm_skipped_pii_count=0,
            last_deep_review_date="2026-09-17",
            next_scheduled_review_day="Friday",
        ),
    ]

    # Weighted calculation: (80 * 1.5 + 100 * 1.0) / (1.5 + 1.0) = 220 / 2.5 = 88.0
    weighted_score = CodeSentinelScanner.calculate_portfolio_health_score(scorecards)
    assert weighted_score == 88.0


def test_cross_product_pattern_grouping():
    findings = [
        PortfolioFinding(
            id="F1",
            product_id="studentkare",
            tier=DataGovernanceTier.T1,
            severity="P1",
            rule_fingerprint="SHARED-AUTH-MISSING-CSRF",
            title="Missing CSRF validation",
            description="CSRF middleware missing",
            affected_repo="kktejas07/Studentkare",
            file_path="backend/services/auth.py",
            line_number=45,
            created_at="2026-09-17T00:00:00Z",
        ),
        PortfolioFinding(
            id="F2",
            product_id="hyra",
            tier=DataGovernanceTier.T2,
            severity="P1",
            rule_fingerprint="SHARED-AUTH-MISSING-CSRF",
            title="Missing CSRF validation",
            description="CSRF middleware missing",
            affected_repo="axiss/Hyra",
            file_path="services/auth.py",
            line_number=12,
            created_at="2026-09-17T00:00:00Z",
        ),
    ]

    patterns = CodeSentinelScanner.group_cross_product_patterns(findings)
    assert len(patterns) == 1
    assert patterns[0]["fingerprint"] == "SHARED-AUTH-MISSING-CSRF"
    assert "studentkare" in patterns[0]["affected_products"]
    assert "hyra" in patterns[0]["affected_products"]


def test_weekly_portfolio_digest_generation():
    findings = [
        PortfolioFinding(
            id="F1",
            product_id="studentkare",
            tier=DataGovernanceTier.T1,
            severity="P0",
            rule_fingerprint="GOV-PII-AADHAAR",
            title="Real student data committed to source control",
            description="Aadhaar committed",
            affected_repo="kktejas07/Studentkare",
            file_path="fixtures/test.json",
            line_number=10,
            created_at="2026-09-17T00:00:00Z",
        )
    ]
    digest = CodeSentinelScanner.generate_weekly_portfolio_digest(findings, {"studentkare": 3})

    assert digest.portfolio_health_score < 100.0
    assert len(digest.product_scorecards) == len(PORTFOLIO_PRODUCTS)
    assert digest.sensitive_data_governance_summary["total_llm_skipped_pii"] == 3
    assert len(digest.new_p0_p1_findings) == 1


def test_sentinel_super_admin_endpoints(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, identifier="sentinel.admin@studentkare.test")
    with factory() as db:
        from core import workflow_models as M
        acc = db.get(M.Account, user["id"])
        acc.role = "SUPER_ADMIN"
        db.commit()

    # 1. Test Portfolio Grid API
    res_port = client.get('/api/v1/admin/sentinel/portfolio', headers=headers)
    assert res_port.status_code == 200, res_port.text
    assert 'portfolioHealthScore' in res_port.json()
    assert len(res_port.json()['products']) >= 9

    # 2. Test Data Governance Page API
    res_gov = client.get('/api/v1/admin/sentinel/governance', headers=headers)
    assert res_gov.status_code == 200, res_gov.text
    assert 't1_compliance_checklist' in res_gov.json()
    assert 'llm_skipped_pii_total' in res_gov.json()

    # 3. Test Weekly Portfolio Digest API
    res_dig = client.get('/api/v1/admin/sentinel/digest', headers=headers)
    assert res_dig.status_code == 200, res_dig.text
    assert 'portfolio_health_score' in res_dig.json()
    assert 'product_scorecards' in res_dig.json()
