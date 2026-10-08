"""SOS: the alert always exists, every channel's real outcome is recorded, nothing is invented."""
import time

from sqlalchemy import select

from core import workflow_models as M
from services import emergency_api
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

SOS = "/api/emergency/sos"


def student(client, codes, factory, identifier="s@x.test", campus="IIT Hyderabad", ice="+91 98765 11111"):
    user, headers = register(client, codes, identifier)
    client.post("/api/campus/verification", headers=headers, json={"university": campus, "rollNumber": "R1"})
    with factory() as db:
        account = db.get(M.Account, user["id"])
        account.profile = {**account.profile, "emergencyContactName": "Amma", "emergencyContactPhone": ice}
        db.commit()
    return user, headers


def staff(client, codes, factory, identifier, campus, role="CAMPUS_ADMIN"):
    user, h = register(client, codes, identifier)
    with factory() as db:
        a = db.get(M.Account, user["id"])
        a.role, a.profile = role, {**a.profile, "university": campus}
        db.commit()
    client.post("/api/auth/logout", headers=h)
    return user, login(client, codes, identifier)


def add_security(factory, campus="IIT Hyderabad"):
    with factory() as db:
        db.add(M.CampusSecurityContact(id="sec1", campus=campus, name="Main gate", phone="+91 90000 00001", created_at=time.time()))
        db.commit()


def by_kind(alert):
    return {d["recipientKind"]: d for d in alert["deliveries"]}


def test_alert_exists_and_reports_failures_honestly_when_whatsapp_is_down(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = student(client, codes, factory)
    add_security(factory)
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda chat_id, text: {"status": "failed", "reason": "down"})

    r = client.post(SOS, headers=headers, json={"locationNote": "Library, 2nd floor"})
    assert r.status_code == 201, r.text
    alert = r.json()["alert"]
    kinds = by_kind(alert)
    assert alert["status"] == "ACTIVE"
    assert kinds["CAMPUS_CONSOLE"]["status"] == "SENT"
    assert kinds["CAMPUS_SECURITY"]["status"] == "FAILED"
    assert kinds["EMERGENCY_CONTACT"]["status"] == "FAILED"
    with factory() as db:
        assert db.get(M.SosAlert, alert["id"]) is not None


def test_sent_only_when_the_gateway_says_so_and_messages_hold_no_health_data(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = student(client, codes, factory)
    add_security(factory)
    sent = []
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda chat_id, text: sent.append(text) or {"status": "sent"})
    alert = client.post(SOS, headers=headers, json={}).json()["alert"]
    assert by_kind(alert)["CAMPUS_SECURITY"]["status"] == "SENT"
    assert by_kind(alert)["EMERGENCY_CONTACT"]["status"] == "SENT"
    assert all("not shared" in t for t in sent)
    for t in sent:
        for word in ("blood", "allerg", "diagnos", "medic"):
            assert word not in t.lower()
    # A second press returns the same alert and sends nothing new.
    again = client.post(SOS, headers=headers, json={}).json()
    assert again["alreadyActive"] is True and again["alert"]["id"] == alert["id"]
    assert len(sent) == 2


def test_missing_setup_is_skipped_not_faked(harness, monkeypatch):
    client, factory, codes = harness
    user, headers = student(client, codes, factory, ice="")
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda chat_id, text: {"status": "skipped"})
    kinds = by_kind(client.post(SOS, headers=headers, json={}).json()["alert"])
    assert kinds["CAMPUS_SECURITY"]["status"] == "SKIPPED"
    assert kinds["EMERGENCY_CONTACT"]["status"] == "SKIPPED"


def test_console_is_scoped_and_acknowledge_resolve_reach_the_student(harness, monkeypatch):
    client, factory, codes = harness
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda chat_id, text: {"status": "sent"})
    user, headers = student(client, codes, factory)
    alert_id = client.post(SOS, headers=headers, json={}).json()["alert"]["id"]
    client.post("/api/auth/logout", headers=headers)

    _, other = staff(client, codes, factory, "other@x.test", "BITS Pilani")
    assert client.get("/api/ops/sos").json()["items"] == []
    assert client.post(f"/api/ops/sos/{alert_id}/acknowledge", headers=other).status_code == 404
    client.post("/api/auth/logout", headers=other)

    _, mine = staff(client, codes, factory, "mine@x.test", "iit hyderabad")
    items = client.get("/api/ops/sos").json()["items"]
    assert [i["id"] for i in items] == [alert_id] and items[0]["student"]["name"]
    assert client.post(f"/api/ops/sos/{alert_id}/acknowledge", headers=mine).json()["alert"]["status"] == "ACKNOWLEDGED"
    assert client.post(f"/api/ops/sos/{alert_id}/resolve", headers=mine, json={"note": "Escorted to health centre"}).status_code == 200
    with factory() as db:
        events = {e.event_type for e in db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.account_id == user["id"])).all()}
    assert {"SOS_ACKNOWLEDGED", "SOS_RESOLVED"} <= events


def test_student_can_cancel_and_see_what_happened(harness, monkeypatch):
    client, factory, codes = harness
    monkeypatch.setattr(emergency_api, "_send_openwa", lambda chat_id, text: {"status": "sent"})
    _, headers = student(client, codes, factory)
    alert_id = client.post(SOS, headers=headers, json={}).json()["alert"]["id"]
    assert client.post(f"{SOS}/{alert_id}/cancel", headers=headers).json()["alert"]["status"] == "CANCELLED"
    current = client.get(f"{SOS}/current").json()["alert"]
    assert current["status"] == "CANCELLED" and len(current["deliveries"]) == 3


def test_security_contacts_are_scoped_and_masked(harness):
    client, factory, codes = harness
    _, h = staff(client, codes, factory, "mine@x.test", "IIT Hyderabad")
    assert client.post("/api/ops/campus/security-contacts", headers=h, json={"name": "Gate", "phone": "+91 90000 12345"}).status_code == 201
    items = client.get("/api/ops/campus/security-contacts").json()["items"]
    assert items[0]["phone"] == "•••••2345"
