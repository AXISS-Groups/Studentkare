# Studentkare — Prompt Library Master Index & Implementation Map

Covers all 81 prompts, P0–P80, across six volumes. For each prompt: **what it produces** (the concrete artefacts that land in the repo), **where it lands**, and **what it depends on**.

---

## How to run a prompt

1. **P1 audit first** on anything touching existing code. Read-only, cited, no edits.
2. **Paste the prompt** (P0 is already loaded via `AGENTS.md`), filling in the task-specific inputs.
3. **One prompt, one PR.** If the agent widens scope, stop it.
4. **Check the acceptance criteria yourself.** They are written to be checkable — "demonstrated", "tested", "verified" mean you saw it, not that the agent said so.
5. **Record the artefacts** in `docs/prompt-status.md`.

---

## Volume 1 — Architecture & Core Engineering (P0–P14)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P0 | House Constitution | Standing rules loaded every session | `AGENTS.md` | — |
| P1 | Audit Gate | Written audit with `path:line` citations, options, blast radius | PR description / `docs/audits/` | P0 |
| P2 | MVVM Layer Contract | Layer folders, boundary lint rule, reference screen, contract doc | `config/eslint.config.js`, `docs/architecture/ARCHITECTURE.md` | P0 |
| P3 | Feature Vertical Slice | Domain + data + store + viewmodel + view + tests for one feature | `src/modules/<m>/` | P2, P58 |
| P4 | API Contract & Typed Client | Pydantic models, route, generated TS client, DTO mapper, error taxonomy | `backend/app/schemas.py`, `src/modules/<m>/data/` | P0 |
| P5 | Defect Fix | Failing test, minimal fix, occurrence list | Wherever the cause is | P1 |
| P6 | De-Drift Refactor | Drift table, ranked fixes, doc patch | `docs/audits/drift-*.md` | P1 |
| P7 | Test Harness | Runners, fixtures, factories, fail-closed suite, CI wiring | `src/__tests__/`, `tests/`, CI config | P2 |
| P8 | Security Hardening | Crisis-gate fix, OTP fix, constitution wiring, grant matrix tests | `src/ai/crisisGate.ts`, `src/core/auth/rbac.ts` | P1, P7 |
| P9 | Rule L Firewall | Namespace split, commerce DB role, denial tests, bundle audit | Migrations, `config/eslint.config.js`, tests | P8 |
| P10 | Accessibility Pass | Labels, roles, hit targets, a11y test layer, screen-reader record | `src/modules/*/view/`, CI | P16 |
| P11 | Performance & Bundle | Baseline + after metrics, code splitting, list virtualisation | Build config, `view/` | P7 |
| P12 | Observability | Event policy, anti-metrics, guardrail metrics, owners | `docs/observability.md` | P0 |
| P13 | Code Review | Blocking / should-fix / consider verdict | PR review | P0, P2 |
| P14 | Release Readiness Gate | 13-item evidence checklist, GO/NO-GO | `docs/release/` | Most of v1 |

---

## Volume 2 — Engineering Craft (P15–P28)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P15 | Lint & Static Analysis | Flat ESLint config, boundary rules, custom rules, Ruff/mypy | `config/eslint.config.js`, `backend/config/pyproject.toml` | P2 |
| P16 | Design System | Token module, primitives, theming, gallery, no-literals lint rule | `src/design-system/`, `docs/design-system.md` | P0 |
| P17 | Logging & Error Handling | `DomainError` union, logger with scrubber, error boundaries, retry policy | `src/core/logging/`, `backend/core/logging_middleware.py` | P12 |
| P18 | Analytics | Typed event catalogue, consent gate, queue, collector, bundle audit | `src/core/analytics/`, `docs/observability.md` | P12, P17 |
| P19 | State, Caching & Offline | Cache policy matrix, repository cache, freshness, wipe routine | `src/modules/*/data/`, `docs/caching.md` | P2 |
| P20 | Forms & Validation | Form primitives, Zod schemas, consent component, error announcement | `src/design-system/forms/`, `src/modules/*/` | P16 |
| P21 | Internationalisation | i18n wiring, typed keys, message catalogue, pseudo-locale build | `src/core/i18n/`, `locales/` | P16 |
| P22 | Navigation & Deep Linking | Route table, declarative guards, navigation port, link validation | `src/core/navigation/` | P2 |
| P23 | Migrations & Data Model | Migration with up/down/grants, FHIR mapping note, backfill script | `backend/alembic/versions/` | P9 |
| P24 | CI/CD & Environments | Pipeline definition, env matrix, secret wiring, release channels, rollback | `.github/workflows/`, `docs/environments.md` | P7, P15 |
| P25 | Dependencies | Inventory, audit + licence scan, removal list, justification doc | `docs/dependencies.md`, CI | P24 |
| P26 | AI / LLM Standards | `ai/` module, constitution enforcement, versioned prompts, eval harness | `src/ai/`, `backend/app/` | P8, P17 |
| P27 | Documentation & ADRs | ADR directory, backfilled ADRs, generated docs pipeline, docs index | `docs/architecture/`, `docs/` | — |
| P28 | Git & PR Conventions | Commit lint, PR template, branch protection, CODEOWNERS, changelog | `.github/`, `docs/guides/CONTRIBUTING.md` | P24 |

