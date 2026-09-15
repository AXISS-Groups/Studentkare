"""Persistent member editing and revocable, minimum-disclosure identity cards."""
import time

import pytest

from core import workflow_models as M
from tests.test_workflow_api import harness, login, register


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
        assert row.profile["allergies"] == ["Penicillin"]
        row.profile = {**row.profile, "recovery_email": "private@example.test", "digitalIdSecret": "secret"}
        db.commit()
    payload = client.get("/api/profile").json()
    assert payload["emergencyContactPhone"] == "+919876543210"
    assert "recovery_email" not in payload and "digitalIdSecret" not in payload


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
        db.add(M.CampusVerification(account_id=user["id"], university="Test University", roll_number="TEST-42", status="VERIFIED"))
        db.commit()
    assert client.post("/api/identity", headers=headers).status_code == 201
    response = client.patch("/api/profile", headers=headers, json={"fullName": "New Member Name"})
    assert response.status_code == 200
    assert response.json()["isVerifiedStudent"] is False
    assert response.json()["ageVerified"] is False
    assert client.get("/api/campus/verification").json()["status"] == "PENDING"
    assert client.get("/api/identity").json()["issued"] is False


def test_qr_issue_verify_reissue_revoke_and_no_medical_disclosure(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "O+", "allergies": ["PRIVATE ALLERGY"]})
    first = client.post("/api/identity", headers=headers)
    assert first.status_code == 201, first.text
    card = first.json()
    assert card["qrSvg"].startswith("<svg")
    assert "<path" in card["qrSvg"]
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
    assert checked.json()["campusStatus"] == "NOT_SUBMITTED"
    assert not {"bloodGroup", "allergies", "dob", "email", "phone", "qrSvg", "code"} & checked.json().keys()
    headers = login(client, codes, "member@example.test")
    assert client.delete("/api/identity", headers=headers).status_code == 200
    assert client.get("/api/identity").json()["issued"] is False
    staff_headers = login(client, codes, "checker@example.test")
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": second["code"]}).status_code == 404


def test_inactive_member_and_vendor_cannot_verify(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    code = client.post("/api/identity", headers=headers).json()["code"]
    add_staff(factory, "VENDOR")
    staff_headers = login(client, codes, "checker@example.test")
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": code}).status_code == 403
    with factory() as db:
        db.get(M.Account, "checker").role = "CAMPUS_ADMIN"
        db.get(M.Account, user["id"]).active = False
        db.commit()
    assert client.post("/api/identity/verify", headers=staff_headers, json={"code": code}).status_code == 404


def test_campus_approval_updates_profile_and_blocks_vendor_approval(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.post("/api/campus/verification", headers=headers, json={"university": "Correct Campus", "rollNumber": "NEW-42"})
    add_staff(factory, "VENDOR")
    staff_headers = login(client, codes, "checker@example.test")
    assert client.patch(f"/api/ops/campus/{user['id']}", headers=staff_headers, json={"status": "VERIFIED"}).status_code == 403
    assert client.get("/api/ops/campus/pending").status_code == 403
    with factory() as db:
        db.get(M.Account, "checker").role = "CAMPUS_ADMIN"
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
