# 10 — Documentation Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

| Item | Status | Evidence |
|---|---|---|
| Setup docs | OPEN (TD-14, TD-41) | unchanged; branch model now also wrong (TD-02) |
| Architecture docs | **Improved** | `backend/ARCHITECTURE.md` (rewritten, about −700 net lines) and `docs/architecture/ARCHITECTURE.md` refreshed against the code (`ca69016`) |
| Deployment guide | **Improved** | worker section accurate for three targets. Rule L DB-role prerequisite and TD-40 keys missing |
| Doc claims vs code | Mixed | AGENTS.md Rule L "enforced at Postgres grants": now partly true (TD-03). `DEPLOYMENT_GUIDE.md` says the outbox carries `CRISIS_ALERT`, but nothing produces it (JOB-06) |
| Parallel audit trees | **New risk** | `audit-solutions/` (31 files, written against `ad01230`) proposes fixes for findings, some of which this revalidation closed or changed (TD-03, TD-08, TD-11, TD-31, TD-02). It is not maintained by this audit. Readers should treat `audit/22` as the status source, and the solutions tree should be re-based on it |
| Dated plan files | OPEN | `docs/backlog-audit-2026-10-16.md` updated; `docs/design/doctor-screens-plan.md` added |
| Root plan files | TD-32 | `Audit_Plan.md`, `Intial_Audit_plan.md` now tracked at the root |

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

| Original finding | Status | Evidence |
|---|---|---|
| Setup docs wrong | OPEN, worse (TD-14, TD-41) | README/CONTRIBUTING unchanged; demo login instructions now wrong |
| Self-certification contradicts code | **RESOLVED** (TD-26) | `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md` status `WITHDRAWN — NOT A RELEASE GATE`, with a table of what was not true |
| No single entry point | OPEN, worse | new: `CLAUDE.md`, `design/README.md`, `docs/remediation-plan-2026-10-09.md`, `docs/backlog-audit-2026-10-16.md`, `docs/dead-code-2026-10-11.md` + `-10-14.md`, `docs/reviews/tier1-review-2026-10-16.md`, `docs/ux/studentkare-ux-flows.html`. Dated plan files accumulate; the 10-11 dead-code list is "superseded" by the 10-14 one but still present |
| Missing "how to build a feature" | PARTIALLY RESOLVED | `CLAUDE.md` + `design/README.md` describe how to build a **screen**; still nothing for backend endpoint → migration → client → ViewModel |
| Architecture claims vs code | PARTIALLY RESOLVED | M18 now honestly "no separate service exists"; FHIR R4 and Rule L grants still claimed in `AGENTS.md`, still not implemented |

New: decision records exist informally inside plan files ("Decisions needed from a human", owner approvals for Tier 1). Recommend extracting them into `docs/adr/` so they survive plan-file churn.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Inventory

`docs/` holds 139 tracked files (11 MB). Classified by purpose:

| Category | Files | Assessment |
|---|---|---|
| Setup / contribution | `README.md`, `docs/guides/CONTRIBUTING.md`, `docs/integration-guide.md` | Exists; several steps wrong (see 09) |
| Architecture | `docs/architecture/ARCHITECTURE.md` (+ PDF), `backend/ARCHITECTURE.md` (36.9 KB), `docs/Studentkare_System_Architecture_Overview.pdf`, `docs/incident/REPO_MAP.md`, `DESIGN.md`, `docs/SCREEN_PLAN.md` | Plenty, partly aspirational (see below) |
| Standards | `AGENTS.md`, `docs/guides/CLAUDE.md` (same text as AGENTS.md), `docs/standards/CODING_STANDARDS.md`, `docs/standards/CODE_REVIEW_CHECKLIST.md` (160 KB) + a copy under `docs/standards/code-review-checklist/` with Java/Maven configs, `.cursorrules` | Duplicated; generic checklist not adapted to this stack |
| Operations | `docs/DEPLOYMENT_GUIDE.md`, `docs/runbooks/{DISASTER_RECOVERY,INCIDENT_RESPONSE,OBSERVABILITY}.md`, `docs/release/P14_RELEASE_READINESS_GATE.md` | Present — better than typical for a startup |
| Security | `docs/security/{THREAT_MODEL,SECURE_SDLC,VULNERABILITY_MANAGEMENT,VULNERABILITY_DISCLOSURE,VENDOR_REGISTER}.md` | Present; threat model is the most valuable doc |
| Feature specs | `docs/{billing-payments,healthcare-marketplace,preventive-care-api,member-profile-digital-id,exercise-experience,workflow-worker,interface-system}.md` | Useful, dated 2026-09-10..15 |
| AI prompt material | `docs/PROMPT_LIBRARY.md`, `PROMPT_MASTER_INDEX.md`, `prompt-status.md`, `design/screens/prompts/` | Development-process artefacts, not product docs |
| Self-assessments | `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md`, `docs/application-audit-2026-09-13.md`, `docs/implementation-status.md`, `docs/implementation-todo.md`, `docs/top-100-feature-todos.md` | Contradict each other (certification says "GO FOR RELEASE"; the 13 Sept audit lists 7 P0 blockers) |
| Business | `studentkare-revenue-investment-collaboration-report-2026-09-14.md`, `.csv`, `docs/tickets/*.csv/.xlsx` (8 files) | Do not belong in the engineering repo |
| PR bodies | `docs/PR_BODY.md`, `docs/PR-feat-honest-care-platform.md` | Belong in GitHub, not docs |

