"""Wellness metrics stored in ``care_readings`` beside the vitals.

Kept apart from ``workflow_api.METRICS`` on purpose: METRICS is what the
generic ``POST /health/readings`` form accepts and lists. These have their own
endpoints with their own rules (a water goal, one manual activity value per
day, adult body-measure bounds), so the generic form does not offer them.
Heart rate (``heart``), steps (``steps``) and weight (``weight``) already exist
in METRICS and are reused, not duplicated.

Each entry: (label, unit, min, max, whole number only).
"""
from __future__ import annotations

WATER = "water"
STEPS = "steps"
DISTANCE = "distance"
FLOORS = "floors"
ACTIVE_ENERGY = "active_energy"
STANDING = "standing_minutes"
HEART = "heart"
WEIGHT = "weight"
HEIGHT = "height"

WELLNESS_METRICS: dict[str, tuple[str, str, float, float, bool]] = {
    WATER: ("Water", "ml", 10, 2000, True),                  # one entry, not a day
    DISTANCE: ("Distance", "km", 0, 200, False),
    FLOORS: ("Floors climbed", "floors", 0, 500, True),
    ACTIVE_ENERGY: ("Active energy", "kcal", 0, 10000, False),
    STANDING: ("Standing", "min", 0, 1440, True),
    HEIGHT: ("Height", "cm", 100, 250, False),
}

# The activity metrics a trend aggregates, with the API field each maps to.
# Heart rate is deliberately absent: it is a clinical value (VitalTrends is a
# Tier 1 screen) and is only ever returned raw, to its owner, by
# GET /health/readings.
ACTIVITY_FIELDS: dict[str, str] = {
    STEPS: "steps",
    DISTANCE: "distanceKm",
    FLOORS: "floors",
    ACTIVE_ENERGY: "activeEnergyKcal",
    STANDING: "standingMinutes",
}

# Adult body-measure bounds for the weight & BMI endpoint (18+ only, AGENTS.md
# guardrail 8). The generic form keeps its wider 0.1-500 kg weight range.
WEIGHT_RANGE = (20.0, 350.0)
HEIGHT_RANGE = (100.0, 250.0)


def unit_of(metric: str) -> str:
    """Unit for any metric in care_readings, or "" for one nobody defined.

    GET /health/readings returns every row an owner has; a metric outside both
    tables must not turn that into a 500.
    """
    from services.workflow_api import METRICS

    if metric in METRICS:
        return METRICS[metric][1]
    if metric in WELLNESS_METRICS:
        return WELLNESS_METRICS[metric][1]
    return ""
