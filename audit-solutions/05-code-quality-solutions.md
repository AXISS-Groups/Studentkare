# 05 — Code Quality: Solutions

Answers [audit/05-code-quality.md](../audit/05-code-quality.md). Owns **TD-17** (duplicate API clients and shims), **TD-23** (weak lint, non-blocking Knip) and **TD-35** (`any` / `@ts-ignore`), plus large files and silent excepts in Python. Raw hex (TD-24) is owned by [26](26-design-system-solutions.md).

---

## TD-17 — One API client; remove the 64 re-export shims

**Steps**
1. **Keep the live client.** `src/data/api.ts` (610 lines) has 9 non-test importers, including `App.tsx`. `src/data/services/api.ts` (644 lines) has **0** (checked at `ad01230`). Diff the two, port anything that exists only in the dead copy and is still needed, then delete `src/data/services/api.ts`. If the team prefers the `services/` location, move the live file there in a separate, pure-move PR afterwards.
2. **Shims.** A codemod rewrites imports from each 1-line `export * from '…'` file to its target, then deletes the shim:
   ```bash
   # list shims
   for f in $(git ls-files 'src/**/*.ts' 'src/**/*.tsx'); do
     [ "$(grep -cv '^\s*$' "$f")" -le 2 ] && grep -q '^export \* from' "$f" && echo "$f"; done
   ```
   Use `ts-morph` (`sourceFile.getImportDeclarations()` → `setModuleSpecifier`) so `@/` aliases resolve correctly. One PR per directory: `src/ai/*.ts` (14), `src/data/*`, `src/lib/*`.
3. **Prevent new shims** with an ESLint rule (custom or `no-restricted-syntax`) flagging files whose only statement is `ExportAllDeclaration`, outside `index.ts` barrels that are intentionally public.

**Verify:** the shim count is 0; `tsc`, tests and build are green. **Effort:** S–M.

---

## TD-23 — Lint that finds problems (ratchet, don't big-bang)

The existing ratchet pattern (`config/hex-colour-legacy.json`) works. Reuse it for each new rule.

| Rule | Start as | Why |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | error, with `config/any-legacy.json` | guardrail 10 |
| `@typescript-eslint/ban-ts-comment` | error | guardrail 10 (4 existing → fix now) |
| `@typescript-eslint/no-non-null-assertion` | warn | guardrail 10 at boundaries |
| `react-hooks/rules-of-hooks` | error | correctness |
| `react-hooks/exhaustive-deps` | warn | correctness |
| `jsx-a11y/*` recommended | warn → error via legacy list | guardrail 7 (see [27](27-i18n-accessibility-solutions.md)) |
| view → API ban | warn with legacy list | MVVM ([04](04-mvvm-solutions.md)) |
| `max-lines` (400, skip blank/comments) | warn | file size |

New dependencies: `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y` (pin them in `package.json`). The `typescript-eslint` already installed provides the TS rules; type-aware rules need `parserOptions.projectService: true`.

**Flat-config gotcha:** `no-restricted-syntax` and `no-restricted-imports` options from different blocks do **not** merge. Keep one block per file glob that lists all selectors and paths (hex + localStorage + …).

**Knip:**
- Use the stricter entries from [02](02-repository-structure-solutions.md), so `src/screens/**` and `src/components/**` are no longer treated as entry points.
- Remove `--no-exit-code` in CI once unused files are below 20.

**Verify:** each legacy list only shrinks. Add a CI check that fails if a legacy JSON grows versus `origin/main`.
**Effort:** S to configure; ongoing to burn down.

---

## TD-35 — `any` (127) and `@ts-ignore` (4)
- `@ts-ignore` in `src/lib/analytics/posthog.ts:32` and `src/lib/platform/firebaseClient.ts:25,38,43`: type the dynamic imports.
  ```ts
  const mod = await import('posthog-js').catch(() => null) as typeof import('posthog-js') | null;
  ```
  `firebaseClient.ts` goes away entirely if TD-29 removes Firebase ([17](17-security-solutions.md)).
- `catch (e: any)` → `catch (e: unknown)` with an `errorMessage(e)` helper in `src/lib/utils`.
- The remaining `any`: freeze the list in `config/any-legacy.json` and fix files as they are touched.

**Effort:** S (ignores), ongoing (any).

---

## Large files
35 TSX files are over 500 lines. Don't split them proactively. When a feature PR touches one:
- extract its ViewModel;
- extract sub-views per section;
- move styles to tokens.

`max-lines` (warn) keeps the list visible. Backend large files are handled by the domain split ([03](03-architecture-solutions.md) TD-07).

---

## Python quality gates (in `backend/ruff.toml`)
```toml
[lint]
extend-select = ["BLE", "T20", "TRY", "SIM", "UP"]   # blind except, print, try/except hygiene
[lint.per-file-ignores]
"scripts/*" = ["T20"]
"tests/*"   = ["S101", "T20"]
```
Introduce with `--add-noqa` once to freeze the current 134 `except Exception` and 68 `print` occurrences, then remove the `noqa` markers per file as touched. The logging conversion is in [14](14-error-handling-logging-solutions.md).
**Effort:** S to set up.
