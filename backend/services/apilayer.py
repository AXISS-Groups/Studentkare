"""
Studentkare — APILayer Service Integration (apilayer.com)
Provides phone validation (Numverify) and campus geocoding (Positionstack) via APILayer REST APIs.
"""
import os
import httpx
from typing import Dict, Any, Optional
from services.integration_config import INTEGRATIONS_DB

APILAYER_BASE_URL = "https://api.apilayer.com"


def get_apilayer_api_key() -> str:
    config = INTEGRATIONS_DB.get("apilayer", {})
    return config.get("api_key") or os.getenv("APILAYER_API_KEY", "")


async def validate_phone_numverify(phone_number: str, country_code: str = "IN") -> Dict[str, Any]:
    """Validate phone number format, carrier, location, and line type via APILayer Numverify API."""
    api_key = get_apilayer_api_key()
    clean_number = phone_number.replace("+", "").replace(" ", "").replace("-", "")

    if not api_key or not INTEGRATIONS_DB.get("apilayer", {}).get("enabled"):
        # Graceful fallback when APILayer key is not configured
        is_valid_len = len(clean_number) in (10, 12)
        return {
            "valid": is_valid_len,
            "number": clean_number,
            "local_format": clean_number[-10:] if len(clean_number) >= 10 else clean_number,
            "international_format": f"+{clean_number}",
            "country_prefix": "+91",
            "country_code": country_code,
            "country_name": "India",
            "location": "Telangana / India",
            "carrier": "Airtel / Jio",
            "line_type": "mobile",
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/numverify/validate"
    headers = {"apikey": api_key}
    params = {"number": clean_number, "country_code": country_code}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                data["source"] = "apilayer_numverify"
                return data
            return {
                "valid": True,
                "number": clean_number,
                "error": f"APILayer error status {response.status_code}",
                "source": "apilayer_numverify_error_fallback",
            }
    except Exception as e:
        return {
            "valid": True,
            "number": clean_number,
            "error": str(e),
            "source": "apilayer_exception_fallback",
        }


async def geocode_positionstack(query: str) -> Dict[str, Any]:
    """Forward geocode a campus building or location via APILayer Positionstack API."""
    api_key = get_apilayer_api_key()

    if not api_key or not INTEGRATIONS_DB.get("apilayer", {}).get("enabled"):
        # Graceful fallback for local development
        return {
            "latitude": 17.5947,
            "longitude": 78.1230,
            "label": f"{query}, IIT Hyderabad Campus, Kandi, Sangareddy, Telangana 502285",
            "name": query,
            "country": "India",
            "region": "Telangana",
            "confidence": 0.95,
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/positionstack/forward"
    headers = {"apikey": api_key}
    params = {"query": query, "limit": 1}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                results = data.get("data", [])
                if results:
                    top = results[0]
                    top["source"] = "apilayer_positionstack"
                    return top
            return {
                "latitude": 17.5947,
                "longitude": 78.1230,
                "label": query,
                "source": "apilayer_positionstack_fallback",
            }
    except Exception as e:
        return {
            "latitude": 17.5947,
            "longitude": 78.1230,
            "label": query,
            "error": str(e),
            "source": "apilayer_exception_fallback",
        }
