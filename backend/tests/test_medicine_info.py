"""Medicine information (plan tier1-medicine-info-2026-10-22): reviewed only, pharmacist approval, honest photo reader.

The rules under test:
* nothing reaches the lookup unless a pharmacist reviewed exactly that value;
* an edit, an import or a master change voids an approval by itself;
* an unreviewed import is hidden from the lookup and from /ai/medication-lookup;
* only a pharmacist approves; a super admin edits and imports; everyone else is refused;
* age availability takes label strengths only, never a dose;
* the photo reader says NOT_CONFIGURED / UNAVAILABLE honestly, stores nothing, and returns candidates to confirm;
* crisis words in the search box get the crisis gate's help and no results;
* prescription medicines are bought only through the prescription flow; Rule L planes hold.
"""
import io
import time

import pytest
from sqlalchemy import select
from test_workflow_api import harness, login, register  # noqa: F401 — pytest fixtures

from core import rule_l
from core import workflow_models as M
from core.settings_registry import REGISTRY
from services import medicine_ocr
from services.demo_seed import seed_demo_data
from services.integration_config import INTEGRATIONS_DB

WORK = "/api/work/medicine-info"
PUBLIC = "/api/medicine-info"
LABEL = {"sourceTitle": "Approved label, Pyrexa 650 (manufacturer leaflet)", "sourceUrl": "https://example.org/label"}


@pytest.fixture(autouse=True)
def _reader_off(monkeypatch):
    monkeypatch.setitem(INTEGRATIONS_DB, "medicine_ocr", {"enabled": False, "engine": "tesseract", "binary": "tesseract"})


def make_account(factory, account_id, role, partner_kind=""):
    with factory() as db:
        db.add(M.Account(id=account_id, identifier=f"{account_id}@example.test", channel="EMAIL", full_name="Staff",
                         role=role, active=True, profile={}, created_at=time.time(), partner_kind=partner_kind))
        db.commit()
    return f"{account_id}@example.test"


@pytest.fixture
def setup(harness):
    client, factory, codes = harness
    with factory() as db:
        seed_demo_data(db)
    people = {
        "pharmacist": make_account(factory, "pharm-1", "VENDOR", "PHARMACY"),
        "admin": make_account(factory, "admin-1", "SUPER_ADMIN"),
        "lab": make_account(factory, "lab-1", "VENDOR", "LAB"),
        "doctor": make_account(factory, "doc-1", "NMC_DOCTOR"),
    }

    def as_(who):
        return login(client, codes, people[who])

    return client, factory, codes, as_


def put(client, headers, medicine, field, value=None, **source):
    body = {**LABEL, **source}
    if value is not None:
        body["value"] = value
    return client.put(f"{WORK}/{medicine}/fields/{field}", json=body, headers=headers)


def approve(client, headers, medicine, field):
    detail = client.get(f"{WORK}/{medicine}", headers=headers).json()
    row = next(f for f in detail["fields"] if f["field"] == field)
    return client.post(f"{WORK}/{medicine}/fields/{field}/review", json={"valueHash": row["valueHash"]}, headers=headers)


def review_all_identity(client, headers, medicine):
    for field in ("brand", "composition", "form", "pack", "manufacturer", "schedule"):
        assert put(client, headers, medicine, field).status_code == 200
        assert approve(client, headers, medicine, field).status_code == 200


USES = {"items": ["Fever", "Mild to moderate pain"]}
AGES = {"items": [{"band": "ADULT", "form": "TABLET", "strength": "650 mg"},
                  {"band": "TEEN", "form": "TABLET", "strength": "650 mg"}]}


# --- reviewed only -----------------------------------------------------------

