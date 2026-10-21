"""
Unit tests for the remaining backlog features (F087, F021).
F094 (device step sync) now persists to care_readings: see test_honest_data.py.
F085 (pharmacist Rx review) now runs on durable dispenses: see test_clinical_fulfilment.py.
"""
import pytest

from services import payment_gateway


def test_f087_payment_gateway_never_pretends(monkeypatch):
    # Razorpay without keys is not a provider: nothing can be charged through it.
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    with pytest.raises(payment_gateway.ProviderUnavailable):
        payment_gateway.get_provider(None, "razorpay")

    # Webhook signatures fail closed without a configured secret, and verify with one.
    import hashlib
    import hmac
    import json
    mock = payment_gateway.MockProvider(db=None)
    body = json.dumps({"event": "payment.settled"}).encode()
    monkeypatch.delenv("PAYMENT_WEBHOOK_SECRET", raising=False)
    forged = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    with pytest.raises(payment_gateway.WebhookRejected):
        mock.parse_webhook(body, {"x-webhook-signature": forged})
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "configured-secret")
    good = hmac.new(b"configured-secret", body, hashlib.sha256).hexdigest()
    assert mock.parse_webhook(body, {"x-webhook-signature": good}).kind == "captured"
    with pytest.raises(payment_gateway.WebhookRejected):
        mock.parse_webhook(body, {"x-webhook-signature": "invalid_sig"})
