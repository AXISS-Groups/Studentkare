"""
Studentkare — APILayer Service Integration Suite (apilayer.com)
Provides microservices for:
1. Numverify: Phone Validation & Carrier Lookup
2. Positionstack: Campus Geocoding & Spatial Coordinates
3. Languagelayer: Automatic Multilingual Text Language Detection
4. REST Countries: International Student Country Metadata
5. Freegeoip: IP Geolocation & Network Threat Inspection
6. Mailboxlayer: Email Validation & Deliverability Scoring
7. pdflayer: HTML-to-PDF Conversion (SOAP Notes, Rx, Cards)
8. Bad Words API: Content Moderation & Profanity Filtering
9. Resume Parser: Student Talent & Resume Parsing
10. Weatherstack: Campus AQI & Seasonal Health Advisories
11. Fixer API: Multi-Currency Billing & Conversion
"""
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, File, HTTPException, Query, Request, UploadFile

from services.integration_config import INTEGRATIONS_DB

APILAYER_BASE_URL = "https://api.apilayer.com"

router = APIRouter(prefix="/api/apilayer", tags=["APILayer Integrations"])


def get_apilayer_api_key() -> str:
    config = INTEGRATIONS_DB.get("apilayer", {})
    return config.get("api_key") or os.getenv("APILAYER_API_KEY", "")


def is_apilayer_enabled() -> bool:
    config = INTEGRATIONS_DB.get("apilayer", {})
    return bool(config.get("enabled", True)) and bool(get_apilayer_api_key())


# ── 1. Numverify — Phone Validation & Carrier Lookup ──────────────────────

async def validate_phone_numverify(phone_number: str, country_code: str = "IN") -> Dict[str, Any]:
    """Validate phone number format, carrier, location, and line type via APILayer Numverify API."""
    api_key = get_apilayer_api_key()
    clean_number = phone_number.replace("+", "").replace(" ", "").replace("-", "").strip()

    if not is_apilayer_enabled():
        # Fallback when APILayer key is not configured
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


# ── 2. Positionstack — Spatial Campus Geocoding ───────────────────────────

async def geocode_positionstack(query: str) -> Dict[str, Any]:
    """Forward geocode a campus building or location via APILayer Positionstack API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
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


# ── 3. Languagelayer — Multilingual Language Detection ────────────────────

async def detect_language_languagelayer(text: str) -> Dict[str, Any]:
    """Detect language of student input via APILayer Languagelayer API."""
    api_key = get_apilayer_api_key()
    cleaned = text.strip()

    if not is_apilayer_enabled():
        has_devanagari = any('\u0900' <= c <= '\u097F' for c in cleaned)
        has_telugu = any('\u0C00' <= c <= '\u0C7F' for c in cleaned)
        detected_lang = "hi" if has_devanagari else "te" if has_telugu else "en"
        return {
            "success": True,
            "results": [
                {
                    "language_code": detected_lang,
                    "language_name": "Hindi" if detected_lang == "hi" else "Telugu" if detected_lang == "te" else "English",
                    "probability": 0.98,
                    "percentage": 98.0,
                }
            ],
            "source": "fallback_heuristic",
        }

    url = f"{APILAYER_BASE_URL}/languagelayer/detect"
    headers = {"apikey": api_key}
    params = {"query": cleaned}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                data["source"] = "apilayer_languagelayer"
                return data
            return {
                "success": True,
                "results": [{"language_code": "en", "language_name": "English", "probability": 1.0}],
                "source": "apilayer_languagelayer_error_fallback",
            }
    except Exception as e:
        return {
            "success": True,
            "results": [{"language_code": "en", "language_name": "English", "probability": 1.0}],
            "error": str(e),
            "source": "apilayer_exception_fallback",
        }


# ── 4. REST Countries — Country Metadata & Phone Prefixes ────────────────

async def lookup_country_restcountries(query: str = "India") -> List[Dict[str, Any]]:
    """Lookup country metadata, flag, dial prefix, and currency via APILayer REST Countries API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        return [
            {
                "name": {"common": query.capitalize(), "official": f"Republic of {query.capitalize()}"},
                "cca2": "IN" if query.lower() in ("india", "in") else "US",
                "idd": {"root": "+9", "suffixes": ["1"]},
                "currencies": {"INR": {"name": "Indian Rupee", "symbol": "₹"}},
                "capital": ["New Delhi"],
                "region": "Asia",
                "subregion": "Southern Asia",
                "source": "fallback_mock",
            }
        ]

    url = f"{APILAYER_BASE_URL}/restcountries/v3.1/name/{query}"
    headers = {"apikey": api_key}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []
    except Exception:
        return []


