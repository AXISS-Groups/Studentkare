"""Teleconsultation waiting-room state tests."""
import time

from core import workflow_models as M
from test_workflow_api import harness, register, login


def _appt(factory, uid):
    with factory() as db:
        db.add(M.Account(id="doc", identifier="doc@example.test", channel="EMAIL", full_name="Dr. Doc", role="NMC_DOCTOR", active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id="consult", provider_id="doc", kind="consultation", name="Consult", brand="B", category="general-care", description="d", pack="30m", price_paise=29900, mrp_paise=49900, stock=0, active=True, requires_prescription=False, preparation=""))
        db.add(M.AvailabilitySlot(id="slot1", provider_id="doc", catalog_item_id="consult", slot_start="2026-09-25T10:00", slot_end="2026-09-25T10:30", capacity=3, booked=0, active=True))
        db.commit()
    return "slot1"


def test_consultation_join_and_provider_progress(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "patient@example.test")
    slot = _appt(factory, user["id"])
    appt_id = client.post("/api/appointments", json={"slotId": slot}, headers=headers).json()["id"]

    # Cannot join before confirmed.
    assert client.post(f"/api/consultation/{appt_id}/join", headers=headers).status_code == 409

    # Confirm as staff, then student joins.
    with factory() as db:
        db.get(M.Account, "doc").role = "NMC_DOCTOR"
        db.commit()
    staff_headers = login(client, codes, "doc@example.test")
    client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=staff_headers)

    # Re-login as student (cookie replaced).
    student_headers = login(client, codes, "patient@example.test")
    joined = client.post(f"/api/consultation/{appt_id}/join", headers=student_headers).json()
    assert joined["studentJoined"] is True and joined["liveMedia"] is False

    # Provider joins -> in progress.
    staff_headers = login(client, codes, "doc@example.test")
    progressed = client.post(f"/api/consultation/{appt_id}/join-provider", headers=staff_headers).json()
    assert progressed["status"] == "IN_PROGRESS"
    assert progressed["providerJoined"] is True
    # liveMedia stays false without RTC_SIGNALLING_URL.
    assert progressed["liveMedia"] is False


def test_provider_cannot_join_another_providers_session(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "patient2@example.test")
    slot = _appt(factory, user["id"])
    appt_id = client.post("/api/appointments", json={"slotId": slot}, headers=headers).json()["id"]
    with factory() as db:
        db.get(M.Account, "doc").role = "NMC_DOCTOR"
        db.commit()
    staff_headers = login(client, codes, "doc@example.test")
    client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=staff_headers)
    student_headers = login(client, codes, "patient2@example.test")
    client.post(f"/api/consultation/{appt_id}/join", headers=student_headers)

    # A different staff account cannot join the session.
    with factory() as db:
        db.add(M.Account(id="otherdoc", identifier="other@example.test", channel="EMAIL", full_name="Other Doc", role="NMC_DOCTOR", active=True, profile={}, created_at=time.time()))
        db.commit()
    other_headers = login(client, codes, "other@example.test")
    assert client.post(f"/api/consultation/{appt_id}/join-provider", headers=other_headers).status_code == 403


def test_signal_relay_store_and_fetch(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "patient3@example.test")
    slot = _appt(factory, user["id"])
    appt_id = client.post("/api/appointments", json={"slotId": slot}, headers=headers).json()["id"]
    with factory() as db:
        db.get(M.Account, "doc").role = "NMC_DOCTOR"
        db.commit()
    staff_headers = login(client, codes, "doc@example.test")
    client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=staff_headers)
    student_headers = login(client, codes, "patient3@example.test")
    client.post(f"/api/consultation/{appt_id}/join", headers=student_headers)

    # Store an offer, then fetch it back.
    offer = {"type": "offer", "sdp": "v=0 offer-sdp"}
    assert client.post(f"/api/consultation/{appt_id}/signal", json=offer, headers=student_headers).json()["received"] is True
    fetched = client.get(f"/api/consultation/{appt_id}/signal", headers=student_headers).json()
    assert fetched["sdp"] == "v=0 offer-sdp"


def test_signal_requires_join_first(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "patient4@example.test")
    slot = _appt(factory, user["id"])
    appt_id = client.post("/api/appointments", json={"slotId": slot}, headers=headers).json()["id"]
    with factory() as db:
        db.get(M.Account, "doc").role = "NMC_DOCTOR"
        db.commit()
    staff_headers = login(client, codes, "doc@example.test")
    client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"}, headers=staff_headers)
    student_headers = login(client, codes, "patient4@example.test")
    # No join yet -> signal relay rejected.
    assert client.post(f"/api/consultation/{appt_id}/signal", json={"type": "offer", "sdp": "x"}, headers=student_headers).status_code == 409
