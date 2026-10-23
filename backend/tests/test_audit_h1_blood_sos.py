"""Audit H1: Blood SOS can't be used to message people.

Attacks covered: registering someone else's number as a donor, broadcasting free
text to every campus, flooding donors, and reading donors' blood group and hostel
block from a partner account.
"""
import time

from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.contact_store import contact_of_kind

CAMPUS = "IIT Hyderabad"
OTHER = "BITS Pilani"


def fresh(client, codes, identifier):
    """Register a new student, signed out of anyone else first."""
    client.post("/api/auth/logout", headers={"X-CSRF-Token": client.get("/api/auth/session").json()["csrfToken"]})
    client.cookies.clear()
    return register(client, codes, identifier)


def verified_student(client, codes, factory, identifier, campus=CAMPUS):
    user, headers = fresh(client, codes, identifier)
    with factory() as db:
        db.merge(M.CampusVerification(account_id=user["id"], university=campus, roll_number=identifier,
                                    status="VERIFIED", verified_at=time.time()))
        db.commit()
    return user, headers


def donor(client, codes, factory, identifier, campus=CAMPUS, group="O+"):
    user, headers = verified_student(client, codes, factory, identifier, campus)
    res = client.post("/api/blood/register-donor", headers=headers,
                      json={"bloodGroup": group, "hostelBlock": "Block A", "visible": True})
    assert res.status_code == 200, res.text
    return user


def staff(factory, account_id, role, campus=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@x.test", channel="EMAIL", full_name=account_id,
                         role=role, active=True, profile={}, created_at=time.time(), staff_campus=campus,
                         partner_kind="PHARMACY" if role == "VENDOR" else ""))
        db.commit()


def outbox(factory):
    with factory() as db:
        return db.scalars(select(M.OutboxEvent).where(M.OutboxEvent.event_type == "BLOOD_SOS")).all()


def test_a_donor_number_is_the_accounts_own_verified_whatsapp(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = verified_student(client, codes, factory, "d@x.test")
    with factory() as db:
        own = contact_of_kind(db, user["id"], "WHATSAPP").value
    # Someone else's number is refused outright.
    refused = client.post("/api/blood/register-donor", headers=headers, json={
        "bloodGroup": "O+", "hostelBlock": "A", "phone": "+91 9999999999", "visible": True})
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "PHONE_NOT_VERIFIED"
    ok = client.post("/api/blood/register-donor", headers=headers, json={"bloodGroup": "O+", "hostelBlock": "A", "visible": True})
    assert ok.status_code == 200 and "phone" not in ok.json()
    with factory() as db:
        assert db.scalar(select(M.BloodDonor.phone).where(M.BloodDonor.account_id == user["id"])) == own
        # An unverified number is no number at all.
        contact_of_kind(db, user["id"], "WHATSAPP").verified_at = 0
        db.commit()
    again = client.post("/api/blood/register-donor", headers=headers, json={"bloodGroup": "O+", "hostelBlock": "A"})
    assert again.status_code == 409


def test_unverified_campus_and_non_students_cannot_register(harness):  # noqa: F811
    client, factory, codes = harness
    _, headers = fresh(client, codes, "new@x.test")
    res = client.post("/api/blood/register-donor", headers=headers, json={"bloodGroup": "O+", "hostelBlock": "A"})
    assert res.status_code == 409 and res.json()["detail"]["code"] == "CAMPUS_NOT_VERIFIED"
    staff(factory, "pharm", "VENDOR")
    client.cookies.clear()
    headers = login(client, codes, "pharm@x.test")
    assert client.post("/api/blood/register-donor", headers=headers,
                       json={"bloodGroup": "O+", "hostelBlock": "A"}).status_code == 403


def test_a_broadcast_is_a_fixed_template_on_the_requesters_campus_only(harness):  # noqa: F811
    client, factory, codes = harness
    near = donor(client, codes, factory, "near@x.test")
    donor(client, codes, factory, "far@x.test", campus=OTHER)
    _, headers = verified_student(client, codes, factory, "asker@x.test")

    # Free-text fields of the old API are gone; the extra field is refused.
    assert client.post("/api/blood/sos-request", headers=headers, json={
        "requiredGroup": "O+", "patientName": "Click this", "hospitalLocation": "x"}).status_code == 422
    # A student cannot pick another campus.
    assert client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "O+", "campus": OTHER}).status_code == 403
    assert client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "O+", "note": "x" * 141}).status_code == 422
    assert client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "O+", "note": "visit https://evil.example"}).status_code == 422
    assert client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "O+", "unitsNeeded": 50}).status_code == 422
    assert client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "XYZ"}).status_code == 422

    sent = client.post("/api/blood/sos-request", headers=headers,
                       json={"requiredGroup": "O+", "unitsNeeded": 2, "note": "Apollo ICU, ward 3"})
    assert sent.status_code == 200, sent.text
    assert sent.json()["events_staged"] == 1 and sent.json()["campus"] == CAMPUS
    events = outbox(factory)
    assert [e.account_id for e in events] == [near["id"]]
    text = events[0].payload["text"]
    assert text.startswith(f"StudentKare blood SOS at {CAMPUS}: 2 unit(s) of O+ blood needed")
    assert text.endswith("Note from the requester: Apollo ICU, ward 3")
    with factory() as db:
        actions = set(db.scalars(select(M.WorkflowAudit.action)).all())
    assert {"BLOOD_SOS_TRIGGERED", "BLOOD_SOS_SENT"} <= actions


