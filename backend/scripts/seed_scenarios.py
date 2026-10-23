"""Staging test data: about 2 lakh rows across every main scenario, and a way to remove them.

    APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios seed --yes
    APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios seed --yes --scale 0.1   # ~20k rows
    APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios purge --yes
    python -m scripts.seed_scenarios count

For a separate staging server only (docs/guides/staging-seed.md). What keeps it
off the live site and away from real people:

* **It refuses to run** unless APP_ENV is development or testing (staging counts
  as production in core/app_env.py), SEED_SCENARIOS=true, and --yes is given.
* **It refuses a database that already holds real students** (more than
  REAL_STUDENT_LIMIT accounts it didn't make), so it can't be pointed at a copy
  of production by mistake. --allow-existing overrides that, deliberately.
* **It refuses while WhatsApp delivery is configured**: the seeded numbers look
  real, and a reminder must never reach a stranger. Every seeded email is on the
  reserved ``.test`` domain, which can't deliver.
* **Everything it makes is marked**: ids start ``seed-``, emails end
  ``@seed.studentkare.test``, names say "Test", profiles carry ``"seed"``. purge
  removes exactly those rows and nothing else.
* **One known password** for every seeded account that has one
  (SEED_PASSWORD, printed by ``count``), and one known PIN (SEED_PIN), so testers
  can sign in as any scenario. Both are hashed once and shared: this is test data.

Deterministic: the same --random-seed gives the same data.
"""
from __future__ import annotations

import argparse
import random
import sys
import time
from collections.abc import Iterable
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import os  # noqa: E402

from sqlalchemy import delete, func, insert, or_, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from core import workflow_models as M  # noqa: E402
from core.app_env import app_env  # noqa: E402
from services.workflow_auth import SIGNUP_CONSENT_VERSION, SIGNUP_REQUIRED_PURPOSES  # noqa: E402

PREFIX = "seed-"
EMAIL_DOMAIN = "seed.studentkare.test"
MARK = "scenarios-v1"
SEED_PASSWORD = "Staging-river 2026"  # noqa: S105 — the published test password for seeded accounts
SEED_PIN = "482915"
# Ten named accounts per role, easy to type: student01@studentkare.test … campus10@studentkare.test.
# On staging (APP_ENV=testing, SEED_DEMO_DATA=true, DEV_OTP_CONSOLE=true) any @studentkare.test account
# takes the fixed code 123456 (services/demo_seed.is_demo_identifier); students also have the password and PIN.
NAMED_DOMAIN = "studentkare.test"
NAMED_PER_ROLE = 10
NAMED_ROLES = (("student", "STUDENT", ""), ("lab", "VENDOR", "LAB"), ("clinic", "VENDOR", "CLINIC"),
               ("doctor", "NMC_DOCTOR", ""), ("pharmacy", "VENDOR", "PHARMACY"), ("campus", "CAMPUS_ADMIN", ""))
NAMED_PHONE_BASE = 9_600_000_000
REAL_STUDENT_LIMIT = 50
CHUNK = 2000
DAY = 86_400
ALLOWED_ENVIRONMENTS = ("development", "testing")
# How common each scenario is (a share of 1). Test-data definitions, kept in one place.
SHARE = {
    "age_verified": 0.7, "verified_student": 0.6, "has_pin": 0.35, "listing_inactive": 0.05,
    "reading_out_of_range": 0.03, "plan_stopped": 0.2, "dose_skipped": 0.2, "unpaid_failed_attempt": 0.3,
    "lab_critical": 0.04, "lab_at_home": 0.8, "consult_in_call": 0.3,
}
# The values the app itself uses (services/*.py); weights repeat a value to make it more common.
VERIFICATION_STATUSES = ("VERIFIED", "VERIFIED", "VERIFIED", "PENDING", "PENDING", "REJECTED")
METRICS = {  # metric: (low, high, whole number)
    "heart": (58, 110, True), "oxygen": (93, 100, True), "sleep": (4.0, 9.5, False), "steps": (800, 16000, True),
    "temperature": (36.2, 38.6, False), "weight": (42.0, 98.0, False), "systolic": (100, 150, True),
    "diastolic": (62, 98, True), "glucose": (70, 210, True), "water": (150, 600, True),
}
READING_SOURCES = ("MANUAL", "MANUAL", "HEALTHKIT", "HEALTH_CONNECT", "PHONE_MOTION")
PAYMENT_MIX = ("PAID", "PAID", "PAID", "PAID", "UNPAID", "UNPAID", "EXPIRED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED")
LAB_STATUSES = ("BOOKED", "ASSIGNED", "SAMPLE_COLLECTED", "IN_TRANSIT", "RECEIVED_AT_LAB", "IN_ANALYSIS", "REPORT_READY",
                "REPORT_RELEASED", "REPORT_RELEASED", "REPORT_RELEASED", "SAMPLE_REJECTED", "RECOLLECTION_REQUIRED",
                "CANCELLED")
