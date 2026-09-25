"""18+ only, on every path that can set a birth date.

Guardrail 8 says any flow that could admit a minor must be gated and must fail
closed. Registration was gated; PATCH /profile was not, so an account created
at 18 could edit its own date of birth to a child's and the gate meant nothing.
"""
from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from services.member_profile_api import ProfileUpdate
from services.workflow_auth import MAXIMUM_AGE, MINIMUM_AGE, Signup, adult_birth_date, age_in_years

TODAY = date(2026, 9, 26)


def born_years_ago(years: int, *, days: int = 0) -> date:
    return date(TODAY.year - years, TODAY.month, TODAY.day) + timedelta(days=days)


class TestAgeInYears:
    def test_counts_completed_years(self):
        assert age_in_years(born_years_ago(30), TODAY) == 30

    def test_a_birthday_tomorrow_has_not_happened_yet(self):
        assert age_in_years(born_years_ago(18, days=1), TODAY) == 17

    def test_a_birthday_today_counts(self):
        assert age_in_years(born_years_ago(18), TODAY) == 18

    def test_a_future_birth_date_is_negative_not_large(self):
        assert age_in_years(TODAY + timedelta(days=365), TODAY) < 0


class TestAdultBirthDate:
    def test_exactly_eighteen_today_is_admitted(self):
        assert adult_birth_date(born_years_ago(MINIMUM_AGE), TODAY) == born_years_ago(MINIMUM_AGE)

    def test_one_day_short_of_eighteen_is_refused(self):
        with pytest.raises(ValueError):
            adult_birth_date(born_years_ago(MINIMUM_AGE, days=1), TODAY)

    @pytest.mark.parametrize("years", [0, 5, 12, 17])
    def test_a_minor_is_refused_at_every_age(self, years):
        with pytest.raises(ValueError):
            adult_birth_date(born_years_ago(years), TODAY)

    def test_an_implausible_age_is_refused(self):
        with pytest.raises(ValueError):
            adult_birth_date(born_years_ago(MAXIMUM_AGE + 1), TODAY)

    def test_a_future_birth_date_is_refused(self):
        with pytest.raises(ValueError):
            adult_birth_date(TODAY + timedelta(days=1), TODAY)

    def test_the_message_never_names_the_stored_date(self):
        # Guardrail 9: a validation error is not a place to echo personal data.
        with pytest.raises(ValueError) as caught:
            adult_birth_date(date(2015, 3, 4), TODAY)
        assert "2015" not in str(caught.value)


class TestSignupIsGated:
    def test_a_minor_cannot_register(self):
        with pytest.raises(ValidationError):
            Signup(fullName="A Student", dob=born_years_ago(14).isoformat(),
                   university="Demo University", rollNumber="R-1")

    def test_an_adult_can(self):
        assert Signup(fullName="A Student", dob=born_years_ago(21).isoformat(),
                      university="Demo University", rollNumber="R-1").dob == born_years_ago(21)


class TestProfileEditIsGatedToo:
    """The hole this file was written for."""

    def test_an_adult_cannot_edit_themselves_into_a_minor(self):
        with pytest.raises(ValidationError):
            ProfileUpdate(dob=born_years_ago(10).isoformat())

    def test_a_future_birth_date_is_still_refused(self):
        with pytest.raises(ValidationError):
            ProfileUpdate(dob="2999-01-01")

    def test_an_adult_may_still_correct_their_birth_date(self):
        assert ProfileUpdate(dob=born_years_ago(24).isoformat()).dob == born_years_ago(24)

    def test_an_edit_that_leaves_dob_alone_is_untouched(self):
        # dob is optional on this model; omitting it must not trip the gate.
        assert ProfileUpdate(bloodGroup="O+").dob is None
