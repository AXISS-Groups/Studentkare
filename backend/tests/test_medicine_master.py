"""Medicine master: salt search, same-composition alternatives, and who may see which.

The rules under test:
* the shop search finds a listing by a salt in its medicine, not only by name;
* alternatives are the same salts at the same strengths in the same form, cheapest first;
* a prescription-schedule listing returns no alternatives on the shop route, to anyone,
  and an OTC listing never leads to a prescription-only one;
* the full list is for pharmacy partners and prescribers only, with no admin bypass;
* master records are validated, and the prescription flag is derived from the schedule.
"""
import time

import pytest
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import workflow_models as M
from services.demo_seed import seed_demo_data


def seed(factory):
    with factory() as db:
        seed_demo_data(db)


def make_account(factory, account_id, role, identifier, partner_kind=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=identifier, channel="EMAIL", full_name="Staff", role=role,
                         active=True, profile={}, created_at=time.time(), partner_kind=partner_kind))
        db.commit()


def admin_headers(client, factory, codes):
    make_account(factory, "admin-1", "SUPER_ADMIN", "admin.one@example.test")
    return login(client, codes, "admin.one@example.test")


def ids(body):
    return [item["id"] for item in body["items"]]


# --- search ---------------------------------------------------------------

def test_shop_search_matches_salt_names(harness):
    client, factory, _ = harness
    seed(factory)
    body = client.get("/api/catalog?kind=product&query=paracetamol&limit=50").json()
    names = {item["name"] for item in body["items"]}
    # None of these has "paracetamol" in its name, brand or category.
    assert {"Pyrexa 500", "Feverin 500", "Calmol 500", "Pyrexa 650", "Temprol 650", "Pyrexa Syrup"} <= names
    assert "Allerfree 10" not in names
    by_name = {item["name"]: item for item in body["items"]}
    assert by_name["Pyrexa 650"]["composition"] == "Paracetamol 650 mg"
    assert by_name["Pyrexa 650"]["medicineId"] == "demo-med-pyrexa-650"

    # Part of a salt, any case, and the brand search still works.
    assert "Fungowell Cream" in {i["name"] for i in client.get("/api/catalog?query=CLOTRIM").json()["items"]}
    assert ids(client.get("/api/catalog?query=Temprol").json()) == ["demo-med-temprol-650-listing"]


def test_catalog_listing_without_a_medicine_has_no_composition(harness):
    client, factory, _ = harness
    seed(factory)
    items = client.get("/api/catalog?query=Sunscreen").json()["items"]
    assert items and items[0]["composition"] is None and items[0]["medicineId"] is None


# --- alternatives on the shop ----------------------------------------------

def test_otc_alternatives_are_same_salt_strength_and_form_cheapest_first(harness):
    client, factory, _ = harness
    seed(factory)
    body = client.get("/api/catalog/demo-med-pyrexa-500-listing/alternatives").json()
    assert body["restricted"] is False
    assert body["composition"] == "Paracetamol 500 mg"
    assert body["dosageForm"] == "TABLET"
    # 650 mg (other strength) and the syrup (other form) are not alternatives.
    assert ids(body) == ["demo-med-calmol-500-listing", "demo-med-feverin-500-listing"]
    prices = [item["pricePaise"] for item in body["items"]]
    assert prices == sorted(prices)


def test_multi_salt_composition_matches_in_any_order(harness):
    client, factory, _ = harness
    seed(factory)
    assert ids(client.get("/api/catalog/demo-med-hydrasol-ors-listing/alternatives").json()) == [
        "demo-med-rehydra-ors-listing"]
    # A same-salts medicine typed in another order is still the same composition.
    from core.medicine_composition import composition_key
    with factory() as db:
        key = composition_key([("Simethicone", 50, "mg"), ("Magnesium Hydroxide", 250, "mg"),
                               ("Aluminium Hydroxide", 250, "mg")])
        assert db.get(M.Medicine, "demo-med-gastrolin").composition_key == key