SAMPLE_STATES = {"IN_TRANSIT", "RECEIVED_AT_LAB", "IN_ANALYSIS", "REPORT_READY", "REPORT_RELEASED", "SAMPLE_REJECTED",
                 "RECOLLECTION_REQUIRED"}
APPOINTMENT_STATUSES = ("REQUESTED", "CONFIRMED", "CONFIRMED", "COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "NO_SHOW")
CRISIS_KINDS = ("CRISIS_SELF_HARM", "CRISIS_MEDICAL", "CRISIS_OVERDOSE", "ERROR_FAIL_CLOSED")
CRISIS_OUTCOMES = ("PENDING", "CONTACTED", "CONTACTED", "ESCALATED", "NO_CONTACT_NEEDED", "UNREACHABLE")
SOS_STATUSES = ("ACTIVE", "ACKNOWLEDGED", "RESOLVED", "RESOLVED", "RESOLVED", "CANCELLED")
PRODUCTS = (("Vitamin C 500 mg (test)", "vitamins", 14900), ("ORS sachets (test)", "first-aid", 9900),
            ("Paracetamol 500 mg (test)", "medicines", 3500), ("Moisturiser 100 ml (test)", "skin", 24900),
            ("Digital thermometer (test)", "devices", 29900), ("Antacid tablets (test)", "stomach", 5500))
LAB_TESTS = (("Complete Blood Count (test)", ["Haemoglobin", "WBC", "Platelets"], 39900),
             ("Thyroid Profile (test)", ["TSH", "T3", "T4"], 59900), ("Vitamin D (test)", ["Vitamin D"], 89900),
             ("Lipid Profile (test)", ["Cholesterol", "HDL", "LDL", "Triglycerides"], 49900))
ANALYTES = {"Haemoglobin": ("g/dL", 12.0, 16.0), "WBC": ("10^3/uL", 4.0, 11.0), "Platelets": ("10^3/uL", 150, 410),
            "TSH": ("uIU/mL", 0.4, 4.0), "T3": ("ng/dL", 80, 200), "T4": ("ug/dL", 5.0, 12.0),
            "Vitamin D": ("ng/mL", 30, 100), "Cholesterol": ("mg/dL", 0, 200), "HDL": ("mg/dL", 40, 90),
            "LDL": ("mg/dL", 0, 130), "Triglycerides": ("mg/dL", 0, 150)}

FIRST = ("Aarav", "Diya", "Ishaan", "Meera", "Kabir", "Ananya", "Rohan", "Saanvi", "Arjun", "Priya", "Vihaan", "Kavya",
         "Aditya", "Nisha", "Rahul", "Sneha", "Karthik", "Lakshmi", "Varun", "Pooja", "Sai", "Divya", "Nikhil", "Asha")
LAST = ("Rao", "Reddy", "Sharma", "Iyer", "Naidu", "Patel", "Gupta", "Khan", "Das", "Menon", "Verma", "Singh",
        "Kumar", "Nair", "Joshi", "Pillai", "Chowdary", "Mehta", "Bose", "Varma")
CITIES = ("Hyderabad", "Vijayawada", "Visakhapatnam", "Warangal", "Guntur", "Tirupati", "Bengaluru", "Chennai")


class Refused(SystemExit):
    """A safety check said no. Exit code 2, with the reason."""

    def __init__(self, reason: str) -> None:
        print(f"Refused: {reason}", file=sys.stderr)
        super().__init__(2)


# --- safety --------------------------------------------------------------------


def check_allowed(db: Session, allow_existing: bool) -> None:
    if app_env() not in ALLOWED_ENVIRONMENTS:
        raise Refused(f"APP_ENV must be one of {ALLOWED_ENVIRONMENTS} (staging counts as production). "
                      "Set it on the staging server only.")
    if os.getenv("SEED_SCENARIOS", "").strip().lower() != "true":
        raise Refused("set SEED_SCENARIOS=true on the staging server to allow seeding.")
    from services.otp_delivery import _openwa, _openwa_configured
    if _openwa_configured(_openwa()):
        raise Refused("WhatsApp delivery is configured here. Seeded numbers look real; turn OpenWA off on staging first.")
    real = db.scalar(select(func.count()).select_from(M.Account).where(
        M.Account.role == "STUDENT", ~M.Account.id.startswith(PREFIX))) or 0
    if real > REAL_STUDENT_LIMIT and not allow_existing:
        raise Refused(f"this database has {real} students the seed didn't make. It looks like real data. "
                      "Use a fresh staging database (or --allow-existing if you are sure).")


# --- helpers -------------------------------------------------------------------


def sid(kind: str, n: int) -> str:
    return f"{PREFIX}{kind}-{n:06d}"


def bulk(db: Session, model, rows: Iterable[dict]) -> int:
    """Inserts in chunks; returns how many."""
    table, batch, total = model.__table__, [], 0
    for row in rows:
        batch.append(row)
        if len(batch) >= CHUNK:
            db.execute(insert(table), batch)
            total += len(batch)
            batch = []
    if batch:
        db.execute(insert(table), batch)
        total += len(batch)
    return total


def iso_day(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()


def iso_time(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def phone_for(n: int) -> str:
    """A valid-looking Indian mobile number, unique per n (never sent to: see check_allowed)."""
    return f"9{(700_000_000 + n):09d}"


class World:
    """What later scenarios pick from: campuses, staff, partners, students."""

    def __init__(self, rng: random.Random, now: float) -> None:
        self.rng, self.now = rng, now
        self.campuses: list[str] = []
        self.students: list[dict] = []          # active, claimed or signed up
        self.campus_admins: list[str] = []
        self.counsellors: list[str] = []
        self.doctors: list[str] = []
        self.vendors: dict[str, list[str]] = {"PHARMACY": [], "LAB": [], "CLINIC": [], "WELLNESS": []}
        self.counts: dict[str, int] = {}

    def add(self, name: str, n: int) -> None:
        self.counts[name] = self.counts.get(name, 0) + n


# --- accounts, contacts, credentials, consent ----------------------------------


def seed_people(db: Session, world: World, students: int) -> None:
    """Campuses, staff, partners and students in every sign-up and sign-in state."""
    from services.team_accounts import hash_pin
    rng, now = world.rng, world.now
    password_hash, pin_hash = hash_pin(SEED_PASSWORD), hash_pin(SEED_PIN)
    campus_count = max(4, students // 1000)
    world.campuses = [f"Test Campus {i:02d} ({CITIES[i % len(CITIES)]})" for i in range(1, campus_count + 1)]

    accounts, contacts, passwords, passcodes, consents, verifications, invites = [], [], [], [], [], [], []
    n = 0

    def account(role: str, name: str, profile: dict, kind: str = "", verified_phone: bool | None = True,
                password: bool = True, named: str = "", phone: str = "") -> dict:
        nonlocal n
        n += 1
        account_id = f"{PREFIX}named-{named}" if named else sid("acc", n)
        email = f"{named}@{NAMED_DOMAIN}" if named else f"{role.lower()}.{n:06d}@{EMAIL_DOMAIN}"
        created = now - rng.randint(1, 400) * DAY
        row = {"id": account_id, "identifier": email, "channel": "EMAIL", "full_name": name, "role": role,
               "active": True, "profile": {**profile, "seed": MARK}, "created_at": created, "partner_kind": kind,
               "is_team_account": False,
               # Campus scope is its own server-assigned column (audit C1).
               "staff_campus": profile.get("university", "") if role in ("CAMPUS_ADMIN", "COUNSELLOR") else ""}
        accounts.append(row)
        contacts.append({"id": sid("ct", 2 * n), "account_id": account_id, "kind": "EMAIL", "value": email,
                         "verified_at": created, "created_at": created})
        if verified_phone is not None:
            contacts.append({"id": sid("ct", 2 * n + 1), "account_id": account_id, "kind": "WHATSAPP",
                             "value": phone or phone_for(n), "verified_at": created if verified_phone else 0.0,
                             "created_at": created})
        if password:
            passwords.append({"account_id": account_id, "password_hash": password_hash, "failed_attempts": 0,
                              "locked_until": 0.0, "created_at": created, "updated_at": 0.0, "last_sign_in_at": 0.0})
        return row

    def person() -> str:
        return f"Test {rng.choice(FIRST)} {rng.choice(LAST)}"

    # The named accounts first, so they are the same on every run and join the scenarios below.
    k = 0
    for label, role, kind in NAMED_ROLES:
        for i in range(1, NAMED_PER_ROLE + 1):
            k += 1
            named, campus = f"{label}{i:02d}", world.campuses[(i - 1) % len(world.campuses)]
            title = f"Test {label.title()} {i:02d}"
            profile = ({"university": campus, "rollNumber": f"NAMED{i:02d}", "dob": "2003-06-15", "ageVerified": True,
                        "isVerifiedStudent": True, "seedScenario": "NAMED"} if role == "STUDENT"
                       else {"university": campus} if role == "CAMPUS_ADMIN"
                       else {"registrationNo": f"TEST-NMC-NAMED-{i:02d}"} if role == "NMC_DOCTOR"
                       else {"organisation": title})
            row = account(role, title, profile, kind=kind, named=named, phone=str(NAMED_PHONE_BASE + k))
            if role == "STUDENT":
                consents.append({"id": f"{PREFIX}named-cons-{named}", "account_id": row["id"], "version": SIGNUP_CONSENT_VERSION,
                                 "purposes": list(SIGNUP_REQUIRED_PURPOSES), "language": "en", "recorded_at": row["created_at"],
                                 "withdrawn_at": 0.0})
                passcodes.append({"account_id": row["id"], "passcode_hash": pin_hash, "length": len(SEED_PIN),
                                  "failed_attempts": 0, "locked_until": 0.0, "created_at": row["created_at"],
                                  "updated_at": 0.0, "last_sign_in_at": 0.0})
                verifications.append({"account_id": row["id"], "university": campus, "roll_number": profile["rollNumber"],
                                      "status": "VERIFIED", "verified_by": "", "verified_at": row["created_at"] + DAY})
                world.students.append({"id": row["id"], "campus": campus, "created": row["created_at"]})
            elif role == "CAMPUS_ADMIN":
                world.campus_admins.append(row["id"])
            elif role == "NMC_DOCTOR":
                world.doctors.append(row["id"])
            else:
                world.vendors[kind].append(row["id"])

    for campus in world.campuses:
        world.campus_admins.append(account("CAMPUS_ADMIN", f"{person()} (campus admin)", {"university": campus})["id"])
        for _ in range(2):
            world.counsellors.append(account("COUNSELLOR", f"{person()} (counsellor)", {"university": campus})["id"])
    for _ in range(max(10, students // 200)):
        world.doctors.append(account("NMC_DOCTOR", f"Dr {person()[5:]} (test)", {"registrationNo": f"TEST-NMC-{n:05d}"})["id"])
    for kind in world.vendors:
        for _ in range(max(5, students // 400)):
            org = f"Test {kind.title()} {n:04d}"
            world.vendors[kind].append(account("VENDOR", org, {"organisation": org}, kind=kind)["id"])

    # Students: the scenarios, by share of the total.
    scenarios = (("B2C", 0.62), ("B2C_NO_WHATSAPP", 0.08), ("B2C_UNVERIFIED_WHATSAPP", 0.05),
                 ("B2B_CLAIMED", 0.15), ("B2B_PENDING", 0.06), ("B2B_EXPIRED", 0.02), ("B2B_LOCKED", 0.01),
                 ("DISABLED", 0.01))
    plan = [name for name, share in scenarios for _ in range(int(students * share))]
    plan += ["B2C"] * (students - len(plan))
    rng.shuffle(plan)
    for scenario in plan:
        campus = rng.choice(world.campuses)
        b2b = scenario.startswith("B2B")
        pending = scenario in ("B2B_PENDING", "B2B_EXPIRED", "B2B_LOCKED")
        dob = date(rng.randint(1996, 2006), rng.randint(1, 12), rng.randint(1, 28)).isoformat()
        profile = {"university": campus, "rollNumber": f"TST{n:06d}", "ageVerified": rng.random() < SHARE["age_verified"],
                   "isVerifiedStudent": rng.random() < SHARE["verified_student"], "seedScenario": scenario}
        if pending:
            profile["invitePending"] = True
        else:
            profile["dob"] = dob
        phone_state = None if scenario == "B2C_NO_WHATSAPP" else (False if scenario == "B2C_UNVERIFIED_WHATSAPP" or pending else True)
        row = account("STUDENT", person(), profile, verified_phone=phone_state, password=not pending)
        if pending:
            # A pending invite: every contact unverified, nothing can sign in (services/student_invites.py).
            for contact in contacts[-2:]:
                if contact["account_id"] == row["id"]:
                    contact["verified_at"] = 0.0
            expired = scenario == "B2B_EXPIRED"
            invites.append({"id": sid("inv", n), "account_id": row["id"], "token_hash": f"seed-invite-{n:06d}".ljust(64, "0"),
                            "temp_password_hash": password_hash, "link_channel": "EMAIL", "university": campus,
                            "created_by": rng.choice(world.campus_admins), "created_at": row["created_at"],
                            "expires_at": row["created_at"] + (DAY if expired else 400 * DAY), "sent_at": row["created_at"],
                            "claimed_at": 0.0, "failed_attempts": 5 if scenario == "B2B_LOCKED" else 0,
                            "locked_until": now + DAY if scenario == "B2B_LOCKED" else 0.0})
            continue
        if scenario == "DISABLED":
            row["active"] = False
        if b2b:
            invites.append({"id": sid("inv", n), "account_id": row["id"], "token_hash": f"seed-invite-{n:06d}".ljust(64, "0"),
                            "temp_password_hash": password_hash, "link_channel": "EMAIL", "university": campus,
                            "created_by": rng.choice(world.campus_admins), "created_at": row["created_at"] - DAY,
                            "expires_at": row["created_at"] + 2 * DAY, "sent_at": row["created_at"] - DAY,
                            "claimed_at": row["created_at"], "failed_attempts": 0, "locked_until": 0.0})
        consents.append({"id": sid("cons", n), "account_id": row["id"], "version": SIGNUP_CONSENT_VERSION,
                         "purposes": list(SIGNUP_REQUIRED_PURPOSES), "language": rng.choice(("en", "en", "te", "hi")),
                         "recorded_at": row["created_at"], "withdrawn_at": 0.0})
        if rng.random() < SHARE["has_pin"]:
            passcodes.append({"account_id": row["id"], "passcode_hash": pin_hash, "length": len(SEED_PIN),
                              "failed_attempts": 0, "locked_until": 0.0, "created_at": row["created_at"],
                              "updated_at": 0.0, "last_sign_in_at": 0.0})
        verifications.append({"account_id": row["id"], "university": campus, "roll_number": profile["rollNumber"],
                              "status": rng.choice(VERIFICATION_STATUSES), "verified_by": rng.choice(world.campus_admins),
                              "verified_at": row["created_at"] + DAY})
        if row["active"]:
            world.students.append({"id": row["id"], "campus": campus, "created": row["created_at"]})

    for model, rows, label in ((M.Account, accounts, "accounts"), (M.AccountContact, contacts, "contacts"),
                               (M.AccountPassword, passwords, "passwords"), (M.StudentPasscode, passcodes, "pins"),
                               (M.StudentInvite, invites, "invites"), (M.ConsentRecord, consents, "consents"),
                               (M.CampusVerification, verifications, "campus verifications")):
        world.add(label, bulk(db, model, rows))
    db.flush()


# --- partners and what they sell -----------------------------------------------


def seed_partners(db: Session, world: World) -> None:
    """A service-provider row per partner, and a catalogue: products, lab tests, consults."""
    rng, now = world.rng, world.now
    providers, catalog = [], []
    world.lab_providers: list[str] = []
    world.products: list[dict] = []
    world.lab_items: list[dict] = []
    world.consults: list[dict] = []
    for kind, owners in world.vendors.items():
        for i, owner in enumerate(owners):
            provider_id = sid(f"sp-{kind.lower()}", i)
            providers.append({
                "id": provider_id, "account_id": owner, "kind": kind, "legal_name": f"Test {kind.title()} {i:04d} Pvt Ltd",
                "licence_no": f"TEST-{kind[:3]}-{i:05d}", "licence_expiry": now + 365 * DAY, "accreditation": "",
                "address": f"{i + 1} Test Street, {CITIES[i % len(CITIES)]}", "pincode": f"5000{i % 90 + 10:02d}",
                "latitude": 17.38 + rng.random() / 10, "longitude": 78.48 + rng.random() / 10,
                "serviceable_pincodes": [f"5000{j:02d}" for j in range(10, 40)], "open_hours": "09:00-21:00",
                "home_collection": kind == "LAB", "delivery_available": kind == "PHARMACY", "pickup_available": True,
                "source_url": "", "verified_at": now - 30 * DAY, "active": True, "updated_at": now})
            if kind == "LAB":
                world.lab_providers.append(provider_id)
            items = PRODUCTS if kind == "PHARMACY" else LAB_TESTS if kind == "LAB" else ()
            for j, entry in enumerate(items):
                item_id = sid(f"cat-{kind.lower()}", i * 10 + j)
                base = {"id": item_id, "provider_id": owner, "brand": "Test brand", "description": "Staging test listing. Not a real product or service.",
                        "pack": "1 unit", "mrp_paise": entry[-1], "stock": rng.randint(0, 200), "active": rng.random() > SHARE["listing_inactive"],
                        "requires_prescription": False, "preparation": "", "image_id": "", "image_mime": "", "medicine_id": None}
                if kind == "PHARMACY":
                    row = {**base, "kind": "product", "name": entry[0], "category": entry[1], "price_paise": entry[2],
                           "includes": [], "fasting_hours": 0, "report_hours": 0}
                    world.products.append(row)
                else:
                    row = {**base, "kind": "lab", "name": entry[0], "category": "labs", "price_paise": entry[2],
                           "includes": entry[1], "fasting_hours": 10 if "Lipid" in entry[0] else 0, "report_hours": 24,
                           "preparation": "Fasting 10 hours" if "Lipid" in entry[0] else ""}
                    world.lab_items.append({**row, "lab_id": provider_id})
                catalog.append(row)
    for i, doctor in enumerate(world.doctors):
        row = {"id": sid("cat-consult", i), "provider_id": doctor, "kind": "consultation", "name": "General consultation (test)",
               "brand": "Test clinic", "category": "general-care", "description": "Staging test consultation.", "pack": "20 minutes",
               "price_paise": 29900, "mrp_paise": 29900, "stock": 0, "active": True, "requires_prescription": False,
               "preparation": "", "image_id": "", "image_mime": "", "medicine_id": None, "includes": [], "fasting_hours": 0,
               "report_hours": 0}
        catalog.append(row)
        world.consults.append(row)
    world.add("service providers", bulk(db, M.ServiceProvider, providers))
    world.add("catalogue items", bulk(db, M.CatalogEntry, catalog))
    db.flush()


# --- health records -------------------------------------------------------------


def seed_readings(db: Session, world: World, total: int) -> None:
    rng, now = world.rng, world.now

    def rows():
        for n in range(total):
            student = rng.choice(world.students)
            metric = rng.choice(tuple(METRICS))
            low, high, whole = METRICS[metric]
            value = rng.randint(int(low), int(high)) if whole else round(rng.uniform(low, high), 1)
            if rng.random() < SHARE["reading_out_of_range"]:   # one the dashboards must flag
                value = round(high * 1.25, 1)
            when = rng.uniform(max(student["created"], now - 180 * DAY), now - 60)
            yield {"id": sid("rd", n), "account_id": student["id"], "metric": metric, "value": value,
                   "recorded_at": iso_time(when), "source": rng.choice(READING_SOURCES)}
    world.add("health readings", bulk(db, M.Reading, rows()))


def seed_medications(db: Session, world: World, plans: int) -> None:
    rng, now = world.rng, world.now
    plan_rows, doses = [], []
    for n in range(plans):
        student = rng.choice(world.students)
        times = rng.choice((1, 1, 2, 3))
        plan_id = sid("med", n)
        plan_rows.append({"id": plan_id, "account_id": student["id"], "name": rng.choice(("Iron supplement (test)", "Vitamin D3 (test)", "Antibiotic course (test)", "Inhaler (test)")),
                          "dosage": "1 tablet", "frequency": f"{times} times a day", "times_per_day": times, "source": "USER",
                          "active": rng.random() > SHARE["plan_stopped"], "created_at": now - rng.randint(5, 60) * DAY})
        for day in range(rng.randint(1, 4)):
            for slot in range(times):
                doses.append({"id": sid("dose", len(doses)), "plan_id": plan_id, "account_id": student["id"],
                              "dose_date": iso_day(now - day * DAY), "dose_time": f"{8 + slot * 6:02d}:00:00",
                              "taken_at": now - day * DAY, "outcome": "SKIPPED" if rng.random() < SHARE["dose_skipped"] else "TAKEN"})
    world.add("medication plans", bulk(db, M.MedicationPlan, plan_rows))
    world.add("medication doses", bulk(db, M.MedicationDose, doses))


# --- orders, labs, consults --------------------------------------------------------


def seed_orders(db: Session, world: World, total: int) -> None:
    rng, now = world.rng, world.now
    orders, lines, payments = [], [], []
    for n in range(total):
        student = rng.choice(world.students)
        order_id = sid("ord", n)
        status = rng.choice(PAYMENT_MIX)
        picked = rng.sample(world.products, rng.randint(1, 3))
        total_paise = 0
        created = rng.uniform(max(student["created"], now - 120 * DAY), now - 3600)
        for j, item in enumerate(picked):
            quantity = rng.randint(1, 3)
            total_paise += item["price_paise"] * quantity
            line_status = ("CANCELLED" if status in ("EXPIRED", "CANCELLED") else "REQUESTED" if status == "UNPAID"
                           else rng.choice(("ACCEPTED", "DISPATCHED", "COMPLETED", "COMPLETED", "DECLINED")))
            lines.append({"id": sid("line", n * 4 + j), "order_id": order_id, "item_id": item["id"], "provider_id": item["provider_id"],
                          "name": item["name"], "kind": "product", "quantity": quantity, "price_paise": item["price_paise"],
                          "status": line_status})
        mode = rng.choice(("delivery", "pickup"))
        orders.append({"id": order_id, "account_id": student["id"], "idempotency_key": f"seed-{n:07d}", "request_hash": f"{n:064d}",
                       "total_paise": total_paise, "delivery": {"mode": mode, "address": "Room 214, Hostel B, Test Campus" if mode == "delivery" else "",
                                                                "city": rng.choice(CITIES), "pincode": "500032"},
                       "requested_slot": "", "payment_status": status, "created_at": created,
                       "payment_due_at": created + 1800 if status in ("UNPAID", "EXPIRED") else 0.0})
        if status in ("PAID", "REFUNDED", "PARTIALLY_REFUNDED") or (status == "UNPAID" and rng.random() < SHARE["unpaid_failed_attempt"]):
            captured = status != "UNPAID"
            refunded = total_paise if status == "REFUNDED" else total_paise // 2 if status == "PARTIALLY_REFUNDED" else 0
            payments.append({"id": sid("pay", n), "order_id": order_id, "payable_kind": "shop_order", "payable_id": order_id,
                             "amount_paise": total_paise, "status": "CAPTURED" if captured else "FAILED", "provider": "mock",
                             "provider_ref": f"seed_pay_{n:07d}", "idempotency_key": f"seed-pay-{n:07d}", "created_at": created + 60,
                             "settled_at": created + 120 if captured else 0.0, "intent_id": "", "refunded_paise": refunded,
                             "failure_code": "" if captured else "CARD_DECLINED"})
    world.add("orders", bulk(db, M.Order, orders))
    world.add("order lines", bulk(db, M.OrderLine, lines))
    world.add("payments", bulk(db, M.Payment, payments))


def seed_labs(db: Session, world: World, total: int) -> None:
    rng, now = world.rng, world.now
    lab_orders, results = [], []
    for n in range(total):
        student = rng.choice(world.students)
        item = rng.choice(world.lab_items)
        status = rng.choice(LAB_STATUSES)
        created = rng.uniform(max(student["created"], now - 120 * DAY), now - DAY)
        critical = status == "REPORT_RELEASED" and rng.random() < SHARE["lab_critical"]
        order_id = sid("lab", n)
        lab_orders.append({
            "id": order_id, "prescription_id": "", "patient_id": student["id"], "lab_id": item["lab_id"], "ordered_by": student["id"],
            "test_panel": [item["name"]], "clinical_indication": "", "collection_mode": "HOME" if rng.random() < SHARE["lab_at_home"] else "WALK_IN",
            "slot_start": iso_time(created + DAY), "catalog_item_id": item["id"], "slot_id": None,
            "fasting_required": item["fasting_hours"] > 0, "collector_name": "Test Collector" if status != "BOOKED" else "",
            "collector_id": "", "collection_address": {"kind": "HOSTEL", "hostelBlock": "B", "room": f"{rng.randint(100, 499)}"},
            "tube_count": 2, "collected_at": created + DAY if status in SAMPLE_STATES else 0.0, "handed_over_at": 0.0,
            "sample_id": f"SEED-S{n:07d}" if status in SAMPLE_STATES else "", "status": status, "report_document_id": "",
            "critical_flag": critical, "critical_note": "Value well outside the reference range (test data)" if critical else "",
            "critical_acknowledged_at": 0.0, "critical_acknowledged_by": "",
            "rejection_reason": "Haemolysed sample (test data)" if status in ("SAMPLE_REJECTED", "RECOLLECTION_REQUIRED") else "",
            "report_content": None, "report_mime": "", "report_filename": "", "reviewer_id": "", "reviewed_at": 0.0,
            "review_note": "", "created_at": created, "updated_at": created + 2 * DAY})
        if status in ("REPORT_READY", "REPORT_RELEASED"):
            for analyte in item["includes"]:
                unit, low, high = ANALYTES[analyte]
                value = round(rng.uniform(low * 0.8, high * 1.2 if not critical else high * 2), 2)
                results.append({"id": sid("res", len(results)), "account_id": student["id"], "test_code": None,
                                "test_name_as_printed": analyte, "value_numeric": value, "value_text": "", "unit": unit,
                                "ref_low": low, "ref_high": high, "ref_text": "", "collected_on": date.fromtimestamp(created + DAY),
                                "lab_name": "Test Lab", "source": "LAB_RELEASED", "document_id": None, "lab_order_id": order_id,
                                "status": "CONFIRMED", "created_at": created + 2 * DAY, "confirmed_at": created + 2 * DAY})
    world.add("lab orders", bulk(db, M.LabOrder, lab_orders))
    world.add("lab results", bulk(db, M.LabResult, results))


def seed_consults(db: Session, world: World, total: int) -> None:
    rng, now = world.rng, world.now
    slots, appointments, sessions = [], [], []
    for n in range(total):
        student = rng.choice(world.students)
        item = rng.choice(world.consults)
        status = rng.choice(APPOINTMENT_STATUSES)
        start = now + rng.randint(-60, 14) * DAY + rng.randint(9, 18) * 3600
        slot_id = sid("slot", n)
        slots.append({"id": slot_id, "provider_id": item["provider_id"], "catalog_item_id": item["id"],
                      "slot_start": iso_time(start), "slot_end": iso_time(start + 1200), "capacity": 1,
                      "booked": 0 if status == "CANCELLED" else 1, "active": True})
        appointment_id = sid("appt", n)
        appointments.append({"id": appointment_id, "account_id": student["id"], "provider_id": item["provider_id"],
                             "catalog_item_id": item["id"], "slot_id": slot_id, "status": status,
                             "created_at": start - 3 * DAY, "updated_at": start - DAY})
        if status == "CONFIRMED" and rng.random() < SHARE["consult_in_call"]:
            sessions.append({"id": sid("sess", n), "appointment_id": appointment_id, "student_id": student["id"],
                             "provider_id": item["provider_id"], "status": rng.choice(("WAITING", "IN_PROGRESS")),
                             "student_joined_at": start, "provider_joined_at": 0.0, "ended_at": 0.0, "signal_payload": {}})
    world.add("availability slots", bulk(db, M.AvailabilitySlot, slots))
    world.add("appointments", bulk(db, M.Appointment, appointments))
    world.add("consult sessions", bulk(db, M.ConsultationSession, sessions))


def seed_safety(db: Session, world: World, total: int) -> None:
    """Crisis events (the counsellor queue) and SOS alerts, in every state."""
    rng, now = world.rng, world.now
    crises, alerts = [], []
    for n in range(total):
        student = rng.choice(world.students)
        outcome = rng.choice(CRISIS_OUTCOMES)
        created = now - rng.randint(1, 90 * 24) * 3600
        crises.append({"id": sid("crisis", n), "account_id": student["id"], "kind": rng.choice(CRISIS_KINDS),
                       "language": rng.choice(("EN", "HI", "TE")), "surface": rng.choice(("care_navigator", "agent_ayush")),
                       "detected_by": rng.choice(("SERVER", "CLIENT")), "created_at": created,
                       "acknowledged_at": 0.0 if outcome == "PENDING" else created + 1800,
                       "acknowledged_by": "" if outcome == "PENDING" else rng.choice(world.counsellors),
                       "outcome": outcome, "outcome_note": "" if outcome == "PENDING" else "Test follow-up note."})
        status = rng.choice(SOS_STATUSES)
        alerts.append({"id": sid("sos", n), "account_id": student["id"], "campus": student["campus"],
                       "location_note": "Hostel B, 2nd floor (test)", "latitude": 17.4, "longitude": 78.5, "status": status,
                       "created_at": created, "acknowledged_by": "" if status in ("ACTIVE", "CANCELLED") else rng.choice(world.campus_admins),
                       "acknowledged_at": 0.0 if status in ("ACTIVE", "CANCELLED") else created + 300,
                       "resolved_at": created + 3600 if status == "RESOLVED" else 0.0,
                       "resolution_note": "Resolved (test data)." if status == "RESOLVED" else "",
                       "cancelled_at": created + 120 if status == "CANCELLED" else 0.0})
    world.add("crisis events", bulk(db, M.CrisisEvent, crises))
    world.add("SOS alerts", bulk(db, M.SosAlert, alerts))


def seed(db: Session, scale: float, random_seed: int) -> World:
    """About 2 lakh rows at scale 1.0. Commits once at the end; a failure leaves nothing behind."""
    world = World(random.Random(random_seed), time.time())  # noqa: S311 — test data, not security
    students = max(100, int(20_000 * scale))
    seed_people(db, world, students)
    seed_partners(db, world)
    seed_readings(db, world, int(45_000 * scale))
    seed_medications(db, world, int(2_000 * scale))
    seed_orders(db, world, int(6_000 * scale))
    seed_labs(db, world, int(4_000 * scale))
    seed_consults(db, world, int(3_000 * scale))
    seed_safety(db, world, int(300 * scale) or 10)
    db.commit()
    return world


# --- purge and count -----------------------------------------------------------


def seeded_tables() -> list:
    """Every table, children first, so deleting seeded rows never trips a foreign key."""
    return list(reversed(M.Base.metadata.sorted_tables))


def purge(db: Session) -> dict[str, int]:
    """Deletes every row the seed made (its id or its account id starts with ``seed-``), and nothing else."""
    removed: dict[str, int] = {}
    for table in seeded_tables():
        conditions = [column.like(f"{PREFIX}%") for column in table.columns
                      if column.name in ("id", "account_id", "patient_id", "student_id", "provider_id", "order_id",
                                         "plan_id", "appointment_id", "lab_order_id", "lab_id", "prescriber_id",
                                         "item_id", "catalog_item_id", "slot_id")
                      and str(column.type).startswith("VARCHAR")]
        if not conditions:
            continue
        count = db.execute(delete(table).where(or_(*conditions))).rowcount or 0
        if count:
            removed[table.name] = count
    return removed


def count(db: Session) -> dict[str, int]:
    found: dict[str, int] = {}
    for table in seeded_tables():
        for column in table.columns:
            if column.name in ("id", "account_id") and str(column.type).startswith("VARCHAR"):
                n = db.scalar(select(func.count()).select_from(table).where(column.like(f"{PREFIX}%"))) or 0
                if n:
                    found[table.name] = n
                break
    return found


# --- the command ------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m scripts.seed_scenarios",
                                     description="Staging test data across every scenario, and a way to remove it.")
    sub = parser.add_subparsers(dest="command", required=True)
    make = sub.add_parser("seed", help="Add about 2 lakh rows (at --scale 1).")
    make.add_argument("--scale", type=float, default=1.0, help="1.0 is about 2 lakh rows; 0.1 about 20 thousand.")
    make.add_argument("--random-seed", type=int, default=2026)
    make.add_argument("--allow-existing", action="store_true", help="Seed even though real-looking students exist.")
    make.add_argument("--yes", action="store_true", help="Required: you are on a staging server.")
    remove = sub.add_parser("purge", help="Remove every seeded row and nothing else.")
    remove.add_argument("--yes", action="store_true", help="Required.")
    sub.add_parser("count", help="How many seeded rows there are, per table.")
    args = parser.parse_args(argv)

    from services.db_sql import SessionLocal
    with SessionLocal() as db:
        if args.command == "count":
            found = count(db)
            for table, n in sorted(found.items()):
                print(f"{table:<34} {n:>8}")
            print(f"{'total':<34} {sum(found.values()):>8}")
            print(f"\nSign in as any seeded account with password {SEED_PASSWORD!r}; seeded PINs are {SEED_PIN}.")
            return 0
        if not args.yes:
            raise Refused("add --yes to confirm this is a staging server.")
        check_allowed(db, getattr(args, "allow_existing", False))
        if args.command == "purge":
            removed = purge(db)
            db.commit()
            print(f"Removed {sum(removed.values())} seeded rows from {len(removed)} tables.")
            return 0
        if db.scalar(select(func.count()).select_from(M.Account).where(M.Account.id.startswith(PREFIX))):
            raise Refused("this database is already seeded. Run purge first, then seed again.")
        started = time.monotonic()
        world = seed(db, args.scale, args.random_seed)
        for label, n in world.counts.items():
            print(f"{label:<24} {n:>8}")
        print(f"{'total rows':<24} {sum(world.counts.values()):>8}   ({time.monotonic() - started:.0f}s)")
        print(f"\nEvery seeded account's password is {SEED_PASSWORD!r}; seeded PINs are {SEED_PIN}.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
