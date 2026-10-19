"""
Unit tests for the remaining backlog features (F087, F021, F094).
F085 (pharmacist Rx review) now runs on durable dispenses: see test_clinical_fulfilment.py.
"""
import pytest

from services import payment_gateway
from services.movement_sync import HealthSyncPayload, movement_sync_service


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




def test_f094_background_health_sync_ingestion():
    payload = HealthSyncPayload(
        provider="healthkit",
        device_model="Apple Watch Ultra",
        steps_24h=9500,
        distance_meters=7100.0,
        active_calories_kcal=510.0,
        sleep_hours=8.0,
        timestamp="2026-09-15T12:00:00Z",
        quality_score=99.0,
    )

    ingest_res = movement_sync_service.ingest_background_sync(account_id="student_test_user", payload=payload)
    assert ingest_res["status"] in ["SUCCESS", "DEDUPLICATED"]
    assert ingest_res["steps"] == 9500

    # Deduplication test
    dedup_res = movement_sync_service.ingest_background_sync(account_id="student_test_user", payload=payload)
    assert dedup_res["status"] == "DEDUPLICATED"

    history = movement_sync_service.get_sync_history(account_id="student_test_user")
    assert len(history) > 0
