"""Bulk-import medicine *identity* records (brand, composition, pack, manufacturer)
from an open dataset CSV such as github.com/junioralive/indian-medicine-dataset.

See docs/plans/catalog-expansion-2026-11-11.md for why this script exists and what
it deliberately does NOT do.

Why every imported row is locked (schedule H1, requires_prescription True, active False):

    The open dataset has no schedule / prescription-requirement column at all.
    care_medicines.schedule drives whether a listing can be bought directly or must
    go through the prescription flow (services/medicine_master.py), so guessing it
    wrong is a real patient-safety mistake, not a cosmetic one. Every row this script
    writes is therefore locked to the strictest schedule (H1) and marked inactive
    until a human (pharmacist or admin) reviews and reclassifies it via the existing
    PATCH /api/ops/medicines/{id} endpoint. Nothing imported here is ever buyable,
    searchable to students, or shown with any schedule claim by default.

This script writes ONLY identity fields (care_medicines, care_medicine_ingredients).
It never touches care_medicine_info_fields (the pharmacist-reviewed monograph table,
tier1-medicine-info-2026-10-22.md) — there is nothing in this dataset to put there,
and Rule 2 of that plan ("no AI writes monograph text") stays untouched by this script.

Usage:

    DATABASE_URL=postgresql://... backend/.venv/bin/python \
        backend/scripts/import_otc_medicine_dataset.py --csv /path/to/indian_medicine_data.csv --confirm

    # Dry run / smoke test on a slice first:
    python backend/scripts/import_otc_medicine_dataset.py --csv data.csv --limit 500 --confirm

Idempotent: re-running skips any (name, manufacturer, composition) already imported
by this script in an earlier run.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core import workflow_models as M  # noqa: E402
from core.medicine_composition import composition_key  # noqa: E402
from services.db_sql import DATABASE_URL, SessionLocal, create_all_tables  # noqa: E402
from services.medicine_master import IngredientInput, MedicineInput

# The API input schemas own these bounds; retain the importer's parsing and safety lock.
_MEDICINE_CONSTRAINTS = MedicineInput.model_json_schema()["properties"]
_INGREDIENT_CONSTRAINTS = IngredientInput.model_json_schema()["properties"]

SOURCE_TAG = "BULK_IMPORT_UNCLASSIFIED"
BATCH_SIZE = 2000

# Longest/most specific words first so "tablets" doesn't get caught by a shorter
# unrelated substring, and the match is tried against the whole product name.
_DOSAGE_FORM_WORDS: tuple[tuple[str, str], ...] = (
    ("suspension", "SUSPENSION"), ("injection", "INJECTION"), ("ointment", "OINTMENT"),
    ("inhaler", "INHALER"), ("lozenge", "LOZENGE"), ("solution", "SOLUTION"),
    ("tablet", "TABLET"), ("capsule", "CAPSULE"), ("syrup", "SYRUP"), ("lotion", "LOTION"),
    ("sachet", "SACHET"), ("powder", "POWDER"), ("spray", "SPRAY"), ("drop", "DROPS"),
    ("cream", "CREAM"), ("gel", "GEL"),
)

# Normalises the free-text units the dataset uses to the exact set
# services/medicine_master.py's StrengthUnit accepts. Anything not mappable here
# causes that ingredient line to be skipped.
_UNIT_MAP = {
    "mg": "mg", "mgs": "mg", "mcg": "mcg", "mcgs": "mcg", "ug": "mcg", "g": "g", "gm": "g",
    "gms": "g", "iu": "IU", "%": "%", "%w/w": "% w/w", "%w/v": "% w/v",
    "mg/ml": "mg/ml", "mg/5ml": "mg/5ml", "mcg/dose": "mcg/dose",
}

_SALT_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9 ,()'./+-]*$")
# e.g. "Amoxycillin  (500mg) " / "Clavulanic Acid (125 mg)" / "Paracetamol 650mg"
_COMPOSITION_PATTERN = re.compile(
    r"^\s*([A-Za-z][A-Za-z0-9 ,'./+-]*?)\s*\(?\s*([\d.]+)\s*([A-Za-z%/]+)\s*\)?\s*$"
)


class SkipRow(Exception):
    """Raised with a reason key to count why a row didn't import."""


def clean_salt(raw: str) -> str:
    salt = " ".join(raw.split())
    if len(salt) < _INGREDIENT_CONSTRAINTS["salt"]["minLength"] or not _SALT_PATTERN.match(salt):
        raise SkipRow("bad_salt_name")
    return salt


def parse_ingredient(raw: str) -> tuple[str, float, str] | None:
    """One composition field -> (salt, strength_value, strength_unit), or None if empty/blank."""
    raw = raw.strip().strip(",")
    if not raw:
        return None
    match = _COMPOSITION_PATTERN.match(raw)
    if not match:
        raise SkipRow("unparseable_composition")
    salt_raw, value_raw, unit_raw = match.groups()
    unit = _UNIT_MAP.get(unit_raw.strip().lower())
    if unit is None:
        raise SkipRow("unmapped_unit")
    try:
        value = float(value_raw)
    except ValueError as exc:
        raise SkipRow("bad_strength_value") from exc
    if not (_INGREDIENT_CONSTRAINTS["strengthValue"]["exclusiveMinimum"] < value
            <= _INGREDIENT_CONSTRAINTS["strengthValue"]["maximum"]):
        raise SkipRow("strength_out_of_range")
    return clean_salt(salt_raw), value, unit


