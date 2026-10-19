# 20 — Maintainability Audit

> **Revalidated 2026-10-17 (revalidation 2)** against `main` @ `d333afe`. Revalidation 1 was `main` @ `ad01230` earlier the same day; the original baseline was `development` @ `ab4ce3f`, 2026-10-08. Finding IDs and statuses: register in [22-technical-debt.md](22-technical-debt.md). Blocks are newest first. Where they disagree, the newest wins. "Original assessment" is the 2026-10-08 record.

## 2026-10-17 revalidation 2 (`d333afe`)

Tribal-knowledge list, revalidated again:
- **No longer true:** "safety-named backend modules are unused" now applies only to `core/consent_engine`, `core/crypto_service` and `core/audit_chain`; the agents are gone. "AI constitution is documentation only": it is now the live gateway.
- **New tribal knowledge to write down:**
  - Rule L enforcement depends on DB roles that the deploy user may not be able to create. Only `/api/ops/rule-l` tells you.
  - The worker must run for any outbox delivery or erasure to happen.
  - `CRISIS_ALERT` is not actually produced (JOB-06).
  - Email suppression silently does nothing (TD-48).
  - Clinician console screens show sample data only with `VITE_DEMO_DATA=true` in dev.
- **Still true:** `src/modules` is dead; there are two API clients; dev `create_all` versus prod Alembic; the demo flags only the Vite auto-spawn sets; feature keys no deploy config sets.
- **Signal-to-noise:** much better on the backend: 87 files deleted, mainly dead agents, RAG engines and fake scanner and console components. The frontend `src/modules` (7.3K LOC) remains the largest misleading area.

---

## 2026-10-17 update — revalidation 1 (`ad01230`)

Tribal-knowledge list revalidated:
1. `src/modules` dead — still true (TD-06), now written down in `docs/dead-code-2026-10-14.md`.
2. `src/data/api.ts` live vs `services/api.ts` — still true (TD-17).
3. Vendor screens mock — partly (3 live now) (TD-09).
4. Safety-named backend modules unused — still true (TD-08); `clinical_assist.py` deleted.
5. DPDP router unmounted — **no longer true** (erasure mounted).
6. Dev `create_all` / prod Alembic / SQLite tests — still true.
7. Demo OTP in any non-prod — **no longer true**; replaced by: demo mode needs two flags that only the hidden Vite backend sets (TD-41).
8. `npm run dev` spawns SQLite backend — still true.
9. Real deploy target — still unknown.
10. `OTP_HASH_SECRET` or `JWT_SECRET` — still true.
11. 2FA in memory — **no longer true**; replaced by: 2FA needs `TWO_FACTOR_ENCRYPTION_KEY` that no deploy config sets (TD-40).
12. Certificate inaccurate — **resolved** (withdrawn).

New: which dated plan/audit doc in `docs/` is current (10). Bus factor worse (TD-46).

---

## Original assessment (2026-10-08, baseline `ab4ce3f`)

> If the original developers leave, can another team maintain this system?

**Short answer: with difficulty, and only after a clean-up.** The backend core (auth, records, orders, payments) is readable and has tests. The surrounding mass of dead, duplicated and simulated code would cost a new team weeks to map, and several "safety" modules that look load-bearing are not wired in.

| Dimension | Rating | Evidence |
|---|---|---|
| Clarity | Low–Medium | Readable functions in `workflow_auth.py`; 3,084-line `workflow_api.py`; 1,000-line screens |
| Consistency | Low | 3 frontend architectures, 2 API clients, 2 logging styles, 3 rate limiters, mixed `/api` vs `/api/v1` |
| Documentation | Medium (volume) / Low (accuracy) | see 10 |
| Architecture | Medium | sound deployment shape; weak internal layering (03) |
| Naming | Medium | product named three ways; `features/health/module.ts` owns admin/vendor/clinician routes; `src/ai/*` "agents" are rule tables |
| Testing | Medium | strong backend auth tests; ~29% of backend test files hit dead code (13) |
| Dependency management | Medium | recent, pinned backend; dead deps carried (12) |
| Separation of concerns | Low | views with data + logic; routers with SQL (04, 03) |
| Domain boundaries | Low | single model module; no ownership |
| Developer experience | Low–Medium | see 21 |

## Tribal knowledge a new team would need

1. `src/modules/` is dead; `src/features/` + `src/screens/` are live.
2. `src/data/api.ts` is live; `src/data/services/api.ts` is not (despite its path).
3. Vendor/pharmacy/lab screens are UI mock-ups with no persistence.
4. `services/repository.py`, `ai_client.py`, `consent_engine.py`, `audit_chain.py`, `crypto_service.py`, `roles.py` are **not** used.
5. DPDP router is not mounted.
6. Dev uses `create_all`, prod uses Alembic; tests use SQLite.
7. Demo OTP + seeded super admin in any non-production env.
8. `npm run dev` spawns its own SQLite backend.
9. Which deployment target is real (Helm vs compose overlay vs Dokploy).
10. Why `workflow_auth` reads `OTP_HASH_SECRET` **or** `JWT_SECRET`.
11. That the 2FA store is in memory.
12. That `docs/P0_HOUSE_CONSTITUTION_CERTIFICATION.md` is not accurate.

Each of these took this audit direct code reading or import-graph analysis to establish; none is written down as a current fact.

## Findings

**Severity: HIGH — Signal-to-noise ratio of the codebase**
Evidence: backend 58 unreachable modules (~6.2K LOC); frontend ~29K LOC demo-backed or unused (see 19); 63 shims; duplicated configs and docs.
Impact: Every maintenance task starts with "is this code real?". Refactors are risky because tests cover dead copies.
Recommendation: The deletion sprint in 23. It is the highest-leverage maintainability action available and is low risk once the import graph is confirmed.

**Severity: HIGH — Concentrated knowledge** (81% of commits by one author; see 07).
Recommendation: ADRs for the 5–6 decisions in 23; rotate code review; pair new hires on the deletion sprint (fastest way to learn what is real).

**Severity: MEDIUM — Comments and docs that describe intent, not behaviour**
Examples: `main.py:100` "Seed demo accounts only when explicitly enabled" (no flag exists); `src/modules/*/README.md` import instructions; `.cursorrules` file links. Wrong comments are worse than none.
Recommendation: Treat doc/comment drift as a review blocker on touched lines.

**Severity: RECOMMENDATION — Keep**
- `src/core/routing` guard design, `src/core/store/ViewModel.ts` contract.
- Backend auth/OTP flow and webhook verification.
- Alembic as the schema source of truth.
- Explanatory comments in `requirements.txt`, `ruff.toml`, `ci.yml` that record *why* a setting exists — this is good practice.
