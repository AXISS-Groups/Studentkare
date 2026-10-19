"""Medicine master: composition matching, substitutes, admin gate, validation, Rule L."""
import time

import pytest
from sqlalchemy import select
from test_rule_l import pg_db  # noqa: F401 — fixture: a fresh Postgres database migrated to head
from test_workflow_api import harness, login, register  # noqa: F401 — harness is a fixture

from core import medicine_master as MM
from core import rule_l
from core import workflow_models as M

# --- pure normalisation ---------------------------------------------------------


def key(*ingredients):
    return MM.composition_key([(MM.salt_key(s), *MM.canonical_strength(v, u)) for s, v, u in ingredients])


def test_single_salt_key_is_canonical():
    assert key(("Paracetamol", "500", "mg")) == "paracetamol=500mg"
    assert key(("  PARACETAMOL ", "0.5", "g")) == key(("paracetamol", "500", "mg"))
    assert key(("Salbutamol", "100", "mcg/dose")) == key(("salbutamol", "0.1", "mg/dose"))
    assert key(("Paracetamol", "250", "mg/5ml")) == key(("paracetamol", "50", "mg/ml"))
    assert key(("Paracetamol", "500.0", "mg")) == key(("paracetamol", "500", "mg"))


def test_multi_salt_key_is_order_insensitive():
    a = key(("Amoxicillin", "500", "mg"), ("Clavulanic Acid", "125", "mg"))
    b = key(("clavulanic  acid", "125", "MG"), ("amoxicillin", "500", "mg"))
    assert a == b


def test_different_strength_or_salt_set_is_a_different_key():
    combo = key(("Amoxicillin", "500", "mg"), ("Clavulanic Acid", "125", "mg"))
    assert combo != key(("Amoxicillin", "500", "mg"))
    assert combo != key(("Amoxicillin", "875", "mg"), ("Clavulanic Acid", "125", "mg"))
    assert key(("Paracetamol", "500", "mg")) != key(("Paracetamol", "650", "mg"))
    assert key(("Hydrocortisone", "1", "%w/w")) != key(("Hydrocortisone", "1", "%w/v"))
    assert key(("Paracetamol", "500", "mg")) != key(("Acetaminophen", "500", "mg"))   # no synonym guessing


@pytest.mark.parametrize("value,unit", [("0", "mg"), ("-1", "mg"), ("1e3", "mg"), ("1.23456", "mg"), ("500", "mgs"),
                                        ("500", "tablets"), ("", "mg"), ("abc", "mg")])
def test_bad_strengths_are_refused(value, unit):
    with pytest.raises(ValueError):
        MM.canonical_strength(value, unit)


def test_duplicate_salt_is_refused():
    with pytest.raises(ValueError):
        key(("Paracetamol", "500", "mg"), ("paracetamol", "500", "mg"))


@pytest.mark.parametrize("name", ["a", "Para=cetamol", "Para;cetamol", "Para|cetamol", "_x", "x" * 121])
def test_bad_salt_names_are_refused(name):
    with pytest.raises(ValueError):
        MM.validate_salt(name)


def test_schedule_classes_match_prescription_items():
    from services.clinical_api import REGISTER_CLASSES, SCHEDULE_CLASSES
    assert set(MM.SCHEDULE_CLASSES) == SCHEDULE_CLASSES
    assert REGISTER_CLASSES <= MM.PRESCRIPTION_SCHEDULES
    assert "OTC" not in MM.PRESCRIPTION_SCHEDULES


# --- Rule L ---------------------------------------------------------------------


@pytest.mark.parametrize("table", ["care_medicines", "care_medicine_ingredients"])
def test_medicine_tables_are_commerce(table):
    assert rule_l.TABLE_PLANES[table] == rule_l.COMMERCE
    assert table in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]
    assert table not in rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]


def test_commerce_may_replace_a_composition():
    assert "DELETE" in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]["care_medicine_ingredients"].privileges
    assert "DELETE" not in rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]["care_medicines"].privileges


