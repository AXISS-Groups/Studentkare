"""Find care near you: verified places only, honest scope, audited curation, and an HFR stub that never fakes."""
import time
from datetime import date, timedelta

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M
from core.settings_registry import setting
from services import hfr_registry
from services.integration_config import INTEGRATIONS_DB

ROOT = "/api/care-directory"
OPS = "/api/ops/care-facilities"
CAMPUS = "IIT Hyderabad"
OTHER = "VNR VJIET"


def account(factory, account_id, role, campus=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name=f"Test {role}",
                         role=role, active=True, profile={"university": campus} if campus else {}, created_at=time.time(),
                         staff_campus=campus if role in ("CAMPUS_ADMIN", "COUNSELLOR") else ""))
        db.commit()


def student(client, codes, identifier="s@x.test", campus=CAMPUS):
    user, headers = register(client, codes, identifier)
    client.post("/api/campus/verification", headers=headers, json={"university": campus, "rollNumber": "R1"})
    return user, headers


def place(factory, name, kind="HOSPITAL", campus="", verified=0, active=True, **extra):
    """A row as the admin screens would leave it. ``verified`` is days ago; None = never checked."""
    with factory() as db:
        row = M.CareFacility(
            id=name.lower().replace(" ", "-"), kind=kind, name=name, departments=extra.pop("departments", []),
            address="Road 1", area="Kandi", pincode="502285", latitude=extra.pop("latitude", 17.59),
            longitude=extra.pop("longitude", 78.12), phone=extra.pop("phone", "+91 40 2301 6000"),
            emergency_24x7=extra.pop("emergency", False), hours_text="Mon–Sat 9–5", source="Called the front desk",
            source_url="", verified_on=None if verified is None else date.today() - timedelta(days=verified),
            campus=campus, active=active, created_at=time.time(), updated_at=time.time(), **extra)
        db.add(row)
        db.commit()
        return f"cf_{row.id}"


def names(response):
    assert response.status_code == 200, response.text
    return [item["name"] for item in response.json()["items"]]


@pytest.fixture(autouse=True)
def _no_hfr(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB, "abdm_hfr", {"enabled": False, "registry_url": "", "client_id": "", "client_secret": ""})


def test_signed_out_sees_only_verified_every_campus_places(harness):
    client, factory, codes = harness
    place(factory, "City Hospital")
    place(factory, "Never Checked", verified=None)
    place(factory, "Old Check", verified=setting("care_directory.verification_max_age_days") + 1)
    place(factory, "Closed Listing", active=False)
    place(factory, "Campus Clinic", kind="CLINIC", campus=CAMPUS)
    assert names(client.get(ROOT)) == ["City Hospital"]


def test_a_student_also_sees_their_own_campus_first_and_never_another_campus(harness):
    client, factory, codes = harness
    place(factory, "Apollo")
    place(factory, "Zeta 24x7", emergency=True)
    place(factory, "Campus Clinic", kind="CLINIC", campus=CAMPUS)
    place(factory, "Other Campus Clinic", kind="CLINIC", campus=OTHER)
    student(client, codes)
    assert names(client.get(ROOT)) == ["Campus Clinic", "Zeta 24x7", "Apollo"]
    assert "campus first" in client.get(ROOT).json()["rankedBy"]


def test_segments_and_no_invented_fields(harness):
    client, factory, codes = harness
    place(factory, "City Hospital")
    place(factory, "Blood Bank", kind="BLOOD_BANK")
    place(factory, "Med Plus", kind="PHARMACY")
    place(factory, "Campus 108", kind="AMBULANCE", phone="108", emergency=True)
    assert set(names(client.get(ROOT, params={"segment": "hospitals"}))) == {"City Hospital", "Blood Bank"}
    assert names(client.get(ROOT, params={"segment": "pharmacies"})) == ["Med Plus"]
    assert names(client.get(ROOT, params={"segment": "ambulance"})) == ["Campus 108"]
    assert client.get(ROOT, params={"segment": "beds"}).status_code == 422
    item = client.get(ROOT).json()["items"][0]
    assert set(item) == {"id", "source", "kind", "name", "departments", "address", "area", "pincode", "coordinates", "phone",
                         "emergency24x7", "hoursText", "verifiedOn", "sourceNote", "sourceUrl", "campus"}
    for word in ("bed", "rating", "review", "distance", "wait"):
        assert not any(word in key.lower() for key in item)


