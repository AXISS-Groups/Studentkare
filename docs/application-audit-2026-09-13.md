# Studentkare application audit — 13 September 2026

## Executive assessment

**Prioritize trustworthy data, authorization, and durable workflows before adding more agents.**

The application has a useful persistent core: account sessions, personal records,
manual readings, catalog management, server-priced order requests, and provider
fulfilment. It also mounts prototype features that return fabricated clinical
findings, dispatch confirmations, and agent activity alongside that core.
Several serious access-control and identity-verification issues are reproducible.
The present implementation is not ready for handling real clinical workflows.

More specialist names, a larger swarm, or additional frontend timers will not fix
these gaps. Build one small, observable backend workflow runtime and connect a few
well-defined capabilities to it.

### Scope and evidence

- Reviewed the active entry point, routes, UI/data stores, mounted FastAPI routes,
  authentication, integrations, database models/migrations, agent services,
  deployment configuration, CI, and representative tests.
- Ran frontend build/lint/unit tests and the backend tests with isolated storage.
- Ran browser layout/interaction checks using synthetic API fixtures; attempted
  the existing real HTTP/database workflow smoke test.
- Reproduced critical authorization, fallback-authentication, shared-state, and
  secret-response issues with synthetic accounts and an in-memory database.
- No production database, real patient records, partner systems, or deployment
  credentials were exercised. An embedded source credential was identified but
  its validity was not tested; its value is intentionally omitted here.
- This is repository-wide architectural coverage with targeted execution, not a
  claim that every screen, API branch, or deployment configuration was tested.

