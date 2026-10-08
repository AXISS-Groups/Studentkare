"""Leaving campus: the campus link ends on the chosen date; nothing else does."""
import time
from datetime import timedelta

from sqlalchemy import select

from core import billing_models as B
from core import workflow_models as M
from services.campus_departure import complete_due_departures, today_on_campus
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

URL = "/api/campus/departure"


def linked_student(client, codes, factory, identifier="leaver@iith.ac.in"):
    user, headers = register(client, codes, identifier)
    assert client.post("/api/campus/verification", headers=headers,
                       json={"university": "IIT Hyderabad", "rollNumber": "CS21-007"}).status_code == 200
    return user, headers


def give_seat(factory, account_id):
    with factory() as db:
        contract = B.EnterpriseContract(id="c1", organization="IIT Hyderabad", plan_id="CAMPUS", status="ACTIVE",
                                        seats=10, annual_amount_paise=1, amount_paid_paise=1,
                                        manager_account_id=account_id, period_start=0, period_end=time.time() + 9e6)
        db.add(contract)
        db.add(B.ContractSeat(id="s1", contract_id="c1", account_id=account_id, created_at=time.time()))
        db.commit()


def test_nothing_to_leave_without_a_campus(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    response = client.post(URL, headers=headers, json={"reason": "PAUSING"})
    assert response.status_code == 409


def test_a_break_removes_the_campus_link_now_and_keeps_records(harness):
    client, factory, codes = harness
    user, headers = linked_student(client, codes, factory)
    with factory() as db:
        db.add(M.Document(id="d1", account_id=user["id"], title="CBC", category="LAB", filename="cbc.pdf",
                          mime_type="application/pdf", content=b"%PDF", created_at=time.time()))
        db.commit()
    give_seat(factory, user["id"])

    response = client.post(URL, headers=headers, json={"reason": "PAUSING", "effectiveOn": "2099-01-01"})
    assert response.status_code == 201, response.text
    assert response.json()["departure"]["status"] == "COMPLETED"
    assert response.json()["departure"]["effectiveOn"] == today_on_campus().isoformat()

    with factory() as db:
        assert db.get(M.CampusVerification, user["id"]) is None
        assert db.scalar(select(B.ContractSeat).where(B.ContractSeat.account_id == user["id"])) is None
        assert db.get(M.Document, "d1") is not None
        account = db.get(M.Account, user["id"])
        assert account.active is True
        assert account.profile["isVerifiedStudent"] is False
        assert account.profile["university"] == ""
    assert client.get("/api/campus/verification").json()["status"] == "NOT_SUBMITTED"


def test_a_dated_departure_waits_for_its_date_and_can_be_undone(harness):
    client, factory, codes = harness
    user, headers = linked_student(client, codes, factory)
    leave_on = today_on_campus() + timedelta(days=30)

    created = client.post(URL, headers=headers, json={"reason": "GRADUATING", "effectiveOn": leave_on.isoformat()})
    assert created.status_code == 201, created.text
    assert created.json()["departure"]["status"] == "SCHEDULED"
    assert client.post(URL, headers=headers, json={"reason": "PAUSING"}).status_code == 409

    with factory() as db:
        assert complete_due_departures(db)["summary"]["completed"] == 0
        db.commit()
    assert client.get("/api/campus/verification").json()["status"] == "PENDING"

    assert client.post(f"{URL}/cancel", headers=headers).json()["departure"]["status"] == "CANCELLED"
    assert client.post(f"{URL}/cancel", headers=headers).status_code == 409


def test_the_job_completes_a_departure_on_its_date(harness):
    client, factory, codes = harness
    user, headers = linked_student(client, codes, factory)
    leave_on = today_on_campus() + timedelta(days=10)
    client.post(URL, headers=headers, json={"reason": "TRANSFERRING", "effectiveOn": leave_on.isoformat(), "destination": "CBIT"})

    with factory() as db:
        assert complete_due_departures(db, on=leave_on)["summary"]["completed"] == 1
        db.commit()
    state = client.get(URL).json()
    assert state["departure"]["status"] == "COMPLETED"
    assert state["departure"]["destination"] == "CBIT"
    assert state["campus"] is None


def test_dates_must_be_real_and_within_range(harness):
    client, factory, codes = harness
    _user, headers = linked_student(client, codes, factory)
    yesterday = (today_on_campus() - timedelta(days=1)).isoformat()
    far = (today_on_campus() + timedelta(days=500)).isoformat()
    for bad in ({"reason": "GRADUATING"}, {"reason": "GRADUATING", "effectiveOn": yesterday},
                {"reason": "GRADUATING", "effectiveOn": far}, {"reason": "GRADUATING", "effectiveOn": "2026-02-30"}):
        assert client.post(URL, headers=headers, json=bad).status_code == 422, bad


def test_the_screen_is_warned_about_a_college_sign_in_email(harness):
    client, factory, codes = harness
    linked_student(client, codes, factory)
    assert client.get(URL).json()["signsInWithCollegeEmail"] is True


def test_a_non_student_cannot_leave(harness):
    client, factory, codes = harness
    user, headers = linked_student(client, codes, factory)
    with factory() as db:
        db.get(M.Account, user["id"]).role = "VENDOR"
        db.commit()
    assert client.post(URL, headers=headers, json={"reason": "PAUSING"}).status_code == 403