def test_every_medicine_route_uses_the_commerce_session():
    from services.commerce_session import commerce_db
    from services.medicine_master_api import MEDICINE_COMMERCE_PATHS, router

    def deps(dependant):
        for dep in dependant.dependencies:
            yield dep.call
            yield from deps(dep)

    routes = {f"{m} {r.path}": r for r in router.routes for m in r.methods}
    assert set(routes) == set(MEDICINE_COMMERCE_PATHS)
    for name, route in routes.items():
        assert commerce_db in set(deps(route.dependant)), f"{name} does not use commerce_db"


def test_medicine_module_reads_no_clinical_table():
    import inspect

    from services import medicine_master_api
    source = inspect.getsource(medicine_master_api)
    clinical_models = {name for name, cls in vars(M).items()
                       if isinstance(cls, type) and getattr(cls, "__tablename__", None) in rule_l.tables_in(rule_l.CLINICAL)}
    used = {name for name in clinical_models if f"M.{name}" in source}
    assert used == set()


# --- API ------------------------------------------------------------------------


def _account(db, account_id, role, active=True):
    db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name=account_id,
                     role=role, active=active, profile={}, created_at=time.time()))


def _listing(db, item_id, provider="vendor", price=1000, stock=5, active=True, kind="product", medicine_id=None,
             rx=False):
    db.add(M.CatalogEntry(id=item_id, provider_id=provider, kind=kind, name=item_id, brand="B", category="medicines",
                          description="sample listing", pack="Strip of 10", price_paise=price, mrp_paise=price,
                          stock=stock, active=active, requires_prescription=rx, preparation="",
                          medicine_id=medicine_id))


@pytest.fixture
def admin(harness):  # noqa: F811
    client, factory, codes = harness
    with factory() as db:
        _account(db, "root", "SUPER_ADMIN")
        _account(db, "vendor", "VENDOR")
        _account(db, "vendor2", "VENDOR")
        _account(db, "gone", "VENDOR", active=False)
        db.commit()
    headers = login(client, codes, "root@example.test")
    return client, factory, codes, headers


def _create(client, headers, brand, ingredients, form="TABLET", schedule="OTC", pack="Strip of 10",
            manufacturer="Maker Ltd", expect=201):
    response = client.post("/api/ops/medicines", headers=headers, json={
        "brandName": brand, "manufacturer": manufacturer, "form": form, "pack": pack, "scheduleClass": schedule,
        "ingredients": [{"salt": s, "strength": v, "unit": u} for s, v, u in ingredients]})
    assert response.status_code == expect, response.text
    return response.json()


def _link(client, headers, item_id, medicine_id, expect=200):
    response = client.put(f"/api/ops/catalog/{item_id}/medicine", headers=headers, json={"medicineId": medicine_id})
    assert response.status_code == expect, response.text
    return response.json()


PARA = [("Paracetamol", "500", "mg")]
COAMOX = [("Amoxicillin", "500", "mg"), ("Clavulanic Acid", "125", "mg")]


def test_create_and_read_a_master(admin):
    client, factory, _codes, headers = admin
    made = _create(client, headers, "Brand P", PARA, form="tablet", schedule="otc")
    assert made["form"] == "TABLET" and made["scheduleClass"] == "OTC"
    assert made["composition"] == [{"salt": "Paracetamol", "strength": "500", "unit": "mg"}]
    assert made["requiresPrescriberApproval"] is False
    assert client.get(f"/api/ops/medicines/{made['id']}", headers=headers).json()["id"] == made["id"]
    found = client.get("/api/ops/medicines?query=paracet", headers=headers).json()
    assert [i["id"] for i in found["items"]] == [made["id"]]
    with factory() as db:
        assert db.scalar(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "MEDICINE_CREATED"))


