"""
Unit tests for the 4 remaining backlog features (F087, F085, F021, F094).
"""
import pytest

from services.movement_sync import HealthSyncPayload, movement_sync_service
from services.notification_worker import notification_worker
from services.payment_gateway import PaymentOrderRequest, RefundRequest, payment_gateway
from services.pharmacy_review import pharmacy_review_service


def test_f087_payment_gateway_checkout_and_refunds():
    # Checkout Order Creation
    req = PaymentOrderRequest(
        order_id="ord_test_99",
        amount_paise=45000,
        currency="INR",
        customer_email="student@studentkare.test",
    )
    res_rzp = payment_gateway.create_checkout_session(req)
    assert res_rzp.order_id == "ord_test_99"
    assert res_rzp.amount_paise == 45000

    # Webhook signature verification
    import hashlib
    import hmac
    import json
    body = json.dumps({"event": "payment.settled"}).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert payment_gateway.verify_webhook_signature(body, sig) is True
    assert payment_gateway.verify_webhook_signature(body, "invalid_sig") is False

    # Refund Processing
    ref_req = RefundRequest(order_id="ord_test_99", payment_id="pay_rzp_123", amount_paise=45000)
    ref_res = payment_gateway.process_refund(ref_req)
    assert ref_res["status"] == "REFUNDED"
    assert ref_res["amount_paise"] == 45000


def test_f085_pharmacy_prescription_review():
    reviews = pharmacy_review_service.get_pending_reviews()
    assert len(reviews) > 0
    rx_id = reviews[0].rx_id
    assert reviews[0].signature_verified is True

    # Generic substitution match
    sub = pharmacy_review_service.find_generic_substitution("Dolo 650mg")
    assert sub == "Paracetamol 650mg Generic"

    # Pharmacist approval
    app_res = pharmacy_review_service.approve_prescription_review(
        rx_id=rx_id,
        pharmacist_name="Dr. Pharmacist Lead",
        substitutions={"m1": "Paracetamol 650mg Generic"},
    )
    assert app_res["status"] == "SUCCESS"
    assert app_res["rx_id"] == rx_id


def test_f021_notification_outbox_worker():
    items = notification_worker.get_outbox_notifications()
    assert len(items) >= 2

    # Process Outbox Queue
    proc_res = notification_worker.process_outbox_queue()
    assert "processed" in proc_res
    assert "delivered" in proc_res

    # Requeue FAILED item
    req_res = notification_worker.retry_notification("notif_01")
    assert req_res["status"] == "SUCCESS"


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
