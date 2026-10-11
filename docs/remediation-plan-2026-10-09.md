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

3.1 **Done 2026-10-09:** Storybook 10 (`npm run storybook`, telemetry off) with stories for every core component state; axe-core runs in vitest over the design system and seven key screens (`src/test/axe.ts`). Colour contrast and target size are not checked in jsdom — check them in Storybook in a browser.
3.2 **Done 2026-10-09:** Select, CodeInput, PhoneInput, Checkbox, Chip, ListRow, Toast, Sheet (bottom sheet / dialog; honours reduced motion), Table, ResultMoment (success only for order/booking/payment), Verified badge (server status only) and Source badge. Still missing: shared Sidebar navigation.
3.3 Migrate to tokens + type scale. Done: app shells, and on 2026-10-11 every file touched by the translation pass — legacy list 234 → 172. Remaining hex is mostly SVG illustration colour and files in `docs/dead-code-2026-10-11.md`.
3.4 **Done 2026-10-09 (decision: support dark mode):** `ThemeProvider` takes a System/Light/Dark preference (selector on the web profile page) and follows the device live under System. Design-system colours are CSS variables on web and the device scheme at launch on native. Default stays **Light** (`DEFAULT_THEME_PREFERENCE`) until the hex legacy list is migrated — screens still on raw hex are not dark-safe. Storybook has a theme toolbar switch.
3.5 i18n (decision: full translation) — **done 2026-10-11 for every reachable screen** (web student app, onboarding, landing, admin/campus/partner/clinician consoles; per-area catalogues in `src/i18n/areas/`). Still English: copy held in `.ts` data/helper files (`welcomeSlides.ts`, `permissionChoices.ts`, `superAdminNavigation.ts`, `features/admin/model/format.ts`, exercise data), server status codes, and server error text.
   - Done: typed catalogue `src/i18n` (en source; te/hi must define every key — compile-time), `LanguageProvider` on web and native, `useT()`, language picker (web sign-in, web profile, native sign-in, native home), Noto Telugu/Devanagari in the token font stack and web fonts. Translated: crisis links, native home + destinations, identity verify, appointments, shop, cart/checkout, Digital ID, health records, notifications, Ask Ayush, video consult, `/pass`, loading skeleton, appearance.
   - **Telugu and Hindi are an unreviewed first draft** (`REVIEW_STATUS`). A native speaker must review both, and a clinician the crisis, consent and clinical wording, before release. The picker tells users this.
   - Also done: SOS, sign-in/sign-up (web + native, every step), emergency card (rebuilt — it was pre-filled with invented allergies and a contact, and reported failed saves as saved), verify gate, lost phone, delete account, requests, leave campus, notification settings. View-models now return message keys or `Said` (our key, or the server's raw text).
   - Next: onboarding views (splash, welcome carousel, profile setup, permissions, account ready, logged out, sign-out); then the landing pages; legacy workspace panels follow 3.3.
   - Backend error messages are English; they show as-is until the API is localised. Legacy workspace panels (`MemberPanels`, `AppointmentsPanel` …) are translated as 3.3 moves them onto the design system.
   - Native fonts: fixed 2026-10-11 — native uses platform faces (which carry Telugu/Devanagari) and no longer fetches woff2 from Google. Bundling the brand font needs one family per weight.

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

Candidate list: `docs/dead-code-2026-10-11.md` (A: 317 files nothing imports; B: 98 files
only their own tests import; C: 78 `src/ai`/`src/core` files that need wire-or-delete
decisions). Deletion not yet run — it needs the owner's go-ahead. P0 certification
withdrawn and prompt ledger caveated 2026-10-11. Still to do: mount or delete
`core/email_quality.py`; correct `top-100-feature-todos.md`.

---

## 2026-10-11 pass — fixed

Family share (fake ACTIVE grants) and local-only consent inbox; `/crisis` report form that sent
nothing (with a "CRITICAL — ambulance" option); encounter notes stored the doctor as patient,
PATCH blanked fields, finalised notes were editable; duplicate insurance dialog; unused
biometrics + Face ID prompt; OTP codes/identifiers logged when `APP_ENV` unset; insurer claims
marked SUBMITTED with no insurer client; `liveMedia` reported without a relay; camera-scan
endpoint filing image-less records; step history in localStorage; crisis-gate message leaking
internal errors and a mislabelled counsellor number; SOS bar poison number; plus the honesty
fixes in each translation commit (scan-verify and cold-chain now fail closed, fake e-Rx
dispatch, invented prices/plans/statistics/customers, compliance claims).

## Still open (found 2026-10-11)

- Partner handover accepts any 6 digits; at-counter handover needs no OTP; Rx review starts with
  "registration verified"/"date valid" pre-ticked; substitution has no allergy check — all
  clinical-logic changes, need clinical sign-off. No vendor API exists for register, cold chain,
  run sheet, returns, settlement, staff — the H1 register in local state is not a legal record.
- Campus console screens (MEO, counsellor, meal diet, medical leave, isolation) are built to
  show named students' clinical data to campus admins with no consent gate. Empty today; must be
  gated server-side before any API is wired. Small-count suppression must be server-side.
- `GET /admin/integrations` may return plaintext secrets (UI "Reveal secrets"); HITL agent seeds
  invented named actions; Ayush history is kept even when the student's flag says otherwise;
  native app requests push permission at launch before sign-in.
- `ClinicianViewModel.refreshCdss` → `agentApi.clinicalAssist`: not verified to route through
  the constitution; clinician decision support in the main app conflicts with guardrail 5.
- Proposed group/campus plan prices are typed into PricingScreen; `subscriptionPlans.ts`
  contradicts the server plan list; native landing lab/plan prices not wired to the catalogue.

## Decisions needed from a human

| # | Decision | Blocks |
|---|---|---|
| A | Named Tier 1 design reviewer + clinical/legal sign-off | new T1 behaviour in 0.8, 4, 5 |
| D | ABDM sandbox credentials | Phase 6 ABHA |
| E | Emergency card without login: OK to cache on device? | Phase 4 first item |
| G | ~~Dark mode~~ — decided: support it; default flips to System after 3.3 | 3.4 |
