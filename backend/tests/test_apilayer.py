"""
Studentkare — APILayer Service Integration Test Suite
Verifies phone validation, geocoding, language detection, country lookup, and IP geolocation APIs.
"""
# The router is mounted behind require_super_admin; every request here runs as an
# authenticated super-admin via the ``super_admin_client`` fixture (conftest.py).


def test_apilayer_numverify_endpoint(super_admin_client):
    client, headers = super_admin_client
    res = client.get("/api/apilayer/numverify?phone=9876543210&country=IN")
    assert res.status_code == 200
    data = res.json()
    assert "valid" in data
    # No API key in tests: unverified, never a fabricated "valid".
    assert data["valid"] is None
    assert data["source"] == "unconfigured"


def test_apilayer_positionstack_endpoint(super_admin_client):
    client, headers = super_admin_client
    res = client.get("/api/apilayer/positionstack?query=Hostel+Block+4")
    assert res.status_code == 200
    data = res.json()
    assert "latitude" in data
    assert "longitude" in data


def test_apilayer_languagelayer_endpoint(super_admin_client):
    client, headers = super_admin_client
    res = client.post("/api/apilayer/languagelayer", headers=headers, json={"text": "मुझे मदद चाहिए"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["results"][0]["language_code"] in ("hi", "en")


def test_apilayer_restcountries_endpoint(super_admin_client):
    client, headers = super_admin_client
    res = client.get("/api/apilayer/restcountries?query=India")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_apilayer_freegeoip_endpoint(super_admin_client):
    client, headers = super_admin_client
    res = client.get("/api/apilayer/freegeoip?ip=127.0.0.1")
    assert res.status_code == 200
    data = res.json()
    assert data["country_code"] == "IN"
