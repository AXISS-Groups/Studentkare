"""The student's own calendar day.

"Today" for water, activity and doses is the student's local day, not the
server's: a glass of water at 01:00 IST belongs to that IST date, which under UTC
would still be the previous day. The timezone is the one the student set in
notification preferences (``care_notification_preferences.timezone``); an
account that never set one, or holds a name zoneinfo does not know, uses the
``platform.default_timezone`` setting (core/settings_registry.py); if that
setting's value is itself not a zone zoneinfo knows, its declared default.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from core import workflow_models as M
from core.settings_registry import get_declaration, setting

DEFAULT_TIMEZONE_KEY = "platform.default_timezone"


def _zone(name: str | None) -> ZoneInfo | None:
    if not name:
        return None
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return None


def default_zone(db=None) -> ZoneInfo:
    """The configured fallback zone; its declared default if the configured name is unknown."""
    return _zone(setting(DEFAULT_TIMEZONE_KEY, db)) or ZoneInfo(get_declaration(DEFAULT_TIMEZONE_KEY).default)


def zone_named(name: str | None, db=None) -> ZoneInfo:
    return _zone(name) or default_zone(db)


def student_zone(db, account_id: str) -> ZoneInfo:
    prefs = db.get(M.NotificationPreference, account_id) if db is not None else None
    return zone_named(getattr(prefs, "timezone", None), db)


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
