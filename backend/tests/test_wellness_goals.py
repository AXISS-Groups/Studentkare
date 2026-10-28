"""Setup answers (primary goal, activity level): owned, optional, neutral."""
import re
import time
from pathlib import Path

import pytest
from test_workflow_api import harness, login, register  # noqa: F401

from core import rule_l
from core import workflow_models as M
from services.member_profile_api import ACTIVITY_LEVELS, PRIMARY_GOALS, SETUP_ANSWERS_STUDENT_ONLY


def test_nothing_answered_reads_as_empty_not_as_a_default(harness):
    client, _factory, codes = harness
    register(client, codes)
    response = client.get("/api/profile/wellness")
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {"primaryGoal": "", "activityLevel": "", "updatedAt": None}


def test_the_owner_saves_and_reads_back_their_answers(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    saved = client.patch("/api/profile/wellness", headers=headers, json={"primaryGoal": "MANAGE_STRESS"})
    assert saved.status_code == 200, saved.text
    assert saved.json()["primaryGoal"] == "MANAGE_STRESS"
    assert saved.json()["activityLevel"] == ""
    # One question per screen: the second answer must not reset the first.
    client.patch("/api/profile/wellness", headers=headers, json={"activityLevel": "SOME_WALKING"})
    payload = client.get("/api/profile/wellness").json()
    assert payload["primaryGoal"] == "MANAGE_STRESS"
    assert payload["activityLevel"] == "SOME_WALKING"
    assert payload["updatedAt"] is not None
    with factory() as db:
        row = db.get(M.WellnessGoal, user["id"])
        assert (row.primary_goal, row.activity_level) == ("MANAGE_STRESS", "SOME_WALKING")


def test_an_answer_can_be_cleared(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    client.patch("/api/profile/wellness", headers=headers, json={"primaryGoal": "SLEEP_BETTER"})
    cleared = client.patch("/api/profile/wellness", headers=headers, json={"primaryGoal": ""})
    assert cleared.status_code == 200
    assert cleared.json()["primaryGoal"] == ""


def test_an_empty_patch_is_allowed_and_changes_nothing(harness):
    # Skipping a question must never fail.
    client, _factory, codes = harness
    _user, headers = register(client, codes)
    client.patch("/api/profile/wellness", headers=headers, json={"activityLevel": "ACTIVE_MOST_DAYS"})
    response = client.patch("/api/profile/wellness", headers=headers, json={})
    assert response.status_code == 200
    assert response.json()["activityLevel"] == "ACTIVE_MOST_DAYS"


@pytest.mark.parametrize("body", [
    {"primaryGoal": "LOSE_WEIGHT"},          # never offered: disordered-eating risk
    {"primaryGoal": "lose weight"},
    {"primaryGoal": "stay_active"},          # exact codes only
    {"activityLevel": "ATHLETE"},
    {"primaryGoal": None},
    {"weightKg": 60},                        # no body measures on this endpoint
    {"bmi": 21.5},
    {"dailyStepTarget": 10000},
    {"accountId": "someone-else"},
])
def test_invalid_or_unknown_answers_are_refused(harness, body):
    client, factory, codes = harness
    user, headers = register(client, codes)
    response = client.patch("/api/profile/wellness", headers=headers, json=body)
    assert response.status_code == 422, response.text
    with factory() as db:
        assert db.get(M.WellnessGoal, user["id"]) is None


def test_no_weight_option_exists_in_the_vocabulary():
    words = " ".join(PRIMARY_GOALS + ACTIVITY_LEVELS).upper()
    for banned in ("WEIGHT", "BMI", "DIET", "CALORIE", "FAT", "SLIM"):
        assert banned not in words


def test_signed_out_requests_are_refused(harness):
    client, _factory, _codes = harness
    assert client.get("/api/profile/wellness").status_code == 401
    assert client.patch("/api/profile/wellness", json={"primaryGoal": "STAY_ACTIVE"}).status_code in {401, 403}


def test_a_patch_without_the_csrf_token_is_refused(harness):
    client, factory, codes = harness
    user, _headers = register(client, codes)
    response = client.patch("/api/profile/wellness", json={"primaryGoal": "STAY_ACTIVE"})
    assert response.status_code == 403
    with factory() as db:
        assert db.get(M.WellnessGoal, user["id"]) is None


def test_one_student_never_sees_or_changes_another_students_answers(harness):
    client, factory, codes = harness
    first, first_headers = register(client, codes, "first@example.test")
    client.patch("/api/profile/wellness", headers=first_headers, json={"primaryGoal": "MANAGE_STRESS"})
    client.post("/api/auth/logout", headers=first_headers)
    second, second_headers = register(client, codes, "second@example.test")
    assert client.get("/api/profile/wellness").json()["primaryGoal"] == ""
    client.patch("/api/profile/wellness", headers=second_headers, json={"primaryGoal": "STAY_ACTIVE"})
    with factory() as db:
        assert db.get(M.WellnessGoal, first["id"]).primary_goal == "MANAGE_STRESS"
        assert db.get(M.WellnessGoal, second["id"]).primary_goal == "STAY_ACTIVE"


@pytest.mark.parametrize("role", ["CAMPUS_ADMIN", "NMC_DOCTOR", "VENDOR", "SUPER_ADMIN"])
def test_staff_accounts_have_no_setup_answers(harness, role):
    client, factory, codes = harness
    with factory() as db:
        db.add(M.Account(id="staff", identifier="staff@example.test", channel="EMAIL", full_name="Test Staff",
                         role=role, active=True, profile={}, created_at=time.time()))
        db.commit()
    codes.clear()
    headers = login(client, codes, "staff@example.test")
    refused = client.get("/api/profile/wellness")
    assert refused.status_code == 403
    # A stable code the app can map to its own i18n text, plus the English.
    assert refused.json()["detail"]["code"] == SETUP_ANSWERS_STUDENT_ONLY
    assert client.patch("/api/profile/wellness", headers=headers, json={"primaryGoal": "STAY_ACTIVE"}).status_code == 403
    with factory() as db:
        assert db.get(M.WellnessGoal, "staff") is None


def test_the_audit_records_the_change_but_not_the_answer(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile/wellness", headers=headers, json={"primaryGoal": "MANAGE_STRESS"})
    with factory() as db:
        rows = db.query(M.WorkflowAudit).filter(M.WorkflowAudit.action == "WELLNESS_GOALS_UPDATED").all()
        assert [row.resource_id for row in rows] == [user["id"]]
        assert all("STRESS" not in (row.resource_id or "") for row in rows)


def test_the_table_is_clinical_so_commerce_cannot_read_it():
    assert rule_l.TABLE_PLANES["care_wellness_goals"] == rule_l.CLINICAL
    assert "care_wellness_goals" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]


VIEW_MODEL = Path(__file__).resolve().parents[2] / "src/features/auth/viewmodel/SetupQuestionViewModel.ts"


def _ts_tuple(name: str) -> tuple[str, ...]:
    source = VIEW_MODEL.read_text(encoding="utf-8")
    match = re.search(rf"export const {name} = \[(.*?)\] as const;", source, re.S)
    assert match, f"{name} not found in {VIEW_MODEL.name}"
    return tuple(re.findall(r"'([A-Z_]+)'", match.group(1)))


def test_the_app_offers_exactly_the_server_vocabulary_in_the_same_order():
    # Rule 11: the protocol values are defined here; the app's copy must not drift.
    assert _ts_tuple("PRIMARY_GOALS") == PRIMARY_GOALS
    assert _ts_tuple("ACTIVITY_LEVELS") == ACTIVITY_LEVELS
