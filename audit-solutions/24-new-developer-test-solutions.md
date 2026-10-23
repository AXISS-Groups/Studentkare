# 24 — New Developer Test: Solutions

Answers [audit/24-new-developer-test.md](../audit/24-new-developer-test.md). For every step that is not PASS today, this lists the fix and the evidence that would make it pass. Target: **all steps PASS on the Docker path.** The native path stays PARTIAL until documented end-to-end.

| # | Step | Now | Fix | Solution | PASS when |
|---|---|---|---|---|---|
| 1 | Find repository | PARTIAL | Correct the clone URL in CONTRIBUTING | [09](09-installation-solutions.md) TD-14 | no `kktejas07` anywhere (docs check in CI) |
| 2 | Read README | PARTIAL | Correct the DB description; delete the Java section; add a Mobile link | [09](09-installation-solutions.md) | docs string-check job passes |
| 3 | Understand project | PARTIAL | `docs/README.md` index with statuses; onboarding guide; archive superseded plan files | [10](10-documentation-solutions.md), [08](08-developer-onboarding-solutions.md) | a newcomer can name the 5 roles and the live code folders after 30 minutes of reading |
| 5 | Configure environment | PARTIAL | Demo flags in `.env.dev.example`; generated env table | [09](09-installation-solutions.md) TD-41, [25](25-environment-configuration-solutions.md) ENV-04 | `cp .env.dev.example .env` is the only step |
| 6 | Install dependencies | PASS / PARTIAL | `.npmrc` (`legacy-peer-deps`, `engine-strict`); pip lock | [12](12-dependency-solutions.md) | `npm ci` and `pip install -r` succeed on a clean machine |
| 7 | Start application | PARTIAL / FAIL | Dev profile with HMR; native backend docs include Postgres and `DATABASE_URL` | [21](21-developer-experience-solutions.md), [09](09-installation-solutions.md) | `docker compose up` gives an HMR UI in under 5 minutes after the images are built |
| 7b | Sign in | FAIL | Demo mode via `.env.dev.example` | [09](09-installation-solutions.md) TD-41 | quickstart CI job signs in as `demo.student@studentkare.test` |
| 8 | Run tests | PARTIAL | CONTRIBUTING commands identical to CI; tests on Postgres | [09](09-installation-solutions.md), [16](16-database-solutions.md) | local commands = CI commands, documented once |
| 9 | Understand architecture | FAIL | Delete `src/modules`; scaffolder to `features`; `src/features/README.md`; ADRs | [02](02-repository-structure-solutions.md), [04](04-mvvm-solutions.md), [10](10-documentation-solutions.md) | `test -d src/modules` fails; `gen:module` output lives in `src/features` |
| 11 | Modify feature | PARTIAL | Per-feature routes; "build a feature" guide; `check-icons --mapped` | [07](07-collaboration-solutions.md), [08](08-developer-onboarding-solutions.md), [26](26-design-system-solutions.md) | a new screen PR touches only `src/features/<domain>/**` (+1 line) |
| 12 | Run tests | PARTIAL | as step 8 | | |
| 14 | Create PR | FAIL | CI on `development`; icon audit non-blocking; branch protection; CODEOWNERS | [18](18-cicd-deployment-solutions.md), [11](11-git-workflow-solutions.md) | a PR into `development` gets green or red checks that reflect the change, and an auto-assigned reviewer |

## Make the test repeatable
1. **Automate the mechanical part.** The `quickstart` CI job ([09](09-installation-solutions.md)) runs the README verbatim on a clean runner: clone, copy env, `docker compose up`, health check, demo sign-in. Run it nightly and on changes to setup files.
2. **Human run each quarter.** The next hire, or someone outside the team, follows only the README and the onboarding guide, with a timer.
   - Record time to a running stack, time to signed in, time to the first merged PR, and every question they had to ask.
   - Each question becomes a doc fix or a [20](20-maintainability-solutions.md) tribal-knowledge item.
3. **Track it in the audit.** Update `audit/24-new-developer-test.md` with the results and the date.

## Target answer
"Could a competent developer join on Monday and be productive by Tuesday without extensive hand-holding?"

**Yes**, once PR-1 to PR-3 and PR-9, PR-10 and PR-18 from [23](23-priority-action-plan-solutions.md) are merged. That is about 2–3 days of focused work (estimate).
