"""
services.livekit_media — short-lived LiveKit access tokens for video consults.

Live audio/video for a teleconsultation runs on a LiveKit server (self-hosted or
LiveKit Cloud). The backend never relays media; it only decides who may join
which room, and says so in a token signed with the LiveKit API secret.

Configuration (all three, or the feature is off):

    LIVEKIT_URL         wss://… address the browser connects to
                        (ws:// is accepted only in development/testing)
    LIVEKIT_API_KEY     API key id (the token's ``iss``)
    LIVEKIT_API_SECRET  API secret (HS256 signing key; never leaves the server)

Fail closed: missing or malformed configuration, or any error while signing,
means no token. The caller reports ``UNAVAILABLE`` and never falls back to
anything that looks like a call.

What a token carries (and what it does not):
- ``sub`` (identity) is the opaque account id. No name, no metadata, no
  attributes: nothing about the person or their health reaches LiveKit.
- one room, named from the appointment id;
- join + publish/subscribe for camera and microphone only. No data channel, no
  screen share, no recording, no room admin/create/list, no metadata updates.
- a short lifetime (setting ``consult.media_token_ttl_minutes``, and never past
  the end of the join window).
  LiveKit checks the token when the participant connects; once connected the
  server keeps the session alive on its own refreshed credentials.

The join window opens ``consult.media_join_before_minutes`` before the slot
starts and closes ``consult.media_join_after_minutes`` after it ends. All three
durations come from the settings registry (core/settings_registry.py), so a
super admin can tune them without a deploy. Slot times are stored as free text; a time
without an offset is read in the ``platform.default_timezone`` setting (via
services/student_time.default_zone). A slot that cannot be parsed has no window, so no token.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from core.app_env import is_dev_or_test
from core.settings_registry import setting
from services import student_time

logger = logging.getLogger("services.livekit_media")

URL_ENV = "LIVEKIT_URL"
KEY_ENV = "LIVEKIT_API_KEY"
SECRET_ENV = "LIVEKIT_API_SECRET"  # noqa: S105 - the variable name, not a secret

JOIN_BEFORE_KEY = "consult.media_join_before_minutes"
JOIN_AFTER_KEY = "consult.media_join_after_minutes"
GRANT_TTL_KEY = "consult.media_token_ttl_minutes"
ROOM_PREFIX = "sk-consult-"
# TrackSource names as LiveKit's token grant spells them (livekit_models.proto
# TrackSource, lower-case in the JWT). Camera and microphone only.
PUBLISH_SOURCES = ("camera", "microphone")


class MediaUnavailable(Exception):
    """LiveKit is not configured, misconfigured, or a token could not be signed."""


@dataclass(frozen=True)
class LiveKitConfig:
    url: str
    api_key: str
    api_secret: str


@dataclass(frozen=True)
class MediaToken:
    url: str
    token: str
    room: str
    identity: str
    expires_at: int


def load_config() -> LiveKitConfig:
    """The configured LiveKit server, or ``MediaUnavailable``."""
    url = os.getenv(URL_ENV, "").strip()
    key = os.getenv(KEY_ENV, "").strip()
    secret = os.getenv(SECRET_ENV, "").strip()
    if not (url and key and secret):
        raise MediaUnavailable("not configured")
    parsed = urlparse(url)
    allowed = {"wss", "https"} | ({"ws", "http"} if is_dev_or_test() else set())
    if parsed.scheme not in allowed or not parsed.netloc:
        raise MediaUnavailable("LIVEKIT_URL must be a wss:// address")
    return LiveKitConfig(url=url, api_key=key, api_secret=secret)


def is_configured() -> bool:
    try:
        load_config()
    except MediaUnavailable:
        return False
    return True


def room_name(appointment_id: str) -> str:
    return f"{ROOM_PREFIX}{appointment_id}"


def parse_slot_time(value: str, db=None) -> datetime | None:
    """An aware datetime for a stored slot time, or None when it cannot be read."""
    text = (value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=student_time.default_zone(db))
    return parsed


def join_opens_before(db=None) -> timedelta:
    """How early before the slot starts the call can be joined (registry)."""
    return timedelta(minutes=setting(JOIN_BEFORE_KEY, db))


def join_closes_after(db=None) -> timedelta:
    """How long after the slot ends the call can still be joined (registry)."""
    return timedelta(minutes=setting(JOIN_AFTER_KEY, db))


def token_ttl(db=None) -> timedelta:
    """Longest lifetime of a join token (registry)."""
    return timedelta(minutes=setting(GRANT_TTL_KEY, db))


def join_window(slot_start: str, slot_end: str, db=None) -> tuple[datetime, datetime] | None:
    """(opens, closes) for a slot, or None when the slot has no usable times."""
    start = parse_slot_time(slot_start, db)
    end = parse_slot_time(slot_end, db)
    if start is None or end is None or end < start:
        return None
    return start - join_opens_before(db), end + join_closes_after(db)


def issue_token(config: LiveKitConfig, *, identity: str, room: str, now: datetime, window_closes: datetime,
                db=None) -> MediaToken:
    """Sign a camera+microphone-only join token. Any failure is ``MediaUnavailable``."""
    if not identity or not room:
        raise MediaUnavailable("identity and room are required")
    ttl = min(token_ttl(db), window_closes - now)
    if ttl <= timedelta(0):
        raise MediaUnavailable("join window has closed")
    try:
        from livekit.api import AccessToken, VideoGrants

        grants = VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=False,
            can_publish_sources=list(PUBLISH_SOURCES),
            can_update_own_metadata=False,
        )
        token = (
            AccessToken(config.api_key, config.api_secret)
            .with_identity(identity)
            .with_kind("standard")
            .with_ttl(ttl)
            .with_grants(grants)
            .to_jwt()
        )
    except Exception as exc:  # fail closed: no token, and never the secret in a log
        logger.error("LiveKit token could not be signed (%s)", type(exc).__name__)
        raise MediaUnavailable("token could not be signed") from None
    expires_at = int((datetime.now(timezone.utc) + ttl).timestamp())
    return MediaToken(url=config.url, token=token, room=room, identity=identity, expires_at=expires_at)