@pytest.mark.parametrize("change", [
    {"form": "PILL"}, {"scheduleClass": "G"}, {"scheduleClass": "H2"}, {"ingredients": []},
    {"ingredients": [{"salt": "Paracetamol", "strength": "500", "unit": "tabs"}]},
    {"ingredients": [{"salt": "Paracetamol", "strength": "0", "unit": "mg"}]},
    {"ingredients": [{"salt": "Paracetamol", "strength": "five", "unit": "mg"}]},
    {"ingredients": [{"salt": "Paracetamol", "strength": "500", "unit": "mg"},
                     {"salt": "PARACETAMOL", "strength": "650", "unit": "mg"}]},
    {"ingredients": [{"salt": "x=1", "strength": "500", "unit": "mg"}]},
    {"ingredients": [{"salt": f"Salt {i}", "strength": "1", "unit": "mg"} for i in range(11)]},
    {"unexpected": True},
])
def test_validation(admin, change):
    client, _factory, _codes, headers = admin
    body = {"brandName": "Brand", "manufacturer": "Maker", "form": "TABLET", "pack": "10", "scheduleClass": "OTC",
            "ingredients": [{"salt": "Paracetamol", "strength": "500", "unit": "mg"}], **change}
    assert client.post("/api/ops/medicines", headers=headers, json=body).status_code == 422


def test_duplicate_master_is_refused(admin):
    client, _factory, _codes, headers = admin
    _create(client, headers, "Brand P", PARA)
    _create(client, headers, "brand p", [("paracetamol", "0.5", "g")], expect=409)
    _create(client, headers, "Brand P", PARA, pack="Strip of 15")       # another pack is another product


def test_only_super_admin_manages_the_master(harness):  # noqa: F811
    client, factory, codes = harness
    with factory() as db:
        _account(db, "vendor", "VENDOR")
        _account(db, "doc", "NMC_DOCTOR")
        _account(db, "campus", "CAMPUS_ADMIN")
        db.add(M.Medicine(id="med", brand_name="B", manufacturer="M", form="TABLET", pack="10", schedule_class="OTC",
                          composition_key="paracetamol=500mg", active=True, created_at=0, updated_at=0))
        _listing(db, "item")
        db.commit()
    body = {"brandName": "Brand", "manufacturer": "Maker", "form": "TABLET", "pack": "10", "scheduleClass": "OTC",
            "ingredients": [{"salt": "Paracetamol", "strength": "500", "unit": "mg"}]}
    assert client.get("/api/ops/medicines").status_code == 401
    assert client.post("/api/ops/medicines", json=body).status_code in (401, 403)
    _, student = register(client, codes, "student@example.test")
    for headers in (student, login(client, codes, "vendor@example.test"), login(client, codes, "doc@example.test"),
                    login(client, codes, "campus@example.test")):
        assert client.get("/api/ops/medicines", headers=headers).status_code == 403
        assert client.post("/api/ops/medicines", headers=headers, json=body).status_code == 403
        assert client.patch("/api/ops/medicines/med", headers=headers, json={"active": False}).status_code == 403
        assert client.put("/api/ops/catalog/item/medicine", headers=headers, json={"medicineId": "med"}).status_code == 403
    with factory() as db:
        assert db.get(M.CatalogEntry, "item").medicine_id is None
        assert db.get(M.Medicine, "med").active is True
        assert len(db.scalars(select(M.Medicine)).all()) == 1


