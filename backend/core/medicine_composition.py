"""Pure rules of the medicine master: schedules, salt keys and composition keys.

No database and no service imports, so the dev seed and the API share one
definition of "same composition" without an import cycle.
"""
from __future__ import annotations

SCHEDULES = ("OTC", "H", "H1", "X")


def requires_prescription_for(schedule: str) -> bool:
    """Only OTC is sold without a prescription. An unknown schedule needs one (fail closed)."""
    return schedule != "OTC"


def salt_key(salt: str) -> str:
    return " ".join(salt.lower().split())


def strength_label(value: float, unit: str) -> str:
    return f"{value:g} {unit}"


def composition_key(ingredients: list[tuple[str, float, str]]) -> str:
    """Order-independent key of (salt, strength value, unit) triples."""
    return "+".join(sorted(f"{salt_key(salt)}@{value:g}{unit}" for salt, value, unit in ingredients))
