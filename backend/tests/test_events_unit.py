"""
Unit tests for Events Aggregator v2.
Covers all 9 event types, RSVP/capacity/waitlist, admin flows, search filters,
.ics generation, preferences, and auth gating — with mocked MongoDB.
"""
from __future__ import annotations

import hashlib
import pytest
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import sys
from pathlib import Path

# Ensure backend is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from events_aggregator import (
    EVENT_TYPES,
    EVENT_TYPE_TINTS,
    _dedup_hash,
    _safe_iso,
    _to_dt,
    _classify_institution_tier,
    _extract_topics,
    _classify_event_mode,
    _normalize,
    _doc_to_public,
    _ics_escape,
    _ics_dt,
)


# ════════════════════════════════════════════════════════════════════════════
# Fixtures
# ════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def sample_event() -> Dict[str, Any]:
    return {
        "_id": "objid-001",
        "event_id": "evt-001",
        "title": "AI Hackathon",
        "description": "Build AI apps in 48h",
        "event_type": "hackathon",
        "location_country": "India",
        "location_city": "Bangalore",
        "event_date_start": "2026-08-15T09:00:00+00:00",
        "event_date_end": "2026-08-17T18:00:00+00:00",
        "price_type": "free",
        "price_amount": 0,
        "currency": "INR",
        "registration_url": "https://example.com",
        "organizer_name": "Test Org",
        "attendee_count": 0,
        "capacity": 100,
        "image_url": "",
        "source": "host",
        "host_user_id": "host123",
        "host_role": "mentor",
        "is_active": True,
        "status": "published",
        "tags": ["ai", "ml"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def mock_user(student: bool = False, mentor: bool = False, admin: bool = False,
              college: bool = False, alumni: bool = False) -> Dict[str, Any]:
    role = "student" if student else "mentor" if mentor else "admin" if admin else "college" if college else "alumni"
    return {
        "_id": MagicMock(),
        "email": f"{role}@test.com",
        "role": role,
        "full_name": f"Test {role.title()}",
        "interests": ["ai", "ml"],
    }


@pytest.fixture
def mock_db():
    """Return a mock database with async collections."""
    db = MagicMock()
    for coll_name in [
        "events", "events_v2", "user_event_preferences", "event_cache",
        "event_activity_log", "event_registrations", "users",
    ]:
        coll = MagicMock()
        coll.find_one = AsyncMock(return_value=None)
        # find().sort(...) must return an async iterable
        def make_find(items):
            find_mock = MagicMock()
            # Support both direct async-for and .sort().
            it = AsyncIteratorMock(items)
            find_mock.__aiter__ = lambda self: it.__aiter__()
            find_mock.sort = MagicMock(return_value=it)
            return find_mock
        coll.find = MagicMock(return_value=make_find([]))
        coll.insert_one = AsyncMock(return_value=MagicMock(inserted_id="id123"))
        coll.insert_many = AsyncMock(return_value=None)
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        coll.count_documents = AsyncMock(return_value=0)
        coll.aggregate = MagicMock(return_value=AsyncIteratorMock([]))
        setattr(db, coll_name, coll)
    return db


class AsyncIteratorMock:
    """Wrap a list for async-for loops."""
    def __init__(self, items: List[Any]):
        self._items = items

    def __aiter__(self):
        self._idx = 0
        return self

    async def __anext__(self):
        if self._idx >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._idx]
        self._idx += 1
        return item


# ════════════════════════════════════════════════════════════════════════════
# Pure-function tests
# ════════════════════════════════════════════════════════════════════════════

def test_event_types_count():
    assert len(EVENT_TYPES) == 9


def test_event_types_all_present():
    for et in ["hackathon", "codethon", "workshop", "tech_talk", "training",
               "founder_talk", "meetup", "fest", "boot_camp"]:
        assert et in EVENT_TYPES


def test_event_type_tints_mapped():
    for et in EVENT_TYPES:
        assert et in EVENT_TYPE_TINTS
        assert EVENT_TYPE_TINTS[et].startswith("#")


def test_dedup_hash_consistency():
    h1 = _dedup_hash("My Event", "Bangalore", "2026-08-15T09:00:00+00:00")
    h2 = _dedup_hash("My Event", "Bangalore", "2026-08-15T09:00:00+00:00")
    assert h1 == h2
    assert len(h1) == 32


def test_dedup_hash_differentiates():
    h1 = _dedup_hash("My Event", "Bangalore", "2026-08-15")
    h2 = _dedup_hash("My Event", "Bangalore", "2026-08-16")
    assert h1 != h2


def test_safe_iso_datetime():
    dt = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
    assert _safe_iso(dt) == "2026-08-15T09:00:00+00:00"


def test_safe_iso_string():
    assert _safe_iso("2026-08-15T09:00:00Z") == "2026-08-15T09:00:00+00:00"


def test_safe_iso_none():
    assert _safe_iso(None) is None
    assert _safe_iso("") is None


def test_to_dt():
    dt = _to_dt("2026-08-15T09:00:00+00:00")
    assert isinstance(dt, datetime)
    assert dt.tzinfo is not None


def test_to_dt_none():
    assert _to_dt(None) is None
    assert _to_dt("") is None


def test_classify_institution_tier():
    assert _classify_institution_tier("IIT Bombay") == "top_tier"
    assert _classify_institution_tier("NIT Trichy") == "tier_one"
    assert _classify_institution_tier("SRM University") == "tier_two"
    assert _classify_institution_tier("Some College") == "regional"
    assert _classify_institution_tier("") == "regional"
    assert _classify_institution_tier(None) == "regional"


def test_extract_topics():
    assert "ai" in _extract_topics("Learn AI and ML")
    assert "cloud" in _extract_topics("AWS and kubernetes")
    assert "startup" in _extract_topics("Founder talk at YC")
    assert _extract_topics("") == []
    assert _extract_topics(None) == []


def test_classify_event_mode():
    assert _classify_event_mode("", "", "Join us online") == "virtual"
    assert _classify_event_mode("", "", "Hybrid event") == "hybrid"
    assert _classify_event_mode("Bangalore", "India", "") == "in_person"


def test_normalize_required_fields():
    rec = {"title": "Test", "starts_at": "2026-08-15T09:00:00Z"}
    out = _normalize(rec, "testsource")
    assert out is not None
    assert out["title"] == "Test"
    assert out["event_type"] == "meetup"


def test_normalize_missing_title():
    rec = {"starts_at": "2026-08-15T09:00:00Z"}
    assert _normalize(rec, "testsource") is None


def test_normalize_missing_date():
    rec = {"title": "Test"}
    assert _normalize(rec, "testsource") is None


def test_doc_to_public(sample_event):
    pub = _doc_to_public(sample_event, user_id="u1")
    assert pub["event_id"] == "evt-001"
    assert pub["title"] == "AI Hackathon"
    assert "is_saved" in pub
    assert "_id" not in pub


def test_doc_to_public_saved(sample_event):
    pub = _doc_to_public(sample_event, user_id="u1", saved_ids={"evt-001"})
    assert pub["is_saved"] is True


def test_ics_helpers_basic(sample_event):
    title = _ics_escape(sample_event["title"])
    desc = _ics_escape(sample_event["description"])
    loc = _ics_escape(f"{sample_event['location_city']}, {sample_event['location_country']}")
    dtstart = _ics_dt(sample_event["event_date_start"])
    dtend = _ics_dt(sample_event["event_date_end"])
    assert "AI Hackathon" in title
    assert "Build AI apps in 48h" in desc
    assert "Bangalore" in loc
    assert dtstart.startswith("20260815T090000")
    assert dtend.startswith("20260815") or dtend.startswith("20260817")


# ════════════════════════════════════════════════════════════════════════════
# Async endpoint tests (mocked DB)
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_event_all_types(mock_db):
    """Each of the 9 event types must be accepted by create_event."""
    from events_aggregator import create_event
    with patch("events_aggregator._db", mock_db):
        for etype in EVENT_TYPES:
            user = {
                "_id": MagicMock(),
                "email": f"mentor-{etype}@test.com",
                "role": "mentor",
                "full_name": "Mentor",
            }
            body = {
                "title": f"{etype.title()} Event",
                "event_type": etype,
                "event_date_start": "2027-02-01T10:00:00+00:00",
                "location_city": "Pune",
                "location_country": "India",
            }
            mock_db.events_v2.find_one = AsyncMock(return_value=None)
            result = await create_event(body, user)
            assert result["ok"] is True
            assert result["status"] == "published"
            assert result["needs_approval"] is False


@pytest.mark.asyncio
async def test_create_event_student_forbidden(mock_db):
    from events_aggregator import create_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "student", "email": "stu@test.com"}
        body = {
            "title": "Student Try",
            "event_type": "meetup",
            "event_date_start": "2027-02-01T10:00:00+00:00",
            "location_city": "Pune",
            "location_country": "India",
        }
        with pytest.raises(HTTPException) as exc_info:
            await create_event(body, user)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_create_event_college_needs_approval(mock_db):
    from events_aggregator import create_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "college", "email": "college@test.com", "full_name": "College"}
        body = {
            "title": "College Tech Talk",
            "event_type": "tech_talk",
            "event_date_start": "2027-03-01T10:00:00+00:00",
            "location_city": "Mumbai",
            "location_country": "India",
        }
        mock_db.events_v2.find_one = AsyncMock(return_value=None)
        result = await create_event(body, user)
        assert result["status"] == "pending_approval"
        assert result["needs_approval"] is True


