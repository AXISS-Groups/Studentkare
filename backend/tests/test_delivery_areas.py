"""Area-wise delivery: one list of areas per pincode, and providers that serve part of a pincode."""
import time

import pytest
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services import delivery_areas

HOME = "500001"
SERVED = "500072"

# The two header sets the directory has been published with.
NEW_CSV = """CircleName,RegionName,DivisionName,OfficeName,Pincode,OfficeType,Delivery,District,StateName,Latitude,Longitude
Telangana Circle,Hyderabad City Region,Hyderabad South East Division,Kukatpally S.O,500072,PO,Delivery,HYDERABAD,TELANGANA,17.49,78.39
Telangana Circle,Hyderabad City Region,Hyderabad South East Division,KPHB Colony S.O,500072,PO,Delivery,HYDERABAD,TELANGANA,17.49,78.39
Telangana Circle,Hyderabad City Region,Hyderabad South East Division,Kukatpally  S.O,500072,PO,Delivery,HYDERABAD,TELANGANA,NA,NA
Telangana Circle,Hyderabad City Region,Hyderabad GPO Division,Hyderabad G.P.O.,500001,PO,Delivery,HYDERABAD,TELANGANA,17.38,78.47
Karnataka Circle,Bengaluru HQ Region,Bengaluru East Division,Indiranagar S.O,560038,PO,Delivery,BENGALURU URBAN,KARNATAKA,12.97,77.64
Telangana Circle,Hyderabad City Region,Somewhere,Broken Row B.O,5000,PO,Delivery,HYDERABAD,TELANGANA,NA,NA
"""
OLD_CSV = """officename,pincode,officeType,Deliverystatus,divisionname,regionname,circlename,Taluk,Districtname,statename
Ada B.O,504293,B.O,Delivery,Adilabad,Hyderabad,Andhra Pradesh,Asifabad,Adilabad,TELANGANA
Achalapur B.O,504273,B.O,Delivery,Adilabad,Hyderabad,Andhra Pradesh,Asifabad,Adilabad,TELANGANA
"""


@pytest.fixture(autouse=True)
def _mock_payments(monkeypatch):
    monkeypatch.delenv("PAYMENT_PROVIDER", raising=False)
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "test-secret")


def load(factory, text=NEW_CSV, **kwargs):
    with factory() as db:
        result = delivery_areas.load_directory(db, text.splitlines(), **kwargs)
        db.commit()
    return result


def seed_seller(factory, *, areas=None, pincodes=(SERVED,)):
    with factory() as db:
        db.add(M.Account(id="prov", identifier="prov@example.test", channel="EMAIL", full_name="Pharmacy",
                         role="VENDOR", active=True, profile={}, created_at=time.time()))
        db.add(M.ServiceProvider(id="prov-pharmacy", account_id="prov", kind="PHARMACY", legal_name="Pharmacy",
                                 pincode=HOME, serviceable_pincodes=list(pincodes), serviceable_areas=areas or {},
                                 delivery_available=True, pickup_available=True, active=True, updated_at=time.time()))
        db.add(M.CatalogEntry(id="item", provider_id="prov", kind="product", name="Thermometer", brand="B",
                              category="devices", description="d", pack="1", price_paise=25000, mrp_paise=25000,
                              stock=5, active=True, requires_prescription=False, preparation=""))
        db.commit()


def order(client, headers, pincode=SERVED, area="", mode="delivery", key="k-00000001"):
    delivery = {"mode": mode, "city": "Hyderabad", "pincode": pincode, "area": area,
                "address": "Flat 4, Road 2, near the park" if mode == "delivery" else ""}
    return client.post("/api/orders", headers={**headers, "Idempotency-Key": key},
                       json={"items": [{"id": "item", "quantity": 1}], "delivery": delivery})


def validate(client, headers, pincode=SERVED, area=""):
    return client.post("/api/cart/validate", headers=headers,
                       json={"items": [{"id": "item", "quantity": 1}], "pincode": pincode, "area": area}).json()


