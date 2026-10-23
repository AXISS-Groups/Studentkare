# 19 — Scalability: Solutions

Answers [audit/19-scalability-audit.md](../audit/19-scalability-audit.md). Owns **SCALE-01** (SOS sends inside the request) and the **multi-replica readiness checklist**. Most scaling items are owned elsewhere:

| Item | Owner |
|---|---|
| Pooling (TD-21), migration job (TD-12), document storage (TD-27) | [16](16-database-solutions.md), [28](28-privacy-solutions.md) |
| Rate-limit identity and shared store (TD-10) | [17](17-security-solutions.md) |
| Team scaling (TD-07, TD-25, TD-46) | [03](03-architecture-solutions.md), [07](07-collaboration-solutions.md) |
| Design archive (DS-03) | [26](26-design-system-solutions.md) |

The guiding rule: **no microservices.** Scale the modular monolith horizontally and move slow work to the existing worker.

---

## SCALE-01 — SOS delivery out of the request path

**Problem:** `backend/services/emergency_api.py:152-164` sends WhatsApp messages one at a time inside `POST /emergency/sos`. The alert row is committed first, which is good. But a slow OpenWA plus several campus contacts can exceed nginx `proxy_read_timeout 25s`. The student then sees an error even though the alert was raised.

**Approach:** Keep "commit the alert first". Enqueue each delivery as a row in the existing notification outbox, which the worker (`backend/scripts/workflow_worker.py`, `services/notification_worker.py`) sends. Return immediately with attempts in the `QUEUED` state. The client polls `GET /emergency/sos/current`, which already exists, for real statuses.

**Steps**
1. For each recipient, `_record(..., status="QUEUED")` and create an outbox item that references the attempt ID.
2. The worker sends and updates the attempt to `SENT` or `FAILED` with the real gateway detail. That keeps the module's "nothing reported as sent unless the gateway said so" rule.
3. The worker polls every few seconds; SOS items get priority.
4. UI: show "Sending…" per recipient until the status resolves. "Call 112" stays always visible, as it is today.
5. Alert if any SOS attempt stays `QUEUED` for more than 60 s (Prometheus metric plus Alertmanager rule).

**Verify:**
- The endpoint returns in under 500 ms with OpenWA mocked to sleep 30 s.
- Attempts reach `SENT` or `FAILED` within one worker cycle.
- Existing `test_sos.py` assertions are adapted for `QUEUED`.

**Effort:** M. **Tier 1:** SOS is safety-critical, so it needs a named reviewer.

---

## Multi-replica readiness checklist
Before running more than one backend replica in production (Helm sets `replicaCount: 3`):

| # | Requirement | Status at `ad01230` | Fix |
|---|---|---|---|
| 1 | No per-process auth state | ✅ 2FA and pending tokens are in Postgres | — |
| 2 | Rate limits shared | ❌ global limiter is in-memory | [17](17-security-solutions.md) TD-10 |
| 3 | Migrations run once | ❌ at startup | [16](16-database-solutions.md) TD-12 |
| 4 | Scheduled jobs run once | ⚠️ in-process scheduler at startup on every replica | below |
| 5 | Connection budget | ⚠️ `NullPool` without PgBouncer in compose | [16](16-database-solutions.md) TD-21 |
| 6 | Sticky-free sessions | ✅ DB-backed sessions | — |
| 7 | Uploads not on local disk | ✅ in DB today; object storage later | [28](28-privacy-solutions.md) |

**Scheduled jobs (item 4)**
- Run scheduled jobs only in the worker deployment. Remove `workflow_scheduler.run_due_jobs` from the API lifespan, or guard it with `RUN_SCHEDULER=true`, set only on the worker.
- Use row-level leasing so two workers can't take the same job:
  ```sql
  SELECT ... FROM scheduled_jobs WHERE due_at <= now() ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 10;
  ```
  Check whether `workflow_scheduler` already does this; if it doesn't, add it.

**Effort:** S–M.

---

## Capacity baseline (measure before optimising)
- Move `load_test.py` into `scripts/load/`. Use a k6 or Locust scenario covering login, home, records list and catalog, and run it nightly against staging.
- Record p95 latency, error rate and DB connections at 50, 100 and 200 RPS as the baseline in `docs/runbooks/OBSERVABILITY.md`.
- Add caching (Redis) only when a measured hot path needs it. Today nothing does.

## Frontend performance
- Add `rollup-plugin-visualizer` once and check the size of the generated icon data (`skIconData.ts`, 270 KB source; see [26](26-design-system-solutions.md) DS-04) and of `firebase`, which should be removed ([17](17-security-solutions.md)).
- Budget: first-load JS under 250 KB gzip for the student shell on mobile networks. Enforce it with `size-limit` in CI (non-blocking at first).
