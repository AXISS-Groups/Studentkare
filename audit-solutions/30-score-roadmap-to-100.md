# 30 — Score Roadmap: From the Day-90 Targets to 100

This extends [00-executive-summary-solutions.md](00-executive-summary-solutions.md), whose Day-90 targets stop at 60–70.

## Why the plan stopped at about 65

1. **The audit scores are judgement, not measurement.** `audit/00` says so: "assessments, not measurements". On a judgement scale, 100 has no fixed meaning, so no plan can promise it.
2. **The last 30 points are not code changes.** They depend on:
   - **People:** more than one active contributor, and reviewers in every area.
   - **External parties:** a penetration test, native-speaker and clinician translation review, legal sign-off on DPDP retention, store review.
   - **Run-time evidence:** SLOs met for months, restore drills done, incidents handled. This only accumulates with time in production.
   - **Finishing long tails:** the last raw-hex files, the last large screens, every route on a typed contract.

**Solution: make the score computed.** Each area gets a 10-item checklist. Each item scores 10 points and passes only with linked evidence: a CI job, a test, a file or a signed record. **100 = all 10 items pass, with evidence.** This also follows AGENTS.md guardrail 6: a state is computed from evidence, never asserted.

Add `scripts/audit-score.mjs` to compute whatever can be automated (CI results, counts, file existence). Manual items link to a dated record in `docs/reviews/`. Each audit refresh publishes the computed score.

---

## Area checklists

Legend for the "Kind" column:
- **C**: code or config change in this repo.
- **P**: process or people.
- **X**: external review or sign-off.
- **T**: needs time in production.

Day-90 items come from the existing plan. The 70→100 items are new.

### Collaboration (38 → 100)
| # | Item (10 points each) | Evidence | Kind | By |
|---|---|---|---|---|
| 1 | CI required on `main` and `development`; 0 red merges in the last 90 days | branch protection settings + `gh run list` | C/P | Day 30 |
| 2 | CODEOWNERS with ≥ 2 owners for every path | `.github/CODEOWNERS` lint | P | Day 30 |
| 3 | A new screen touches only its feature folder (+1 line) | route-registry test | C | Day 60 |
| 4 | No backend file > 800 lines; `workflow_api.py` deleted | line-count check in CI | C | Day 90+ |
| 5 | Top author < 50% of merged PRs (rolling 90 days) | git stats script | P/T | 6 months |
| 6 | 100% of PRs reviewed by someone other than the author | GitHub API | P | Day 30 |
| 7 | ADRs for every architectural decision; none older than 12 months unreviewed | `docs/adr/` | P | Day 60 |
| 8 | Median PR open→merge < 2 days; conflict-merge commits < 5% | git stats | P/T | 6 months |
| 9 | CI wall time < 10 min with path-filtered jobs | Actions timing | C | Day 60 |
| 10 | Two feature teams shipped in parallel for a quarter without cross-team blocking incidents | retro record | P/T | 9–12 months |

### Architecture (48 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | 0 unreachable backend modules (guard test) | `test_reachability.py` | C |
| 2 | One frontend tree; `src/modules` gone; import ban | lint | C |
| 3 | All backend domains in `app/<domain>/` (router/service/schemas) | directory check | C |
| 4 | Every route has a `response_model`; generated TS client; drift check green | CI | C |
| 5 | Rule L enforced by Postgres roles; denial test green | CI | C |
| 6 | Alembic everywhere; `alembic check` green; migrations run as a job | CI | C |
| 7 | Layer rules linted: views never import data/http; services never import FastAPI `Request` | ESLint + import-linter (Python) | C |
| 8 | M18 either does not exist or is a separate service with its own DB role (ADR) | ADR + infra | C/P |
| 9 | Typed settings module; no direct `os.getenv` outside it | grep check | C |
| 10 | External architecture review signed off | `docs/reviews/` | X |

### Maintainability (38 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | Knip: 0 unused files, blocking | CI | C |
| 2 | 0 shims; 0 duplicate modules (basename duplicate check) | script | C |
| 3 | Hex legacy list empty; raw hex only in illustration data | ESLint | C |
| 4 | Icon legacy list empty | ESLint | C |
| 5 | `any` legacy list empty; `ban-ts-comment` 0 | ESLint | C |
| 6 | No TSX > 400 lines, no Python > 500 lines (excluding generated) | CI | C |
| 7 | 0 `print(` and 0 blind `except` in the backend (Ruff T20, BLE) | Ruff | C |
| 8 | 0 demo/mock data reachable in a production build | build-grep test | C |
| 9 | Tribal-knowledge list (audit 20) empty for two consecutive onboarding retros | retro record | P/T |
| 10 | Mean time to fix a production bug < 2 days (last quarter) | issue tracker | T |

### Documentation (45 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | README quick start verified nightly by the `quickstart` CI job | CI | C |
| 2 | `docs/README.md` index: every doc has a status and an owner, and was reviewed in the last 6 months | script | P |
| 3 | Generated env/config reference with a drift check | CI | C |
| 4 | Generated API reference (OpenAPI) published | CI | C |
| 5 | Onboarding guide with a worked feature example | file + linked PR | P |
| 6 | ADR set covers stack, deploy target, data boundaries, i18n, privacy | `docs/adr/` | P |
| 7 | Runbooks: deploy, rollback, restore, secret rotation, erasure keys, incident; each exercised once | drill records | P/T |
| 8 | Link checker and docs string checks green | CI | C |
| 9 | `AGENTS.md` claims all true (FHIR, Rule L, M18 wording matches reality) | review record | P |
| 10 | Two new hires rate the docs ≥ 4/5 with zero setup questions | survey | P/T |