Coverage is broad. **Accuracy and discoverability are the problems**, not volume.

## README
| Should explain | Present? | Notes |
|---|---|---|
| What the project is | Yes (title line only) | One sentence |
| Why it exists | No | |
| Architecture | Link only | |
| Tech stack | One line | |
| Setup | Yes | Wrong DB description (SQLite / `care-data`) |
| Development | Link | |
| Testing | No | |
| Deployment | No | |
| Contribution | Link | |
| Unrelated content | **Yes** | `README.md:51-80` is a "Code review checklist bundle" for a Java/Maven project (`pom.xml`, Checkstyle, SpotBugs) and refers to `CODE_REVIEW_CHECKLIST.md` at a path that does not exist at root |

## Architecture docs vs code

| Doc claim | Code reality | Status |
|---|---|---|
| `AGENTS.md`: "FHIR R4 as the canonical clinical data model" | `core/workflow_models.py` defines 59 ad-hoc SQLAlchemy tables; "fhir" appears only in unreachable modules (`core/consent_engine.py`, `core/crypto_service.py`, `services/abdm_gateway.py`) | Not implemented |
| `AGENTS.md`: "MVVM, one shared domain + data + viewmodel layer across mobile and web" | Three frontend architectures; one (`src/modules`) dead (see 04) | Partially |
| `AGENTS.md`: Rule L "Enforced at Postgres grants" | Roles exist only in `backend/migrations/studentkare_schema.sql`, which nothing applies; Alembic creates no roles/grants | Not implemented |
| `AGENTS.md`: M18 separate service | No such service | Not implemented |
| `docs/architecture/ARCHITECTURE.md`: feature modules + MVVM, see `src/store` | `src/store` exists as a single file; features partially MVVM | Partially |
| `docs/architecture/ARCHITECTURE.md` header itself warns "Some integration and autonomous-agent claims below describe intended capabilities rather than verified execution" | Honest disclaimer — good — but readers must reconcile manually | — |
| `src/modules/m01-auth/README.md`: "`import { useAuthViewModel } from '@/modules/m01-auth'`" | Module unused by the app | Wrong |
| `.cursorrules`: "Strictly adhere to [CODING_STANDARDS.md](CODING_STANDARDS.md) and [ARCHITECTURE.md](ARCHITECTURE.md)" and "Vanilla CSS (Impilo Pearl design tokens in `src/theme/workflows.css`)" | Links resolve to nothing at root (files live in `docs/standards/` and `docs/architecture/`); `src/theme/workflows.css` is a 1-line file | Broken |

## Developer documentation

| Topic | Status |
|---|---|
| Coding conventions | `docs/standards/CODING_STANDARDS.md` exists (4 KB), not enforced by lint |
| Git workflow / branching | `CONTRIBUTING.md` §7 — clear, but not what happens (see 11) |
| PR expectations | PR template exists |
| Testing expectations | Only "all pass"; no guidance on what to test or where tests go |
| Feature development workflow | **Missing**. No "how to add a screen / route / API / table" guide. `scripts/gen-module.js` scaffolds into `src/modules` (the dead architecture) |
| Debugging | **Missing** (no backend debugger config, no "how to read OTP from logs" beyond demo code) |
| How to add a migration | **Missing** |

## Operational documentation

| Topic | Status |
|---|---|
| Deployment | `docs/DEPLOYMENT_GUIDE.md` (present; does not say whether Compose, Dokploy or Helm is the live target) |
| Environment management | Partial; 35 env vars undocumented (see 09) |
| Monitoring / logging | `docs/runbooks/OBSERVABILITY.md` |
| Incident handling | `docs/runbooks/INCIDENT_RESPONSE.md` |
| Rollback | Mentioned in DR runbook; no tested rollback procedure for migrations (Alembic downgrade not exercised in CI) |

## Findings

**Severity: HIGH — Setup documentation is wrong in ways that block a new developer** (detail in 09).

**Severity: HIGH — Self-certification documents contradict the code and each other**
Location: `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md:6`, `docs/PR_BODY.md:8` vs `docs/application-audit-2026-09-13.md` and this audit.
Impact: Leadership, auditors or partners may rely on a "certified" status that the code does not support; AGENTS.md guardrail 6 forbids asserted compliance states.
Recommendation: Remove or clearly mark as superseded; replace with a CI-generated guardrail report.

**Severity: MEDIUM — No single entry point**
Problem: Equivalent rules exist in `AGENTS.md`, `docs/guides/CLAUDE.md`, `docs/PROMPT_LIBRARY.md`, `.cursorrules`, `docs/standards/*`. Architecture is described in five places.
Recommendation: README → one `docs/README.md` index → one architecture doc (kept current by PR checklist item) + ADR folder.

**Severity: MEDIUM — Missing "how to build a feature" guide**
Recommendation: A one-page guide showing the live pattern end-to-end: backend router/schema/migration → typed client → ViewModel → view → route registration → tests.

**Severity: LOW — Non-engineering content in the repo**
Recommendation: Move revenue reports, ticket spreadsheets and PR bodies to Drive/Notion/GitHub.
