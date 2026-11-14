"""Load the All India Pincode Directory into care_pincode_areas (areas inside each pincode).

The directory is published by the Department of Posts on data.gov.in under the
Government Open Data Licence - India, which allows this use with attribution (the
attribution is stored on every row and returned by GET /api/pincodes/{pincode}/areas).

Download the CSV yourself and pass its path; this script fetches nothing:

    DATABASE_URL=postgresql://... python backend/scripts/load_pincode_directory.py \\
        --csv /path/to/pincode.csv --state Telangana --confirm

    python backend/scripts/load_pincode_directory.py --status

Both published header sets are read (OfficeName/Pincode/District/StateName and
officename/pincode/Districtname/statename). ``--state`` keeps one state's rows.
Re-running replaces the areas of every pincode in the file and leaves other pincodes
alone. Reference data about places: no personal data is read or written.

A provider's listed areas (care_service_providers.serviceable_areas) are not changed
by a reload. If the directory renames an area a provider had listed, deliveries to it
are refused until the provider's areas are saved again.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services import delivery_areas  # noqa: E402
from services.db_sql import SessionLocal  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--csv", help="path to the directory CSV")
    parser.add_argument("--state", default="", help="load only this state's rows, e.g. Telangana")
    parser.add_argument("--confirm", action="store_true", help="required to write")
    parser.add_argument("--status", action="store_true", help="print what is loaded and exit")
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.status:
            print(delivery_areas.directory_status(db))
            return 0
        if not args.csv:
            parser.error("--csv is required")
        with open(args.csv, encoding="utf-8-sig", newline="") as handle:
            if not args.confirm:
                places, skipped = delivery_areas.read_directory(handle, state=args.state)
                print({"dryRun": True, "pincodes": len(places),
                       "areas": sum(len(p["areas"]) for p in places.values()), "skippedRows": skipped})
                print("Nothing written. Add --confirm to load.")
                return 0
            result = delivery_areas.load_directory(db, handle, state=args.state)
            db.commit()
        print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
