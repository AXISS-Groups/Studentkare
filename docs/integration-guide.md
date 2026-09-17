# Studentkare Integration Configuration Guide

This guide documents how to activate each externally-gated feature of the
platform. The application-side contracts, honest-state handling, scaffolding, and
tests are already in place; these integrations become live once the relevant
environment variables are configured and the matching endpoints are wired.

> **Principle:** The platform never fabricates a successful external action.
> When a provider is unconfigured, the UI and API return an explicit
> `unavailable` / `unconfigured` state instead of claiming success. Each section
> below lists the exact variables and the tests that verify the activation path.

## 1. Core runtime configuration (required)

| Variable | Purpose | Required |
|---|---|---|
| `APP_ENV` | `development` or `production`. Defaults to `development`. | In production |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` (or SQLite in dev). | In production (non-SQLite) |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins (e.g. `https://studentkare.in`). | In production |
| `OTP_HASH_SECRET` (or `JWT_SECRET`) | HMAC secret for OTP hashing. | In production |

**Production guard:** `backend/main.py` fails closed on startup if `OTP_HASH_SECRET`
and `DATABASE_URL` are missing/invalid. Verified by
`backend/tests/test_production_guard.py`.

```sh
APP_ENV=production DATABASE_URL=postgresql://... ALLOWED_ORIGINS=https://studentkare.in OTP_HASH_SECRET=...
```

## 2. OTP / notification delivery

| Variable | Purpose |
|---|---|
| `OTP_CHANNEL` | Default channel: `WHATSAPP` or `EMAIL`. |
| `OTP_LENGTH`, `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS` | Code policy. |
| `POSTAL_API_URL`, `POSTAL_SERVER_API_KEY`, `POSTAL_FROM_EMAIL`, `POSTAL_ENABLED` | Email via Postal. |
| `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`, `OPENWA_DEFAULT_COUNTRY_CODE`, `OPENWA_ENABLED` | WhatsApp via OpenWA. |
| `DEV_OTP_CONSOLE` | `true` prints OTP codes to logs in dev only. Never in production. |

Login recovery fallback only sends to a **server-stored verified `recovery_email`**,
never a client-supplied address. Set `recovery_email` in the account profile to use it.

## 3. Integrations health monitor

The scheduler (`services/workflow_scheduler.py`) probes configured services every
**2 hours (7,200s)** and reports honest status. Non-mutating probes only — it never
sends a real patient message as a test.

| Variable | Probed |
|---|---|
| `OPENWA_BASE_URL` | WhatsApp session reachability |
| `POSTAL_API_URL` | Email reachability |
| `POSTHOG_ENABLED` + `POSTHOG_HOST` | Analytics reachability |
| `FIREBASE_ENABLED` | Configured state |

Admin: `GET /api/ops/integration-health`, `POST /api/ops/jobs/{key}/run` ("Check now"),
`GET /api/ops/jobs`, `GET /api/agents/live-status`.

## 4. Payments (online checkout)

**Contract is complete; activate by configuring a provider.**

| Variable | Purpose |
|---|---|
| `PAYMENT_PROVIDER` | e.g. `razorpay`, `stripe`, `cashfree`. Presence enables checkout. |
| `PAYMENT_WEBHOOK_SECRET` | HMAC-SHA256 secret used to verify `x-webhook-signature`. |

Endpoints:
- `POST /api/orders/{id}/payment` — returns `configured: true` + `CREATED` when a
  provider is set, else `configured: false` + `UNAVAILABLE`.
- `POST /api/payments/webhook` — verifies the HMAC signature; rejects unsigned with
  401; settles the order to `PAID` on `payment.settled`/`payment.captured`.
- `GET /api/orders/{id}/payment` — status + payment history.

Wire a real provider adapter into `initiate_payment` (create a session and return a
checkout URL) and forward the provider's signed callback to `/payments/webhook`.
The idempotency key is already persisted on the `Payment` row.

Tests: `backend/tests/test_payments.py`.

## 5. Insurer eligibility & claims

**Contract is complete; activate by configuring an insurer integration.**

| Variable | Purpose |
|---|---|
| `INSURER_PROVIDER` | e.g. `tpa`, `insurer`. Presence enables eligibility checks and claim submission. |

Endpoints:
- `GET /api/insurance/eligibility?policyId=` — returns `UNAVAILABLE` (unconfigured)
  or runs a real eligibility check when a provider is set.
- `POST /api/insurance/claims/{id}/submit` — submits a prepared claim; stays
  `DRAFT` (not falsely submitted) when unconfigured.
- `POST /api/insurance/claims` — prepare a claim request (owner-scoped policy).

