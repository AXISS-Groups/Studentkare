# Remaining build tickets — copy-paste prompts for Claude Code

Status on 2026-10-21, after #195 merged (main: 221 of 252 design screens built).
Every prompt assumes Claude Code is opened at the repo root on an up-to-date `main`.
Run one ticket per branch. Tickets in **Part A** can run in parallel with each other and with Part B;
they only share the registry lists (routes, i18n areas, nav, implementation map). Before the PR,
rebase on `main`; on a conflict run `npm run merge:resolve`, then the checks (RULES.md, "Parallel branches").

**Who does what**
- **Part A — Krishna with Claude Code:** K1–K7 below.
- **Part B — Claude (this session):** data-privacy fixes, CI, small settings fixes, superseded screens. Don't pick
  these up: they touch the backend files listed and would conflict.
- **Part C — blocked:** waiting on a decision or sign-off; no prompt yet.

---

## Part A — prompts

### K1 · Desktop doctor booking (/care) in the Mobile 2.0 design  ·  Tier 2
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: bring /care (doctor consults and care
services) above phone width onto the Mobile 2.0 design, the way #196 did for /shop and /checkout
(read that PR's doc docs/plans/m2-web-shop-2026-10-21.md and its code under src/features/ for the
pattern). At phone width /care already opens M2Consults; reuse its view models and the shared pieces
in src/design-system/m2/. First write docs/plans/m2-web-care-2026-10-21.md: every existing /care flow
and state (consult list, concern chips incl. the crisis note on stress/sleep/low mood, doctor cards,
booking dialog, slots, payment, confirmation, signed-out vs signed-in, empty/error/offline) and where
each lands. Then build a real desktop layout (grid, sticky summary), signed-out inside the public
header/footer, signed-in inside the student shell. Keep every flow and business rule; doctor
registration numbers/years/languages stay out (no data). Tests for every state + axe + reduced
motion; screenshots 1440/1024/390 light+dark. Branch feat/m2-web-care, one PR to main.
```

### K2 · Phone records: RecordsVault, PrescriptionUpload, ConsultSummary + WebConsultSummary  ·  Tier 1 (approved)
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: build RecordsVault, PrescriptionUpload,
ConsultSummary and WebConsultSummary to the canvas. They are Tier 1; the approved plans are
docs/plans/tier1-canvas-wp07-2026-10-20.md (phone) and docs/plans/tier1-canvas-wp09-2026-10-20.md
(web), with docs/plans/tier1-mobile2-health-2026-10-21.md taking priority where they overlap
(Mobile 2.0 nav, M2 visual language, decision list). Build exactly what the plans say; where a plan
routes something to the clinical lead or legal, ship it unavailable. WebConsultSummary needs a star
rating that has no backend: leave the rating out and say so in the PR (it stays in inProgress if
check-icons can't pass without it — say exactly why). Web phone frame and Expo (src/native) for the
phone screens. Each screen moves to `screens` in the implementation map only when check-icons passes.
Branch feat/wp07-records, one PR to main.
```

### K3 · Phone care: Medications, RefillRequest, Devices, Teleconsult  ·  Tier 1 (approved)
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: build Medications, RefillRequest, Devices and
Teleconsult to the canvas. Tier 1; approved plans: docs/plans/tier1-canvas-wp07-2026-10-20.md,
docs/plans/tier1-care-flows-2026-10-19.md, docs/plans/tier1-wellness-screens-2026-10-20.md, and
docs/plans/tier1-mobile2-health-2026-10-21.md (wins on overlap; decision 9: Insights' refill card opens
RefillRequest). Medicine names and doses are clinical values: show only what the server returns, no
generated advice, no invented schedules. Refill plans have no due date in the API today: don't show
one. Teleconsult reuses the existing LiveKit video panel and appointment APIs; anything without a
backend is shown unavailable. Web phone frame + Expo. Branch feat/wp07-care, one PR to main.
```

### K4 · Ayush chat and Ayush sheet (container, general mode)  ·  Tier 1 (approved)
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: build AyushChat and AyushSheet per
docs/plans/tier1-ayush-container-2026-10-20.md, consistent with M2AskAyush (already on main) and
decisions 13–14 of docs/plans/tier1-mobile2-health-2026-10-21.md. GENERAL MODE ONLY: Ayush must not
read the student's records (that waits for the AI-constitution owner). Keep the crisis strip
(Tele-MANAS 14416, 112), the beta label and "a doctor checks anything clinical". Sheet opens from the
pill-nav orb on phone (web + Expo); chat is the full screen. Hidden on SOS, crisis, emergency card,
checkout and sign-in, as the web AyushWidget already is. Branch feat/ayush-container, one PR to main.
```

