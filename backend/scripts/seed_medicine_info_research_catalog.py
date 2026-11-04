"""Load the researched medicine catalog (design/data/catalog-medicines.json) into
medicine information as an UNREVIEWED import — never as a sellable catalog entry.

Context (see design/data/README.md for the full source list and caveats): the 159
entries in catalog-medicines.json come from India's NLEM 2022 (gazette-sourced
composition/form/use) plus general market research for price ranges, assembled by
an AI research pass, not reviewed by a pharmacist. That is exactly the shape the
real medicine-information feature (plan tier1-medicine-info-2026-10-22, approved by
Krishna Chintakayala 2026-10-22) is built to take in safely:

* It lands as an IMPORT, exactly like ``POST /api/ops/medicine-info/import`` would
  do with a CSV of this shape — ``import_research_catalog`` below calls the same
  row-level parsing and write functions (``services.medicine_info._parse_row`` /
  ``_import_row``) that route uses, so the validation and the UNREVIEWED state are
  identical to going through the real endpoint. It does not duplicate or loosen
  that logic.
* Every field lands UNREVIEWED. Per ``services/medicine_info.py``, no field is
  shown to a student until a pharmacist account reviews *that exact value* — this
  script cannot and does not mark anything REVIEWED.
* It never creates a ``CatalogEntry`` (the sellable-product model). A medicine
  with no catalog listing shows as "not sold" with no buy control (see
  ``buy_state()`` in services/medicine_info.py) — info-only by construction, not
  by a flag this script has to set. Real inventory/pricing is a separate,
  deliberate step (a VENDOR/PHARMACY account publishing real stock and price),
  not something this script — or the researched price ranges it ignores — should
  ever drive.
* Price data from the catalog JSON is intentionally NOT imported anywhere: the
  medicine-information schema has no price field, and the catalog's prices are
  researched ranges, not real SKU pricing, so they have no reviewable, honest home
  in this table.

Rows that don't cleanly map to the real schema (compound forms like "Capsule/Tablet",
units the composition parser doesn't recognise, anything missing a required column)
are skipped and reported, not forced through — consistent with how the real import
endpoint reports and skips bad CSV rows rather than guessing.

A CSV matching the real import endpoint's exact column format is also written to
backend/seed-data/, so a super admin can alternatively review it and upload it by
hand through the existing admin "Medicine information" import console instead of
running this script.

Usage:

    DATABASE_URL=postgresql://... backend/.venv/bin/python \
        backend/scripts/seed_medicine_info_research_catalog.py --confirm

Idempotent on identity (re-running matches existing medicines by name + composition
+ form rather than creating duplicates), but — like the real import endpoint — it
does reset any monograph field it touches back to UNREVIEWED each time it runs, so
don't re-run this after a pharmacist has reviewed these entries without checking
that's what you want.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_JSON = REPO_ROOT / "design" / "data" / "catalog-medicines.json"
CSV_OUT = Path(__file__).resolve().parent.parent / "seed-data" / "medicine-info-catalog-research-2026-11.csv"

DATASET_NAME = "StudentKare research catalog, Nov 2026 (NLEM 2022 + general market research)"
LICENCE_NOTE = (
    "Not a commercial licensed formulary. Composition/form/use grounded in India's NLEM 2022 "
    "gazette; price data intentionally excluded (this schema has none). AI-assisted research, "
    "not pharmacist-authored — every field must be reviewed before any student sees it."
)
GAZETTE_URL = ("https://thehealthmaster.com/wp-content/uploads/2022/11/"
               "S.O.-5249E-dt-11-11-2022-National-List-of-Essential-Medicines-2022-EC-Act-1955.pdf")

# Only forms with an unambiguous, honest mapping to the real schema's DOSAGE_FORMS.
# A compound/ambiguous form (e.g. "Capsule/Tablet") is deliberately left unmapped —
# the row is skipped and reported rather than guessed at.
FORM_MAP = {
    "tablet": "TABLET",
    "chewable tablet": "TABLET",
    "tablet (sublingual)": "TABLET",
    "capsule": "CAPSULE",
    "softgel capsule": "CAPSULE",
    "syrup": "SYRUP",
    "oral suspension": "SUSPENSION",
    "cream": "CREAM",
    "gel": "GEL",
    "lotion": "LOTION",
    "solution": "SOLUTION",
    "spray": "SPRAY",
    "nasal spray": "SPRAY",
    "injection": "INJECTION",
    "injection (vial)": "INJECTION",
    "injection (pen/vial)": "INJECTION",
    "sachet (granules)": "SACHET",
    "powder sachet": "SACHET",
    "lozenge": "LOZENGE",
    "eye drops": "DROPS",
    "ear drops": "DROPS",
    "nasal drops": "DROPS",
    "oral powder": "POWDER",
}

MANUFACTURER_LABEL = "Generic — multiple manufacturers"

IMPORT_COLUMNS = ("brand", "composition", "form", "pack", "manufacturer", "schedule", "uses", "side_effects",
                  "warnings", "storage", "age_availability", "source_title", "source_url")


def load_catalog(path: Path = CATALOG_JSON) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def to_raw_row(entry: dict) -> dict[str, str] | None:
    """Map one catalog-medicines.json entry to the import CSV's row shape, or None
    if the form doesn't have an honest 1:1 mapping (caller skips and reports it)."""
    form = FORM_MAP.get(entry["form"].strip().lower())
    if form is None:
        return None
    schedule = "H" if entry.get("prescription_required") else "OTC"
    source = str(entry.get("source", ""))[:200]
    source_url = GAZETTE_URL if "NLEM" in source else ""
    return {
        "brand": f"{entry['name']} (Generic)"[:160],
        "composition": entry["composition"],
        "form": form,
        "pack": entry["pack_size"][:120],
        "manufacturer": MANUFACTURER_LABEL,
        "schedule": schedule,
        "uses": entry.get("typical_use", "") or "",
        "side_effects": "",   # not researched — left for pharmacist review to add, never guessed
        "warnings": "",
        "storage": "",
        "age_availability": "",
        "source_title": source,
        "source_url": source_url,
    }


