"""Audit C1: staff campus scope comes from a server-assigned membership, never the profile.

The attack: a campus admin or counsellor PATCHes /api/profile {"university": <another
college>} and then reads that college's verification queue, SOS alerts and crisis
queue. The profile is self-service; the scope is care_accounts.staff_campus, set only
by a super admin (or the provisioning / team-accounts commands).
"""
import time

from test_campus_admin_scope import admin, student_at
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from core.team_scope import TEAM_CAMPUS


def test_a_campus_admin_cannot_move_campus_by_editing_their_profile(harness):  # noqa: F811
    client, factory, codes = harness
    mine = student_at(client, codes, "a@x.test", "IIT Hyderabad")
    theirs = student_at(client, codes, "b@x.test", "BITS Pilani")
    admin_user, headers = admin(client, codes, factory, "admin@x.test", university="IIT Hyderabad")

    attack = client.patch("/api/profile", headers=headers, json={"university": "BITS Pilani"})
    assert attack.status_code == 403
    assert client.patch("/api/profile", headers=headers, json={"rollNumber": "X"}).status_code == 403

    with factory() as db:
        row = db.get(M.Account, admin_user["id"])
        assert row.staff_campus == "IIT Hyderabad"
        assert (row.profile or {}).get("university") != "BITS Pilani"
    ids = [item["accountId"] for item in client.get("/api/ops/campus/pending").json()["items"]]
    assert ids == [mine["id"]] and theirs["id"] not in ids
    # Deciding on the other campus's student still looks like "not found".
    assert client.patch(f"/api/ops/campus/{theirs['id']}", headers=headers, json={"status": "VERIFIED"}).status_code == 404


def test_a_profile_university_never_grants_scope(harness):  # noqa: F811
    """Even if the profile is written by some other path, scope ignores it."""
    client, factory, codes = harness
    student_at(client, codes, "b@x.test", "BITS Pilani")
    admin_user, headers = admin(client, codes, factory, "admin@x.test", university="IIT Hyderabad")
    with factory() as db:
        row = db.get(M.Account, admin_user["id"])
        row.profile = {**(row.profile or {}), "university": "BITS Pilani"}
        db.commit()
    assert client.get("/api/ops/campus/pending").json()["items"] == []
    assert client.get("/api/ops/sos", headers=headers).status_code == 200

    with factory() as db:
        db.get(M.Account, admin_user["id"]).staff_campus = ""
        db.commit()
    # No assigned campus: refused, never every campus, whatever the profile says.
    assert client.get("/api/ops/campus/pending").status_code == 403


def test_a_counsellor_cannot_move_campus_either(harness):  # noqa: F811
    client, factory, codes = harness
    _, headers = admin(client, codes, factory, "c@x.test", role="COUNSELLOR", university="IIT Hyderabad")
    assert client.patch("/api/profile", headers=headers, json={"university": "BITS Pilani"}).status_code == 403
    # Nor through the student campus-verification flow.
    submitted = client.post("/api/campus/verification", headers=headers, json={"university": "BITS Pilani", "rollNumber": "R1"})
    assert submitted.status_code == 403


def test_only_a_super_admin_assigns_the_campus_and_never_to_a_team_account(harness):  # noqa: F811
    client, factory, codes = harness
    campus_admin, ca_headers = admin(client, codes, factory, "ca@x.test", university="IIT Hyderabad")
    # The campus admin cannot assign themselves (super admin route).
    assert client.patch(f"/api/ops/accounts/{campus_admin['id']}/campus", headers=ca_headers,
                        json={"university": "BITS Pilani"}).status_code == 403
    with factory() as db:
        db.add(M.Account(id="team-campus", identifier="campus@team.test", channel="EMAIL", full_name="Team campus",
                         role="CAMPUS_ADMIN", active=True, profile={"university": TEAM_CAMPUS},
                         staff_campus=TEAM_CAMPUS, is_team_account=True, created_at=time.time()))
        db.add(M.Account(id="root", identifier="root@x.test", channel="EMAIL", full_name="Root", role="SUPER_ADMIN",
                         active=True, profile={}, created_at=time.time()))
        db.commit()
    headers = login(client, codes, "root@x.test")
    moved = client.patch(f"/api/ops/accounts/{campus_admin['id']}/campus", headers=headers, json={"university": "BITS Pilani"})
    assert moved.status_code == 200 and moved.json()["university"] == "BITS Pilani"
    with factory() as db:
        assert db.get(M.Account, campus_admin["id"]).staff_campus == "BITS Pilani"
    assert client.patch("/api/ops/accounts/team-campus/campus", headers=headers,
                        json={"university": "IIT Hyderabad"}).status_code == 409
    with factory() as db:
        assert db.get(M.Account, "team-campus").staff_campus == TEAM_CAMPUS


def test_a_team_student_cannot_leave_the_team_sandbox(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "teamstudent@x.test")
    with factory() as db:
        db.get(M.Account, user["id"]).is_team_account = True
        db.commit()
    headers = login(client, codes, "teamstudent@x.test")
    assert client.patch("/api/profile", headers=headers, json={"university": "IIT Hyderabad"}).status_code == 403
    assert client.post("/api/campus/verification", headers=headers,
                       json={"university": "IIT Hyderabad", "rollNumber": "R1"}).status_code == 403


def test_a_student_changing_campus_goes_back_through_verification(harness):  # noqa: F811
    client, factory, codes = harness
    user, headers = register(client, codes, "mover@x.test")
    with factory() as db:
        db.merge(M.CampusVerification(account_id=user["id"], university="IIT Hyderabad", roll_number="R1", status="VERIFIED"))
        db.commit()
    changed = client.patch("/api/profile", headers=headers, json={"university": "BITS Pilani"})
    assert changed.status_code == 200
    with factory() as db:
        row = db.get(M.CampusVerification, user["id"])
        assert row.status == "PENDING" and row.university == "BITS Pilani"
        assert db.get(M.Account, user["id"]).profile["isVerifiedStudent"] is False