### K5 · ProductList and LandingClinician  ·  Tier 2
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: build ProductList (phone catalogue list) and
LandingClinician (public clinician landing page) to the canvas. ProductList should reuse the Mobile 2.0
store view models and product cards from M2Medicines/#196 (no forked logic). LandingClinician: public
header/footer, every claim must be backed by the code or removed (no clinician counts, no earnings
promises; doctors' commission is not set — don't show a percentage). Branch feat/productlist-clinician,
one PR to main.
```

### K6 · Phone app parity for the older student flows  ·  mixed tiers (plans approved)
```
Read docs/tickets/RULES.md and follow it exactly. Ticket: the Expo app (src/native) is missing many
student flows that exist on web. First list every student route on web (src/lib/utils/workflowRouting.ts,
src/features/*/module.ts) and every Expo screen (src/native/App.tsx); write the gap list to
docs/plans/native-parity-2026-10-21.md. Then build Expo screens for the gaps in this order, sharing the
web view models (no forked logic): (1) safety & consent — EmergencyCard, IceContacts, CrisisSupport,
MyPass, ConsentInbox, Legal, PlanBilling, FamilyCircle (approved plan tier1-canvas-wp06); (2) records
and account — vault, records detail, account details, notification settings, security, my requests,
data export; (3) anything else left. Every SOS / 112 / Tele-MANAS path must work offline-first as on
web. Run `npx tsc -p config/tsconfig.native.json` and `npx expo export --platform android --output-dir
<tmp>` before the PR. Split into one PR per group: feat/native-safety, feat/native-records, feat/native-rest.
```

### K7 · Run the phone app on a real device (manual QA)
Not a prompt — do this yourself once K6 group 1 lands:
1. `npm ci`, then `EXPO_PUBLIC_API_BASE_URL=https://<your-api>/api npm run start:native` (see `src/native/README.md`).
2. Open in Expo Go on one Android and one iPhone. Walk: sign-in → Home → each service tile → Orders →
   Ayush orb → My health → Trends → Report upload → Profile → SOS → Emergency card.
3. Check: bottom nav doesn't hide content (there may be extra blank space at the bottom), text size at
   the largest system setting, reduce-motion on, offline mode. File issues with screenshots.

---

## Part B — Claude is building these (don't pick up)
- **B1 Privacy:** super-admin intake review must not show fields extracted from students' own documents.
- **B2 Data placement:** blood group and allergies move from identity to the clinical plane (migration + Rule L).
- **B3 Refill due date:** add a due date to refill plans so the refill cards can show it.
- **B4 CI:** make the Postgres 15/16 backend jobs pass on main.
- **B5 Small fixes:** account-deletion grace period into the settings registry; server-side
  "verified before collect" for lab samples.
- **B6 Superseded screens:** mark MyReports, VitalTrends, ReportInsights, WebReportInsights and
  WebReportAssistant as replaced by the Mobile 2.0 health screens (or link them), so the map is honest.

## Part C — blocked (no prompt until unblocked)
| Item | Waiting on |
|---|---|
| GuardianConsent, GuardianApprove (+ web) | Founder decision: support under-18 students and parents? |
| NewDevice | Selfie match and device-transfer backend |
| CheckinReceipt | A student-facing handover receipt API |
| Ayush reading records | AI-constitution owner sign-off |
| Vaccine record, "why this vaccine", schedule | Clinical lead |
| Lab test reference list, out-of-range colouring confirmation, web critical-result wording | Clinical lead |
| Medicine information (uses, side effects) | Pharmacist review |
| Privacy notice, terms, grievance officer | Legal |
| Telugu / Hindi copy | Native reviewers |
| Doctors' commission share; 3-month price (₹2,199 vs 3 × ₹149) | Founder decision |
| Rider tracking, chat to order, insurance e-card / network hospitals, automatic report reading, campus SSO | Vendor / backend choices |
| Razorpay ₹149 plan; `shop.order_line_phone` | Ops setup |
| Design-system boards (FlowMap, IconSystem, IllustrationLibrary, MotionSystem, NavSheets, StateScreens, StatusMoments, NotificationTemplates) | Reference boards — no app screen needed |
