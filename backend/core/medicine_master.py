"""Medicine master: canonical forms, units, schedules and composition keys.

Pure functions, no database. Two products are same-salt substitutes only when
their canonical compositions are identical (every salt, every strength, no
extras) AND their dosage forms are identical. Matching is exact on purpose: a
near match (500 mg vs 650 mg, tablet vs extended-release tablet, a two-salt
combination vs one of its salts) is never a substitute.

What is normalised, and nothing more:

* salt names: Unicode NFKC, lower case, inner whitespace collapsed. No synonym
  table (paracetamol and acetaminophen are different keys); an admin enters the
  salt the way the master uses it everywhere.
* strengths: decimal arithmetic only, for exact equivalences of one unit
  family: g and mcg become mg, mg/5ml and mcg/ml become mg/ml, mg/dose becomes
  mcg/dose. Percentages, IU and mg/g stay as entered.
* ingredient order: sorted, so "A + B" and "B + A" are the same composition.
"""
from __future__ import annotations

import re
import unicodedata
from decimal import Decimal, InvalidOperation

# Same values as care_prescription_items.schedule_class (services/clinical_api.py
# SCHEDULE_CLASSES). tests/test_medicine_master.py keeps the two in step.
SCHEDULE_CLASSES = ("OTC", "H", "H1", "X")
# Schedules whose substitution needs the prescriber's or pharmacist's approval.
PRESCRIPTION_SCHEDULES = frozenset({"H", "H1", "X"})

# Dosage forms. Release profiles are separate forms: an extended-release tablet
# is not a substitute for an immediate-release one.
FORMS = (
    "TABLET", "TABLET_SR", "TABLET_ER", "TABLET_CR", "TABLET_DT", "TABLET_CHEWABLE", "TABLET_EFFERVESCENT",
    "CAPSULE", "CAPSULE_SR", "SYRUP", "SUSPENSION", "ORAL_SOLUTION", "ORAL_DROPS", "EYE_DROPS", "EAR_DROPS",
    "NASAL_SPRAY", "INJECTION", "CREAM", "OINTMENT", "GEL", "LOTION", "INHALER", "RESPULES", "SACHET",
    "POWDER", "PATCH", "SUPPOSITORY", "LOZENGE", "MOUTHWASH",
)

# unit as entered -> (canonical unit, multiplier into it)
UNITS: dict[str, tuple[str, Decimal]] = {
    "mg": ("mg", Decimal(1)),
    "g": ("mg", Decimal(1000)),
    "mcg": ("mg", Decimal("0.001")),
    "IU": ("IU", Decimal(1)),
    "mg/ml": ("mg/ml", Decimal(1)),
    "mg/5ml": ("mg/ml", Decimal("0.2")),
    "mcg/ml": ("mg/ml", Decimal("0.001")),
    "IU/ml": ("IU/ml", Decimal(1)),
    "mg/g": ("mg/g", Decimal(1)),
    "mcg/dose": ("mcg/dose", Decimal(1)),
    "mg/dose": ("mcg/dose", Decimal(1000)),
    "%w/w": ("%w/w", Decimal(1)),
    "%w/v": ("%w/v", Decimal(1)),
    "%v/v": ("%v/v", Decimal(1)),
}

MAX_INGREDIENTS = 10
# Letters, digits, spaces and ( ) . , ' / - only: no "=" or ";", which the
# composition key uses as separators.
SALT_PATTERN = re.compile(r"^[^\W_][\w ().,'/-]*$")
STRENGTH_PATTERN = re.compile(r"^\d{1,7}(\.\d{1,4})?$")


def salt_key(name: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", name).lower().split())


def validate_salt(name: str) -> str:
    cleaned = " ".join(unicodedata.normalize("NFKC", name).split())
    if not 2 <= len(cleaned) <= 120 or not SALT_PATTERN.match(cleaned):
        raise ValueError("Salt names use letters, digits, spaces and ( ) . , ' / - only (2-120 characters).")
    return cleaned


_UNIT_LOOKUP = {unit.lower(): unit for unit in UNITS}


def normalise_unit(unit: str) -> str:
    """' MG/5 ml' -> 'mg/5ml'. Raises ValueError for a unit not in UNITS."""
    found = _UNIT_LOOKUP.get("".join(unit.split()).lower())
    if found is None:
        raise ValueError(f"Unknown strength unit. Use one of: {', '.join(UNITS)}.")
    return found


def canonical_strength(value: str, unit: str) -> tuple[str, str]:
    """('0.5', 'g') -> ('500', 'mg'). Raises ValueError for anything not exact."""
    unit = normalise_unit(unit)
    if not STRENGTH_PATTERN.match(value):
        raise ValueError("Strength must be a positive number with at most 4 decimal places.")
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:  # pattern already excludes this; kept for safety
        raise ValueError("Strength must be a number.") from exc
    if amount <= 0:
        raise ValueError("Strength must be greater than zero.")
    canonical_unit, factor = UNITS[unit]
    return format((amount * factor).normalize(), "f"), canonical_unit


def composition_key(ingredients: list[tuple[str, str, str]]) -> str:
    """[(salt_key, canonical_value, canonical_unit), ...] -> order-insensitive key."""
    keys = [salt for salt, _, _ in ingredients]
    if len(set(keys)) != len(keys):
        raise ValueError("Each salt may appear only once in a composition.")
    return ";".join(sorted(f"{salt}={value}{unit}" for salt, value, unit in ingredients))


def needs_prescriber_approval(schedule_class: str) -> bool:
    return schedule_class in PRESCRIPTION_SCHEDULES