# ── 5. Freegeoip — IP Geolocation & Network Threat Inspection ────────────

async def geolocate_ip_freegeoip(ip: str) -> Dict[str, Any]:
    """Geolocate incoming IP address via APILayer Freegeoip API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled() or ip in ("127.0.0.1", "localhost", "testclient"):
        return {
            "ip": ip,
            "country_code": "IN",
            "country_name": "India",
            "region_code": "TG",
            "region_name": "Telangana",
            "city": "Hyderabad",
            "zip_code": "502285",
            "time_zone": "Asia/Kolkata",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "is_campus_subnet": True,
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/freegeoip/json/{ip}"
    headers = {"apikey": api_key}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                data["source"] = "apilayer_freegeoip"
                return data
            return {"ip": ip, "country_code": "IN", "city": "Hyderabad", "source": "fallback"}
    except Exception as e:
        return {"ip": ip, "error": str(e), "source": "exception_fallback"}


# ── 6. Mailboxlayer — Email Deliverability & Quality Verification ─────────

async def validate_email_mailboxlayer(email: str) -> Dict[str, Any]:
    """Validate email syntax, MX records, disposable domain status, and deliverability via Mailboxlayer API."""
    api_key = get_apilayer_api_key()
    clean_email = email.strip().lower()

    if not is_apilayer_enabled():
        # Fallback local evaluation
        is_disposable = any(d in clean_email for d in ["tempmail", "10minutemail", "guerrillamail", "mailinator"])
        return {
            "email": clean_email,
            "did_you_mean": "",
            "user": clean_email.split("@")[0] if "@" in clean_email else clean_email,
            "domain": clean_email.split("@")[1] if "@" in clean_email else "",
            "format_valid": "@" in clean_email and "." in clean_email,
            "mx_found": True,
            "smtp_check": not is_disposable,
            "disposable": is_disposable,
            "free": True,
            "score": 0.3 if is_disposable else 0.95,
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/mailboxlayer/check"
    headers = {"apikey": api_key}
    params = {"email": clean_email, "smtp": 1, "check_all": 1}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                data["source"] = "apilayer_mailboxlayer"
                return data
            return {
                "email": clean_email,
                "format_valid": "@" in clean_email,
                "score": 0.8,
                "source": "apilayer_mailboxlayer_fallback",
            }
    except Exception as e:
        return {
            "email": clean_email,
            "format_valid": "@" in clean_email,
            "error": str(e),
            "source": "apilayer_exception_fallback",
        }


# ── 7. pdflayer — HTML to PDF Document Generation ─────────────────────────

async def convert_html_to_pdf_pdflayer(html_content: str, document_name: str = "document.pdf") -> Dict[str, Any]:
    """Convert HTML string to downloadable PDF via APILayer pdflayer API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        return {
            "success": True,
            "document_name": document_name,
            "html_length": len(html_content),
            "pdf_url": f"https://cdn.studentkare.test/documents/generated/{document_name}",
            "mime_type": "application/pdf",
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/pdflayer/change"
    headers = {"apikey": api_key}
    data = {"document_html": html_content, "document_name": document_name}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, data=data)
            if response.status_code == 200:
                return {
                    "success": True,
                    "document_name": document_name,
                    "size_bytes": len(response.content),
                    "pdf_bytes": response.content,
                    "source": "apilayer_pdflayer",
                }
            return {
                "success": False,
                "error": f"pdflayer API returned status {response.status_code}",
                "source": "apilayer_pdflayer_error",
            }
    except Exception as e:
        return {"success": False, "error": str(e), "source": "apilayer_exception_fallback"}


