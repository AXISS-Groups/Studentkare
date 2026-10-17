# Studentkare Architecture Audit — Index

## Purpose and scope
This is an evidence-based assessment of whether the Studentkare codebase can support a 10–15 person engineering team safely: architecture, collaboration, onboarding, security, testing, operations and long-term risk. The audit is **read-only**: only files in `audit/` are written.

| | |
|---|---|
| Last update | **2026-10-17** |
| Revision audited | `main` @ `ad01230` (merge of PR #135, 2026-10-16) |
| Previous baseline | `development` @ `ab4ce3f` (2026-10-08). The diff between the two (84 commits) was inspected directly. |
| Not executed | test suites, app runs, installs, `npm run icons:audit` (writes into `design/`). CI results come from GitHub Actions history. |

## How to read it
- Start with [00 — Executive summary](00-executive-summary.md).
- [22 — Technical debt](22-technical-debt.md) is the **finding register**. Every finding has one stable ID (`TD-xx`) and one current status. Other reports cross-reference these IDs rather than restating the finding. Report-local IDs (`ENV-`, `DS-`, `I18N-`, `A11Y-`, `PRIV-`, `MOB-`, `SCALE-`) are used for findings that live only in one dimension report, or they point to a `TD-xx`.
- Each of reports 01–21 opens with a dated revalidation block. The text below it, "Original assessment (2026-10-08)", is kept as the historical record. Where the two disagree, the block wins.
- Statuses: OPEN · PARTIALLY RESOLVED · RESOLVED · REGRESSED · CHANGED · SUPERSEDED · NOT REVALIDATED · NO LONGER APPLICABLE.

## Reports

| File | Responsibility |
|---|---|
| [00-executive-summary.md](00-executive-summary.md) | Verdict, scores, current critical/high findings, top risks, next actions |
| [01-technology-stack.md](01-technology-stack.md) | Languages, frameworks, services, tooling |
| [02-repository-structure.md](02-repository-structure.md) | Repo layout, module boundaries, monorepo assessment |
| [03-architecture-audit.md](03-architecture-audit.md) | System architecture, layering, reachability |
| [04-mvvm-audit.md](04-mvvm-audit.md) | MVVM as implemented (frontend) |
| [05-code-quality.md](05-code-quality.md) | Metrics, duplication, lint/Knip, type safety |
| [06-ai-vibe-code-audit.md](06-ai-vibe-code-audit.md) | AI-assisted development patterns and honesty fixes |
| [07-collaboration-readiness.md](07-collaboration-readiness.md) | Hotspots, ownership, bus factor |
| [08-developer-onboarding.md](08-developer-onboarding.md) | First-week experience |
| [09-installation-audit.md](09-installation-audit.md) | Setup docs vs the actual repo |
| [10-documentation-audit.md](10-documentation-audit.md) | Docs inventory and accuracy |
| [11-git-workflow.md](11-git-workflow.md) | Branching, CI triggers, history, protection |
| [12-dependency-audit.md](12-dependency-audit.md) | Manifests, lockfiles, unused deps |
| [13-testing-audit.md](13-testing-audit.md) | Test inventory, gaps, execution |
| [14-error-handling-logging.md](14-error-handling-logging.md) | Errors, logging, PII in logs |
| [15-api-audit.md](15-api-audit.md) | Routes, auth coverage, contracts |
| [16-database-audit.md](16-database-audit.md) | Schema, migrations, pooling, Rule L |
| [17-security-audit.md](17-security-audit.md) | Security findings and guardrail scorecard |
| [18-cicd-deployment.md](18-cicd-deployment.md) | CI, images, deploy paths |
| [19-scalability-audit.md](19-scalability-audit.md) | Team, product and traffic scaling |
| [20-maintainability.md](20-maintainability.md) | Tribal knowledge, signal-to-noise |
| [21-developer-experience.md](21-developer-experience.md) | Local dev loop and tooling |
| [22-technical-debt.md](22-technical-debt.md) | **Finding register** and debt inventory |
| [23-priority-action-plan.md](23-priority-action-plan.md) | Prioritised actions with finding IDs |
| [24-new-developer-test.md](24-new-developer-test.md) | Clone-to-PR simulation |
| [25-environment-configuration.md](25-environment-configuration.md) | **New 2026-10-17.** Env vars, secrets, config drift |
| [26-design-system-and-icon-pipeline.md](26-design-system-and-icon-pipeline.md) | **New 2026-10-17.** Design kit, icon generation, lint ratchets, coverage gate |
| [27-i18n-and-accessibility.md](27-i18n-and-accessibility.md) | **New 2026-10-17.** en/te/hi catalogues, translation review, axe |
| [28-privacy-consent-data-governance.md](28-privacy-consent-data-governance.md) | **New 2026-10-17.** Consent, DPDP erasure, passes, SOS disclosures |
| [29-mobile-native-and-offline.md](29-mobile-native-and-offline.md) | **New 2026-10-17.** Expo app, permissions, service worker, offline pass |

Original audit numbering (00–24) is preserved. The baseline prompt list had no separate file for "environment & configuration", "observability", "naming" or "production readiness". Configuration now has its own file (25). Observability stays in 14 and 18, naming in 05, and production readiness in 00 and 18.

## Current critical and high findings (2026-10-17)

| ID | Severity | Status | One line |
|---|---|---|---|
| TD-02 | CRITICAL | OPEN | CI ignores the `development` branch |
| TD-03 | CRITICAL | OPEN | Rule L not enforced by Postgres roles/grants |
| TD-39 | HIGH | NEW | CI red on `main`: icon audit blocks tsc, tests, build and secret scan |
| TD-40 | HIGH | NEW | Six feature keys missing from all deploy configs |
| TD-41 | HIGH | NEW | Docker quick start cannot sign in |
| TD-46 | HIGH | OPEN | Bus factor: one author |
| TD-47 | HIGH | NOT REVALIDATED | Campus consoles without a consent gate (team-reported) |
| TD-05, 06, 07, 08, 10, 11, 12, 13, 14, 16, 30 | HIGH | OPEN / NOT REVALIDATED | See [22](22-technical-debt.md) |

Resolved since baseline: TD-04 (2FA persisted), TD-18 (DPDP → erasure), TD-26 (certificate withdrawn), the 18+ guardian conflict, and the Razorpay demo key.

## How this audit is maintained
1. Record the revision audited (`git rev-parse --short HEAD`) and the previous baseline above.
2. Inspect `git diff --stat <baseline>..HEAD` and `git log`, and re-run the same read-only scans: backend reachability from `app.main`, the route auth scan, frontend metrics, Knip, ESLint and `tsc`. Write the output outside the repo.
3. Revalidate every row of the register in 22 against the current code. Close a finding only with evidence.
4. Add a dated block to each affected report. Do not delete history; mark it as original.
5. Add a dimension report only for a new subsystem with its own risks (criteria in the audit prompt §6).
6. Update 00, 23, 24 and this index together. Check that IDs, severities and statuses agree everywhere.
7. Confirm that `git status` shows changes only under `audit/`.
