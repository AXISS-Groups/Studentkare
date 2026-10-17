# Studentkare Audit Solutions — Index

These are solution designs for every report in [`../audit/`](../audit/README.md). The audit describes the problems; this folder describes how to fix them.

| | |
|---|---|
| Written | 2026-10-17 |
| Based on | audit revision `main` @ `ad01230` (see `audit/README.md`) |
| Status | **Proposals only.** No application code, config, CI or deployment file has been changed. Every snippet below is a sketch to be implemented in its own PR, reviewed, and verified by CI. |

## How to use this folder

- Each file `NN-*.md` answers the audit report with the same number.
- Every solution is keyed by the audit's stable finding ID (`TD-xx`, or a report-local ID such as `ENV-01` or `DS-03`).
- **Each finding is solved in exactly one file, its owner file.** Other files link to it rather than repeating it. The owner table below says where each solution lives.
- Each solution has the same parts:
  - **Goal**
  - **Approach**
  - **Steps**
  - **Proposed change** (code or config sketch)
  - **Verify** (acceptance criteria)
  - **Effort** (estimate: S ≤ 1 day, M ≤ 1 week, L multi-week)
  - **Risk / rollback**
  - **Depends on**
- Order of work: follow [23-priority-action-plan-solutions.md](23-priority-action-plan-solutions.md). It turns the audit's action plan into a sequenced PR plan.
- **Guardrails for implementers:**
  - AGENTS.md rules still apply: fail closed, no auth fallback, strict TypeScript, accessibility, and Tier 1 screens need a named reviewer before code.
  - Use one ticket per branch and PR (CLAUDE.md).
  - Snippets name real files and symbols as they were at `ad01230`. Re-read the target before editing; line numbers drift.

## Files

| Audit report | Solution file | Owns findings |
|---|---|---|
| 00 Executive summary | [00-executive-summary-solutions.md](00-executive-summary-solutions.md) | roll-up: the 30-day plan and how to measure it |
| 01 Technology stack | [01-technology-stack-solutions.md](01-technology-stack-solutions.md) | TD-34, stack sprawl |
| 02 Repository structure | [02-repository-structure-solutions.md](02-repository-structure-solutions.md) | TD-06, TD-32 |
| 03 Architecture | [03-architecture-solutions.md](03-architecture-solutions.md) | TD-07, TD-08, startup side effects |
| 04 MVVM | [04-mvvm-solutions.md](04-mvvm-solutions.md) | TD-09, TD-20, view→API, `addPoints`, global navigator |
| 05 Code quality | [05-code-quality-solutions.md](05-code-quality-solutions.md) | TD-17, TD-23, TD-35 |
| 06 AI / vibe-code | [06-ai-vibe-code-solutions.md](06-ai-vibe-code-solutions.md) | TD-37, process guardrails against regression |
| 07 Collaboration | [07-collaboration-solutions.md](07-collaboration-solutions.md) | TD-25, TD-46 |
| 08 Onboarding | [08-developer-onboarding-solutions.md](08-developer-onboarding-solutions.md) | onboarding guide and scaffolder |
| 09 Installation | [09-installation-solutions.md](09-installation-solutions.md) | TD-14, TD-41 |
| 10 Documentation | [10-documentation-solutions.md](10-documentation-solutions.md) | docs index, ADRs, plan-file sprawl |
| 11 Git workflow | [11-git-workflow-solutions.md](11-git-workflow-solutions.md) | TD-05, TD-36, branch protection, CODEOWNERS |
| 12 Dependencies | [12-dependency-solutions.md](12-dependency-solutions.md) | reproducible installs, dead dependencies |
| 13 Testing | [13-testing-solutions.md](13-testing-solutions.md) | TD-30, dead-code tests, Postgres test suite |
| 14 Errors & logging | [14-error-handling-logging-solutions.md](14-error-handling-logging-solutions.md) | TD-15, TD-19 |
| 15 API | [15-api-solutions.md](15-api-solutions.md) | TD-13, versioning, pagination, error codes |
| 16 Database | [16-database-solutions.md](16-database-solutions.md) | TD-03, TD-11, TD-12, TD-21, TD-38 |
| 17 Security | [17-security-solutions.md](17-security-solutions.md) | TD-10, TD-16, TD-29, TD-31, TD-42, origin check |
| 18 CI/CD | [18-cicd-deployment-solutions.md](18-cicd-deployment-solutions.md) | TD-02, TD-22, TD-39, TD-45, image hardening |
| 19 Scalability | [19-scalability-solutions.md](19-scalability-solutions.md) | SCALE-01, multi-replica readiness |
| 20 Maintainability | [20-maintainability-solutions.md](20-maintainability-solutions.md) | tribal-knowledge burn-down |
| 21 Developer experience | [21-developer-experience-solutions.md](21-developer-experience-solutions.md) | TD-28 |
| 22 Technical debt | [22-technical-debt-solutions.md](22-technical-debt-solutions.md) | register → solution map for every TD-01…TD-47 |
| 23 Action plan | [23-priority-action-plan-solutions.md](23-priority-action-plan-solutions.md) | sequenced PR plan |
| 24 New developer test | [24-new-developer-test-solutions.md](24-new-developer-test-solutions.md) | step-by-step fixes to turn FAIL/PARTIAL into PASS |
| 25 Environment & config | [25-environment-configuration-solutions.md](25-environment-configuration-solutions.md) | TD-01 residual (ENV-01), TD-40, ENV-04, ENV-05 |
| 26 Design system & icons | [26-design-system-solutions.md](26-design-system-solutions.md) | TD-24, TD-33, TD-43, DS-04, DS-05 |
| 27 i18n & a11y | [27-i18n-accessibility-solutions.md](27-i18n-accessibility-solutions.md) | TD-44, I18N-02, A11Y-01/02 |
| 28 Privacy & DPDP | [28-privacy-solutions.md](28-privacy-solutions.md) | TD-27, TD-47, PRIV-03, PRIV-06 |
| 29 Mobile & offline | [29-mobile-offline-solutions.md](29-mobile-offline-solutions.md) | MOB-01…04 (TD-45 owned by 18) |
| (scores) | [30-score-roadmap-to-100.md](30-score-roadmap-to-100.md) | computed 10-item checklist per area; path from ~65 to 100 |

Already resolved in the audit (no solution needed, kept for history): TD-04, TD-18, TD-26, the guardian/18+ conflict, and the Razorpay demo key.
