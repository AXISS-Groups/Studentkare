# 02 — Repository & Monorepo Structure

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

- **Three frontend trees: OPEN (TD-06).** `src/modules/` is unchanged (222 files). A fourth location for one domain now exists: new `src/features/clinician/**` (about 60 files, MVVM, dev-only sample sources) alongside legacy `src/screens/clinician/*`.
- **New shared shells:** `src/design-system/clinician-shell/` and a single `VendorShell`. `src/design-system/` grew from 31 to 40 files (`DataTable`, `Timeline`, `Tabs`, `Drawer`, `primitives.tsx`).
- **Backend:** `services/agents/` shrank from 26 modules to 6 live ones. New `core/rule_l.py`, `services/commerce_session.py` and `core/email_templates.py`. `workflow_scheduler.py` grew into a 1,027-line module (report 31).
- **Root clutter worse (TD-32):** `Audit_Plan.md` and `Intial_Audit_plan.md` are now tracked, and a new top-level `audit-solutions/` (31 files) sits beside `audit/`. See 10 on keeping the two consistent.
- Verdict unchanged: a modular-monolith shape, with overlapping frontend trees.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

- **Three frontend trees still exist** (TD-06, OPEN). `src/modules/` lost `m18-clinician` but keeps 19 slices; Knip reports 166 unused files, most under `src/modules`. The team's own `docs/dead-code-2026-10-14.md` lists 330 unimported files plus 135 test-only files as a delete list, but they have **not been deleted yet**.
- **New feature folders follow the live pattern**: `src/features/{account,campus,requests,reminders,dev}` (viewmodel/ + views/). `src/features/dev` registers only when `import.meta.env.DEV`.
- **New top-level areas**: `src/i18n/` (report 27), `src/design-system/` grew with `icons/` and `stories/` (report 26), `design/` doubled to 88 MB (TD-33 / DS-03).
- **Backend**: new domain routers `services/{erasure,emergency_api,student_requests,campus_departure}.py` and `check_in_pass.py` — a healthier pattern than adding to `workflow_api.py` (which still grew; TD-07).
- **Root clutter unchanged** (TD-32): `patch_last_13.py`, `patch_last_8.py`, `patch_tests.py`, `vite.config.ts.timestamp-*.mjs`, `load_test.py`, plus two untracked plan files.
- **New root docs**: `CLAUDE.md` (screen-building rules), `design/README.md`.

Verdict unchanged: monolith with overlapping frontend trees; new code is better organised than old.

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

## Repository architecture map (actual)

```text
Studentkare/                         single package.json + single backend; not a workspace monorepo
│
├── src/                             web + native frontend (one Vite app, one Expo app share it)
│   ├── App.tsx, main.tsx            web shell; hardcoded vendor-route lists (App.tsx:85-155)
│   ├── core/                        routing registry, navigation facade, MobX ViewModel base, env, security linters
│   ├── features/<24 dirs>           LIVE feature code: module.ts route tables, viewmodel/, views/, store/, screens/
│   ├── screens/<24 dirs>            LIVE legacy screens (≈190 files, many 800–1,280 lines, mostly no ViewModel)
│   ├── components/                  ≈130 files: shared UI + ~60 large "showcase" widgets (simulators, consoles)
│   ├── modules/m01..m20             DEAD "MVVM vertical slices" (domain/data/state/viewmodel/view); only tests + unused barrels import them
│   ├── data/                        API client (`services/api.ts`), contexts, mock datasets, 1-line re-export shims
│   ├── ai/                          deterministic client-side "agents", crisis gate, constitution (mostly shims → ai/core, ai/agents, ai/engines)
│   ├── lib/, hooks/, theme/, design-system/, types/, native/, store/, navigation/, services/
│   └── __tests__, test/
│
├── backend/                         FastAPI app
│   ├── app/main.py                  app factory, middleware, router mounting (9 routers)
│   ├── services/                    ≈45 flat modules = routers + business logic + data access (workflow_api.py 3,084 lines)
│   ├── services/agents/             20 "agents", all unreachable from app.main (career/hackathon/newsletter/talent-scraper…)
│   ├── core/                        models (workflow_models.py 875 lines), security, telemetry + 17 unreachable legacy modules (Mongo, career, skills)
│   ├── alembic/                     14 revisions (prod schema source of truth)
│   ├── migrations/*.sql             3 raw SQL dumps, unused
│   ├── config/                      requirements, alembic.ini, pyproject (pytest/pyright only), .env.example
│   ├── scripts/                     seed/provision/worker entrypoints
│   └── tests/                       73 pytest files
│
├── deploy/                          nginx, frontend Dockerfile, Prometheus/Loki/Tempo/Grafana/Alertmanager, Helm chart
├── design/                          514 HTML mockups + assets (44 MB), tokens JSON
├── docs/                            139 files: architecture, runbooks, security, prompt libraries, revenue reports, PR bodies, ticket CSV/XLSX
├── tests/                           11 Node smoke scripts (not wired to npm scripts or CI)
├── scripts/                         token build, prerender, ticket/PDF/Excel generators, dev-backend launcher
├── config/                          eslint, knip, babel, metro, semgrep, gitleaks, tsconfig.native, mobile/
└── root clutter                     patch_last_13.py, patch_last_8.py, patch_tests.py, load_test.py,
                                     vite.config.ts.timestamp-*.mjs, knip.json (dup of config/knip.json),
                                     .gitleaks.toml (dup of config/gitleaks.toml), .cursorrules, Audit_plan.md
```

## Dependency direction (observed)

