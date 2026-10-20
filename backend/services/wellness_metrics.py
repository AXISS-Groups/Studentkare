"""Wellness metrics stored in ``care_readings`` beside the vitals.

Kept apart from ``workflow_api.METRICS`` on purpose: METRICS is what the
generic ``POST /health/readings`` form accepts and lists. These have their own
endpoints with their own rules (a water goal, one manual activity value per
day, adult body-measure bounds), so the generic form does not offer them.
Their bounds are settings (core/settings_registry.py ``wellness.*``), read per
request by services/wellness_api.py; nothing here is a limit.
Heart rate (``heart``), steps (``steps``) and weight (``weight``) already exist
in METRICS and are reused, not duplicated.

Each entry: (unit, whole number only). Labels are copy and live in the app's i18n.
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

WELLNESS_METRICS: dict[str, tuple[str, bool]] = {
    WATER: ("ml", True),
    DISTANCE: ("km", False),
    FLOORS: ("floors", True),
    ACTIVE_ENERGY: ("kcal", False),
    STANDING: ("min", True),
    HEIGHT: ("cm", False),
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

def unit_of(metric: str) -> str:
    """Unit for any metric in care_readings, or "" for one nobody defined.

    GET /health/readings returns every row an owner has; a metric outside both
    tables must not turn that into a 500.
    """
    from services.workflow_api import METRICS

    if metric in METRICS:
        return METRICS[metric][1]
    if metric in WELLNESS_METRICS:
        return WELLNESS_METRICS[metric][0]
    return ""
