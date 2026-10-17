"""
Unit tests for the remaining backlog features (F087, F021, F094).
F085 (pharmacist Rx review) now runs on durable dispenses: see test_clinical_fulfilment.py.
"""
import pytest

from services.movement_sync import HealthSyncPayload, movement_sync_service
from services.notification_worker import notification_worker
from services.payment_gateway import PaymentOrderRequest, RefundRequest, payment_gateway


def test_f087_payment_gateway_never_pretends(monkeypatch):
    # No provider call exists for orders, so checkout is unavailable rather than invented.
    req = PaymentOrderRequest(order_id="ord_test_99", amount_paise=45000, currency="INR",
                              customer_email="student@studentkare.test")
    res = payment_gateway.create_checkout_session(req)
    assert res.status == "UNAVAILABLE" and res.configured is False
    assert res.checkout_url is None

    # Webhook signatures fail closed without a configured secret, and verify with one.
    import hashlib
    import hmac
    import json
    body = json.dumps({"event": "payment.settled"}).encode()
    monkeypatch.delenv("PAYMENT_WEBHOOK_SECRET", raising=False)
    forged = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert payment_gateway.verify_webhook_signature(body, forged) is False
    monkeypatch.setenv("PAYMENT_WEBHOOK_SECRET", "configured-secret")
    good = hmac.new(b"configured-secret", body, hashlib.sha256).hexdigest()
    assert payment_gateway.verify_webhook_signature(body, good) is True
    assert payment_gateway.verify_webhook_signature(body, "invalid_sig") is False

    # A refund is never reported as made.
    ref = payment_gateway.process_refund(RefundRequest(payment_id="pay_rzp_123", amount_paise=45000))
    assert ref.status == "UNAVAILABLE"


def test_f021_notification_outbox_ships_no_invented_traffic():
    # No seeded recipients or messages, and nothing reported as delivered.
    assert notification_worker.get_outbox_notifications() == []
    proc_res = notification_worker.process_outbox_queue()
    assert proc_res["processed"] == 0 and proc_res["delivered"] == 0
    assert notification_worker.retry_notification("notif_01")["status"] == "NOT_FOUND"


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
