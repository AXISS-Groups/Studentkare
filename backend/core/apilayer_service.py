"""
Studentkare — APILayer Core Service Layer Singleton
Provides clean Python interface for APILayer Data Products:
- Phone Validation (Numverify)
- Geocoding (Positionstack)
- Language Detection (Languagelayer)
- Email Validation & Scoring (Mailboxlayer)
- PDF Export Generation (pdflayer)
- Profanity Moderation (Bad Words API)
- Resume Document Parsing (Resume Parser)
- Weather & AQI Advisories (Weatherstack)
- Currency Conversion (Fixer)
"""
from typing import Any, Dict

import services.apilayer as _apilayer_backend


class APILayerService:
    """Unified APILayer integration interface with honest fallback handling."""

    @staticmethod
    def is_enabled() -> bool:
        return _apilayer_backend.is_apilayer_enabled()

    @staticmethod
    async def validate_phone(phone_number: str, country_code: str = "IN") -> Dict[str, Any]:
        return await _apilayer_backend.validate_phone_numverify(phone_number, country_code)

    @staticmethod
    async def validate_email(email: str) -> Dict[str, Any]:
        return await _apilayer_backend.validate_email_mailboxlayer(email)

    @staticmethod
    async def geocode(address: str) -> Dict[str, Any]:
        return await _apilayer_backend.geocode_positionstack(address)

    @staticmethod
    async def detect_language(text: str) -> Dict[str, Any]:
        return await _apilayer_backend.detect_language_languagelayer(text)

    @staticmethod
    async def generate_pdf(html: str, filename: str = "document.pdf") -> Dict[str, Any]:
        return await _apilayer_backend.convert_html_to_pdf_pdflayer(html, filename)

    @staticmethod
    async def check_profanity(text: str) -> Dict[str, Any]:
        return await _apilayer_backend.check_profanity_badwords(text)

    @staticmethod
    async def parse_resume(file_bytes: bytes, filename: str = "resume.pdf") -> Dict[str, Any]:
        return await _apilayer_backend.parse_resume_apilayer(file_bytes, filename)

    @staticmethod
    async def get_weather_advisory(location: str = "Hyderabad") -> Dict[str, Any]:
        return await _apilayer_backend.get_weather_weatherstack(location)

    @staticmethod
    async def convert_currency(amount: float, from_curr: str = "USD", to_curr: str = "INR") -> Dict[str, Any]:
        return await _apilayer_backend.convert_currency_fixer(amount, from_curr, to_curr)


apilayer_service = APILayerService()
