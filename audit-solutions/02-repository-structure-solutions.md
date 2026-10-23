# 02 — Repository Structure: Solutions

Answers [audit/02-repository-structure.md](../audit/02-repository-structure.md). Owns **TD-06** (three frontend trees / dead `src/modules`) and **TD-32** (root clutter). The design archive (TD-33) is owned by [26](26-design-system-solutions.md); backend dead modules (TD-08) by [03](03-architecture-solutions.md).

---

## TD-06 — One frontend architecture; delete `src/modules`

**Goal:** `src/features/<domain>/` is the only place feature code lives. "Exists" means "runs".

**Approach:** Delete dead code in staged, reviewable PRs from a freshly verified cleanup plan (pending), then lock the result in with tooling. Do not execute the old `docs/dead-code-2026-10-14.md` list: it is superseded, and four files on it are now used by the app.

**Steps**
1. **Re-verify the list** at the current HEAD. Re-run the import-graph script the team used, plus Knip with stricter entries:
   ```json
   // config/knip.json, stricter entries so dead screens/components are reported (see 05)
   { "entry": ["src/main.tsx", "src/native/index.ts", "src/**/*.stories.tsx", "vite.config.ts"],
     "project": ["src/**/*.{ts,tsx}"] }
   ```
   Route `load()` targets are dynamic imports from `module.ts` files reachable from `main.tsx`, so Knip follows them.
2. **PR 1 — delete `src/modules/**`** and the `src/features/*/index.ts` barrels that only re-export it. Delete the 28 tests under `src/modules`. Before deleting, check whether any module holds logic its matching feature lacks. The team's notes say the live equivalents exist; if one doesn't, move it into `src/features/<domain>/` first.
3. **PR 2 — retarget the scaffolder** `scripts/gen-module.js:24` to `src/features/<name>/` with the live template: MobX ViewModel implementing `ViewModel` (`src/core/store/ViewModel.ts`), `views/`, `module.ts` route registration, `__tests__/`.
4. **PR 3…n — fold `src/screens/<domain>` into `src/features/<domain>/screens`**, one domain per PR. This is a pure move with import rewrites (use `ts-morph` or an IDE move). Do it when a domain is next touched; don't do a big-bang move.
5. **Lock it in** with an ESLint rule:
   ```js
   { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', {
       patterns: [{ group: ['@/modules/*', '**/modules/m*'], message: 'src/modules was removed; use src/features/<domain>.' }] }] } }
   ```
   Merge this into the existing `no-restricted-imports` config for screen files; flat config does not merge options across blocks.
6. Update `docs/architecture/ARCHITECTURE.md` and add `src/features/README.md` describing the folder contract (see [08](08-developer-onboarding-solutions.md)).

**Verify**
- `test -d src/modules` fails.
- Knip "unused files" drops from 166 to under 20, and those that remain are justified in `knip.json` `ignore` with a comment.
- `npx tsc --noEmit`, `vitest run` and `npm run build` are green.

**Effort:** M. **Risk:** A dynamic import Knip can't see. Mitigate by running the smoke and E2E suite ([13](13-testing-solutions.md)) before merging each PR; deletions are reversible with `git checkout <sha>^ -- <path>`.
**Depends on:** CI gate ([18](18-cicd-deployment-solutions.md)).

---

## TD-32 — Root clutter

| File | Action |
|---|---|
| `patch_last_13.py`, `patch_last_8.py`, `patch_tests.py` | delete (they rewrite tests in place) |
| `vite.config.ts.timestamp-*.mjs` | delete; add `vite.config.ts.timestamp-*` to `.gitignore` |
| `load_test.py` | move to `scripts/load/` with a README, or delete |
| root `knip.json` vs `config/knip.json` | keep `config/knip.json`; point CI's `npx knip` at it; delete the root copy |
| root `.gitleaks.toml` vs `config/gitleaks.toml` | keep `config/`; delete the root copy |
| untracked `Audit_Plan.md`, `Intial_Audit_plan.md` | move under `audit/` (or `docs/audit/`), or delete — owner's call |

**Verify:** `ls` at the root shows only project entry files, and CI references one config of each kind. **Effort:** S.

---

## Target layout (after the steps above)

```text
src/
  app/            (App.tsx, main.tsx, routing shell)
  core/           (routing registry, navigation facade, store contract, env, http)
  design-system/  (components, icons, stories)
  features/<domain>/{module.ts, viewmodel/, views/, screens/, store/, api.ts, __tests__/}
  i18n/
  native/         (Expo shell only; screens come from features where shared)
backend/
  app/<domain>/{router.py, service.py, schemas.py}   (see 03)
  core/  alembic/  tests/
deploy/  design/ (code-read parts only, see 26)  docs/  scripts/
```
Do not create package workspaces (npm/pnpm) yet. A single package is right at this size; revisit only if build times or ownership demand it.
