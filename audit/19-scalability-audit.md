# 19 — Scalability Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

- **Runtime improvements:** periodic jobs now run in a dedicated worker with per-job leases. That is safe across replicas and removes the "jobs only at startup" limit. Outbox processing is bounded (25 per pass) with backoff.
- **New runtime risks:** one serial pass carries urgent deliveries behind slower jobs, and there is no dead-man alert (TD-49). SOS fan-out is still inline (SCALE-01 = JOB-02 in 31, OPEN). `_crisis_accounts_in_scope` loads every distinct crisis account and filters by campus in Python on each request (`clinical_api.py:131-150`). Fine at current scale; it will need a campus join as data grows (LOW).
- **Rule L cost:** `commerce_db` opens a second session per commerce request, with a status probe cached for 300 s. Negligible.
- **Team scaling:** backend hotspots grew (TD-07); `workflow_scheduler.py` is a new shared file (JOB-03).
- Unchanged: `NullPool` (TD-21), proxy-IP rate limit (TD-10), migrations at startup (TD-12).

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

- Team scalability: unchanged risks (TD-07, TD-25), plus i18n catalogues and ratchet lists as new shared files (mitigated by per-area catalogues).
- Runtime: `NullPool` (TD-21), proxy-IP rate limit (TD-10), migrations at startup (TD-12) — OPEN. 2FA/pending state now in Postgres (TD-04 RESOLVED) — removes one multi-replica blocker.
- New load-relevant features: SOS fan-out to WhatsApp sends sequentially inside the request (`services/emergency_api.py:152-164`); the alert row is committed first (good), but with several campus contacts and a slow OpenWA the request can exceed nginx `proxy_read_timeout 25s` and the student sees an error after a successful alert — move sends to the existing outbox/worker and return immediately (MEDIUM, tracked here as SCALE-01); erasure job walks every FK-reachable row per account (batch job; fine at current scale); rotating pass signs 20 steps per request (cheap).
- Repo size: `design/` 88 MB (DS-03) affects clone/CI time.
- Frontend demo/dead LOC estimate (~29K) not recomputed; vendor demo screens reduced by 3 routes.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

Target: the simplest architecture that survives the next 1–3 years. No microservices recommendation unless forced.

## Team growth (10 → 15 → 30 developers)

| Constraint | Today | Breaks at |
|---|---|---|
| Backend file ownership | ~150 routes in `workflow_api.py`, all models in `workflow_models.py` | ~5 concurrent backend devs (already 34 conflict merges in 5 weeks with ~3 active) |
| Frontend routing | route table for ~120 paths in one file (`features/health/module.ts`) + switch in `WorkspaceScreen.tsx` + lists in `App.tsx` | ~5 concurrent frontend devs |
| Architecture clarity | three frontend patterns | immediately for new joiners |
| CI | one serial job, not on integration branch | immediately |
| Ownership | no CODEOWNERS | ~8 devs |

Fix: modular monolith with domain packages (backend) and per-feature route registration (frontend). This scales to ~30 developers without new services.

## Product growth (10 → 50 → 200 features)

- Already ~120 workspace routes and ~250 API endpoints. Feature count is not the limit; **coupling per feature** is. Each new feature touches 4–5 shared files.
- Roughly 29K of ~115K frontend LOC (≈25%) is demo-backed or dead: `src/screens/vendor/*.tsx` 16.0K (local demo state), top-level `src/components/*.tsx` that simulate behaviour (`Math.random`/`setTimeout`/`DEMO_`/"simulat") 6.3K, `src/modules/**` 6.8K (unused). Treating these as "features" inflates the surface that must be maintained.
- Recommendation: per-feature folders that own routes, ViewModels, API client slice and tests; delete simulations.

## Codebase growth (≈140K → 1M LOC)

- 39 TSX files > 500 lines, 63 shims, 175+ unused files today at ~140K LOC. At 10× size without cleanup the dead-code ratio will make search and refactor unreliable.
- `tsc` covers web only; native code is excluded (`tsconfig.json` `exclude: src/native/**`) and has its own config (`config/tsconfig.native.json`) that CI does not check.
- Recommendation: Knip blocking, `max-lines` warnings, path-based import rules (eslint `boundaries` or `no-restricted-imports`) between `features/*`.

## Traffic growth

| Component | Current design | Scaling concern | Recommendation |
|---|---|---|---|
| DB connections | `NullPool` everywhere (`db_sql.py:71`); compose backend bypasses PgBouncer | connection churn per request; `max_connections` exhaustion | QueuePool or PgBouncer by service name; measure |
| Rate limiting | in-memory per process (`core/rate_limiter.py`), Postgres buckets for auth | inconsistent across replicas; OTP IP bucket global behind nginx (see 17) | one shared store; correct client IP |
| 2FA / pending state | in-memory dicts (`twofa_store.py`) | breaks with >1 replica | Postgres |
| Background jobs | in-process scheduler run at startup + separate `workflow_worker.py` | duplicate execution with N replicas unless leased | the scheduler uses DB jobs (`ensure_scheduled_jobs`); verify row-level leasing before scaling replicas |
| Migrations | at app startup on every replica | deploy-time races | one-shot job |
| Documents | `bytea` in main DB | DB bloat, slow backups | object storage |
| WebRTC signalling | HTTP polling endpoints (`/api/consultation/{id}/signal`, `workflow_api.py:1882-1903`) via DB | DB write load per ICE candidate; latency | acceptable for MVP; move to a managed video provider before scale |
| AI | Ollama sync calls inside async functions (unreachable today) | event-loop blocking | async client or worker queue when wired |
| Caching | none (no Redis) | acceptable now | add only when a measured hot path needs it |
| Frontend bundle | `firebase`, `posthog-js` dynamically imported; 6K inline style objects; large screens | first-load size for mobile networks in India | route-level code splitting already exists via `React.lazy`; measure bundle |

## External dependencies
OTP delivery via OpenWA/SMTP/Postal with failover to recovery email — sensible. Single provider per channel; no queue/outbox for OTP (synchronous in request). Notifications have an outbox (`/api/v1/admin/notifications/outbox*`) — good pattern to extend to OTP and webhooks.

## Verdict
The deployment architecture (one API, one Postgres, one worker, PgBouncer) **can** serve significant traffic once connection pooling, shared rate-limit/2FA state, and migration jobs are fixed — these are days of work, not a redesign. The **code** architecture is the scaling limit for the team. Do not introduce microservices; split the backend into domain packages inside the same deployable. The only service split AGENTS.md mandates (M18 clinician prediction) should wait until that feature actually exists.