```text
features/*/module.ts ──► screens/*, features/*/views  ──► data/services/api.ts ──► backend /api/*
           │                     │  ╲                         ▲
           │                     │   ╲──► data/datasets/mockData (stores seeded with mock data)
           │                     ▼
           │              components/* (some call fetch() / api directly)
           ▼
   core/routing/registry  ◄── App.tsx imports 4 feature modules for side-effect registration

modules/m01..m20  ◄── only features/*/index.ts barrels (themselves unused) and their own __tests__
```

Backend:

```text
app/main.py ──► services/{workflow_auth, workflow_api, member_profile_api, preventive_care,
                          integrations, billing, clinical_api, alerts, apilayer}
            ──► core/{rate_limiter, sentry, telemetry}
services/* ──► core/workflow_models (single shared ORM module) ──► services/db_sql (engine)
NOT mounted: services/dpdp.router, core/email_quality.router
```

## Monorepo assessment

The repository is a **single-package repo containing two applications** (frontend, backend) plus a large design archive. It is not a monorepo in the tooling sense (no npm/pnpm workspaces, no Turborepo/Nx, no per-package `package.json`).

| Question | Answer | Evidence |
|---|---|---|
| Application boundaries clear? | Partly. Frontend/backend split is clean (separate dirs, separate Dockerfiles). Inside the frontend, boundaries are not clear. | `src/features`, `src/screens`, `src/modules` overlap by domain (auth exists in all three plus `src/data/contexts/AuthContext.tsx`) |
| Packages clearly separated? | No packages exist. | single `package.json` |
| Shared dependencies managed? | One lockfile; 95 packages with multiple resolved versions (normal for RN/Expo). Core libs single-version (react 18.3.1, mobx 7.0.6). | `package-lock.json` |
| Code duplicated? | Yes, extensively. | 63 one-line re-export shim files; two near-identical API clients `src/data/api.ts` (670 lines) and `src/data/services/api.ts` (658 lines) that have already drifted (`ingestVitals` only in one); 20 copies of `entities.ts`/`errors.ts`/`module.config.ts` scaffolding |
| Internal packages isolated? | N/A. Path alias `@/*` lets any file import any other. No lint rule enforces layer direction. | `tsconfig.json` paths, `config/eslint.config.js` |
| Can teams work independently? | Not today. See 07. | |
| Changes in one app break another? | Frontend and backend: loosely coupled through untyped REST (no generated client), so backend changes break the UI silently. | `src/data/services/api.ts` hand-written fetch calls |
| Build/test boundaries clear? | One CI job does everything sequentially. | `.github/workflows/ci.yml` |
| Ownership clear? | No `CODEOWNERS`. Module READMEs name owners like "clinical-team" that are not GitHub teams. | `src/modules/m18-clinician/README.md` |

**Verdict: becoming a monolith inside a single repo, with three overlapping frontend architectures.** The repo layout is not the problem; the internal layering is.

## Findings

**Severity: HIGH — Three overlapping frontend organisation schemes**
Location: `src/features/`, `src/screens/`, `src/modules/`
Evidence: Auth alone lives in `src/modules/m01-auth/` (with both `AuthStore.ts` *and* `auth.store.ts`, both `AuthRepository.ts` *and* `auth.repository.ts`), `src/features/auth/` (viewmodel, views, screens), `src/screens/auth/` (`Flow01SignupScreen.tsx` 774 lines, `Flow03LoginScreen.tsx` 821 lines, both unreferenced), and `src/data/contexts/AuthContext.tsx` (the one actually used by `App.tsx` and `core/routing/Router.tsx`).
Problem: A developer cannot tell where new auth code belongs. Knip reports 110 of the ~200 non-test files under `src/modules` as unused; the other ~90 are only reached through barrels that are themselves unused.
Impact: Changes are made in the wrong copy; tests pass against dead code (`src/modules/m01-auth/__tests__/AuthSecurity.test.ts` tests code no screen runs).
Recommendation: Declare `src/features/<domain>/` the only home. Delete `src/modules/` after moving any logic that is genuinely better into the matching feature. Fold `src/screens/<domain>` into `src/features/<domain>/screens` over time.

**Severity: MEDIUM — Repository clutter that misleads newcomers**
Location: repo root, `docs/`
Evidence: `patch_last_13.py`, `patch_last_8.py`, `patch_tests.py` (scripts that rewrite test files in place, e.g. `patch_last_13.py:4-8` "Fix register() in test_workflow_api.py to handle empty codes"); `vite.config.ts.timestamp-1790693803629-39e99b366f48b.mjs` (Vite temp file); duplicate `knip.json`/`config/knip.json` and `.gitleaks.toml`/`config/gitleaks.toml` with different content; `docs/` holds revenue projections, ticket spreadsheets and PR bodies next to runbooks.
Impact: Unclear which config is authoritative (CI uses `config/gitleaks.toml` and the *root* `knip.json` via bare `npx knip`, while `package.json` uses `config/knip.json`).
Recommendation: Delete root patch scripts and the timestamp file, add `vite.config.ts.timestamp-*` to `.gitignore`, keep one copy of each config, and move business documents out of the engineering repo.

**Severity: MEDIUM — 44 MB design archive and duplicated media in the code repo**
Location: `design/screens/source/**`, `public/assets/*.mp4`
Evidence: `public/assets/2c18e6c6648794dd62440d6720ffc956.mp4` (4.6 MB) is byte-identical in size to `design/screens/source/03-student-web/assets/2c18e6c6648794dd62440d6720ffc956.mp4`; same for other assets.
Impact: Clone size and CI checkout time grow; video files are not in Git LFS.
Recommendation: Move design exports to a design tool or a separate repo; use Git LFS for media that must ship.
