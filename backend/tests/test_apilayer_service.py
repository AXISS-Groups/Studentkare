"""
Tests for Studentkare APILayer Service Suite
Verifies:
1. Unconfigured honest fallback handling (APILAYER_API_KEY unset)
2. Python APILayerService static methods (Numverify, Mailboxlayer, Positionstack, pdflayer, Bad Words, Resume, Weather, Fixer)
3. REST API endpoints (/api/apilayer/*)
"""
import pytest

from core.apilayer_service import apilayer_service

# The router is mounted behind require_super_admin; REST checks run as an
# authenticated super-admin via the ``super_admin_client`` fixture (conftest.py).


@pytest.mark.asyncio
async def test_apilayer_status_endpoint(super_admin_client):
    client, headers = super_admin_client
    response = client.get("/api/apilayer/status")
    assert response.status_code == 200
    data = response.json()
    assert "supported_features" in data
    assert "numverify" in data["supported_features"]
    assert "mailboxlayer" in data["supported_features"]
    assert "pdflayer" in data["supported_features"]
    assert "bad_words" in data["supported_features"]
    assert "weatherstack" in data["supported_features"]


@pytest.mark.asyncio
async def test_numverify_phone_validation(super_admin_client):
    client, headers = super_admin_client
    # Test service method
    res = await apilayer_service.validate_phone("9876543210", "IN")
    # No API key in tests: unverified, never a fabricated "valid".
    assert res.get("valid") is None
    assert "number" in res

    # Test REST endpoint
    response = client.get("/api/apilayer/numverify?phone=9876543210&country=IN")
    assert response.status_code == 200
    assert response.json().get("valid") is None


@pytest.mark.asyncio
async def test_mailboxlayer_email_validation(super_admin_client):
    client, headers = super_admin_client
    # Test service method
    res = await apilayer_service.validate_email("student@snist.edu.in")
    assert res.get("email") == "student@snist.edu.in"
    assert "format_valid" in res

    # Test REST endpoint
    response = client.get("/api/apilayer/mailboxlayer?email=student@snist.edu.in")
    assert response.status_code == 200
    assert response.json().get("email") == "student@snist.edu.in"


@pytest.mark.asyncio
async def test_positionstack_geocoding(super_admin_client):
    client, headers = super_admin_client
    res = await apilayer_service.geocode("Hostel 4, IIT Hyderabad")
    assert "latitude" in res
    assert "longitude" in res

    response = client.get("/api/apilayer/positionstack?query=Hostel%204")
    assert response.status_code == 200
    assert "latitude" in response.json()


@pytest.mark.asyncio
async def test_pdflayer_pdf_conversion(super_admin_client):
    client, headers = super_admin_client
    html = "<h1>Emergency Health Record</h1>"
    res = await apilayer_service.generate_pdf(html, "emergency_record.pdf")
    assert res.get("success") is False  # not configured: no PDF, no fake link

    response = client.post("/api/apilayer/pdflayer", headers=headers, json={"html": html, "document_name": "test.pdf"})
    assert response.status_code == 200
    assert response.json().get("success") is False


@pytest.mark.asyncio
async def test_badwords_profanity_moderation(super_admin_client):
    client, headers = super_admin_client
    text = "Please review my health ticket for campus clinic"
    res = await apilayer_service.check_profanity(text)
    assert "is_clean" in res

    response = client.post("/api/apilayer/badwords", headers=headers, json={"text": text})
    assert response.status_code == 200
    assert response.json().get("is_clean") is None  # unchecked text is not declared clean


@pytest.mark.asyncio
async def test_weatherstack_advisory(super_admin_client):
    client, headers = super_admin_client
    res = await apilayer_service.get_weather_advisory("Hyderabad")
    assert "health_advisory" in res

    response = client.get("/api/apilayer/weatherstack?query=Hyderabad")
    assert response.status_code == 200
    assert "health_advisory" in response.json()


@pytest.mark.asyncio
async def test_fixer_currency_conversion(super_admin_client):
    client, headers = super_admin_client
    res = await apilayer_service.convert_currency(100.0, "USD", "INR")
    assert res.get("success") is True
    assert "result" in res

    response = client.get("/api/apilayer/fixer?amount=50.0&from_curr=USD&to_curr=INR")
    assert response.status_code == 200
    assert response.json().get("success") is True
