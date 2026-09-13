# Implementation status and remaining work

> **Status review — 13 September 2026:** This earlier snapshot no longer reflects
> all active code paths. Startup now seeds demo data, and several prototype agent
> panels/routes are mounted. See the [evidence-backed application audit](application-audit-2026-09-13.md)
> for current findings, verification results, and remediation priorities.

## Integration activation

To go live with payments, live teleconsultation (WebRTC), native health
integrations (HealthKit/Health Connect), or pharmacy review, see the
[Integration Configuration Guide](integration-guide.md). It lists the exact
environment variables, endpoints, and verification tests for each externally-gated
feature — all of which currently return honest `unavailable`/`unconfigured` states
until the external provider is connected.

## Implemented in the current pass (13 September 2026)

- **Durable workflow foundation**: persistent job/run/outbox tables, a restart-safe
  backend scheduler (default two-hour cadence), integration health monitor, and
  honest agent status derived from real runs. See `services/workflow_scheduler.py`.
- **Scheduled operations**: integration health, reminder/outbox reconciliation,
  document-intake reconciliation, knowledge-freshness, and care-request follow-up
  jobs run on the two-hour cycle; admins can run any job immediately.
- **Security fixes**: login recovery only sends to a server-stored verified contact;
  approvals require a staff role and return 404 for unknown actions; donor directory
  requires authentication and redacts contact info; medication state is account-scoped
  and dose logging is idempotent.
- **Honest data**: mental-game, ENT/vision, camera, and prescription-extraction
  endpoints no longer fabricate readings, moods, rewards, or default matches. Legacy
  fabricated sensor widgets removed from the active health overview.
- **Devices & Sensors screen**: real camera capture, foreground motion pedometer with
  session history, voice-note recorder, and an experimental camera pulse estimator
  with quality gating.
- **Wellbeing upgrades**: breathing start/pause/finish lifecycle, real bubble counts,
  private mood check-in, real vision responses, hearing tones separated from responses,
  plus grounding/memory/tracing/drawing/sleep-wind-down activities.
- **Appointments & teleconsult**: booking with capacity reservation, staff confirmation,
  reminder preferences, waiting-room state, WebRTC signalling contract, and a provider
  consultation console.
- **Insurance & payments contracts**: benefits, policy, claim drafts, eligibility and
  claim submission (honest unconfigured states), signed-payment-webhook verification.
- **Knowledge & agent eval**: approved source retrieval, read-only care navigator with
  citations, document intake + review queue, agent evaluation metrics, follow-up worker,
  inventory/serviceability, encounter notes, movement history.
- **Database migrations**: Alembic now migrates the active `care_*` workflow schema
  (41 tables) on top of the legacy baseline, with working upgrade/downgrade. In
  production, startup applies migrations to head (`services/migrations.py`);
  development falls back to `create_all_tables()`.

## Implemented and verified

| Area | Current implementation |
| --- | --- |
| Authentication | Random OTPs, provider-result checks, expiry/attempt limits, single-use verification, separate signup grant |
| Account flow | No auto-created account during OTP verification; validated registration; pending campus verification |
| Sessions | HTTP-only cookies, database-backed expiry/revocation, CSRF, server-derived role checks, restore after refresh |
| Routing | One URL-based router, intended-destination return after sign-in, browser navigation, forbidden-role state |
| Health records | Private upload/download/delete with content-type signature and size checks |
| Metrics | Actual manual readings, timestamps, selectable trends, no invented measurements |
| Exercise | Source-linked guides, readiness questions, saved movements, persisted timer history, honest failure/retry states |
| Insurance information | Account-owned policy details and user-input calculator; no claim of insurer verification |
| Catalog | Actual database entries, provider assignment, price/stock management, filtering and pagination |
| Landing copy | Hero, feature strip, quick links, movement invite, and wellness articles served from `GET /api/home` |
| Orders | Persistent requests, authoritative prices, conditional stock reservation, idempotency, cancellable pending requests |
| Provider workflow | Assigned requests only; valid acceptance/decline/dispatch/completion transitions |
| Super-admin | Counts from the database, staff provisioning, catalog management, requests, support, workflow audit, service availability |
| UI | Responsive workspaces, forms, cards, buttons, gradients, dialogs, loading/empty/error states, reduced motion |

