"""The campus Team board reads its own campus's staff, never every account (it 403'd on /ops/accounts)."""
from sqlalchemy import select
from test_campus_admin_scope import admin
from test_workflow_api import harness, register  # noqa: F401 — pytest fixture

from core import workflow_models as M


def staff(client, codes, factory, identifier, role, university):
    user, headers = admin(client, codes, factory, identifier, role=role, university=university)
    client.post("/api/auth/logout", headers=headers)
    return user


def test_a_campus_admin_sees_only_their_campus_staff_and_the_read_is_audited(harness):
    client, factory, codes = harness
    counsellor = staff(client, codes, factory, "c@x.test", "COUNSELLOR", "IIT Hyderabad")
    staff(client, codes, factory, "far@x.test", "CAMPUS_ADMIN", "BITS Pilani")
    student, student_headers = register(client, codes, "s@x.test")
    client.post("/api/auth/logout", headers=student_headers)
    me, _ = admin(client, codes, factory, "me@x.test", university=" iit  hyderabad")

    # The old call: still super admin only.
    assert client.get("/api/ops/accounts?role=CAMPUS_ADMIN&limit=200").status_code == 403
    response = client.get("/api/ops/campus/team")
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert sorted(item["id"] for item in items) == sorted([me["id"], counsellor["id"]])
    assert student["id"] not in {item["id"] for item in items}
    # Staff fields only: nothing from a profile, nothing clinical.
    assert set(items[0]) == {"id", "fullName", "identifier", "role", "active", "twoFactorEnabled", "campus"}
    with factory() as db:
        rows = db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "CAMPUS_TEAM_VIEWED")).all()
        assert [(row.actor_id, row.resource_id) for row in rows] == [(me["id"], "iit hyderabad")]


def test_no_campus_no_team_and_other_roles_are_refused(harness):
    client, factory, codes = harness
    _, headers = admin(client, codes, factory, "nocampus@x.test", university="")
    assert client.get("/api/ops/campus/team").status_code == 403
    client.post("/api/auth/logout", headers=headers)
    _, headers = admin(client, codes, factory, "couns@x.test", role="COUNSELLOR", university="IIT Hyderabad")
    assert client.get("/api/ops/campus/team").status_code == 403
    client.post("/api/auth/logout", headers=headers)
    _, headers = admin(client, codes, factory, "vendor@x.test", role="VENDOR")
    assert client.get("/api/ops/campus/team").status_code == 403


def test_a_super_admin_sees_every_campus(harness):
    client, factory, codes = harness
    staff(client, codes, factory, "a@x.test", "CAMPUS_ADMIN", "IIT Hyderabad")
    staff(client, codes, factory, "b@x.test", "COUNSELLOR", "BITS Pilani")
    admin(client, codes, factory, "sa@x.test", role="SUPER_ADMIN")
    assert len(client.get("/api/ops/campus/team").json()["items"]) == 2