@pytest.mark.asyncio
async def test_create_event_duplicate(mock_db):
    from events_aggregator import create_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "mentor", "email": "mentor@test.com", "full_name": "Mentor"}
        body = {
            "title": "Dup Event",
            "event_type": "workshop",
            "event_date_start": "2027-04-01T10:00:00+00:00",
            "location_city": "Delhi",
            "location_country": "India",
        }
        # First call should succeed
        mock_db.events_v2.find_one = AsyncMock(return_value=None)
        r1 = await create_event(body, user)
        assert r1["ok"] is True

        # Second identical call should 409
        existing = {"_id": "existing", **body}
        mock_db.events_v2.find_one = AsyncMock(return_value=existing)
        with pytest.raises(HTTPException) as exc_info:
            await create_event(body, user)
        assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_create_event_missing_fields(mock_db):
    from events_aggregator import create_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "mentor", "email": "mentor@test.com"}
        body = {"event_type": "workshop", "location_city": "Delhi", "location_country": "India"}
        with pytest.raises(HTTPException) as exc_info:
            await create_event(body, user)
        assert exc_info.value.status_code == 400
        assert "Missing required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_event_invalid_type(mock_db):
    from events_aggregator import create_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "mentor", "email": "mentor@test.com"}
        body = {
            "title": "Bad Type",
            "event_type": "foobar",
            "event_date_start": "2027-04-01T10:00:00+00:00",
            "location_city": "Delhi",
            "location_country": "India",
        }
        with pytest.raises(HTTPException) as exc_info:
            await create_event(body, user)
        assert exc_info.value.status_code == 400
        assert "event_type" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_event_by_host(mock_db, sample_event):
    from events_aggregator import update_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": sample_event["host_user_id"], "role": "mentor"}
        mock_db.events_v2.find_one = AsyncMock(return_value=sample_event)
        result = await update_event("evt-001", {"capacity": 200}, user)
        assert result["ok"] is True
        assert result["capacity"] == 200


