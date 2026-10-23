"""DPDP consent is recorded at signup, and there is no account without it."""
import pytest
from test_workflow_api import (  # noqa: F401 — pytest fixtures
    SIGNUP_CONSENT,
    SIGNUP_PASSWORD,
    harness,
    register,
    verify_second_contact,
)

from core import workflow_models as M

DETAILS = {"fullName": "Consent Test", "dob": "2000-01-01", "university": "Test University", "rollNumber": "C1",
           "password": SIGNUP_PASSWORD}


def _verified(client, codes, identifier):
    client.post("/api/auth/otp/send", json={"identifier": identifier, "channel": "EMAIL", "intent": "SIGNUP"})
    headers = {"X-CSRF-Token": client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]}
    verify_second_contact(client, codes, headers)
    return headers


def test_the_screen_is_told_the_current_version_and_required_items(harness):
    client, _factory, _codes = harness
    terms = client.get("/api/auth/consent").json()
    # Nothing published: the screen says so and sign-up records "unpublished" (audit H2).
    assert terms == {"version": SIGNUP_CONSENT["version"], "required": SIGNUP_CONSENT["purposes"],
                     "noticeVersion": "unpublished", "termsVersion": "unpublished"}


@pytest.mark.parametrize("consent", [
    None,
    {**SIGNUP_CONSENT, "purposes": ["RECORDS_STORAGE", "CAMPUS_ENROLMENT"]},
    {**SIGNUP_CONSENT, "purposes": []},
    {**SIGNUP_CONSENT, "version": "v3.1"},
])
def test_no_account_without_every_required_consent_and_the_grant_survives(harness, consent):
    client, factory, codes = harness
    headers = _verified(client, codes, "no-consent@example.test")
    body = {**DETAILS, **({"consent": consent} if consent is not None else {})}
    assert client.post("/api/auth/signup", json=body, headers=headers).status_code == 422
    with factory() as db:
        assert db.query(M.Account).filter_by(identifier="no-consent@example.test").count() == 0
    # The refusal didn't spend the verification: agreeing now works.
    assert client.post("/api/auth/signup", json={**DETAILS, "consent": SIGNUP_CONSENT}, headers=headers).status_code == 201


def test_consent_is_recorded_with_version_purposes_language_and_time(harness):
    client, factory, codes = harness
    user, headers = register(client, codes, "consented@example.test")
    with factory() as db:
        row = db.query(M.ConsentRecord).filter_by(account_id=user["id"]).one()
        assert row.version == SIGNUP_CONSENT["version"]
        assert sorted(row.purposes) == sorted(SIGNUP_CONSENT["purposes"])
        assert row.recorded_at > 0 and row.withdrawn_at == 0
        assert "consent" not in (db.get(M.Account, user["id"]).profile or {})
    mine = client.get("/api/auth/consents", headers=headers).json()["items"]
    assert mine[0]["version"] == SIGNUP_CONSENT["version"]


def test_unknown_purposes_are_not_recorded_as_agreed(harness):
    client, factory, codes = harness
    headers = _verified(client, codes, "extra@example.test")
    consent = {**SIGNUP_CONSENT, "purposes": [*SIGNUP_CONSENT["purposes"], "PARTNER_OFFERS"]}
    created = client.post("/api/auth/signup", json={**DETAILS, "consent": consent}, headers=headers)
    assert created.status_code == 201
    with factory() as db:
        assert "PARTNER_OFFERS" not in db.query(M.ConsentRecord).one().purposes
