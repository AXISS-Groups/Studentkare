# Backlog audit — 2026-10-16

The design kit's 147-ticket backlog (`design/backlog/studentkare-full-backlog.csv`) checked against the code at `5cc04da`, plus the uncommitted remembered-device work. Read-only code review, one reviewer per epic group; the safety findings below were re-checked by hand before fixing. Icon criteria were skipped (the kit was not installed yet; see `chore/design-kit`).

**Result: 0 of 147 tickets fully meet their acceptance criteria.** Most are partial: the web workspace has a working version, while the native app, the partner and campus consoles, and anything that needs an external provider (payments, ABDM, video, SMS, verification) are missing or are honest "not connected" shells.

## By epic

| Epic | Tickets | Shape of the gap |
|---|---|---|
| E0 Launch blockers | SK-001–006 | Fake endpoints removed but their dead UI is still in the tree (camera rPPG, X-ray modal). `DEV_OTP_CONSOLE` defaults to true; no `SEED_DEMO_DATA` flag. APILayer proxy has no per-call audit. Plus price lives in two places (`billing.py:37` paise, `:97` rupees). `/lifeshare` and `/medical-incident` are public with no on-hold flag. |
| E1 Design system | SK-007–022 | Components exist; adoption is low (40 files). ~2,400 raw hex in CSS, outside the lint rule. No shared nav, no drawer, no route table or deep links. `tokens:check` not in CI. |
| E2 Sign-in & onboarding | SK-023–033 | **No DPDP consent captured at signup (SK-027).** Splash hour bands wrong. No 10-min OTP lock; resend 45 s not 30 s. Verification gate exists but gates nothing. Under-18 guardian flow (SK-031) conflicts with DESIGN.md D4 — close it. |
| E3 Student app | SK-034–049 | Web mostly there; native missing Search, Your Care, Medicines, Devices, Vitals, My reports. No `GET /search`. No reference ranges. Teleconsult video does not exist (deliberate placeholder). |
| E4 Safety & privacy | SK-050–061 | Emergency card and crisis need sign-in / were not offline (see fixes). Check-in pass QR is static — a screenshot stays valid. Consent inbox, Care Circle, grievance missing (blocked on ABDM / legal). Delete account has no phone-code confirm. |
| E5 Shop & orders | SK-062–067 | No payment, no order timeline, no Rx photo upload, no refund tracking. |
| E6 Account | SK-068–072 | Web only; no ABHA; no phone/email change. |
| E7 Public site | SK-073–078 | Honest (no compliance claims). Videos not lazy; category pages ignore the category; no campus/clinician application. |
| E8 Student web | SK-079–089 | No session list / 2FA; SK-083 lab insights missing; legal pages blocked on named officer. |
| E9 Campus console | SK-090–104 | Mostly empty shells. No aggregate endpoint with k-anonymity. Break-glass has no backend. Counsellor tab visible to every campus admin; no COUNSELLOR role. Diet / isolation screens are designed around named clinical data. |
| E10 Doctor console | SK-105–114 | Encounter notes never finalised from UI; doctor lab orders / referrals don't exist. **SK-112 decision support is still mounted** (`ClinicianWorkspaceHub` → `DoctorTodayScreen` → `Flow08ClinicianConsoleScreen`), against decision 0ebac6e and guardrail 5. |
| E11 Partner console | SK-115–127 | Every `src/screens/vendor/*` screen is local state only; backend partner endpoints exist but nothing live calls them. Handover / substitution / lab release logic is inverted (vendor records the student's consent; lab releases critical values itself). No staff mobile app. |
| E12 Super admin | SK-128–143 | Admin 2FA lives in memory (lost on restart). Audit explorer shows purchase events. Templates, ledger, flags, surveillance not connected. Sentinel digest scans mock files. |
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

Still open (need a decision or a larger change):

1. **No DPDP consent recorded at signup** (SK-027). Tier 1, needs reviewer (decision A).
2. **Clinician decision support reachable in the main app** (SK-112, guardrail 5). Delete per 0ebac6e.
3. **Admin 2FA in memory** (`twofa_store.py:14`): after a restart a super admin signs in with OTP alone. Needs a table + migration.
4. **Critical lab results** released to the student before a clinician acknowledges, and any NMC_DOCTOR can read every patient's critical results (`clinical_api.py:869-881, 1071-1110`). Needs a care-relationship rule.
5. **Static check-in pass QR** (`member_profile_api.py:162-168`) is screenshot-replayable. Needs pass signing.
6. **`DEV_OTP_CONSOLE` defaults to true** and demo identifiers accept `123456` in any dev/test env regardless of it; `APP_ENV` unset defaults to "development" in `check_origin` (`workflow_auth.py:70, 200, 296`).
7. **SUPER_ADMIN reads any shared document's content without an audit row** (`workflow_api.py:380`).
8. **`POST /ops/slots` and `POST /ops/camps`** accept any staff role (incl. VENDOR) on any provider; camps take an untyped `dict`.
9. **`/v1/telemetry/vitals`** still accepts client-supplied vitals with no source and files them as "Vitals & Optical Scan".
10. **Stale GO in `docs/release/P14_RELEASE_READINESS_GATE.md`** citing a withdrawn certification (guardrail 6).
11. Dead files with hardcoded compliance strings and fake data remain (`docs/dead-code-2026-10-14.md` delete list not executed).
12. Mojibake in API strings (`workflow_api.py:72` "Â°C", `:622` "â‚¹").

## Decisions blocking tickets

A named Tier 1 design reviewer (decision A) blocks every Tier 1 ticket. ABDM sandbox credentials (D) block ABHA, consent inbox, Care Circle. Emergency-card caching (E) blocks offline card / SK-145. Legal officer blocks SK-060/089/147. Payment, SMS, video and identity-verification providers block SK-063, SK-052 fallback, SK-038 and SK-029.
