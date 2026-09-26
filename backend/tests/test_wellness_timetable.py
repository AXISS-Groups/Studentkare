"""Campus wellness sessions, on the booking machinery that already existed.

A session is a CatalogEntry of kind `wellness`, its sittings are
AvailabilitySlots, and booking goes through POST /appointments — so capacity is
reserved under a row lock by code that was already tested. The point of these
tests is that nothing about the wellness path weakens that, and that a spot
count is real rather than decorative.

The design also promises "no leaderboards, no body scores". That is Rule L —
no gamification of body metrics — and the timetable payload is asserted to
carry no attendance detail beyond capacity minus a count.
"""
import time
from datetime import datetime, timedelta, timezone

import pytest

from core import workflow_models as M
from test_clinical_fulfilment import make_staff  # noqa: F401  (shared account helper)
from test_workflow_api import harness, login, register  # noqa: F401  (isolated database)

TIMETABLE = "/api/wellness/timetable"


def iso(days=1, hour=17):
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    ).isoformat()


def publish_session(factory, item_id="yoga", provider="campus", name="Yoga",
                    category="wellness", price_paise=7900, pack="60 min · mats provided",
                    active=True):
    with factory() as db:
        db.add(M.CatalogEntry(
            id=item_id, provider_id=provider, kind="wellness", name=name, brand="Campus",
            category=category, description="Hatha and vinyasa, all levels.", pack=pack,
            price_paise=price_paise, mrp_paise=price_paise, stock=0, active=active,
            requires_prescription=False, preparation="",
        ))
        db.commit()


def add_sitting(factory, slot_id, item_id="yoga", provider="campus", start=None,
                capacity=12, booked=0, active=True):
    with factory() as db:
        db.add(M.AvailabilitySlot(
            id=slot_id, provider_id=provider, catalog_item_id=item_id,
            slot_start=start or iso(1), slot_end=start or iso(1), capacity=capacity,
            booked=booked, active=active,
        ))
        db.commit()


@pytest.fixture
def campus(harness):
    client, factory, codes = harness
    make_staff(factory, "campus", "CAMPUS_ADMIN", "campus@example.test", name="VNR VJIET")
    make_staff(factory, "vend", "VENDOR", "vend@example.test", name="A Vendor")
    make_staff(factory, "root", "SUPER_ADMIN", "root@example.test", name="Root")
    return client, factory, codes


def timetable(client):
    response = client.get(TIMETABLE)
    assert response.status_code == 200, response.text
    return response.json()


