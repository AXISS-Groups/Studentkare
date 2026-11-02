"""The platform's calendar day, the one the server counts in (services/student_time.py).

Tests compare against this, never ``date.today()``: the runner's day is UTC on
CI, and between 18:30 and 00:00 UTC it is a day behind India's. ruff's DTZ
rules (ruff.toml) keep naive ``date.today()`` / ``datetime.now()`` out.
"""
from datetime import date

from services import student_time


def platform_today() -> date:
    return student_time.local_today(student_time.default_zone())
