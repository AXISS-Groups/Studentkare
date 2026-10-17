# 00 — Executive Summary

**Repository:** `AXISS-Groups/Studentkare`
**Current revision:** `main` @ `ad01230` (2026-10-16), audited 2026-10-17
**Previous audit:** `development` @ `ab4ce3f`, 2026-10-08. There are 84 commits in between: 73 non-merge, 2,012 files changed.
**Method:** read-only. Covers the git diff and history since the baseline, read-only GitHub Actions and PR history, the backend import graph and route scan, frontend structure and metrics (same scripts as the baseline), and local `tsc`/ESLint/Knip/`icons:check` with output written outside the repo. **No tests, installs, app runs or `icons:audit` were executed.** The finding register with stable IDs is in [22](22-technical-debt.md); the index is in [README](README.md).

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
