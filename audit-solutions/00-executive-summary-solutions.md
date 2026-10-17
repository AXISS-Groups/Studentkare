# 00 — Executive Summary: Solution Overview

Answers [audit/00-executive-summary.md](../audit/00-executive-summary.md) (verdict 🟠, `main` @ `ad01230`). This file is the leadership view: what to do, in what order, and how to tell it worked. Detail lives in the per-report solution files ([index](README.md)).

## Strategy in one paragraph
Keep the stack and the modular-monolith shape. Don't rewrite and don't split into microservices.

First, make automation trustworthy:
- CI that actually gates;
- deploy configs that match the code;
- a dev setup that signs in.

Second, remove what isn't real: dead modules, the parallel frontend tree, duplicate clients and demo screens.

Third, add the boundaries that let 10–15 people work in parallel:
- domain packages on the backend;
- per-feature routes on the frontend;
- a generated API contract;
- Postgres-enforced data separation.

Most items are small. The two large ones (domain split, Rule L) are incremental.

## The five highest-value moves

| # | Move | Fixes | Effort (estimate) | Solution |
|---|---|---|---|---|
| 1 | CI that gates every PR into `main` and `development` | TD-02, TD-39, TD-43, TD-45 | ~1 day + fixing hidden failures | [18](18-cicd-deployment-solutions.md), [26](26-design-system-solutions.md), [11](11-git-workflow-solutions.md) |
| 2 | Configuration matches the code: feature keys in deploy configs, demo flags in dev, one `APP_ENV` meaning | TD-40, TD-41, ENV-01, TD-14 | ~2 days | [25](25-environment-configuration-solutions.md), [09](09-installation-solutions.md) |
| 3 | Close the remaining exposure: proxy-aware rate limits, prod overlay, credential rotation | TD-10, TD-16, TD-05 | ~1–2 days | [17](17-security-solutions.md), [11](11-git-workflow-solutions.md) |
| 4 | Truth pass: delete dead and duplicate code, retarget the scaffolder | TD-06, TD-08, TD-17, TD-32, TD-37 | ~1 week | [02](02-repository-structure-solutions.md), [03](03-architecture-solutions.md), [05](05-code-quality-solutions.md) |
| 5 | Boundaries for parallel teams: domain routers, per-feature routes, typed contract, Rule L roles, campus consent gate | TD-07, TD-25, TD-13, TD-03, TD-47 | 3–6 weeks, incremental | [03](03-architecture-solutions.md), [07](07-collaboration-solutions.md), [15](15-api-solutions.md), [16](16-database-solutions.md), [28](28-privacy-solutions.md) |

## 30 / 60 / 90 days

| Horizon | Outcomes |
|---|---|
| **Day 30** | CI green and required on both branches; demo sign-in works from the README; feature keys deployed; rate limits per real client; prod overlay safe or removed; `src/modules` and dead backend modules gone; migrations run as a job; tests on Postgres; CODEOWNERS live |
| **Day 60** | Routes owned per feature; 3+ backend domains split out; typed client generated in CI; E2E for 5 journeys in CI; Tier 1 translations gated; SOS via outbox |
| **Day 90** | Rule L enforced by Postgres roles with a CI denial test; campus consent gate in place; document encryption with crypto-shred erasure; release workflow with versioned images and a rollback drill done |

## How to measure it

| Metric | Today (audit) | Day-90 target |
|---|---|---|
| CI runs reaching tests on `main` / `development` PRs | 0% / 0% | 100% / 100% |
| PRs merged with red CI | ≥ 1 (PR #135) | 0 (enforced) |
| Unreachable backend modules | 56 | 0 |
| Knip unused files | 166 | < 20 |
| One-line shims | 64 | 0 |
| `workflow_api.py` lines | 3,167 | < 1,000 (trending to 0) |
| Raw hex literals in TSX | 2,040 | < 500 |
| New-developer test (Docker path) | 3 PASS / 8 PARTIAL / 4 FAIL | all PASS |
| Commits by top author | 100% since baseline | < 60% |
| Guardrails met (computed report, [06](06-ai-vibe-code-solutions.md)) | 1, 2, 6, 8 met; 9, 10 partial | add 3, 4, 9, 10 |

## Expected score movement (if Day-90 outcomes land; estimates, to be re-audited)

| Area | Now | Target |
|---|---|---|
| Collaboration | 38 | 65 |
| Architecture | 48 | 65 |
| Maintainability | 38 | 60 |
| Documentation | 45 | 65 |
| Onboarding | 30 | 70 |
| Scalability | 52 | 65 |
| Security | 50 | 70 |
| Testing | 45 | 65 |

Beyond Day 90: the path to 100, with computed scores (a 10-item evidence checklist per area), is in [30-score-roadmap-to-100.md](30-score-roadmap-to-100.md).

## What not to do
- Don't start the domain split or Rule L before CI gates (move 1). Moves without verification are how the current debt formed.
- Don't introduce microservices, a new state library, or a new UI framework.
- Don't delete code from the team's dead-code list without re-running the import graph at the current HEAD.
- Don't flip unreviewed translations, crisis copy or consent flows without a named Tier 1 reviewer.

The sequenced PR list is in [23](23-priority-action-plan-solutions.md), and the per-finding map in [22](22-technical-debt-solutions.md).
