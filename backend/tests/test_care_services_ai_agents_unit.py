"""
backend/tests/test_care_services_ai_agents_unit.py — Unit tests for Studentkare care services & AI/Loop Agents.
"""
from services.agents.phlebotomist_dispatch_agent import phlebotomist_dispatch_agent
from services.agents.rx_extractor_ai_agent import rx_extractor_ai_agent
from services.agents.medication_adherence_loop_agent import medication_adherence_loop_agent
from services.agents.blood_emergency_agent import blood_emergency_agent, BloodDonor


def test_phlebotomist_dispatch_agent():
    res = phlebotomist_dispatch_agent.dispatch_for_booking(
        booking_id="test_bk_01",
        test_name="Full Body Health Checkup",
        slot_time="07:00 AM - 08:00 AM",
        address="Hostel Block A, Room 101",
        is_fasting=True,
    )
    assert res.status == "CONFIRMED_DISPATCHED"
    assert "Rajesh Kumar" in res.phlebotomist_name or "Priya" in res.phlebotomist_name or "Amitabh" in res.phlebotomist_name
    assert "Fasting Required" in res.fasting_guideline


def test_rx_extractor_ai_agent():
    sample_catalog = [
        {"id": "cat_01", "name": "Studentkare Paracetamol 650mg", "brand": "Studentkare", "pricePaise": 3500, "requiresPrescription": True},
        {"id": "cat_02", "name": "Vitamin D3 60,000 IU", "brand": "Studentkare", "pricePaise": 24900, "requiresPrescription": False},
    ]
    res = rx_extractor_ai_agent.analyze_prescription_text(
        "Rx: Dr. Sen. Paracetamol 650mg 1 tab BD. Vitamin D3 1 cap weekly.",
        sample_catalog,
    )
    assert len(res.extracted_items) >= 1
    assert res.detected_doctor != ""


def test_medication_adherence_loop_agent():
    schedule = medication_adherence_loop_agent.get_user_schedule(None, "demo-student")
    assert schedule["user_id"] == "demo-student"
    # No plans yet -> zero completion, no fabricated todays_medications.
    assert schedule["plans"] == []
    assert schedule["daily_completion_rate"] == 0.0

    plan = medication_adherence_loop_agent.add_plan(None, "demo-student", "Paracetamol", "1 tablet", "twice daily")
    assert plan["source"] == "USER"

    log_res = medication_adherence_loop_agent.log_dose_taken(None, "demo-student", plan["id"])
    assert log_res["status"] == "SUCCESS"
    assert log_res["already_logged"] is False
    # A reminder must never imply a dose was taken: no fabricated todays_medications.
    schedule = medication_adherence_loop_agent.get_user_schedule(None, "demo-student")
    assert schedule["plans"] == [] or all("is_taken" not in p for p in schedule["plans"])


def test_blood_emergency_agent():
    # Public view redacts contact info and only shows consenting donors.
    donors = blood_emergency_agent.get_donors("ALL", public=True)
    assert len(donors) > 0
    assert all(d.get("phone") == "" for d in donors)

    sos_res = blood_emergency_agent.trigger_sos_broadcast(
        patient_name="Demo Student Patient",
        required_group="O-",
        units=2,
        location="Campus Health Centre",
    )
    # Honest status: queued for coordination, not claimed as broadcast.
    assert sos_res["status"] == "SOS_QUEUED"
    assert "no message is claimed as sent" in sos_res["ai_dispatch_summary"]