def test_empty_directory_is_empty_not_sample_data(harness):
    client, _, _ = harness
    body = client.get(ROOT, params={"segment": "ambulance"}).json()
    assert body["items"] == [] and body["total"] == 0


def test_detail_follows_the_same_rules(harness):
    client, factory, codes = harness
    shown = place(factory, "City Hospital", departments=["Emergency", "Orthopaedics"])
    hidden = place(factory, "Never Checked", verified=None)
    campus_only = place(factory, "Campus Clinic", kind="CLINIC", campus=CAMPUS)
    detail = client.get(f"{ROOT}/{shown}").json()
    assert detail["departments"] == ["Emergency", "Orthopaedics"]
    assert detail["coordinates"] == {"latitude": 17.59, "longitude": 78.12}
    assert detail["verifiedOn"] == date.today().isoformat() and detail["sourceNote"] == "Called the front desk"
    assert client.get(f"{ROOT}/{hidden}").status_code == 404
    assert client.get(f"{ROOT}/{campus_only}").status_code == 404
    assert client.get(f"{ROOT}/nonsense").status_code == 404
    student(client, codes)
    assert client.get(f"{ROOT}/{campus_only}").status_code == 200


def test_a_place_without_coordinates_has_none(harness):
    client, factory, _ = harness
    place(factory, "No Pin", latitude=None, longitude=None)
    assert client.get(ROOT).json()["items"][0]["coordinates"] is None


def partner(factory, kind="PHARMACY", licence_expiry=0.0, verified_at=0.0, active=True):
    account(factory, f"vendor-{kind.lower()}", "VENDOR")
    with factory() as db:
        db.add(M.ServiceProvider(id=f"p-{kind.lower()}", account_id=f"vendor-{kind.lower()}", kind=kind,
                                 legal_name=f"Partner {kind.title()}", licence_no="TS/123", licence_expiry=licence_expiry,
                                 address="Main Road", pincode="502285", latitude=17.6, longitude=78.1,
                                 serviceable_pincodes=[], open_hours="8 am – 10 pm", verified_at=verified_at,
                                 active=active, updated_at=time.time()))
        db.commit()


def test_partners_appear_only_once_verified_with_a_current_licence(harness):
    client, factory, codes = harness
    partner(factory, "PHARMACY")
    partner(factory, "LAB", verified_at=time.time())
    partner(factory, "CLINIC", verified_at=time.time(), licence_expiry=time.time() - 60)
    assert names(client.get(ROOT)) == []
    account(factory, "admin", "SUPER_ADMIN")
    headers = login(client, codes, "admin@example.test")
    listed = {p["id"]: p for p in client.get("/api/ops/care-directory/partners", headers=headers).json()["items"]}
    assert listed["p-pharmacy"]["hiddenBecause"] == "UNVERIFIED" and listed["p-clinic"]["hiddenBecause"] == "LICENCE"
    assert "p-lab" not in listed  # labs are booked through Lab tests, not visited from the directory
    r = client.patch("/api/ops/service-providers/p-pharmacy", headers=headers, json={"verified": True})
    assert r.status_code == 200, r.text
    items = client.get(ROOT, params={"segment": "pharmacies"}).json()["items"]
    assert [i["name"] for i in items] == ["Partner Pharmacy"]
    assert items[0]["source"] == "PARTNER" and items[0]["phone"] is None and items[0]["hoursText"] == "8 am – 10 pm"
    client.patch("/api/ops/service-providers/p-pharmacy", headers=headers, json={"verified": False})
    assert names(client.get(ROOT)) == []


