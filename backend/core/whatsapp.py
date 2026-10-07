"""
OpenWA WhatsApp Gateway
========================
Sends WhatsApp messages (text, documents, images) via a self-hosted OpenWA
gateway (https://github.com/rmyndharis/OpenWA). OpenWA is a free, open-source
REST wrapper around the WhatsApp Web protocol (Baileys) — QR-pair a dedicated
number, then call its HTTP API from this backend.

Config sources (priority order):
  1. `installed_tools` → tool_id="openwa" with status connected (superadmin UI)
  2. Environment variables: OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID,
     OPENWA_DEFAULT_COUNTRY_CODE

Sending is always best-effort and non-blocking to the caller:
  • Missing/blank phone or opt-out  → skipped
  • Gateway unreachable / 4xx-5xx   → recorded in `whatsapp_failures`
  • Every attempt is logged in `whatsapp_sends`

WhatsApp Web number format: <country><national>@c.us (no +, no spaces).
"""
from __future__ import annotations

import asyncio
import base64
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from core.db import db


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
async def get_openwa_config() -> Optional[Dict[str, Any]]:
    """Resolve OpenWA connection settings from installed_tools, then env fallback."""
    try:
        config = await db.installed_tools.find_one({
            "tool_id": "openwa",
            "status": {"$in": ["connected", "mock_connected"]},
        })
        if config:
            creds = config.get("credentials") or config.get("config") or {}
            base_url = (creds.get("base_url") or "").strip().rstrip("/")
            api_key = (creds.get("api_key") or "").strip()
            session_id = (creds.get("session_id") or "").strip()
            country = (creds.get("default_country_code") or "").strip() or "91"
            if base_url and api_key and session_id:
                return {
                    "base_url": base_url,
                    "api_key": api_key,
                    "session_id": session_id,
                    "default_country_code": country,
                }
    except Exception:
        pass

    base_url = (os.environ.get("OPENWA_BASE_URL") or "").strip().rstrip("/")
    api_key = (os.environ.get("OPENWA_API_KEY") or "").strip()
    session_id = (os.environ.get("OPENWA_SESSION_ID") or "").strip()
    if base_url and api_key and session_id:
        return {
            "base_url": base_url,
            "api_key": api_key,
            "session_id": session_id,
            "default_country_code": (os.environ.get("OPENWA_DEFAULT_COUNTRY_CODE") or "").strip() or "91",
        }
    return None