def test_rate_limits_per_account_and_per_campus(harness):  # noqa: F811
    client, factory, codes = harness
    donor(client, codes, factory, "near@x.test")
    _, headers = verified_student(client, codes, factory, "asker@x.test")
    for _ in range(3):
        assert client.post("/api/blood/sos-request", headers=headers, json={"requiredGroup": "O+"}).status_code == 200
    assert client.post("/api/blood/sos-request", headers=headers, json={"requiredGroup": "O+"}).status_code == 429
    # Two more students on the same campus hit the campus cap (5 an hour).
    for name, allowed in (("b@x.test", 2), ("c@x.test", 0)):
        _, h = verified_student(client, codes, factory, name)
        for _ in range(allowed):
            assert client.post("/api/blood/sos-request", headers=h, json={"requiredGroup": "O+"}).status_code == 200
        assert client.post("/api/blood/sos-request", headers=h, json={"requiredGroup": "O+"}).status_code == 429


def test_unverified_or_partner_requesters_are_refused(harness):  # noqa: F811
    client, factory, codes = harness
    donor(client, codes, factory, "near@x.test")
    _, headers = fresh(client, codes, "unverified@x.test")
    assert client.post("/api/blood/sos-request", headers=headers, json={"requiredGroup": "O+"}).status_code == 409
    staff(factory, "pharm", "VENDOR")
    client.cookies.clear()
    headers = login(client, codes, "pharm@x.test")
    assert client.post("/api/blood/sos-request", headers=headers, json={"requiredGroup": "O+"}).status_code == 403
    assert outbox(factory) == []


def test_blood_group_and_hostel_block_only_to_campus_staff_and_the_donor(harness):  # noqa: F811
    client, factory, codes = harness
    mine = donor(client, codes, factory, "near@x.test")
    donor(client, codes, factory, "far@x.test", campus=OTHER, group="AB-")

    # The donor sees only their own record.
    client.cookies.clear()
    login(client, codes, "near@x.test")
    own = client.get("/api/blood/donors").json()["donors"]
    assert len(own) == 1 and own[0]["blood_group"] == "O+"
    # Another student sees nobody else's.
    verified_student(client, codes, factory, "other@x.test")
    assert client.get("/api/blood/donors").json()["donors"] == []
    # A partner sees nothing.
    staff(factory, "pharm", "VENDOR")
    client.cookies.clear()
    login(client, codes, "pharm@x.test")
    assert client.get("/api/blood/donors").json()["donors"] == []
    # Campus staff see their own campus's donors, without phone numbers.
    staff(factory, "ca", "CAMPUS_ADMIN", CAMPUS)
    client.cookies.clear()
    login(client, codes, "ca@x.test")
    listed = client.get("/api/blood/donors").json()["donors"]
    assert [d["blood_group"] for d in listed] == ["O+"] and all("phone" not in d for d in listed)
    assert mine["id"]
