# Bounded workflow worker

Development-time parallel agents can audit, implement, and test separate files.
They are distinct from the application’s runtime task runner. The runtime worker
executes five existing, explicitly registered backend handlers; it cannot edit
application code, invoke a shell, accept arbitrary tasks, or spawn AI agents.

## Run

From `backend/`, with the application’s `DATABASE_URL` and integration environment
already exported and its schema/migrations applied:

```sh
.venv/bin/python -m scripts.workflow_worker --once
.venv/bin/python -m scripts.workflow_worker --max-cycles 10 --sleep-seconds 60
```

An explicit mode is required. Each invocation exits after **1–100 passes**.
Sleep is **1–7200 seconds**, defaults to 60, and happens only between passes after
closing the database session. Each pass selects at most **25** due, enabled,
allowlisted jobs, oldest due first. The existing five jobs normally run every
7,200 seconds; polling does not bypass their persisted `next_run_at`.

Use an external scheduler to invoke `--once` repeatedly if ongoing operation is
needed. Run one worker and avoid overlapping startup/manual passes: the existing
schema has no distributed lease or multi-worker exactly-once guarantee. The worker
does not run application startup, migrate/create tables, or seed demo accounts.
It loads persisted integration settings once per invocation.

Each cycle prints JSON containing actual job outcomes. Exit codes: **0** for
completed cycles (which may include `BLOCKED`/`SKIPPED` work), **1** for handler or
worker failures, **2** for invalid arguments, **130** for keyboard interruption.

## Allowed tasks and honest outcomes

| Job | Actual behavior |
| --- | --- |
| `integration_health` | Checks configuration and supported read-only probes. HTTP errors are not healthy. Postal’s message-send endpoint is never probed; absent health adapters remain unknown. `SUCCESS` means the check completed, not that every provider is available; inspect `summary.checks` and `summary.overall`. |
| `reminder_reconcile` | Inspects at most 25 queued event IDs. No notification delivery adapter exists: backlog produces `BLOCKED`, an empty batch produces `SUCCESS`. Credentials alone never cause delivery. |
| `document_intake_reconcile` | Counts actual queued/failed intake rows using SQL aggregates. Reports `BLOCKED` for backlog or `SKIPPED` when empty, with zero extracted/reconciled documents and an explicit adapter limitation. |
| `knowledge_freshness` | Uses SQL aggregate counts for active, reviewed sources and their expiration windows; no extraction, source rewriting, or unbounded Python row loading. |
| `care_followup` | Creates at most 25 staff tasks for eligible overdue orders per run. Existing open tasks are excluded before limiting, allowing later batches to progress. Reads at most two open lines per selected order for its note; never fulfills requests. |

`enqueue()` immediately persists a deduplicated notification intent for the inbox.
Reconciliation leaves its `PENDING` status, attempts, read state, payload, and
`sent_at` intact. It creates no outbound messages and never marks anything `SENT`.
The outbox summary’s `pending` is the inspected batch size, not a total queue count.

## Manual runs and persistence

The existing route is **`POST /api/ops/jobs/{key}/run`**. It retains super-admin and
CSRF checks, resolves registered keys, and returns **404** for unknown jobs without
creating a schedule or run. An explicit manual run bypasses due/enabled checks.

Manual and periodic runs use the same execution path. Successful handler work,
schedule status/timestamps, and the `AgentRun` outcome are committed together.
Exceptions roll back partial handler work before a `FAILED` outcome is recorded;
database persistence failures propagate. Runs store start/finish timestamps,
summary, status, and error. Manual responses include the persisted `runId`.
The existing live-status endpoint reads `lastSummary` from this run history;
inspect `lastStatus` for `BLOCKED`/`SKIPPED`, since its coarse display label can
still read `SCHEDULED`.

Only completed outcomes are recorded. If the process dies mid-handler, no success
is invented; uncommitted work rolls back and the due job can be retried. This is
not a crash-time execution trace or an exactly-once delivery guarantee.

## Isolated verification

From `backend/`:

```sh
DATABASE_URL=sqlite:// APP_ENV=test .venv/bin/python -m pytest \
  tests/test_workflow_scheduler_bounds.py tests/test_workflow_worker.py \
  tests/test_workflow_scheduler.py tests/test_followup.py tests/test_notifications.py -q
```

The new tests use fresh in-memory SQLite engines, mocked integration probes, and
controlled sleep. They do not start the application lifespan, contact providers,
or connect to the application’s real database.