def test_prescription_alternatives_are_never_returned_on_the_shop(harness):
    client, factory, codes = harness
    seed(factory)
    for path in ("/api/catalog/demo-med-azimax-500-listing/alternatives",
                 "/api/catalog/demo-med-cefikare-200-listing/alternatives"):
        anonymous = client.get(path).json()
        assert anonymous["restricted"] is True and anonymous["items"] == []
    register(client, codes, "student.rx@example.test")
    signed_in = client.get("/api/catalog/demo-med-pantokare-40-listing/alternatives").json()
    assert signed_in["restricted"] is True and signed_in["items"] == []
    assert "Acipan" not in str(signed_in)


def test_an_otc_listing_never_leads_to_a_prescription_only_one(harness):
    client, factory, _ = harness
    seed(factory)
    with factory() as db:
        # Same medicine, but this listing is marked prescription-only: it must not appear.
        db.add(M.CatalogEntry(id="rx-flagged-para", provider_id="demo-vendor", kind="product", name="Rx-flagged",
                              brand="B", category="medicines", description="d" * 10, pack="p", price_paise=1,
                              stock=5, active=True, requires_prescription=True, preparation="",
                              medicine_id="demo-med-calmol-500"))
        db.commit()
    assert "rx-flagged-para" not in ids(client.get("/api/catalog/demo-med-pyrexa-500-listing/alternatives").json())


def test_inactive_listings_and_medicines_are_left_out(harness):
    client, factory, _ = harness
    seed(factory)
    with factory() as db:
        db.get(M.CatalogEntry, "demo-med-calmol-500-listing").active = False
        db.get(M.Medicine, "demo-med-feverin-500").active = False
        db.commit()
    assert ids(client.get("/api/catalog/demo-med-pyrexa-500-listing/alternatives").json()) == []
    assert client.get("/api/catalog/demo-med-calmol-500-listing/alternatives").status_code == 404
    unlinked = client.get("/api/catalog/demo-sunscreen/alternatives").json()
    assert unlinked["items"] == [] and unlinked["composition"] is None


# --- pharmacist / prescriber route ------------------------------------------

def test_work_alternatives_include_prescription_items_for_pharmacy_and_prescriber(harness):
    client, factory, codes = harness
    seed(factory)
    make_account(factory, "pharm-1", "VENDOR", "pharm.one@example.test", partner_kind="PHARMACY")
    make_account(factory, "doc-1", "NMC_DOCTOR", "doc.one@example.test")
    path = "/api/work/catalog/demo-med-azimax-500-listing/alternatives"
    for identifier in ("pharm.one@example.test", "doc.one@example.test"):
        login(client, codes, identifier)
        body = client.get(path).json()
        assert body["schedule"] == "H"
        assert ids(body) == ["demo-med-zithrocare-500-listing"]
        assert body["items"][0]["requiresPrescription"] is True


@pytest.mark.parametrize(("role", "partner_kind"), [
    ("STUDENT", ""), ("VENDOR", "LAB"), ("VENDOR", "CLINIC"), ("VENDOR", ""), ("SUPER_ADMIN", ""),
    ("CAMPUS_ADMIN", ""),
])
def test_work_alternatives_refuse_everyone_else(harness, role, partner_kind):
    client, factory, codes = harness
    seed(factory)
    make_account(factory, "other-1", role, "other.one@example.test", partner_kind=partner_kind)
    login(client, codes, "other.one@example.test")
    assert client.get("/api/work/catalog/demo-med-azimax-500-listing/alternatives").status_code == 403


def test_work_alternatives_need_a_session(harness):
    client, factory, _ = harness
    seed(factory)
    assert client.get("/api/work/catalog/demo-med-azimax-500-listing/alternatives").status_code == 401


# --- super admin: master records -------------------------------------------

VALID = {"name": "Test Paracetamol 500", "ingredients": [{"salt": "Paracetamol", "strengthValue": 500, "strengthUnit": "mg"}],
         "dosageForm": "TABLET", "pack": "Strip of 10 tablets", "manufacturer": "Test Pharma", "schedule": "OTC"}