### Developer onboarding (30 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | Docker path: running and signed in ≤ 30 min on a clean machine | quickstart job + human run | C |
| 2 | Native path documented end to end and verified | human run | P |
| 3 | Mobile path (Expo) documented and verified on a device | human run | P |
| 4 | Scaffolder produces the live pattern | test | C |
| 5 | "Build a feature" guide matches a PR from the last 3 months | review | P |
| 6 | Local commands identical to CI | doc check | C |
| 7 | Debugger configs committed for backend, frontend and tests | `.vscode/launch.json` | C |
| 8 | New-developer test: all 15 steps PASS | `audit/24` | C/P |
| 9 | First PR merged within 2 days by the last 3 hires | records | P/T |
| 10 | Productive (owns a ticket alone) within 2 weeks for the last 3 hires | retros | P/T |

### Scalability (52 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | Multi-replica checklist (audit-solutions 19) all ✅ | checklist | C |
| 2 | Connection pooling per environment; flat connection count under load | load-test report | C |
| 3 | Shared rate-limit store; per-client limits verified | test | C |
| 4 | Slow and external work (SOS, notifications, erasure) in the worker/outbox | code + test | C |
| 5 | Documents in encrypted object storage | code | C |
| 6 | Load test nightly; p95 < 300 ms at 3× current peak | k6 report | C/T |
| 7 | Frontend bundle budget enforced (`size-limit`) | CI | C |
| 8 | Horizontal autoscaling configured and exercised (HPA) | infra + drill | C/T |
| 9 | Capacity plan for 10× users reviewed | doc | P |
| 10 | Two quarters without a capacity-caused incident | incident log | T |

### Security (50 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | All P0 guardrails computed green in the guardrail report (audit-solutions 06) | CI artifact | C |
| 2 | Secret scanning plus push protection on; leaked credential rotated and recorded | settings + record | C/P |
| 3 | Proxy-aware rate limits; prod surface = 80/443 only (port scan) | test + scan | C |
| 4 | Dependency audit (npm, pip) blocking on high; Renovate active | CI | C |
| 5 | Every route authenticated or on the public allow-list; an IDOR test per domain | CI | C |
| 6 | Images non-root, pinned, scanned (Trivy) | CI | C |
| 7 | Threat model updated for erasure, SOS, passes and 2FA | `docs/security/THREAT_MODEL.md` | P |
| 8 | **External penetration test** with all high findings fixed | pentest report | X |
| 9 | Security logging and alerting: auth anomalies, 2FA disable, break-glass, erasure reads | alert rules + test | C |
| 10 | Incident-response drill done; mean time to respond measured | drill record | P/T |

### Testing (45 → 100)
| # | Item | Evidence | Kind |
|---|---|---|---|
| 1 | All suites run on every PR; flaky-test rate < 1% | CI stats | C |
| 2 | Backend suite on Postgres | CI | C |
| 3 | 0 tests of dead code (reachability) | guard test | C |
| 4 | E2E for all money and safety journeys, required on `main` | CI | C |
| 5 | Diff coverage ≥ 80% on changed lines | CI | C |
| 6 | Overall coverage ≥ 80% backend services, ≥ 70% ViewModels | report | C |
| 7 | Browser accessibility (axe + target size) on all mapped screens | CI | C |
| 8 | Native E2E (Maestro) nightly | CI | C |
| 9 | Migration up/down tested every PR | CI | C |
| 10 | Mutation testing on auth, consent and erasure modules ≥ 70% score | `mutmut` / Stryker report | C |

---

## Realistic timeline (estimate)

| Level | What it takes | When |
|---|---|---|
| ~65–70 | the Day-90 plan ([23](23-priority-action-plan-solutions.md)) | ~3 months |
| ~80–85 | the remaining **C** items above: long tails, coverage, docs automation, observability, hardening | ~6 months |
| ~90–95 | **P** items: CODEOWNERS depth, contributor spread, drills, ADRs, onboarding results | ~9 months, needs at least 3–4 active engineers |
| **100** | **X** and **T** items: pentest, external architecture and translation review, two quarters of production evidence | ~12 months |

## Honest caveats
- **Some 100s are organisational.** Collaboration and onboarding cannot pass while one person writes all the code. Hiring and rotating ownership are part of the solution, not optional extras.
- **100 is a snapshot.** New features add new debt. Keep the checklist in CI and re-score at every audit refresh. The aim is to stay above 90, not to hit 100 once.
- **Stop when the cost exceeds the value.** For example, mutation testing on every module, or zero files over 400 lines, may not be worth it everywhere. If the team decides an item doesn't apply, mark it **N/A with an ADR** and score the area out of the remaining items, rather than leaving it failing.

## Next step
Implement `scripts/audit-score.mjs` alongside PR-2 (CI) in [23](23-priority-action-plan-solutions.md). From then on, each audit refresh reports computed scores, and `audit/00` shows the checklist score next to the judgement score until the two converge.
