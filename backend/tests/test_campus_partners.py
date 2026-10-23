"""GET /campus/partners: the campuses offered on CampusVerify come from the server."""
import time

from test_workflow_api import harness, register  # noqa: F401  (pytest fixture)

from core import workflow_models as M


def _admin(factory, account_id, university, active=True, role="CAMPUS_ADMIN"):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name="Staff",
                         role=role, active=active, profile={"university": university}, created_at=time.time(),
                         staff_campus=university))
        db.commit()


def test_lists_campuses_with_an_active_campus_admin_once_each(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "student@example.test")
    _admin(factory, "a1", "VNR VJIET")
    _admin(factory, "a2", "  vnr   vjiet ")  # same campus, different spacing and case
    _admin(factory, "a3", "Sreenidhi University")
    _admin(factory, "a4", "Gone College", active=False)
    _admin(factory, "a5", "Counsellor College", role="COUNSELLOR")
    _admin(factory, "a6", "")
    response = client.get("/api/campus/partners", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"items": [{"name": "Sreenidhi University"}, {"name": "VNR VJIET"}]}


def test_names_only_never_people(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "student2@example.test")
    _admin(factory, "a1", "VNR VJIET")
    body = client.get("/api/campus/partners", headers=headers).json()
    assert set(body["items"][0]) == {"name"}
    assert "a1@example.test" not in str(body)


def test_needs_a_session(harness):
    client, factory, codes = harness
    _admin(factory, "a1", "VNR VJIET")
    assert client.get("/api/campus/partners").status_code == 401


def test_empty_when_no_campus_has_an_admin(harness):
    client, factory, codes = harness
    _, headers = register(client, codes, "student3@example.test")
    assert client.get("/api/campus/partners", headers=headers).json() == {"items": []}