@pytest.mark.parametrize("change", [
    {"schedule": "Z"},
    {"schedule": "otc"},
    {"dosageForm": "PILL"},
    {"ingredients": []},
    {"ingredients": [{"salt": "Paracetamol", "strengthValue": 0, "strengthUnit": "mg"}]},
    {"ingredients": [{"salt": "Paracetamol", "strengthValue": -5, "strengthUnit": "mg"}]},
    {"ingredients": [{"salt": "Paracetamol", "strengthValue": 500, "strengthUnit": "spoons"}]},
    {"ingredients": [{"salt": "<script>", "strengthValue": 500, "strengthUnit": "mg"}]},
    {"ingredients": [{"salt": "Paracetamol", "strengthValue": 500, "strengthUnit": "mg"},
                     {"salt": " paracetamol ", "strengthValue": 250, "strengthUnit": "mg"}]},
    {"requiresPrescription": False},   # derived from the schedule, never sent
    {"name": ""},
])
def test_admin_create_validates(harness, change):
    client, factory, codes = harness
    headers = admin_headers(client, factory, codes)
    assert client.post("/api/ops/medicines", json={**VALID, **change}, headers=headers).status_code == 422


def test_admin_create_derives_prescription_from_schedule(harness):
    client, factory, codes = harness
    headers = admin_headers(client, factory, codes)
    otc = client.post("/api/ops/medicines", json=VALID, headers=headers)
    assert otc.status_code == 201, otc.text
    assert otc.json()["requiresPrescription"] is False
    assert otc.json()["composition"] == "Paracetamol 500 mg"
    for schedule in ("H", "H1", "X"):
        body = client.post("/api/ops/medicines", json={**VALID, "schedule": schedule}, headers=headers).json()
        assert body["requiresPrescription"] is True, schedule
    listed = client.get("/api/ops/medicines?query=paracetamol", headers=headers).json()
    assert listed["total"] == 4


def test_master_endpoints_are_super_admin_only(harness):
    client, factory, codes = harness
    seed(factory)
    make_account(factory, "pharm-2", "VENDOR", "pharm.two@example.test", partner_kind="PHARMACY")
    headers = login(client, codes, "pharm.two@example.test")
    assert client.post("/api/ops/medicines", json=VALID, headers=headers).status_code == 403
    assert client.get("/api/ops/medicines", headers=headers).status_code == 403
    assert client.patch("/api/ops/medicines/demo-med-calmol-500", json={"schedule": "OTC"},
                        headers=headers).status_code == 403
    assert client.put("/api/ops/catalog/demo-sunscreen/medicine", json={"medicineId": "demo-med-calmol-500"},
                      headers=headers).status_code == 403


def test_admin_edit_recomputes_composition_and_raises_listing_prescription(harness):
    client, factory, codes = harness
    seed(factory)
    headers = admin_headers(client, factory, codes)
    assert client.patch("/api/ops/medicines/demo-med-calmol-500", json={}, headers=headers).status_code == 422
    assert client.patch("/api/ops/medicines/demo-med-calmol-500", json={"schedule": None},
                        headers=headers).status_code == 422
    assert client.patch("/api/ops/medicines/missing", json={"pack": "x"}, headers=headers).status_code == 404

    # A new strength makes it a different composition: no longer an alternative to Pyrexa 500.
    edited = client.patch("/api/ops/medicines/demo-med-calmol-500", headers=headers, json={
        "ingredients": [{"salt": "Paracetamol", "strengthValue": 650, "strengthUnit": "mg"}]})
    assert edited.status_code == 200 and edited.json()["composition"] == "Paracetamol 650 mg"
    assert "demo-med-calmol-500-listing" not in ids(
        client.get("/api/catalog/demo-med-pyrexa-500-listing/alternatives").json())
    assert "demo-med-calmol-500-listing" in ids(
        client.get("/api/catalog/demo-med-pyrexa-650-listing/alternatives").json())

    # Moving to a prescription schedule marks its listings prescription-only...
    assert client.patch("/api/ops/medicines/demo-med-calmol-500", json={"schedule": "H"},
                        headers=headers).json()["requiresPrescription"] is True
    with factory() as db:
        assert db.get(M.CatalogEntry, "demo-med-calmol-500-listing").requires_prescription is True
    # ...and moving back does not quietly clear that mark (fail closed).
    assert client.patch("/api/ops/medicines/demo-med-calmol-500", json={"schedule": "OTC"},
                        headers=headers).json()["requiresPrescription"] is False
    with factory() as db:
        assert db.get(M.CatalogEntry, "demo-med-calmol-500-listing").requires_prescription is True


