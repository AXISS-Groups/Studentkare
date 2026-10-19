# Studentkare Architecture Audit — Index

## Purpose and scope
This is an evidence-based assessment of whether the Studentkare codebase can support a 10–15 person engineering team safely: architecture, collaboration, onboarding, security, testing, operations and long-term risk. The audit is **read-only**: only files in `audit/` are written.

| | |
|---|---|
| Last update | **2026-10-17 (revalidation 2)** |
| Revision audited | `main` @ `d333afe` (merge of PR #136, 2026-10-17) |
| Previous revalidation | `main` @ `ad01230` (merge of PR #135), earlier the same day. 60 commits in between (40 non-merge); the diff was inspected directly |
| Original baseline | `development` @ `ab4ce3f` (2026-10-08) |
| Not executed | test suites, app runs, installs, `npm run icons:audit` (writes into `design/`) |
| Not available | GitHub Actions and PR history (`gh` returned HTTP 401). CI statements in this pass come from `ci.yml`, not from run results |
| Executed (read-only, output outside the repo) | `tsc --noEmit` (web and native configs), ESLint, Knip, a static import walk, an AST route scan |

## How to read it
- Start with [00 — Executive summary](00-executive-summary.md).
- [22 — Technical debt](22-technical-debt.md) is the **finding register**.
  - Every finding has one stable ID (`TD-xx`) and one current status. Other reports cross-reference these IDs rather than restating the finding.
  - Report-local IDs (`ENV-`, `DS-`, `I18N-`, `A11Y-`, `PRIV-`, `MOB-`, `SCALE-`, `AI-`, `JOB-`) are for findings that live only in one dimension report, or they point to a `TD-xx`.
- Each dimension report opens with its newest dated block: "revalidation 2 (`d333afe`)", then "revalidation 1 (`ad01230`)", then "Original assessment (2026-10-08)". Older blocks are the historical record. Where blocks disagree, the newest wins.
- Statuses: OPEN · PARTIALLY RESOLVED · RESOLVED · REGRESSED · CHANGED · SUPERSEDED · NOT REVALIDATED · NO LONGER APPLICABLE.
- `audit-solutions/` (outside this folder) holds fix proposals written against `ad01230`. It is **not** maintained by this audit, and some of its targets have since closed or changed. Use 22 for status.

## Reports

| File | Responsibility |
|---|---|
| [00-executive-summary.md](00-executive-summary.md) | Verdict, scores, current critical/high findings, top risks, next actions |
| [01-technology-stack.md](01-technology-stack.md) | Languages, frameworks, services, tooling |
| [02-repository-structure.md](02-repository-structure.md) | Repo layout, module boundaries, monorepo assessment |
| [03-architecture-audit.md](03-architecture-audit.md) | System architecture, layering, reachability |
| [04-mvvm-audit.md](04-mvvm-audit.md) | MVVM as implemented (frontend) |
| [05-code-quality.md](05-code-quality.md) | Metrics, duplication, lint/Knip, type safety |
| [06-ai-vibe-code-audit.md](06-ai-vibe-code-audit.md) | AI-assisted *development* patterns and honesty fixes |
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
| [25-environment-configuration.md](25-environment-configuration.md) | Env vars, secrets, config drift (added rev 1) |
| [26-design-system-and-icon-pipeline.md](26-design-system-and-icon-pipeline.md) | Design kit, icon generation, lint ratchets, coverage gate (added rev 1) |
| [27-i18n-and-accessibility.md](27-i18n-and-accessibility.md) | en/te/hi catalogues, translation review, axe (added rev 1) |
| [28-privacy-consent-data-governance.md](28-privacy-consent-data-governance.md) | Consent, DPDP erasure, passes, SOS and crisis disclosures (added rev 1) |
| [29-mobile-native-and-offline.md](29-mobile-native-and-offline.md) | Expo app, permissions, service worker, offline pass (added rev 1) |
| [30-ai-llm-integration.md](30-ai-llm-integration.md) | **New in rev 2.** LLM gateway (AI constitution), Agent Ayush generation and grounding guard, retrieval, AI evaluation |
| [31-background-jobs-and-outbox.md](31-background-jobs-and-outbox.md) | **New in rev 2.** Worker service, job leases, notification outbox, urgent delivery, worker observability |

Original audit numbering (00–24) is preserved. Observability stays in 14, 18 and 31; naming in 05; production readiness in 00 and 18.

## Current critical and high findings (revalidation 2)

**Critical:** none. TD-02 and TD-03 moved down to HIGH; see 22 for why.

| ID | Severity | Status | One line |
|---|---|---|---|
| TD-03 | HIGH | PARTIALLY RESOLVED | Rule L grants enforced for commerce paths on a provisioned DB; fails open by default |
| TD-02 | HIGH | CHANGED | Docs prescribe the abandoned `development` branch, which CI does not cover; real PRs go to `main` |
| TD-39 | HIGH | OPEN (narrowed) | Icon audit can skip the frontend gates; backend Postgres job is independent; run status unverified |
| TD-40 | HIGH | OPEN (wider) | Feature keys missing from all deploy configs, worker included |
| TD-41 | HIGH | OPEN | Docker quick start cannot sign in |
| TD-46 | HIGH | OPEN | Bus factor: 31 of 40 recent commits by one author |
| TD-47 | HIGH | NOT REVALIDATED | Campus consoles without a consent gate (first live one: PRIV-08) |
| TD-05, 06, 07, 10, 12, 13, 14, 16, 30 | HIGH | OPEN / NOT REVALIDATED | See [22](22-technical-debt.md) |

**New in rev 2:**
- TD-48: email suppression reads MongoDB and fails open (LOW).
- TD-49: serial worker with no dead-man alert (MEDIUM).
- AI-01: dropped-negation gap (MEDIUM).
- PRIV-08: counsellor queue has no recorded lawful basis (MEDIUM).
- DS-06: hand-drawn icon set bypasses the manifest (MEDIUM).
- JOB-04 / JOB-06 (blocked erasure not alerted; `CRISIS_ALERT` never produced) and ENV-06 (worker env blocks copied by hand).

**Resolved since the original baseline:** TD-04 (2FA persisted), TD-18 (DPDP → erasure), TD-26 (certificate withdrawn), TD-31 (AI constitution wired, rev 2), the 18+ guardian conflict, and the Razorpay demo key.

## How this audit is maintained
1. Record the revision audited (`git rev-parse --short HEAD`) and the previous revision above.
2. Inspect `git diff --stat <previous>..HEAD` and `git log`. Re-run the same read-only scans and write their output outside the repo:
   - backend reachability from `app.main` **and** `scripts.workflow_worker`;
   - the route auth scan;
   - Knip, ESLint, and `tsc` for both the web and native configs.
3. Revalidate every row of the register in 22 against the current code. Close a finding only with evidence. When an earlier statement turns out to be wrong, record a correction rather than silently editing it (example: the gitleaks note in 18).
4. Add a dated block at the top of each affected report. Do not delete history; mark it as an earlier revalidation.
5. Add a dimension report only for a new subsystem with its own risks (criteria in the audit prompt §6).
6. Update 00, 22, 23, 24 and this index together. Check that IDs, severities and statuses agree everywhere.
7. Confirm that `git status` shows changes only under `audit/`.
8. If `gh` is authenticated, read the latest CI runs on `main` and record them. If it is not, say so, as this pass does.