@pytest.mark.asyncio
async def test_update_event_by_non_host(mock_db, sample_event):
    from events_aggregator import update_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": "other_user", "role": "student"}
        mock_db.events_v2.find_one = AsyncMock(return_value=sample_event)
        with pytest.raises(HTTPException) as exc_info:
            await update_event("evt-001", {"capacity": 200}, user)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_delete_event_soft(mock_db, sample_event):
    from events_aggregator import delete_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": sample_event["host_user_id"], "role": "mentor"}
        mock_db.events_v2.find_one = AsyncMock(return_value=sample_event)
        result = await delete_event("evt-001", user)
        assert result["ok"] is True
        mock_db.events_v2.update_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_approve_event(mock_db):
    from events_aggregator import admin_approve_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "admin"}
        mock_db.events_v2.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        result = await admin_approve_event("evt-pending", user)
        assert result["ok"] is True
        assert result["status"] == "published"


@pytest.mark.asyncio
async def test_admin_reject_event(mock_db):
    from events_aggregator import admin_reject_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "admin"}
        mock_db.events_v2.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        result = await admin_reject_event("evt-pending", {"reason": "Not relevant"}, user)
        assert result["ok"] is True
        assert result["status"] == "rejected"


@pytest.mark.asyncio
async def test_admin_approve_not_found(mock_db):
    from events_aggregator import admin_approve_event
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "admin"}
        mock_db.events_v2.update_one = AsyncMock(return_value=MagicMock(matched_count=0))
        with pytest.raises(HTTPException) as exc_info:
            await admin_approve_event("evt-missing", user)
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_admin_pending_events(mock_db):
    from events_aggregator import admin_pending_events
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "role": "admin"}
        it = AsyncIteratorMock([])
        find_mock = MagicMock()
        find_mock.sort = MagicMock(return_value=it)
        mock_db.events_v2.find = MagicMock(return_value=find_mock)
        result = await admin_pending_events(user)
        assert result["items"] == []
        assert result["total"] == 0


