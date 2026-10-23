# 31 — Background Jobs, Scheduler & Notification Outbox

**New dimension, created 2026-10-17 (revalidation 2)** against `main` @ `d333afe`.

## Why this needs its own report
At revalidation 1, periodic jobs ran only at backend startup or when an admin pressed "run now". Since then:
- a dedicated **worker service** runs them on a timer, in compose, the prod overlay and Helm (`6ba51bb`);
- job runs take a **lease** so replicas never double-run (`a1c7e93f5d20_add_scheduled_job_lease`);
- the **outbox** now delivers SOS acknowledgement and resolution notices, blood SOS requests, and appointment and medicine reminders over WhatsApp and email, with per-event backoff, urgent-first ordering, no repeat sends after a crash, and a human alert when an urgent message fails (`bb4762a`, `9fda2d2`, `abbcdde`, `167768c`).

This is a new operational responsibility: a second long-running process that carries **safety-critical** deliveries. It has its own failure modes (stuck leases, provider timeouts, a dead worker) and its own deployment steps. Reports 19 and 28 touch on it, but nothing tracks it end to end (criteria 1, 3, 4 of §6).

## Scope
`backend/services/workflow_scheduler.py` (1,027 lines), `backend/scripts/workflow_worker.py`, `services/emergency_api.py` (inline SOS sends), `services/ops_feed.py`, `core/email_templates.py`, the `worker` services in `docker-compose.yml` and `docker-compose.prod.yml`, `deploy/helm/studentkare/templates/04-worker.yaml`, `docs/DEPLOYMENT_GUIDE.md` ("Scheduled Jobs Worker"), and tests `test_workflow_worker_loop.py`, `test_outbox_delivery_safety.py`, `test_reminder_delivery.py`, `test_admin_outbox.py`, `test_workflow_scheduler_bounds.py`.

## Current state (verified in code; tests not executed)

| Element | Evidence | Assessment |
|---|---|---|
| Job registry | `PERIODIC_JOBS`: 8 jobs (integration health, outbox/reminders, document intake, knowledge freshness, care follow-up, Slack self-test, campus departures, account erasure). Cadence overrides: outbox 45 s, Slack 3,600 s | Clear |
| Lease | `_claim_lease` is an atomic conditional UPDATE. `LEASE_SECONDS = 900`. "Run now" on a busy job returns 409 | Good. Works through PgBouncer |
| Worker | `python -m scripts.workflow_worker --loop`, 15 s poll, heartbeat file, SIGTERM finishes the pass. It loads integration config from the DB (`workflow_worker.py:113-132`) | Good |
| Deployment | compose `worker` (dev); prod overlay `worker` with `${VAR:?}` secrets; Helm `04-worker.yaml` (read-only root, heartbeat liveness, 120 s grace); `SCHEDULER_IN_PROCESS=true` for single-container deploys. Documented in `DEPLOYMENT_GUIDE.md` | Good and consistent across targets |
| Outbox delivery | Each event is committed `SENDING` before the provider call. If a claim lapses it is marked `FAILED delivery_interrupted_outcome_unknown` and is never resent blindly. Backoff is 60/300/900 s, or 15/60/300 s for `URGENT_EVENT_TYPES`. Urgent events are sorted first. A failed urgent event publishes a CRITICAL `URGENT_DELIVERY_FAILED` ops event | Strong design |
| Quiet hours | Deferral to window end. Urgent types bypass it (`preference_verdict`) | Good |
| Honest status | Job outcome is one of `SUCCESS/FAILED/BLOCKED/SKIPPED/DEGRADED`. Handler failure rolls back before recording | Good |
| Admin surface | `/v1/admin/notifications/outbox` (+ process, requeue) read from the durable `care_outbox_events` table; `/ops/jobs`, `/ops/jobs/{key}/run` | Good |

## Findings

### Finding: JOB-01 — Urgent delivery shares one serial pass; no dead-man alert
**TD-49** (authoritative in 22). Medium. Summary: `run_due_jobs` runs due jobs one after another, so `reminder_reconcile`, which carries blood-SOS and SOS-status messages, can wait behind slow probes or erasure. A stopped worker pages no one, because nothing exports job freshness to Prometheus or Alertmanager.

