"""Blood group and allergies live on the clinical plane (care_clinical_profiles), with stable API shapes."""
import json
import time

import pytest
from cryptography.fernet import Fernet
from test_workflow_api import (  # noqa: F401 — pytest fixtures
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    login,
    register,
    verify_second_contact,
)

from core import rule_l
from core import workflow_models as M
from services.erasure import grace_seconds, process_due_erasures


def test_the_table_is_clinical_and_commerce_has_no_grant_on_it():
    assert rule_l.TABLE_PLANES["care_clinical_profiles"] == rule_l.CLINICAL
    assert "care_clinical_profiles" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]["care_clinical_profiles"].privileges == rule_l.RWD
    # Commerce reads three identity columns of an account, and the profile JSON is not one of them.
    assert "profile" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]["care_accounts"].columns


def test_profile_writes_go_to_the_clinical_table_and_the_shapes_stay(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    saved = client.patch("/api/profile", headers=headers, json={"bloodGroup": "B+", "allergies": ["Sulfa drugs"]})
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert (body["bloodGroup"], body["allergies"], body["noKnownAllergies"]) == ("B+", ["Sulfa drugs"], False)
    assert client.get("/api/profile").json()["bloodGroup"] == "B+"
    # The session the apps read keeps bloodGroup.
    assert client.get("/api/auth/session").json()["user"]["bloodGroup"] == "B+"
    with factory() as db:
        account = db.get(M.Account, user["id"])
        assert "bloodGroup" not in account.profile and "allergies" not in account.profile
        row = db.get(M.ClinicalProfile, user["id"])
        assert (row.blood_group, row.allergies, row.no_known_allergies) == ("B+", ["Sulfa drugs"], False)


def test_handlers_receive_an_identity_without_clinical_values(harness):
    from services.workflow_auth import account_payload

    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "A-"})
    with factory() as db:
        payload = account_payload(db.get(M.Account, user["id"]))
    assert "bloodGroup" not in payload and "allergies" not in payload


def test_none_and_not_answered_are_different(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    fresh = client.get("/api/profile").json()
    assert (fresh["allergies"], fresh["noKnownAllergies"]) == ([], False)          # not answered
    none = client.patch("/api/profile", headers=headers, json={"noKnownAllergies": True}).json()
    assert (none["allergies"], none["noKnownAllergies"]) == ([], True)             # "none known"
    # An old client re-saving its form with an empty list keeps the student's "none".
    kept = client.patch("/api/profile", headers=headers, json={"allergies": [], "bloodGroup": "O-"}).json()
    assert kept["noKnownAllergies"] is True
    listed = client.patch("/api/profile", headers=headers, json={"allergies": ["Penicillin"]}).json()
    assert (listed["allergies"], listed["noKnownAllergies"]) == (["Penicillin"], False)
    cleared = client.patch("/api/profile", headers=headers, json={"noKnownAllergies": True}).json()
    assert (cleared["allergies"], cleared["noKnownAllergies"]) == ([], True)


@pytest.mark.parametrize("body", [
    {"noKnownAllergies": True, "allergies": ["Penicillin"]}, {"noKnownAllergies": None}, {"noKnownAllergies": "yes"},
])
def test_contradictory_or_null_allergy_answers_are_refused(harness, body):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    assert client.patch("/api/profile", headers=headers, json=body).status_code == 422


def test_signup_blood_group_goes_to_the_clinical_table(harness):
    client, factory, codes = harness
    client.post("/api/auth/otp/send", json={"identifier": "bg@example.test", "channel": "EMAIL", "intent": "SIGNUP"})
    checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})
    verify_second_contact(client, codes, {"X-CSRF-Token": checked.json()["csrfToken"]})
    result = client.post("/api/auth/signup", headers={"X-CSRF-Token": checked.json()["csrfToken"]}, json={
        "fullName": "Blood Group", "dob": "2000-03-14", "university": "Test University", "rollNumber": "T-1",
        "bloodGroup": "AB+", "consent": SIGNUP_CONSENT, "password": SIGNUP_PASSWORD})
    assert result.status_code == 201, result.text
    assert result.json()["user"]["bloodGroup"] == "AB+"
    with factory() as db:
        account_id = result.json()["user"]["id"]
        assert "bloodGroup" not in db.get(M.Account, account_id).profile
        assert db.get(M.ClinicalProfile, account_id).blood_group == "AB+"


def test_export_carries_the_owner_s_own_values(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "O+", "allergies": ["Peanuts"]})
    exported = client.get("/api/records/export").json()["user"]
    assert (exported["bloodGroup"], exported["allergies"], exported["noKnownAllergies"]) == ("O+", ["Peanuts"], False)


def test_erasure_removes_the_clinical_row_and_seals_it(harness, monkeypatch):
    key = Fernet.generate_key()
    monkeypatch.setenv("DPDP_ARCHIVE_KEY", key.decode())
    monkeypatch.setenv("DPDP_ARCHIVE_RETENTION_DAYS", "30")
    client, factory, codes = harness
    user, headers = register(client, codes, "erase@example.test")
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "A+", "allergies": ["Latex"]})
    client.post("/api/records/deletion-request", headers=headers)
    with factory() as db:
        db.get(M.DeletionRequest, user["id"]).requested_at -= grace_seconds() + 1
        db.commit()
        assert process_due_erasures(db)["summary"]["erased"] == 1
        db.commit()
    with factory() as db:
        assert db.get(M.ClinicalProfile, user["id"]) is None
        archive = db.query(M.ErasureArchive).filter_by(former_account_id=user["id"]).one()
        sealed = json.loads(Fernet(key).decrypt(archive.sealed))
        assert sealed["tables"]["care_clinical_profiles"][0]["allergies"] == ["Latex"]


def test_the_emergency_card_medal_reads_the_clinical_blood_group(harness):
    from services import medals

    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={
        "emergencyContactName": "Parent", "emergencyContactPhone": "+919876543210"})
    with factory() as db:
        assert medals.earned(db, db.get(M.Account, user["id"]))["EMERGENCY_CARD_COMPLETE"] is False
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "O+"})
    with factory() as db:
        assert medals.earned(db, db.get(M.Account, user["id"]))["EMERGENCY_CARD_COMPLETE"] is True


def test_staff_cannot_read_another_student_s_values_through_the_profile(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes)
    client.patch("/api/profile", headers=headers, json={"bloodGroup": "B-", "allergies": ["PRIVATE"]})
    with factory() as db:
        db.add(M.Account(id="ops", identifier="ops@example.test", channel="EMAIL", full_name="Ops",
                         role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    login(client, codes, "ops@example.test")
    mine = client.get("/api/profile").json()
    assert (mine["bloodGroup"], mine["allergies"]) == ("", [])
    assert "PRIVATE" not in client.get("/api/auth/session").text
