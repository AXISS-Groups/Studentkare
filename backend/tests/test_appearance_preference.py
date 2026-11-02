"""System / Dark / Light saved on the account, so it follows the person across web and the app."""
import time

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from test_workflow_api import harness, login, register  # noqa: F401  (fixture)

from core import rule_l
from core import workflow_models as M


def test_never_chosen_is_null_not_system(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    response = client.get("/api/profile/appearance")
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {"appearance": None, "updatedAt": None}


@pytest.mark.parametrize("choice", ["SYSTEM", "DARK", "LIGHT"])
def test_choice_persists_on_the_account(harness, choice):
    client, factory, codes = harness
    user, headers = register(client, codes)
    saved = client.patch("/api/profile/appearance", headers=headers, json={"appearance": choice})
    assert saved.status_code == 200, saved.text
    assert saved.headers["cache-control"] == "no-store"
    assert saved.json()["appearance"] == choice
    assert client.get("/api/profile/appearance").json()["appearance"] == choice
    with factory() as db:
        assert db.get(M.AppearancePreference, user["id"]).appearance == choice


def test_changing_it_updates_the_one_row(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    client.patch("/api/profile/appearance", headers=headers, json={"appearance": "DARK"})
    client.patch("/api/profile/appearance", headers=headers, json={"appearance": "LIGHT"})
    with factory() as db:
        rows = db.scalars(select(M.AppearancePreference)).all()
    assert [(r.account_id, r.appearance) for r in rows] == [(user["id"], "LIGHT")]


def test_it_follows_the_account_to_another_sign_in(harness):
    """The point of the ticket: a second device signing in sees the same choice."""
    client, _, codes = harness
    _, headers = register(client, codes)
    client.patch("/api/profile/appearance", headers=headers, json={"appearance": "DARK"})
    client.post("/api/auth/logout", headers=headers)
    login(client, codes, "member@example.test")
    assert client.get("/api/profile/appearance").json()["appearance"] == "DARK"


@pytest.mark.parametrize("body", [
    {"appearance": "dark"}, {"appearance": "SEPIA"}, {"appearance": ""}, {"appearance": None}, {},
    {"appearance": "DARK", "accountId": "someone-else"}, {"appearance": "DARK", "account_id": "x"},
    {"appearance": 1},
])
def test_rejects_anything_but_the_three_values(harness, body):
    client, factory, codes = harness
    _, headers = register(client, codes)
    assert client.patch("/api/profile/appearance", headers=headers, json=body).status_code == 422
    with factory() as db:
        assert db.scalars(select(M.AppearancePreference)).all() == []


def test_signed_out_and_missing_csrf_are_refused(harness):
    client, factory, codes = harness
    assert client.get("/api/profile/appearance").status_code == 401
    assert client.patch("/api/profile/appearance", json={"appearance": "DARK"}).status_code in (401, 403)
    register(client, codes)
    assert client.patch("/api/profile/appearance", json={"appearance": "DARK"}).status_code == 403
    with factory() as db:
        assert db.scalars(select(M.AppearancePreference)).all() == []


def test_one_account_cannot_see_or_change_another_accounts_choice(harness):
    client, factory, codes = harness
    first, first_headers = register(client, codes)
    client.patch("/api/profile/appearance", headers=first_headers, json={"appearance": "DARK"})
    client.post("/api/auth/logout", headers=first_headers)

    second, second_headers = register(client, codes, "second@example.test")
    assert client.get("/api/profile/appearance").json()["appearance"] is None
    assert client.get(f"/api/profile/appearance?accountId={first['id']}").json()["appearance"] is None
    client.patch("/api/profile/appearance", headers=second_headers, json={"appearance": "LIGHT"})

    with factory() as db:
        assert db.get(M.AppearancePreference, first["id"]).appearance == "DARK"
        assert db.get(M.AppearancePreference, second["id"]).appearance == "LIGHT"


def test_staff_set_their_own_choice_only(harness):
    """Any role may choose how its own screens look; none can reach a student's."""
    client, factory, codes = harness
    student, student_headers = register(client, codes)
    client.patch("/api/profile/appearance", headers=student_headers, json={"appearance": "LIGHT"})
    client.post("/api/auth/logout", headers=student_headers)
    with factory() as db:
        db.add(M.Account(id="admin-1", identifier="admin@example.test", channel="EMAIL", full_name="Test Admin",
                         role="SUPER_ADMIN", active=True, profile={}, created_at=time.time()))
        db.commit()
    admin_headers = login(client, codes, "admin@example.test")
    assert client.get("/api/profile/appearance").json()["appearance"] is None
    assert client.patch("/api/profile/appearance", headers=admin_headers, json={"appearance": "DARK"}).status_code == 200
    with factory() as db:
        assert db.get(M.AppearancePreference, student["id"]).appearance == "LIGHT"
        assert db.get(M.AppearancePreference, "admin-1").appearance == "DARK"


def test_a_deactivated_account_is_refused(harness):
    client, factory, codes = harness
    user, headers = register(client, codes)
    with factory() as db:
        db.get(M.Account, user["id"]).active = False
        db.commit()
    assert client.get("/api/profile/appearance").status_code == 401
    assert client.patch("/api/profile/appearance", headers=headers, json={"appearance": "DARK"}).status_code == 401


def test_the_table_is_platform_plane_with_no_role_grants():
    assert rule_l.TABLE_PLANES["care_appearance_preferences"] == rule_l.PLATFORM
    for role in rule_l.GROUP_ROLES:
        assert "care_appearance_preferences" not in rule_l.GRANT_MATRIX[role]


def test_the_database_refuses_an_unknown_value(harness):
    client, factory, codes = harness
    user, _ = register(client, codes)
    with factory() as db:
        db.add(M.AppearancePreference(account_id=user["id"], appearance="SEPIA", updated_at=time.time()))
        with pytest.raises(IntegrityError):
            db.commit()


def test_a_lost_first_save_race_returns_a_stable_code(harness, monkeypatch):
    """The first insert fails and no row is there to update: a 409 with a code the apps map to their own copy."""
    from sqlalchemy.orm import Session

    from services import member_profile_api

    client, factory, codes = harness
    _, headers = register(client, codes)
    real_commit = Session.commit
    calls = {"n": 0}

    def commit_once_fails(self):
        if any(isinstance(obj, M.AppearancePreference) for obj in self.new) and calls["n"] == 0:
            calls["n"] += 1
            raise IntegrityError("INSERT", {}, Exception("duplicate key"))
        return real_commit(self)

    monkeypatch.setattr(Session, "commit", commit_once_fails)
    response = client.patch("/api/profile/appearance", headers=headers, json={"appearance": "DARK"})
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == member_profile_api.APPEARANCE_SAVE_CONFLICT
    with factory() as db:
        assert db.scalars(select(M.AppearancePreference)).all() == []