@pytest.mark.asyncio
async def test_rsvp_free_no_credits(mock_db, sample_event):
    from events_aggregator import rsvp_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "email": "user@test.com", "role": "student"}
        mock_db.events_v2.find_one = AsyncMock(return_value={**sample_event, "price_amount": 0})
        mock_db.event_registrations.find_one = AsyncMock(return_value=None)
        mock_db.event_registrations.count_documents = AsyncMock(return_value=0)
        result = await rsvp_event("evt-001", user=user)
        assert result["ok"] is True
        assert result["status"] == "registered"


@pytest.mark.asyncio
async def test_rsvp_paid_with_credits(mock_db, sample_event):
    from events_aggregator import rsvp_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "email": "user@test.com", "role": "student"}
        paid_event = {**sample_event, "price_type": "paid", "price_amount": 50}
        mock_db.events_v2.find_one = AsyncMock(return_value=paid_event)
        mock_db.event_registrations.find_one = AsyncMock(return_value=None)
        mock_db.event_registrations.count_documents = AsyncMock(return_value=0)
        # Enough credits
        mock_db.users.find_one = AsyncMock(return_value={"sa_credits": 100})
        result = await rsvp_event("evt-001", user=user)
        assert result["ok"] is True
        assert result["status"] == "registered"


@pytest.mark.asyncio
async def test_rsvp_waitlist_when_full(mock_db, sample_event):
    from events_aggregator import rsvp_event
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "email": "user@test.com", "role": "student"}
        full_event = {**sample_event, "capacity": 2, "attendee_count": 2}
        mock_db.events_v2.find_one = AsyncMock(return_value=full_event)
        mock_db.event_registrations.find_one = AsyncMock(return_value=None)
        mock_db.event_registrations.count_documents = AsyncMock(return_value=2)
        result = await rsvp_event("evt-001", user=user)
        assert result["ok"] is True
        assert result["status"] == "waitlisted"


@pytest.mark.asyncio
async def test_cancel_rsvp_refund(mock_db, sample_event):
    from events_aggregator import cancel_rsvp
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "email": "user@test.com", "role": "student"}
        reg = {
            "_id": "reg-001",
            "event_id": "evt-001",
            "user_id": str(user["_id"]),
            "status": "registered",
            "created_at": datetime.now(timezone.utc),
        }
        mock_db.event_registrations.find_one = AsyncMock(return_value=reg)
        mock_db.events_v2.find_one = AsyncMock(return_value={**sample_event, "price_type": "free"})
        result = await cancel_rsvp("evt-001", user=user)
        assert result["ok"] is True
        assert result["refunded_credits"] is not None


@pytest.mark.asyncio
async def test_toggle_save(mock_db):
    from events_aggregator import toggle_save
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock(), "email": "user@test.com"}
        mock_db.event_activity_log.find_one = AsyncMock(return_value=None)
        result = await toggle_save("evt-001", user)
        assert result["ok"] is True
        assert result["action"] in ("saved", "unsaved")


@pytest.mark.asyncio
async def test_get_event_preferences(mock_db):
    from events_aggregator import get_event_prefs
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock()}
        mock_db.user_event_preferences.find_one = AsyncMock(return_value={
            "user_id": str(user["_id"]),
            "saved_event_types": ["hackathon", "workshop"],
            "preferred_city": "Bangalore",
        })
        result = await get_event_prefs(user)
        assert result["saved_event_types"] == ["hackathon", "workshop"]
        assert result["preferred_city"] == "Bangalore"


@pytest.mark.asyncio
async def test_update_event_preferences(mock_db):
    from events_aggregator import update_event_prefs
    with patch("events_aggregator._db", mock_db):
        user = {"_id": MagicMock()}
        result = await update_event_prefs({"preferred_city": "Delhi", "price_preference": "free_only"}, user)
        assert result["ok"] is True
        assert result["preferred_city"] == "Delhi"