def test_curation_roles_and_scope(harness):
    client, factory, codes = harness
    body = {"kind": "HOSPITAL", "name": "Area Hospital", "source": "Called the front desk", "phone": "040 2301 6000",
            "latitude": 17.5, "longitude": 78.3, "departments": ["Emergency", " Emergency ", "Paediatrics"],
            "verifiedOn": date.today().isoformat()}
    assert client.post(OPS, json=body).status_code == 401
    _, student_headers = student(client, codes)
    assert client.post(OPS, headers=student_headers, json=body).status_code == 403
    assert client.get(OPS, headers=student_headers).status_code == 403

    account(factory, "admin", "SUPER_ADMIN")
    admin = login(client, codes, "admin@example.test")
    every = client.post(OPS, headers=admin, json=body)
    assert every.status_code == 201, every.text
    assert every.json()["campus"] == "" and every.json()["departments"] == ["Emergency", "Paediatrics"]
    assert every.json()["status"] == "VERIFIED"

    account(factory, "campus-admin", "CAMPUS_ADMIN", CAMPUS)
    campus_headers = login(client, codes, "campus-admin@example.test")
    own = client.post(OPS, headers=campus_headers, json={**body, "name": "Campus Clinic", "kind": "CLINIC"})
    assert own.status_code == 201, own.text
    assert own.json()["campus"] == CAMPUS
    assert client.post(OPS, headers=campus_headers, json={**body, "campus": OTHER}).status_code == 403
    listed = client.get(OPS, headers=campus_headers).json()
    assert [i["name"] for i in listed["items"]] == ["Campus Clinic"] and listed["campus"] == CAMPUS
    # The every-campus row and another campus's rows are not the campus admin's to change.
    assert client.patch(f"{OPS}/{every.json()['id']}", headers=campus_headers, json={"name": "Renamed"}).status_code == 404
    assert client.delete(f"{OPS}/{every.json()['id']}", headers=campus_headers).status_code == 404
    assert client.patch(f"{OPS}/{own.json()['id']}", headers=campus_headers, json={"campus": ""}).status_code == 403
    changed = client.patch(f"{OPS}/{own.json()['id']}", headers=campus_headers, json={"hoursText": "24 hours", "emergency24x7": True})
    assert changed.status_code == 200, changed.text
    assert changed.json()["emergency24x7"] is True and changed.json()["campus"] == CAMPUS
    assert client.delete(f"{OPS}/{own.json()['id']}", headers=campus_headers).status_code == 200

    with factory() as db:
        actions = [(a.actor_id, a.action) for a in db.scalars(select(M.WorkflowAudit).order_by(M.WorkflowAudit.created_at)).all()
                   if a.action.startswith("CARE_FACILITY")]
    assert actions == [("admin", "CARE_FACILITY_CREATED"), ("campus-admin", "CARE_FACILITY_CREATED"),
                       ("campus-admin", "CARE_FACILITY_UPDATED"), ("campus-admin", "CARE_FACILITY_REMOVED")]


def test_a_campus_admin_with_no_campus_is_refused(harness):
    client, factory, codes = harness
    account(factory, "lost-admin", "CAMPUS_ADMIN")
    headers = login(client, codes, "lost-admin@example.test")
    assert client.get(OPS, headers=headers).status_code == 403
    assert client.post(OPS, headers=headers, json={"kind": "HOSPITAL", "name": "X Hospital", "source": "Called"}).status_code == 403