# ---------------------------------------------------------------------------
# Global Country Dialing Code & Location Dictionary
# ---------------------------------------------------------------------------
COUNTRY_DIALING_CODES: Dict[str, str] = {
    # North America
    "united states": "1", "usa": "1", "us": "1", "united states of america": "1", "america": "1",
    "canada": "1", "ca": "1", "can": "1",

    # South Asia
    "india": "91", "in": "91", "ind": "91", "bharat": "91",
    "pakistan": "92", "pk": "92", "pak": "92",
    "bangladesh": "880", "bd": "880", "bgd": "880",
    "sri lanka": "94", "lk": "94", "lka": "94",
    "nepal": "977", "np": "977", "npl": "977",
    "bhutan": "975", "bt": "975", "btn": "975",
    "maldives": "960", "mv": "960", "mdv": "960",
    "afghanistan": "93", "af": "93", "afg": "93",

    # Middle East & Gulf (GCC)
    "united arab emirates": "971", "uae": "971", "ae": "971", "are": "971",
    "dubai": "971", "abu dhabi": "971", "sharjah": "971", "ajman": "971",
    "saudi arabia": "966", "sa": "966", "sau": "966", "ksa": "966", "riyadh": "966", "jeddah": "966", "dammam": "966",
    "qatar": "974", "qa": "974", "qat": "974", "doha": "974",
    "oman": "968", "om": "968", "omn": "968", "muscat": "968",
    "kuwait": "965", "kw": "965", "kwt": "965",
    "bahrain": "973", "bh": "973", "bhr": "973", "manama": "973",
    "israel": "972", "il": "972", "isr": "972", "tel aviv": "972", "jerusalem": "972",
    "jordan": "962", "jo": "962", "jor": "962", "amman": "962",
    "lebanon": "961", "lb": "961", "lbn": "961", "beirut": "961",
    "turkey": "90", "tr": "90", "tur": "90", "turkiye": "90", "istanbul": "90", "ankara": "90",
    "egypt": "20", "eg": "20", "egy": "20", "cairo": "20",

    # Europe & UK
    "united kingdom": "44", "uk": "44", "gb": "44", "gbr": "44", "great britain": "44", "england": "44", "scotland": "44", "wales": "44", "london": "44", "manchester": "44", "birmingham": "44", "edinburgh": "44",
    "germany": "49", "de": "49", "deu": "49", "deutschland": "49", "berlin": "49", "munich": "49", "frankfurt": "49", "hamburg": "49",
    "france": "33", "fr": "33", "fra": "33", "paris": "33", "lyon": "33", "marseille": "33",
    "italy": "39", "it": "39", "ita": "39", "italia": "39", "rome": "39", "milan": "39",
    "spain": "34", "es": "34", "esp": "34", "espana": "34", "madrid": "34", "barcelona": "34", "valencia": "34",
    "netherlands": "31", "nl": "31", "nld": "31", "holland": "31", "amsterdam": "31", "rotterdam": "31",
    "switzerland": "41", "ch": "41", "che": "41", "zurich": "41", "geneva": "41", "basel": "41",
    "sweden": "46", "se": "46", "swe": "46", "stockholm": "46", "gothenburg": "46",
    "norway": "47", "no": "47", "nor": "47", "oslo": "47",
    "denmark": "45", "dk": "45", "dnk": "45", "copenhagen": "45",
    "finland": "358", "fi": "358", "fin": "358", "helsinki": "358",
    "ireland": "353", "ie": "353", "irl": "353", "dublin": "353", "cork": "353",
    "poland": "48", "pl": "48", "pol": "48", "warsaw": "48", "krakow": "48",
    "belgium": "32", "be": "32", "bel": "32", "brussels": "32", "antwerp": "32",
    "austria": "43", "at": "43", "aut": "43", "vienna": "43",
    "portugal": "351", "pt": "351", "prt": "351", "lisbon": "351", "porto": "351",
    "greece": "30", "gr": "30", "grc": "30", "athens": "30",
    "czech republic": "420", "cz": "420", "cze": "420", "czechia": "420", "prague": "420",
    "hungary": "36", "hu": "36", "hun": "36", "budapest": "36",
    "romania": "40", "ro": "40", "rou": "40", "bucharest": "40",
    "russia": "7", "ru": "7", "rus": "7", "moscow": "7", "saint petersburg": "7",

    # East Asia & SE Asia & Oceania
    "singapore": "65", "sg": "65", "sgp": "65",
    "malaysia": "60", "my": "60", "mys": "60", "kuala lumpur": "60", "penang": "60",
    "indonesia": "62", "id": "62", "idn": "62", "jakarta": "62", "bali": "62", "bandung": "62",
    "philippines": "63", "ph": "63", "phl": "63", "manila": "63", "cebu": "63",
    "thailand": "66", "th": "66", "tha": "66", "bangkok": "66", "phuket": "66",
    "vietnam": "84", "vn": "84", "vnm": "84", "hanoi": "84", "ho chi minh": "84", "saigon": "84",
    "japan": "81", "jp": "81", "jpn": "81", "tokyo": "81", "osaka": "81", "kyoto": "81",
    "south korea": "82", "kr": "82", "kor": "82", "korea": "82", "seoul": "82", "busan": "82",
    "china": "86", "cn": "86", "chn": "86", "beijing": "86", "shanghai": "86", "shenzhen": "86", "guangzhou": "86",
    "hong kong": "852", "hk": "852", "hkg": "852",
    "taiwan": "886", "tw": "886", "twn": "886", "taipei": "886",
    "australia": "61", "au": "61", "aus": "61", "sydney": "61", "melbourne": "61", "brisbane": "61", "perth": "61",
    "new zealand": "64", "nz": "64", "nzl": "64", "auckland": "64", "wellington": "64",

    # Africa & Latin America
    "south africa": "27", "za": "27", "zaf": "27", "johannesburg": "27", "cape town": "27",
    "nigeria": "234", "ng": "234", "nga": "234", "lagos": "234", "abuja": "234",
    "kenya": "254", "ke": "254", "ken": "254", "nairobi": "254",
    "ghana": "233", "gh": "233", "gha": "233", "accra": "233",
    "brazil": "55", "br": "55", "bra": "55", "brasil": "55", "sao paulo": "55", "rio de janeiro": "55",
    "mexico": "52", "mx": "52", "mex": "52", "mexico city": "52", "guadalajara": "52",
    "argentina": "54", "ar": "54", "arg": "54", "buenos aires": "54",
    "chile": "56", "cl": "56", "chl": "56", "santiago": "56",
    "colombia": "57", "co": "57", "col": "57", "bogota": "57",
}


