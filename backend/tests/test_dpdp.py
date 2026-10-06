import time

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register

from app.main import app
from core import workflow_models as M
from services.dpdp import router as dpdp_router

# Make sure DPDP router is attached to the test app
if not any(hasattr(r, 'prefix') and r.prefix == "/api/v1/dpdp" for r in app.routes):
    app.include_router(dpdp_router)

def staff(factory, account_id="admin", role="SUPER_ADMIN"):
    with factory() as db:
        if not db.get(M.Account, account_id):
            db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL",
                             full_name=f"Test {role}", role=role, active=True, profile={}, created_at=time.time()))
            db.commit()

def test_dpdp_erasure_deadline_calculation(harness):
    client, factory, codes = harness
    staff(factory)
    user, user_headers = register(client, codes, "student@example.test")
    client.cookies.clear()

    admin_headers = login(client, codes, "admin@example.test")

    with factory() as db:
        now = time.time()
        db.add(M.DPDPErasureRequest(
            id="erq_1",
            student_id=user["id"],
            request_date=now - 86400, # 1 day ago
            scheduled_erasure_date=now + (29 * 86400), # 29 days from now
            status="PENDING",
            legally_retained_items=["Clinical Records"]
        ))
        db.commit()

    response = client.get("/api/v1/dpdp/erasure-queue", headers=admin_headers)
    assert response.status_code == 200, response.text

    items = response.json()["items"]
    assert len(items) == 1
    req = items[0]
    assert req["daysRemaining"] in (28, 29)
    assert req["legallyRetainedItems"] == ["Clinical Records"]

def test_dpdp_erasure_retains_mandated_records(harness):
    client, factory, codes = harness
    staff(factory)

    user, user_headers = register(client, codes, "student_erase@example.test")
    client.cookies.clear()

    admin_headers = login(client, codes, "admin@example.test")

    with factory() as db:
        db.add(M.Prescription(
            id="rx_1",
            prescriber_id="admin",
            patient_id=user["id"],
            issued_at=time.time(),
            status="ISSUED"
        ))

        db.add(M.DPDPErasureRequest(
            id="erq_2",
            student_id=user["id"],
            request_date=time.time(),
            scheduled_erasure_date=time.time(),
            status="PENDING",
            legally_retained_items=["Clinical Records"]
        ))
        db.commit()

    response = client.post("/api/v1/dpdp/erasure/erq_2/process", headers=admin_headers)
    assert response.status_code == 200, response.text

    with factory() as db:
        req = db.get(M.DPDPErasureRequest, "erq_2")
        assert req.status == "COMPLETED"

        account = db.get(M.Account, user["id"])
        # PII scrubbed
        assert account.full_name == "Redacted (DPDP Erasure)"
        assert account.active is False
        assert not account.profile
        assert "erased_" in account.identifier

        # Sessions wiped
        sessions = db.scalars(select(M.Session).where(M.Session.account_id == user["id"])).all()
        assert len(sessions) == 0

        # Exempt clinical records MUST explicitly be retained
        rx = db.get(M.Prescription, "rx_1")
        assert rx is not None
        assert rx.patient_id == user["id"]

def test_dpdp_policy_update_force_reconsent(harness):
    client, factory, codes = harness
    staff(factory)

    user1, _ = register(client, codes, "student1@example.test")
    client.cookies.clear()
    user2, _ = register(client, codes, "student2@example.test")
    client.cookies.clear()

    admin_headers = login(client, codes, "admin@example.test")

    with factory() as db:
        sessions = db.scalars(select(M.Session)).all()
        assert len(sessions) >= 2

    # Minor update (No forced reconsent)
    response1 = client.post("/api/v1/dpdp/consent-policy", headers=admin_headers, json={
        "version": "1.1",
        "title": "Minor Update",
        "changeSummary": "Fixed typos",
        "forceReconsent": False
    })
    assert response1.status_code == 201, response1.text

    with factory() as db:
        student1_sessions = db.scalars(select(M.Session).where(M.Session.account_id == user1["id"])).all()
        assert len(student1_sessions) > 0 # Still active

    # Major update (Forces reconsent)
    response2 = client.post("/api/v1/dpdp/consent-policy", headers=admin_headers, json={
        "version": "2.0",
        "title": "Major Overhaul",
        "changeSummary": "New data sharing rules",
        "forceReconsent": True
    })
    assert response2.status_code == 201, response2.text

    with factory() as db:
        student1_sessions = db.scalars(select(M.Session).where(M.Session.account_id == user1["id"])).all()
        student2_sessions = db.scalars(select(M.Session).where(M.Session.account_id == user2["id"])).all()

        # All student sessions explicitly revoked
        assert len(student1_sessions) == 0
        assert len(student2_sessions) == 0

        # Staff (SUPER_ADMIN) should not be forcibly logged out
        admin_sessions = db.scalars(select(M.Session).where(M.Session.account_id == "admin")).all()
        assert len(admin_sessions) > 0