## 1. Verification results

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run build` | Passed | TypeScript compilation and Vite production bundle |
| `npm run lint` | Passed | Current frontend lint rules |
| `npm test` | 251 passed across 18 files | Existing unit suite; some tests only validate fixtures or source strings |
| Backend pytest, isolated storage | 80 passed, 3 deprecation warnings | Existing backend tests under the installed local environment |
| Browser UI fixture checks | Passed, 18 route/viewport combinations | Marketplace/login/signup at 320/390/768px; records/orders/support at 320/390/1440px; no horizontal overflow in these cases |
| Additional browser interactions | Passed | Service shortcuts, search reset, cart Escape dismissal, appearance switch, saved reduced-motion preference, carousel pause, mobile active navigation, menu Escape, OS reduced motion |
| Existing `tests/workflow.smoke.mjs` | **Failed** | Registration did not reach the health overview; screenshot showed “You’re already signed in” on the sign-in route |
| `npm audit --omit=dev --audit-level=high` | **Failed** | 10 dependency findings: 1 high, 9 moderate; affected chain includes Firebase/Undici |
| Isolated audit probes | **Confirmed defects** | Unlinked fallback-email login, public approvals/donors, student approval, shared medications, raw secret response, production demo seeding |

Backend test command:

```sh
DATABASE_URL='sqlite:///:memory:' OLLAMA_URL='' SMTP_HOST='' \
OPENWA_BASE_URL='' POSTAL_API_URL='' PYTHONPATH=backend \
backend/.venv/bin/pytest backend/tests -q
```

The installed backend differs from `requirements.txt`: locally FastAPI 0.141.1,
Pydantic 2.13.5, and Python 3.14 were used, while the Docker configuration uses
Python 3.11 with older pins. The passing local test run does not establish that
the declared Docker dependency set passes. A clean, pinned CI/container run is
still required. Python dependency vulnerability scanning and production load
testing were not performed.

## 2. Findings, ordered by priority

P0 = block a real-user release until addressed. P1 = next engineering phase.
P2 = follow-on hardening/scale work. These are remediation priorities, not CVSS scores.

### F01 — P0: An unlinked fallback email can authenticate a phone account

**Reproduced with `APP_ENV=production`.**

`backend/services/workflow_auth.py:228–307` accepts a client-supplied
`fallbackEmail`. When WhatsApp delivery fails, it sends the login code to that
address while creating the challenge for the original phone identity. It does
not verify that the email belongs to that account.

The isolated test used an existing synthetic phone account, failed the WhatsApp
delivery boundary, and supplied a different test inbox. Verifying that inbox's
code established the original account's `SUPER_ADMIN` session. This requires the
fallback delivery path to be available and no effective second-factor block.

**Required:** use only an already verified, server-stored recovery address for
login fallback. Establish new recovery addresses through a separate verified
flow. Add takeover-regression tests for signup, login, recovery, and 2FA.

### F02 — P0: A database credential is embedded in tracked source

**Code confirmed; credential validity not tested.**

`backend/services/db_sql.py:23–31` contains a credential-bearing PostgreSQL URL
as a DNS-dependent fallback. `git ls-files` confirms the file is tracked.

**Required:** rotate/revoke the credential if it is active, replace the fallback
with validated environment/secret-manager configuration, and enable repository
secret scanning. Removing the literal alone does not revoke it. Coordinate any
history cleanup after rotation; do not rewrite shared history casually.

### F03 — P0: Approval actions lack clinician authorization and persistence

**Reproduced.**

- `backend/services/workflow_api.py:752–765`: pending approvals are public;
  approval mutation requires only any authenticated account.
- `backend/services/agents/hitl_approval_agent.py:25–80`: approvals are a global
  sample list; an unknown action ID returns success.
- The route reads `full_name`, but authenticated payloads expose `fullName`;
  the fallback therefore attributes approval to a fixed doctor name.

An ordinary synthetic student received HTTP 200/SUCCESS for a nonexistent action.

**Required:** a persistent approval record with actor ID, patient/tenant scope,
payload version/hash, expiry, and allowed state transitions. Require an authorized
clinician assigned to the case. Fail unknown/stale actions. Bind approval to the
exact executable proposal and revalidate it at execution time.

### F04 — P0: Public donor directory exposes registered contact/location data

**Public access reproduced; data path confirmed.**

`backend/services/workflow_api.py:626–644` appends submitted donor information,
then exposes the donor list without authentication. The registry contains name,
phone, blood group, and hostel information
(`backend/services/agents/blood_emergency_agent.py:12–58`).

**Required:** account- and campus-scoped persistence, explicit donor visibility
consent, restricted coordinator access, contact relay instead of public phone
disclosure, and withdrawal/update support. Test both anonymous and cross-campus reads.

### F05 — P0: Fabricated clinical output is presented as assessed or measured

**Code confirmed on mounted routes.**

- `backend/services/agents/triage_council_agent.py:38–110` returns predetermined
  physician/pharmacist assessments, a fixed 95.8 trust score, and statements that
  no acute crisis or drug interaction was found without those assessments.
- `backend/services/agents/rx_extractor_ai_agent.py:43–100` invents doctor/date and
  dosage/frequency values; on no match, it can return the first catalog item.
- `src/components/health/CameraSkinAndVitalsScannerModal.tsx:71–139` randomizes
  physiological readings and offers to save them. The corresponding route stores
  the submitted reading with source `CAMERA_RPPG`
  (`backend/services/workflow_api.py:768–814`).

**Required:** separate demo data from patient records; disable inferred medical
measurements that have no validated sensor pipeline. Represent missing evidence
as unknown. For extraction, preserve original text/page provenance and require
review of medication, dose, strength, and frequency. Use a deterministic emergency
escalation gate before any model-assisted educational response.

### F06 — P0: Medication state is shared between accounts

**Reproduced.**

`backend/services/agents/medication_adherence_loop_agent.py:31–79` uses one mutable
`DEMO_MEDS` list for every user. Logging a dose for synthetic user A changed the
schedule returned to synthetic user B. State disappears on process restart;
repeated completion can report repeated rewards without a ledger.

**Required:** owner-scoped medication plans, dose occurrences, dose logs, and an
idempotent reward ledger. A reminder must never imply a dose was taken. Medication
instructions must originate from a verified plan rather than seeded defaults.

### F07 — P0: 2FA and deployment defaults do not provide reliable protection

**Code confirmed; production seeding reproduced.**

- `backend/services/twofa_store.py:13–16,48–63`: enabled factors and pending
  challenges are process-local dictionaries. Restart loses enabled factors;
  different workers disagree on whether 2FA is required.
- `backend/services/integration_config.py:48–50` advertises enforced roles, but
  `workflow_auth.py:293–299` checks only `is_enabled(account.id)`.
- `backend/main.py:31–39` calls `seed_demo_data()` at startup. The service function
  has no production environment guard despite its docstring. The separate CLI
  guard tested in `test_seed_demo.py:57–63` does not protect startup.
- `docker-compose.yml:9–12` defaults to development; the development OTP master
  code is enabled by default in `workflow_auth.py:167–175,281–283`.
  The master-code shortcut is blocked when `APP_ENV` is exactly `production`.

**Required:** durable encrypted factor storage, replay/attempt controls, server-
enforced privileged-role enrollment, fail-closed production configuration, and
explicit opt-in demo seeding. Test the actual production startup path, not only
the seed CLI. Do not assume a production-mode label disables all sample services.

### F08 — P1: Secret masking retains the original secret; configuration can lie about saving

**Raw-secret behavior reproduced; persistence path code confirmed.**

`backend/services/integration_config.py:113–119` includes each original field and
adds a masked companion. Consequently the admin API still returns the secret.
This endpoint is admin-restricted; this is not a claim of public key exposure.
The public Firebase/PostHog client configuration is a separate, intentional path.

The same module stores secret-bearing dictionaries as plain database JSON and
catches save failures (`85–101`). `integrations.py:53–66` can then return success
even though persistence failed.

**Required:** write-only secret fields with a replacement/clear protocol, encrypted
storage or secret references, typed provider configuration, transactional saves,
and an error result when persistence fails. Validate destinations and restrict
outbound integration calls to intended provider hosts.

### F09 — P1: Booking and messaging confirmation is simulated, not transactional

**Code confirmed on mounted booking/SOS routes.**

- `workflow_api.py:578–588` neither persists the booking nor validates the supplied
  catalog item against provider availability.
- `phlebotomist_dispatch_agent.py:79–106` selects from a fixed pool and returns
  `CONFIRMED_DISPATCHED` without reserving capacity or contacting a provider.
- `blood_emergency_agent.py:77–96` reports SMS/WhatsApp delivery without sending.
- The standalone `n8n_dispatch.py:28–38` reports success on its fallback without
  executing a local handler. This dispatcher is not wired into the mounted flow.

**Required:** reuse the real order/request state machine, persist slot reservations,
add an outbox, authenticate provider webhooks, and record actual delivery receipts.
Expose requested/queued/accepted/delivered/failed distinctly. An AI summary cannot
constitute a booking, dispatch, or notification receipt.

### F10 — P1: “Running agents” and monitoring dashboards are not runtime evidence

**Code confirmed; visible in the marketplace.**

- `workflow_api.py:667–728` returns hard-coded active tasks and statuses.
- `DiseaseAwarenessHub.tsx:218–224` refreshes a timestamp after 900 ms; it does not
  perform a scout. Its AQI/water/outbreak values are static (`281–308`).
- `backend/services/agents/ai_observability.py:21–29` returns fixed token usage,
  request volume, and health score.
- `src/ai/multiAgentLoopOrchestrator.ts:31–82` returns a scripted list of purported
  tool calls and a successful fulfilment claim without executing the tools.

**Required:** server-derived run history and explicit unavailable/demo/stale
states. Persist run ID, agent version, input references, status, step events,
tool results, timings, failure code, and resource usage. Never manufacture
successful telemetry when a dependency is absent.

### F11 — P1: There is no connected durable execution path for the generic loop runtime

**Reachability review.**

The repository contains `job_runner.py`, `llm_gateway.py`, `n8n_dispatch.py`, and
`rag_vector_store.py`, but no callers/imports were found connecting those service
instances to the mounted application. `main.py` does not start/stop the job runner.

`agent_scheduler.py:59–95` has a process-local lock/state; its `start()` only sets
flags. Its tasks are talent/jobs/hygiene/QA rather than the advertised four-hour
campus-health scout. `job_runner.py:39–58` has one interval job; the nominal daily
audit would run on each cycle, not on a distinct daily trigger.

**Required:** one dedicated worker/scheduler, persisted runs, leases to prevent
duplicate executions, restart recovery, bounded retries, cancellation, and a real
dead-letter queue. Add budgets and a kill switch at the server execution boundary.
Do not start one scheduler in each web worker.

### F12 — P1: Frontend navigation and data sources are fragmented

**Smoke-test failure plus source evidence; root cause of handoff failure still needs isolation.**

- The registration smoke test stopped on an already-signed-in screen instead of
  reaching the health overview. Inspect `src/App.tsx:25–37` and the auth success
  handoff in `AuthenticatedFlowScreen.tsx`; add a regression test before changing it.
- `MemberPanels.tsx:40–43` passes legacy dashboard tab IDs through `as any` into
  `navigate()`. `HealthOverview.tsx` emits `vault`, `wellbeing`, `exercises`, and
  `devices`; those are absent from the active `routePaths` in `workflowRouting.ts:3`.
  Unknown routes resolve to the shop.
- `AppStoreProvider` initializes from `mockData.ts` (`src/data/store.tsx:57–77`)
  while active panels also use account-owned API resources. It is not reset by
  account changes in `App.tsx`, unlike the exercise provider.
- `src/data/api.ts:7` defaults to `http://localhost:8000/api`, while `http.ts:4`
  defaults to `/api`. The browser check observed failed direct public-config calls
  alongside proxy-based requests.

