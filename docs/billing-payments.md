# Billing, plans & payments

> **Status — 15 September 2026.** Pricing is wired into the public landing page,
> each member's "My plan" panel, and the super-admin "Inquiries & contracts"
> console. Payments go live only after an external Razorpay activation (below);
> until then the product reports an honest `Payments not configured` state and
> never attempts a charge.
>
> **19 October 2026.** Shop orders can now be paid online through a payment
> provider (mock or Razorpay) — see [Order payments](#order-payments-shop-checkout).

## What is connected

| Surface | Route | Behaviour |
|---|---|---|
| Public plans / pricing | `/#/pricing` (public) | Server-owned catalog from `GET /api/billing/plans`; Student Plus checkout, Campus/Enterprise inquiry forms |
| Landing page | Marketplace `Plans` button + health-experience landing nav/CTA | Links to `/#/pricing` |
| Account billing | `/#/billing` (any signed-in member) | Current plan, payment history, upgrade / resync / cancel; "Compare plans" links to pricing |
| Enterprise administration | `/#/admin/billing` (SUPER_ADMIN only) | Institutional inquiries (status workflow), contract creation + activation, seat assignment; "View public plans" links to pricing |

## Server-side source of truth

Entitlements are **never derived from a client-supplied plan selection**. Every
commercial state is computed in `backend/services/billing.py` from:

- **Student Plus** — Razorpay subscription + reconciled paid invoices. The
  `/subscription/verify` handler checks the `payment_id|subscription_id` signature
  against `RAZORPAY_KEY_SECRET`; membership only activates once a webhook with a
  paid invoice reconciles. Events may be re-ordered or replayed: every path is
  idempotent and re-fetches provider state before changing entitlement.
- **Campus / Enterprise** — a signed contract created by a super-admin and
  **activated only after a recorded payment reference** is attached
  (`POST /api/billing/admin/contracts/{id}/activate`). Seat limits are enforced
  server-side (`POST /api/billing/contracts/{id}/members` returns 409 past the
  seat cap).

## Database

Migration `backend/alembic/versions/c3b7f1a9d8e4_add_billing.py` adds:

- `care_billing_subscriptions`
- `care_billing_receipts` (unique on provider + invoice id, refund-aware)
- `care_benefit_requests`
- `care_enterprise_inquiries`
- `care_enterprise_contracts` (+ seat assignment table)

Apply with `alembic upgrade head` from `backend/`, or rely on `create_all_tables`
for fresh setups. The isolated SQL test harness in `backend/tests/test_billing.py`
creates the schema directly (no migration dependency).

## Configuration (environment)

All billing env vars go in `backend/.env` / `backend/.env.workflow.example`:

| Variable | Required for | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | Student Plus checkout | Public key sent to the browser checkout |
| `RAZORPAY_KEY_SECRET` | Checkout signature + provider API | Never expose client-side |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification | Sent as `X-Razorpay-Signature` |
| `RAZORPAY_PLUS_PLAN_ID` | Subscription creation | Defaults to `plan_student_plus` |
| `RAZORPAY_BASE_URL` | Provider API host | Defaults to `https://api.razorpay.com/v1` |
| `PAYMENT_PROVIDER` | Order payments | `mock` or `razorpay`. Unset = `mock` in development/testing, `razorpay` in production |
| `PAYMENT_HOLD_MINUTES` | Order payments | How long an unpaid order holds its stock. Default 30, minimum 5 |
| `PAYMENT_WEBHOOK_SECRET` | Mock provider only | Signs the mock's generic webhook (`x-webhook-signature`). Unset = every mock webhook refused |
| `PAYMENT_ALLOW_MOCK_IN_PRODUCTION` | Never on a public deployment | `true` lets a production process start on the mock (a closed staging box only) |

Without `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` the API exposes
`checkoutAvailable: false`, returns `503` on checkout, and the UI shows
"Payments not configured yet" — no charge path exists.

## Launch steps (external activation)

1. **Create/activate a Razorpay account** (test mode first, then live KYC).
2. **Create the Student Plus plan** as a recurring monthly plan of **₹99**
   (`amount 9900` paise, INR, monthly, interval 1). Copy its `plan_id` into
   `RAZORPAY_PLUS_PLAN_ID`.
3. **Register the webhook** in the Razorpay Dashboard → Webhooks →
   `https://<host>/api/billing/razorpay/webhook`. Subscribe to the
   `subscription.charged`, `subscription.authenticated`, and
   `subscription.cancelled` events; enable retries (delivery may be re-ordered).
   Set `RAZORPAY_WEBHOOK_SECRET` to the dashboard secret.
4. **Set the env vars above** and restart the backend worker.
5. **Smoke-test end to end**: register a fresh account → `/#/billing` →
   "Upgrade to Student Plus" → complete a test payment → confirm the webhook
   reconciles and `/#/billing` shows `STUDENT_PLUS` with a receipt. The server
   log confirms `GET /api/billing/plans` now returns `checkoutAvailable: true`.
6. **Campus/Enterprise**: continue to sell offline — collect a signed agreement
   and a bank/UPI payment reference, then a super-admin records the contract and
   activates it in `/#/admin/billing`.

## Verification

- Backend lifecycle & access controls: `pytest backend/tests/test_billing.py`
  (13 tests) — authorization, forged signatures, refund revocation, out-of-order
  webhooks, seat enforcement, admin-only endpoints.
- Full suite: `pytest -q` in `backend/` (250 passed).
- Frontend: `npm run build`, `npm run lint`, `npm test` (287 passed).
- Browser smoke flows verified with the app running against a local backend:
  marketplace → pricing; student → `/#/billing` → compare plans → pricing;
  admin → `/#/admin/billing` → view public plans → pricing. Zero console errors.

## Order payments (shop checkout)

Shop orders are paid through a **payment provider**: one interface,
`PaymentProvider` in `backend/services/payment_gateway.py`, and one class per
gateway. Two exist:

| `PAYMENT_PROVIDER` | What it is | Where |
|---|---|---|
| `mock` | A simulated gateway with its own ledger (`care_mock_gateway_payments`). Outcomes depend only on the test card; no real money moves. Every screen and API response marks it `testMode` / "Test payment". | Default in development and tests. **Production refuses to start on it** unless `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true`, and refuses it again on every request. |
| `razorpay` | Razorpay Orders API + Standard Checkout (`checkout.razorpay.com/v1/checkout.js`), reusing the one Razorpay client in `services/razorpay_client.py` that membership billing uses. | Default in production. Without `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` the pay step says "Online payment isn't connected yet" and the order stays a request. |

Mock test cards: `4111 1111 1111 1111` goes through, `4000 0000 0000 0002` is
declined. The pay step offers them as two choices; nobody types a card number.

### How an order is paid

1. `POST /api/orders` creates the order **UNPAID**, reserves stock, and — when a
   provider is available — sets `paymentDueAt` (now + `PAYMENT_HOLD_MINUTES`).
2. `POST /api/orders/{id}/payment` opens a provider order for the **server's**
   total in integer paise (a `PaymentIntent`). Asking again reuses the open one.
   The provider is sent the amount, currency and an opaque reference
   (`shop_order:<id>`) — never item names or anything about health (Rule L).
3. The student pays on the provider's page (Razorpay Checkout, or
   `POST /api/orders/{id}/payment/mock-checkout` for the mock).
