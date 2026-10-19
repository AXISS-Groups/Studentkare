"""
services.payment_gateway — payment providers for one-off payments (F087).

One interface, ``PaymentProvider``, and one class per gateway. The active one is
chosen by ``PAYMENT_PROVIDER``:

    mock      a simulated gateway for development and tests (default there)
    razorpay  Razorpay Orders + Checkout (default in production)

Adding Stripe, Cashfree or PhonePe means writing another ``PaymentProvider``
subclass and registering it in ``PROVIDERS``. Nothing else in the codebase names
a gateway: orders, refunds and webhooks go through services/payments.py, which
only sees this interface.

Fail closed:
- production refuses to start with ``PAYMENT_PROVIDER=mock`` unless
  ``PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true`` (``assert_provider_allowed``, called
  from app/main.py), and ``get_provider`` refuses it again at request time;
- an unknown provider name, missing keys, or a signature that cannot be
  checked never produces a paid order: the caller gets ``ProviderUnavailable``
  or a rejected signature.

The provider is sent the amount, the currency and an opaque reference
(payable kind + id). Never item names, notes, or anything about the person's
health (Rule L): what was bought is not the gateway's business.

Membership subscriptions are separate (services/billing.py). Both use the one
Razorpay client in services/razorpay_client.py.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException

from core.app_env import is_dev_or_test
from services import razorpay_client

logger = logging.getLogger("services.payment_gateway")

MOCK = "mock"
RAZORPAY = "razorpay"
ALLOW_MOCK_IN_PRODUCTION_ENV = "PAYMENT_ALLOW_MOCK_IN_PRODUCTION"

PaymentState = Literal["captured", "authorized", "pending", "failed"]
WebhookKind = Literal["captured", "failed", "refunded", "ignored"]


class ProviderUnavailable(Exception):
    """No usable provider: not configured, unknown, or mock outside dev/test."""


class ProviderError(Exception):
    """The provider was reached and refused or failed. Its own text is never shown."""


class WebhookRejected(Exception):
    """The webhook's signature did not verify (or could not be checked)."""


@dataclass(frozen=True)
class Payable:
    """Anything with a server-side price: a shop order now; lab and consultation bookings later.

    ``amount_paise`` is always computed by the server from its own records.
    """
    kind: str
    id: str
    account_id: str
    amount_paise: int
    currency: str = "INR"

    @property
    def reference(self) -> str:
        """The opaque reference the provider stores (receipt / notes). No names, no items."""
        return f"{self.kind}:{self.id}"


@dataclass(frozen=True)
class ProviderOrder:
    provider_order_id: str
    amount_paise: int
    currency: str


@dataclass(frozen=True)
class ProviderPayment:
    provider_payment_id: str
    provider_order_id: str
    # As the provider reported it; the caller refuses anything but the exact int.
    amount_paise: object
    currency: str
    status: PaymentState
    error_code: str = ""


@dataclass(frozen=True)
class ProviderRefund:
    provider_refund_id: str
    amount_paise: int
    status: Literal["processed", "pending", "failed"]


@dataclass(frozen=True)
class WebhookEvent:
    kind: WebhookKind
    provider_payment_id: str = ""
    provider_order_id: str = ""
    # A non-int (or missing) amount stays as given so the caller can refuse it.
    amount_paise: object = None
    currency: str = "INR"
    error_code: str = ""
    # Older events name our order directly (the generic signed webhook).
    payable_kind: str = ""
    payable_id: str = ""
    # refund.* events
    provider_refund_id: str = ""
    refund_status: str = ""


