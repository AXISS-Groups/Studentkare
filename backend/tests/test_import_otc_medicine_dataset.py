"""The OTC-medicine identity importer: parsing rules and the safety lock.

Every row this script writes must land as schedule=H1, requires_prescription=true,
active=false (docs/plans/catalog-expansion-2026-11-11.md) because the open dataset
has no schedule column at all. This test proves that lock holds, and that rows the
parser can't classify safely are skipped rather than guessed.
"""
import csv
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from scripts import import_otc_medicine_dataset as importer
from services.db_sql import Base

ROWS = [
    # Good row: real composition, parseable dosage form -> imported, locked.
    {"id": "1", "name": "Augmentin 625 Duo Tablet", "price(₹)": "223.42", "Is_discontinued": "FALSE",
     "manufacturer_name": "Glaxo SmithKline Pharmaceuticals Ltd", "type": "allopathy",
     "pack_size_label": "strip of 10 tablets",
     "short_composition1": "Amoxycillin  (500mg) ", "short_composition2": " Clavulanic Acid (125mg)"},
    # Single-salt good row.
    {"id": "2", "name": "Azithral 500 Tablet", "price(₹)": "132.36", "Is_discontinued": "FALSE",
     "manufacturer_name": "Alembic Pharmaceuticals Ltd", "type": "allopathy",
     "pack_size_label": "strip of 5 tablets",
     "short_composition1": "Azithromycin (500mg)", "short_composition2": ""},
    # Discontinued: skipped outright.
    {"id": "3", "name": "Old Discontinued Syrup", "price(₹)": "50", "Is_discontinued": "TRUE",
     "manufacturer_name": "Some Pharma Ltd", "type": "allopathy", "pack_size_label": "bottle of 100ml",
     "short_composition1": "Paracetamol (250mg)", "short_composition2": ""},
    # No dosage-form word anywhere in the name: skipped, not guessed.
    {"id": "4", "name": "Mystery Product XJ9", "price(₹)": "10", "Is_discontinued": "FALSE",
     "manufacturer_name": "Some Pharma Ltd", "type": "allopathy", "pack_size_label": "pack of 1",
     "short_composition1": "Paracetamol (250mg)", "short_composition2": ""},
    # Unmappable unit: skipped, not guessed.
    {"id": "5", "name": "Odd Unit Tablet", "price(₹)": "10", "Is_discontinued": "FALSE",
     "manufacturer_name": "Some Pharma Ltd", "type": "allopathy", "pack_size_label": "strip of 10",
     "short_composition1": "Paracetamol (250 furlongs)", "short_composition2": ""},
    # Exact duplicate of row 1 (different id, same identity+composition): skipped as a duplicate.
    {"id": "6", "name": "Augmentin 625 Duo Tablet", "price(₹)": "223.42", "Is_discontinued": "FALSE",
     "manufacturer_name": "Glaxo SmithKline Pharmaceuticals Ltd", "type": "allopathy",
     "pack_size_label": "strip of 10 tablets",
     "short_composition1": "Amoxycillin  (500mg) ", "short_composition2": " Clavulanic Acid (125mg)"},
]


@pytest.fixture
def db(monkeypatch, tmp_path):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(importer, "SessionLocal", factory)
    monkeypatch.setattr(importer, "create_all_tables", lambda: None)
    monkeypatch.setattr(importer, "DATABASE_URL", "sqlite://")

    csv_path = tmp_path / "sample.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(ROWS[0].keys()))
        writer.writeheader()
        writer.writerows(ROWS)

    return factory, csv_path


def test_refuses_without_confirm(db):
    _factory, csv_path = db
    with pytest.raises(SystemExit):
        importer.main(["--csv", str(csv_path)])


def test_imports_only_safe_rows_and_locks_every_one(db, capsys):
    factory, csv_path = db
    assert importer.main(["--csv", str(csv_path), "--confirm"]) == 0

    with factory() as session:
        rows = session.scalars(select(M.Medicine)).all()
        assert len(rows) == 2  # Augmentin + Azithral only
        names = {row.name for row in rows}
        assert names == {"Augmentin 625 Duo Tablet", "Azithral 500 Tablet"}
        for row in rows:
            assert row.schedule == "H1"
            assert row.requires_prescription is True
            assert row.active is False
            assert row.source == "BULK_IMPORT_UNCLASSIFIED"

        augmentin = next(r for r in rows if r.name == "Augmentin 625 Duo Tablet")
        ingredients = session.scalars(
            select(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id == augmentin.id)
        ).all()
        salts = {(i.salt, i.strength_value, i.strength_unit) for i in ingredients}
        assert salts == {("Amoxycillin", 500.0, "mg"), ("Clavulanic Acid", 125.0, "mg")}

    out = capsys.readouterr().out
    assert "discontinued: 1" in out
    assert "unparseable_dosage_form: 1" in out
    assert "unmapped_unit: 1" in out
    assert "duplicate: 1" in out
    assert "imported: 2" in out