### Finding: JOB-02 — Personal SOS fan-out still sends inside the HTTP request
- **Severity:** Medium
- **Status:** OPEN (unchanged; tracked as SCALE-01 in 19)
- **Location:** `services/emergency_api.py:91-101,153-164` (`_whatsapp` → `otp_delivery._send_openwa`)
- **Evidence:** `BLOOD_SOS` (via `services/agents/blood_emergency_agent.py`) and the SOS acknowledgement and resolution notices (`ops_feed.announce` → `notify`) go through the outbox. The student's own SOS still calls OpenWA synchronously for each campus contact and the emergency contact. The alert row is committed first.
- **Impact:** With several contacts and a slow provider, the request can exceed nginx's 25 s read timeout. The student then sees an error after a successful alert. The outbox's retry and failure alerting do not apply to these sends.
- **Recommendation:** Enqueue these as `URGENT_EVENT_TYPES` outbox events and return straight away. Keep the per-recipient delivery rows the UI already shows.
- **Related reports:** 19, 28

### Finding: JOB-03 — `workflow_scheduler.py` is becoming a second monolith
- **Severity:** Low (part of TD-07)
- **Evidence:** One 1,027-line module holds the scheduler, leases, outbox processing, reminder routing and timing, quiet hours, health probes, the Slack self-test and follow-up detection. It had 9 commits since `ad01230`.
- **Recommendation:** Split it into `scheduler/` (registry, lease, loop) and `outbox/` (routing, delivery, backoff) before the next delivery channel is added.

### Finding: JOB-04 — A blocked erasure is visible only on the jobs page
- **Severity:** Medium (expands PRIV-01)
- **Evidence:** Without `DPDP_ARCHIVE_KEY`, `process_due_erasures` returns `blocked` (`services/erasure.py:174`). The run is recorded and shows in `/ops/jobs`, but no ops event or alert is raised for it (`erasure.py` publishes only on request, cancel, erase and archive open). The worker in every deploy config lacks the key (TD-40).
- **Impact:** Due erasures stop silently, which is a statutory-timeline risk.
- **Recommendation:** Publish a CRITICAL ops event when an erasure is due but blocked, and fix TD-40.
- **Related reports:** 25, 28

### Finding: JOB-05 — Worker health in Docker Compose does not trigger a restart
- **Severity:** Low
- **Evidence:** The compose `worker` uses a heartbeat healthcheck with `restart: unless-stopped`. Plain Docker Compose restarts on exit, not on "unhealthy". A hung loop stays down. Helm's liveness probe does restart (`04-worker.yaml`).
- **Recommendation:** Make the loop exit non-zero when a pass overruns, or document an autoheal sidecar for compose/Dokploy deployments. Covered by the TD-49 alert once that exists.

### Finding: JOB-06 — `CRISIS_ALERT` is an urgent outbox type that nothing produces
- **Severity:** Low
- **Status:** OPEN (new)
- **Location:** `services/workflow_scheduler.py:53,365` (`URGENT_EVENT_TYPES`); `docs/DEPLOYMENT_GUIDE.md` ("outbox messages (including `BLOOD_SOS` and `CRISIS_ALERT`)")
- **Evidence:** A search of non-test backend code finds no code that enqueues `CRISIS_ALERT`; only tests create it. Crisis events reach counsellors through the pull queue `GET /ops/crisis-events` (`clinical_api.py:153`). They are deliberately kept out of the ops feed (`53a4e43`).
- **Problem:** The code comment and the deployment guide suggest crisis alerts are pushed. They are not.
- **Impact:** An operator may assume counsellors are notified of a new crisis signal, when someone has to open the queue. Whether to push is a product and clinical decision. The issue here is that the docs describe something that does not happen.
- **Recommendation:** Either implement the push (urgent, minimum content, campus-scoped, like the queue), or remove `CRISIS_ALERT` from the comment, `URGENT_EVENT_TYPES` and the guide.
- **Related reports:** 28, 10

## What is good
- No-repeat delivery semantics are explicit and tested. When the outcome is unknown, a human decides.
- Urgent-first ordering, a shorter urgent backoff and a CRITICAL ops event for a failed urgent message.
- One lease mechanism covers workers, replicas and manual runs. It is documented for all three deploy targets.
- `DEPLOYMENT_GUIDE.md` explains the worker clearly enough for an operator to run it.

## Related
[19](19-scalability-audit.md) (SCALE-01), [28](28-privacy-consent-data-governance.md) (erasure, SOS disclosures), [25](25-environment-configuration.md) (keys), [18](18-cicd-deployment.md) (deploy), [14](14-error-handling-logging.md) (observability).
