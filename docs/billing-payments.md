# Billing, plans & payments

> **Status — 15 September 2026.** Pricing is wired into the public landing page,
> each member's "My plan" panel, and the super-admin "Inquiries & contracts"
> console. Payments go live only after an external Razorpay activation (below);
> until then the product reports an honest `Payments not configured` state and
> never attempts a charge.

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

## Remaining external activation requirements

| Item | Who | Blocks |
|---|---|---|
| Razorpay account + KYC (live) | Operations | Live Student Plus payments |
| Student Plus plan creation | Operations | Subscription checkout |
| Webhook registration + secret | Operations | Automatic receipt reconciliation |
| Campus/Enterprise signed agreements | Sales | Seat activation for institutions |
| Recorded payment references (bank/UPI) | Finance/Admin | Contract activation |

Until these are done the product stays in the honest unconfigured state; no
component pretends a charge or entitlement exists.