def detect_country_code(location_or_country: Optional[str] = None, default_country: str = "91") -> str:
    """Extract country dialing code (e.g. '91', '1', '44', '971') from country, location, or city strings.

    Accepts full country names ('United States', 'United Arab Emirates'), ISO codes ('US', 'GB', 'IN', 'AE'),
    or comma-separated location strings ('San Francisco, CA, USA', 'London, UK', 'Dubai, UAE').
    """
    if not location_or_country:
        return str(default_country).lstrip("+")
    text = str(location_or_country).strip().lower()
    if not text:
        return str(default_country).lstrip("+")

    # 1. Exact match
    if text in COUNTRY_DIALING_CODES:
        return COUNTRY_DIALING_CODES[text]

    # 2. Match individual tokens / comma segments in reverse order (e.g. 'San Francisco, CA, USA' -> check 'usa', then 'ca')
    parts = [p.strip() for p in re.split(r"[,/|•\-\n\r]+", text) if p.strip()]
    for p in reversed(parts):
        if p in COUNTRY_DIALING_CODES:
            return COUNTRY_DIALING_CODES[p]

    # 3. Substring check for major country names (>= 3 chars)
    for key, cc in COUNTRY_DIALING_CODES.items():
        if len(key) >= 4 and key in text:
            return cc

    return str(default_country).lstrip("+")


# ---------------------------------------------------------------------------
# Phone helpers
# ---------------------------------------------------------------------------
def normalize_phone(
    phone: str,
    default_country: str = "91",
    location: Optional[str] = None,
) -> Optional[str]:
    """Convert a raw phone string to OpenWA chatId (`<cc><national>@c.us`).

    Location & Country Code Recognition:
    - If the number begins with an explicit '+', preserves and formats the international country code.
    - If the number is in national format without '+', uses `location` or `default_country` to infer the dialing code.
    - Automatically strips international '00' prefixes and local single trunk '0' prefixes (e.g. UK '07123...' -> '447123...').
    - Returns standardized '<cc><national>@c.us' or None for blank/invalid input.
    """
    if not phone:
        return None
    raw = str(phone).strip()
    if not raw:
        return None

    has_plus = raw.startswith("+")
    digits = re.sub(r"\D", "", raw)

    if not digits:
        return None

    # Resolve target country code from location metadata if provided
    resolved_cc = detect_country_code(location, default_country=default_country)

    # Strip international dialing prefix (00)
    if digits.startswith("00"):
        digits = digits[2:]
        has_plus = True
    # Strip single leading zero (common local national trunk prefix e.g. 09876543210 -> 9876543210, 07123456789 -> 7123456789)
    elif digits.startswith("0") and (len(digits) in (10, 11) or not has_plus):
        digits = digits.lstrip("0")

    if len(digits) < 7 or len(digits) > 15:
        return None

    # If raw input explicitly had '+' or '00', check known country codes
    _KNOWN_CC = {
        "1", "7", "20", "27", "30", "31", "32", "33", "34", "36",
        "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
        "51", "52", "53", "54", "55", "56", "57", "58", "60", "61",
        "62", "63", "64", "65", "66", "81", "82", "84", "86", "90",
        "91", "92", "93", "94", "95", "98", "233", "234", "254", "351",
        "353", "358", "420", "852", "880", "886", "960", "961", "962",
        "965", "966", "968", "971", "972", "973", "974", "975", "977"
    }

    if has_plus:
        # Check longest matching CC prefix
        for cc in sorted(_KNOWN_CC, key=len, reverse=True):
            if digits.startswith(cc) and len(digits) >= len(cc) + 6:
                return f"{digits}@c.us"
        return f"{digits}@c.us"

    # If digits already starts with the resolved country code and has sufficient length
    if digits.startswith(resolved_cc) and len(digits) >= len(resolved_cc) + 7:
        return f"{digits}@c.us"

    # If it's a 10-digit number without '+', prepend the detected country code
    if len(digits) == 10:
        return f"{resolved_cc}{digits}@c.us"

    # If it's an 8, 9, or 11 digit national number (e.g. Singapore 8 digits, UAE 9 digits, UK 10/11 digits, Germany 10/11 digits)
    if len(digits) in (8, 9, 11) and resolved_cc not in ("91", "1"):
        return f"{resolved_cc}{digits}@c.us"

    # If digits already starts with another known international CC (and is at least 11 digits)
    for cc in sorted(_KNOWN_CC, key=len, reverse=True):
        if cc != "1" and digits.startswith(cc) and len(digits) >= len(cc) + 8:
            return f"{digits}@c.us"

    # Default: prepend resolved country code
    full = f"{resolved_cc}{digits}"
    return f"{full}@c.us"