**Required:** typed route adapters, one canonical API client, explicit demo mode,
account-keyed client caches, and one source of truth per feature. Add back/forward,
refresh, login return-path, and cross-account cache tests. Provide route-level
error boundaries and recovery UI for lazy-load/render failures.

### F13 — P1: Passing tests are not sufficient release evidence

**Confirmed by execution and CI/source review.**

`src/ai/__tests__/architecture_boundaries.test.ts:12–43` tests hard-coded arrays
and strings instead of inspecting real imports or executing forbidden access.
`assertRule()` only validates that a rule ID exists
(`src/ai/constitution.ts:193–198`); it does not enforce the rule.

`.github/workflows/ci.yml` runs type/lint/unit checks but not the browser workflow,
production build, migrations, dependency auditing, or production startup tests.
Knip is explicitly non-blocking. The npm dependency audit currently reports a
high-severity advisory in the dependency tree; browser-runtime exploitability
has not been established by this scan alone.

**Required:** negative authorization tests for every sensitive endpoint, meaningful
agent refusal/provenance tests, integration restart/concurrency tests, pinned clean
environment checks, and CI browser gates. Add secret/dependency scans and prioritize
reviewed dependency updates. Test declared versions, not just the existing venv.

### F14 — P1/P2: Persistence, tenancy, and deployment need a production lifecycle

