"""
services.payment_gateway — order checkout and refunds (F087).

This module never talks to a payment provider. It used to pretend to: it
shipped demo credentials so it always reported itself configured, invented
Razorpay/Stripe order ids and checkout URLs, and returned "REFUNDED" with a
made-up receipt number without moving any money. The refund endpoint then told
the student a refund had been issued.

It now reports the truth: checkout and refunds are UNAVAILABLE until a real
provider call is implemented here. Membership payments are real and live in
services/billing.py (Razorpay subscriptions with receipt reconciliation); this
module is only the per-order path. Webhook signatures are rejected unless a
secret is actually configured — there is no default secret.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Literal, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("services.payment_gateway")

PAYMENT_PROVIDER = os.environ.get("PAYMENT_PROVIDER", "razorpay")


class PaymentOrderRequest(BaseModel):
    order_id: str
    amount_paise: int = Field(gt=0)
    currency: str = "INR"
    customer_email: str
    customer_phone: str = ""
    description: str = "Studentkare Healthcare Order"


class PaymentOrderResponse(BaseModel):
    configured: bool
    status: Literal["UNAVAILABLE"]
    provider: str
    order_id: str
    amount_paise: int
    currency: str
    message: str
    checkout_url: Optional[str] = None


class RefundRequest(BaseModel):
    model_config = {"extra": "forbid"}
    payment_id: str = Field(min_length=1, max_length=120)
    amount_paise: int = Field(gt=0)
    reason: str = Field(default="Customer requested cancellation", max_length=300)


class RefundResult(BaseModel):
    status: Literal["UNAVAILABLE"]
    message: str


UNAVAILABLE_MESSAGE = "Online payment for orders isn't connected yet. Nothing was charged."
REFUND_UNAVAILABLE_MESSAGE = (
    "Refunds can't be issued from Studentkare yet because no payment provider is connected for orders. "
    "Nothing was refunded; arrange it with the provider directly."
)


class PaymentGatewayService:
    def __init__(self) -> None:
        self.provider = PAYMENT_PROVIDER.lower()

    @property
    def webhook_secret(self) -> str:
        return os.environ.get("PAYMENT_WEBHOOK_SECRET", "")

    def is_configured(self) -> bool:
        """No provider call is implemented in this module, so it is never configured."""
        return False

    def create_checkout_session(self, req: PaymentOrderRequest) -> PaymentOrderResponse:
        return PaymentOrderResponse(
            configured=False, status="UNAVAILABLE", provider=self.provider, order_id=req.order_id,
            amount_paise=req.amount_paise, currency=req.currency, message=UNAVAILABLE_MESSAGE,
        )

    def verify_webhook_signature(self, body: bytes, signature_header: str) -> bool:
        """HMAC-SHA256 check. Fails closed when no secret is configured."""
        secret = self.webhook_secret
        if not signature_header or not secret:
            return False
        expected_sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header)

    def process_refund(self, req: RefundRequest) -> RefundResult:
        """Never claims a refund it did not make."""
        logger.info("Refund requested while no order payment provider is connected.")
        return RefundResult(status="UNAVAILABLE", message=REFUND_UNAVAILABLE_MESSAGE)


payment_gateway = PaymentGatewayService()