def test_admin_links_a_product_listing(harness):
    client, factory, codes = harness
    seed(factory)
    headers = admin_headers(client, factory, codes)
    put = lambda item, medicine: client.put(f"/api/ops/catalog/{item}/medicine",  # noqa: E731
                                            json={"medicineId": medicine}, headers=headers)
    assert put("demo-full-body", "demo-med-calmol-500").status_code == 422      # a lab package
    assert put("demo-sunscreen", "no-such-medicine").status_code == 422
    assert put("no-such-item", "demo-med-calmol-500").status_code == 404
    assert client.put("/api/ops/catalog/demo-sunscreen/medicine", json={}, headers=headers).status_code == 422

    linked = put("demo-first-aid", "demo-med-woundkare")
    assert linked.status_code == 200 and linked.json()["requiresPrescription"] is False
    assert "demo-first-aid" in ids(client.get("/api/catalog/demo-med-iodisept-listing/alternatives").json())

    # Linking to a prescription medicine makes the listing prescription-only.
    rx = put("demo-eye-drops", "demo-med-acipan-40")
    assert rx.json()["requiresPrescription"] is True
    assert put("demo-eye-drops", None).json() == {"itemId": "demo-eye-drops", "medicineId": None,
                                                 "requiresPrescription": True}

    with factory() as db:
        db.get(M.Medicine, "demo-med-clozem").active = False
        db.commit()
    assert put("demo-moisturiser", "demo-med-clozem").status_code == 422


def test_admin_create_listing_with_a_medicine(harness):
    client, factory, codes = harness
    seed(factory)
    headers = admin_headers(client, factory, codes)
    body = {"providerId": "demo-vendor", "kind": "product", "name": "Another Azithromycin", "brand": "Test",
            "category": "medicines", "description": "A test listing for linking.", "pack": "Strip of 3",
            "pricePaise": 5000, "stock": 3, "requiresPrescription": False, "medicineId": "demo-med-azimax-500"}
    created = client.post("/api/ops/catalog", json=body, headers=headers)
    assert created.status_code == 201, created.text
    assert created.json()["requiresPrescription"] is True
    assert created.json()["composition"] == "Azithromycin 500 mg"
    assert client.post("/api/ops/catalog", json={**body, "kind": "lab", "medicineId": "demo-med-azimax-500"},
                       headers=headers).status_code == 422


def test_medicine_routes_run_as_the_commerce_session():
    from services import medicine_master
    from services.commerce_session import commerce_db

    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)

    routes = {f"{m} {r.path}": r for r in medicine_master.router.routes for m in r.methods}
    assert set(routes) == set(medicine_master.MEDICINE_COMMERCE_PATHS)
    for key, route in routes.items():
        assert commerce_db in set(deps(route.dependant)), f"{key} does not use commerce_db"


def test_demo_medicines_are_marked_demo(harness):
    _, factory, _ = harness
    seed(factory)
    with factory() as db:
        medicines = db.query(M.Medicine).all()
        assert len(medicines) == 30
        assert all(m.source == "DEMO_SEED" and "(demo)" in m.manufacturer for m in medicines)
        assert all(m.requires_prescription == (m.schedule != "OTC") for m in medicines)
        listings = db.query(M.CatalogEntry).filter(M.CatalogEntry.medicine_id.isnot(None)).all()
        assert len(listings) == 30
        assert all("Sample development entry" in item.description for item in listings)
