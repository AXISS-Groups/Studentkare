"""Clinician earnings: summed from completed appointments, or absent.

The design for this screen shows a fortnightly statement with gross, a 10%
commission, a net figure and a "Due 3 October" date. Only two of those can be
computed from anything in this repo. There is no settlement table, no payout
record and no configured commission rate, so the endpoint reports volume and
gross and states that the rest is not configured rather than assuming it.
Money owed to a clinician is the last number to guess at.
"""
import time
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from core import workflow_models as M
from services.workflow_api import fortnight_bounds
from test_clinical_fulfilment import make_staff  # noqa: F401  (shared account helper)
from test_workflow_api import harness, login, register  # noqa: F401  (isolated database)

ENDPOINT = "/api/work/earnings"
DAY = 86400


def seed_consult(factory, price_paise=29900, item_id="consult", provider="doc"):
    with factory() as db:
        db.add(M.CatalogEntry(
            id=item_id, provider_id=provider, kind="consultation", name="General Consult",
            brand="Clinic", category="general-care", description="consult", pack="30m",
            price_paise=price_paise, mrp_paise=price_paise, stock=0, active=True,
            requires_prescription=False, preparation="",
        ))
        db.commit()


def add_appointment(factory, appt_id, provider, status, completed_at, item_id="consult",
                    account_id="patient"):
    with factory() as db:
        db.add(M.Appointment(
            id=appt_id, account_id=account_id, provider_id=provider, catalog_item_id=item_id,
            slot_id=f"slot-{appt_id}", status=status, created_at=completed_at - DAY,
            updated_at=completed_at,
        ))
        db.commit()


@pytest.fixture
def doctor(harness):
    """One clinician with a consult priced at Rs 299, and a patient account."""
    client, factory, codes = harness
    make_staff(factory, "doc", "NMC_DOCTOR", "doc@example.test", name="Doctor")
    make_staff(factory, "other", "NMC_DOCTOR", "other@example.test", name="Other Doctor")
    make_staff(factory, "patient", "STUDENT", "patient@example.test", name="A Patient")
    seed_consult(factory)
    return client, factory, codes


def earnings(client, codes, identifier="doc@example.test"):
    response = client.get(ENDPOINT, headers=login(client, codes, identifier))
    assert response.status_code == 200, response.text
    return response.json()


class TestWhoMayLook:
    def test_a_student_may_not(self, doctor):
        client, _, codes = doctor
        assert client.get(ENDPOINT, headers=login(client, codes, "patient@example.test")).status_code == 403

    def test_an_anonymous_caller_may_not(self, doctor):
        client, _, _ = doctor
        assert client.get(ENDPOINT).status_code in (401, 403)

    def test_a_clinician_sees_only_their_own(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "mine", "doc", "COMPLETED", time.time() - DAY)
        add_appointment(factory, "theirs", "other", "COMPLETED", time.time() - DAY)
        assert earnings(client, codes)["consults"] == 1
        assert earnings(client, codes, "other@example.test")["consults"] == 1


