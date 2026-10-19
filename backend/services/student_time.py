"""The student's own calendar day.

"Today" for water, activity and doses is the student's local day, not the
server's: a glass of water at 01:00 IST belongs to that IST date, which under UTC
would still be the previous day. The timezone is the one the student set in
notification preferences (``care_notification_preferences.timezone``); an
account that never set one, or holds a name zoneinfo does not know, uses
Asia/Kolkata — the same fallback the reminder scheduler uses.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from core import workflow_models as M

DEFAULT_TIMEZONE = "Asia/Kolkata"


def zone_named(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def student_zone(db, account_id: str) -> ZoneInfo:
    prefs = db.get(M.NotificationPreference, account_id) if db is not None else None
    return zone_named(getattr(prefs, "timezone", None))


def now_utc() -> datetime:
    """Indirected so tests can move the clock across a day boundary."""
    return datetime.now(timezone.utc)


def local_today(zone: ZoneInfo) -> date:
    return now_utc().astimezone(zone).date()


def day_bounds_utc(day: date, zone: ZoneInfo) -> tuple[datetime, datetime]:
    """[start, end) of a local calendar day, as aware UTC datetimes."""
    start = datetime.combine(day, time.min, tzinfo=zone)
    end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=zone)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def parse_stored(value: str) -> datetime:
    """``care_readings.recorded_at`` is written as an aware UTC ISO string."""
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def local_date_of(value: str, zone: ZoneInfo) -> date:
    return parse_stored(value).astimezone(zone).date()