The browser regression suite covers the real HTTP/database journey with an
isolated test database and a substituted delivery provider. It does not grant a
production login shortcut or generate real user messages.

## Required setup, rather than missing UI code

1. Configure SMTP/Postal or a compatible OpenWA gateway so real OTP delivery can work.
2. Provision the first super-admin using a contact address they control.
3. Create genuine provider accounts and publish genuine catalog entries.
4. Configure production database, HTTPS, cookie environment, stable OTP hashing
   secret, and allowed public origins.

The application deliberately starts without a seeded administrator, sample
student records, fictional providers, or manufactured orders.

## Still to implement — priority order

### 1. Payments and full commerce fulfilment

- Payment-provider integration, verified webhooks, reconciliation, refunds, and receipts.
- Final delivery pricing, shipping-provider events, inventory reconciliation, and returns.
- Persistent cross-device carts; the current cart is browser-session state, while submitted requests are persisted.
- Confirmed appointment-slot capacity and rescheduling; current service times are requests until accepted.

### 2. Prescription and clinician workflows

- Licensed pharmacy/clinical review of uploaded prescriptions, with an explicit review record.
- Controlled prescription ordering and substitution approvals. Rx ordering currently fails closed.
- Consent-based clinician access to selected patient records and revocation.
- E-prescription issuance, clinical notes, referrals, and follow-up plans.

### 3. Insurance integrations

- Verified policy enrollment and benefit imports.
- Insurer/TPA eligibility, network-hospital verification, and pre-authorisation.
- Actual claims/document submission, insurer events, settlement status, and dispute handling.
- Policy-specific limits and waiting periods in the estimator.

Currently, policy information is user-recorded. A saved policy is not an activated
policy, and support requests are not insurer claim submissions.

### 4. Device and campus services

- Verified wearable/medical-device integrations and timestamp/source quality handling.
- Campus roster identity verification and trusted institution membership.
- Actual health-camp check-in/station processing and appointment queues.
- Emergency-contact/profile management, consent-bounded emergency cards, and validated dispatch integration.
- Campus-scoped administrative permissions and institution management.

The legacy prototype panels for these capabilities are not mounted as live services.

### 5. Operational and deployment hardening

- At-rest protection for clinical files/data, scalable object storage, retention policies, backups, and restore drills.
- Database migrations and an explicit process for reviewing/importing any legitimate legacy records.
- Notification jobs, bounded delivery retries, consent/preferences, and delivery receipts.
- Extended pagination/filtering across operational lists and larger health histories.
- Observability, independent security review, and load/concurrency testing with the target production database.
- Production partner configuration, monitoring, and incident-response workflows.

## Important limits

- No online payment has been collected when an order request is saved.
- Requested appointment times are not booked inventory until a provider confirms them.
- Recording a date of birth or campus name is not identity or affiliation verification.
- Timer history is not a device-verified exercise measurement.
- Automated diagnoses, regulatory certifications, encryption guarantees, and live
  insurer/ABDM integrations are not asserted by the active application.

## Canonical source paths

- `src/App.tsx`, `src/lib/workflowRouting.ts`: active application routing.
- `src/data/AuthContext.tsx`, `src/data/http.ts`: session and HTTP handling.
- `src/screens/auth/AuthenticatedFlowScreen.tsx`: actual account flow.
- `src/screens/workspace/`: account and operations pages.
- `src/screens/marketplace/LiveMarketplaceScreen.tsx`: database-backed storefront and order requests.
- `backend/main.py`: mounted API only; no demo seed or fake automation startup.
- `backend/services/workflow_auth.py`, `workflow_api.py`: authentication and owned workflows.
- `backend/core/workflow_models.py`: persistent workflow schema.