def test_linking_rules(admin):
    client, factory, _codes, headers = admin
    otc = _create(client, headers, "Brand P", PARA)
    rx = _create(client, headers, "Brand C", COAMOX, schedule="H")
    with factory() as db:
        _listing(db, "item")
        _listing(db, "lab-test", kind="lab")
        db.commit()
    _link(client, headers, "missing", otc["id"], expect=404)
    _link(client, headers, "item", "missing", expect=404)
    _link(client, headers, "lab-test", otc["id"], expect=422)
    assert _link(client, headers, "item", otc["id"])["requiresPrescription"] is False
    # Linking to a schedule H master makes the listing prescription-only...
    assert _link(client, headers, "item", rx["id"])["requiresPrescription"] is True
    # ...and unlinking, or relinking to OTC, never loosens it.
    assert _link(client, headers, "item", None)["requiresPrescription"] is True
    assert _link(client, headers, "item", otc["id"])["requiresPrescription"] is True
    client.patch(f"/api/ops/medicines/{otc['id']}", headers=headers, json={"active": False})
    with factory() as db:
        _listing(db, "item2")
        db.commit()
    _link(client, headers, "item2", otc["id"], expect=422)   # inactive master
    listed = client.get("/api/catalog?query=item").json()["items"]
    assert {i["id"]: i["medicineId"] for i in listed}["item"] == otc["id"]


def test_schedule_change_tightens_linked_listings(admin):
    client, factory, _codes, headers = admin
    med = _create(client, headers, "Brand P", PARA)
    with factory() as db:
        _listing(db, "item")
        db.commit()
    _link(client, headers, "item", med["id"])
    updated = client.patch(f"/api/ops/medicines/{med['id']}", headers=headers, json={"scheduleClass": "H1"})
    assert updated.status_code == 200 and updated.json()["requiresPrescriberApproval"] is True
    with factory() as db:
        assert db.get(M.CatalogEntry, "item").requires_prescription is True
    assert client.patch("/api/ops/medicines/missing", headers=headers, json={"active": False}).status_code == 404


def _substitutes(client, item_id, expect=200):
    response = client.get(f"/api/catalog/{item_id}/substitutes")
    assert response.status_code == expect, response.text
    return response.json()


def test_substitutes_match_exact_composition_and_form(admin):
    client, factory, _codes, headers = admin
    base = _create(client, headers, "Brand A", COAMOX)
    same_reordered = _create(client, headers, "Brand B", [("clavulanic acid", "125", "mg"), ("AMOXICILLIN", "0.5", "g")],
                             manufacturer="Other")
    other_strength = _create(client, headers, "Brand C", [("Amoxicillin", "875", "mg"), ("Clavulanic Acid", "125", "mg")])
    one_salt = _create(client, headers, "Brand D", [("Amoxicillin", "500", "mg")])
    other_form = _create(client, headers, "Brand E", COAMOX, form="TABLET_ER")
    extra_salt = _create(client, headers, "Brand F", COAMOX + [("Lactobacillus", "60", "mg")])
    with factory() as db:
        _listing(db, "base", price=2000, medicine_id=base["id"])
        _listing(db, "same-cheap", price=1200, medicine_id=same_reordered["id"])
        _listing(db, "same-dear", price=2500, medicine_id=same_reordered["id"], provider="vendor2")
        _listing(db, "same-product", price=1800, medicine_id=base["id"], provider="vendor2")
        _listing(db, "same-equal", price=2000, medicine_id=same_reordered["id"])
        _listing(db, "strength", price=100, medicine_id=other_strength["id"])
        _listing(db, "one-salt", price=100, medicine_id=one_salt["id"])
        _listing(db, "form", price=100, medicine_id=other_form["id"])
        _listing(db, "extra", price=100, medicine_id=extra_salt["id"])
        _listing(db, "unlinked", price=100)
        db.commit()
    body = _substitutes(client, "base")
    assert body["status"] == "OK" and body["substitutionPolicy"] == "SELF_SELECT"
    assert [i["id"] for i in body["items"]] == ["same-cheap", "same-product", "same-equal", "same-dear"]
    by_id = {i["id"]: i for i in body["items"]}
    assert by_id["same-cheap"]["cheaper"] is True and by_id["same-cheap"]["savingsPaise"] == 800
    assert by_id["same-equal"]["cheaper"] is False and by_id["same-equal"]["savingsPaise"] == 0
    assert by_id["same-dear"]["cheaper"] is False
    assert by_id["same-product"]["sameProduct"] is True and by_id["same-cheap"]["sameProduct"] is False
    assert all(i["requiresPrescriberApproval"] is False for i in body["items"])
    assert {c["salt"] for c in body["composition"]} == {"Amoxicillin", "Clavulanic Acid"}
    # And it is symmetric: the cheap one sees the base.
    assert "base" in [i["id"] for i in _substitutes(client, "same-cheap")["items"]]