4. `POST /api/orders/{id}/payment/verify` only *triggers* a check: the signature
   must verify, then the server fetches the payment from the provider and
   settles only a captured payment for this order's provider order and exact
   amount. A wrong amount is refused (409) and never recorded.
5. `POST /api/payments/webhook` (signed by the active provider) settles
   independently and is the source of truth. Settlement is idempotent on the
   provider's payment id, so replays and a webhook racing the verify record one
   payment.
6. The scheduled job `payment_expiry` (every 5 minutes, in the worker) releases
   the stock of orders not paid by `paymentDueAt` (`paymentStatus: EXPIRED`). A
   capture that lands after expiry or a cancel is recorded and raised on the ops
   feed (`PAYMENT_NEEDS_REFUND`) for a person to refund; it never revives the
   order. A paid order cannot be cancelled by the student (support refunds it).

`paymentStatus` values: `UNPAID`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`,
`EXPIRED`, `CANCELLED`.

### Refunds

`POST /api/v1/orders/{id}/refund` (super admin only) with an
`Idempotency-Key` header and `{"payment_id", "amount_paise", "reason"}`. Full
or partial, through the provider that **took** the payment (not whichever is
configured now). The amount is reserved before the provider is called, so
concurrent refunds cannot exceed what was captured. Replaying a key returns the
same refund; reusing it for a different refund is a 409. If that provider is not
connected the answer is 503 and nothing moves. The student is notified only
when a refund was actually issued.

### Payables: shop orders, lab bookings and prescription quotes

`backend/services/payments.py` works on a generic **payable** (`Payable(kind,
id, account_id, amount_paise)`). Three kinds are wired:

| Kind | Priced in | Endpoints |
|---|---|---|
| `shop_order` | `care_orders.total_paise` | `/api/orders/{id}/payment[...]` |
| `lab_order` | `care_lab_order_charges.amount_paise` (the catalogue price when booked) | `/api/lab-orders/{id}/payment[...]` |
| `dispense_quote` | `care_dispense_quotes.total_paise` (the pharmacy's quote) | `/api/dispense-quotes/{id}/payment[...]` |

A payment row names its payable by `care_payments.payable_kind` +
`payable_id` (migration `d9e2a7c41b58`, which backfilled every existing row as
a shop order). `order_id` is kept, and set, for shop orders only. To wire
another kind, add a handler to `PAYABLE_KINDS` (load the amount, payment
state, deadline, mark paid, set refund state) and call `start_payment`,
`verify_client_payment`, `payment_status_payload` and `refund(kind=...)` from
its endpoints. On the client, `PayStepViewModel` / `PayStepView`
(`src/features/payments/`) take an id, an amount and a repository for the
payable's endpoints (`PaymentRepository('/orders')` or `('/lab-orders')`).

### Lab tests booked from the shop

`backend/services/lab_booking.py`. A student picks a test (`GET
/api/lab-packages`, each with the tests it includes), a collection time
(`GET /api/lab-packages/{id}/slots`; a fasting test is offered morning times
only) and where to collect (hostel block and room, or a home address), then
`POST /api/lab-bookings` with an `Idempotency-Key`:

- a clinical lab order is created `BOOKED`, ordered by the student, and the
  slot is reserved by the same rule as `PUT /api/lab-orders/{id}/slot`;
- a commerce charge (`care_lab_order_charges`) holds the server's price,
  `UNPAID` until `PAYMENT_HOLD_MINUTES` pass;
- a hostel address also creates the hostel pickup
  (`care_hostel_visit_requests.lab_order_id`), already the lab's.

Until the charge is paid the lab cannot see or act on the order or its
pickup. `payment_expiry` cancels a booking not paid in time and gives its slot
back. If payment isn't connected, booking is refused (503) rather than making a
booking that can never reach a lab. The provider is told `booking:<id>`, never
that it is a lab test. Lab tests can no longer be added to the cart
(`POST /api/orders` and `POST /api/appointments` refuse them).

**Collectors** are accounts (role `LAB_COLLECTOR`) a lab adds for its own
staff (`POST /api/work/lab-collectors`). The lab assigns one by account id
(`PATCH /api/lab-orders/{id}` with `collectorId`; another lab's or a retired
collector is refused). A collector sees only their own pickups
(`GET /api/collector/pickups`) and can mark one collected (sample id, tube
count, time) and handed to the lab (`IN_TRANSIT`); the lab confirms receipt.

**Reviewing doctor.** A self-booked test has no ordering doctor, so the report
the lab files waits in `REPORT_READY`. A doctor who already has a confirmed or
completed appointment with the student may review it; otherwise a super admin
assigns one from `/api/work/lab-reviews`, seeing only test names and how long
it has waited. Only that doctor can release it. Admins and collectors never
read a result.

### Prescription orders (priced dispenses)

A doctor's prescription is bought the same way (payable kind `dispense_quote`):

1. The student picks a pharmacy from `GET /api/pharmacies?pincode=` (active,
   kind PHARMACY, licence on record and current) and sends the prescription
   (`POST /api/dispenses`, which refuses any other provider id, and a delivery
   or pickup mode the pharmacy does not offer).
2. A pharmacist verifies it (`RX_ISSUED -> RX_VERIFIED`, unchanged).
3. The owning pharmacy prices every line plus any delivery fee:
   `PUT /api/dispenses/{id}/quote`. Line prices are stored on the clinical
   `care_dispense_items`; the commerce table `care_dispense_quotes` holds the
   dispense id and the totals only (Rule L). It can be re-priced until payment
   starts.
4. The student pays `POST /api/dispense-quotes/{quoteId}/payment` with the
   `expectedTotalPaise` they were shown (a changed quote is a 409). This
   freezes the quote, then the normal verify / webhook path settles it.
5. Only a settled payment moves the dispense to `ACCEPTED` (or
   `PARTIALLY_ACCEPTED` when a line was quoted short). Nobody can make that
   move by hand, and `PACKED` additionally requires a paid quote.

A paid dispense the pharmacy then rejects or cancels, or a capture that lands
after the student cancelled, raises `PAYMENT_NEEDS_REFUND` on the ops feed.
There is no refund endpoint for dispense quotes yet: support refunds it at the
provider.

### Switching providers

- **Local / tests:** nothing to do — the mock is the default. To try Razorpay
  test mode locally set `PAYMENT_PROVIDER=razorpay` and the `rzp_test_` keys.
- **Production:** `PAYMENT_PROVIDER=razorpay` (Helm config map and compose
  default) plus the three `RAZORPAY_*` secrets. Setting `mock` stops the
  process at startup.
- **Another gateway** (Stripe, Cashfree, PhonePe): implement `PaymentProvider`
  (create order, client options, verify signature, fetch payment, parse webhook,
  refund), register it in `PROVIDERS`, and add its keys to the env examples,
  Helm secrets and compose. Nothing else names a gateway.

### Razorpay setup for orders

1. Use the same Razorpay account as membership (test mode first, then live KYC).
2. **API keys:** Dashboard → Account & Settings → API keys. Put the key id in
   `RAZORPAY_KEY_ID` and the secret in `RAZORPAY_KEY_SECRET` (vault, Helm
   `backend.secrets`, never committed).
3. **Webhook:** Dashboard → Webhooks → add
   `https://<host>/api/payments/webhook` with events `payment.captured`,
   `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`. Use the
   same secret as the billing webhook (`RAZORPAY_WEBHOOK_SECRET`); Razorpay
   signs with `X-Razorpay-Signature`.