def test_rerun_skips_everything_as_already_imported(db, capsys):
    factory, csv_path = db
    importer.main(["--csv", str(csv_path), "--confirm"])
    capsys.readouterr()
    assert importer.main(["--csv", str(csv_path), "--confirm"]) == 0

    with factory() as session:
        rows = session.scalars(select(M.Medicine)).all()
        assert len(rows) == 2  # not doubled

    out = capsys.readouterr().out
    assert "already imported by this script" in out


def test_limit_caps_rows_read(db):
    factory, csv_path = db
    importer.main(["--csv", str(csv_path), "--confirm", "--limit", "1"])
    with factory() as session:
        rows = session.scalars(select(M.Medicine)).all()
        assert len(rows) == 1
        assert rows[0].name == "Augmentin 625 Duo Tablet"


@pytest.mark.parametrize("raw,expected", [
    ("Amoxycillin  (500mg) ", ("Amoxycillin", 500.0, "mg")),
    ("Clavulanic Acid (125 mg)", ("Clavulanic Acid", 125.0, "mg")),
    ("Paracetamol 650mg", ("Paracetamol", 650.0, "mg")),
])
def test_parse_ingredient_handles_real_dataset_formats(raw, expected):
    assert importer.parse_ingredient(raw) == expected


def test_parse_ingredient_rejects_unmappable_unit():
    with pytest.raises(importer.SkipRow):
        importer.parse_ingredient("Paracetamol (250 furlongs)")


@pytest.mark.parametrize("name,expected_form", [
    ("Augmentin 625 Duo Tablet", "TABLET"),
    ("Azithral Oral Suspension", "SUSPENSION"),
    ("Betadine Ointment", "OINTMENT"),
])
def test_parse_dosage_form_from_name(name, expected_form):
    assert importer.parse_dosage_form(name) == expected_form


def test_parse_dosage_form_refuses_to_guess():
    with pytest.raises(importer.SkipRow):
        importer.parse_dosage_form("Mystery Product XJ9")


@pytest.mark.parametrize("field,value,reason", [
    ("name", "T", "missing_identity_field"),
    ("manufacturer_name", "M", "missing_identity_field"),
    ("name", "Tablet " + "A" * 154, "field_too_long"),
    ("manufacturer_name", "M" * 121, "field_too_long"),
    ("pack_size_label", "P" * 121, "field_too_long"),
])
def test_parse_row_rejects_outside_existing_identity_bounds(field, value, reason):
    row = {**ROWS[0], field: value}
    with pytest.raises(importer.SkipRow, match=reason):
        importer.parse_row(row)


@pytest.mark.parametrize("field,value,parsed_field", [
    ("name", "Tablet " + "A" * 153, "name"),
    ("manufacturer_name", "MM", "manufacturer"),
    ("manufacturer_name", "M" * 120, "manufacturer"),
    ("pack_size_label", "P" * 120, "pack"),
])
def test_parse_row_accepts_existing_identity_boundaries(field, value, parsed_field):
    assert importer.parse_row({**ROWS[0], field: value})[parsed_field] == value


def test_clean_salt_preserves_minimum_length():
    with pytest.raises(importer.SkipRow, match="bad_salt_name"):
        importer.clean_salt("A")
    assert importer.clean_salt("AB") == "AB"


@pytest.mark.parametrize("value", ["0", "100000.01"])
def test_parse_ingredient_rejects_outside_existing_strength_bounds(value):
    with pytest.raises(importer.SkipRow, match="strength_out_of_range"):
        importer.parse_ingredient(f"Paracetamol ({value}mg)")


@pytest.mark.parametrize("value,expected", [("0.0001", 0.0001), ("100000", 100000.0)])
def test_parse_ingredient_accepts_existing_strength_boundaries(value, expected):
    assert importer.parse_ingredient(f"Paracetamol ({value}mg)") == ("Paracetamol", expected, "mg")