def test_substitutes_exclude_inactive_out_of_stock_and_inactive_providers(admin):
    client, factory, _codes, headers = admin
    med = _create(client, headers, "Brand A", PARA)
    twin = _create(client, headers, "Brand B", PARA, manufacturer="Other")
    retired = _create(client, headers, "Brand R", PARA, manufacturer="Retired")
    client.patch(f"/api/ops/medicines/{retired['id']}", headers=headers, json={"active": False})
    with factory() as db:
        _listing(db, "base", medicine_id=med["id"])
        _listing(db, "ok", price=500, medicine_id=twin["id"])
        _listing(db, "hidden", price=500, medicine_id=twin["id"], active=False)
        _listing(db, "empty", price=500, medicine_id=twin["id"], stock=0)
        _listing(db, "closed-shop", price=500, medicine_id=twin["id"], provider="gone")
        _listing(db, "retired-master", price=500, medicine_id=retired["id"])
        db.commit()
    assert [i["id"] for i in _substitutes(client, "base")["items"]] == ["ok"]
    _substitutes(client, "hidden", expect=404)
    _substitutes(client, "closed-shop", expect=404)
    _substitutes(client, "missing", expect=404)
    assert _substitutes(client, "retired-master")["status"] == "MEDICINE_INACTIVE"
    assert _substitutes(client, "retired-master")["items"] == []


def test_unlinked_item_has_no_substitutes(admin):
    client, factory, _codes, _headers = admin
    with factory() as db:
        _listing(db, "plain")
        db.commit()
    body = _substitutes(client, "plain")
    assert body["status"] == "NOT_LINKED" and body["items"] == [] and body["substitutionPolicy"] is None


@pytest.mark.parametrize("schedule", ["H", "H1", "X"])
def test_prescription_substitutes_need_prescriber_or_pharmacist_approval(admin, schedule):
    client, factory, _codes, headers = admin
    med = _create(client, headers, "Brand A", COAMOX, schedule=schedule)
    twin = _create(client, headers, "Brand B", COAMOX, schedule=schedule, manufacturer="Other")
    with factory() as db:
        _listing(db, "base", price=2000)
        _listing(db, "twin", price=1000)
        db.commit()
    _link(client, headers, "base", med["id"])
    _link(client, headers, "twin", twin["id"])
    body = _substitutes(client, "base")
    assert body["substitutionPolicy"] == "PRESCRIBER_OR_PHARMACIST_APPROVAL"
    assert body["items"][0]["id"] == "twin" and body["items"][0]["cheaper"] is True
    assert body["items"][0]["requiresPrescriberApproval"] is True
    assert body["items"][0]["requiresPrescription"] is True


def test_a_listing_marked_prescription_only_also_needs_approval(admin):
    client, factory, _codes, headers = admin
    med = _create(client, headers, "Brand A", PARA)
    twin = _create(client, headers, "Brand B", PARA, manufacturer="Other")
    with factory() as db:
        _listing(db, "base", rx=True, medicine_id=med["id"])
        _listing(db, "twin", price=10, medicine_id=twin["id"])
        db.commit()
    body = _substitutes(client, "base")
    assert body["substitutionPolicy"] == "PRESCRIBER_OR_PHARMACIST_APPROVAL"
    assert body["items"][0]["requiresPrescriberApproval"] is True


