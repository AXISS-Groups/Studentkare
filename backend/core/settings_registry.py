"""The settings registry: every tunable business value, declared exactly once.

AGENTS.md rule 11 ("Nothing hard-coded"). A limit, amount, duration, threshold or
price that the business may want to change lives here, not as a literal at the
place that uses it. Each declaration says what the value is, its type, its
default, the bounds or allowed values that make it valid, its unit, who owns it,
and whether the client may see it (``public``).

Reading a value::

    from core.settings_registry import setting
    points = setting("rewards.referral_points", db)

``setting`` returns the super admin's override when one is stored and valid, and
the declared default otherwise. A stored value that fails its declaration (wrong
type, out of bounds, not an allowed value) is never used: the read falls back to
the default (fail closed) and one ATTENTION ops-feed event is raised for that key
until someone acknowledges it.

Overrides are edited only through ``PATCH /api/ops/settings/{key}``
(services/settings_api.py): SUPER_ADMIN, validated against the declaration, a
reason required, audited and kept in an append-only history.

This module imports only the standard library at import time, so
``backend/scripts/export_public_settings.py`` can generate
``src/generated/settings.ts`` without the backend's dependencies installed. The
frontend's defaults come from that generated file, never a second copy.
"""
from __future__ import annotations

import logging
import math
import re
import threading
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

INT = "int"
FLOAT = "float"
BOOL = "bool"
STR = "str"
ENUM = "enum"
TYPES = frozenset({INT, FLOAT, BOOL, STR, ENUM})

KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$")

# How long a process trusts its copy of the overrides before re-reading them, and
# the max-age the public config endpoint sends. An edit made through the API
# clears this process's cache at once; other replicas see it within this window.
CACHE_TTL_SECONDS = 30

INVALID_OVERRIDE_KIND = "SETTING_OVERRIDE_INVALID"
OPS_RESOURCE_TYPE = "setting"


class UnknownSetting(KeyError):
    """A key that is not declared here. A programming error, never a fallback."""


class InvalidSettingValue(ValueError):
    """A value that does not satisfy its declaration."""


@dataclass(frozen=True)
class Setting:
    key: str
    type: str
    default: Any
    description: str
    area: str
    unit: str = ""
    minimum: float | None = None
    maximum: float | None = None
    allowed: tuple[str, ...] = ()
    public: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key, "type": self.type, "default": self.default, "description": self.description,
            "area": self.area, "unit": self.unit, "min": self.minimum, "max": self.maximum,
            "allowed": list(self.allowed), "public": self.public,
        }


def validate(decl: Setting, value: Any) -> Any:
    """The value, normalised to the declared type, or ``InvalidSettingValue``."""
    if decl.type == BOOL:
        if not isinstance(value, bool):
            raise InvalidSettingValue(f"{decl.key} must be true or false")
        return value
    if decl.type == INT:
        # bool is an int in Python; a JSON true is not a number of points.
        if isinstance(value, bool) or not isinstance(value, int):
            raise InvalidSettingValue(f"{decl.key} must be a whole number")
        _check_bounds(decl, value)
        return value
    if decl.type == FLOAT:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise InvalidSettingValue(f"{decl.key} must be a number")
        _check_bounds(decl, value)
        return float(value)
    if decl.type == STR:
        if not isinstance(value, str):
            raise InvalidSettingValue(f"{decl.key} must be text")
        if decl.allowed and value not in decl.allowed:
            raise InvalidSettingValue(f"{decl.key} must be one of {', '.join(decl.allowed)}")
        return value
    if decl.type == ENUM:
        if not isinstance(value, str) or value not in decl.allowed:
            raise InvalidSettingValue(f"{decl.key} must be one of {', '.join(decl.allowed)}")
        return value
    raise InvalidSettingValue(f"{decl.key} has an unknown type {decl.type!r}")


def _check_bounds(decl: Setting, value: float) -> None:
    if decl.minimum is not None and value < decl.minimum:
        raise InvalidSettingValue(f"{decl.key} must be at least {decl.minimum:g}")
    if decl.maximum is not None and value > decl.maximum:
        raise InvalidSettingValue(f"{decl.key} must be at most {decl.maximum:g}")


REGISTRY: dict[str, Setting] = {}


