"""The one Razorpay client: credentials, REST calls and HMAC signature checks.

Shared by membership billing (services/billing.py: subscriptions) and order
payments (services/payment_gateway.py: one-off orders and refunds), so there is
one place that reads the keys and one implementation of each signature check.

Every check fails closed: with no secret configured, no signature verifies.
"""
from __future__ import annotations

import hashlib
import hmac
import os

import httpx
from fastapi import HTTPException

DEFAULT_BASE_URL = "https://api.razorpay.com/v1"


def key_id() -> str:
    return os.getenv("RAZORPAY_KEY_ID", "")


def configured() -> bool:
    """Both API keys are set. Nothing here proves they are valid; a call does."""
    return bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))


def webhook_secret() -> str:
    return os.getenv("RAZORPAY_WEBHOOK_SECRET", "")


def request(method: str, path: str, body: dict | None = None, params: dict | None = None) -> dict:
    """Thin httpx adapter over the Razorpay REST API. Overridable in tests.

    A provider refusal or outage is a 502 with fixed copy: Razorpay's own error
    text can echo request fields, so it is never passed on.
    """
    base = os.getenv("RAZORPAY_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    response = httpx.request(
        method, f"{base}{path}", json=body, params=params,
        auth=(key_id(), os.getenv("RAZORPAY_KEY_SECRET", "")), timeout=20.0,
    )
    if response.status_code >= 400:
        raise HTTPException(502, "The payment provider could not complete the request.")
    return response.json()


def _hmac_matches(secret: str, message: bytes, signature: str) -> bool:
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook(raw: bytes, signature: str) -> bool:
    """X-Razorpay-Signature: HMAC-SHA256 of the raw body with the webhook secret."""
    return _hmac_matches(webhook_secret(), raw, signature or "")


def verify_signature(message: str, signature: str) -> bool:
    """Checkout callback signature: HMAC-SHA256 of ``message`` with the key secret.

    Orders sign ``"{order_id}|{payment_id}"``; subscriptions sign
    ``"{payment_id}|{subscription_id}"``. The caller builds the message.
    """
    return _hmac_matches(os.getenv("RAZORPAY_KEY_SECRET", ""), message.encode(), signature or "")