---

## Volume 3 — Discovery & Messaging (P29–P42)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P29 | Marketing Site Architecture | SSR/SSG site, domain split, redirect map, rendering ADR | `sites/marketing/`, DNS | — |
| P30 | Technical SEO | robots.txt, sitemaps, canonicals, CWV fixes, Search Console | `sites/marketing/` | P29 |
| P31 | Metadata & Tags | Typed `PageMeta` module, OG generation, hreflang matrix | `sites/marketing/src/meta/` | P29, P21 |
| P32 | Structured Data | JSON-LD builders per template, CI schema validation | `sites/marketing/src/schema/` | P31 |
| P33 | Entity & Keyword Architecture | Entity sentence, topic map, keyword set, gap analysis, URL/IA map | `docs/seo/topic-map.md` | — |
| P34 | AEO / GEO | Answer-block content standard, fact/citation discipline, baseline citation audit | `docs/seo/aeo.md`, content | P33, P29 |
| P35 | Agent Readability | Per-host robots policy, `llms.txt`, semantic HTML pass, public read-only API, ADR | `sites/marketing/public/` | P29, P33 |
| P36 | E-E-A-T for YMYL | Author/reviewer profiles, editorial policy, citation standard, review workflow | `sites/marketing/`, `docs/editorial.md` | Medical advisor |
| P37 | Content Engine | Page-type inventory, templates, quality gate, pilot set | `sites/marketing/src/content/` | P33, P36 |
| P38 | Messaging & Word Bank | Category sentence, positioning per audience, message hierarchy, ban list, voice guide | `docs/brand/messaging.md` | P33 |
| P39 | App Store Optimisation | Listings, screenshots, data safety declarations, permission copy | Store consoles, `docs/aso.md` | P38 |
| P40 | Entity Presence & Local | NAP standard, GBP, Wikidata entity, `sameAs` array | `docs/brand/entity.md`, external | P33, P38 |
| P41 | Measurement | Search Console, cookieless analytics, rank tracking, LLM citation log | `docs/seo/reports/` | P30, P34 |
| P42 | Citable Primary Research | Methodology, HTML data report, `Dataset` markup, distribution plan | `sites/marketing/research/` | Phase 1 data, P36 |

---

## Volume 4 — Operations & Domain Boundaries (P43–P57)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P43 | Incident Response | Severity ladder, runbooks, kill switches, breach path, post-mortem template | `docs/runbooks/` | P75 |
| P44 | Data Subject Rights | Data inventory, export (FHIR + PDF), correction, deletion orchestration, crypto-shred | `backend/app/rights/` | P45, P69 |
| P45 | Consent & Audit Trail | Consent model, enforcement middleware, append-only audit store, student access log | `src/core/audit/auditLogger.ts` | P47 |
| P46 | ABDM / ABHA | Integration map, sandbox impl, consent artefacts, non-ABHA path, evidence pack | `backend/app/abdm/` | P45 |
| P47 | Multi-Tenancy | Student-owned data model, RLS policies, leakage test suite, graduation sim | `src/core/security/tenantIsolationGuard.ts` | — |
| P48 | Roles & Privileged Access | Role matrix, permission checks, restricted support view, break-glass | `src/core/auth/rbac.ts` | P45, P47 |
| P49 | Document & Media | Upload pipeline, scanning, signed URLs, EXIF strip, deletion of derivatives | `backend/app/documents/` | P69, P45 |
| P50 | Notifications | Channel policy matrix, template linter, DLT templates, preference centre | `backend/app/notifications/` | P45 |
| P51 | Institution Onboarding | Import spec, dry-run pipeline, invitation flow, ERP integration, runbook | `backend/app/onboarding/` | P47, P54 |
| P52 | Backup & DR | Backup strategy, restore rehearsal record, PITR, DR plan, access auditing | `docs/runbooks/dr.md`, infra | P69, P76 |
| P53 | Load & Resilience | Traffic model, load tests, index audit, rate limits, degradation plan | `tests/load/`, `docs/capacity.md` | P47 |
| P54 | Partner API Standard | Adapter template, onboarding checklist, registry, kill switches, reference adapter | `backend/services/integrations.py` | P45, P77 |
| P55 | Clinician Console & M18 | Clinician verification, scoped console, M18 network contract, model governance | `backend/services/clinical_assist.py` | P48, P45 |
| P56 | Billing & Licensing | Commerce data model, seat licence logic, payments, invoicing, group plans | `backend/services/billing.py` | P9 |
| P57 | Retention & Graduation | Retention matrix, lifecycle state machine, graduation flow, enforcement job | `docs/retention.md` | P47, P44 |

