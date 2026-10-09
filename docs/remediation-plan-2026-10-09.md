# Remediation and build plan — 2026-10-09

Source: the four-part audit of 2026-10-09 (screens pages 1–3, pages 4–8,
feature ↔ backend, UI/UX quality). Supersedes the counts in `SCREEN_PLAN.md`
§2–3, which predate ~110 commits.

Each step is one reviewable change: code + tests, suite green before the next.
`[T1]` = touches a Tier 1 screen. Removing a fabrication from a T1 screen is a
defect fix and goes ahead; *building* new T1 behaviour waits for decision A.

---

## Phase 0 — Safety and honesty defects — **done 2026-10-09** (uncommitted)

| Step | Fix | Files | Done when |
|---|---|---|---|
| 0.1 | Remove `STUDENT` from campus console route gates | `src/features/health/module.ts:113-115`, `src/lib/utils/workflowRouting.ts` | test: student denied `/campus*` |
| 0.2 | Resolve `/verify` collision: vendor scanner moves to `/scan-verify`; `/verify` stays the student identity route | `health/module.ts`, `WorkspaceScreen.tsx`, `workflowRouting.ts`, `App.tsx`, vendor screens' nav | test: each path renders its own screen |
| 0.3 [T1] | Identity verify: no client-side "verified". Each check shows *not connected yet* and stays unverified (fail closed). Drop the "encrypted at rest" claim | `features/auth/views/IdentityVerifyView.tsx`, `IdentityVerifyNativeView.tsx` | test: clicking never yields "Verified" |
| 0.4 [T1] | Age gate: `/onboarding` route removed; `EvidencedAgeSignup` can no longer return `isVerified: true` without evidence from the server | `features/auth/module.ts`, `components/EvidencedAgeSignup.tsx` | test: simulated pass is gone |
| 0.5 | Student pass: delete hardcoded check-ins and the browser-minted QR; honest empty state | `features/digital_id/views/WebPass.tsx` | test asserts no seed rows |
| 0.6 | Remove unevidenced "Encrypted WebRTC" copy | `features/teleconsult/views/TeleconsultNativeView.tsx` | grep test |
| 0.7 | BMI `obese` → `attention` (amber); remove "+50 Care Points" / 🎉 from support | `components/clinical/BodyMetricsCalculator.tsx`, `screens/workspace/MemberPanels.tsx` | tests |
| 0.8 [T1] | Crisis reachability: `/crisis` gets one-tap `tel:112` and Tele-MANAS `tel:14416`; SOS/crisis link on sign-in, sign-up, verify-gate (web + native); SOS button ≥ 44 px | `MedicalIncidentScreen.tsx`, auth views, `theme/styles/indigo.css` | a11y + link tests |
| 0.9 | Native notifications contract: `POST /notifications/{id}/read`, read `items`, drop phantom `read-all` | `features/notifications/viewmodel/NotificationViewModel.ts` | unit test vs backend shape |

### Found while doing Phase 0 (not yet fixed)

- **Doctor e-prescription writer [T1] can never issue.** `NMCDoctorEPrescriptionScreen` sends `studentId`, `prescriberRegNo`, `diagnosis`, `clinicalNotes`; `POST /prescriptions` is a strict model expecting `patientId`, `encounterId`, `items[].genericName` and reads the reg. number from the clinician profile. Its patient is also hard-wired to `null`, so it stops at "Please select a student" first. Needs a rebuild against the real contract (decision A). Its false "digitally signed / NMC compliant / dispatched to pharmacy" copy is already removed.
- `InsurancePanel` (`MemberPanels.tsx`) renders the "Record your policy details" dialog twice — the line is duplicated.
- `src/native/hardware/biometrics.ts` is now unused (only the fake native verify used it). Delete, or keep for a real future check.
- Student pass and identity verify now show only what `GET /identity` proves. A rotating, scannable check-in pass needs a backend (signed short-lived token + check-in log) before the design's `MyPass` can be built honestly.
- Offline notifications: the native inbox no longer caches notification text on the device (guardrail 9), so it shows an error when offline instead of stale items.

## Phase 1 — Mobile ↔ backend contract — **done 2026-10-09 except 1.0** (uncommitted)

Native screens call ~15 endpoints that do not exist. For each: point at the real
endpoint, or render an honest *not connected* state. Never a local fake.

1.1 Appointments (`/appointments/providers|slots|book` → existing appointment routes)
1.2 Checkout (`/orders/checkout` → existing order creation)
1.3 Digital ID (`/digital-id/*` → `/identity`, `/profile`)
1.4 Vault consent (`/vault/consent/{id}` → `/records/shares*`)
1.5 Ask Ayush (`/agents/llm/chat` → `/agents/ayush/*`, through the constitution module)
1.0 Rebuild the doctor e-prescription writer on the real `POST /prescriptions` contract [T1]
1.6 LifeShare, Incidents, Teleconsult e-Rx, Scanners, Claims, Clinician assist → not-connected states; gate Incidents/Scanners by role
1.7 Swap native Vault / Digital ID / Checkout to the observer-based `features/*` views; delete the thin `modules/m0x` views
1.8 Remove `lucide-react` from native-reachable calculators; fix relative `<Image>` URIs

### Phase 1 notes

