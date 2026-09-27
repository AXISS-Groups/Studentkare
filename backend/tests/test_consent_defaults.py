"""The two new consents default to withheld, and survive a round trip.

Dorm pickup location and Ayush chat retention are consents, not settings. DPDP
asks for each purpose separately, so neither may arrive already granted — not
for a new account, not for an account created before the columns existed, and
not when a client omits them from a PUT.
"""
from test_workflow_api import harness, register  # noqa: F401 — pytest fixtures

CONSENTS = ("pickupLocationEnabled", "ayushHistoryEnabled")
ENDPOINT = "/api/notifications/preferences"


def base_body(**overrides):
    body = {
        "emailEnabled": True, "pushEnabled": True, "remindersEnabled": True,
        "pickupLocationEnabled": False, "ayushHistoryEnabled": False,
        "timezone": "Asia/Kolkata", "quietStart": "22:00", "quietEnd": "08:00",
    }
    body.update(overrides)
    return body


def test_an_account_that_never_opened_settings_has_granted_nothing(harness):
    client, _factory, codes = harness
    _user, _headers = register(client, codes)

    prefs = client.get(ENDPOINT).json()

    for consent in CONSENTS:
        assert prefs[consent] is False, consent


def test_a_client_that_omits_them_does_not_grant_them(harness):
    """An older app build, or a partial payload, must not turn a consent on."""
    client, _factory, codes = harness
    _user, headers = register(client, codes)

    body = base_body()
    for consent in CONSENTS:
        body.pop(consent)
    assert client.put(ENDPOINT, headers=headers, json=body).status_code == 200

    prefs = client.get(ENDPOINT).json()
    for consent in CONSENTS:
        assert prefs[consent] is False, consent


def test_granting_one_does_not_grant_the_other(harness):
    client, _factory, codes = harness
    _user, headers = register(client, codes)

    assert client.put(ENDPOINT, headers=headers,
                      json=base_body(pickupLocationEnabled=True)).status_code == 200

    prefs = client.get(ENDPOINT).json()
    assert prefs["pickupLocationEnabled"] is True
    assert prefs["ayushHistoryEnabled"] is False


def test_a_consent_can_be_withdrawn(harness):
    """DESIGN.md: withdrawing is as easy as agreeing."""
    client, _factory, codes = harness
    _user, headers = register(client, codes)

    client.put(ENDPOINT, headers=headers, json=base_body(ayushHistoryEnabled=True))
    assert client.get(ENDPOINT).json()["ayushHistoryEnabled"] is True

    client.put(ENDPOINT, headers=headers, json=base_body(ayushHistoryEnabled=False))
    assert client.get(ENDPOINT).json()["ayushHistoryEnabled"] is False


def test_the_existing_settings_still_default_on(harness):
    """Delivery settings are not consents — switching reminders off is a
    preference, and an account that never chose keeps receiving what it would."""
    client, _factory, codes = harness
    _user, _headers = register(client, codes)

    prefs = client.get(ENDPOINT).json()

    assert prefs["emailEnabled"] is True
    assert prefs["remindersEnabled"] is True


def test_preferences_need_a_session(harness):
    client, _factory, _codes = harness
    assert client.get(ENDPOINT).status_code in (401, 403)