---

## Volume 5 — Module Standard & Reactive State (P58–P64)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P58 | Module Contract & Scaffold | `defineModule` helper, manifest format, reference module, boundary lint, M-map | `src/core/modules/moduleManifest.ts`, `src/modules/` | P2, P15 |
| P59 | Reactive State | Store factory, `useSyncExternalStore` binding, lifecycle module, SSE transport | `src/core/state/moduleStore.ts` | P58, P19 |
| P60 | Backend Module Standard | Router/service/repository bases, RLS-required repository, import-linter contracts | `backend/app/`, `backend/core/` | P58, P47 |
| P61 | Capability Slots | Capability registry, `ai`/`agent`/`seo` contracts, clinical+seo build ban | `src/modules/*/{ai,agent,seo}/` | P58, P26 |
| P62 | Module Generator | Client + server scaffolding templates, manifest generation, `validate-modules` | `scripts/gen-module.js` | P58, P60 |
| P63 | Module Registry & Events | Registry, typed event bus, core module set, payload lint, generated graph | `src/core/modules/moduleRegistry.ts` | P58 |
| P64 | Module Migration | Inventory, extraction order, per-module PRs, shrinking legacy warn count | `src/modules/` | P58, P15 |

---

## Volume 6 — Security Programme (P65–P80)

| # | Prompt | Produces | Lands in | Depends on |
|---|---|---|---|---|
| P65 | Threat Model | DFDs per module, STRIDE + abuse cases, mitigation map, risk register | `docs/security/THREAT_MODEL.md`, `src/core/security/threatModelValidator.ts` | P58 |
| P66 | Auth & Session Security | OTP hardening, token rotation + reuse detection, device management, step-up | `src/core/auth/otpManager.ts`, `sessionManager.ts`, `stepUpAuth.ts` | P8 |
| P67 | API & Transport Security | Authorisation inventory, BOLA suite, rate limit tiers, headers, SSRF controls | `src/core/security/bolaGuard.ts`, `ssrfGuard.ts`, `webhookGuard.ts` | P47, P45 |
| P68 | Mobile Security | Secure storage, screen-capture block, pinning + kill switch, release verification | `src/core/security/`, native config | P66 |
| P69 | Cryptography & Keys | Crypto inventory, KMS integration, per-subject keys, rotation runbook | `backend/core/crypto/` | P76 |
| P70 | Secrets Hygiene | Secret inventory, manager integration, history scan + rotation, CI scanning | `src/core/security/secretManager.ts`, `secretScanner.ts` | P24 |
| P71 | Input Validation | Validation audit, raw-SQL removal, parser hardening, injection controls, CSV sanitisation | `backend/app/`, `src/core/security/` | P20, P26 |
| P72 | Security Testing in CI | SAST, SCA, secret, container, IaC, DAST, custom guardrail rules | `src/core/security/ciGuardrailLinter.ts`, `.github/workflows/ci.yml` | P24, P15 |
| P73 | Pentest & Disclosure | Scope doc, staging env, `security.txt`, VDP page, findings + retest | `public/.well-known/security.txt`, `docs/security/` | P65 |
| P74 | Vulnerability Management | Intake queue, severity rubric, SLAs, patch cadence, monthly metrics | `docs/security/vuln-process.md` | P72, P73 |
| P75 | Detection & Monitoring | Detection catalogue, log pipeline, alert routing, validation runs | `src/core/security/securityDetectionEngine.ts` | P45 |
| P76 | Infrastructure Security | IAM rework, segmentation, IaC coverage, residency verification, hardening | `deploy/`, `backend/deploy/` | P24 |
| P77 | Partner Assurance | Vendor inventory, review questionnaire, DPAs, subprocessor register, offboarding | `docs/security/vendors/` | P54 |
| P78 | Compliance & Evidence | Control inventory, framework mapping, evidence automation, procurement pack | `src/core/security/complianceEvidenceMatrix.ts` | Most of v6 |
| P79 | Secure SDLC & Training | Security in DoD, PR checklist, design review triggers, onboarding, exercises | `.github/`, `docs/security/sdlc.md` | P28 |
| P80 | Abuse & Fraud | Abuse catalogue, ATO detection, clinician verification, coercion-aware grants, points controls | `src/core/security/` | P66, P75, P56 |

---

## Priority Tiers & Dependency Rules

1. **Tier 0 (Pre-Data Non-Negotiables)**: P0, P8, P45, P47, P48, P65, P66, P67, P70, P75, P78.
2. **Tier 1 (Architecture & Craft Foundations)**: P2, P7, P15, P17, P23, P24, P58, P59, P60, P63, P69.
3. **Tier 2 (Commercial Readiness & Mobile)**: P10, P29, P36, P39, P50, P52, P68, P72, P73, P76.
4. **Tier 3 (Growth & Scale)**: P34, P37, P41, P42, P53, P54, P55, P77, P79, P80.
