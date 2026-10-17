# 06 — AI-Assisted Development Debt: Solutions

Answers [audit/06-ai-vibe-code-audit.md](../audit/06-ai-vibe-code-audit.md). Owns **TD-37** (client-side "auth managers") and the **process controls** that stop the seven patterns from coming back. The individual cleanups are owned elsewhere:

| Pattern | Owner |
|---|---|
| 1 Duplicates | [02](02-repository-structure-solutions.md) TD-06, [05](05-code-quality-solutions.md) TD-17 |
| 2 Foreign code | [03](03-architecture-solutions.md) TD-08 |
| 3 Simulations | [04](04-mvvm-solutions.md) TD-09, [14](14-error-handling-logging-solutions.md) TD-19 |
| 5 Self-certification | resolved (TD-26) |
| 7 Hardcoded fallbacks | [25](25-environment-configuration-solutions.md) |

---

## TD-37 — Delete client-side security "managers"
Delete `src/core/auth/otpManager.ts`, `sessionManager.ts` and `stepUpAuth.ts`, and their tests. They are unimported, according to the audit and the withdrawn certificate's own table.

For `src/core/auth/rbac.ts`, which is imported by `src/features/admin/model/accessRules.ts`:
- keep only the pure role→route mapping used for UI visibility;
- delete the break-glass session `Map` and the `Math.random` session IDs;
- break-glass must be a server endpoint with an audit log, or not exist.

Add a header comment stating that the client never enforces; it only hides UI.

**Verify:** `git grep -n "Math.random" -- src/core` returns no hits. **Effort:** S.

---

## Process controls (so the patterns do not recur)

The patterns came from fast iterative generation: new files beside old ones, simulations kept "for now", tests bent to pass. The fixes below are mechanical, so they don't depend on reviewer memory.

| Pattern | Control | Where |
|---|---|---|
| Parallel re-implementations | Knip blocking in CI; shim ban; `src/modules` import ban | [05](05-code-quality-solutions.md), [02](02-repository-structure-solutions.md) |
| Foreign/dead backend code | reachability guard test | [03](03-architecture-solutions.md) |
| Simulation shipped as product | lint bans: `Math.random` in `src/screens`/`src/features` (outside tests and stories); `DEMO_`/`INITIAL_` arrays outside fixtures; `mockData` imports outside tests | below |
| Success after failure | review checklist item + ESLint `no-restricted-syntax` on `.catch(() => {})` and empty `catch {}` in views | [14](14-error-handling-logging-solutions.md) |
| Self-certification | compliance status only from a CI-generated report (below) | — |
| Tests shaped to pass | ban `include_router` in tests except on a fresh `FastAPI()`; delete `patch_*.py`; test-file changes in a PR need a reason in the PR body | [13](13-testing-solutions.md) |
| Hardcoded fallbacks | `core/settings.py` with production-required fields | [25](25-environment-configuration-solutions.md) |

**Simulation lint (sketch)**
```js
{ files: ['src/screens/**/*.tsx', 'src/features/**/*.{ts,tsx}', 'src/components/**/*.tsx'],
  ignores: ['**/__tests__/**', '**/*.stories.tsx'],
  rules: { 'no-restricted-properties': ['error',
    { object: 'Math', property: 'random', message: 'IDs and data come from the server. Use crypto.randomUUID() for client-only keys.' }] } }
```

**CI-generated guardrail report** (replaces the withdrawn certificate). This is a script, `scripts/guardrail-report.mjs`, run in CI and uploaded as an artifact. It never writes a verdict by hand:
| Guardrail | Computed from |
|---|---|
| 1, 2 | backend tests tagged `@pytest.mark.guardrail_fail_closed` (count and pass) |
| 3 | `test_ai_single_entry.py` result ([17](17-security-solutions.md)) |
| 4 | `test_commerce_role_cannot_read_clinical` result ([16](16-database-solutions.md)) |
| 7 | axe results, jsx-a11y error count |
| 9 | gitleaks result; localStorage-token lint count; `print(` count with identifiers |
| 10 | `any` legacy count; `ban-ts-comment` violations |

**AI-assistant instructions.** `AGENTS.md` and `CLAUDE.md` already guide the agents. Add three rules:
1. "Before creating a file, search for an existing one with the same responsibility; edit it instead."
2. "Never add sample or demo data to a screen. Use `design-system/States` for not-connected states."
3. "Never change a test to make it pass without explaining why the old expectation was wrong."

**Effort:** S (lint, docs), M (report script).
