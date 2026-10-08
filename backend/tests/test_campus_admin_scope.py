"""A campus administrator acts only for their own campus; without one, for nobody."""
from core import workflow_models as M
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures


def student_at(client, codes, identifier, university):
    user, headers = register(client, codes, identifier)
    assert client.post("/api/campus/verification", headers=headers, json={"university": university, "rollNumber": "R1"}).status_code == 200
    client.post("/api/auth/logout", headers=headers)
    return user


def admin(client, codes, factory, identifier, role="CAMPUS_ADMIN", university=None):
    user, _ = register(client, codes, identifier)
    with factory() as db:
        account = db.get(M.Account, user["id"])
        account.role = role
        account.profile = {**(account.profile or {}), "university": university or ""}
        db.commit()
    return user, login(client, codes, identifier)


def test_queue_and_decisions_are_limited_to_the_admins_campus(harness):
    client, factory, codes = harness
    mine = student_at(client, codes, "a@x.test", "IIT Hyderabad")
    theirs = student_at(client, codes, "b@x.test", "BITS Pilani")
    _, headers = admin(client, codes, factory, "admin@x.test", university="  iit   hyderabad ")

    ids = [item["accountId"] for item in client.get("/api/ops/campus/pending").json()["items"]]
    assert ids == [mine["id"]]
    assert client.patch(f"/api/ops/campus/{theirs['id']}", headers=headers, json={"status": "VERIFIED"}).status_code == 404
    assert client.patch(f"/api/ops/campus/{mine['id']}", headers=headers, json={"status": "VERIFIED"}).status_code == 200


def test_an_admin_with_no_campus_sees_nobody(harness):
    client, factory, codes = harness
    student = student_at(client, codes, "a@x.test", "IIT Hyderabad")
    _, headers = admin(client, codes, factory, "admin@x.test", university="")
    assert client.get("/api/ops/campus/pending").status_code == 403
    assert client.patch(f"/api/ops/campus/{student['id']}", headers=headers, json={"status": "VERIFIED"}).status_code == 403


def test_a_super_admin_sees_every_campus_and_can_assign_one(harness):
    client, factory, codes = harness
    student_at(client, codes, "a@x.test", "IIT Hyderabad")
    student_at(client, codes, "b@x.test", "BITS Pilani")
    campus_admin, ca_headers = admin(client, codes, factory, "ca@x.test", university="")
    client.post("/api/auth/logout", headers=ca_headers)
    _, headers = admin(client, codes, factory, "sa@x.test", role="SUPER_ADMIN")
    assert len(client.get("/api/ops/campus/pending").json()["items"]) == 2
    assert client.patch(f"/api/ops/accounts/{campus_admin['id']}/campus", headers=headers, json={"university": "BITS Pilani"}).status_code == 200


def test_creating_a_campus_admin_requires_their_campus(harness):
    client, factory, codes = harness
    _, headers = admin(client, codes, factory, "sa@x.test", role="SUPER_ADMIN")
    body = {"identifier": "new@x.test", "channel": "EMAIL", "fullName": "New Admin", "role": "CAMPUS_ADMIN"}
    assert client.post("/api/ops/accounts", headers=headers, json=body).status_code == 422
    assert client.post("/api/ops/accounts", headers=headers, json={**body, "university": "IIT Hyderabad"}).status_code == 201


def test_the_accounts_list_shows_campus_scope_only_for_campus_admins(harness):
    client, factory, codes = harness
    student_at(client, codes, "a@x.test", "IIT Hyderabad")
    campus_admin, ca_headers = admin(client, codes, factory, "ca@x.test", university="BITS Pilani")
    client.post("/api/auth/logout", headers=ca_headers)
    admin(client, codes, factory, "sa@x.test", role="SUPER_ADMIN")
    items = {i["identifier"]: i for i in client.get("/api/ops/accounts?limit=50").json()["items"]}
    assert items["ca@x.test"]["campus"] == "BITS Pilani"
    assert "campus" not in items["a@x.test"]