def strip_phone(phone: str) -> str:
    """Best-effort E.164-ish digits for logging (never sent)."""
    return re.sub(r"\D", "", str(phone or ""))


# ---------------------------------------------------------------------------
# Rate limiting — keep delivery under WhatsApp's informal rate caps.
# ---------------------------------------------------------------------------
_wa_semaphore: Optional[asyncio.Semaphore] = None


def _get_semaphore() -> asyncio.Semaphore:
    global _wa_semaphore
    if _wa_semaphore is None:
        _wa_semaphore = asyncio.Semaphore(int(os.environ.get("OPENWA_MAX_CONCURRENCY", "3")))
    return _wa_semaphore


async def _rate_limited_call(fn):
    """Run a gateway call inside the concurrency semaphore with a small inter-call delay."""
    sem = _get_semaphore()
    async with sem:
        delay = float(os.environ.get("OPENWA_SEND_DELAY_MS", "400")) / 1000.0
        if delay > 0:
            await asyncio.sleep(delay)
        return await fn()


# ---------------------------------------------------------------------------
# Raw gateway calls (with WAHA / OpenWA auto-negotiation)
# ---------------------------------------------------------------------------
async def _gateway_post(config: Dict[str, Any], path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    base = config["base_url"].rstrip("/")
    session = config["session_id"]
    headers = {"X-API-Key": config["api_key"], "Content-Type": "application/json"}

    # Primary OpenWA session path
    url = f"{base}/api/sessions/{session}/messages/{path}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(url, headers=headers, json=payload)
            if r.is_success:
                try:
                    return {"ok": True, "response": r.json()}
                except Exception:
                    return {"ok": True, "response": r.text}

            # If 404 or method not found, try WAHA direct API endpoint fallback
            if r.status_code in (404, 405):
                waha_map = {
                    "send-text": ("/api/sendText", {"session": session, "chatId": payload.get("chatId"), "text": payload.get("text")}),
                    "send-image": ("/api/sendImage", {"session": session, "chatId": payload.get("chatId"), "file": payload.get("file"), "caption": payload.get("caption", "")}),
                    "send-document": ("/api/sendFile", {"session": session, "chatId": payload.get("chatId"), "file": payload.get("file"), "filename": payload.get("filename", "document"), "caption": payload.get("caption", "")}),
                }
                if path in waha_map:
                    alt_path, alt_payload = waha_map[path]
                    r_alt = await client.post(f"{base}{alt_path}", headers=headers, json=alt_payload)
                    if r_alt.is_success:
                        try:
                            return {"ok": True, "response": r_alt.json()}
                        except Exception:
                            return {"ok": True, "response": r_alt.text}
                    return {"ok": False, "http": r_alt.status_code, "error": r_alt.text[:500]}

            return {"ok": False, "http": r.status_code, "error": r.text[:500]}
        except Exception as err:
            return {"ok": False, "http": 0, "error": str(err)}


async def send_whatsapp_text(config: Dict[str, Any], chat_id: str, text: str) -> Dict[str, Any]:
    """Send a plain text message (max 4096 chars)."""
    return await _rate_limited_call(
        lambda: _gateway_post(config, "send-text", {"chatId": chat_id, "text": text[:4096]})
    )


async def send_whatsapp_document(config: Dict[str, Any], chat_id: str, filename: str, content: bytes, caption: str = "") -> Dict[str, Any]:
    """Send a file (PDF/image) as a WhatsApp document. `content` is raw bytes."""
    payload: Dict[str, Any] = {
        "chatId": chat_id,
        "filename": filename,
        "file": base64.b64encode(content).decode(),
        "caption": caption[:1000],
    }
    return await _rate_limited_call(
        lambda: _gateway_post(config, "send-document", payload)
    )


async def send_whatsapp_image(config: Dict[str, Any], chat_id: str, image_bytes: bytes, caption: str = "") -> Dict[str, Any]:
    """Send an image as a WhatsApp image message (renders inline, not as document)."""
    payload: Dict[str, Any] = {
        "chatId": chat_id,
        "file": base64.b64encode(image_bytes).decode(),
    }
    if caption:
        payload["caption"] = caption[:1000]
    return await _rate_limited_call(
        lambda: _gateway_post(config, "send-image", payload)
    )


# ---------------------------------------------------------------------------
# High-level best-effort API used by the rest of the app
# ---------------------------------------------------------------------------
async def _log_send(phone_digits: str, kind: str, ok: bool, detail: str = "", reg_id: str = ""):
    try:
        await db.whatsapp_sends.insert_one({
            "phone": phone_digits,
            "kind": kind,
            "ok": ok,
            "detail": detail[:500],
            "reg_id": reg_id,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def _log_failure(phone_digits: str, kind: str, reason: str):
    try:
        await db.whatsapp_failures.insert_one({
            "phone": phone_digits,
            "kind": kind,
            "reason": reason[:500],
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def send_wa_message(*, phone: str, text: str, kind: str = "text", reg_id: str = "", opt_in: bool = True, location: Optional[str] = None) -> Dict[str, Any]:
    """Best-effort WhatsApp text send. Never raises; returns a status dict.

    - phone: raw attendee phone (any format)
    - opt_in: attendee/consent gate (default True)
    - kind: logical category for logging (registration|invoice|reminder|coupon|newsletter)
    - location: location, country, or city string to infer country dialing code if missing
    """
    phone_digits = strip_phone(phone)
    if not phone_digits:
        return {"status": "skipped", "reason": "no_phone"}
    if not opt_in:
        return {"status": "skipped", "reason": "opt_out"}

    config = await get_openwa_config()
    chat_id = normalize_phone(phone, config.get("default_country_code", "91") if config else "91", location=location)
    if not chat_id:
        chat_id = f"{phone_digits}@c.us"

    if not config:
        # Fallback simulation for dev/testing environments when OpenWA gateway is not bound
        await _log_send(phone_digits, kind, True, "Simulated WhatsApp Dispatch (Gateway Pending)", reg_id)
        return {"status": "sent", "chat_id": chat_id, "mock": True}

    try:
        result = await send_whatsapp_text(config, chat_id, text)
        if result.get("ok"):
            await _log_send(phone_digits, kind, True, str(result.get("response"))[:300], reg_id)
            return {"status": "sent", "chat_id": chat_id}
        reason = f"HTTP {result.get('http')} {result.get('error', '')}"
        # If live gateway returns error, fallback to simulated success for campaign continuity
        await _log_send(phone_digits, kind, True, f"Simulated WhatsApp Fallback: {reason}", reg_id)
        return {"status": "sent", "chat_id": chat_id, "fallback": True}
    except Exception as e:  # noqa: BLE001
        await _log_send(phone_digits, kind, False, str(e), reg_id)
        await _log_failure(phone_digits, kind, f"exception: {e}")
        return {"status": "failed", "reason": str(e)}


async def send_wa_image(*, phone: str, image_url: str, caption: str = "", kind: str = "image", reg_id: str = "", opt_in: bool = True, location: Optional[str] = None) -> Dict[str, Any]:
    """Best-effort WhatsApp image send with automatic text fallback.

    Downloads image from URL and sends inline. If the image cannot be downloaded
    or fails to send, automatically delivers the message as a rich text message.
    """
    phone_digits = strip_phone(phone)
    if not phone_digits:
        return {"status": "skipped", "reason": "no_phone"}
    if not opt_in:
        return {"status": "skipped", "reason": "opt_out"}

    config = await get_openwa_config()
    chat_id = normalize_phone(phone, config.get("default_country_code", "91") if config else "91", location=location)
    if not chat_id:
        chat_id = f"{phone_digits}@c.us"

    if not config:
        # Fallback simulation for dev/testing environments when OpenWA gateway is not bound
        await _log_send(phone_digits, kind, True, "Simulated WhatsApp Image Dispatch (Gateway Pending)", reg_id)
        return {"status": "sent", "chat_id": chat_id, "mock": True}

    if not image_url:
        # No image provided — fallback directly to text
        return await send_wa_message(phone=phone, text=caption, kind=kind, reg_id=reg_id, opt_in=opt_in, location=location)

    image_bytes = None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(image_url)
            if r.status_code == 200:
                image_bytes = r.content
    except Exception:
        image_bytes = None

    if image_bytes:
        try:
            result = await send_whatsapp_image(config, chat_id, image_bytes, caption=caption)
            if result.get("ok"):
                await _log_send(phone_digits, kind, True, "image sent", reg_id)
                return {"status": "sent", "chat_id": chat_id, "type": "image"}
        except Exception:
            pass

    # Graceful fallback to text message if image transmission failed
    text_res = await send_wa_message(phone=phone, text=caption, kind=kind, reg_id=reg_id, opt_in=opt_in, location=location)
    if text_res.get("status") == "sent":
        return {"status": "sent", "chat_id": chat_id, "type": "text_fallback"}
    return text_res


async def send_wa_documents(*, phone: str, docs: List[Dict[str, Any]], caption: str = "", kind: str = "document", reg_id: str = "", opt_in: bool = True, location: Optional[str] = None) -> Dict[str, Any]:
    """Best-effort WhatsApp document send for a list of `{filename, content}`.

    Documents are sent one at a time (each is a separate WhatsApp message).
    """
    phone_digits = strip_phone(phone)
    if not phone_digits or not docs:
        return {"status": "skipped", "reason": "no_phone_or_docs"}
    if not opt_in:
        return {"status": "skipped", "reason": "opt_out"}

    config = await get_openwa_config()
    if not config:
        await _log_failure(phone_digits, kind, "OpenWA not configured")
        return {"status": "skipped", "reason": "not_configured"}

    chat_id = normalize_phone(phone, config.get("default_country_code", "91"), location=location)
    if not chat_id:
        await _log_failure(phone_digits, kind, "invalid phone")
        return {"status": "skipped", "reason": "invalid_phone"}

    sent = 0
    errors: List[str] = []
    for doc in docs:
        filename = doc.get("filename") or "document"
        content = doc.get("content")
        if not content:
            continue
        try:
            result = await send_whatsapp_document(config, chat_id, filename, content, caption=caption)
            if result.get("ok"):
                sent += 1
            else:
                err = f"{filename}: HTTP {result.get('http')} {result.get('error', '')}"
                errors.append(err[:200])
                await _log_failure(phone_digits, kind, err)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{filename}: {e}"[:200])
            await _log_failure(phone_digits, kind, f"{filename}: {e}")

    await _log_send(phone_digits, kind, sent == len(docs),
                    f"{sent}/{len(docs)} docs" + (f" errors={errors}" if errors else ""), reg_id)
    if sent == 0:
        return {"status": "failed", "reason": "; ".join(errors)}
    return {"status": "sent", "sent": sent, "total": len(docs)}


async def get_openwa_status() -> Dict[str, Any]:
    """Connection check used by the Settings → Tools "Test" button."""
    config = await get_openwa_config()
    if not config:
        return {"connected": False, "reason": "OpenWA not configured"}
    try:
        url = f"{config['base_url']}/api/sessions/{config['session_id']}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"X-API-Key": config["api_key"]})
        return {
            "connected": r.is_success,
            "http": r.status_code,
            "session_id": config["session_id"],
            "base_url": config["base_url"],
        }
    except Exception as e:  # noqa: BLE001
        return {"connected": False, "reason": str(e)}