**Configuration/schema review; infrastructure controls not verified externally.**

- Startup uses `Base.metadata.create_all()` (`db_sql.py:83–87`). Alembic's environment
  imports the legacy models only (`backend/alembic/env.py:13–22`), and the sole
  migration creates legacy tables rather than the active `care_*` workflow schema.
- Active account/document/order models have account ownership but no explicit
  organization membership model for a multi-campus permission boundary.
- Documents are stored as raw database blobs (`workflow_models.py:66–75`);
  application-level encryption, retention orchestration, and malware quarantine
  are not present on the reviewed upload path. Storage-provider encryption may
  exist outside this repository and was not assessed.
- Compose has no worker, health checks, or backup/restore job. Nginx has no
  repository-defined TLS termination or CSP policy; these may be supplied by
  external deployment infrastructure. The API uses one configured DB role, not
  demonstrated clinical/operational database-role isolation.

**Required:** versioned migrations for active models, production PostgreSQL checks,
explicit campus membership/permissions, encrypted private object storage when
needed, backup/restore drills, health/readiness checks, and verified TLS/security
headers. Add account deletion/export and consent-revocation lifecycles before
connecting patient records to external care providers.

### F15 — P2: RAG/model adapters need consolidation and honest evaluation

**Source review of currently disconnected infrastructure.**