# ── The directory ─────────────────────────────────────────────────────────────

def test_office_names_become_area_names():
    assert delivery_areas.area_name("Kukatpally S.O") == "Kukatpally"
    assert delivery_areas.area_name("Ada B.O") == "Ada"
    assert delivery_areas.area_name("Mancherial H.O") == "Mancherial"
    assert delivery_areas.area_name("Hyderabad G.P.O.") == "Hyderabad"
    assert delivery_areas.area_name("  KPHB   Colony SO ") == "KPHB Colony"
    assert delivery_areas.area_name("Solo") == "Solo"


def test_loading_reads_both_header_sets_dedupes_and_counts_bad_rows(harness):
    _client, factory, _codes = harness
    assert load(factory) == {"pincodes": 3, "areas": 4, "skippedRows": 1}
    assert load(factory, OLD_CSV) == {"pincodes": 2, "areas": 2, "skippedRows": 0}
    with factory() as db:
        assert delivery_areas.areas_for(db, SERVED) == ["KPHB Colony", "Kukatpally"]
        assert delivery_areas.areas_for(db, "504293") == ["Ada"]
        assert delivery_areas.place_for(db, SERVED) == {"district": "Hyderabad", "state": "Telangana"}
        assert delivery_areas.directory_status(db)["pincodes"] == 5


def test_reloading_replaces_a_pincodes_areas_and_can_keep_one_state(harness):
    _client, factory, _codes = harness
    assert load(factory, state="telangana") == {"pincodes": 2, "areas": 3, "skippedRows": 1}
    load(factory, NEW_CSV.replace("KPHB Colony S.O", "Vivekananda Nagar S.O"))
    with factory() as db:
        assert delivery_areas.areas_for(db, SERVED) == ["Kukatpally", "Vivekananda Nagar"]


def test_the_areas_endpoint_serves_the_list_to_a_signed_in_user(harness):
    client, factory, codes = harness
    load(factory)
    assert client.get(f"/api/pincodes/{SERVED}/areas").status_code == 401
    _user, headers = register(client, codes, "buyer@x.test")
    body = client.get(f"/api/pincodes/{SERVED}/areas", headers=headers).json()
    assert body["areas"] == ["KPHB Colony", "Kukatpally"] and body["district"] == "Hyderabad"
    assert "Department of Posts" in body["source"]
    assert client.get("/api/pincodes/999999/areas", headers=headers).json()["areas"] == []
    assert client.get("/api/pincodes/12/areas", headers=headers).status_code == 422


# ── Delivery by area ──────────────────────────────────────────────────────────

