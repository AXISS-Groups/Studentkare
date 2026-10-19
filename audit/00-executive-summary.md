# 00 — Executive Summary

**Repository:** `AXISS-Groups/Studentkare`
**Current revision:** `main` @ `d333afe` (merge of PR #136, 2026-10-17). Audited 2026-10-17 (revalidation 2).
**Previous revalidation:** `main` @ `ad01230`, earlier the same day. 60 commits in between: 40 non-merge, from 5 authors; 429 files changed excluding generated tokens. Merged PRs: #136 (partner and clinician consoles), #137 (round-2 fixes, 31 commits), #138 (audit docs). Original baseline: `development` @ `ab4ce3f`, 2026-10-08.
**Method:** read-only.
- **Done:** read the diff and git history; ran a static backend import walk (`app.main` + worker) and an AST route-auth scan; ran local `tsc` (web and native), ESLint and Knip, with output written outside the repo.
- **Not done:** no tests, installs, app runs or `icons:audit`. GitHub Actions and PR history were **not** available (`gh` HTTP 401), so CI outcomes are inferred from `ci.yml` only.

The finding register is [22](22-technical-debt.md); the index is [README](README.md).

## Overall verdict (revalidation 2)

### 🟠 Significant Improvements Required (unchanged), with clear momentum

This was a productive day of work, and much of it addressed this audit's own top findings:
- **Rule L is now enforced at Postgres grants for commerce paths** (TD-03, CRITICAL → HIGH, partly resolved).
- **CI now runs migrations from empty, a blocking drift check and the full backend suite on Postgres 15 and 16**, in a job the icon step cannot skip (TD-11 partly resolved; TD-39 narrowed).
- **The AI constitution is the single live model path** (TD-31 resolved).
- **The backend dead-code surface fell from 56 unreachable modules to 18** (TD-08 partly resolved).
- **A real background worker** with leases, no-repeat outbox delivery and urgent-first ordering now carries safety messages.

**No CRITICAL findings remain.**

The verdict stays 🟠 for three reasons:
1. **Configuration and docs still trail the code.** The fail-closed feature keys (`TWO_FACTOR_ENCRYPTION_KEY`, `PASS_SIGNING_SECRET`, `DPDP_ARCHIVE_KEY`/`_RETENTION_DAYS`, `INTEGRATIONS_ENCRYPTION_KEY`) are still in no deploy config (TD-40, now also affecting the worker and counsellors), Docker dev still cannot sign in (TD-41), and CONTRIBUTING sends newcomers to a `development` branch abandoned on 2026-10-08 (TD-02, changed).
2. **New safety-relevant machinery has blind spots.**
   - Rule L fails *open* unless a flag nobody sets is turned on (TD-03).
   - Urgent deliveries share one serial worker pass, and nothing pages anyone when the worker stops (TD-49).
   - The new AI grounding guard misses a dropped negation (AI-01, latent: generation is off everywhere).
3. **Structural debt keeps growing in the same places.** `workflow_api.py` 3,235 lines, `clinical_api.py` 1,815, a new 1,027-line `workflow_scheduler.py`. Also `src/modules` and two API clients are untouched, and a second clinician tree has appeared.

## Scores (revalidation 2)

| Area | 2026-10-08 | Rev 1 | **Rev 2** | Why it moved since rev 1 |
|---|---|---|---|---|
| Startup Collaboration | 38 | 38 | **40** | Four other contributors landed work via PRs into `main`. But the bus factor is still high (TD-46), there is no CODEOWNERS, PR #136 needed a conflict merge, and the documented branch model is dead (TD-02) |
| Architecture | 45 | 48 | **52** | Rule L at the repository boundary, a durable leased worker, a single AI gateway, and backend dead code down sharply. The monolith files grew again and the scheduler became a new one |
| Maintainability | 35 | 38 | **42** | 87 files of dead or fake code deleted; tests of dead code 20 → 1. Frontend `src/modules` and duplicate clients unchanged |
| Documentation | 42 | 45 | **46** | Architecture docs and the deployment guide refreshed against the code. Setup docs still wrong and branching docs now wrong. `audit-solutions/` can drift from `audit/` |
| Developer Onboarding | 35 | 30 | **30** | Sign-in still broken; new dead-branch trap. Offset by a clearer backend and a good MVVM template in the clinician console |
| Scalability | 50 | 52 | **55** | A worker with leases (safe across replicas) and bounded outbox passes. SOS inline sends, `NullPool` and rate-limit identity unchanged; serial-pass latency is new (TD-49) |
| Security | 35 | 50 | **56** | Rule L partly enforced; COUNSELLOR 2FA; audited 2FA reset; crisis kept out of the ops feed; PyJWT advisories closed; CORS on errors fixed. Still: rate-limit identity, prod overlay, missing keys, Rule L fail-open default |
| Testing | 48 | 45 | **52** | Postgres CI job with a blocking `alembic check`; strong new tests (`test_rule_l`, outbox safety, worker loop, reminders, counsellor queue). Results **not verified** (no CI access, no local runs); E2E and native CI still absent |

Scores are judgements on the same 0–100 scale, not measurements. They rise only where the code changed: no score moved for new documentation alone.

## Current critical and high findings

**Critical:** none.

| ID | Severity | Status | Finding | Report |
|---|---|---|---|---|
| TD-03 | HIGH (was CRITICAL) | PARTIALLY RESOLVED | Rule L enforced for commerce paths on a provisioned DB; fails open by default (`RULE_L_REQUIRE_GRANTS` unset everywhere); app login keeps full rights | 16, 28 |
| TD-02 | HIGH (was CRITICAL) | CHANGED | Real flow is PRs into `main` (covered by CI); CONTRIBUTING still prescribes the abandoned `development`, which CI does not cover | 11, 24 |
| TD-40 | HIGH | OPEN (wider) | Feature keys absent from every deploy config, now including the worker; super admins **and counsellors** stuck at 2FA setup in prod; erasure blocked silently | 25, 31 |
| TD-41 | HIGH | OPEN | Docker quick start cannot sign in | 09, 24 |
| TD-39 | HIGH | OPEN (narrowed) | Icon audit can skip frontend gates; backend Postgres job now independent; run status unverified | 18, 26 |
| TD-46 | HIGH | OPEN | 31 of 40 commits by one author; no CODEOWNERS | 07 |
| TD-47 | HIGH | NOT REVALIDATED | Campus consoles without a consent gate (see PRIV-08 for the first live one) | 28 |
| TD-10, TD-16, TD-05 | HIGH | OPEN / NOT REVALIDATED | Rate-limit identity, prod overlay exposure, credential rotation | 17, 18 |
| TD-06, TD-07, TD-12, TD-13, TD-14, TD-30 | HIGH | OPEN | Frontend trees, monolith files (worse), migrations on every replica, no typed contract, setup docs, no E2E | 02–04, 15, 16, 13 |

## Significant improvements since revalidation 1 (verified in code)
- **Rule L at the database** (`core/rule_l.py`, `f1a7c3e9b2d4`, `commerce_session.commerce_db` on 42 endpoints, `GET /api/ops/rule-l`, a CRITICAL alert in production, and 571 lines of tests). Every table must be classified to pass tests.
- **Postgres CI job** (`backend-postgres`): empty-DB check → `alembic upgrade head` → blocking `alembic check` → full suite, on PG 15 and 16, with no silent skips.
- **Single AI gateway**: `llm_gateway.invoke()` is fail-closed and opt-in, and never logs prompts. Ayush rephrases approved passages only, with a citation and grounding guard.
- **Worker and outbox**: leased jobs, safe across replicas; `SENDING` committed before the provider call; per-event backoff; urgent first; CRITICAL alert on urgent failure; documented for Helm, Compose and Dokploy.
- **Dead and fake code removed**: 20 backend agents, RAG engines, repository and stores, and about 15 fake scanner and console components; dead-module tests 20 → 1.
- **Security and privacy**: COUNSELLOR 2FA; audited super-admin 2FA reset; crisis events out of the general ops feed; PyJWT 2.15.1; CORS outermost so 429 and 413 stay readable; students can read their own signed visit summaries.
- **Clinical workflow**: a doctor can order a lab test only for a patient in their care (fails closed); lab orders linked to the catalogue and a held slot; prescriptions linked to the visit note.

## New risks introduced by recent changes
- **TD-49:** urgent deliveries share a serial worker pass, and there is no dead-man alert.
- **AI-01:** the grounding guard misses a dropped negation (latent until `OLLAMA_URL` is set).
- **PRIV-08:** the counsellor crisis queue exposes named students' crisis signals without a recorded lawful basis or notice.
- **DS-06:** `SkIcon.tsx` is a hand-drawn icon set that bypasses the manifest and `CLAUDE.md` rules.
- **JOB-04:** blocked erasures raise no alert.
- **JOB-06:** `CRISIS_ALERT` is documented as delivered but never produced.
- **ENV-06:** worker env blocks are copied by hand in three deploy files.
- A second clinician implementation tree (04).
- `audit-solutions/` can now contradict this register (10).

## Resolved, changed and regressed
- **Resolved:** TD-31 (AI constitution wired).
- **Partially resolved:** TD-03, TD-08, TD-11, TD-25.
- **Changed:** TD-02.
- **Corrected:** rev 1's claim that gitleaks was skipped in CI. The step has `if: always()` (18).
- **Regressions:** none found.
- **Newly identified pre-existing issue:** TD-48 (email suppression reads MongoDB and fails open).

## Readiness
- **Architecture and collaboration:** not yet ready for 10–15 parallel developers. The patterns for new code are now good (per-domain routers, injected sources, a leased worker, a table-plane registry), but the shared hotspots are bigger than ever.
- **Onboarding and installation:** unchanged at "cannot sign in on day 1", plus a branch trap. Both are S-sized fixes.
- **Security:** no critical items. The most valuable next step is making Rule L *enforced* rather than *alerted* in production, together with the missing keys.
- **Testing:** the backend now has a meaningful Postgres gate. Execution evidence is missing for this pass. Frontend E2E and native type-checks are still not in CI.

## New audit dimensions added in this pass
- [30 AI / LLM integration](30-ai-llm-integration.md): the first live model path.
- [31 Background jobs, scheduler & outbox](31-background-jobs-and-outbox.md): a second long-running process carrying safety deliveries.

## Top five risks over the next 1–3 years
1. **Safety features that exist in code but not in production.** Missing keys (TD-40), Rule L fail-open (TD-03), and a worker that can die quietly (TD-49).
2. **Backend velocity collapse in the hotspot files.** `workflow_api.py`, `clinical_api.py` and now `workflow_scheduler.py` (TD-07, JOB-03), while one person holds most of the context (TD-46).
3. **Unverified releases.** The workflow written down and the real one differ (TD-02), an icon check can skip frontend gates (TD-39), and there are no versioned images or tags (TD-22).
4. **Clinical data reaching campus or commercial surfaces.** Campus consoles beyond the counsellor queue (TD-47, PRIV-08), and Rule L outside commerce paths (TD-03 phase 2).
5. **AI output drift when generation is switched on.** AI-01 and AI-02: the guard and evaluation must be in place before `OLLAMA_URL` is set anywhere.

## Most valuable next actions
1. Rewrite CONTRIBUTING's branching section, retire `development`, take `icons:audit` out of the blocking path, and require both CI jobs on `main` (TD-02, TD-39). About an hour plus admin.
2. Add the feature keys once, shared by backend and worker, and alert on blocked erasures (TD-40, ENV-06, JOB-04).
3. Turn on the dev demo flags and fix the setup docs (TD-41, TD-14).
4. Verify `/api/ops/rule-l` in each environment, then set `RULE_L_REQUIRE_GRANTS=1` (TD-03).
5. Give urgent outbox delivery its own loop, and export job freshness to Alertmanager (TD-49).
6. Fix rate-limit identity and the prod overlay; confirm credential rotation (TD-10, TD-16, TD-05).

The full plan is in [23](23-priority-action-plan.md).

---

## Revalidation 1 summary (`ad01230`, 2026-10-17) — historical record

The sections below were current at `ad01230`. The summary above supersedes them.

## Overall verdict

### 🟠 Significant Improvements Required (unchanged)

Security moved the most. The non-production super-admin backdoor is closed by default, 2FA is persisted and enforced for super admins, a minor-consent flow that contradicted the 18+ rule is gone, and a self-issued compliance certificate has been withdrawn. Many fabricated UI states were replaced with honest ones. New backend domains (DPDP erasure, SOS, consent records, rotating check-in pass, student requests) are well designed, fail closed and come with tests.

Two things now block safe team growth:
1. **There is effectively no automated quality gate.** CI still ignores the `development` branch. On `main` it has been red since 2026-10-16 because a new icon-coverage step fails before type-check, tests, build or secret scan can run. PR #135 was merged on red anyway.
2. **The configuration is out of step with the code.** The new fail-closed features need six keys that no deploy config provides. The Docker dev setup can no longer sign anyone in.

Structural debt from the first audit is largely untouched: the three frontend trees, the monolithic router and model files, the unreachable backend modules and the missing API contract.

## Scores

| Area | 2026-10-08 | 2026-10-17 | Why it moved |
|---|---|---|---|
| Startup Collaboration | 38 | **38** | New domains have their own routers (+). 100% of commits since baseline are by one author, PR #135 was merged on red CI, and there is still no CODEOWNERS (−). |
| Architecture | 45 | **48** | Per-domain routers for new features, DPDP erasure mounted, dead m18 client deleted. Monolith files still growing; three frontend trees remain. |
| Maintainability | 35 | **38** | Raw hex 4,625 → 2,040; simulations reduced; fail-closed reasoning documented in code. Dead code and duplicates unchanged. |
| Documentation | 42 | **45** | Certificate withdrawn; `CLAUDE.md` and design-kit README added. Setup docs now more wrong (TD-41); dated plan files are multiplying. |
| Developer Onboarding | 35 | **30** | The documented Docker quick start can no longer sign in (TD-41), and CI gives no feedback. |
| Scalability | 50 | **52** | 2FA and pending state moved to Postgres. Pooling, rate-limit identity and the migration job are still open. |
| Security | 35 | **50** | Backdoor closed by default, 2FA persisted and enforced, guardian/18+ conflict removed, admin secrets masked, auth logs fixed. Still open: Rule L, rate-limit identity, prod compose exposure, missing deploy keys, credential in history unverified. |
| Testing | 48 | **45** | +50 frontend and +12 backend test files covering the new features (+). CI has not executed any test on `main` since 2026-10-16, and tests still run on SQLite and still target dead code (−). |

Scores use the same 0–100 judgement scale as the baseline. They are assessments, not measurements.

## Current critical and high findings

| ID | Severity | Status | Finding | Report |
|---|---|---|---|---|
| TD-02 | CRITICAL | OPEN | CI does not run on PRs into `development` (`ci.yml:3-7`) | 11, 18 |
| TD-03 | CRITICAL | OPEN | Rule L commerce firewall not enforced in Postgres (no roles or grants in any migration) | 16, 28 |
| TD-39 | HIGH | **NEW** | CI red on `main`: `icons:audit` (0/239 screens) runs first and skips tsc, tests, build and gitleaks; PR #135 merged red | 18, 26 |
| TD-40 | HIGH | **NEW** | `TWO_FACTOR_ENCRYPTION_KEY`, `PASS_SIGNING_SECRET`, `DPDP_ARCHIVE_KEY`/`_RETENTION_DAYS`, `INTEGRATIONS_ENCRYPTION_KEY` missing from every deploy config. In prod, super admins cannot complete enforced 2FA and DPDP erasure stays paused | 25 |
| TD-41 | HIGH | **NEW** | Docker quick start can no longer sign in; docs still promise demo logins | 09, 24 |
| TD-46 | HIGH | OPEN (worse) | Bus factor: all 73 non-merge commits since baseline by one author | 07 |
| TD-47 | HIGH | NOT REVALIDATED | Campus console screens built to show named students' clinical data without a consent gate (team-reported) | 28 |
| TD-10 | HIGH | OPEN | OTP per-IP limit keyed on the nginx IP; spoofable `X-Forwarded-For` | 17 |
| TD-16 | HIGH | OPEN | Prod compose overlay leaves dev Postgres and monitoring ports exposed | 17, 18 |
| TD-05 | HIGH | NOT REVALIDATED | DB credential in git history (rotation unverifiable) | 11 |
| TD-06/07/08 | HIGH | OPEN | Three frontend trees; `workflow_api.py` at 3,167 lines; 56/126 backend modules unreachable | 02–04 |
| TD-11/12/13/14 | HIGH | OPEN | Schema-path split; migrations on every replica; no typed API contract; wrong setup docs | 09, 15, 16 |
| TD-30 | HIGH | OPEN | No E2E in CI (Playwright installed, unused by CI) | 13 |

## Significant improvements since the previous audit (verified)

- **TD-01 backdoor closed by default.** Demo accounts need `APP_ENV∈{development,testing}` **and** `SEED_DEMO_DATA=true`. Console OTP needs `DEV_OTP_CONSOLE=true`, which defaults to off. Auth code treats an unset `APP_ENV` as production. A residual default inconsistency remains (ENV-01, MEDIUM).
- **TD-04 resolved.** 2FA is persisted and Fernet-sealed; an unreadable secret denies; SUPER_ADMIN must enable 2FA (fail-closed policy).
- **TD-18 superseded/resolved.** DPDP erasure is now `services/erasure.py`, mounted and tested.
- **TD-26 resolved.** The compliance certificate is withdrawn, with an explanation.
- **18+ conflict resolved.** Guardian-consent UI and routes removed.
- **Honesty fixes** to fake payment ids and refunds, the invented SOS ambulance, invented HITL actions, insurer "sent", `liveMedia`, camera-scan records and emergency-card prefill. The Razorpay demo key is gone.
- **TD-09 partially resolved.** All vendor routes are role-gated; three consoles are now live.
- **TD-15 partially resolved.** Sign-in identifiers and codes are no longer logged outside explicit dev.
- **Tooling.** Raw-hex and icon lint ratchets, Storybook, axe checks, typed en/te/hi catalogues.

## New risks introduced by recent changes
- TD-39: CI blocked by the design-coverage gate.
- TD-40: feature keys missing from deploy configs.
- TD-41: dev login broken.
- TD-43: design "proof of done" achievable for 0 of 239 screens.
- TD-44: unreviewed Telugu/Hindi crisis and consent copy can be selected.
- DS-03: design archive doubled to 88 MB.
- SCALE-01: SOS sends WhatsApp messages sequentially inside the request, under a 25 s nginx timeout.
- PRIV-03: the erasure archive key and custody are undocumented.

## Readiness

- **Architecture and collaboration.** Not ready for 10–15 parallel developers. New code follows a better per-domain pattern, but the shared hotspots and the single active author are unchanged.
- **Onboarding and installation.** Worse than at baseline: the documented path runs but cannot sign in, and the working path (Vite auto-spawn) is undocumented.
- **Security.** Materially better. The remaining critical item is Rule L in the database; the remaining high items are operational (rate-limit identity, prod overlay, deploy keys, credential rotation).
- **Testing.** Coverage of the new features is good, but nothing executes it automatically right now.

## New audit dimensions added
- [25 Environment & configuration](25-environment-configuration.md)
- [26 Design system & icon pipeline](26-design-system-and-icon-pipeline.md)
- [27 i18n & accessibility](27-i18n-and-accessibility.md)
- [28 Privacy, consent & data governance](28-privacy-consent-data-governance.md)
- [29 Mobile & offline](29-mobile-native-and-offline.md)

## Top five risks over the next 1–3 years
1. **Unverified releases.** Without CI on `development` (TD-02), with a red `main` (TD-39) and with no versioned images (TD-22), regressions ship unnoticed and cannot be rolled back cleanly.
2. **Clinical data reaching commercial or campus surfaces.** Rule L is not enforced in the database (TD-03), and campus consoles have no consent gate (TD-47).
3. **Production features silently disabled.** Missing keys (TD-40) and the `APP_ENV` default split (ENV-01) mean the safety features exist in code but not in the deployment.
4. **Backend velocity collapse.** `workflow_api.py` and `workflow_models.py` keep growing and stay the conflict zone (TD-07), with one person holding the context (TD-46).
5. **Schema drift.** Dev uses `create_all`, tests use SQLite, and prod runs Alembic on 2–3 replicas (TD-11, TD-12). Applied revisions have also been edited after the fact (16).

## Most valuable next actions
1. Make CI a real gate: run on `development`, move `icons:audit` out of the blocking path, and protect `main` and `development` (TD-02, TD-39). About an hour of work.
2. Add the six feature keys to `.env.prod.example`, Helm and the prod overlay, and report missing keys at startup (TD-40).
3. Set the demo flags in `.env.dev.example` and fix README and CONTRIBUTING (TD-41, TD-14).
4. Fix rate-limit identity (TD-10) and harden or remove the prod compose overlay (TD-16). Confirm the credential rotation (TD-05).
5. Execute the team's own dead-code list (`docs/dead-code-2026-10-14.md`): delete `src/modules`, retarget the scaffolder, and delete dead backend modules and their tests (TD-06, TD-08).
6. Rule L roles and grants (TD-03), a server-side consent gate before campus console data (TD-47), and a typed API client (TD-13).

The full plan is in [23](23-priority-action-plan.md).

---

## Previous summary (2026-10-08, baseline `ab4ce3f`) — historical record

At baseline the verdict was the same, 🟠. The top findings were the non-production super-admin backdoor (TD-01, now partially resolved), CI not gating `development` (TD-02, open), Rule L (TD-03, open), 2FA held in memory (TD-04, resolved), proxy-IP rate limiting (TD-10, open), the credential in history (TD-05, not revalidated), three frontend architectures (TD-06, open), 58 unreachable backend modules (TD-08, now 56), public demo staff consoles (TD-09, partially resolved) and wrong setup docs (TD-14, open and worse). The baseline answers to the §28 questions are superseded by the readiness section above. The detailed baseline reasoning is kept in each report under "Original assessment".