def test_nothing_is_shown_until_a_pharmacist_reviews_it(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    assert put(client, headers, "demo-med-pyrexa-650", "uses", USES).status_code == 200
    body = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()
    # Known composition from the master is shown, but no monograph text and no identity review yet.
    assert body["composition"] == "Paracetamol 650 mg"
    assert body["fields"]["uses"] is None and body["reviewed"] is False and body["identityReview"] is None

    assert approve(client, headers, "demo-med-pyrexa-650", "uses").status_code == 200
    body = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()
    assert body["fields"]["uses"]["items"] == ["Fever", "Mild to moderate pain"]
    assert body["fields"]["uses"]["source"]["title"].startswith("Approved label")
    assert body["fields"]["uses"]["reviewedOn"]
    assert body["reviewed"] is True


def test_an_edit_voids_the_review(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    put(client, headers, "demo-med-pyrexa-650", "uses", USES)
    approve(client, headers, "demo-med-pyrexa-650", "uses")
    admin = as_("admin")
    assert put(client, admin, "demo-med-pyrexa-650", "uses", {"items": ["Fever"]}).status_code == 200
    assert client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()["fields"]["uses"] is None


def test_a_master_change_voids_an_identity_review(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    review_all_identity(client, headers, "demo-med-pyrexa-650")
    assert client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()["identityReview"] is not None
    admin = as_("admin")
    assert client.patch("/api/ops/medicines/demo-med-pyrexa-650", json={"pack": "Strip of 10 tablets"},
                        headers=admin).status_code == 200
    assert client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()["identityReview"] is None
    detail = client.get(f"{WORK}/demo-med-pyrexa-650", headers=admin).json()
    pack = next(f for f in detail["fields"] if f["field"] == "pack")
    assert pack["changedSinceReview"] is True and pack["shown"] is False


def test_approving_a_value_that_changed_meanwhile_is_refused(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    put(client, headers, "demo-med-pyrexa-650", "uses", USES)
    stale = next(f for f in client.get(f"{WORK}/demo-med-pyrexa-650", headers=headers).json()["fields"]
                 if f["field"] == "uses")["valueHash"]
    put(client, headers, "demo-med-pyrexa-650", "uses", {"items": ["Something else entirely"]})
    response = client.post(f"{WORK}/demo-med-pyrexa-650/fields/uses/review", json={"valueHash": stale}, headers=headers)
    assert response.status_code == 409


def test_approval_needs_a_source(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    response = client.post(f"{WORK}/demo-med-pyrexa-650/fields/brand/review", json={"valueHash": "0" * 64}, headers=headers)
    assert response.status_code == 422


def test_withdraw_takes_it_off_at_once(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    put(client, headers, "demo-med-pyrexa-650", "uses", USES)
    approve(client, headers, "demo-med-pyrexa-650", "uses")
    assert client.post(f"{WORK}/demo-med-pyrexa-650/fields/uses/withdraw", headers=as_("admin")).status_code == 200
    assert client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()["fields"]["uses"] is None


# --- who may do what ------------------------------------------------------------

@pytest.mark.parametrize("who", ["admin", "lab", "doctor"])
def test_only_a_pharmacist_approves(setup, who):
    client, _, _, as_ = setup
    pharmacist = as_("pharmacist")
    put(client, pharmacist, "demo-med-pyrexa-650", "uses", USES)
    row_hash = next(f for f in client.get(f"{WORK}/demo-med-pyrexa-650", headers=pharmacist).json()["fields"]
                    if f["field"] == "uses")["valueHash"]
    response = client.post(f"{WORK}/demo-med-pyrexa-650/fields/uses/review", json={"valueHash": row_hash},
                           headers=as_(who))
    assert response.status_code == 403


@pytest.mark.parametrize("who", ["lab", "doctor"])
def test_others_cannot_edit_or_read_the_queue(setup, who):
    client, _, _, as_ = setup
    headers = as_(who)
    assert client.get(WORK, headers=headers).status_code == 403
    assert put(client, headers, "demo-med-pyrexa-650", "uses", USES).status_code == 403


def test_a_student_and_a_visitor_cannot_edit(setup):
    client, _, codes, _ = setup
    assert client.get(WORK).status_code == 401
    _, headers = register(client, codes, "student.mi@example.test")
    assert put(client, headers, "demo-med-pyrexa-650", "uses", USES).status_code == 403


def test_every_change_is_audited(setup):
    client, factory, _, as_ = setup
    headers = as_("pharmacist")
    put(client, headers, "demo-med-pyrexa-650", "uses", USES)
    approve(client, headers, "demo-med-pyrexa-650", "uses")
    detail = client.get(f"{WORK}/demo-med-pyrexa-650", headers=headers).json()
    assert [h["action"] for h in detail["history"]][:2] == ["REVIEWED", "EDITED"]
    assert detail["history"][0]["actorRole"] == "PHARMACIST" and detail["history"][0]["byYou"] is True
    with factory() as db:
        actions = set(db.scalars(select(M.WorkflowAudit.action).where(M.WorkflowAudit.resource_id == "demo-med-pyrexa-650")))
    assert {"MEDICINE_INFO_EDITED", "MEDICINE_INFO_REVIEWED"} <= actions


# --- no dose ---------------------------------------------------------------------

@pytest.mark.parametrize("strength", ["650 mg twice a day", "15 mg/kg", "1 tablet every 6 hours", "500mg/day", "2 tabs"])
def test_age_availability_takes_label_strengths_only(setup, strength):
    client, _, _, as_ = setup
    value = {"items": [{"band": "ADULT", "form": "TABLET", "strength": strength}]}
    assert put(client, as_("pharmacist"), "demo-med-pyrexa-650", "age_availability", value).status_code == 422


def test_age_availability_refuses_unknown_bands_and_extra_keys(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    assert put(client, headers, "demo-med-pyrexa-650", "age_availability",
               {"items": [{"band": "TODDLER", "form": "TABLET", "strength": "650 mg"}]}).status_code == 422
    assert put(client, headers, "demo-med-pyrexa-650", "age_availability",
               {"items": [{"band": "ADULT", "form": "TABLET", "strength": "650 mg", "dose": "1"}]}).status_code == 422
    assert put(client, headers, "demo-med-pyrexa-650", "age_availability", AGES).status_code == 200


def test_same_salt_forms_show_reviewed_label_bands(setup):
    client, _, _, as_ = setup
    headers = as_("pharmacist")
    put(client, headers, "demo-med-pyrexa-syrup", "age_availability",
        {"items": [{"band": "CHILD", "form": "SYRUP", "strength": "125 mg/5ml"}]})
    approve(client, headers, "demo-med-pyrexa-syrup", "age_availability")
    body = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()
    syrup = next(s for s in body["sameSalt"] if s["id"] == "demo-med-pyrexa-syrup")
    assert syrup["ageAvailability"]["items"] == [{"band": "CHILD", "form": "SYRUP", "strength": "125 mg/5ml"}]


# --- import -------------------------------------------------------------------------

CSV_HEAD = "brand,composition,form,pack,manufacturer,schedule,uses,side_effects,warnings,storage,age_availability,source_title,source_url\n"


def upload(client, headers, text, **form):
    data = {"dataset": "Licensed formulary 2026", "licence": "Licence ref LF-2026-01", **form}
    return client.post("/api/ops/medicine-info/import", headers=headers, data=data,
                       files={"file": ("meds.csv", io.BytesIO(text.encode()), "text/csv")})


def test_an_import_lands_unreviewed_and_hidden(setup):
    client, factory, _, as_ = setup
    admin = as_("admin")
    csv = CSV_HEAD + ("Novadol 650,Paracetamol 650 mg,TABLET,Strip of 10,Nova Labs,OTC,Fever|Pain,Nausea,,Below 25 C,"
                      "ADULT:TABLET:650 mg,,\n"
                      "Broken,Paracetamol lots,TABLET,Strip,Nova Labs,OTC,,,,,,,\n"
                      "Pyrexa 650,Paracetamol 650 mg,TABLET,Strip of 15 tablets,Sample Pharma A (demo),OTC,Fever,,,,,,\n")
    response = upload(client, admin, csv)
    assert response.status_code == 201, response.text
    body = response.json()
    assert (body["rowsCreated"], body["rowsMatched"], body["rowsRejected"]) == (1, 1, 1)
    assert body["errors"][0]["row"] == 3

    # Hidden from the lookup and from the AI lookup until a pharmacist reviews its identity.
    assert client.get(f"{PUBLIC}/search?q=Novadol").json()["results"] == []
    with factory() as db:
        from services.medicine_master import lookup_medicine
        assert lookup_medicine(db, "Novadol")["status"] == "NO_MATCH"
    with factory() as db:
        novadol = db.scalar(select(M.Medicine).where(M.Medicine.name == "Novadol 650"))
        assert novadol.source == "IMPORT"
        states = set(db.scalars(select(M.MedicineInfoField.state).where(M.MedicineInfoField.medicine_id == novadol.id)))
        assert states == {"UNREVIEWED"}
        # The matched medicine's master is untouched; its imported text is unreviewed.
        assert db.get(M.Medicine, "demo-med-pyrexa-650").source == "DEMO_SEED"
    assert client.get(f"{PUBLIC}/medicines/{novadol.id}").status_code == 404

    pharmacist = as_("pharmacist")
    review_all_identity(client, pharmacist, novadol.id)
    results = client.get(f"{PUBLIC}/search?q=Novadol").json()["results"]
    assert [r["brand"] for r in results] == ["Novadol 650"]
    assert results[0]["reviewed"] is False


def test_import_needs_the_licence_and_a_super_admin(setup):
    client, _, _, as_ = setup
    assert upload(client, as_("admin"), CSV_HEAD, licence="").status_code == 422
    assert upload(client, as_("pharmacist"), CSV_HEAD).status_code == 403
    listed = client.get("/api/ops/medicine-info/imports", headers=as_("admin")).json()
    assert "age_availability" in listed["columns"]


# --- search -----------------------------------------------------------------------------

@pytest.mark.parametrize("query", ["Pyrexa", "pyrxa", "Pyreksa 650", "paracetmol", "PARACETAMOL 650"])
def test_search_tolerates_typos(setup, query):
    client, _, _, _ = setup
    names = [r["brand"] for r in client.get(f"{PUBLIC}/search", params={"q": query}).json()["results"]]
    assert any(n.startswith("Pyrexa") for n in names), names


def test_a_typed_strength_ranks_that_strength_first(setup):
    client, _, _, _ = setup
    results = client.get(f"{PUBLIC}/search", params={"q": "pyrexa 650"}).json()["results"]
    assert results[0]["brand"] == "Pyrexa 650" and "strength" in results[0]["matchedOn"]


def test_no_match_is_an_empty_list(setup):
    client, _, _, _ = setup
    assert client.get(f"{PUBLIC}/search", params={"q": "zzqxw"}).json() == {"status": "OK", "results": []}


@pytest.mark.parametrize("query", ["overdose on pyrexa", "how much is too much paracetamol", "I want to die"])
def test_crisis_words_get_the_crisis_gate_and_no_results(setup, query):
    client, _, _, _ = setup
    body = client.get(f"{PUBLIC}/search", params={"q": query}).json()
    assert body["status"] == "CRISIS" and body["results"] == []
    numbers = {r["number"] for r in body["resources"]}
    assert "112" in numbers or "14416" in numbers


# --- buy paths ----------------------------------------------------------------------------

def test_otc_can_be_bought_and_rx_goes_through_the_prescription_flow(setup):
    client, _, _, _ = setup
    otc = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()
    assert otc["buy"]["state"] == "BUY" and otc["buy"]["itemId"] == "demo-med-pyrexa-650-listing"
    rx = client.get(f"{PUBLIC}/medicines/demo-med-azimax-500").json()
    assert rx["requiresPrescription"] is True
    assert rx["buy"]["state"] == "PRESCRIPTION"
    assert rx["alternatives"] == [] and rx["alternativesRestricted"] is True


def test_otc_alternatives_need_a_reviewed_composition(setup):
    client, _, _, as_ = setup
    assert client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-500").json()["alternatives"] == []
    headers = as_("pharmacist")
    put(client, headers, "demo-med-calmol-500", "composition")
    approve(client, headers, "demo-med-calmol-500", "composition")
    alternatives = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-500").json()["alternatives"]
    assert [a["id"] for a in alternatives] == ["demo-med-calmol-500"]


# --- photo ------------------------------------------------------------------------------------

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def photo(client):
    return client.post(f"{PUBLIC}/photo", files={"file": ("strip.png", io.BytesIO(PNG), "image/png")})


def test_photo_reader_off_says_not_configured(setup):
    client, _, _, _ = setup
    assert client.get(f"{PUBLIC}/photo/status").json() == {"state": "NOT_CONFIGURED"}
    assert photo(client).json() == {"state": "NOT_CONFIGURED", "text": "", "candidates": []}


def test_photo_reader_on_without_the_program_says_unavailable(setup, monkeypatch):
    client, _, _, _ = setup
    monkeypatch.setitem(INTEGRATIONS_DB, "medicine_ocr", {"enabled": True, "engine": "tesseract",
                                                           "binary": "definitely-not-installed-ocr"})
    assert photo(client).json()["state"] == "UNAVAILABLE"


def test_photo_text_returns_candidates_to_confirm_and_stores_nothing(setup, monkeypatch):
    client, factory, _, _ = setup
    monkeypatch.setattr(medicine_ocr, "status", lambda: {"provider": "medicine_ocr", "state": "READY"})
    monkeypatch.setattr(medicine_ocr, "read_text", lambda image, timeout: "PYREXA 650\nParacetamol Tablets IP 650 mg\nBatch X1")
    with factory() as db:
        before = len(db.execute(select(M.Medicine)).all())
        documents = len(db.execute(select(M.Document)).all())
    body = photo(client).json()
    assert body["state"] == "READ" and "PYREXA" in body["text"]
    assert body["candidates"][0]["brand"] == "Pyrexa 650"
    assert set(body["candidates"][0]["matchedOn"]) >= {"brand", "strength"}
    with factory() as db:
        assert len(db.execute(select(M.Document)).all()) == documents
        assert len(db.execute(select(M.Medicine)).all()) == before


def test_photo_with_no_matching_text(setup, monkeypatch):
    client, _, _, _ = setup
    monkeypatch.setattr(medicine_ocr, "status", lambda: {"provider": "medicine_ocr", "state": "READY"})
    monkeypatch.setattr(medicine_ocr, "read_text", lambda image, timeout: "Qwzx Lorvm")
    body = photo(client).json()
    assert body["state"] == "READ" and body["candidates"] == []


def test_photo_refuses_other_files(setup, monkeypatch):
    client, _, _, _ = setup
    monkeypatch.setattr(medicine_ocr, "status", lambda: {"provider": "medicine_ocr", "state": "READY"})
    response = client.post(f"{PUBLIC}/photo", files={"file": ("x.pdf", io.BytesIO(b"%PDF-1.4 x"), "application/pdf")})
    assert response.status_code == 422


# --- Rule L and settings ---------------------------------------------------------------------

def test_tables_are_commerce_and_the_trail_is_append_only():
    for table in ("care_medicine_info_fields", "care_medicine_info_events", "care_medicine_info_imports"):
        assert rule_l.TABLE_PLANES[table] == rule_l.COMMERCE
    grant = rule_l.GRANT_MATRIX[rule_l.COMMERCE_ROLE]["care_medicine_info_events"]
    assert set(grant.privileges) == {"SELECT", "INSERT"}
    assert "care_medicine_info_fields" not in rule_l.GRANT_MATRIX[rule_l.CLINICAL_ROLE]


def test_lookup_never_reads_a_person(setup):
    """Signed out works; nothing in the payload is about the viewer."""
    client, _, _, _ = setup
    body = client.get(f"{PUBLIC}/medicines/demo-med-pyrexa-650").json()
    assert not {"account", "accountId", "allergies", "medications"} & set(body)


def test_age_band_settings_are_public():
    for key in ("child_from_years", "teen_from_years", "adult_from_years", "older_adult_from_years",
                "ask_doctor_below_years"):
        assert REGISTRY[f"medicine_info.{key}"].public is True