class TestWhoCanSeeIt:
    def test_the_timetable_is_public(self, campus):
        # A list of published sessions is an offering, like /catalog.
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1")
        assert len(timetable(client)) == 1

    def test_it_reveals_nothing_about_who_booked(self, campus):
        # Rule L, and plain privacy: capacity minus a count is the only
        # attendance figure that leaves the database.
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=12, booked=5)
        body = repr(timetable(client))
        for leak in ("accountId", "account_id", "attendee", "bookedBy", "studentName", "email"):
            assert leak not in body

    def test_it_carries_no_body_metric(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1")
        body = repr(timetable(client)).lower()
        for metric in ("bmi", "weight", "streak", "rank", "leaderboard", "score", "calorie"):
            assert metric not in body


class TestWhatIsListed:
    def test_a_session_reports_its_real_price(self, campus):
        client, factory, _ = campus
        publish_session(factory, price_paise=7900)
        add_sitting(factory, "s1")
        assert timetable(client)[0]["pricePaise"] == 7900

    def test_spots_left_is_capacity_minus_bookings(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=12, booked=5)
        assert timetable(client)[0]["sittings"][0]["spotsLeft"] == 7

    def test_a_full_sitting_reports_zero_not_a_negative(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=4, booked=6)
        assert timetable(client)[0]["sittings"][0]["spotsLeft"] == 0

    def test_it_names_the_campus_running_it(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "s1")
        assert timetable(client)[0]["providerName"] == "VNR VJIET"

    def test_sittings_come_back_in_time_order(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "late", start=iso(3))
        add_sitting(factory, "early", start=iso(1))
        starts = [s["slotStart"] for s in timetable(client)[0]["sittings"]]
        assert starts == sorted(starts)


class TestWhatIsExcluded:
    def test_a_past_sitting_is_not_listed(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "gone", start=iso(-2))
        assert timetable(client)[0]["sittings"] == []

    def test_a_sitting_beyond_the_horizon_is_not_listed(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "far", start=iso(20))
        assert timetable(client)[0]["sittings"] == []

    def test_a_cancelled_sitting_is_not_listed(self, campus):
        client, factory, _ = campus
        publish_session(factory)
        add_sitting(factory, "off", active=False)
        assert timetable(client)[0]["sittings"] == []

    def test_an_unpublished_session_is_not_listed(self, campus):
        client, factory, _ = campus
        publish_session(factory, active=False)
        add_sitting(factory, "s1")
        assert timetable(client) == []

    def test_other_catalog_kinds_are_not_listed(self, campus):
        client, factory, _ = campus
        with factory() as db:
            db.add(M.CatalogEntry(
                id="med", provider_id="vend", kind="product", name="Paracetamol", brand="X",
                category="general", description="a medicine listing", pack="10",
                price_paise=1000, mrp_paise=1000, stock=5, active=True,
                requires_prescription=False, preparation="",
            ))
            db.commit()
        assert timetable(client) == []

    def test_nothing_published_returns_an_empty_list(self, campus):
        client, _, _ = campus
        assert timetable(client) == []


class TestWhoMayPublish:
    def test_a_wellness_listing_must_belong_to_a_campus(self, campus):
        # A campus runs its own sessions on its own premises, so a vendor
        # account may not publish one.
        client, _, codes = campus
        headers = login(client, codes, "root@example.test")
        body = {
            "providerId": "vend", "kind": "wellness", "name": "Yoga", "brand": "Campus",
            "category": "wellness", "description": "Hatha and vinyasa, all levels.",
            "pack": "60 min", "pricePaise": 7900, "mrpPaise": 7900, "stock": 0,
            "requiresPrescription": False, "preparation": "",
        }
        response = client.post("/api/ops/catalog", json=body, headers=headers)
        assert response.status_code == 422
        assert "campus admin" in response.json()["detail"].lower()

    def test_a_campus_account_may_publish_one(self, campus):
        client, _, codes = campus
        headers = login(client, codes, "root@example.test")
        body = {
            "providerId": "campus", "kind": "wellness", "name": "Yoga", "brand": "Campus",
            "category": "wellness", "description": "Hatha and vinyasa, all levels.",
            "pack": "60 min", "pricePaise": 7900, "mrpPaise": 7900, "stock": 0,
            "requiresPrescription": False, "preparation": "",
        }
        assert client.post("/api/ops/catalog", json=body, headers=headers).status_code == 201

    def test_a_consultation_still_needs_a_clinician(self, campus):
        # The role mapping replaced a two-branch conditional; this pins the
        # branch that already existed.
        client, _, codes = campus
        headers = login(client, codes, "root@example.test")
        body = {
            "providerId": "campus", "kind": "consultation", "name": "Consult", "brand": "C",
            "category": "general", "description": "a consultation listing", "pack": "30m",
            "pricePaise": 29900, "mrpPaise": 29900, "stock": 0,
            "requiresPrescription": False, "preparation": "",
        }
        response = client.post("/api/ops/catalog", json=body, headers=headers)
        assert response.status_code == 422
        assert "nmc doctor" in response.json()["detail"].lower()


class TestBooking:
    def test_booking_a_sitting_reserves_a_spot(self, campus):
        # The whole reason for reusing appointments: the count on the timetable
        # is the same number the booking path decrements.
        client, factory, codes = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=2)
        _, headers = register(client, codes, "student@example.test")

        assert client.post("/api/appointments", json={"slotId": "s1"}, headers=headers).status_code == 201
        assert timetable(client)[0]["sittings"][0]["spotsLeft"] == 1

    def test_a_full_sitting_refuses_a_further_booking(self, campus):
        client, factory, codes = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=1)
        _, first = register(client, codes, "one@example.test")
        assert client.post("/api/appointments", json={"slotId": "s1"}, headers=first).status_code == 201
        assert timetable(client)[0]["sittings"][0]["spotsLeft"] == 0

        second = login(client, codes, "campus@example.test")
        assert client.post("/api/appointments", json={"slotId": "s1"}, headers=second).status_code == 409

    def test_cancelling_returns_the_spot(self, campus):
        client, factory, codes = campus
        publish_session(factory)
        add_sitting(factory, "s1", capacity=2)
        _, headers = register(client, codes, "student@example.test")
        appointment = client.post("/api/appointments", json={"slotId": "s1"}, headers=headers).json()["id"]

        assert client.patch(f"/api/appointments/{appointment}", json={"status": "CANCELLED"},
                            headers=headers).status_code == 200
        assert timetable(client)[0]["sittings"][0]["spotsLeft"] == 2
