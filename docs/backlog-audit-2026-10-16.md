# Backlog audit — 2026-10-16

The design kit's 147-ticket backlog (`design/backlog/studentkare-full-backlog.csv`) checked against the code at `5cc04da`, plus the uncommitted remembered-device work. Read-only code review, one reviewer per epic group; the safety findings below were re-checked by hand before fixing. Icon criteria were skipped (the kit was not installed yet; see `chore/design-kit`).

**Result: 0 of 147 tickets fully meet their acceptance criteria.** Most are partial: the web workspace has a working version, while the native app, the partner and campus consoles, and anything that needs an external provider (payments, ABDM, video, SMS, verification) are missing or are honest "not connected" shells.

## Status refresh — 2026-10-17 (main at `ad01230`)

Re-checked against the code, not only the commit messages. Fixed since the audit:

| Item | Where it landed | Evidence in the code |
|---|---|---|
| DPDP consent at signup (SK-027) | `eadf71e`, `2bf72ae`, `be86275` | `POST /api/auth/signup` requires `SIGNUP_CONSENT_VERSION` and all of `SIGNUP_REQUIRED_PURPOSES`; account and `care_consent_records` row written together (migration `e5a7b3c90d14`); phone signup has the consent step |
| Lab hold and doctor release | `97855a3`, `fd9b9bc` | lab files via `POST /api/work/lab-orders/{id}/report`; held outside the vault until `POST /api/work/lab-reviews/{id}/release` by the reviewing doctor (migration `c8d2f4a61e93`); live lab desk at `/lab-queue` |
| Rotating check-in pass | `2d3f2bc`, `454bd73` | `services/check_in_pass.py`: server-signed, 30 s step, single use; 10-minute pre-signed window held in app memory only |
| Remembered devices | `5cf12b9` | `care_remembered_devices` (migration `a3f9c2d7e815`); `/api/auth/remembered*` never issues a session |
| Admin 2FA persisted (was in memory) | `74e64df` | `care_two_factor`, `care_two_factor_pending` (migration `b4e1c9d27f30`); secrets sealed with Fernet; an unreadable secret refuses sign-in |
| 2FA set-up screen and enforcement | `ebe0998` | `deny_until_two_factor` holds sessions for `TWOFA_ENFORCED_ROLES` (default `SUPER_ADMIN`, fail closed); set-up / turn-off in `SignInSecurityView` |
| Partner pass verify | `e01695a` | `WebScanVerifyScreen` → `POST /api/identity/verify`; VENDOR gets identity-only fields; 410 on a stale or reused code |
| Pharmacy queue routing | `112b433` | `/dispensing` → `PharmacyDispensingScreen` → `PharmacyQueuePanel` on `GET /api/work/dispenses`; `/returns` mounts the live `PartnerRequestsPanel` |
| Encounter signing | `f719b71` | `PATCH /api/encounters/{id}` and `POST /api/encounters/{id}/finalize` are author-only (`_own_encounter_note`), DRAFT → FINAL once (409 after); edit and sign in `EncounterNotesPanel` |
| Doctor appointment control | `b08528f`, `f92856e` | doctors confirm, complete, mark no-show on their own appointments (`/api/work/appointments` scoped to `provider_id`); students can only cancel |
| Admin reviewer assignment and outbox screens | `5879bbc` | `/admin/lab-reviews` (`LabReviewerAssignmentView` → `POST /api/work/lab-reviews/{id}/assign`) and `/admin/outbox` (`MessageOutboxView`) |
| Decision support in the main app (SK-112) | `c7efe3a` | `Flow08ClinicianConsoleScreen`, `ClinicianStore`, `src/modules/m18-clinician` and `services/clinical_assist.py` deleted. Backend stubs remain; see open item 2 |
| `DEV_OTP_CONSOLE` / demo code / unset `APP_ENV` | `d92e2ef` | `DEV_OTP_CONSOLE` defaults to `false`; the `123456` demo code needs it; demo accounts need `APP_ENV=development\|testing` and `SEED_DEMO_DATA=true` |