@pytest.mark.parametrize("change", [
    {"verifiedOn": (date.today() + timedelta(days=2)).isoformat()},
    {"latitude": 17.5},
    {"latitude": 0.0, "longitude": 0.0},
    {"phone": "call reception"},
    {"phone": "12"},
    {"sourceUrl": "http://example.test/insecure"},
    {"kind": "MORTUARY"},
    {"source": ""},
    {"beds": 12},
    {"rating": 4.5},
])
def test_curation_validation(harness, change):
    client, factory, codes = harness
    account(factory, "admin", "SUPER_ADMIN")
    headers = login(client, codes, "admin@example.test")
    body = {"kind": "HOSPITAL", "name": "Area Hospital", "source": "Called the front desk", **change}
    assert client.post(OPS, headers=headers, json=body).status_code == 422


def test_unverifying_a_place_takes_it_off_the_directory(harness):
    client, factory, codes = harness
    account(factory, "admin", "SUPER_ADMIN")
    headers = login(client, codes, "admin@example.test")
    created = client.post(OPS, headers=headers, json={"kind": "PHARMACY", "name": "Night Pharmacy", "source": "Visited",
                                                      "verifiedOn": date.today().isoformat()}).json()
    assert names(client.get(ROOT)) == ["Night Pharmacy"]
    assert client.patch(f"{OPS}/{created['id']}", headers=headers, json={"verifiedOn": None}).json()["status"] == "UNVERIFIED"
    assert names(client.get(ROOT)) == []
    stale = (date.today() - timedelta(days=setting("care_directory.verification_max_age_days") + 5)).isoformat()
    assert client.patch(f"{OPS}/{created['id']}", headers=headers, json={"verifiedOn": stale}).json()["status"] == "STALE"
    assert names(client.get(ROOT)) == []


def test_hfr_is_honestly_not_configured(harness):
    client, factory, codes = harness
    status = client.get(f"{ROOT}/registry").json()
    assert status["configured"] is False and status["state"] == "NOT_CONFIGURED"
    assert client.get(ROOT).json()["registry"]["state"] == "NOT_CONFIGURED"
    account(factory, "admin", "SUPER_ADMIN")
    headers = login(client, codes, "admin@example.test")
    search = client.get("/api/ops/care-directory/registry/search", headers=headers, params={"query": "Apollo"})
    assert search.status_code == 503 and search.json()["detail"]["code"] == "NOT_CONFIGURED"
    tested = client.post("/api/admin/integrations/abdm_hfr/test", headers=headers).json()
    assert tested["success"] is False and tested["state"] == "NOT_CONFIGURED"
    checks = {c["name"]: c for c in client.get("/api/ops/integration-health", headers=headers).json()["summary"]["checks"]}
    assert checks["abdm_hfr"]["status"] == "unavailable"


def test_hfr_with_credentials_still_returns_nothing_it_did_not_fetch(harness, monkeypatch):
    client, factory, codes = harness
    monkeypatch.setitem(INTEGRATIONS_DB, "abdm_hfr", {"enabled": True, "registry_url": "https://hfr.example.test",
                                                      "client_id": "id", "client_secret": "s3cret-value"})
    assert hfr_registry.status()["state"] == "NOT_BUILT"
    with pytest.raises(hfr_registry.RegistryUnavailable):
        hfr_registry.search_facilities("Apollo")
    account(factory, "admin", "SUPER_ADMIN")
    headers = login(client, codes, "admin@example.test")
    search = client.get("/api/ops/care-directory/registry/search", headers=headers)
    assert search.status_code == 503 and search.json()["detail"]["code"] == "NOT_BUILT"
    listed = client.get("/api/admin/integrations", headers=headers).json()["integrations"]["abdm_hfr"]
    assert "client_secret" not in listed and listed["client_secret_set"] is True
    assert "s3cret" not in str(client.get(f"{ROOT}/registry").json())
    assert client.get(ROOT).json()["items"] == []


def test_rule_l_platform_plane_and_no_commerce_grant():
    assert rule_l.TABLE_PLANES["care_facilities"] == rule_l.PLATFORM
    assert "care_facilities" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert "care_facilities" not in rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]