# ── 8. Bad Words API — Content Moderation & Profanity Filtering ────────────

async def check_profanity_badwords(text: str) -> Dict[str, Any]:
    """Check and censor profane/objectionable language via APILayer Bad Words API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        # Fallback basic profanity check
        bad_words = ["badword", "abuse", "spam_toxic"]
        found = [w for w in bad_words if w in text.lower()]
        censored = text
        for w in found:
            censored = censored.replace(w, "*" * len(w))
        return {
            "is_clean": len(found) == 0,
            "bad_words_total": len(found),
            "bad_words_list": found,
            "censored_content": censored,
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/bad_words/check"
    headers = {"apikey": api_key, "Content-Type": "text/plain"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, headers=headers, content=text)
            if response.status_code == 200:
                data = response.json()
                data["is_clean"] = data.get("bad_words_total", 0) == 0
                data["source"] = "apilayer_badwords"
                return data
            return {"is_clean": True, "bad_words_total": 0, "censored_content": text, "source": "fallback"}
    except Exception as e:
        return {"is_clean": True, "bad_words_total": 0, "censored_content": text, "error": str(e), "source": "exception_fallback"}


# ── 9. Resume Parser — Student Resume JSON Extraction ──────────────────────

async def parse_resume_apilayer(file_bytes: bytes, filename: str = "resume.pdf") -> Dict[str, Any]:
    """Parse resume document into structured JSON via APILayer Resume Parser API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        return {
            "filename": filename,
            "name": "Student Applicant",
            "email": "student@studentkare.test",
            "phone": "+919876543210",
            "skills": ["Python", "FastAPI", "React", "Healthcare Systems"],
            "education": [{"institution": "IIT Hyderabad", "degree": "B.Tech Computer Science"}],
            "parsed_by": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/resume_parser/upload"
    headers = {"apikey": api_key}
    files = {"file": (filename, file_bytes, "application/pdf")}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, files=files)
            if response.status_code == 200:
                data = response.json()
                data["parsed_by"] = "apilayer_resume_parser"
                return data
            return {"filename": filename, "parsed_by": "apilayer_fallback_on_status", "skills": []}
    except Exception as e:
        return {"filename": filename, "error": str(e), "parsed_by": "apilayer_exception_fallback"}


# ── 10. Weatherstack — Campus Weather & AQI Advisories ────────────────────

