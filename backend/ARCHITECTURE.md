# Studentkare Backend — Architecture Guide

> Single-file reference for anyone working on the backend. Read this before touching
> any service or agent module. Last verified: September 2026.

---

## 1. Overview

Studentkare is a student-owned health records platform for Indian college campuses.
The backend is a **FastAPI + SQLAlchemy (PostgreSQL prod / SQLite dev)** monolith
serving both the React web app and a future React Native mobile app.

**What it does today**: Auth, health data CRUD, document management, pharmacy catalog
and ordering, lab appointment booking, teleconsultation sessions, insurance claims,
medication tracking, blood donor SOS matching, and operational admin.

**What it does NOT do today**: No real LLM/AI calls. No background processing.
No real-time messaging. No ABDM integration. All "AI agents" are deterministic
stubs or regex-based extractors.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.111 + Pydantic 2.8 |
| ORM | SQLAlchemy 2.0 (mapped_column style) |
| Database | PostgreSQL 15 (prod) / SQLite (dev) |
| Auth | Session cookie (`sacare_session`), HMAC-signed OTP, CSRF token |
| Background | APScheduler 3.10 (5 periodic jobs, serial, single-process) |
| Payments | Razorpay (prod-ready), Stripe (stubbed) |
| Notifications | Outbox pattern (`care_outbox_events`), Postal email (stubbed) |
| Python | 3.11 |
| Tests | pytest (52 test files) |

---

## 2. Directory Structure

```
backend/
├── app/
│   └── main.py                 # FastAPI app, lifespan, CORS, middleware, router mounts
├── core/
│   ├── workflow_models.py       # ALL SQLAlchemy models (~504 lines, 35 tables)
│   ├── medication_catalog.py    # Medication name catalog for Rx extraction
│   ├── code_sentinel_portfolio.py  # Code Sentinel product portfolio + governance tiers
│   └── (32 more utility modules)
├── services/
│   ├── workflow_api.py          # MAIN ROUTER (~2347 lines, ~110 endpoints)
│   ├── workflow_auth.py         # Auth: OTP, session cookie, RBAC guards
│   ├── workflow_scheduler.py    # Durable background job runner (DB-polling)
│   ├── db_sql.py                # SQLAlchemy engine, SessionLocal, Base
│   ├── llm_gateway.py           # httpx.Client → Ollama (the ONLY blocking call)
│   ├── integrations.py          # Firebase, OpenWA, Postal email integration endpoints
│   ├── billing.py               # Billing/pricing endpoints
│   ├── member_profile_api.py    # Student profile management
│   ├── preventive_care.py       # Preventive care recommendations
│   ├── apilayer.py              # Numverify, Weatherstack, etc. proxy
│   ├── otp_delivery.py          # OTP dispatch (console/Email/SMS)
│   ├── notification_worker.py   # In-memory demo notification worker
│   ├── payment_gateway.py       # Razorpay/Stripe payment processing
│   ├── pharmacy_review.py       # Prescription review workflow
│   ├── document_intake.py       # Document processing pipeline
│   ├── knowledge.py             # Knowledge source management
│   ├── clinical_assist.py       # Clinical decision support (stubbed)
│   ├── movement_sync.py         # Health data sync with wearables
│   ├── n8n_dispatch.py          # n8n workflow dispatch (stubbed)
│   ├── rag_vector_store.py      # RAG vector store (demo, no embeddings)
│   ├── universal_rag_engine.py  # RAG engine (template-based, no retrieval)
│   ├── security_scanner.py      # ClamAV virus scanner integration
│   ├── code_sentinel_scanner.py # Code Sentinel security scanner
│   ├── ai_client.py             # AI client wrapper (in-memory demo state)
│   ├── agent_eval.py            # Agent evaluation harness
│   ├── abdm_gateway.py          # ABDM gateway (stubbed, no real API calls)
│   ├── repository.py            # Generic repository pattern
│   ├── profile_service.py       # Profile management service
│   ├── stores.py                # In-memory stores for demo state
│   ├── twofa_store.py           # Two-factor auth store
│   ├── agent_scheduler.py       # Multi-agent recurring cycle (disconnected)
│   ├── job_runner.py            # APScheduler-based job runner (disconnected)
│   ├── integration_config.py    # Integration settings persistence
│   ├── demo_seed.py             # Demo data seeder
│   ├── seed.py                  # Production seed data
│   ├── migrations.py            # Alembic migration runner
│   └── slack_notifier.py        # Slack ops alert integration
├── agents/                      # ← This is services/agents/
│   ├── __init__.py              # Re-exports 7 agent singletons
│   ├── blood_emergency_agent.py
│   ├── medication_adherence_loop_agent.py
│   ├── triage_council_agent.py
│   ├── rx_extractor_ai_agent.py
│   ├── soap_notes_agent.py
│   ├── hitl_approval_agent.py
│   ├── medical_guard.py
│   ├── (23 more — see Section 6)
│   └── ...
├── scripts/
│   └── workflow_worker.py       # CLI to run workflow_scheduler in finite passes
├── config/
│   ├── requirements.txt         # Production dependencies
│   ├── requirements-dev.txt     # Dev/test dependencies (inherits requirements.txt)
│   ├── .env.example             # Environment variable reference
│   └── .env.workflow.example    # Workflow-specific env vars
├── alembic/                     # Alembic migration framework
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── migrations/                  # Raw SQL migrations (alternative to Alembic)
│   ├── studentkare_schema.sql
│   └── cdci_medication_schema.sql
├── tests/                       # pytest test suite (52 files)
├── Dockerfile                   # Python 3.11-slim, uvicorn
├── alembic.ini
└── .dockerignore
```