## By epic

Rows marked **(2026-10-17)** carry the refresh above; the rest are as audited.

| Epic | Tickets | Shape of the gap |
|---|---|---|
| E0 Launch blockers | SK-001–006 | Fake endpoints removed but their dead UI is still in the tree (camera rPPG, X-ray modal). `DEV_OTP_CONSOLE` defaults to true; no `SEED_DEMO_DATA` flag. APILayer proxy has no per-call audit. Plus price lives in two places (`billing.py:37` paise, `:97` rupees). `/lifeshare` and `/medical-incident` are public with no on-hold flag. **(2026-10-17)** `DEV_OTP_CONSOLE` now defaults to false and `SEED_DEMO_DATA` gates demo accounts. |
| E1 Design system | SK-007–022 | Components exist; adoption is low (40 files). ~2,400 raw hex in CSS, outside the lint rule. No shared nav, no drawer, no route table or deep links. `tokens:check` not in CI. |
| E2 Sign-in & onboarding | SK-023–033 | ~~No DPDP consent captured at signup (SK-027).~~ **(2026-10-17)** consent recorded at signup, web and phone. Splash hour bands wrong. No 10-min OTP lock; resend 45 s not 30 s. Verification gate exists but gates nothing. Under-18 guardian flow (SK-031) conflicts with DESIGN.md D4 — close it. |
| E3 Student app | SK-034–049 | Web mostly there; native missing Search, Your Care, Medicines, Devices, Vitals, My reports. No `GET /search`. No reference ranges. Teleconsult video does not exist (deliberate placeholder). |
| E4 Safety & privacy | SK-050–061 | Emergency card and crisis need sign-in / were not offline (see fixes). ~~Check-in pass QR is static — a screenshot stays valid.~~ **(2026-10-17)** pass rotates every 30 s and is single use. Consent inbox, Care Circle, grievance missing (blocked on ABDM / legal). Delete account has no phone-code confirm. |
| E5 Shop & orders | SK-062–067 | No payment, no order timeline, no Rx photo upload, no refund tracking. |
| E6 Account | SK-068–072 | Web only; no ABHA; no phone/email change. |
| E7 Public site | SK-073–078 | Honest (no compliance claims). Videos not lazy; category pages ignore the category; no campus/clinician application. |
| E8 Student web | SK-079–089 | No session list / 2FA; SK-083 lab insights missing; legal pages blocked on named officer. **(2026-10-17)** 2FA set-up and turn-off exist (`SignInSecurityView`); a full session list was not re-checked. |
| E9 Campus console | SK-090–104 | Mostly empty shells. No aggregate endpoint with k-anonymity. Break-glass has no backend. Counsellor tab visible to every campus admin; no COUNSELLOR role. Diet / isolation screens are designed around named clinical data. |
| E10 Doctor console | SK-105–114 | ~~Encounter notes never finalised from UI~~; doctor lab orders / referrals don't exist. ~~SK-112 decision support is still mounted~~. **(2026-10-17)** doctors sign encounter notes, control their own appointments and review/release lab reports; the decision-support UI is deleted. |
| E11 Partner console | SK-115–127 | Every `src/screens/vendor/*` screen is local state only; backend partner endpoints exist but nothing live calls them. Handover / substitution / lab release logic is inverted (vendor records the student's consent; lab releases critical values itself). No staff mobile app. **(2026-10-17)** live now: dispense queue (`/dispensing`), requests (`/returns`), lab desk (`/lab-queue`) and pass verify (`/scan-verify`); labs no longer release. Other vendor screens not re-checked. |
| E12 Super admin | SK-128–143 | ~~Admin 2FA lives in memory (lost on restart).~~ **(2026-10-17)** 2FA is DB-backed and enforced for super admins; lab reviewer assignment and message outbox screens exist. Audit explorer shows purchase events. Templates, ledger, flags, surveillance not connected. Sentinel digest scans mock files. |
| E13 Quality | SK-144–147 | axe on 8 screens; e2e smoke not in CI; legal/content review not done. |

## Guardrail defects

Fixed on `fix/audit-guardrails-2026-10-16`:

| Defect | Guardrail |
|---|---|
| Student could confirm/complete their own appointment, opening the consultation join gate | 1 |
| `POST /orders/{id}/payment` said "Payment session created." without calling a provider | honest data |
| Seeded "Demo Student" prescription (fake licence, `signature_verified=True`) served live; any staff could read it; approving an unknown id still wrote an audit row | 4, 6 |
| Notification outbox seeded with invented recipients, one "DELIVERED"; any staff (incl. vendors) could read/run it | 4 |
| `SOS_ACKNOWLEDGED` / `SOS_RESOLVED` held by quiet hours or dropped | safety |
| Crisis follow-up queue returned every campus's students to any campus admin | 4, 9 |
| `public/sw.js` threw on every fetch, so offline `/crisis` never worked | DESIGN §2.4 |
| Medication panel showed "Daily completion N%" | no gamification |

Still open at the audit (need a decision or a larger change), with the 2026-10-17 status:

1. ~~**No DPDP consent recorded at signup** (SK-027).~~ **Fixed** (`eadf71e`). The Tier 1 design/legal review it asked for is still outstanding (`docs/reviews/tier1-review-2026-10-16.md`).
2. ~~**Clinician decision support reachable in the main app** (SK-112, guardrail 5).~~ **Fixed**: console UI deleted (`c7efe3a`); `POST /api/triage/council-eval`, `/api/records/generate-soap`, `/api/ai/voice-prescription`, `/api/v1/agents/mesh-triage` and `GET /api/v1/agents/system-log`, their agent modules and the web modals that called them are removed on `fix/remove-fake-clinical-ai` (the paths now 404).
3. ~~**Admin 2FA in memory** (`twofa_store.py:14`).~~ **Fixed** (`74e64df`, migration `b4e1c9d27f30`).
4. ~~**Critical lab results** released to the student before a clinician acknowledges, and any NMC_DOCTOR can read every patient's critical results.~~ **Fixed** (`97855a3`): release is the reviewing doctor's step and the critical queue is scoped to the care relationship.
5. ~~**Static check-in pass QR** is screenshot-replayable.~~ **Fixed** (`2d3f2bc`).
6. ~~**`DEV_OTP_CONSOLE` defaults to true** and demo identifiers accept `123456` regardless; unset `APP_ENV` defaults to "development" in `check_origin`.~~ **Fixed** (`d92e2ef`).
7. **SUPER_ADMIN reads any shared document's content without an audit row** (`workflow_api.py:380`). Not re-checked.
8. **`POST /ops/slots` and `POST /ops/camps`** accept any staff role (incl. VENDOR) on any provider; camps take an untyped `dict`. Still open: `create_slot` uses `require_staff`.
9. **`/v1/telemetry/vitals`** still accepts client-supplied vitals with no source and files them as "Vitals & Optical Scan". Still open: the endpoint is mounted.
10. **Stale GO in `docs/release/P14_RELEASE_READINESS_GATE.md`** citing a withdrawn certification (guardrail 6). Not re-checked.
11. Dead files with hardcoded compliance strings and fake data remain (`docs/dead-code-2026-10-14.md` delete list not executed). Not re-checked.
12. Mojibake in API strings (`workflow_api.py:72` "Â°C", `:622` "â‚¹"). Still open (lines 72, 623, 846).

## Decisions blocking tickets

A named Tier 1 design reviewer (decision A) blocks every Tier 1 ticket. ABDM sandbox credentials (D) block ABHA, consent inbox, Care Circle. Emergency-card caching (E) blocks offline card / SK-145. Legal officer blocks SK-060/089/147. Payment, SMS, video and identity-verification providers block SK-063, SK-052 fallback, SK-038 and SK-029.