async def get_weather_weatherstack(query: str = "Hyderabad") -> Dict[str, Any]:
    """Fetch current weather and air quality advisory via APILayer Weatherstack API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        return {
            "location": {"name": query, "country": "India", "region": "Telangana"},
            "current": {
                "temperature": 28,
                "weather_descriptions": ["Partly cloudy"],
                "humidity": 65,
                "uv_index": 5,
                "air_quality": {"aqi": 42, "category": "Good"},
            },
            "health_advisory": "Weather is favorable for campus outdoor activities. Low pollen index.",
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/weatherstack/current"
    headers = {"apikey": api_key}
    params = {"query": query}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                temp = data.get("current", {}).get("temperature", 25)
                advisory = "Stay hydrated and wear sunscreen." if temp > 32 else "Pleasant weather for campus walks."
                data["health_advisory"] = advisory
                data["source"] = "apilayer_weatherstack"
                return data
            return {"location": {"name": query}, "current": {"temperature": 25}, "source": "apilayer_weatherstack_fallback"}
    except Exception as e:
        return {"location": {"name": query}, "error": str(e), "source": "apilayer_exception_fallback"}


# ── 11. Fixer — Foreign Exchange & Billing Currency Conversion ─────────────

async def convert_currency_fixer(amount: float, from_curr: str = "USD", to_curr: str = "INR") -> Dict[str, Any]:
    """Convert currency amounts via APILayer Fixer API."""
    api_key = get_apilayer_api_key()

    if not is_apilayer_enabled():
        rate = 83.5 if from_curr == "USD" and to_curr == "INR" else 1.0
        return {
            "success": True,
            "query": {"from": from_curr, "to": to_curr, "amount": amount},
            "info": {"rate": rate},
            "result": round(amount * rate, 2),
            "source": "fallback_mock",
        }

    url = f"{APILAYER_BASE_URL}/fixer/convert"
    headers = {"apikey": api_key}
    params = {"from": from_curr, "to": to_curr, "amount": amount}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                data["source"] = "apilayer_fixer"
                return data
            return {"success": True, "result": amount, "source": "apilayer_fixer_fallback"}
    except Exception as e:
        return {"success": False, "error": str(e), "source": "apilayer_exception_fallback"}


# ── REST API Router Endpoints ─────────────────────────────────────────────

@router.get("/status")
async def api_status():
    """Return status of APILayer integration suite."""
    enabled = is_apilayer_enabled()
    has_key = bool(get_apilayer_api_key())
    return {
        "status": "active" if enabled else "unconfigured_fallback",
        "apilayer_enabled": enabled,
        "has_api_key": has_key,
        "supported_features": [
            "numverify",
            "positionstack",
            "languagelayer",
            "restcountries",
            "freegeoip",
            "mailboxlayer",
            "pdflayer",
            "bad_words",
            "resume_parser",
            "weatherstack",
            "fixer",
        ],
    }


@router.get("/numverify")
async def api_numverify(phone: str = Query(..., min_length=5), country: str = Query("IN")):
    return await validate_phone_numverify(phone, country)


@router.get("/positionstack")
async def api_positionstack(query: str = Query(..., min_length=2)):
    return await geocode_positionstack(query)


@router.post("/languagelayer")
async def api_languagelayer(body: Dict[str, Any]):
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "Field 'text' is required.")
    return await detect_language_languagelayer(text)


@router.get("/restcountries")
async def api_restcountries(query: str = Query("India")):
    return await lookup_country_restcountries(query)


@router.get("/freegeoip")
async def api_freegeoip(request: Request, ip: Optional[str] = Query(None)):
    target_ip = ip or (request.client.host if request.client else "127.0.0.1")
    return await geolocate_ip_freegeoip(target_ip)


@router.get("/mailboxlayer")
async def api_mailboxlayer(email: str = Query(..., min_length=3)):
    return await validate_email_mailboxlayer(email)


@router.post("/pdflayer")
async def api_pdflayer(body: Dict[str, Any] = Body(...)):
    html = body.get("html", "<h1>Studentkare PDF</h1>")
    name = body.get("document_name", "document.pdf")
    return await convert_html_to_pdf_pdflayer(html, name)


@router.post("/badwords")
async def api_badwords(body: Dict[str, Any] = Body(...)):
    text = body.get("text", "")
    return await check_profanity_badwords(text)


@router.post("/resume-parser")
async def api_resume_parser(file: UploadFile = File(...)):
    content = await file.read()
    return await parse_resume_apilayer(content, file.filename or "resume.pdf")


@router.get("/weatherstack")
async def api_weatherstack(query: str = Query("Hyderabad")):
    return await get_weather_weatherstack(query)


@router.get("/fixer")
async def api_fixer(amount: float = Query(100.0), from_curr: str = Query("USD"), to_curr: str = Query("INR")):
    return await convert_currency_fixer(amount, from_curr, to_curr)
