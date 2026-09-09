"""
Unit tests for the new Studentkare backend endpoints:
  - /api/auth/signup
  - /api/persistence/status
  - /api/abdm/status
  - /api/telemetry/sensors (ingest + list)
  - /api/automation/scheduler/status
  - /api/agents/llm/chat (deterministic fallback)
  - /api/rag/query (deterministic fallback)
  - Role-based access control (super-admin gate)
"""
import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def _headers(role: str, sub: str = "admin_01") -> dict:
    token = main.create_access_token(data={"sub": sub, "identifier": "9999999999", "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_signup_creates_student():
    payload = {
        "fullName": "Test Student", "phone": "9876500009", "dob": "2005-01-01",
        "university": "Osmania University", "rollNumber": "URN-TEST-9",
        "institutionId": "inst_osmania_01",
    }
    r = client.post("/api/auth/signup", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["user"]["role"] == "STUDENT"
    assert "token" in body


def test_signup_duplicate_returns_409():
    payload = {
        "fullName": "Test Student", "phone": "9876500009", "dob": "2005-01-01",
        "university": "Osmania University", "rollNumber": "URN-TEST-9",
    }
    r = client.post("/api/auth/signup", json=payload)
    assert r.status_code == 409


def test_persistence_status_super_admin():
    r = client.get("/api/persistence/status", headers=_headers("SUPER_ADMIN"))
    assert r.status_code == 200
    assert "persistent" in r.json()


def test_admin_endpoint_gates_non_admin():
    # A STUDENT must be forbidden from the super-admin console.
    r = client.get("/api/admin/telemetry", headers=_headers("STUDENT", sub="std_01"))
    assert r.status_code == 403


def test_admin_endpoint_allows_super_admin():
    r = client.get("/api/admin/telemetry", headers=_headers("SUPER_ADMIN"))
    assert r.status_code == 200
    assert r.json()["systemStatus"] == "OPERATIONAL"


def test_abdm_status():
    r = client.get("/api/abdm/status", headers=_headers("STUDENT", sub="std_02"))
    assert r.status_code == 200
    assert "configured" in r.json()


def test_telemetry_ingest_and_list():
    payload = {"deviceId": "ped-1", "deviceType": "STEP_COUNTER", "readings": {"steps": 1200}}
    r = client.post("/api/telemetry/sensors", headers=_headers("STUDENT", sub="std_03"), json=payload)
    assert r.status_code == 200
    assert r.json()["success"] is True

    r2 = client.get("/api/telemetry/sensors", headers=_headers("STUDENT", sub="std_03"))
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1


def test_automation_scheduler_status():
    r = client.get("/api/automation/scheduler/status", headers=_headers("SUPER_ADMIN"))
    assert r.status_code == 200
    assert "running" in r.json()


def test_llm_chat_deterministic_fallback():
    r = client.post(
        "/api/agents/llm/chat",
        headers=_headers("STUDENT", sub="std_04"),
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert r.status_code == 200
    assert "reply" in r.json()


def test_rag_query_returns_chunks():
    r = client.post(
        "/api/rag/query",
        headers=_headers("STUDENT", sub="std_05"),
        json={"query": "fever", "topK": 2},
    )
    assert r.status_code == 200
    assert "retrievedChunks" in r.json()


def test_claims_adjudicate_endpoint():
    claim = {
        "id": "CLM-1",
        "totalBilled": 5000,
        "lineItems": [
            {"category": "ROOM_RENT", "billedAmount": 3000, "deductionAmount": 500,
             "deductionReason": "Tariff excess", "itemDescription": "Single Deluxe",
             "provenance": {"documentId": "doc-1", "page": 1, "bbox": [12.5, 40, 18.2, 85]}},
            {"category": "CONSUMABLES", "billedAmount": 2000, "deductionAmount": 0,
             "itemDescription": "PPE kit",
             "provenance": {"documentId": "doc-1", "page": 2, "bbox": [45, 10, 52, 90]}},
        ],
    }
    r = client.post("/api/claims/adjudicate", headers=_headers("CAMPUS_ADMIN", sub="adm_claim"), json={"claim": claim})
    assert r.status_code == 200
    body = r.json()
    assert body["claimId"] == "CLM-1"
    assert body["provenanceCheckPassed"] is True
    assert body["recommendedApproved"] == 4500
    assert "rule k2" in body["ruleConstitutionStatement"].lower()


def test_clinical_assist_endpoint():
    vitals = {"tempF": 101.4, "plateletCount": 120000}
    r = client.post(
        "/api/clinician/assist",
        headers=_headers("NMC_DOCTOR", sub="doc_assist"),
        json={"vitals": vitals, "historyText": "dengue fever with headache"},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["differentialDiagnoses"]) >= 1
    assert len(body["interactionAlerts"]) >= 1
    assert body["abnormalTrends"][0]["status"] == "ALERT"


def test_clinical_assist_requires_admin():
    r = client.post(
        "/api/clinician/assist",
        headers=_headers("STUDENT", sub="std_assist"),
        json={"vitals": {}, "historyText": "cough"},
    )
    assert r.status_code == 403