class PaymentProvider(ABC):
    """What every gateway must do. Implementations hold no state between calls."""

    name: str = ""
    #: True when no real money can move (the mock). The UI labels it a test payment.
    test_mode: bool = False

    @abstractmethod
    def is_configured(self) -> bool:
        """Keys present. Nothing is charged through a provider that says False."""

    @abstractmethod
    def create_order(self, payable: Payable, receipt: str) -> ProviderOrder:
        """Ask the provider for an order for exactly ``payable.amount_paise``."""

    @abstractmethod
    def client_options(self) -> dict:
        """What the client needs to open this provider's checkout. Never a secret."""

    @abstractmethod
    def verify_payment_signature(self, provider_order_id: str, provider_payment_id: str, signature: str) -> bool:
        """Check the checkout callback's signature. A True only proves who sent it."""

    @abstractmethod
    def fetch_payment(self, provider_payment_id: str) -> ProviderPayment:
        """The provider's current view of one payment (amount, order, state)."""

    @abstractmethod
    def parse_webhook(self, raw: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        """Verify the signature (raise WebhookRejected) and normalise the event."""

    @abstractmethod
    def refund(self, provider_payment_id: str, amount_paise: int, receipt: str) -> ProviderRefund:
        """Refund ``amount_paise`` of a captured payment (full or partial)."""


# ---------------------------------------------------------------------------
# Razorpay
# ---------------------------------------------------------------------------

def _rzp(method: str, path: str, body: dict | None = None, params: dict | None = None) -> dict:
    try:
        return razorpay_client.request(method, path, body, params)
    except HTTPException as exc:
        raise ProviderError("razorpay request failed") from exc
    except Exception as exc:  # noqa: BLE001 — network errors: fail closed, type only
        raise ProviderError(f"razorpay unreachable: {type(exc).__name__}") from exc


_RZP_STATES: dict[str, PaymentState] = {"captured": "captured", "authorized": "authorized",
                                        "created": "pending", "failed": "failed", "refunded": "captured"}


class RazorpayProvider(PaymentProvider):
    """Razorpay Orders API + Standard Checkout (checkout.razorpay.com)."""

    name = RAZORPAY
    test_mode = False

    def is_configured(self) -> bool:
        return razorpay_client.configured()

    def create_order(self, payable: Payable, receipt: str) -> ProviderOrder:
        order = _rzp("POST", "/orders", {
            "amount": payable.amount_paise, "currency": payable.currency, "receipt": receipt[:40],
            "notes": {"payable": payable.reference},
        })
        if order.get("amount") != payable.amount_paise or order.get("currency") != payable.currency:
            raise ProviderError("razorpay order does not match the amount asked for")
        return ProviderOrder(provider_order_id=str(order["id"]), amount_paise=payable.amount_paise,
                             currency=payable.currency)

    def client_options(self) -> dict:
        # The public key id only. Checkout loads https://checkout.razorpay.com/v1/checkout.js.
        return {"keyId": razorpay_client.key_id()}

    def verify_payment_signature(self, provider_order_id: str, provider_payment_id: str, signature: str) -> bool:
        return razorpay_client.verify_signature(f"{provider_order_id}|{provider_payment_id}", signature)

    def fetch_payment(self, provider_payment_id: str) -> ProviderPayment:
        p = _rzp("GET", f"/payments/{provider_payment_id}")
        return ProviderPayment(
            provider_payment_id=str(p.get("id", "")), provider_order_id=str(p.get("order_id") or ""),
            amount_paise=p.get("amount"), currency=str(p.get("currency", "")),
            status=_RZP_STATES.get(str(p.get("status", "")), "pending"),
            error_code=str(p.get("error_code") or "")[:40],
        )

    def parse_webhook(self, raw: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        if not razorpay_client.verify_webhook(raw, headers.get("x-razorpay-signature", "")):
            raise WebhookRejected()
        data = json.loads(raw)
        event = str(data.get("event", ""))
        payment = ((data.get("payload") or {}).get("payment") or {}).get("entity") or {}
        common = {"provider_payment_id": str(payment.get("id") or ""),
                  "provider_order_id": str(payment.get("order_id") or ""),
                  "amount_paise": payment.get("amount"), "currency": str(payment.get("currency") or "")}
        if event in {"payment.captured", "order.paid"}:
            return WebhookEvent(kind="captured", **common)
        if event == "payment.failed":
            return WebhookEvent(kind="failed", error_code=str(payment.get("error_code") or "")[:40], **common)
        if event in {"refund.processed", "refund.failed"}:
            refund = ((data.get("payload") or {}).get("refund") or {}).get("entity") or {}
            return WebhookEvent(kind="refunded", provider_refund_id=str(refund.get("id") or ""),
                                refund_status="processed" if event == "refund.processed" else "failed", **common)
        return WebhookEvent(kind="ignored")

    def refund(self, provider_payment_id: str, amount_paise: int, receipt: str) -> ProviderRefund:
        r = _rzp("POST", f"/payments/{provider_payment_id}/refund",
                 {"amount": amount_paise, "speed": "normal", "receipt": receipt[:40]})
        state = str(r.get("status", "pending"))
        return ProviderRefund(provider_refund_id=str(r.get("id", "")), amount_paise=int(r.get("amount", amount_paise)),
                              status=state if state in ("processed", "pending", "failed") else "pending")


# ---------------------------------------------------------------------------
# Mock (development and tests only)
# ---------------------------------------------------------------------------

#: Deterministic outcomes. Any other number is refused, so nothing looks like a real card.
MOCK_TEST_CARDS: dict[str, tuple[PaymentState, str]] = {
    "4111111111111111": ("captured", ""),
    "4000000000000002": ("failed", "card_declined"),
}
# The mock's signatures prove only that the mock produced them; this key is not a
# secret and the mock never runs in production (assert_provider_allowed).
_MOCK_SIGNING_KEY_DEFAULT = "studentkare-mock-gateway-not-a-secret"


def _mock_signing_key() -> str:
    return os.getenv("PAYMENT_MOCK_SIGNING_KEY", "") or _MOCK_SIGNING_KEY_DEFAULT


def mock_signature(provider_order_id: str, provider_payment_id: str) -> str:
    return hmac.new(_mock_signing_key().encode(), f"{provider_order_id}|{provider_payment_id}".encode(),
                    hashlib.sha256).hexdigest()


class MockProvider(PaymentProvider):
    """A simulated gateway with its own ledger (care_mock_gateway_payments).

    It behaves like Razorpay from the outside: an order id, a hosted "checkout"
    (``checkout()``, standing in for the payment page) that returns a signed
    payment id, a fetchable payment, signed webhooks and refunds. Outcomes
    depend only on the test card, so tests are deterministic. Every payment it
    takes is ``test_mode`` and the UI says so.
    """

    name = MOCK
    test_mode = True

    def __init__(self, db) -> None:
        self.db = db

    def is_configured(self) -> bool:
        return True

    def create_order(self, payable: Payable, receipt: str) -> ProviderOrder:
        return ProviderOrder(provider_order_id=f"mock_order_{uuid.uuid4().hex[:20]}",
                             amount_paise=payable.amount_paise, currency=payable.currency)

    def client_options(self) -> dict:
        return {"testCards": [{"number": number, "outcome": outcome}
                              for number, (outcome, _code) in MOCK_TEST_CARDS.items()]}

    def checkout(self, provider_order_id: str, amount_paise: int, currency: str, card_number: str) -> tuple[ProviderPayment, str]:
        """The simulated payment page: records the attempt on the mock's ledger, returns it signed."""
        from core import workflow_models as M
        outcome = MOCK_TEST_CARDS.get("".join(ch for ch in card_number if ch.isdigit()))
        if outcome is None:
            raise ValueError("Use one of the test cards.")
        state, code = outcome
        row = M.MockGatewayPayment(id=f"mock_pay_{uuid.uuid4().hex[:20]}", provider_order_id=provider_order_id,
                                   amount_paise=amount_paise, currency=currency, status=state,
                                   error_code=code, refunded_paise=0, created_at=time.time())
        self.db.add(row)
        self.db.flush()
        return self._payment(row), mock_signature(provider_order_id, row.id)

    @staticmethod
    def _payment(row) -> ProviderPayment:
        return ProviderPayment(provider_payment_id=row.id, provider_order_id=row.provider_order_id,
                               amount_paise=row.amount_paise, currency=row.currency,
                               status=row.status, error_code=row.error_code)

    def verify_payment_signature(self, provider_order_id: str, provider_payment_id: str, signature: str) -> bool:
        if not signature:
            return False
        return hmac.compare_digest(mock_signature(provider_order_id, provider_payment_id), signature)

    def fetch_payment(self, provider_payment_id: str) -> ProviderPayment:
        from core import workflow_models as M
        row = self.db.get(M.MockGatewayPayment, provider_payment_id)
        if row is None:
            raise ProviderError("mock payment not found")
        return self._payment(row)

    def parse_webhook(self, raw: bytes, headers: Mapping[str, str]) -> WebhookEvent:
        """The generic signed webhook: ``x-webhook-signature`` = HMAC-SHA256(PAYMENT_WEBHOOK_SECRET, body).

        Body: ``{"event", "orderId" | "providerOrderId", "providerRef", "amountPaise"}``.
        No secret configured means every webhook is refused.
        """
        secret = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
        signature = headers.get("x-webhook-signature", "")
        if not secret or not signature:
            raise WebhookRejected()
        expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise WebhookRejected()
        data = json.loads(raw or b"{}")
        event = str(data.get("event", ""))
        common = {"provider_payment_id": str(data.get("providerRef") or "").strip(),
                  "provider_order_id": str(data.get("providerOrderId") or ""),
                  "amount_paise": data.get("amountPaise"),
                  "payable_kind": "shop_order" if data.get("orderId") else "",
                  "payable_id": str(data.get("orderId") or "")}
        if event in {"payment.settled", "payment.captured"}:
            return WebhookEvent(kind="captured", **common)
        if event == "payment.failed":
            return WebhookEvent(kind="failed", error_code=str(data.get("errorCode") or "")[:40], **common)
        return WebhookEvent(kind="ignored", **common)

    def refund(self, provider_payment_id: str, amount_paise: int, receipt: str) -> ProviderRefund:
        from core import workflow_models as M
        row = self.db.get(M.MockGatewayPayment, provider_payment_id)
        if row is None or row.status != "captured":
            raise ProviderError("mock payment not refundable")
        if row.refunded_paise + amount_paise > row.amount_paise:
            raise ProviderError("mock refund exceeds the captured amount")
        row.refunded_paise += amount_paise
        self.db.flush()
        return ProviderRefund(provider_refund_id=f"mock_rfnd_{uuid.uuid4().hex[:20]}",
                              amount_paise=amount_paise, status="processed")


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

#: Registry. A new gateway is one more entry; each factory takes the DB session.
PROVIDERS = {
    MOCK: MockProvider,
    RAZORPAY: lambda db: RazorpayProvider(),
}


def provider_name() -> str:
    """``PAYMENT_PROVIDER``, else mock in development/testing and razorpay in production."""
    raw = os.getenv("PAYMENT_PROVIDER", "").strip().lower()
    return raw or (MOCK if is_dev_or_test() else RAZORPAY)


def mock_allowed() -> bool:
    """The mock moves no money, so in production it would hand out goods for free."""
    if is_dev_or_test():
        return True
    return os.getenv(ALLOW_MOCK_IN_PRODUCTION_ENV, "").strip().lower() == "true"


def assert_provider_allowed() -> None:
    """Startup guard (app/main.py). Raises RuntimeError so the process refuses to start."""
    name = provider_name()
    if name not in PROVIDERS:
        raise RuntimeError(f"PAYMENT_PROVIDER={name!r} is not a known payment provider ({', '.join(sorted(PROVIDERS))}).")
    if name == MOCK and not mock_allowed():
        raise RuntimeError(
            "PAYMENT_PROVIDER=mock takes no real money and must not run in production. "
            f"Set PAYMENT_PROVIDER=razorpay, or {ALLOW_MOCK_IN_PRODUCTION_ENV}=true for a non-public test deployment."
        )


def get_provider(db, name: str | None = None) -> PaymentProvider:
    """The active provider (or the named one, e.g. the one that took a payment being refunded)."""
    name = (name or provider_name()).strip().lower()
    factory = PROVIDERS.get(name)
    if factory is None:
        raise ProviderUnavailable(f"unknown provider {name!r}")
    if name == MOCK and not mock_allowed():
        raise ProviderUnavailable("the mock provider is disabled in production")
    provider = factory(db)
    if not provider.is_configured():
        raise ProviderUnavailable(f"{name} is not configured")
    return provider
