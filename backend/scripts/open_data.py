"""Load open-licensed reference data into a DEV site (dev.studentkare.co): medicines and care facilities.

Reference data about products and places, never about people. It runs only where the demo
flags may run (APP_ENV development or testing), only with SEED_OPEN_DATA=true and --yes, and it
removes only its own rows (ids start ``od-``).

    python -m scripts.open_data fetch  --url https://... --out data/open/medicines.csv
    python -m scripts.open_data medicines  data/open/medicines.csv --yes
    python -m scripts.open_data facilities data/open/hospitals.csv --dataset "<name, licence>" \\
        --source-url https://... --state Telangana --yes
    python -m scripts.open_data count
    python -m scripts.open_data purge --yes

Honesty rules (AGENTS.md, services/care_directory.py):

* **Schedule is never guessed upward.** Open medicine lists carry no Indian drug schedule, so every
  imported medicine is schedule H (prescription needed). A pharmacist or super admin sets OTC later.
* **Nothing is called verified that was not.** A facility row says it came from open data and was not
  field-checked. Dev-only: a real directory needs a person to check each listing.
* **Rows that cannot be read are skipped and counted**, never repaired by guessing.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections.abc import Iterable, Iterator
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, func, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from core import workflow_models as M  # noqa: E402
from core.app_env import app_env  # noqa: E402
from core.medicine_composition import composition_key, salt_key  # noqa: E402
from services.student_time import default_zone, local_today  # noqa: E402

PREFIX = "od-"
SOURCE = "OPEN_DATA"  # care_medicines.source is String(16)
ALLOWED_ENVIRONMENTS = ("development", "testing")
BATCH = 1000
MAX_DOWNLOAD_BYTES = 400 * 1024 * 1024
MAX_SALT_LENGTH = 80
PINCODE_DIGITS = 6

FORMS = (  # (word to look for in the name or pack label, dosage form), most specific first
    ("tablet", "TABLET"), ("tab ", "TABLET"), ("capsule", "CAPSULE"), ("syrup", "SYRUP"),
    ("suspension", "SUSPENSION"), ("drops", "DROPS"), ("cream", "CREAM"), ("ointment", "OINTMENT"),
    ("gel", "GEL"), ("lotion", "LOTION"), ("solution", "SOLUTION"), ("spray", "SPRAY"),
    ("inhaler", "INHALER"), ("injection", "INJECTION"), ("sachet", "SACHET"),
    ("lozenge", "LOZENGE"), ("powder", "POWDER"),
)
UNITS = {"mg": "mg", "mcg": "mcg", "g": "g", "gm": "g", "iu": "IU", "%": "%", "% w/w": "% w/w",
         "% w/v": "% w/v", "mg/ml": "mg/ml", "mg/5ml": "mg/5ml", "mcg/dose": "mcg/dose"}
SALT = re.compile(r"^[A-Za-z][A-Za-z0-9 ,()'./+-]*$")
STRENGTH = re.compile(r"^(?P<salt>.+?)\s*\(\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-z%/0-9 ]+?)\s*\)\s*$")

# Header names each field may arrive under (compared lower-case, spaces and underscores ignored).
MEDICINE_HEADERS = {
    "name": ("name", "brandname", "brand"),
    "manufacturer": ("manufacturername", "manufacturer", "company"),
    "pack": ("packsizelabel", "pack", "packsize"),
    "discontinued": ("isdiscontinued", "discontinued"),
    "salts": ("shortcomposition1", "shortcomposition2", "composition"),
}
FACILITY_HEADERS = {
    "name": ("hospitalname", "name", "facilityname", "hospital"),
    "state": ("state", "statename"),
    "district": ("district", "districtname"),
    "address": ("address", "location", "fulladdress"),
    "pincode": ("pincode", "pin", "pin code"),
    "phone": ("telephone", "phone", "mobilenumber", "contactnumber"),
    "latitude": ("latitude", "lat"),
    "longitude": ("longitude", "long", "lng", "lon"),
    "emergency": ("emergencynum", "emergency", "emergencyservices"),
}


class Refused(SystemExit):
    """A safety check said no. Exit code 2, with the reason."""

    def __init__(self, reason: str) -> None:
        print(f"Refused: {reason}", file=sys.stderr)
        super().__init__(2)


def check_allowed(yes: bool) -> None:
    if app_env() not in ALLOWED_ENVIRONMENTS:
        raise Refused(f"APP_ENV must be one of {ALLOWED_ENVIRONMENTS} (staging and production count as "
                      "production). Run this on the dev site only.")
    if os.getenv("SEED_OPEN_DATA", "").strip().lower() != "true":
        raise Refused("set SEED_OPEN_DATA=true on the dev server to allow loading open data.")
    if not yes:
        raise Refused("pass --yes to confirm you are on the dev site.")


# --- reading -------------------------------------------------------------------


def _norm(header: str) -> str:
    return re.sub(r"[^a-z0-9]", "", header.lower().replace("₹", ""))


def read_rows(path: Path, headers: dict[str, tuple[str, ...]]) -> Iterator[dict[str, list[str]]]:
    """Yield one dict per CSV row: field name -> every matching cell, in header-candidate order."""
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        head = next(reader, None)
        if not head:
            raise Refused(f"{path} is empty.")
        by_norm: dict[str, list[int]] = {}
        for index, title in enumerate(head):
            by_norm.setdefault(_norm(title), []).append(index)
        columns = {field: [i for cand in candidates for i in by_norm.get(_norm(cand), [])]
                   for field, candidates in headers.items()}
        for row in reader:
            yield {field: [row[i].strip() for i in cols if i < len(row) and row[i].strip()]
                   for field, cols in columns.items()}


def require_columns(path: Path, headers: dict[str, tuple[str, ...]], needed: Iterable[str]) -> None:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        head = next(csv.reader(handle), [])
    present = {_norm(title) for title in head}
    missing = [field for field in needed if not any(_norm(c) in present for c in headers[field])]
    if missing:
        raise Refused(f"{path} lacks a column for: {', '.join(missing)}. Header seen: {', '.join(head)}")


# --- medicines -----------------------------------------------------------------


def parse_strength(text: str) -> tuple[str, float, str] | None:
    """'Amoxycillin (500mg)' -> ('Amoxycillin', 500.0, 'mg'). None when it cannot be read exactly."""
    match = STRENGTH.match(text.strip())
    if not match:
        return None
    unit = UNITS.get(" ".join(match["unit"].lower().split()))
    salt = " ".join(match["salt"].split())
    value = float(match["value"])
    if unit is None or value <= 0 or not SALT.match(salt) or len(salt) > MAX_SALT_LENGTH:
        return None
    return salt, value, unit


def infer_form(*texts: str) -> str | None:
    haystack = " ".join(texts).lower() + " "
    for word, form in FORMS:
        if word in haystack:
            return form
    return None


def parse_medicine(row: dict[str, list[str]]) -> tuple[dict, None] | tuple[None, str]:
    """One normalised medicine, or (None, why it was skipped)."""
    if row["discontinued"] and row["discontinued"][0].strip().lower() in ("true", "1", "yes"):
        return None, "discontinued"
    name = (row["name"] or [""])[0][:160]
    if not name:
        return None, "no name"
    salts = [parse_strength(cell) for cell in row["salts"]]
    if not salts or any(item is None for item in salts):
        return None, "composition not readable"
    unique = {salt_key(s): (s, v, u) for s, v, u in salts if s}
    if len(unique) != len(salts):
        return None, "repeated salt"
    pack = (row["pack"] or [""])[0][:120]
    form = infer_form(name, pack)
    if form is None:
        return None, "dosage form not clear"
    return {"name": name, "manufacturer": (row["manufacturer"] or [""])[0][:120], "pack": pack,
            "form": form, "ingredients": list(unique.values())}, None


def load_medicines(db: Session, path: Path, dry_run: bool = False, limit: int = 0) -> dict[str, int]:
    require_columns(path, MEDICINE_HEADERS, ("name", "salts"))
    seen = set(db.scalars(select(M.Medicine.id).where(M.Medicine.id.startswith(PREFIX))))
    counts: dict[str, int] = {"read": 0, "added": 0, "already there": 0}
    now = time.time()
    for row in read_rows(path, MEDICINE_HEADERS):
        if limit and counts["added"] >= limit:
            break
        counts["read"] += 1
        medicine, why = parse_medicine(row)
        if medicine is None:
            counts[f"skipped: {why}"] = counts.get(f"skipped: {why}", 0) + 1
            continue
        key = composition_key(medicine["ingredients"])
        digest = hashlib.sha1(f"{medicine['name']}|{key}|{medicine['pack']}|{medicine['manufacturer']}".encode(),  # noqa: S324
                              usedforsecurity=False).hexdigest()[:20]
        medicine_id = f"{PREFIX}med-{digest}"
        if medicine_id in seen:
            counts["already there"] += 1
            continue
        seen.add(medicine_id)
        counts["added"] += 1
        if dry_run:
            continue
        db.add(M.Medicine(id=medicine_id, name=medicine["name"], composition_key=key[:600],
                          dosage_form=medicine["form"], pack=medicine["pack"],
                          manufacturer=medicine["manufacturer"], schedule="H", requires_prescription=True,
                          active=True, source=SOURCE, created_at=now, updated_at=now))
        for position, (salt, value, unit) in enumerate(medicine["ingredients"]):
            db.add(M.MedicineIngredient(id=f"{medicine_id}-{position}", medicine_id=medicine_id,
                                        position=position, salt=salt, salt_key=salt_key(salt),
                                        strength_value=value, strength_unit=unit))
        if counts["added"] % BATCH == 0:
            db.commit()
    db.commit()
    return counts


# --- facilities ----------------------------------------------------------------

NOT_CHECKED = "Open government data, not field-checked (dev site)"


def _number(text: str, low: float, high: float) -> float | None:
    try:
        value = float(text)
    except ValueError:
        return None
    return value if low <= value <= high else None


def parse_facility(row: dict[str, list[str]], state: str, district: str) -> tuple[dict, None] | tuple[None, str]:
    name = " ".join((row["name"] or [""])[0].split())[:160]
    if not name:
        return None, "no name"
    if state and (row["state"] or [""])[0].lower() != state.lower():
        return None, "other state"
    if district and (row["district"] or [""])[0].lower() != district.lower():
        return None, "other district"
    lat = _number((row["latitude"] or [""])[0], 6.0, 37.5)
    lng = _number((row["longitude"] or [""])[0], 68.0, 98.0)
    if (lat is None) != (lng is None):
        lat = lng = None  # both or neither: the model says a half pair is listed with no directions
    pin = re.sub(r"\D", "", (row["pincode"] or [""])[0])
    emergency = (row["emergency"] or [""])[0].strip().lower() in ("yes", "y", "true", "1", "24x7", "24 x 7")
    return {"name": name, "address": " ".join((row["address"] or [""])[0].split())[:400],
            "area": (row["district"] or [""])[0][:120], "pincode": pin if len(pin) == PINCODE_DIGITS else "",
            "phone": (row["phone"] or [""])[0][:32], "latitude": lat, "longitude": lng,
            "emergency": emergency}, None


def load_facilities(db: Session, path: Path, dataset: str, source_url: str, kind: str = "HOSPITAL",
                    state: str = "", district: str = "", dry_run: bool = False, today: date | None = None
                    ) -> dict[str, int]:
    require_columns(path, FACILITY_HEADERS, ("name",))
    if source_url and urllib.parse.urlparse(source_url).scheme != "https":
        raise Refused("--source-url must be an https link.")
    seen = set(db.scalars(select(M.CareFacility.id).where(M.CareFacility.id.startswith(PREFIX))))
    counts: dict[str, int] = {"read": 0, "added": 0, "already there": 0}
    now = time.time()
    verified = today or local_today(default_zone(db))
    for row in read_rows(path, FACILITY_HEADERS):
        counts["read"] += 1
        facility, why = parse_facility(row, state, district)
        if facility is None:
            counts[f"skipped: {why}"] = counts.get(f"skipped: {why}", 0) + 1
            continue
        digest = hashlib.sha1(f"{kind}|{facility['name']}|{facility['address']}|{facility['pincode']}".encode(),  # noqa: S324
                              usedforsecurity=False).hexdigest()[:20]
        facility_id = f"{PREFIX}fac-{digest}"
        if facility_id in seen:
            counts["already there"] += 1
            continue
        seen.add(facility_id)
        counts["added"] += 1
        if dry_run:
            continue
        db.add(M.CareFacility(id=facility_id, kind=kind, name=facility["name"], departments=[],
                              address=facility["address"], area=facility["area"], pincode=facility["pincode"],
                              latitude=facility["latitude"], longitude=facility["longitude"],
                              phone=facility["phone"], emergency_24x7=facility["emergency"],
                              hours_text="", source=f"{NOT_CHECKED}: {dataset}"[:200], source_url=source_url[:2000],
                              verified_on=verified, campus="", active=True, created_by="open-data",
                              created_at=now, updated_by="open-data", updated_at=now))
        if counts["added"] % BATCH == 0:
            db.commit()
    db.commit()
    return counts


# --- count, purge, fetch -------------------------------------------------------


def count_rows(db: Session) -> dict[str, int]:
    return {
        "medicines": db.scalar(select(func.count()).select_from(M.Medicine).where(M.Medicine.id.startswith(PREFIX))) or 0,
        "facilities": db.scalar(select(func.count()).select_from(M.CareFacility).where(M.CareFacility.id.startswith(PREFIX))) or 0,
    }


def purge(db: Session) -> dict[str, int]:
    """Remove only rows this script made. A medicine a listing points at is kept and counted."""
    linked = set(db.scalars(select(M.CatalogEntry.medicine_id).where(M.CatalogEntry.medicine_id.startswith(PREFIX))))
    ids = [i for i in db.scalars(select(M.Medicine.id).where(M.Medicine.id.startswith(PREFIX))) if i not in linked]
    for start in range(0, len(ids), BATCH):
        chunk = ids[start:start + BATCH]
        db.execute(delete(M.MedicineIngredient).where(M.MedicineIngredient.medicine_id.in_(chunk)))
        db.execute(delete(M.Medicine).where(M.Medicine.id.in_(chunk)))
    facilities = db.execute(delete(M.CareFacility).where(M.CareFacility.id.startswith(PREFIX))).rowcount
    db.commit()
    return {"medicines removed": len(ids), "kept (a listing uses them)": len(linked), "facilities removed": facilities}


def fetch(url: str, out: Path) -> int:
    """Download an https file to ``out`` (keep ``out`` out of git: data/open/ is ignored)."""
    parts = urllib.parse.urlparse(url)
    if parts.scheme != "https":
        raise Refused("only https downloads.")
    out.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    with urllib.request.urlopen(url, timeout=60) as response, out.open("wb") as handle:  # noqa: S310 — https checked above
        while chunk := response.read(1 << 20):
            size += len(chunk)
            if size > MAX_DOWNLOAD_BYTES:
                out.unlink(missing_ok=True)
                raise Refused("download is larger than 400 MB.")
            handle.write(chunk)
    return size


def _print(title: str, counts: dict[str, int]) -> None:
    print(title)
    for key, value in counts.items():
        print(f"  {key}: {value}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m scripts.open_data", description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    get = sub.add_parser("fetch", help="download a dataset file (https only)")
    get.add_argument("--url", required=True)
    get.add_argument("--out", required=True, type=Path)
    med = sub.add_parser("medicines", help="load a medicine list (CSV)")
    med.add_argument("file", type=Path)
    fac = sub.add_parser("facilities", help="load a hospital / clinic / pharmacy directory (CSV)")
    fac.add_argument("file", type=Path)
    fac.add_argument("--source-url", default="", help="https link to the dataset page")
    fac.add_argument("--kind", default="HOSPITAL", choices=("HOSPITAL", "CLINIC", "PHARMACY", "AMBULANCE", "BLOOD_BANK"))
    fac.add_argument("--state", default="")
    fac.add_argument("--district", default="")
    fac.add_argument("--dataset", required=True, help="name and licence, shown as each row's source")
    for load in (med, fac):
        load.add_argument("--dry-run", action="store_true", help="read and count, write nothing")
        load.add_argument("--yes", action="store_true")
    med.add_argument("--limit", type=int, default=0, help="stop after this many rows (try 500 first)")
    sub.add_parser("count")
    drop = sub.add_parser("purge")
    drop.add_argument("--yes", action="store_true")
    args = parser.parse_args(argv)

    if args.cmd == "fetch":
        check_allowed(True)
        print(f"Saved {fetch(args.url, args.out):,} bytes to {args.out}")
        return 0
    from services.db_sql import SessionLocal
    with SessionLocal() as db:
        if args.cmd == "count":
            _print("Open-data rows", count_rows(db))
            return 0
        check_allowed(args.yes)
        if args.cmd == "purge":
            _print("Purged", purge(db))
        elif args.cmd == "medicines":
            _print("Medicines" + (" (dry run)" if args.dry_run else ""),
                   load_medicines(db, args.file, args.dry_run, args.limit))
        else:
            _print("Facilities" + (" (dry run)" if args.dry_run else ""),
                   load_facilities(db, args.file, args.dataset, args.source_url, args.kind, args.state,
                                   args.district, args.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