---

## 3. Build & Run

### Prerequisites

- Python 3.11
- PostgreSQL 15 (prod) or SQLite (dev, zero-config)
- Node 18+ (for the frontend, separate)

### Local Development

```bash
cd backend

# Create virtualenv
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r config/requirements-dev.txt

# Start the server (SQLite auto-created, no config needed)
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

The app auto-creates `studentkare.db` if no `DATABASE_URL` is set.
Demo accounts are seeded automatically in development mode.

### Demo Logins

| Role | Phone | OTP |
|------|-------|-----|
| Super Admin | `9000000000` | `222222` |
| Staff | `9000000001` | `333333` |
| Student | `9000000002` | `444444` |
| Campus Admin | `9000000003` | `555555` |
| Provider | `9000000004` | `666666` |
| Insurer | `9000000005` | `777777` |

### Docker

```bash
# From repo root
docker compose up backend frontend
```

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Prod only | SQLite fallback | PostgreSQL connection string |
| `JWT_SECRET` | Prod only | auto-generated | Legacy JWT signing (dead code) |
| `OTP_HASH_SECRET` | Prod only | falls back to JWT_SECRET | HMAC OTP hashing |
| `ALLOWED_ORIGINS` | No | localhost:3000,4173 | CORS origins |
| `APP_ENV` | No | `development` | `production` enables startup guards |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama LLM endpoint |
| `LLM_MODEL` | No | `llama3.1:8b` | Model for LLM calls |
| `EMBED_MODEL` | No | `nomic-embed-text` | Embedding model |
| `ABDM_BASE_URL` | No | sandbox URL | ABDM gateway |
| `APILAYER_API_KEY` | No | — | APILayer service key |
| `FERNET_KEY` | No | — | Field-level encryption key |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | No | 5 | Login rate limit |
| `RATE_LIMIT_API_PER_MINUTE` | No | 100 | API rate limit |

### Testing

```bash
PYTHONPATH=backend backend/.venv/bin/pytest
```

### Linting

```bash
ruff check backend
```

---

## 4. Request Lifecycle & Auth

### Auth Flow

```
Request → workflow_auth.py
  ├─ Cookie "sacare_session" present?
  │   ├─ Yes → SHA-256 hash → lookup care_sessions → check expires_at
  │   │        → inject Account into request state
  │   └─ No  → 401 Unauthorized
  ├─ CSRF check (POST/PUT/PATCH/DELETE)
  │   └─ X-CSRF-Token header must match session's csrf_token
  └─ Role check (require_super_admin / require_staff / require_campus_admin)
       └─ Account.role must match required role