`src/ai/agenticRAGEngine.ts:79–107` uses query length to construct a pseudo-vector
and claims fixed retrieval accuracy. `backend/services/universal_rag_engine.py`
returns an alumni-mentoring answer regardless of query. The separate vector store
has real-network scaffolding but can mix hash vectors and model embeddings, and
its `_cosine()` is an unnormalized dot product over zipped vectors.

`llm_gateway.py:46–62` calls a synchronous 60-second HTTP client from an async
method. Its model configuration is environment-based, separate from saved admin
provider configuration. These become runtime problems if the adapters are connected
without repair; they are not established causes of current request latency.

**Required:** one configured model gateway, async/time-bounded calls, structured
outputs, approved and versioned source documents, source access control, consistent
embedding model/dimension, and a measured retrieval/evaluation set. Return no-answer
when evidence is insufficient. Treat retrieved instructions as untrusted content.

### F16 — P2: Documentation and specialist UI still overstate capabilities

`ARCHITECTURE.md` calls several services integrated/autonomous; the inspected
implementation does not support all those claims. `docs/implementation-status.md`
says startup has no demo seed and prototypes are not mounted; current code contradicts
both statements. Update feature status from actual reachable implementation.

The shared indigo surfaces were improved in this session, but specialist widgets
still contain inline colors, emoji-plus-icon labels, dense tool lists, and custom
modal implementations. For example, `HealthOverview.tsx:69–139` has a crowded
tool strip and a fixed 320px minimum widget width. Continue migrating those widgets
to shared themed components, responsive grids, native dialogs, keyboard focus
management, and accessible live status announcements.

## 3. What already works and should be retained

- Database-backed, revocable, HTTP-only sessions and server-derived role values.
- HMAC-hashed OTPs, attempt limits, expiry, and single-use challenges/grants.
- CSRF validation and origin checks on the authenticated mutation dependency.
- Account-owned manual readings and document upload/download/delete paths.
- File size/signature validation and safe attachment download handling.
- Authoritative catalog prices, conditional inventory reservation, per-account
  idempotency keys, and allowed provider status transitions
  (`workflow_api.py:344–453`).
- Lazy-loaded route screens, accessible empty/loading/error states, and persistent
  exercise preferences/session storage.
- Useful unit/API test scaffolding and an isolated real-workflow browser test.

Extend these patterns to the later-added features rather than creating parallel
stores, alternate authorization systems, or more independent agent frameworks.

## 4. Agent inventory: keep, consolidate, or replace