class _ChainedFindMock:
    """Mock for find().sort(...).skip(...).limit(...) chains returning an async iterable."""
    def __init__(self, items):
        self._items = items

    def sort(self, *args, **kwargs):
        return self

    def skip(self, n):
        return self

    def limit(self, n):
        return self

    def __aiter__(self):
        return AsyncIteratorMock(self._items).__aiter__()


def _make_find_mock(items):
    return _ChainedFindMock(items)


@pytest.mark.asyncio
async def test_hosted_events(mock_db, sample_event):
    from events_aggregator import hosted_events
    with patch("events_aggregator._db", mock_db):
        user = {"_id": sample_event["host_user_id"]}
        mock_db.events_v2.find = MagicMock(return_value=_make_find_mock([sample_event]))
        result = await hosted_events(user)
        assert result["total"] == 1
        assert result["items"][0]["event_id"] == "evt-001"


@pytest.mark.asyncio
async def test_search_events_basic(mock_db):
    from events_aggregator import events_search
    with patch("events_aggregator._db", mock_db):
        evt = {
            "event_id": "evt-002",
            "title": "Code Fest",
            "event_type": "fest",
            "location_country": "India",
            "location_city": "Mumbai",
            "event_date_start": datetime(2026, 9, 1, 10, 0, tzinfo=timezone.utc),
            "event_date_end": datetime(2026, 9, 2, 18, 0, tzinfo=timezone.utc),
            "price_type": "free",
            "price_amount": 0,
            "attendee_count": 50,
            "capacity": 500,
            "source": "host",
            "is_active": True,
            "status": "published",
            "organizer_name": "Org",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        mock_db.events_v2.count_documents = AsyncMock(return_value=1)
        mock_db.events_v2.find = MagicMock(return_value=_make_find_mock([evt]))
        result = await events_search(
            user={"_id": "u1", "role": "student", "interests": []},
            event_type=None, location_country=None, location_city=None,
            region_india=None, event_mode=None, institution_tier=None,
            topic=None, q=None, page=1, limit=20,
        )
        assert result["total_count"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0]["event_type"] == "fest"


@pytest.mark.asyncio
async def test_search_events_filter_by_type(mock_db):
    from events_aggregator import events_search
    with patch("events_aggregator._db", mock_db):
        evt_hack = {
            "event_id": "evt-hack", "title": "Hack", "event_type": "hackathon",
            "location_country": "India", "location_city": "BLR",
            "event_date_start": datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc),
            "price_type": "free", "price_amount": 0, "attendee_count": 0,
            "capacity": 100, "source": "host", "is_active": True,
            "status": "published", "organizer_name": "O", "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        mock_db.events_v2.count_documents = AsyncMock(return_value=1)
        mock_db.events_v2.find = MagicMock(return_value=_make_find_mock([evt_hack]))
        result = await events_search(
            user={"_id": "u1", "role": "student", "interests": []},
            event_type="hackathon", location_country=None, location_city=None,
            region_india=None, event_mode=None, institution_tier=None,
            topic=None, q=None, page=1, limit=20,
        )
        assert all(r["event_type"] == "hackathon" for r in result["results"])


@pytest.mark.asyncio
async def test_category_counts(mock_db):
    from events_aggregator import events_category_counts
    with patch("events_aggregator._db", mock_db):
        mock_db.events_v2.aggregate = MagicMock(return_value=AsyncIteratorMock([
            {"_id": "hackathon", "count": 5},
            {"_id": "workshop", "count": 3},
        ]))
        result = await events_category_counts()
        assert result["hackathon"] == 5
        assert result["workshop"] == 3


@pytest.mark.asyncio
async def test_export_ics_endpoint(mock_db, sample_event):
    from events_aggregator import event_ics
    from fastapi import Response
    with patch("events_aggregator._db", mock_db):
        mock_db.events_v2.find_one = AsyncMock(return_value=sample_event)
        resp = await event_ics("evt-001")
        assert isinstance(resp, Response)
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/calendar")


@pytest.mark.asyncio
async def test_export_ics_not_found(mock_db):
    from events_aggregator import event_ics
    from fastapi import HTTPException
    with patch("events_aggregator._db", mock_db):
        mock_db.events_v2.find_one = AsyncMock(return_value=None)
        with pytest.raises(HTTPException) as exc_info:
            await event_ics("evt-missing")
        assert exc_info.value.status_code == 404