Wire a real eligibility/claims API into the two endpoints; the review-queue and
claim lifecycle are already persisted. Tests: `backend/tests/test_insurer.py`.

## 5. Live teleconsultation (WebRTC)

**Client + signalling contract are complete; activate by deploying a signalling server.**

| Variable | Purpose |
|---|---|
| `RTC_SIGNALLING_URL` | WebSocket/HTTP signalling server endpoint. Presence enables `liveMedia`. |
| `RTC_ICE_SERVERS` | JSON array of `RTCIceServer` (e.g. TURN). Falls back to a public STUN server. |

Endpoints:
- `POST /api/consultation/{id}/join` — student joins (confirmed appointment only).
- `POST /api/consultation/{id}/join-provider` — provider joins (scoped to their appointment).
- `POST /api/consultation/{id}/signal` — store a WebRTC offer/answer.
- `GET /api/consultation/{id}/signal` — fetch the peer's offer/answer.
- `GET /api/consultation/{id}/state` — `liveMedia` is `true` only when a session is
  IN_PROGRESS **and** `RTC_SIGNALLING_URL` is set.

The frontend (`VideoConsultationDialog`, `ProviderConsultationDialog`) creates a peer
connection and relays the offer/answer when `liveMedia` is true. Deploy the signalling
server to relay SDP/ICE between the two peers (e.g. Socket.IO + a TURN server for NAT
traversal). Tests: `backend/tests/test_consultation.py`, `src/lib/webrtc.test.ts`.

## 6. Native health integrations (HealthKit / Health Connect)

**Scaffolding is complete; activate by adding a native app bridge.**

The adapter `src/lib/nativeHealth.ts` detects platform (iOS/Android/web) and checks for
a native bridge (`window.nativeHealthBridge` or `window.ReactNativeWebView`). When a
React Native wrapper injects the bridge, `readRecent`/`requestPermission` become live.

To activate:
1. Add a native app target (React Native / Expo) that wraps the web build.
2. Implement the bridge exposing `requestPermission` and `readRecent` backed by
   HealthKit (iOS) or Health Connect (Android).
3. Set `window.nativeHealthBridge` before the app loads.

The Devices & Sensors screen reports "Unavailable (manual entry available)" until the
bridge is present. Tests: `src/lib/nativeHealth.test.ts`.

## 7. Pharmacy prescription review & substitution

**Requires a licensed review workflow (external).** The document intake assistant
(`rx_extractor_ai_agent.py`) now only returns items that genuinely appear in the
prescription text, marking dosage/frequency as `unknown` and `needs_review`. A real
pharmacist review + authorized-substitution console must be connected to that output;
Rx ordering currently fails closed (`requires_prescription` items return 409).

Tests: `backend/tests/test_security_fixes.py` (no invented fields).

## 8. Scheduled operations

The scheduler runs on the two-hour cycle:
- `integration_health`, `reminder_reconcile`, `document_intake_reconcile`,
  `knowledge_freshness`.

`services/workflow_scheduler.py` persists jobs (`care_scheduled_jobs`), runs
(`care_agent_runs`), and an outbox (`care_outbox_events`) for durable,
deduplicated delivery. Every job has a bounded, restart-safe lifecycle. A real
delivery adapter plugs into `_process_outbox` when a messaging provider is configured.

## 9. Observability & release gates

- **Secret scan**: `.gitleaks.toml` + `gitleaks-action` in CI.
- **Production build**: `npm run build` (step 5 of CI).
- **Production startup guard**: CI step 10.
- **Dependency audit**: `npm audit` (CI step 11).
- **Accessibility**: `src/lib/accessibility.test.ts` enforces focus-visible and
  accessible-name conventions.

## Environment variable reference

```
APP_ENV, DATABASE_URL, ALLOWED_ORIGINS, OTP_HASH_SECRET, JWT_SECRET,
OTP_CHANNEL, OTP_LENGTH, OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS, DEV_OTP_CONSOLE,
POSTAL_ENABLED, POSTAL_API_URL, POSTAL_SERVER_API_KEY, POSTAL_FROM_EMAIL,
OPENWA_ENABLED, OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID, OPENWA_DEFAULT_COUNTRY_CODE,
POSTHOG_ENABLED, POSTHOG_API_KEY, POSTHOG_HOST,
FIREBASE_ENABLED, FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, FIREBASE_VAPID_KEY, FIREBASE_SERVER_KEY,
LLM_ENABLED, LLM_PROVIDER, LLM_API_KEY, LLM_MODEL,
PAYMENT_PROVIDER, PAYMENT_WEBHOOK_SECRET,
INSURER_PROVIDER,
RTC_SIGNALLING_URL, RTC_ICE_SERVERS,
TWOFA_ENFORCED_ROLES, TWOFA_ISSUER
```