def test_a_pincode_with_no_areas_listed_is_served_in_full(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    load(factory)
    seed_seller(factory)
    check = validate(client, headers)
    assert check["serviceable"] is True and check["deliveryRefusal"] == ""
    assert order(client, headers).status_code == 201


def test_a_listed_area_is_delivered_to_whatever_its_case_or_spacing(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    load(factory)
    seed_seller(factory, areas={SERVED: ["Kukatpally"]})
    assert validate(client, headers, area="  kukatpally ")["serviceable"] is True
    res = order(client, headers, area="Kukatpally")
    assert res.status_code == 201
    with factory() as db:
        assert db.get(M.Order, res.json()["id"]).delivery["area"] == "Kukatpally"


def test_an_area_the_provider_does_not_list_is_refused_and_nothing_is_ordered(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "buyer@x.test")
    load(factory)
    seed_seller(factory, areas={SERVED: ["Kukatpally"]})
    check = validate(client, headers, area="KPHB Colony")
    assert check["serviceable"] is False and check["deliveryRefusal"] == "NO_AREA"
    assert "does not deliver to this area" in check["serviceabilityNote"]
    res = order(client, headers, area="KPHB Colony")
    assert res.status_code == 409 and res.json()["detail"]["values"] == {"reason": "NO_AREA"}
    with factory() as db:
        assert db.query(M.Order).filter(M.Order.account_id == user["id"]).count() == 0
        assert db.get(M.CatalogEntry, "item").stock == 5


def test_where_areas_are_listed_the_student_must_say_which_area(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    load(factory)
    seed_seller(factory, areas={SERVED: ["Kukatpally"]})
    check = validate(client, headers)
    assert check["serviceable"] is False and check["deliveryRefusal"] == "AREA_NEEDED"
    assert check["serviceabilityNote"].startswith("Choose your area")
    assert order(client, headers).json()["detail"]["values"] == {"reason": "AREA_NEEDED"}


def test_an_unlisted_pincode_is_still_refused_and_pickup_is_never_checked(harness):
    client, factory, codes = harness
    _user, headers = register(client, codes, "buyer@x.test")
    load(factory)
    seed_seller(factory, areas={SERVED: ["Kukatpally"]})
    assert validate(client, headers, pincode="560038", area="Indiranagar")["deliveryRefusal"] == "NO_PINCODE"
    assert order(client, headers, area="KPHB Colony", mode="pickup").status_code == 201


# ── Ops: setting where a provider delivers ────────────────────────────────────

def _admin(client, codes, factory):
    register(client, codes, "admin@x.test")
    with factory() as db:
        db.query(M.Account).filter(M.Account.identifier == "admin@x.test").update({"role": "SUPER_ADMIN"})
        db.commit()
    return login(client, codes, "admin@x.test")


def test_ops_can_set_pincodes_and_areas_and_names_must_come_from_the_directory(harness):
    client, factory, codes = harness
    load(factory)
    seed_seller(factory, pincodes=())
    headers = _admin(client, codes, factory)
    url = "/api/ops/service-providers/prov-pharmacy"

    saved = client.patch(url, headers=headers, json={"serviceablePincodes": [SERVED],
                                                    "serviceableAreas": {SERVED: ["kukatpally", "Kukatpally"]}})
    assert saved.status_code == 200, saved.text
    assert saved.json()["serviceablePincodes"] == [SERVED]
    assert saved.json()["serviceableAreas"] == {SERVED: ["Kukatpally"]}     # the directory's spelling, once

    typo = client.patch(url, headers=headers, json={"serviceableAreas": {SERVED: ["Kukatpaly"]}})
    assert typo.status_code == 422 and "not an area of pincode" in typo.json()["detail"]
    unserved = client.patch(url, headers=headers, json={"serviceableAreas": {"560038": ["Indiranagar"]}})
    assert unserved.status_code == 422 and "Add pincode 560038" in unserved.json()["detail"]
    unloaded = client.patch(url, headers=headers, json={"serviceablePincodes": [SERVED, "110001"],
                                                       "serviceableAreas": {"110001": ["Connaught Place"]}})
    assert unloaded.status_code == 422 and "No areas are loaded" in unloaded.json()["detail"]
    with factory() as db:
        row = db.get(M.ServiceProvider, "prov-pharmacy")
        assert row.serviceable_pincodes == [SERVED] and row.serviceable_areas == {SERVED: ["Kukatpally"]}

    # Dropping a pincode drops its areas; an empty area list means the whole pincode.
    dropped = client.patch(url, headers=headers, json={"serviceablePincodes": []})
    assert dropped.json()["serviceablePincodes"] == [] and dropped.json()["serviceableAreas"] == {}
    whole = client.patch(url, headers=headers, json={"serviceablePincodes": [SERVED], "serviceableAreas": {SERVED: []}})
    assert whole.json()["serviceableAreas"] == {}


def test_only_a_super_admin_can_change_where_a_provider_delivers(harness):
    client, factory, codes = harness
    seed_seller(factory)
    _user, headers = register(client, codes, "buyer@x.test")
    res = client.patch("/api/ops/service-providers/prov-pharmacy", headers=headers, json={"serviceablePincodes": ["500002"]})
    assert res.status_code == 403
