"""
Tests for Studentkare APILayer Service Suite
Verifies:
1. Unconfigured honest fallback handling (APILAYER_API_KEY unset)
2. Python APILayerService static methods (Numverify, Mailboxlayer, Positionstack, pdflayer, Bad Words, Resume, Weather, Fixer)
3. REST API endpoints (/api/apilayer/*)
"""
import pytest
from fastapi.testclient import TestClient

from core.apilayer_service import apilayer_service
from main import app
from services.workflow_auth import require_super_admin


@pytest.fixture(autouse=True)
def _override_super_admin():
    app.dependency_overrides[require_super_admin] = lambda: {"id": "admin", "role": "SUPER_ADMIN"}
    yield
    app.dependency_overrides.pop(require_super_admin, None)


client = TestClient(app)


@pytest.mark.asyncio
async def test_apilayer_status_endpoint():
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
async def test_numverify_phone_validation():
    # Test service method
    res = await apilayer_service.validate_phone("9876543210", "IN")
    assert res.get("valid") is True
    assert "number" in res

    # Test REST endpoint
    response = client.get("/api/apilayer/numverify?phone=9876543210&country=IN")
    assert response.status_code == 200
    assert response.json().get("valid") is True


@pytest.mark.asyncio
async def test_mailboxlayer_email_validation():
    # Test service method
    res = await apilayer_service.validate_email("student@snist.edu.in")
    assert res.get("email") == "student@snist.edu.in"
    assert "format_valid" in res

    # Test REST endpoint
    response = client.get("/api/apilayer/mailboxlayer?email=student@snist.edu.in")
    assert response.status_code == 200
    assert response.json().get("email") == "student@snist.edu.in"


@pytest.mark.asyncio
async def test_positionstack_geocoding():
    res = await apilayer_service.geocode("Hostel 4, IIT Hyderabad")
    assert "latitude" in res
    assert "longitude" in res

    response = client.get("/api/apilayer/positionstack?query=Hostel%204")
    assert response.status_code == 200
    assert "latitude" in response.json()


@pytest.mark.asyncio
async def test_pdflayer_pdf_conversion():
    html = "<h1>Emergency Health Record</h1>"
    res = await apilayer_service.generate_pdf(html, "emergency_record.pdf")
    assert res.get("success") is True

    response = client.post("/api/apilayer/pdflayer", json={"html": html, "document_name": "test.pdf"})
    assert response.status_code == 200
    assert response.json().get("success") is True


@pytest.mark.asyncio
async def test_badwords_profanity_moderation():
    text = "Please review my health ticket for campus clinic"
    res = await apilayer_service.check_profanity(text)
    assert "is_clean" in res

    response = client.post("/api/apilayer/badwords", json={"text": text})
    assert response.status_code == 200
    assert response.json().get("is_clean") is True


@pytest.mark.asyncio
async def test_weatherstack_advisory():
    res = await apilayer_service.get_weather_advisory("Hyderabad")
    assert "health_advisory" in res

    response = client.get("/api/apilayer/weatherstack?query=Hyderabad")
    assert response.status_code == 200
    assert "health_advisory" in response.json()


@pytest.mark.asyncio
async def test_fixer_currency_conversion():
    res = await apilayer_service.convert_currency(100.0, "USD", "INR")
    assert res.get("success") is True
    assert "result" in res

    response = client.get("/api/apilayer/fixer?amount=50.0&from_curr=USD&to_curr=INR")
    assert response.status_code == 200
    assert response.json().get("success") is True
