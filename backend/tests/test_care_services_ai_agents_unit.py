"""
backend/tests/test_care_services_ai_agents_unit.py — Unit tests for Studentkare care services & AI/Loop Agents.
"""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from services.agents.blood_emergency_agent import BloodDonor, blood_emergency_agent
from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
from services.agents.phlebotomist_dispatch_agent import phlebotomist_dispatch_agent
from services.db_sql import Base


def test_phlebotomist_dispatch_agent():
    res = phlebotomist_dispatch_agent.dispatch_for_booking(
        booking_id="test_bk_01",
        test_name="Full Body Health Checkup",
        slot_time="07:00 AM - 08:00 AM",
        address="Hostel Block A, Room 101",
        is_fasting=True,
    )
    # This agent is a stub over an invented pool, so it must not report a
    # dispatch. It said "CONFIRMED_DISPATCHED" while POST /lab/book-slot returned
    # that to students with a named person and a phone number.
    assert res.status == "SAMPLE_NOT_DISPATCHED"
    assert "Rajesh Kumar" in res.phlebotomist_name or "Priya" in res.phlebotomist_name or "Amitabh" in res.phlebotomist_name
    assert "Fasting Required" in res.fasting_guideline
    # No accreditation claim, no cold chain, and a kit code wide enough not to collide.
    assert "NABL" not in res.sample_kit_code
    assert "NABL" not in res.ai_optimization_notes
    assert "emperature" not in res.ai_optimization_notes
    assert len(res.sample_kit_code) > len("SAMPLE-KIT-") + 6


def test_medication_adherence_loop_agent():
    schedule = medication_adherence_loop_agent.get_user_schedule(None, "demo-student")
    assert schedule["user_id"] == "demo-student"
    # No plans yet -> nothing taken, no fabricated todays_medications, and no score.
    assert schedule["plans"] == []
    assert schedule["todays_taken"] == 0
    assert "daily_completion_rate" not in schedule

    plan = medication_adherence_loop_agent.add_plan(None, "demo-student", "Paracetamol", "1 tablet", "twice daily")
    assert plan["source"] == "USER"

    log_res = medication_adherence_loop_agent.log_dose_taken(None, "demo-student", plan["id"])
    assert log_res["status"] == "SUCCESS"
    assert log_res["already_logged"] is False
    # A reminder must never imply a dose was taken: no fabricated todays_medications.
    schedule = medication_adherence_loop_agent.get_user_schedule(None, "demo-student")
    assert schedule["plans"] == [] or all("is_taken" not in p for p in schedule["plans"])


def test_blood_emergency_agent():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db:
        db.add(M.Account(id="donor-acct", identifier="9999999999", channel="WHATSAPP",
                         full_name="Donor", role="STUDENT", active=True, profile={}, created_at=1))
        db.add(M.Account(id="asker", identifier="asker@example.test", channel="EMAIL",
                         full_name="Asker", role="STUDENT", active=True, profile={}, created_at=1))
        db.add(M.CampusVerification(account_id="donor-acct", university="Test University", roll_number="R1",
                                    status="VERIFIED"))
        db.commit()
        blood_emergency_agent.register_donor(db, "donor-acct", BloodDonor(
            blood_group="O-", hostel_block="Block A", is_available=True, visible=True,
        ))
        donors = blood_emergency_agent.campus_donors(db, "Test University")
        assert len(donors) == 1
        assert blood_emergency_agent.campus_donors(db, "Another College") == []

        sos_res = blood_emergency_agent.trigger_sos_broadcast(
            db=db, account_id="asker", required_group="O+", units=2, campus="Test University",
        )
        db.commit()
        assert sos_res["status"] == "SOS_QUEUED"
        assert sos_res["events_staged"] == 1
        assert sos_res["matching_donors_count"] == 1
        pending = db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.status == "PENDING")).all()
        assert len(pending) == sos_res["events_staged"]
        assert all(e.event_type == "BLOOD_SOS" and e.payload["phone"] == "9999999999" for e in pending)
    engine.dispose()
