"""Regression tests for the guardrail defects found in the 2026-10-16 backlog audit."""
from datetime import datetime

from test_clinical_fulfilment import make_staff
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.workflow_scheduler import URGENT_EVENT_TYPES, preference_verdict


class _QuietPrefs:
    """A student with every channel off and quiet hours over the whole night."""
    email_enabled = False
    whatsapp_enabled = False
    sms_enabled = False
    push_enabled = False
    reminders_enabled = False
    quiet_hours_enabled = True
    quiet_start = "22:00"
    quiet_end = "08:00"


def test_answers_to_a_students_sos_are_never_held_by_quiet_hours():
    assert {"SOS_ACKNOWLEDGED", "SOS_RESOLVED"} <= URGENT_EVENT_TYPES
    at_2am = datetime(2026, 10, 16, 2, 0)
    for event in ("SOS_ACKNOWLEDGED", "SOS_RESOLVED"):
        assert preference_verdict(_QuietPrefs(), event, "EMAIL", at_2am) == ("send", "")


def _crisis(client, codes, identifier):
    user, headers = register(client, codes, identifier)
    client.post("/api/care/navigate", json={"query": "I want to end my life"}, headers=headers)
    client.post("/api/auth/logout", headers=headers)
    return user


def test_counsellor_sees_and_closes_only_their_own_campus_crises(harness):
    client, factory, codes = harness
    ours = _crisis(client, codes, "crisis-ours@example.test")
    theirs = _crisis(client, codes, "crisis-theirs@example.test")
    with factory() as db:
        other = db.get(M.Account, theirs["id"])
        other.profile = {**(other.profile or {}), "university": "Another College"}
        # Sign-up also asked the campus (live-run audit #4); that request names the college too.
        db.get(M.CampusVerification, theirs["id"]).university = "Another College"
        db.commit()
    make_staff(factory, "counsellor-a", "COUNSELLOR", "counsellor-a@example.test", profile={"university": "Test University"})

    headers = login(client, codes, "counsellor-a@example.test")
    queue = client.get("/api/ops/crisis-events", headers=headers).json()
    assert [e["contact"] for e in queue["items"]] == [ours["email"]]
    assert queue["pending"] == 1 and queue["total"] == 1

    with factory() as db:
        their_event = db.query(M.CrisisEvent).filter_by(account_id=theirs["id"]).one()
    closed = client.post(f"/api/ops/crisis-events/{their_event.id}/acknowledge",
                         json={"outcome": "CONTACTED"}, headers=headers)
    assert closed.status_code == 404


def test_counsellor_with_no_campus_sees_no_crises(harness):
    client, factory, codes = harness
    _crisis(client, codes, "crisis-any@example.test")
    make_staff(factory, "counsellor-none", "COUNSELLOR", "counsellor-none@example.test")
    headers = login(client, codes, "counsellor-none@example.test")
    assert client.get("/api/ops/crisis-events", headers=headers).status_code == 403


def test_rx_review_queue_is_for_partner_pharmacies_only(harness):
    client, factory, codes = harness
    _user, student = register(client, codes, "rx-student@example.test")
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=student).status_code == 403
    client.post("/api/auth/logout", headers=student)
    for account_id, role in (("rx-doc", "NMC_DOCTOR"), ("rx-campus", "CAMPUS_ADMIN")):
        make_staff(factory, account_id, role, f"{account_id}@example.test", profile={"university": "Test University"})
        headers = login(client, codes, f"{account_id}@example.test")
        assert client.get("/api/v1/pharmacy/rx-reviews", headers=headers).status_code == 403

    make_staff(factory, "rx-pharmacy", "VENDOR", "rx-pharmacy@example.test")
    pharmacy = login(client, codes, "rx-pharmacy@example.test")
    assert client.get("/api/v1/pharmacy/rx-reviews", headers=pharmacy).json() == {"reviews": [], "total": 0, "uploads": [], "uploadsTotal": 0}


def test_approving_an_unknown_prescription_leaves_no_audit_trail(harness):
    client, factory, codes = harness
    make_staff(factory, "rx-pharmacy-2", "VENDOR", "rx-pharmacy-2@example.test")
    pharmacy = login(client, codes, "rx-pharmacy-2@example.test")
    checks = dict.fromkeys(("prescriberRegistration", "prescriptionDate", "patientMatches",
                            "allergyChecked", "scheduleLogged"), True)
    res = client.post("/api/v1/pharmacy/rx-reviews/rx_94102/approve",
                      json={"pharmacistName": "R. Iyer", "checks": checks}, headers=pharmacy)
    assert res.status_code == 404
    with factory() as db:
        assert db.query(M.WorkflowAudit).filter_by(action="DISPENSE_RX_VERIFIED").count() == 0


def test_notification_outbox_is_super_admin_only(harness):
    client, factory, codes = harness
    make_staff(factory, "outbox-vendor", "VENDOR", "outbox-vendor@example.test")
    vendor = login(client, codes, "outbox-vendor@example.test")
    assert client.get("/api/v1/admin/notifications/outbox", headers=vendor).status_code == 403
    assert client.post("/api/v1/admin/notifications/outbox/process", headers=vendor).status_code == 403