- 1.0 done (owner approved as named reviewer, 2026-10-09; clinical/legal review still owed). The writer picks patients from the doctor's confirmed/completed appointments, sends the real contract, and shows allergy conflicts with an explicit acknowledgement. The backend now refuses a prescription without that care relationship (403), and `/work/appointments` returns `patientId`. `ApiError` keeps structured `detail` so the conflict list reaches the UI.
- **Open backend bug:** `POST /encounters` stores the clinician as the patient (`patient_id=user["id"]`), so "notes finalised" notifications go to the doctor, not the student. Fix with the encounter-notes work in 5.2.
- 1.2: native checkout now uses the real contract, but nothing on native adds to the cart or opens Checkout. A native shop is Phase 4.
- 1.3: `GET /identity` now also returns `qrMatrix` so the native app can draw the server-issued QR without an SVG library.
- 1.6: LifeShare, Claims, Incidents and Scanners are off the native navigator. Native "Cover and claims" (real `/health/policies`, `/insurance/claims`) joins Phase 4.
- Superseded and now unreferenced except through barrels: `src/modules/m02-vault`, `m03-digital_id`, the old on-device chat (`ChatStore` + `ai/careCopilot`), the LifeShare/Incidents/Scanners/Claims feature folders — Phase 7 deletes them.

## Phase 2 — States and accessibility (guardrail 7) — **done 2026-10-09** (uncommitted)

2.1 `ScreenLoading` renders a skeleton, not `null`
2.2 Loading / empty / error / offline on the ~15 native data views (use `design-system/States`)
2.3 Role + label on the 32 unlabeled native touchables; fix the 36 zero-a11y web screens
2.4 Hit targets ≥ 44 px (`indigo.css`, `workflows.css`, checkout steppers, workspace quick-nav)
2.5 ESLint rule banning hex literals in `src/**/*.tsx` (warn → error once counts fall)

### Phase 2 notes

- 2.1 `ScreenLoading` shows a skeleton after 200 ms (no flash on fast loads, no 7 s blocking loader).
- 2.2 Native Notifications, Teleconsult ("not available yet"), Clinician console (points to web; dev-only AI differential-diagnosis UI removed — M18 is a separate service) and a new native Shop on `/catalog` (adds to the real cart; prescription-only items not orderable) all have loading/empty/error states. This also makes native Checkout reachable.
- 2.3 Every touchable reachable from `src/native/index.ts` has a role. On web, 8 icon-only buttons got names and 9 clickable non-buttons got role, tab stop and Enter/Space via `src/lib/a11y/pressable.ts`; a duplicate clickable catalogue thumbnail was made non-interactive instead.
- 2.4 Modal close, shop quantity, promo carousel and workspace quick-nav controls are at the 44 px token.
- 2.5 `no-restricted-syntax` bans raw hex in `src/**/*.tsx`. 236 existing files are exempted in `config/hex-colour-legacy.json`; a test stops that list growing. Phase 3.3 works it down.
- Not covered by the scans: form inputs without an associated label, colour contrast, focus order. Those need axe (3.1).

## Phase 3 — Design system

3.1 Storybook + axe
3.2 Missing core components: Select, CodeInput, PhoneInput, Checkbox, Chip, ListRow, Toast, BottomSheet/Drawer, Table, Verified/Source badge
3.3 Migrate shell (`App.tsx:158`, `WorkspaceScreen.tsx:367`) and landing views to tokens + type scale
3.4 Decide dark mode (honour OS in `ThemeProvider`, or drop the media block)
3.5 i18n layer; load Noto Telugu / Devanagari

## Phase 4 — Native student parity

Emergency card (offline, no login) [T1] → Profile → Orders → Medications →
My reports → Pass → Consent inbox → Support → Plans/billing → Devices →
Movement → onboarding (ProfileSetup, Permissions, AccountReady, LoggedOut) →
sign-out confirmation.

## Phase 5 — Wire console shells

5.1 Partner: Dispense register, Substitutions, Rx review, Handover onto existing `/work/prescriptions`, `/ops/dispense-register`, `/dispenses/{id}/substitutions`
5.2 Doctor: edit/finalise encounter notes (`PATCH /encounters/{id}`, `/finalize`); patients list; renewals
5.3 Campus: roster, camps (`/ops/camps`), overview; then SLA, settings, announcements
5.4 Admin: Sentinel (endpoints exist), partners, tenants; route Claims adjudication or delete it
5.5 Missing student screens: NewDevice, PaymentResult, Refund, CheckinReceipt, ConsultSummary, WebSecurity, ProductDetail page

## Phase 6 — New backend (blocked)

ABHA/ABDM (decision D), chat, rewards, community, learn, M18 as its own service
(guardrail 5), server cart, clinician credential verification.

## Phase 7 — Clean-up and truthing

Delete the 184 unreached `.tsx` files and duplicate views; mount or delete
`core/email_quality.py`; correct `top-100-feature-todos.md` and the P0
certification to match the code.

---

## Decisions needed from a human

| # | Decision | Blocks |
|---|---|---|
| A | Named Tier 1 design reviewer + clinical/legal sign-off | new T1 behaviour in 0.8, 4, 5 |
| D | ABDM sandbox credentials | Phase 6 ABHA |
| E | Emergency card without login: OK to cache on device? | Phase 4 first item |
| G | Dark mode: on or off | 3.4 |