| Existing capability | Actual implementation inspected | Recommended direction |
| --- | --- | --- |
| Triage council | Template/keyword response with fixed confidence | Replace with bounded, evidence-backed educational triage; deterministic crisis escalation; clinician review where appropriate |
| SOAP generator | Formatting/template service | Keep as a draft-only feature; tie to real encounter, approved source notes, and clinician attribution |
| Prescription extractor | Keyword matches, invented defaults | Replace with extraction with source spans and explicit unknown fields; clinician/pharmacy validation |
| HITL approval | Public list + globally mutable sample actions | Build a persistent authorization/state-machine service; this is not an LLM agent |
| Medication loop | Shared sample medication list | Replace with account-owned plans plus a deterministic reminder worker |
| Lab dispatch | Fixed technician pool and synthetic dispatch status | Build capacity/booking/provider workflow; optional AI assists only with summaries |
| Blood SOS | In-memory directory; simulated delivery | Build restricted consent-based matching and auditable notification delivery |
| Four-hour disease scout | UI timestamp refresh and fixed values | Defer until real approved feeds/sensors and campus aggregation boundaries exist |
| Multi-agent swarm/ReAct | Scripted steps and claims of tool execution | Retire from connected mode; use one bounded executor with real tools |
| Generic scheduler | In-memory task state; disconnected runner | Consolidate under one durable worker/scheduler |
| RAG services | Multiple inconsistent simulated/partial implementations | Consolidate one source-controlled, evaluated retrieval service |
| AI observability/circuit breakers | Fixed counters/process-local state | Derive from actual run events and enforce limits server-side |

## 5. What to add — in dependency order

### Foundation: one backend workflow runtime

Suggested deployment shape: **existing React application + existing FastAPI
modular backend + PostgreSQL + one dedicated worker**. Add a queue or durable
workflow system only to satisfy measured scheduling/recovery requirements. A
Redis-backed queue is a reasonable option when retries and throughput justify it;
it is not necessary to introduce multiple orchestration products or microservices.

Minimum persisted entities:

- `agent_runs`: owner/tenant, workflow version, input references, state, deadline,
  cancellation, budget, and idempotency key. Extend the existing legacy `agent_runs`
  concept only after its migration/access path is reconciled.
- `agent_steps` and `tool_executions`: validated inputs, redacted outputs, errors,
  timing, execution receipt, retry count, and provider reference.
- `approval_requests`: payload version/hash, reviewer identity, scope, decision,
  expiry, and audit event.
- `outbox_events` and `delivery_attempts`: durable dispatch intent and provider
  acknowledgement; deduplicate externally visible side effects.
- `source_documents`: provenance, revision, checksum, access scope, consent,
  retention/expiry, and ingestion state.

Run lifecycle:

```text
queued → running → waiting_for_approval → running → succeeded
                  ↘ rejected / expired
         ↘ retry_wait → running
         ↘ failed / cancelled
```

Every agent/tool execution needs:

1. Server-derived user/tenant identity and a minimal tool allowlist.
2. Schema-validated input/output and evidence/provenance requirements.
3. Maximum steps, per-tool deadline, overall deadline, token/cost budget, and
   explicit maximum retries. Initial limits should be configuration, then tuned
   from evaluation; never an unbounded “run until done” loop.
4. Idempotency and a lease/checkpoint before/after external side effects.
5. Circuit breaker, cancellation, and an administrative kill switch.
6. Redacted operational tracing: action/result summaries, source references,
   decisions, latency, and cost. Do not store private reasoning or raw patient
   content as routine telemetry.
7. Human authorization for actions that require it, enforced at the tool boundary.

### First useful assistants and workers

| Priority | Capability to add or rebuild | Trigger | Why it is useful | Acceptance condition |
| --- | --- | --- | --- | --- |
| 1 | Integration health monitor | Scheduled HTTP/service checks | Replaces invented “online” statuses | Failure/staleness shown from real probes; alerts deduplicated; no LLM needed |
| 1 | Document intake assistant | Record upload | Extracts document type/date and draft structured fields | Malware/type checks, source page/span references, review on uncertainty, owner isolation |
| 1 | Notification/reminder worker | Due reminder or outbox event | Reliable appointment and verified medication-plan reminders | Survives restart, honors consent/quiet hours, bounded retries and actual delivery receipts |
| 2 | Care-request follow-up worker | Request state/SLA event | Highlights unconfirmed bookings and missed follow-ups | Reads real request state; creates tasks, never fabricates booking acceptance |
| 2 | Read-only care/support navigator | User request | Explains available services, records workflow, and support procedures | Authorized retrieval, source citations, escalation on uncertainty, no autonomous prescribing |
| 2 | Clinician document/encounter summarizer | Explicit clinician request | Produces a reviewable draft from authorized records | Every important claim grounded in source; no new findings invented |
| 3 | Knowledge freshness worker | Schedule/feed revision | Keeps approved health information current | Versioned sources, expiry checks, reviewer approval before publishing clinical updates |
| 3 | CI regression assistant | Pull request/CI failure | Groups failures and proposes fixes | Runs real checks in a sandbox; never substitutes its opinion for test results or merges automatically |

