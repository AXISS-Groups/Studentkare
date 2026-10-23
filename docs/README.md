# Documentation index

Start with the root [`README.md`](../README.md), then [`AGENTS.md`](../AGENTS.md) (house
rules), [`CLAUDE.md`](../CLAUDE.md) and [`DESIGN.md`](../DESIGN.md). This page lists everything
under `docs/` with a status, so nobody builds on a plan that has been replaced.

**Statuses**
- `current`: describes how the system works today and is kept up to date.
- `active`: a working plan that is still being executed.
- `superseded`: replaced by the named doc. Read that one instead.
- `withdrawn`: kept only as a record; its claims are not true.
- `unreviewed`: nobody has checked it against the code since the 2026-10 audits.
  Verify anything you rely on.

The **Owner** column is blank until the team assigns owners. Fill it with GitHub handles
and add the same handles to `.github/CODEOWNERS`.

## Engineering

| Doc | Purpose | Status | Owner |
|---|---|---|---|
| [guides/CONTRIBUTING.md](guides/CONTRIBUTING.md) | Local setup, workflow, troubleshooting | current | |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Compose and Helm deploys, env reference, go-live checklist | current | |
| [workflow-worker.md](workflow-worker.md) | Background job worker | unreviewed | |
| [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System overview | unreviewed | |
| [adr/](adr/) | Architecture decision records | current | |
| [integration-guide.md](integration-guide.md) | Integration settings | unreviewed | |
| [interface-system.md](interface-system.md) | App-wide interface system | unreviewed | |
| [standards/CODING_STANDARDS.md](standards/CODING_STANDARDS.md) | Coding standards | unreviewed | |
| [standards/CODE_REVIEW_CHECKLIST.md](standards/CODE_REVIEW_CHECKLIST.md) | Review checklist | unreviewed | |
| `standards/code-review-checklist/` | Java/Maven checklist; not this stack | withdrawn | |
| [guides/CLAUDE.md](guides/CLAUDE.md) | Copy of the AGENTS.md prompt library | superseded by [`AGENTS.md`](../AGENTS.md) | |

## Product and feature notes

| Doc | Status |
|---|---|
| [billing-payments.md](billing-payments.md) | unreviewed |
| [healthcare-marketplace.md](healthcare-marketplace.md) | unreviewed |
| [preventive-care-api.md](preventive-care-api.md) | unreviewed |
| [member-profile-digital-id.md](member-profile-digital-id.md) | unreviewed |
| [exercise-experience.md](exercise-experience.md) | unreviewed |
| [existing-wellbeing-sensor-review.md](existing-wellbeing-sensor-review.md) | unreviewed |
| [SCREEN_PLAN.md](SCREEN_PLAN.md), [design/doctor-screens-plan.md](design/doctor-screens-plan.md) | unreviewed |

## Operations, security and incidents

| Doc | Status |
|---|---|
| [runbooks/INCIDENT_RESPONSE.md](runbooks/INCIDENT_RESPONSE.md), [runbooks/DISASTER_RECOVERY.md](runbooks/DISASTER_RECOVERY.md), [runbooks/OBSERVABILITY.md](runbooks/OBSERVABILITY.md) | unreviewed |
| [security/THREAT_MODEL.md](security/THREAT_MODEL.md), [security/SECURE_SDLC.md](security/SECURE_SDLC.md), [security/VENDOR_REGISTER.md](security/VENDOR_REGISTER.md), [security/VULNERABILITY_MANAGEMENT.md](security/VULNERABILITY_MANAGEMENT.md), [security/VULNERABILITY_DISCLOSURE.md](security/VULNERABILITY_DISCLOSURE.md) | unreviewed |
| [incident/](incident/) (clinical sign-off, domain cutover, progress, repo map) | unreviewed |
| [reviews/tier1-review-2026-10-16.md](reviews/tier1-review-2026-10-16.md) | record |
| [release/P14_RELEASE_READINESS_GATE.md](release/P14_RELEASE_READINESS_GATE.md) | unreviewed |

## Plans, audits and self-assessments

The authoritative audit is [`/audit`](../audit/README.md), with fixes in
[`/audit-solutions`](../audit-solutions/). The dated files below predate it.

| Doc | Status |
|---|---|
| [remediation-plan-2026-10-09.md](remediation-plan-2026-10-09.md) | active |
| [backlog-audit-2026-10-16.md](backlog-audit-2026-10-16.md) | unreviewed |
| [dead-code-2026-10-14.md](dead-code-2026-10-14.md) | superseded — stale, do not run its commands (marked in the file); verified replacement plan pending |
| [dead-code-2026-10-11.md](dead-code-2026-10-11.md) | superseded by dead-code-2026-10-14.md |
| [P0_HOUSE_CONSTITUTION_CERTIFICATION.md](P0_HOUSE_CONSTITUTION_CERTIFICATION.md) | withdrawn (marked in the file; audit TD-26) |
| [application-audit-2026-09-13.md](application-audit-2026-09-13.md) | superseded by `/audit` |
| [implementation-status.md](implementation-status.md), [implementation-todo.md](implementation-todo.md), [top-100-feature-todos.md](top-100-feature-todos.md), [healthcare-development-roadmap.md](healthcare-development-roadmap.md) | unreviewed |
| [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md), [PROMPT_MASTER_INDEX.md](PROMPT_MASTER_INDEX.md), [prompt-status.md](prompt-status.md) | unreviewed |

## Not engineering documentation

These belong in Drive, Notion or GitHub (audit 10, section 4). They stay here until someone moves them.

- PR bodies: [PR_BODY.md](PR_BODY.md), [PR-feat-honest-care-platform.md](PR-feat-honest-care-platform.md)
- Business: `studentkare-revenue-*`, `tickets/*.csv`, `tickets/*.xlsx`
- Exports: `*.pdf`, `ux/studentkare-ux-flows.html`, `research/`
