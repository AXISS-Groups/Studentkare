"""
Studentkare — APILayer Service Integration Test Suite
Verifies phone validation, geocoding, language detection, country lookup, and IP geolocation APIs.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_apilayer_numverify_endpoint():
    res = client.get("/api/apilayer/numverify?phone=9876543210&country=IN")
    assert res.status_code == 200
    data = res.json()
    assert "valid" in data
    assert data["valid"] is True


def test_apilayer_positionstack_endpoint():
    res = client.get("/api/apilayer/positionstack?query=Hostel+Block+4")
    assert res.status_code == 200
    data = res.json()
    assert "latitude" in data
    assert "longitude" in data


def test_apilayer_languagelayer_endpoint():
    res = client.post("/api/apilayer/languagelayer", json={"text": "मुझे मदद चाहिए"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["results"][0]["language_code"] in ("hi", "en")


def test_apilayer_restcountries_endpoint():
    res = client.get("/api/apilayer/restcountries?query=India")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_apilayer_freegeoip_endpoint():
    res = client.get("/api/apilayer/freegeoip?ip=127.0.0.1")
    assert res.status_code == 200
    data = res.json()
    assert data["country_code"] == "IN"