## Verification checklist after configuring

- `APP_ENV=production` starts only with `OTP_HASH_SECRET` + a real `DATABASE_URL`.
- `GET /api/ops/integration-health` reports real reachability (no fake "online").
- Payments: `POST /api/orders/{id}/payment` returns `CREATED`; unsigned webhook → 401;
  signed `payment.settled` → order `PAID`.
- Teleconsult: join → join-provider → `liveMedia` true when `RTC_SIGNALLING_URL` set;
  offer/answer relayed via `/signal`.
- Native health: Devices screen shows "Available" only when a bridge is injected.
- Pharmacy: Rx extraction never invents doctor/dosage/date.
- `npm run build`, `npm run lint`, `npm test`, `pytest` all pass.

## 10. Self-contained features (no external dependency)

The following features are fully functional without any external provider and are
covered by the application's own tests:

- **Approved knowledge + read-only care navigator** — `POST /api/care/navigate`
  answers from reviewed, versioned, expiring `KnowledgeSource` records with
  citations, or refuses honestly. `POST /api/ops/knowledge` publishes sources.
  Tests: `backend/tests/test_knowledge.py`.
- **Document intake + review queue** — uploads auto-queue extraction
  (`/intake/{id}/process`); extracted fields go to a super-admin review queue
  (`/ops/intake/review`) with approve/reject. Extraction never invents a field.
  Tests: `backend/tests/test_document_intake.py`.
- **Agent evaluation** — `GET /api/ops/agent-eval` measures grounding, refusal,
  isolation, latency, cost proxy, and recovery for the navigator.
  Tests: `backend/tests/test_agent_eval.py`.
- **Care-request follow-up worker** — the 2-hour `care_followup` job opens
  deduplicated follow-up tasks for requests unfulfilled >48h; staff resolve them.
  Tests: `backend/tests/test_followup.py`.
- **Inventory & serviceability** — `POST /api/cart/validate` revalidates a cart
  against live stock and pincode serviceability before ordering.
  Tests: `backend/tests/test_inventory.py`.
- **Clinician encounter notes** — staff author SOAP drafts and finalize them.
  Tests: `backend/tests/test_encounter.py`.
- **Appointments & teleconsult state** — booking, confirmation, and an honest
  waiting-room/signalling contract. Tests: `backend/tests/test_appointments.py`,
  `backend/tests/test_consultation.py`.

## 11. Completion status

**96 of 100 planned features are complete.** The 4 remaining items all require
external resources that cannot be provisioned from code alone:

| Item | External requirement |
|---|---|
| Payments (F087) | A real payment provider credential + signed webhook receiver. |
| Pharmacy review (F085) | A licensed review/substitution workflow. |
| Live WebRTC media (F068) | A deployed signalling server (`RTC_SIGNALLING_URL`) + TURN relays. |
| Native pedometer/OS sync (F094) | A native app bridge (React Native / Expo target). |

Each has its contract, honest-state handling, scaffolding, and tests in place and
activates cleanly once the external dependency is configured (see sections 4–7).

## 12. APILayer Data Products Integration Suite (apilayer.com)

**Contract is complete; activate by configuring `APILAYER_API_KEY`.**

| Variable | Purpose | Supported Microservices |
|---|---|---|
| `APILAYER_API_KEY` | Unified API Key for APILayer marketplace. | Numverify, Mailboxlayer, Positionstack, pdflayer, Bad Words, Weatherstack, Fixer, Languagelayer, Freegeoip, REST Countries, Resume Parser |

Endpoints:
- `GET /api/apilayer/status` — Returns integration status (`active` or `unconfigured_fallback`) and list of supported microservices.
- `GET /api/apilayer/numverify?phone=` — Carrier, line type, and international phone validation.
- `GET /api/apilayer/mailboxlayer?email=` — Email deliverability scoring, syntax validation, and disposable email detection.
- `GET /api/apilayer/positionstack?query=` — Forward/reverse spatial campus geocoding.
- `POST /api/apilayer/pdflayer` — High-fidelity HTML-to-PDF generation for SOAP notes and Emergency Cards.
- `POST /api/apilayer/badwords` — Content moderation & profanity filtering.
- `POST /api/apilayer/resume-parser` — Student applicant resume parsing.
- `GET /api/apilayer/weatherstack?query=` — Campus weather & AQI health advisories.
- `GET /api/apilayer/fixer?amount=&from_curr=&to_curr=` — Real-time currency conversion.

Tests: `backend/tests/test_apilayer_service.py`.

