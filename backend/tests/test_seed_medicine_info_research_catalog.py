"""The researched medicine catalog (design/data/catalog-medicines.json) imports into
medicine information as an UNREVIEWED import, info-only, never sellable.

See backend/scripts/seed_medicine_info_research_catalog.py for the full rationale.
The rules under test:
* every form in catalog-medicines.json either has an honest, unambiguous mapping to
  the real DOSAGE_FORMS or is skipped and reported — never guessed at;
* every row that reaches the database goes through the real
  services.medicine_info._parse_row / _import_row — same validation, same UNREVIEWED
  landing, as POST /api/ops/medicine-info/import;
* nothing this creates is ever REVIEWED, and nothing creates a CatalogEntry (the
  sellable-product model) — info-only by construction, not by a flag to set.
"""
import json

from sqlalchemy import select
from test_workflow_api import harness  # noqa: F401 — pytest fixture

from core import workflow_models as M
from scripts.seed_medicine_info_research_catalog import (
    CATALOG_JSON,
    GAZETTE_URL,
    IMPORT_COLUMNS,
    build_csv,
    build_rows,
    import_research_catalog,
    load_catalog,
    to_raw_row,
)

ACTOR = {"id": "system-seed:medicine-info-research-catalog", "role": "SUPER_ADMIN"}


def seed(factory, raw_rows):
    with factory() as db:
        return import_research_catalog(db, raw_rows, ACTOR)


def test_catalog_json_is_present_and_loadable():
    assert CATALOG_JSON.exists(), "design/data/catalog-medicines.json not found — this test needs the catalog checked in"
    catalog = load_catalog()
    assert len(catalog) > 0
    assert all({"name", "composition", "form", "pack_size"} <= entry.keys() for entry in catalog)


def test_build_rows_skips_ambiguous_forms_without_guessing():
    catalog = load_catalog()
    raw_rows, skipped = build_rows(catalog)

    assert len(raw_rows) + len(skipped) == len(catalog)
    # Every produced row must use one of the real DOSAGE_FORMS values (checked
    # indirectly below via the real parser), and every skip must name why.
    for name, reason in skipped:
        assert "form" in reason and "no unambiguous mapping" in reason
    # Rows never carry price: the schema has no price field and the catalog's
    # price ranges are not real SKU pricing.
    assert all("price" not in row for row in raw_rows)
    # side_effects/warnings/storage/age_availability are never invented by this script.
    assert all(row["side_effects"] == "" for row in raw_rows)


def test_to_raw_row_maps_known_form_and_rejects_unknown_form():
    tablet = {"name": "Paracetamol 650", "composition": "Paracetamol 650 mg", "form": "Tablet",
             "pack_size": "Strip of 10", "typical_use": "Fever|Pain", "prescription_required": False,
             "source": "NLEM 2022"}
    raw = to_raw_row(tablet)
    assert raw is not None
    assert raw["form"] == "TABLET"
    assert raw["schedule"] == "OTC"
    assert raw["brand"] == "Paracetamol 650 (Generic)"
    assert raw["source_url"] == GAZETTE_URL  # source names NLEM -> gazette URL attached

    ambiguous = {**tablet, "form": "Capsule/Tablet"}
    assert to_raw_row(ambiguous) is None

    rx = {**tablet, "prescription_required": True}
    assert to_raw_row(rx)["schedule"] == "H"


def test_build_csv_matches_the_real_import_endpoints_columns():
    rows = [to_raw_row({"name": "Paracetamol 650", "composition": "Paracetamol 650 mg", "form": "Tablet",
                        "pack_size": "Strip of 10", "typical_use": "Fever", "prescription_required": False,
                        "source": ""})]
    text = build_csv(rows)
    header = text.splitlines()[0]
    assert header.split(",") == list(IMPORT_COLUMNS)


def test_import_research_catalog_lands_unreviewed_and_creates_no_catalog_entry(harness):
    _, factory, _ = harness
    catalog = load_catalog()
    raw_rows, skipped = build_rows(catalog)

    result = seed(factory, raw_rows)

    assert result["rowsTotal"] == len(raw_rows)
    assert result["rowsCreated"] + result["rowsMatched"] > 0
    # Rows that don't fit the strict composition/validation rules are reported,
    # not forced through — mirrors the real import endpoint's own behaviour.
    assert result["rowsRejected"] == len(result["errors"])

    with factory() as db:
        medicines = db.scalars(select(M.Medicine)).all()
        assert len(medicines) == result["rowsCreated"]

        fields = db.scalars(select(M.MedicineInfoField)).all()
        assert len(fields) > 0
        assert all(f.state == "UNREVIEWED" for f in fields), "nothing this import writes may land REVIEWED"

        # Info-only by construction: this import must never create a sellable listing.
        assert db.scalars(select(M.CatalogEntry)).first() is None

        batch = db.get(M.MedicineInfoImport, result["id"])
        assert batch is not None
        assert batch.created_by == ACTOR["id"]

        audit = db.scalars(select(M.WorkflowAudit).where(M.WorkflowAudit.action == "MEDICINE_INFO_IMPORT")).all()
        assert len(audit) == 1
        assert audit[0].resource_id == result["id"]


def test_import_research_catalog_is_idempotent_on_identity(harness):
    _, factory, _ = harness
    catalog = load_catalog()
    raw_rows, _ = build_rows(catalog)

    first = seed(factory, raw_rows)
    second = seed(factory, raw_rows)

    with factory() as db:
        medicines = db.scalars(select(M.Medicine)).all()
        # Re-running must match existing medicines by name + composition + form,
        # not duplicate them.
        assert len(medicines) == first["rowsCreated"]
    assert second["rowsMatched"] == first["rowsCreated"] + first["rowsMatched"]
    assert second["rowsCreated"] == 0