def parse_dosage_form(name: str) -> str:
    lowered = name.lower()
    for word, form in _DOSAGE_FORM_WORDS:
        if word in lowered:
            return form
    raise SkipRow("unparseable_dosage_form")


def parse_row(row: dict[str, str]) -> dict:
    """One CSV row -> a validated dict ready to write, or raises SkipRow."""
    if row.get("Is_discontinued", "").strip().upper() == "TRUE":
        raise SkipRow("discontinued")
    name = " ".join(row.get("name", "").split())
    manufacturer = " ".join(row.get("manufacturer_name", "").split())
    pack = " ".join(row.get("pack_size_label", "").split()) or "Pack size not stated"
    if (len(name) < _MEDICINE_CONSTRAINTS["name"]["minLength"]
            or len(manufacturer) < _MEDICINE_CONSTRAINTS["manufacturer"]["minLength"]):
        raise SkipRow("missing_identity_field")
    if (len(name) > _MEDICINE_CONSTRAINTS["name"]["maxLength"]
            or len(manufacturer) > _MEDICINE_CONSTRAINTS["manufacturer"]["maxLength"]
            or len(pack) > _MEDICINE_CONSTRAINTS["pack"]["maxLength"]):
        raise SkipRow("field_too_long")

    ingredients = []
    for key in ("short_composition1", "short_composition2"):
        parsed = parse_ingredient(row.get(key, ""))
        if parsed:
            ingredients.append(parsed)
    if not ingredients:
        raise SkipRow("no_composition")

    # Two salts of the same name (typo'd differently) would violate the DB's
    # (medicine_id, salt_key) unique constraint; de-dup by salt_key, keep the first.
    seen_keys: set[str] = set()
    unique_ingredients = []
    for salt, value, unit in ingredients:
        key = " ".join(salt.lower().split())
        if key in seen_keys:
            continue
        seen_keys.add(key)
        unique_ingredients.append((salt, value, unit))

    return {
        "name": name,
        "manufacturer": manufacturer,
        "pack": pack,
        "dosage_form": parse_dosage_form(name),
        "ingredients": unique_ingredients,
    }


def dedup_key(parsed: dict, composition_key) -> str:
    comp = composition_key(parsed["ingredients"])
    return f"{parsed['name'].lower()}|{parsed['manufacturer'].lower()}|{comp}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv", required=True, help="Path to the dataset CSV.")
    parser.add_argument("--confirm", action="store_true", help="Required acknowledgement that rows will be written.")
    parser.add_argument("--limit", type=int, default=None, help="Only read this many CSV rows (for a dry run).")
    args = parser.parse_args(argv)
    if not args.confirm:
        raise SystemExit("Refusing to write without --confirm. Re-run with --confirm to proceed.")

    create_all_tables()
    counts: dict[str, int] = {"imported": 0, "duplicate": 0}

    with SessionLocal() as db:
        existing_rows = db.query(M.Medicine.name, M.Medicine.manufacturer, M.Medicine.composition_key) \
            .filter(M.Medicine.source == SOURCE_TAG).all()
        seen = {f"{name.lower()}|{manufacturer.lower()}|{comp}" for name, manufacturer, comp in existing_rows}
        if existing_rows:
            print(f"Note: {len(existing_rows)} rows already imported by this script are in the database; "
                  "duplicates will be skipped, nothing is re-inserted.")

        batch: list = []
        with open(args.csv, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for i, row in enumerate(reader):
                if args.limit is not None and i >= args.limit:
                    break
                try:
                    parsed = parse_row(row)
                except SkipRow as skip:
                    counts[skip.args[0]] = counts.get(skip.args[0], 0) + 1
                    continue

                key = dedup_key(parsed, composition_key)
                if key in seen:
                    counts["duplicate"] += 1
                    continue
                seen.add(key)

                now = time.time()
                medicine_id = str(uuid.uuid4())
                medicine = M.Medicine(
                    id=medicine_id, name=parsed["name"],
                    composition_key=composition_key(parsed["ingredients"]),
                    dosage_form=parsed["dosage_form"], pack=parsed["pack"],
                    manufacturer=parsed["manufacturer"],
                    schedule="H1", requires_prescription=True, active=False,
                    source=SOURCE_TAG, created_at=now, updated_at=now,
                )
                batch.append(medicine)
                for position, (salt, value, unit) in enumerate(parsed["ingredients"]):
                    batch.append(M.MedicineIngredient(
                        id=str(uuid.uuid4()), medicine_id=medicine_id, position=position,
                        salt=salt, salt_key=" ".join(salt.lower().split()),
                        strength_value=value, strength_unit=unit,
                    ))
                counts["imported"] += 1

                if len(batch) >= BATCH_SIZE:
                    db.add_all(batch)
                    db.commit()
                    batch = []

            if batch:
                db.add_all(batch)
                db.commit()

    target = DATABASE_URL.split("@", 1)[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"Target database: {target}")
    for key in sorted(counts):
        print(f"  {key}: {counts[key]}")
    print("Every imported row: schedule=H1, requires_prescription=true, active=false — "
          "locked until a human reclassifies it via PATCH /api/ops/medicines/{id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
