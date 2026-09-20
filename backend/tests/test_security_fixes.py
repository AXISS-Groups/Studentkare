"""Authorization, isolation, and honest-data regression tests for the security fixes."""
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from core import workflow_models as M
from services.db_sql import Base
from services.workflow_auth import workflow_db
from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
from services.agents.rx_extractor_ai_agent import rx_extractor_ai_agent
from test_workflow_api import harness, register, login  # noqa: F401  (shared isolated-database fixture)


@pytest.fixture
def db_harness():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    def database():
        with factory() as s:
            yield s
    app.dependency_overrides[workflow_db] = database
    yield factory
    app.dependency_overrides.clear()
    engine.dispose()


def test_public_donor_directory_requires_auth_and_redacts_contact(harness):
    client, _, codes = harness
    assert client.get("/api/blood/donors").status_code == 401
    _, headers = register(client, codes)
    res = client.get("/api/blood/donors", headers=headers)
    assert res.status_code == 200
    donors = res.json()["donors"]
    assert len(donors) > 0
    assert all(d.get("phone") == "" for d in donors)


def test_approvals_require_staff_role(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)  # STUDENT
    assert client.get("/api/ops/approvals", headers=headers).status_code == 403
    assert client.post("/api/ops/approve-action", json={"actionId": "act_01"}, headers=headers).status_code == 403
    # Unknown action for a staff member returns 404, never a fake success.
    with factory() as db:
        db.add(M.Account(id="staff", identifier="staff@example.test", channel="EMAIL", full_name="Staff", role="NMC_DOCTOR", active=True, profile={}, created_at=time.time()))
        db.commit()
    staff_headers = login(client, codes, "staff@example.test")
    res = client.post("/api/ops/approve-action", json={"actionId": "does-not-exist"}, headers=staff_headers)
    assert res.status_code == 404


def test_medication_state_is_account_scoped(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "owner@example.test")
    with factory() as db:
        plan = medication_adherence_loop_agent.add_plan(db, "owner@example.test", "Paracetamol", "1 tab", "BD")
        medication_adherence_loop_agent.log_dose_taken(db, "owner@example.test", plan["id"])
        other = medication_adherence_loop_agent.get_user_schedule(db, "someone-else@example.test")
        # Another account must not inherit the logged medication.
        assert other["todays_taken"] == 0
        assert other["plans"] == []


def test_rx_extraction_never_invents_fields(harness):
    catalog = [{"id": "demo-vitamin-c", "name": "Vitamin C + Zinc Daily Support", "brand": "Nourish", "pricePaise": 34900}]
    result = rx_extractor_ai_agent.analyze_prescription_text("Patient has a mild fever. No medication named.", catalog)
    assert result.detected_doctor == "unknown"
    assert result.detected_date == "unknown"
    assert result.extracted_items == []

    match = rx_extractor_ai_agent.analyze_prescription_text("Prescribed Vitamin C + Zinc Daily Support 1 tablet daily.", catalog)
    assert len(match.extracted_items) == 1
    assert match.extracted_items[0].dosage == "unknown"
    assert match.extracted_items[0].needs_review is True