4. **Auto-capture:** keep payment capture automatic (Dashboard → Payment
   capture). An authorised-but-uncaptured payment stays "Waiting for your bank"
   and the order is not marked paid.
5. **CSP:** no Content-Security-Policy header is served today. If one is added,
   allow `https://checkout.razorpay.com` (script-src, frame-src) and
   `https://api.razorpay.com` (frame-src, connect-src).
6. Set `PAYMENT_PROVIDER=razorpay`, restart backend and worker, and smoke-test:
   add an item → checkout → pay with a Razorpay test card → the order shows
   `PAID`; then refund part of it from `/api/v1/orders/{id}/refund`.

## Remaining external activation requirements

| Item | Who | Blocks |
|---|---|---|
| Razorpay account + KYC (live) | Operations | Live Student Plus payments |
| Student Plus plan creation | Operations | Subscription checkout |
| Webhook registration + secret | Operations | Automatic receipt reconciliation |
| Order webhook (`/api/payments/webhook`) | Operations | Orders settling when the student closes the tab after paying |
| Campus/Enterprise signed agreements | Sales | Seat activation for institutions |
| Recorded payment references (bank/UPI) | Finance/Admin | Contract activation |

Until these are done the product stays in the honest unconfigured state; no
component pretends a charge or entitlement exists.