def build_rows(catalog: list[dict]) -> tuple[list[dict[str, str]], list[tuple[str, str]]]:
    """Returns (raw_rows ready for the importer, [(name, reason)] skipped at the mapping stage)."""
    rows: list[dict[str, str]] = []
    skipped: list[tuple[str, str]] = []
    for entry in catalog:
        raw = to_raw_row(entry)
        if raw is None:
            skipped.append((entry.get("name", entry.get("id", "?")), f"form '{entry['form']}' has no unambiguous mapping"))
        else:
            rows.append(raw)
    return rows, skipped


def build_csv(rows: list[dict[str, str]]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=IMPORT_COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue()


def import_research_catalog(db, raw_rows: list[dict[str, str]], user: dict, *, dataset: str = DATASET_NAME,
                            licence: str = LICENCE_NOTE, source_url: str = GAZETTE_URL,
                            filename: str = "medicine-info-catalog-research-2026-11.csv") -> dict:
    """Runs ``raw_rows`` through the real import's row parser and writer
    (``services.medicine_info._parse_row`` / ``_import_row``), recorded as one
    ``MedicineInfoImport`` batch exactly like ``POST /api/ops/medicine-info/import``
    would. Every field this creates or touches lands UNREVIEWED; nothing here ever
    creates a ``CatalogEntry``. Returns the same shape ``_import_payload`` does.
    """
    from core import workflow_models as M
    from services import medicine_info as MI

    batch = M.MedicineInfoImport(id=str(uuid.uuid4()), filename=filename, dataset=dataset, licence=licence,
                                 source_url=source_url, rows_total=len(raw_rows), errors=[],
                                 created_by=user["id"], created_at=time.time())
    db.add(batch)
    errors: list[dict] = []
    for number, raw in enumerate(raw_rows, start=2):
        try:
            parsed = MI._parse_row(raw)
        except ValueError as exc:
            errors.append({"row": number, "reason": str(exc)[:200]})
            continue
        MI._import_row(db, batch, parsed, user)
    batch.rows_rejected = len(errors)
    batch.errors = errors[:200]
    db.add(M.WorkflowAudit(id=str(uuid.uuid4()), actor_id=user["id"], action="MEDICINE_INFO_IMPORT",
                           resource_id=batch.id, created_at=time.time()))
    db.commit()
    return {"id": batch.id, "rowsTotal": batch.rows_total, "rowsCreated": batch.rows_created,
            "rowsMatched": batch.rows_matched, "rowsRejected": batch.rows_rejected, "errors": batch.errors}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Import the researched medicine catalog into medicine information (UNREVIEWED).")
    parser.add_argument("--confirm", action="store_true",
                        help="Required acknowledgement that rows will be written to the configured database, "
                             "all UNREVIEWED, no catalog listing created.")
    parser.add_argument("--csv-only", action="store_true",
                        help="Only (re)write the CSV to backend/seed-data/ — do not touch the database.")
    parser.add_argument("--actor-id", default="system-seed:medicine-info-research-catalog",
                        help="Attribution recorded on the import batch and audit trail.")
    args = parser.parse_args(argv)

    catalog = load_catalog()
    raw_rows, skipped = build_rows(catalog)

    CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
    CSV_OUT.write_text(build_csv(raw_rows), encoding="utf-8")
    print(f"Wrote {len(raw_rows)} candidate rows to {CSV_OUT.relative_to(REPO_ROOT)} "
          f"({len(skipped)} skipped before the database even sees them).")
    if skipped:
        print("Skipped at the mapping stage (ambiguous form, not guessed at):")
        for name, reason in skipped:
            print(f"  - {name}: {reason}")

    if args.csv_only:
        print("\n--csv-only: no database changes made.")
        return 0

    if not args.confirm:
        print("\nRefusing to write to the database without --confirm. "
              "Re-run with --confirm to import, or use --csv-only to just regenerate the CSV "
              "for hand upload via the admin Medicine information console.")
        return 1

    from services.db_sql import DATABASE_URL, SessionLocal, create_all_tables

    create_all_tables()
    user = {"id": args.actor_id, "role": "SUPER_ADMIN"}
    with SessionLocal() as db:
        result = import_research_catalog(db, raw_rows, user, filename=CSV_OUT.name)

    target = DATABASE_URL.split("@", 1)[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"\nTarget database: {target}")
    print(f"Medicines created: {result['rowsCreated']}. Matched to an existing medicine: {result['rowsMatched']}. "
          f"Rejected: {result['rowsRejected']}.")
    if result["errors"]:
        print("Rejected at the database-validation stage:")
        for e in result["errors"][:20]:
            print(f"  - row {e['row']}: {e['reason']}")
        if len(result["errors"]) > 20:
            print(f"  ... and {len(result['errors']) - 20} more (see care_medicine_info_imports.errors).")
    print("\nEvery field landed UNREVIEWED. Nothing is visible to students, and nothing is sellable, "
          "until a pharmacist (VENDOR/PHARMACY account) reviews each field in the admin "
          "Medicine information console (AdminMedicineInfo / medicine-info-review).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