class TestWhatCounts:
    def test_a_completed_consult_counts_at_the_booked_price(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        body = earnings(client, codes)
        assert body["consults"] == 1
        assert body["grossPaise"] == 29900

    @pytest.mark.parametrize("status", ["REQUESTED", "CONFIRMED", "CANCELLED", "NO_SHOW"])
    def test_nothing_else_counts(self, doctor, status):
        # A no-show in particular: it is not earned, and reporting it as earned
        # would overstate a statement the clinician is paid against.
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", status, time.time() - DAY)
        body = earnings(client, codes)
        assert body["consults"] == 0 and body["grossPaise"] == 0

    def test_a_consult_older_than_the_window_falls_out(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "old", "doc", "COMPLETED", time.time() - 181 * DAY)
        assert earnings(client, codes)["periods"] == []

    def test_prices_are_summed_per_item_not_assumed(self, doctor):
        client, factory, codes = doctor
        seed_consult(factory, price_paise=50000, item_id="long-consult")
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        add_appointment(factory, "b", "doc", "COMPLETED", time.time() - DAY, item_id="long-consult")
        assert earnings(client, codes)["grossPaise"] == 79900


class TestNothingIsAssumed:
    def test_no_commission_rate_is_invented(self, doctor):
        # The design shows 10%. Nothing in this repo configures one, and the
        # codebase elsewhere states "zero commercial commissions", so the
        # endpoint reports the absence and the screen must render it.
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        assert earnings(client, codes)["commissionRate"] is None

    def test_no_settlement_is_claimed(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        assert earnings(client, codes)["settlementConfigured"] is False

    def test_no_net_figure_is_offered(self, doctor):
        # Net cannot exist without a commission rate. Rather than shipping
        # gross-as-net, the field is absent.
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        body = earnings(client, codes)
        assert "netPaise" not in body and "dueDate" not in body

    def test_a_clinician_with_no_consults_gets_zero_not_a_sample(self, doctor):
        client, _, codes = doctor
        body = earnings(client, codes)
        assert body == {
            "periods": [], "grossPaise": 0, "consults": 0, "windowDays": 180,
            "commissionRate": None, "settlementConfigured": False,
        }


class TestFortnights:
    def test_the_first_half_of_a_month(self):
        # 2026-09-10 12:00 IST
        moment = time.mktime((2026, 9, 10, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment) == ("2026-09-01", "2026-09-15")

    def test_the_second_half_of_a_month(self):
        moment = time.mktime((2026, 9, 20, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment) == ("2026-09-16", "2026-09-30")

    def test_february_ends_on_the_28th(self):
        moment = time.mktime((2026, 2, 20, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment) == ("2026-02-16", "2026-02-28")

    def test_a_leap_february_ends_on_the_29th(self):
        moment = time.mktime((2028, 2, 20, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment) == ("2028-02-16", "2028-02-29")

    def test_a_31_day_month_ends_on_the_31st(self):
        moment = time.mktime((2026, 1, 20, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment) == ("2026-01-16", "2026-01-31")

    def test_boundaries_are_local_not_utc(self):
        # 03:00 IST on the 16th is 21:30 UTC on the 15th. Bucketing in UTC would
        # move this consult into the previous statement, and the money with it.
        ist = timezone(timedelta(hours=5, minutes=30))
        moment = datetime(2026, 9, 16, 3, 0, tzinfo=ist).timestamp()
        assert datetime.fromtimestamp(moment, tz=timezone.utc).day == 15
        assert fortnight_bounds(moment)[0] == "2026-09-16"

    def test_an_unknown_timezone_falls_back_rather_than_failing(self):
        moment = time.mktime((2026, 9, 10, 6, 30, 0, 0, 0, 0))
        assert fortnight_bounds(moment, zone="Not/AZone") == fortnight_bounds(moment)


class TestGrouping:
    def test_two_consults_in_one_fortnight_are_one_line(self, doctor):
        client, factory, codes = doctor
        when = time.time() - DAY
        add_appointment(factory, "a", "doc", "COMPLETED", when)
        add_appointment(factory, "b", "doc", "COMPLETED", when)
        periods = earnings(client, codes)["periods"]
        assert len(periods) == 1
        assert periods[0]["consults"] == 2 and periods[0]["grossPaise"] == 59800

    def test_periods_come_back_newest_first(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "recent", "doc", "COMPLETED", time.time() - DAY)
        add_appointment(factory, "older", "doc", "COMPLETED", time.time() - 60 * DAY)
        periods = earnings(client, codes)["periods"]
        assert len(periods) >= 2
        assert periods[0]["start"] > periods[-1]["start"]

    def test_the_totals_match_the_lines(self, doctor):
        client, factory, codes = doctor
        add_appointment(factory, "a", "doc", "COMPLETED", time.time() - DAY)
        add_appointment(factory, "b", "doc", "COMPLETED", time.time() - 60 * DAY)
        body = earnings(client, codes)
        assert body["grossPaise"] == sum(p["grossPaise"] for p in body["periods"])
        assert body["consults"] == sum(p["consults"] for p in body["periods"])


def test_the_state_machine_still_makes_completed_terminal(doctor):
    """The endpoint reads updated_at as the completion time, which only holds
    while COMPLETED admits no further transition. If that changes, earnings
    silently start moving between statements."""
    client, factory, codes = doctor
    _, patient_headers = register(client, codes, "booker@example.test")
    with factory() as db:
        db.add(M.AvailabilitySlot(id="slot-live", provider_id="doc", catalog_item_id="consult",
                                  slot_start="2026-09-20T10:00", slot_end="2026-09-20T10:30",
                                  capacity=1, booked=0, active=True))
        db.commit()
    appt_id = client.post("/api/appointments", json={"slotId": "slot-live"},
                          headers=patient_headers).json()["id"]
    doc_headers = login(client, codes, "doc@example.test")
    assert client.patch(f"/api/work/appointments/{appt_id}", json={"status": "CONFIRMED"},
                        headers=doc_headers).status_code == 200
    assert client.patch(f"/api/work/appointments/{appt_id}", json={"status": "COMPLETED"},
                        headers=doc_headers).status_code == 200

    for onward in ("CANCELLED", "NO_SHOW", "CONFIRMED"):
        assert client.patch(f"/api/work/appointments/{appt_id}", json={"status": onward},
                            headers=doc_headers).status_code == 409

    with factory() as db:
        assert db.scalar(select(M.Appointment.status).where(M.Appointment.id == appt_id)) == "COMPLETED"
