# 13 — Testing: Solutions

Answers [audit/13-testing-audit.md](../audit/13-testing-audit.md). Owns **TD-30** (no E2E in CI), dead-code tests, the testing strategy and coverage reporting.

Related items owned elsewhere:
- CI execution: TD-39 and TD-02 in [18](18-cicd-deployment-solutions.md).
- Tests on Postgres: TD-11 in [16](16-database-solutions.md).

---

## 0. Get tests running again (prerequisite)
CI has not run tests on `main` since 2026-10-16 ([18](18-cicd-deployment-solutions.md) TD-39). The first green run after fixing CI is the real baseline. Expect to fix failures that accumulated in the meantime, and track them as one issue.

## 1. Remove tests of dead code
- Backend: 20 of 85 test files import unreachable modules. Delete them together with the modules ([03](03-architecture-solutions.md)).
- Frontend: 28 test files under `src/modules`. Delete them with the directory ([02](02-repository-structure-solutions.md)).
- Add the reachability guard test ([03](03-architecture-solutions.md)). Tests then count only live code.

## 2. TD-30 — E2E in CI, focused on money and safety paths

**Approach:** Playwright is already installed (`playwright 1.61.1`) and the `tests/*.smoke.mjs` scripts already drive it. Convert the highest-value scripts to `@playwright/test` specs and run them in CI against docker compose.

**Critical journeys** (5 specs; no broad UI coverage):
1. Sign up, then consent, OTP, session and dashboard. Uses demo mode ([09](09-installation-solutions.md)).
2. Add a health record, share it, the share is visible, revoke it, the share is gone.
3. Order, then payment webhook (signed with the test secret), then the order status changes. Includes a refund check: "TO_ARRANGE", never "refunded".
4. Doctor: confirm the appointment, write an encounter note, sign it, and the student sees it.
5. SOS: raise, each delivery attempt is shown with its real status, then acknowledged in the campus console.

**Proposed CI job (sketch)**
```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v4
      - run: cp .env.dev.example .env
      - run: docker compose up -d --build postgres migrate backend frontend   # app-only profile (21)
      - run: npx wait-on http://localhost:8000/api/health http://localhost:3000
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: npm }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npx playwright test
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report }
```
Run it on PRs into `main`, and nightly on `development`. Make it required for `main` once it is stable for one week.

**Effort:** M.

## 3. Backend suite on Postgres
See [16](16-database-solutions.md) TD-11 (transactional fixture). Keep SQLite only for `@pytest.mark.unit` tests.

## 4. Guard tests that protect architecture
| Test | Protects |
|---|---|
| `test_reachability.py` | no dead modules (TD-08) |
| every router mounted in `app.main.app`; no `include_router` on the real app inside tests | the DPDP-style "shipped but unmounted" bug |
| route-table snapshot | routing regressions (TD-07, TD-25) |
| `test_ai_single_entry.py` | guardrail 3 (TD-31) |
| `test_commerce_role_cannot_read_clinical` | Rule L (TD-03) |
| `test_app_env_defaults.py` | fail-closed environment handling (ENV-01) |

## 5. Coverage and test pyramid
- Turn on coverage reporting, without a gate at first:
  - Vitest: `--coverage` with `@vitest/coverage-v8`;
  - pytest: `pytest-cov`.
- Publish the reports as artifacts.
- Then add a **diff-coverage** gate: changed lines must reach at least 70%, measured by `diff-cover` in CI. This works better than a global percentage in a legacy codebase.
- Target mix:
  - many unit tests (ViewModels, services);
  - API tests for every router (FastAPI `TestClient` on Postgres);
  - 5–10 E2E journeys;
  - axe checks for screens ([27](27-i18n-accessibility-solutions.md)).

## 6. Mobile
Add Maestro flows for sign-in and record capture on an Android emulator, run nightly. Until then, use the manual device checklist in [29](29-mobile-offline-solutions.md).

## 7. Test integrity rules (add to CONTRIBUTING)
- If a PR changes a test's expected result, the PR description says why the old expectation was wrong.
- No scripts that rewrite tests (delete `patch_*.py`; see [02](02-repository-structure-solutions.md)).
- Tests mount routers only on a fresh `FastAPI()` instance, never on `app.main.app`.
