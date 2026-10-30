"""Persistent member editing and revocable, minimum-disclosure identity cards."""
import time
from datetime import date, datetime, timezone

import pytest
from test_workflow_api import harness, login, register

from core import workflow_models as M


def add_staff(factory, role="CAMPUS_ADMIN"):
    with factory() as db:
        db.add(M.Account(id="checker", identifier="checker@example.test", channel="EMAIL",
                         full_name="Test Checker", role=role, active=True, profile={}, created_at=time.time()))
        db.commit()


def test_profile_persists_without_exposing_internal_metadata(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    response = client.patch("/api/profile", headers=headers, json={
        "fullName": "Updated Member", "bloodGroup": "O+", "emergencyContactName": "Test Guardian",
        "emergencyContactPhone": "+91 9876543210", "emergencyContactRelation": "Parent",
        "allergies": ["Penicillin"], "chronicConditions": ["Asthma"],
    })
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    assert client.get("/api/auth/session").json()["user"]["fullName"] == "Updated Member"
    with factory() as db:
        row = db.get(M.Account, user["id"])
        # Clinical values live on the clinical plane, never in the identity row.
        assert "allergies" not in row.profile and "bloodGroup" not in row.profile
        clinical = db.get(M.ClinicalProfile, user["id"])
        assert (clinical.blood_group, clinical.allergies) == ("O+", ["Penicillin"])
        row.profile = {**row.profile, "recovery_email": "private@example.test", "digitalIdSecret": "secret"}
        db.commit()
    payload = client.get("/api/profile").json()
    assert payload["emergencyContactPhone"] == "+919876543210"
    assert "recovery_email" not in payload and "digitalIdSecret" not in payload


def test_an_adult_cannot_edit_their_way_into_being_a_minor(harness):
    """Guardrail 8 over HTTP, not just at the validator.

    Registration has always enforced 18+. This endpoint did not, so the gate
    could be walked around one PATCH after clearing it.
    """
    client, factory, codes = harness
    user, headers = register(client, codes)
    today = datetime.now(timezone.utc).date()  # the 18+ check counts in UTC (workflow_auth.age_in_years)
    child = date(today.year - 10, today.month, today.day).isoformat()

    response = client.patch("/api/profile", headers=headers, json={"dob": child})

    assert response.status_code == 422, response.text
    with factory() as db:
        assert db.get(M.Account, user["id"]).profile.get("dob") != child


def test_an_adult_may_still_correct_their_birth_date(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    today = datetime.now(timezone.utc).date()  # the 18+ check counts in UTC (workflow_auth.age_in_years)
    adult = date(today.year - 24, today.month, today.day).isoformat()

    assert client.patch("/api/profile", headers=headers, json={"dob": adult}).status_code == 200
    with factory() as db:
        assert db.get(M.Account, user["id"]).profile["dob"] == adult


@pytest.mark.parametrize("body", [
    {"role": "SUPER_ADMIN"}, {"ageVerified": True}, {"isVerifiedStudent": True},
    {"fullName": "   "}, {"dob": "2999-01-01"}, {"dob": None}, {"bloodGroup": "Z+"},
    {"emergencyContactPhone": "not a phone"}, {"allergies": ["x" * 161]},
])
def test_profile_rejects_invalid_or_privileged_fields(harness, body):
    client, _, codes = harness
    _, headers = register(client, codes)
    assert client.patch("/api/profile", json=body, headers=headers).status_code == 422


def test_profile_auth_csrf_and_account_isolation(harness):
    client, _, codes = harness
    assert client.get("/api/profile").status_code == 401
    assert client.get("/api/identity").status_code == 401
    _, headers = register(client, codes)
    assert client.patch("/api/profile", json={"bloodGroup": "A+"}).status_code == 403
    assert client.post("/api/identity").status_code == 403
    assert client.delete("/api/identity").status_code == 403
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "A+"})
    client.post("/api/auth/logout", headers=headers)
    register(client, codes, "second@example.test")
    assert client.get("/api/profile").json()["bloodGroup"] == ""
    assert client.get("/api/identity").json()["issued"] is False


