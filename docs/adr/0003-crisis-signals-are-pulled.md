# 0003. Crisis signals reach counsellors through a queue, not a push

- **Status:** Accepted as the current behaviour; whether to add a push is open
- **Date:** recorded 2026-10-19
- **Deciders:** to be confirmed by the clinical lead (Tier 1)

## Context
When the crisis gate fires, a crisis event is recorded and listed at
`GET /api/ops/crisis-events` (`backend/services/clinical_api.py`). Crisis events are kept out
of the general ops feed on purpose (commit `53a4e43`). `CRISIS_ALERT` is defined as an urgent
outbox type, but nothing enqueues it (audit JOB-06). Earlier docs implied that it does.

## Decision
Counsellors see crisis signals only by opening the queue. Nothing pages anyone. Operators must
staff a rota to watch it (`docs/DEPLOYMENT_GUIDE.md`). `CRISIS_ALERT` stays in
`URGENT_EVENT_TYPES`, so a future producer can never be held by quiet hours.

## Consequences
- A crisis signal that arrives outside staffed hours waits until someone looks.
- Adding a push (minimum content, campus-scoped, urgent) is a clinical decision and a Tier 1
  change. It needs a plan and a named reviewer, and a new ADR that supersedes this one.
