# Healthcare experience and growth roadmap

## Current foundation

The active application starts at `src/main.tsx` → `src/App.tsx`.
It uses React, React Native Web, TypeScript, and Vite, with a separate
FastAPI backend. The visual system is the existing light Impilo Pearl theme.

The repository already contains student records, consultations, wellness,
device telemetry, campus operations, and clinician/admin claims tools.
`src/navigation/AppNavigator.tsx` is an additional navigator, but is not the
entry point mounted by `main.tsx`.

Many frontend modules use an in-memory store seeded from `mockData.ts`.
The presence of a feature screen or an API adapter does not establish a live
provider or insurer integration. The new UI keeps sample data explicit.

## Implemented in this iteration

### A connected entry experience

- New medical-metrics, care, and insurance landing page.
- Interactive health/insurance preview, direct demo entry, and mobile navigation.
- Pearl surfaces, indigo actions, and lavender, mint, and peach accents.
- Finite floating-card motion, animated chart strokes, staggered metric cards,
  and short view transitions, respecting `prefers-reduced-motion`.

### Student health overview

- Four sample metrics: resting heart rate, oxygen saturation, sleep, and steps.
- Reproducible, dated histories for 7, 30, and 90 days.
- Selectable charts, period averages, and accessible reading tables.
- A session-scoped care checklist, retained when switching dashboard tabs.
- Record counts and care activity from the existing store; care activity is
  filtered by the current student's ID.
- Links to the existing care directory, records vault, and wellbeing modules.

### Insurance hub

- A clearly labelled illustrative group policy with benefit explanations.
- Expandable sample claim timelines and document requirements.
- A validated estimator that applies exclusions, then co-pay, then the remaining
  coverage cap. It reconciles the insurer and out-of-pocket shares in paise.
- No insurer submission, purchase, or approval is represented as completed.

### Frontend scale and usability

- Removed artificial five-second waits in the active app and student dashboard.
- Top-level portals and heavy student tools are loaded on demand.
- Mobile bottom navigation plus an all-sections dialog with native focus trapping
  and Escape dismissal; desktop sidebar remains scrollable.
- Browser zoom is enabled.
- Primary healthcare screens use the new compact footer treatment; the original
  shared footer remains available for the other top-level screens.

## Recommended next development phases

### 1. A persistent, student-scoped health hub

Replace sample history through a typed health-history interface rather than
putting API calls inside individual cards. Include measurement value, unit,
recorded-at time, device/source, quality, and sync status. Build explicit loading,
empty, stale, and failure states before switching the UI to connected mode.

The existing `/api/telemetry/sensors` routes are a starting point, but the read
handler currently calls `list_telemetry(limit)` without passing the authenticated
student or tenant, and ingestion accepts `studentId` in the request. Establish
server-derived ownership and tenant filtering before connecting private records
to these views. Validate this with cross-student and cross-campus tests.

Persist records, checklist history, and appointments against stable user IDs.
Keep demo and authenticated workspaces explicit. Consolidate the two navigators
into a single URL-addressable route tree with refresh and back-button support.

**Exit criteria:** reload-safe data, dated source attribution, bounded/paginated
queries, and authenticated isolation tests for every student data read/write.

### 2. End-to-end care coordination

Build on the existing care directory and teleconsult catalogs:

- Provider availability and an actual appointment lifecycle.
- Booking, rescheduling, cancellation, and confirmation receipts.
- Care-team follow-ups, referral tracking, and prescribed care-plan tasks.
- Reminder preferences and delivery status.
- A single timeline linking the appointment, report, and follow-up.

**Exit criteria:** an appointment can be completed end to end, with idempotent
booking requests and an auditable status history.

### 3. Connected insurance services

Keep the student hub distinct from the existing administrator adjudication tools.
Introduce structured policy, benefit, network-provider, and claim resources.
Claims need stable student/tenant identifiers; matching names is not an ownership
boundary.

- Policy enrollment and versioned coverage terms.
- Verified network-hospital search and pre-authorisation requests.
- Claim document upload, completeness checks, and submission receipts.
- Insurer/TPA connectors with signed webhook verification and retry handling.
- A status timeline sourced from insurer events.
- A policy-driven estimator including actual sublimits and waiting periods.

**Exit criteria:** sandbox submissions round-trip to a verified status update;
estimates remain distinct from adjudicated decisions.

### 4. Multi-campus operational scale

- Index histories by tenant, patient, and recorded-at time.
- Move OCR, notifications, and insurer work to durable background jobs.
- Define idempotency keys and bounded retries for external side effects.
- Add cache policies, pagination, request tracing, and queue health metrics.
- Measure initial payload, route-load time, API latency, and task completion.
- Pilot with one campus and one provider/insurer integration before expansion.

This iteration improves the frontend product foundation. It does not claim a
load-tested production deployment or a live insurer/device connection.

## Verification

```sh
npm test
npm run lint
npm run build
```

A reusable browser smoke check lives at `tests/health-experience.smoke.mjs`.
It covers desktop/mobile navigation, chart filters and tables, checklist state,
claim expansion, estimator errors and limits, and reduced-motion behavior.

With Playwright and its Chromium browser already available, start the app using
`npm run dev`, then run:

```sh
node tests/health-experience.smoke.mjs
```

For an existing external installation, set `PLAYWRIGHT_MODULE` to its absolute
`playwright/index.mjs` path. `BASE_URL` overrides the local server address.
`SCREENSHOT_DIR` optionally saves screenshots to an existing directory.