def declare(key: str, type: str, default: Any, *, description: str, area: str, unit: str = "",
            minimum: float | None = None, maximum: float | None = None, allowed: tuple[str, ...] = (),
            public: bool = False) -> Setting:
    """Add one declaration. Refuses a duplicate key, a bad key, or a default that fails its own rules."""
    if key in REGISTRY:
        raise ValueError(f"setting {key} is declared twice")
    if not KEY_PATTERN.match(key):
        raise ValueError(f"setting key {key!r} must be dotted lower_snake_case, e.g. area.name")
    if type not in TYPES:
        raise ValueError(f"setting {key} has unknown type {type!r}")
    if type == ENUM and not allowed:
        raise ValueError(f"enum setting {key} needs allowed values")
    if type in (INT, FLOAT) and None not in (minimum, maximum) and minimum > maximum:
        raise ValueError(f"setting {key} has min above max")
    if not description.strip() or not area.strip():
        raise ValueError(f"setting {key} needs a description and an owning area")
    decl = Setting(key=key, type=type, default=default, description=description, area=area, unit=unit,
                   minimum=minimum, maximum=maximum, allowed=tuple(allowed), public=public)
    validate(decl, default)
    REGISTRY[key] = decl
    return decl


# Pairs (lower, upper): the effective value of ``lower`` may never exceed that of
# ``upper``. Checked when an override is saved, so an edit cannot leave the
# water goal's default outside its own min and max.
ORDERED_PAIRS: tuple[tuple[str, str], ...] = (
    ("wellness.water_goal_ml_min", "wellness.water_goal_ml_default"),
    ("wellness.water_goal_ml_default", "wellness.water_goal_ml_max"),
    ("wellness.water_entry_ml_min", "wellness.water_entry_ml_max"),
    ("wellness.weight_kg_min", "wellness.weight_kg_max"),
    ("wellness.height_cm_min", "wellness.height_cm_max"),
    ("wellness.bmi_cutoff_low", "wellness.bmi_cutoff_mid"),
    ("wellness.bmi_cutoff_mid", "wellness.bmi_cutoff_high"),
)


# ══════════════════════════════════════════════════════════════════════════════
# Declarations. One entry per value; the literal here IS the definition.
# ══════════════════════════════════════════════════════════════════════════════

# --- rewards ---------------------------------------------------------------
declare("rewards.referral_points", INT, 50, area="rewards", unit="points", minimum=0, maximum=10000, public=True,
        description="Points credited to the referrer when a referred student completes sign-up.")
# Not public: an anti-abuse limit is enforced by the server, not advertised.
declare("rewards.referral_monthly_cap", INT, 20, area="rewards", unit="referrals per month", minimum=0, maximum=1000,
        description="Most referrals one account can be credited for in a calendar month.")
declare("rewards.referral_claim_window_hours", INT, 24, area="rewards", unit="hours", minimum=1, maximum=720,
        public=True, description="How long after sign-up a referral code can still be claimed.")

# --- medicines -------------------------------------------------------------
declare("meds.dose_undo_minutes", INT, 30, area="meds", unit="minutes", minimum=0, maximum=240, public=True,
        description="How long after marking a dose taken or skipped the student can undo it.")
declare("meds.times_per_day_max", INT, 6, area="meds", unit="doses per day", minimum=1, maximum=24, public=True,
        description="Most reminder times one medication plan may have in a day.")

