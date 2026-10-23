# 23 — Priority Action Plan: Sequenced PR Plan

Answers [audit/23-priority-action-plan.md](../audit/23-priority-action-plan.md). This turns the audit's 27 items into an ordered list of small PRs. Each PR has one purpose, can be reverted on its own, and is verified by CI once PR-1 lands. Effort figures are estimates.

## Week 1 — gate, config, sign-in, exposure (P0)

| PR | Title | Finding | Solution | Effort | Gate to merge |
|---|---|---|---|---|---|
| PR-1 | `check-icons --mapped` mode; unmap or fix `WebSecurity` | TD-43 | [26](26-design-system-solutions.md) | S | icon check green |
| PR-2 | CI: triggers `[main, development]`, split jobs, design coverage non-blocking, native `tsc` | TD-39, TD-02, TD-45 | [18](18-cicd-deployment-solutions.md) | S | first green run; fix whatever red the old step 1.5 was hiding (separate PRs) |
| — | Repo admin: branch protection, required checks, base guard, auto-delete branches | TD-02, TD-36 | [11](11-git-workflow-solutions.md) | S | — |
| PR-3 | `.env.dev.example`: `SEED_DEMO_DATA`/`DEV_OTP_CONSOLE`; README/CONTRIBUTING corrections; delete the Java section | TD-41, TD-14 | [09](09-installation-solutions.md) | S | quickstart smoke passes |
| PR-4 | Feature keys in `.env.prod.example`, prod overlay, Helm; startup feature report | TD-40 | [25](25-environment-configuration-solutions.md) | S | compose config check passes with keys and fails without |
| PR-5 | Uvicorn proxy headers; nginx XFF overwrite; `client_ip_from_scope` uses `scope["client"]` | TD-10 | [17](17-security-solutions.md) | S | spoofed-XFF test |
| PR-6 | Prod overlay hardening (or delete it, per ADR-0001) | TD-16 | [17](17-security-solutions.md) | S | `compose config` shows no dev services or ports |
| — | Rotate the `013cd8a` DB credential; record it | TD-05 | [11](11-git-workflow-solutions.md) | S | written record |

## Weeks 2–3 — truth pass and foundations (P1)

| PR | Title | Finding | Solution | Effort |
|---|---|---|---|---|
| PR-7 | Delete foreign-domain backend modules and their tests; drop `motor`, `langchain-ollama`, `APScheduler`, `passlib` | TD-08 | [03](03-architecture-solutions.md), [12](12-dependency-solutions.md) | S |
| PR-8 | Reachability and router-mounted guard tests | TD-08 | [03](03-architecture-solutions.md) | S |
| PR-9 | Delete `src/modules/**` and its barrels; import ban | TD-06 | [02](02-repository-structure-solutions.md) | M |
| PR-10 | Retarget `gen-module.js` to `src/features`; `src/features/README.md` | TD-06 | [02](02-repository-structure-solutions.md), [04](04-mvvm-solutions.md) | S |
| PR-11 | Delete `src/data/services/api.ts` (unimported) and the shims | TD-17 | [05](05-code-quality-solutions.md) | S–M |
| PR-12 | Delete root clutter, duplicate configs, `src/core/auth/{otp,session,stepUp}*`, `Flow03LoginScreen`, `PaymentCheckoutModal` | TD-32, TD-37, TD-42, TD-19 | [02](02-repository-structure-solutions.md), [06](06-ai-vibe-code-solutions.md), [17](17-security-solutions.md) | S |
| PR-13 | `core/settings.py` plus the ENV-01 call-site changes | ENV-01, ENV-04 | [25](25-environment-configuration-solutions.md) | S–M |
| PR-14 | Compose `migrate` service and Helm pre-upgrade Job; `assert_at_head()`; remove migrations from lifespan | TD-12, TD-11 | [16](16-database-solutions.md) | S–M |
| PR-15 | pytest on Postgres (transactional fixture); `alembic check` and downgrade step in CI; revision-edit guard | TD-11 | [16](16-database-solutions.md), [13](13-testing-solutions.md) | M |
| PR-16 | Dev compose profiles (`web` with HMR, backend `--reload`, observability opt-in); Vite auto-spawn opt-in | TD-28 | [21](21-developer-experience-solutions.md) | S |
| PR-17 | CODEOWNERS; `docs/README.md` index; seed ADRs 0001–0009 | TD-46, docs | [11](11-git-workflow-solutions.md), [10](10-documentation-solutions.md) | S |
| PR-18 | Onboarding guide `docs/onboarding/README.md` | onboarding | [08](08-developer-onboarding-solutions.md) | S |
| PR-19 | Tier 1 i18n gating (English fallback on crisis, consent, SOS and clinical keys) | TD-44 | [27](27-i18n-accessibility-solutions.md) | S |

## Weeks 3–6 — structure for parallel teams (P1)

| PR series | Title | Finding | Solution | Effort |
|---|---|---|---|---|
| PR-20 | Route metadata (`chrome`, `section`); delete the `App.tsx` path lists | TD-25 | [07](07-collaboration-solutions.md) | S |
| PR-21…24 | Split `features/health/module.ts` into partner, clinician, admin, campus and health modules; workspace layout route | TD-25 | [07](07-collaboration-solutions.md) | M |
| PR-25…n | Backend domain packages, one domain per PR (orders/payments first) | TD-07 | [03](03-architecture-solutions.md) | L |
| PR-30 | OpenAPI export, `openapi-typescript`, drift check; `ApiModel` base | TD-13 | [15](15-api-solutions.md) | M |
| PR-31 | Error codes and the uniform error handler | I18N-02 | [15](15-api-solutions.md), [27](27-i18n-accessibility-solutions.md) | M |
| PR-32 | Table classification plus Rule L roles and grants migration; commerce engine; denial test | TD-03 | [16](16-database-solutions.md) | M–L |
| PR-33 | Campus consent gate and aggregate views (before any campus data endpoint) | TD-47 | [28](28-privacy-solutions.md) | M |
| PR-34 | Playwright E2E (5 journeys) in CI | TD-30 | [13](13-testing-solutions.md) | M |
| PR-35 | SOS deliveries through the outbox | SCALE-01 | [19](19-scalability-solutions.md) | M |
| PR-36 | Release workflow: images by SHA, tags, Helm `tag` required | TD-22 | [18](18-cicd-deployment-solutions.md) | M |

## Ongoing (P2/P3), picked up when an area is touched
TD-09, TD-15, TD-19, TD-20, TD-21, TD-23, TD-24, TD-27, TD-29, TD-31, TD-33, TD-34, TD-35, TD-38, DS-04, DS-05, A11Y-01, A11Y-02, PRIV-03, PRIV-06, MOB-02, MOB-03, MOB-04. See [22](22-technical-debt-solutions.md) for the owner of each.

## Dependency graph (critical path)
```text
PR-1 ─► PR-2 ─► (everything else is verifiable)
PR-2 ─► PR-7/8 ─► PR-25… (domain split) ─► PR-32 (Rule L)
PR-2 ─► PR-14 ─► PR-15 ─► PR-25…, PR-32
PR-13 ─► PR-4 (optional: settings make the key list generated)
PR-3 ─► PR-34 (E2E needs dev sign-in)
PR-30 ─► PR-31
```

## Definition of done for each PR
- CI green: `frontend`, `backend`, `security`, plus `e2e` once it exists.
- The finding ID is in the PR title or body, and its status is updated in `audit/22-technical-debt.md` in the same PR. The audit is a living document.
- Docs or an ADR are updated if behaviour or setup changed.
- Tier 1 surfaces: a named reviewer's approval is recorded.