def test_identity_change_requires_reverification_and_revokes_card(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    with factory() as db:
        row = db.get(M.Account, user["id"])
        row.profile = {**row.profile, "isVerifiedStudent": True, "ageVerified": True}
        db.get(M.CampusVerification, user["id"]).status = "VERIFIED"   # sign-up opened it as PENDING
        db.commit()
    assert client.post("/api/identity", headers=headers).status_code == 201
    response = client.patch("/api/profile", headers=headers, json={"fullName": "New Member Name"})
    assert response.status_code == 200
    assert response.json()["isVerifiedStudent"] is False
    assert response.json()["ageVerified"] is False
    assert client.get("/api/campus/verification").json()["status"] == "PENDING"
    assert client.get("/api/identity").json()["issued"] is False


def test_qr_issue_verify_reissue_revoke_and_no_medical_disclosure(harness, monkeypatch):
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "O+", "allergies": ["PRIVATE ALLERGY"]})
    first = client.post("/api/identity", headers=headers)
    assert first.status_code == 201, first.text
    card = first.json()
    assert card["qrSvg"].startswith("<svg")
    assert "<path" in card["qrSvg"]
    matrix = card["qrMatrix"]
    assert len(matrix) == len(matrix[0]) and len(matrix) >= 29
    assert set("".join(matrix)) == {"0", "1"}
    assert "PRIVATE ALLERGY" not in str(card)
    assert client.get("/api/identity").json()["code"] == card["code"]
    assert client.post("/api/identity/verify", headers=headers, json={"code": card["code"]}).status_code == 403
    second = client.post("/api/identity", headers=headers).json()
    add_staff(factory)
    staff_headers = login(client, codes, "checker@example.test")
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": card["code"]}).status_code == 404
    checked = client.post("/api/identity/verify", headers=staff_headers, json={"code": second["code"]})
    assert checked.status_code == 200, checked.text
    assert checked.json()["fullName"] == user["fullName"]
    assert checked.json()["campusStatus"] == "PENDING"   # sign-up asked the campus; nobody has decided
    assert not {"bloodGroup", "allergies", "dob", "email", "phone", "qrSvg", "qrMatrix", "code"} & checked.json().keys()
    headers = login(client, codes, "member@example.test")
    assert client.delete("/api/identity", headers=headers).status_code == 200
    assert client.get("/api/identity").json()["issued"] is False
    staff_headers = login(client, codes, "checker@example.test")
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": second["code"]}).status_code == 404


