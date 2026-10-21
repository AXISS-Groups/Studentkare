"""Messages the wellness and dose endpoints send, as stable codes (AGENTS.md rule 11).

The backend has no translation layer, so every message here goes out as
``{"code": CODE, "message": English}``. The app shows the copy for the code
from its i18n catalogues (``wellness.msg.<CODE>`` in ``src/i18n/areas/wellness.ts``,
en/te/hi), filling ``{name}`` placeholders from the values sent beside it, and
falls back to ``message`` only for a code it does not know.
``tests/test_wellness_logs.py`` checks every code here has its i18n key and the
same placeholders, so this table and the catalogue cannot drift apart.

The English text is the fallback, not the source of truth for what the screen
says; numbers in it (limits, windows) are filled from the settings registry.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

MESSAGES: dict[str, str] = {
    # Entry times
    "TIMEZONE_REQUIRED": "Include the timezone with the time.",
    "ENTRY_IN_FUTURE": "An entry cannot be dated in the future.",
    "ENTRY_TOO_OLD": "An entry can be at most {days} days old.",
    # Water
    "WATER_AMOUNT_OUT_OF_RANGE": "Enter an amount between {min} and {max} ml.",
    "WATER_GOAL_OUT_OF_RANGE": "Choose a daily goal between {min} and {max} ml.",
    "NO_WATER_TODAY": "No water logged today.",
    # Activity
    "ACTIVITY_EMPTY": "Enter at least one activity value.",
    "ACTIVITY_DAY_IN_FUTURE": "Activity cannot be entered for a future day.",
    "ACTIVITY_DAY_TOO_OLD": "Activity can be entered for the last {days} days.",
    "ACTIVITY_VALUE_OUT_OF_RANGE": "Enter a value between {min} and {max}.",
    "NO_ACTIVITY_FOR_DAY": "No activity entered for that day.",
    # Weight, height and BMI
    "BODY_EMPTY": "Enter a weight, a height, or both.",
    "WEIGHT_OUT_OF_RANGE": "Enter a weight between {min} and {max} kg.",
    "HEIGHT_OUT_OF_RANGE": "Enter a height between {min} and {max} cm.",
    "BMI_REFERENCE": "WHO cut-offs for Asian populations (2004). Shown for information only.",
    "BMI_BAND_BELOW": "Below {below}",
    "BMI_BAND_BETWEEN": "{from}–{to}",
    "BMI_BAND_FROM": "{from} and above",
    # Medicines
    "TIMES_PER_DAY_OUT_OF_RANGE": "Choose between {min} and {max} doses a day.",
    "MEDICATION_NOT_FOUND": "Medication not found.",
    "DOSE_NOT_FOUND": "Dose not found.",
    "DOSE_UNDO_TOO_LATE": "A dose can be undone only within {minutes} minutes of logging it.",
    "DOSE_RECORDED": "Dose recorded for today.",
    "DOSE_SKIPPED": "Dose marked as skipped for today.",
    "DOSE_ALREADY_LOGGED_TODAY": "Dose already logged today for this medication.",
    "DOSES_ALL_LOGGED_TODAY": "Every planned dose is already logged today for this medication.",
    "DOSE_ALREADY_LOGGED": "Dose already logged.",
}


def _shown(value: Any) -> str:
    """Numbers as a person writes them: 23.0 -> "23", 18.5 -> "18.5"."""
    return f"{value:g}" if isinstance(value, float) else str(value)


def message(code: str, **values: Any) -> str:
    """The English fallback for ``code``. KeyError for a code nobody declared."""
    return MESSAGES[code].format_map({name: _shown(value) for name, value in values.items()})


def coded(code: str, **values: Any) -> dict[str, Any]:
    """``{"code", "message", "values"}``; ``values`` fill the i18n template's placeholders."""
    body: dict[str, Any] = {"code": code, "message": message(code, **values)}
    if values:
        body["values"] = values
    return body


def error(status: int, code: str, **values: Any) -> HTTPException:
    """An HTTPException whose detail is ``coded(code, **values)`` (the repo's {code, message} shape)."""
    return HTTPException(status, coded(code, **values))