def test_replacing_a_composition_changes_matches(admin):
    client, factory, _codes, headers = admin
    med = _create(client, headers, "Brand A", PARA)
    twin = _create(client, headers, "Brand B", PARA, manufacturer="Other")
    with factory() as db:
        _listing(db, "base", medicine_id=med["id"])
        _listing(db, "twin", price=10, medicine_id=twin["id"])
        db.commit()
    assert _substitutes(client, "base")["total"] == 1
    changed = client.patch(f"/api/ops/medicines/{twin['id']}", headers=headers,
                           json={"ingredients": [{"salt": "Paracetamol", "strength": "650", "unit": "mg"}]})
    assert changed.status_code == 200, changed.text
    assert changed.json()["composition"] == [{"salt": "Paracetamol", "strength": "650", "unit": "mg"}]
    assert _substitutes(client, "base")["total"] == 0
    with factory() as db:
        assert len(db.scalars(select(M.MedicineIngredient).where(
            M.MedicineIngredient.medicine_id == twin["id"])).all()) == 1
    # Making it identical to another master is refused.
    clash = client.patch(f"/api/ops/medicines/{twin['id']}", headers=headers,
                         json={"brandName": "Brand A", "manufacturer": "Maker Ltd",
                               "ingredients": [{"salt": "Paracetamol", "strength": "500", "unit": "mg"}]})
    assert clash.status_code == 409
    with factory() as db:
        assert db.get(M.Medicine, twin["id"]).brand_name == "Brand B"


# --- Postgres: the whole flow runs as sk_commerce ---------------------------------

def test_pg_medicine_master_runs_as_sk_commerce(pg_db, monkeypatch):  # noqa: F811
    import uuid

    from fastapi.testclient import TestClient
    from sqlalchemy import text
    from sqlalchemy.orm import sessionmaker

    from app.main import app
    from services import commerce_session, workflow_auth
    from services.workflow_auth import workflow_db

    engine, *_ = pg_db
    commerce_session.reset_cache()
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def database():
        with factory() as session:
            yield session

    seen_roles = []
    real_open = commerce_session.open_commerce_session

    def spying_open(bind):
        session = real_open(bind)
        seen_roles.append(session.scalar(text("SELECT current_user")))
        return session

    codes = []
    monkeypatch.setattr(workflow_auth, "deliver_code", lambda identifier, code, channel: codes.append(code) or True)
    monkeypatch.setattr(commerce_session, "open_commerce_session", spying_open)
    app.dependency_overrides[workflow_db] = database
    client = TestClient(app)
    tag = uuid.uuid4().hex[:6]
    try:
        with factory() as db:
            _account(db, f"root-{tag}", "SUPER_ADMIN")
            _account(db, f"vendor-{tag}", "VENDOR")
            db.commit()
        headers = login(client, codes, f"root-{tag}@example.test")
        med = _create(client, headers, f"Brand A {tag}", COAMOX, schedule="H")
        twin = _create(client, headers, f"Brand B {tag}", list(reversed(COAMOX)), schedule="H")
        changed = client.patch(f"/api/ops/medicines/{twin['id']}", headers=headers,
                               json={"ingredients": [{"salt": s, "strength": v, "unit": u} for s, v, u in COAMOX]})
        assert changed.status_code == 200, changed.text
        with factory() as db:
            _listing(db, f"base-{tag}", provider=f"vendor-{tag}", price=2000)
            _listing(db, f"twin-{tag}", provider=f"vendor-{tag}", price=900)
            db.commit()
        _link(client, headers, f"base-{tag}", med["id"])
        _link(client, headers, f"twin-{tag}", twin["id"])
        assert client.get("/api/ops/medicines?query=amoxi", headers=headers).status_code == 200
        body = _substitutes(client, f"base-{tag}")
        assert [i["id"] for i in body["items"]] == [f"twin-{tag}"]
        assert body["substitutionPolicy"] == "PRESCRIBER_OR_PHARMACIST_APPROVAL"
        assert seen_roles and set(seen_roles) == {"sk_commerce"}
    finally:
        app.dependency_overrides.clear()
        client.close()
        commerce_session.reset_cache()