Most recurring “loop agents” above should be ordinary deterministic jobs. Use an
LLM only for extraction, summarization, or language understanding where measured
quality warrants it. Add a multi-agent supervisor only after a single tool-using
assistant proves insufficient on an evaluation set.

### Product/backend work independent of AI

- Verified campus membership and clinician/provider onboarding.
- Appointment capacity, rescheduling, cancellation, and actual provider acceptance.
- Notification preferences, reliable delivery history, and an accessible inbox.
- Consent-bound sharing, export/deletion, and retention for personal records.
- Operational pagination, auditable support ownership, and request SLA tracking.
- Genuine partner adapters for labs/pharmacy/ABDM/insurer services only when the
  integration requirements and access are available. Display unavailable states
  until connected; names in a catalog do not establish accreditation or integration.
- If online commerce is intended: provider-backed payments, signed webhook
  verification, reconciliation, refunds, and receipts. Current core order requests
  do not collect payment and should remain explicit about that.
- For sensitive files at scale: private object storage, key management, scan/
  quarantine stages, short-lived access, and tested restore procedures.

## 6. Phased implementation backlog

### Phase A — Release blockers

Fix F01–F07; rotate the embedded credential if valid; constrain secret responses;
remove simulated medical/dispatch claims from connected mode. Repair the auth
handoff and typed route mappings. Make a production startup and sensitive-endpoint
negative test suite mandatory.

**Exit:** no unlinked recovery login; no public donor/approval data; students cannot
approve clinical actions; no cross-user dose state; MFA survives restart; no demo
admin created in production; no invented readings persisted as measured data.

### Phase B — Reliable core workflows

Unify API/client state, migrate active tables, establish tenant membership, persist
appointments/approvals/medication plans, add the outbox/worker, and derive real
integration status. Complete the real signup → request → provider → records flow.

**Exit:** integration outage, duplicate event, process restart, rejected approval,
and cross-account tests all pass without duplicate or false-success actions.

### Phase C — Small, measurable AI rollout

Start with document intake and a read-only support/care navigator. Add validated
source retrieval, output schemas, run budgets, tool allowlists, source citations,
and clinician-reviewed evaluations. Consolidate the existing gateway/RAG code.

**Exit:** evaluated unsupported-answer rate, provenance coverage, refusal behavior,
latency/cost budgets, and failure recovery meet agreed thresholds.

### Phase D — Operations and scale

Backups/restores, production database concurrency tests, dependency/secret gates,
observability/SLOs, accessibility coverage for remaining specialist modals, and
actual partner integrations. Consider additional agents only from measured user
needs and demonstrated quality improvements.

## 7. UI work completed alongside this audit

- Added shared indigo light/midnight surfaces in `src/theme/indigo.css` and aligned
  semantic tokens and logo contrast.
- Refined marketplace hero, service shortcuts, category icons, search controls,
  active navigation, forms, cards, and dialog styling.
- Consolidated utility actions into a tools menu and simplified the compact
  emergency strip while keeping its emergency call action accessible.
- Added consistent button/hover/entry motion, larger interactive controls, mobile
  navigation state, and Escape behavior for workspace navigation.
- Connected carousel/reveal behavior to the app's reduced-motion setting and
  added explicit promotion playback controls.

These are implemented UI changes. The audit remediation and proposed new runtime/
agents above are recommendations, not features implemented during this audit.