# --- wellness --------------------------------------------------------------
declare("wellness.water_goal_ml_default", INT, 2000, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Daily water goal for a student who has not set one.")
declare("wellness.water_goal_ml_min", INT, 500, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Lowest daily water goal a student can set.")
declare("wellness.water_goal_ml_max", INT, 6000, area="wellness", unit="ml", minimum=100, maximum=10000,
        public=True, description="Highest daily water goal a student can set.")
declare("wellness.water_entry_ml_min", INT, 10, area="wellness", unit="ml", minimum=1, maximum=1000, public=True,
        description="Smallest amount one water entry may record.")
declare("wellness.water_entry_ml_max", INT, 2000, area="wellness", unit="ml", minimum=10, maximum=5000, public=True,
        description="Largest amount one water entry may record.")
declare("wellness.entry_backdate_days", INT, 7, area="wellness", unit="days", minimum=0, maximum=366, public=True,
        description="How far back a water entry or a body measurement may be dated.")
declare("wellness.activity_backdate_days", INT, 366, area="wellness", unit="days", minimum=0, maximum=3660,
        public=True, description="How far back a day's manual activity totals may be entered.")
# Not public: a server-side allowance for a phone clock that runs a little fast.
declare("wellness.entry_future_tolerance_minutes", INT, 5, area="wellness", unit="minutes", minimum=0, maximum=60,
        description="How far in the future an entry's time may be before it is refused (clock skew).")
# Upper bounds of one day's manual activity totals. The lower bound is 0 (a
# total cannot be negative) and standing minutes are bounded by the minutes in a
# day; both are structural, not declared here.
declare("wellness.activity_steps_max", INT, 100000, area="wellness", unit="steps", minimum=1000, maximum=1000000,
        public=True, description="Most steps one day's manual entry may record.")
declare("wellness.activity_distance_km_max", FLOAT, 200.0, area="wellness", unit="km", minimum=1, maximum=1000,
        public=True, description="Longest distance one day's manual entry may record.")
declare("wellness.activity_floors_max", INT, 500, area="wellness", unit="floors", minimum=1, maximum=5000,
        public=True, description="Most floors climbed one day's manual entry may record.")
declare("wellness.activity_energy_kcal_max", FLOAT, 10000.0, area="wellness", unit="kcal", minimum=100,
        maximum=50000, public=True, description="Most active energy one day's manual entry may record.")
# Adult body-measure bounds (18+ only, AGENTS.md guardrail 8). A stored value
# outside them is never used for BMI. The generic readings form keeps its own.
declare("wellness.weight_kg_min", FLOAT, 20.0, area="wellness", unit="kg", minimum=1, maximum=100, public=True,
        description="Lowest weight the weight & BMI form accepts and BMI is computed from.")
declare("wellness.weight_kg_max", FLOAT, 350.0, area="wellness", unit="kg", minimum=100, maximum=700, public=True,
        description="Highest weight the weight & BMI form accepts and BMI is computed from.")
declare("wellness.height_cm_min", FLOAT, 100.0, area="wellness", unit="cm", minimum=30, maximum=150, public=True,
        description="Lowest height the weight & BMI form accepts and BMI is computed from.")
declare("wellness.height_cm_max", FLOAT, 250.0, area="wellness", unit="cm", minimum=150, maximum=300, public=True,
        description="Highest height the weight & BMI form accepts and BMI is computed from.")
declare("wellness.body_entries_list_cap", INT, 100, area="wellness", unit="entries", minimum=1, maximum=1000,
        description="Most weight and height entries GET /body/measurements lists, newest first.")
# BMI band cut-offs. CLINICAL OWNER: these are clinical reference values (WHO
# expert consultation, Lancet 2004, cut-offs for Asian populations). Change them
# only with the clinical lead's written sign-off, quoted in the override reason.
# Not public: the bands, with their bounds, come from GET /body/measurements.
declare("wellness.bmi_cutoff_low", FLOAT, 18.5, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the second band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")
declare("wellness.bmi_cutoff_mid", FLOAT, 23.0, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the third band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")
declare("wellness.bmi_cutoff_high", FLOAT, 25.0, area="clinical", unit="kg/m²", minimum=10, maximum=40,
        description="BMI where the fourth band starts (WHO Asian cut-offs, 2004). Clinical owner sign-off required.")

# --- health records --------------------------------------------------------
declare("health.readings_list_cap", INT, 1000, area="health", unit="rows", minimum=1, maximum=10000,
        description="Most readings GET /health/readings returns in one response.")

# --- platform --------------------------------------------------------------
# A name zoneinfo does not know (in an override or a student's preference) is
# never used: the student's day then falls back to this declared default.
declare("platform.default_timezone", STR, "Asia/Kolkata", area="platform", unit="IANA timezone",
        description="Timezone for a student's calendar day when they have not set a valid one.")

# --- consultations ---------------------------------------------------------
declare("consult.media_join_before_minutes", INT, 15, area="consult", unit="minutes", minimum=0, maximum=120,
        public=True, description="How early before the slot starts a video consult can be joined.")
declare("consult.media_join_after_minutes", INT, 30, area="consult", unit="minutes", minimum=0, maximum=240,
        public=True, description="How long after the slot ends a video consult can still be joined.")
# Not public: the client reads the token's own expiry from the grant.
declare("consult.media_token_ttl_minutes", INT, 10, area="consult", unit="minutes", minimum=1, maximum=60,
        description="Longest lifetime of a video-consult join token (never past the join window).")

# --- appearance ------------------------------------------------------------
declare("appearance.boot_wait_ms", INT, 1500, area="appearance", unit="ms", minimum=0, maximum=10000, public=True,
        description="Longest the app waits at boot for the saved appearance before rendering with the default.")

# --- pharmacy --------------------------------------------------------------
declare("pharmacy.quote_expiry_hours", INT, 0, area="pharmacy", unit="hours", minimum=0,
        maximum=720, public=True,
        description="Hours a pharmacy's price quote stays payable. 0 means quotes do not expire.")


def get_declaration(key: str) -> Setting:
    try:
        return REGISTRY[key]
    except KeyError:
        raise UnknownSetting(key) from None


def public_settings() -> list[Setting]:
    return sorted((d for d in REGISTRY.values() if d.public), key=lambda d: d.key)


def check_ordered_pairs(values: dict[str, Any]) -> list[str]:
    """Problems with ``values`` (key -> effective value) against ORDERED_PAIRS."""
    problems = []
    for lower, upper in ORDERED_PAIRS:
        if values[lower] > values[upper]:
            problems.append(f"{lower} ({values[lower]}) must not exceed {upper} ({values[upper]})")
    return problems


# ══════════════════════════════════════════════════════════════════════════════
# Reading: overrides from care_setting_overrides, cached for CACHE_TTL_SECONDS.
# ══════════════════════════════════════════════════════════════════════════════

_lock = threading.Lock()
_cache: dict[str, Any] = {"loaded_at": None, "values": {}}


def reset_cache() -> None:
    """Forget the cached overrides; the next read goes to the database."""
    with _lock:
        _cache["loaded_at"] = None
        _cache["values"] = {}


def _report_invalid(session, key: str, reason: str) -> None:
    """One open ATTENTION ops event per invalid key. Names the key, never the value."""
    from sqlalchemy import select

    from core import workflow_models as M
    from services import ops_feed

    logger.error("[SETTINGS] stored override for %s is invalid (%s); using the default", key, reason)
    open_event = session.scalar(select(M.OpsEvent.id).where(
        M.OpsEvent.kind == INVALID_OVERRIDE_KIND, M.OpsEvent.resource_id == key,
        M.OpsEvent.acknowledged_at == 0).limit(1))
    if open_event is None:
        ops_feed.publish(session, INVALID_OVERRIDE_KIND, "ACCOUNT", severity="ATTENTION",
                         summary=f"Setting {key} has an invalid stored override; the default is in use.",
                         resource_type=OPS_RESOURCE_TYPE, resource_id=key)


def _load(db=None) -> dict[str, Any]:
    """key -> validated override value. Invalid rows are left out and reported.

    Reads in a session of its own (on the caller's engine when one is given), so
    reporting an invalid row never commits or rolls back the caller's work. If the
    overrides cannot be read at all, every setting reads as its default.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from core import workflow_models as M

    values: dict[str, Any] = {}
    try:
        if db is not None:
            session = Session(bind=db.get_bind())
        else:
            from services.db_sql import SessionLocal
            session = SessionLocal()
        with session:
            rows = session.execute(select(M.SettingOverride.key, M.SettingOverride.value)).all()
            reported = False
            for key, raw in rows:
                decl = REGISTRY.get(key)
                if decl is None:
                    # A key removed from the registry: harmless, but someone should clear it.
                    logger.warning("[SETTINGS] override stored for undeclared key %s is ignored", key)
                    continue
                try:
                    values[key] = validate(decl, raw)
                except InvalidSettingValue as exc:
                    _report_invalid(session, key, str(exc))
                    reported = True
            if reported:
                session.commit()
    except Exception as exc:  # noqa: BLE001 — unreadable overrides mean defaults, never a crash
        logger.error("[SETTINGS] overrides could not be read (%s); using defaults", type(exc).__name__)
        return {}
    return values


def _overrides(db=None) -> dict[str, Any]:
    with _lock:
        loaded_at = _cache["loaded_at"]
        if loaded_at is not None and time.monotonic() - loaded_at < CACHE_TTL_SECONDS:
            return _cache["values"]
    values = _load(db)
    with _lock:
        _cache["values"] = values
        _cache["loaded_at"] = time.monotonic()
    return values


def setting(key: str, db=None) -> Any:
    """The effective value of a declared setting: a valid override, else the default.

    Pass the request's session as ``db`` where there is one; without it the
    application's own session factory is used.
    """
    decl = get_declaration(key)
    overrides = _overrides(db)
    return overrides[key] if key in overrides else decl.default


def effective_values(db=None) -> dict[str, Any]:
    overrides = _overrides(db)
    return {key: overrides.get(key, decl.default) for key, decl in REGISTRY.items()}


def public_values(db=None) -> dict[str, Any]:
    """Effective values of the settings declared public, for GET /api/config/public."""
    values = effective_values(db)
    return {decl.key: values[decl.key] for decl in public_settings()}