```

### Two Auth Stacks (Important)

| Stack | Location | Status |
|-------|----------|--------|
| Legacy JWT/MongoDB | `core/deps.py` | **DEAD CODE** — imported by nothing active |
| Active Session Cookie | `services/workflow_auth.py` | **ACTIVE** — used by all endpoints |

**Always use `services/workflow_auth.py`**. The `authenticated_user` dependency
is the standard way to get the current user. `workflow_db()` provides the
SQLAlchemy session.

### Middleware Stack

1. **CORS** — configured via `ALLOWED_ORIGINS`
2. **BodyLimitMiddleware** — 12 MB max request body
3. **Security headers** — `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`
4. **Error handlers** — SQLAlchemy errors → 503, unhandled → 500, both send Slack alerts (non-PHI)

---

## 5. Services Layer

Every file in `services/` with its role and whether it's mounted as a router.

### Mounted Routers (in `app/main.py`)

| File | Prefix | Purpose |
|------|--------|---------|
| `workflow_api.py` | `/api` | **Main router** — 110+ endpoints, everything health/ops/pharmacy |
| `workflow_auth.py` | `/api/auth` | Auth: OTP send/verify, session management, demo logins |
| `member_profile_api.py` | `/api` | Student profile CRUD |
| `preventive_care.py` | `/api/preventive` | Preventive care recommendations |
| `integrations.py` | `/api` | Firebase, OpenWA, Postal integration endpoints |
| `billing.py` | `/api/billing` | Billing/pricing endpoints |
| `apilayer.py` | `/api/apilayer` | APILayer proxy (Numverify, Weatherstack, etc.) |

### Core Infrastructure (not routers)

| File | Purpose |
|------|---------|
| `db_sql.py` | SQLAlchemy engine, `SessionLocal`, `Base`, `create_all_tables()` |
| `workflow_scheduler.py` | Durable background job runner (DB-polling, 5 jobs, 2h cadence) |
| `llm_gateway.py` | httpx.Client → Ollama (only truly blocking call, 60s timeout) |
| `otp_delivery.py` | OTP dispatch via console/email/SMS |
| `integration_config.py` | Integration settings persistence (PostHog, OpenWA, Postal, Firebase) |
| `notification_worker.py` | In-memory demo notification worker (not connected to DB outbox) |
| `payment_gateway.py` | Razorpay/Stripe payment processing |
| `pharmacy_review.py` | Prescription review workflow |
| `document_intake.py` | Document processing pipeline |
| `knowledge.py` | Knowledge source management |
| `clinical_assist.py` | Clinical decision support (stubbed) |
| `movement_sync.py` | Health data sync with wearables |
| `n8n_dispatch.py` | n8n workflow dispatch (stubbed) |
| `rag_vector_store.py` | RAG vector store (demo, no real embeddings) |
| `universal_rag_engine.py` | RAG engine (template-based, no real retrieval) |
| `security_scanner.py` | ClamAV virus scanner integration |
| `code_sentinel_scanner.py` | Code Sentinel security scanner |
| `ai_client.py` | AI client wrapper (in-memory demo state) |
| `agent_eval.py` | Agent evaluation harness |
| `abdm_gateway.py` | ABDM gateway (stubbed) |
| `repository.py` | Generic repository pattern |
| `profile_service.py` | Profile management service |
| `stores.py` | In-memory stores for demo state |
| `twofa_store.py` | Two-factor auth store |
| `agent_scheduler.py` | Multi-agent recurring cycle (disconnected — nobody calls `.start()`) |
| `job_runner.py` | APScheduler-based job runner (disconnected — nobody calls `.start()`) |
| `demo_seed.py` | Demo data seeder |
| `seed.py` | Production seed data |
| `migrations.py` | Alembic migration runner |
| `slack_notifier.py` | Slack ops alert integration |

---

## 6. Agents Inventory

All agents live in `services/agents/`. This section documents every one with an
honest verdict: **what it claims to do vs what it actually does**.

### The Hard Truth

> **No agent calls an LLM. No agent makes an HTTP request. No agent scrapes a URL.**
> Despite names like "AI Agent", "LLM", "BioLLM", every single agent is a
> pure-Python deterministic function. The codebase has zero LLM integration.

### Agent Summary

| # | Agent | Verdict | Mounted |
|---|-------|---------|---------|
| 1 | `blood_emergency_agent` | Real logic, in-memory | Yes |
| 2 | `medication_adherence_loop_agent` | Real persistence (SQLAlchemy) | Yes |
| 3 | `hitl_approval_agent` | Real state machine | Yes |
| 4 | `medical_guard` | Real policy engine | Yes (indirect) |
| 5 | `rx_extractor_ai_agent` | Real regex logic | Yes |
| 6 | `triage_council_agent` | Deterministic stub | Yes |
| 7 | `soap_notes_agent` | Deterministic stub | Yes |
| 8 | `phlebotomist_dispatch_agent` | Stub with logic | Yes |
| 9 | `ai_observability` | Stub (hardcoded counters) | Yes |
| 10 | `swarm` | Deterministic simulation | Yes (indirect) |
| 11–30 | *(20 more agents)* | All deterministic stubs | No |

### Detailed Agent Catalog

#### 1. Blood Emergency Agent — `blood_emergency_agent.py`

**Claimed**: Blood donor matching and SOS broadcast.
**Actual**: Real consent-aware donor filtering with in-memory registry. Matches
by blood group (O- universal donor priority). No actual messaging/WhatsApp/SMS dispatch.
**Mounted at**: `POST /blood/register-donor`, `GET /blood/donors`, `POST /blood/sos-request`
**What's needed to make it real**: Connect `trigger_sos_broadcast()` to actual messaging
via `outbox_events` → notification delivery (Celery worker). This is TICKET-SCALE-104 scope.

#### 2. Medication Adherence Loop Agent — `medication_adherence_loop_agent.py`

**Claimed**: Medication adherence tracking and loop monitoring.
**Actual**: Real SQLAlchemy persistence. `add_plan()`, `log_dose_taken()` (idempotent),
`get_user_schedule()` with completion rate calculation. BUT the "loop" doesn't run —
`loop_status: "MONITORING"` is a static string, `last_loop_check` is always "now".
No background process scans for missed doses.
**Mounted at**: `GET/POST /meds/schedule`, `POST /meds/plans`, `POST /meds/log-dose`
**What's needed**: A Celery Beat task that periodically scans `care_medication_plans`
against `care_medication_doses` and enqueues reminders for missed doses. This is TICKET-SCALE-104 scope.

#### 3. HITL Approval Agent — `hitl_approval_agent.py`

**Claimed**: High-stakes action approval with zero-trust gate.
**Actual**: Real state machine over an in-memory registry. Enforces medical guard policy.
Logs decisions to append-only JSONL file at `logs/medical_audit.jsonl`.
**Mounted at**: `GET /ops/approvals`, `POST /ops/approve-action`
**Limitation**: In-memory registry — lost on restart. Should use DB table.

#### 4. Medical Guard — `medical_guard.py`

**Claimed**: Zero-trust safety gate for clinical actions.
**Actual**: Real policy engine. Risk classifies actions (LOW/MEDIUM/HIGH/CRITICAL),
enforces scoped permissions, supports emergency kill switch, tamper-evident JSONL audit.
**Used by**: `hitl_approval_agent` and `swarm_engine` (indirectly)
**Limitation**: Kill switch state is in-memory. Should use DB.

#### 5. Rx Extractor AI Agent — `rx_extractor_ai_agent.py`

**Claimed**: AI-powered prescription extraction.
**Actual**: Real regex-based logic. Detects doctor names, dates, and matches medication
names against a catalog with word-level provenance spans. Marks unmatched fields as
"honest unknowns" — no fabricated data. Pure regex, no LLM.
**Mounted at**: `POST /rx/extract-ai`
**What's needed to make it real**: Replace regex with LLM-based extraction via
`llm_gateway.py`. Keep provenance spans. Add confidence scores from model output.

#### 6. Triage Council Agent — `triage_council_agent.py`

**Claimed**: Multi-doctor clinical triage council with AI opinions.
**Actual**: Keyword matching (fever, headache, stress, etc.) → canned physician,
mental-health, and pharmacist opinions with fixed trust scores (95.8%). No real
clinical reasoning. Always reaches consensus.
**Mounted at**: `POST /triage/council-eval`
**What's needed**: Replace with LLM-powered triage. Use `llm_gateway.py` for each
"doctor" persona. Add real disagreement handling. Add clinician review routing
for HIGH/CRITICAL cases.

#### 7. SOAP Notes Agent — `soap_notes_agent.py`

**Claimed**: AI-generated SOAP clinical notes.
**Actual**: Returns fixed vitals (120/80, 98.2°F, etc.) and canned assessment
regardless of input. Only the Subjective field incorporates raw notes.
**Mounted at**: `POST /records/generate-soap`
**What's needed**: Replace with LLM-powered generation via `llm_gateway.py`.
Validate output schema. Add clinician review before finalization.

#### 8. Phlebotomist Dispatch Agent — `phlebotomist_dispatch_agent.py`

**Claimed**: AI-optimized phlebotomist assignment.
**Actual**: Picks least-loaded from a hardcoded 3-person pool. Generates random
kit code. No real geolocation, scheduling, or optimization.
**Mounted at**: `POST /lab/book-slot`
**What's needed**: Real phlebotomist registry in DB. Real scheduling logic.
Optional: LLM for route optimization.

#### 9. AI Observability — `ai_observability.py`

**Claimed**: Real-time agent telemetry dashboard.
**Actual**: Hardcoded counters (18,420 requests, 3.1M tokens) and a canned log
buffer. Pure in-memory demo state.
**Mounted at**: `GET /agents/live-status` (indirectly via workflow_api)
**What's needed**: Real metrics collection from agent runs. Use `AiTask` table
for run tracking. Export to OpenTelemetry or similar.

#### 10. Swarm — `swarm.py`

**Claimed**: MetaGPT-style multi-agent swarm with clinical mesh triage.
**Actual**: Deterministic orchestration. Real helper-discovery logic and real
inter-agent handoff trails, but every "agent" is a text stub. Logs to
`ai_observability`.
**Mounted at**: `POST /v1/agents/mesh-triage` (indirectly)
**What's needed**: Retire from connected mode. Use one bounded executor with
real tools (per audit recommendation).

#### 11–30. The Remaining Stubs

| Agent | Claimed Purpose | Actual | What It Returns |
|-------|----------------|--------|-----------------|
| `accreditation_agent` | NAAC/NIRF dossier | 4 hardcoded metrics | Same NAAC statement always |
| `agent_scheduler` | Recurring agent cycle | Orchestrates other stubs | Not connected to any runner |
| `ambassador_kit_agent` | Campus ambassador kit | Template string builder | Same 3 social posts always |
| `autopilot` | AutoGPT goal decomposition | 3 hardcoded steps | Status: "completed" always |
| `career_copilot_agent` | ATS resume scoring | 15-word keyword match | Same mock interview question |
| `certificate_ai_agent` | Certificate verification | Always "VERIFIED_AUTHENTIC" | Fixed trust score 0.95 |
| `cicd_pr_evaluator_agent` | CI/CD health scout | Regex secret detection (real) | Hardcoded reports for rest |
| `code_health_agent` | Code health scanner | Real AST scanning | MongoDB persistence (real) |
| `code_health_rules.py` | AST rule engine | Real Python AST walking | Local filesystem reads |
| `daily_audit_agents` | 24h audit swarm | Fixed counts always | 60 tests, 1254 DAU, 0.08% |
| `echo_profile_loop_agent` | ECHO profile nudge | Real MongoDB queries | Send functions are stubs |
| `graph_rag_agent` | Knowledge graph | 5 hardcoded nodes/edges | Label filtering only |
| `hackathon_grader_agent` | Hackathon grading | Same 4 rubric items | 91/100 always |
| `matchmaker_agent` | Mentor matching | 2 hardcoded candidates | Same email template |
| `newsletter_ai_agent` | Newsletter synthesis | Same HTML/spam score | 1.2 spam score always |
| `qa_agent` | QA health check | 100% health always | 0 failures always |
| `specialized.py` | Ops audit agents | Hardcoded findings lists | Same results always |
| `talent_scraper_ai_agent` | GitHub/LinkedIn parsing | URL parsing only | Fixed skill lists |
| `voice_coach_agent` | Transcript analysis | Real WPM/filler detection | Honest, no external calls |

---

## 7. Data Models

All models live in `core/workflow_models.py` (504 lines, 35 tables).
Prefix: `care_*`.

### Identity & Auth

| Table | Model | Purpose |
|-------|-------|---------|
| `care_accounts` | `Account` | User accounts (student/staff/admin/provider/insurer) |
| `care_sessions` | `Session` | HTTP-only session tokens (hashed) |
| `care_otp_challenges` | `OtpChallenge` | OTP verification state |
| `care_signup_grants` | `SignupGrant` | Registration flow grants |
| `care_rate_buckets` | `RateBucket` | Rate limiting counters |
| `care_campus_verifications` | `CampusVerification` | Student campus affiliation verification |
| `care_deletion_requests` | `DeletionRequest` | Account/data deletion requests |

### Health Data

| Table | Model | Purpose |
|-------|-------|---------|
| `care_readings` | `Reading` | Health metrics (BP, weight, glucose, etc.) |
| `care_documents` | `Document` | Uploaded health documents (binary content) |
| `care_preferences` | `Preference` | User exercise/task preferences |
| `care_exercise_sessions` | `ExerciseSession` | Workout session logs |
| `care_medication_plans` | `MedicationPlan` | Account-owned medication plans |
| `care_medication_doses` | `MedicationDose` | Logged dose occurrences (idempotent) |
| `care_notification_preferences` | `NotificationPreference` | User notification settings |

### Commerce

| Table | Model | Purpose |
|-------|-------|---------|
| `care_catalog` | `CatalogEntry` | Pharmacy product catalog |
| `care_orders` | `Order` | Order records |
| `care_payments` | `Payment` | Payment transactions |
| `care_order_lines` | `OrderLine` | Individual order items |

### Insurance

| Table | Model | Purpose |
|-------|-------|---------|
| `care_policies` | `Policy` | Insurance policy records |
| `care_claim_requests` | `ClaimRequest` | User-submitted claims |
| `care_reviewed_benefits` | `ReviewedBenefit` | Reviewed insurance benefits |

### Operations

| Table | Model | Purpose |
|-------|-------|---------|
| `care_scheduled_jobs` | `ScheduledJob` | Durable background job schedules |
| `care_agent_runs` | `AgentRun` | Background job execution records |
| `care_outbox_events` | `OutboxEvent` | Durable notification dispatch queue |
| `care_workflow_audit` | `WorkflowAudit` | Audit trail for all operations |
| `care_followup_tasks` | `FollowUpTask` | Staff follow-up tasks |
| `care_system_settings` | `SystemSetting` | Runtime configuration store |
| `care_support_requests` | `SupportRequest` | User support tickets |

### Scheduling & Teleconsultation

| Table | Model | Purpose |
|-------|-------|---------|
| `care_availability_slots` | `AvailabilitySlot` | Bookable provider time slots |
| `care_appointments` | `Appointment` | Confirmed appointments |
| `care_consultation_sessions` | `ConsultationSession` | Teleconsultation sessions |

### Clinical

| Table | Model | Purpose |
|-------|-------|---------|
| `care_record_shares` | `RecordShare` | Time-limited clinician access grants |
| `care_document_intake` | `DocumentIntake` | Document processing queue |
| `care_intake_review_items` | `IntakeReviewItem` | Extracted fields needing human review |
| `care_encounter_notes` | `EncounterNote` | Clinician-authored encounter notes |
| `care_knowledge_sources` | `KnowledgeSource` | Approved knowledge entries |

### Campus Health

| Table | Model | Purpose |
|-------|-------|---------|
| `care_health_camps` | `HealthCamp` | Health camp events |
| `care_health_camp_stations` | `HealthCampStation` | Stations within camps |
| `care_camp_attendances` | `CampAttendance` | Student camp participation |

### Content

| Table | Model | Purpose |
|-------|-------|---------|
| `care_home_content` | `HomeContent` | Landing page marketing copy |
| `care_articles` | `Article` | Health articles/content |

---

## 8. Background Workers

### What Runs Today

**Only one worker exists**: `workflow_scheduler.py` + `scripts/workflow_worker.py`.

```
┌──────────────────────────────────────────────────────┐
│  workflow_scheduler (DB-polling, serial)             │
│                                                      │
│  Cadence: every 2 hours (7200 seconds)               │
│  Jobs (5 allowlisted):                               │
│  1. integration_health — Service health monitor      │
│  2. reminder_reconcile — Notification reconciliation │
│  3. document_intake_reconcile — Failed intake retry  │
│  4. knowledge_freshness — Knowledge source expiry    │
│  5. care_followup — Overdue care request detection   │
│                                                      │
│  Runs on app startup (lifespan) + finite CLI passes  │
│  Single-worker, no concurrency, no retry             │
└──────────────────────────────────────────────────────┘
```

**On app startup** (`app/main.py:64-73`):
1. `ensure_scheduled_jobs(db)` — creates missing `care_scheduled_jobs` rows
2. `workflow_scheduler.run_due_jobs(db)` — runs any jobs past their `next_run_at`

**CLI worker** (`scripts/workflow_worker.py`):
- Runs N passes of `run_due_jobs`, then exits
- Usage: `PYTHONPATH=backend python scripts/workflow_worker.py --passes 10`

### What Doesn't Run

| Module | Status |
|--------|--------|
| `agent_scheduler.py` | Has `start()` method but nobody calls it |
| `job_runner.py` | APScheduler-based runner, not imported by app |
| `notification_worker.py` | In-memory demo, not connected to DB outbox |
| `n8n_dispatch.py` | Stubbed, no actual webhook dispatch |

### What's Planned (TICKET-SCALE-104)

Celery + Redis cluster to:
1. **Adherence loop** — periodic scan of medication plans vs doses, enqueue reminders
2. **Blood SOS** — async broadcast to matching donors via outbox
3. **Generic AI task queue** — any future LLM call offloaded from request thread
4. **Graceful fallback** — inline execution when Redis unavailable

---

## 9. Frontend Integration

### How the React App Calls the Backend

The frontend uses `src/data/http.ts` with a 20-second `AbortController` timeout.
Every API call goes through `apiRequest()` which:
- Sends credentials (`credentials: "include"`) for session cookie
- Includes `X-CSRF-Token` header for mutations
- Returns parsed JSON or throws on non-ok responses

### Key Frontend→Backend Touchpoints

| Frontend Component | Backend Endpoint | Agent Used |
|-------------------|-----------------|------------|
| `CampusBloodDonorWidget` | `POST /blood/sos-request` | `blood_emergency_agent` |
| `MedicationTrackerWidget` | `GET /meds/schedule` | `medication_adherence_loop_agent` |
| `MedicationPanel` | `POST /meds/plans`, `POST /meds/log-dose` | `medication_adherence_loop_agent` |
| `TriageCouncilModal` | `POST /triage/council-eval` | `triage_council_agent` |
| `SOAPNotesGeneratorModal` | `POST /records/generate-soap` | `soap_notes_agent` |
| `PrescriptionUploaderModal` | `POST /rx/extract-ai` | `rx_extractor_ai_agent` |
| `AIVoicePrescriptionModal` | `POST /ai/voice-prescription` | llm_gateway (60s timeout) |
| `AIMedicationAndXrayScannerModal` | `POST /ai/xray-diagnostic-scan` | llm_gateway (60s timeout) |

### Timeout Risk

The 20s frontend timeout will fail on any LLM call (60s in `llm_gateway.py`).
This is a known issue (audit F02). Offloading to Celery workers with async
polling solves this.

---

## 10. Known Gaps & Forward Plan

### From the Audit (Sept 2026)

| ID | Gap | Status |
|----|-----|--------|
| F01 | Hardcoded compliance assertions in agents | Open |
| F02 | LLM calls block request thread (60s timeout) | Open |
| F03 | No real LLM integration anywhere | Open |
| F04 | In-memory state lost on restart (HITL, medical guard) | Open |
| F05 | No ABDM integration | Open |
| F06 | No real messaging (WhatsApp/SMS) | Open |
| F07 | Dead code (core/deps.py, legacy JWT) | Open |
| F08 | 19 agents are hardcoded stubs | Open |
| F09 | No background task processing | Open |
| F10 | No real RAG/embeddings | Open |
| F11 | No observability/metrics | Open |
| F12 | No rate limiting on AI endpoints | Open |
| F13 | Notification worker not connected to outbox | Open |
| F14 | No real prescription review | Open |
| F15 | Agent scheduler disconnected | Open |
| F16 | Documentation overstates capabilities | This file fixes it |

### What to Build Next (Priority Order)

1. **Celery + Redis infrastructure** — Add `celery[redis]`, create `celery_app.py`,
   add `docker-compose` services, add `AiTask` model for task tracking.

2. **Adherence loop worker** — Celery Beat task scanning medication plans vs doses,
   enqueuing reminders via `care_outbox_events`. Replace the static `loop_status`.

3. **Blood SOS worker** — Async broadcast to matching donors. Replace in-memory
   registry with DB-backed consent tracking.

4. **LLM integration** — Connect `llm_gateway.py` to real Ollama calls. Start with
   `rx_extractor_ai_agent` (simplest, has provenance). Then `triage_council_agent`.

5. **Outbox delivery worker** — Connect `notification_worker.py` to real email/SMS.
   Process `care_outbox_events` rows.

6. **Agent state migration** — Move HITL registry and medical guard kill switch
   from in-memory to DB tables.

7. **Retire dead code** — Remove `core/deps.py`, legacy JWT imports, disconnected
   `agent_scheduler.py` and `job_runner.py`.

---

## Appendix: Endpoint Count by Category

| Category | Endpoints | Router Prefix |
|----------|-----------|---------------|
| Health data CRUD | ~15 | `/health/*` |
| Documents & intake | ~6 | `/intake/*`, `/health/documents/*` |
| Records & sharing | ~6 | `/records/*` |
| Insurance | ~6 | `/insurance/*`, `/health/policies` |
| Pharmacy & catalog | ~12 | `/catalog/*`, `/ops/catalog`, `/inventory/*` |
| Orders & payments | ~10 | `/orders/*`, `/payments/*`, `/cart/*` |
| Appointments & scheduling | ~8 | `/appointments/*`, `/ops/slots` |
| Blood donors & SOS | ~3 | `/blood/*` |
| Medications | ~4 | `/meds/*` |
| Triage & SOAP | ~2 | `/triage/*`, `/records/generate-soap` |
| Operations (admin) | ~15 | `/ops/*` |
| AI endpoints | ~5 | `/ai/*` |
| V1 endpoints | ~12 | `/v1/*` |
| Campus & camps | ~8 | `/campus/*`, `/camps/*` |
| Support | ~3 | `/support` |
| **Total** | **~110** | |