def test_counter_staff_verify_but_students_and_inactive_members_do_not(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    code = client.post("/api/identity", headers=headers).json()["code"]
    assert client.post("/api/identity/verify", headers=headers, json={"code": code}).status_code == 403
    with factory() as db:
        db.get(M.Account, user["id"]).active = False
        db.commit()
    # Pharmacy, lab and clinic counters check passes (SK-123).
    add_staff(factory, "VENDOR")
    staff_headers = login(client, codes, "checker@example.test")
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": code}).status_code == 404


def _issued(client, codes, factory):
    _user, headers = register(client, codes)
    card = client.post("/api/identity", headers=headers).json()
    add_staff(factory, "VENDOR")
    return card, login(client, codes, "checker@example.test")


def test_the_pass_rotates_every_30_seconds(harness, monkeypatch):
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    _user, headers = register(client, codes)
    card = client.post("/api/identity", headers=headers).json()
    assert card["rotateSeconds"] == 30 and card["expiresAt"] == (int(now // 30) + 1) * 30
    assert len(card["passCode"]) == 6 and card["passCode"].isdigit()
    assert card["code"].startswith("SKPASS1:")
    now += 30
    later = client.get("/api/identity").json()
    assert later["code"] != card["code"] and later["passCode"] != card["passCode"]


def test_a_screenshot_stops_working_within_a_minute(harness, monkeypatch):
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    card, staff = _issued(client, codes, factory)
    now += 60  # two steps on: the photographed code is no longer live
    assert client.post("/api/identity/verify", headers=staff, json={"code": card["code"]}).status_code == 410


def test_a_pass_code_is_accepted_once(harness, monkeypatch):
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    card, staff = _issued(client, codes, factory)
    assert client.post("/api/identity/verify", headers=staff, json={"code": card["code"]}).status_code == 200
    assert client.post("/api/identity/verify", headers=staff, json={"code": card["code"]}).status_code == 410


def test_the_six_digit_code_works_with_the_member_id(harness, monkeypatch):
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    card, staff = _issued(client, codes, factory)
    assert client.post("/api/identity/verify", headers=staff, json={"code": card["passCode"]}).status_code == 422
    wrong = "000000" if card["passCode"] != "000000" else "111111"
    assert client.post("/api/identity/verify", headers=staff,
                       json={"code": wrong, "memberId": card["memberId"]}).status_code == 410
    ok = client.post("/api/identity/verify", headers=staff, json={"code": card["passCode"], "memberId": card["memberId"]})
    assert ok.status_code == 200, ok.text


def test_a_partner_counter_gets_identity_only(harness, monkeypatch):
    """The partner Verify student screen (VENDOR): name, campus, roll number — nothing clinical."""
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={
        "bloodGroup": "O+", "allergies": ["PRIVATE ALLERGY"], "chronicConditions": ["PRIVATE CONDITION"],
        "emergencyContactName": "Private Contact", "emergencyContactPhone": "+919876543210",
    })
    card = client.post("/api/identity", headers=headers).json()
    add_staff(factory, "VENDOR")
    staff = login(client, codes, "checker@example.test")
    ok = client.post("/api/identity/verify", headers=staff, json={"code": card["passCode"], "memberId": card["memberId"]})
    assert ok.status_code == 200, ok.text
    assert ok.headers["cache-control"] == "no-store"
    assert set(ok.json()) == {"memberId", "fullName", "university", "rollNumber", "campusStatus"}
    assert ok.json()["fullName"] == user["fullName"]
    assert "PRIVATE" not in ok.text and "9876543210" not in ok.text and "O+" not in ok.text
    # The same code twice is refused: single use, even at the same counter.
    again = client.post("/api/identity/verify", headers=staff, json={"code": card["passCode"], "memberId": card["memberId"]})
    assert again.status_code == 410


def test_no_pass_without_a_signing_key_outside_dev(monkeypatch):
    import pytest as _pytest

    from services import check_in_pass
    monkeypatch.delenv("PASS_SIGNING_SECRET", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    with _pytest.raises(check_in_pass.PassSigningUnavailable):
        check_in_pass.current("acct", "secret")


def test_campus_approval_updates_profile_and_blocks_vendor_approval(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.post("/api/campus/verification", headers=headers, json={"university": "Correct Campus", "rollNumber": "NEW-42"})
    add_staff(factory, "VENDOR")
    staff_headers = login(client, codes, "checker@example.test")
    assert client.patch(f"/api/ops/campus/{user['id']}", headers=staff_headers, json={"status": "VERIFIED"}).status_code == 403
    assert client.get("/api/ops/campus/pending").status_code == 403
    with factory() as db:
        checker = db.get(M.Account, "checker")
        checker.role = "CAMPUS_ADMIN"
        checker.staff_campus = "Correct Campus"  # campus admins act only for their own campus
        db.commit()
    assert client.patch(f"/api/ops/campus/{user['id']}", headers=staff_headers, json={"status": "VERIFIED"}).status_code == 200
    login(client, codes, "member@example.test")
    profile = client.get("/api/profile").json()
    assert profile["university"] == "Correct Campus"
    assert profile["rollNumber"] == "NEW-42"
    assert profile["isVerifiedStudent"] is True


def test_invalid_codes_and_verification_throttle(harness, monkeypatch):
    now = time.time()
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    add_staff(factory)
    headers = login(client, codes, "checker@example.test")
    for code in ["bad", "SACARE-ID:unknown." + "a" * 43, "SACARE-ID:checker." + "a" * 43]:
        assert client.post("/api/identity/verify", headers=headers, json={"code": code}).status_code == 404
    from services.workflow_auth import limit
    with factory() as db:
        for _ in range(57):
            limit(db, "identity-verify:checker", 60, 60)
    assert client.post("/api/identity/verify", headers=headers, json={"code": "bad"}).status_code == 429


def test_where_to_find_a_student_is_stored_and_returned(harness):
    """ProfileSetup: hostel block and room drive sample pickup and clinic routing."""
    client, factory, codes = harness
    user, headers = register(client, codes)

    saved = client.patch("/api/profile", headers=headers,
                         json={"hostelBlock": "North Dorm, Block B", "room": "B-214"})

    assert saved.status_code == 200, saved.text
    payload = client.get("/api/profile").json()
    assert payload["hostelBlock"] == "North Dorm, Block B"
    assert payload["room"] == "B-214"
    with factory() as db:
        assert db.get(M.Account, user["id"]).profile["room"] == "B-214"


def test_moving_room_does_not_reset_campus_verification(harness):
    """A room is not identity. Only fullName, dob, university and rollNumber
    reopen the question of who this is."""
    client, factory, codes = harness
    user, headers = register(client, codes)
    with factory() as db:
        row = db.get(M.Account, user["id"])
        row.profile = {**row.profile, "isVerifiedStudent": True, "ageVerified": True}
        db.commit()

    client.patch("/api/profile", headers=headers, json={"hostelBlock": "South Dorm", "room": "C-101"})

    with factory() as db:
        profile = db.get(M.Account, user["id"]).profile
        assert profile["isVerifiedStudent"] is True
        assert profile["ageVerified"] is True


def test_where_to_find_a_student_is_optional(harness):
    """The screen offers "I'll add this later", so blank must be accepted."""
    client, _factory, codes = harness
    _user, headers = register(client, codes)

    assert client.patch("/api/profile", headers=headers,
                        json={"hostelBlock": "", "room": ""}).status_code == 200
    assert client.get("/api/profile").json()["hostelBlock"] == ""


def test_ten_minutes_of_codes_cover_a_weak_signal_and_each_works_only_in_its_step(harness, monkeypatch):
    now = 1_800_000_000.0
    monkeypatch.setattr(time, "time", lambda: now)
    client, factory, codes = harness
    card, staff = _issued(client, codes, factory)
    window = card["passWindow"]
    assert len(window) == 20 and window[0]["token"] == card["code"]
    assert all(len(entry["qrMatrix"]) >= 21 for entry in window)
    later = window[10]
    # Before its step, a future code is refused...
    assert client.post("/api/identity/verify", headers=staff, json={"code": later["token"]}).status_code == 410
    # ...and in its step, shown from memory with no fresh fetch, it verifies.
    now = later["startsAt"] + 5
    assert client.post("/api/identity/verify", headers=staff, json={"code": later["token"]}).status_code == 200
