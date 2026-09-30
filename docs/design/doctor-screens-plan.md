# Doctor screens — design principles, components, and build plan

Source: `studentkare-screens/` page 5 (19 screens, pictures + source markup).
Rules that win over this file: `AGENTS.md`, then `DESIGN.md`.
Build approach: **one screen per task, one PR per screen.** Each screen is finished
(all states, both widths, accessibility, tests) before the next starts.

---

## 1. Brand and design principles, as the doctor screens apply them

| Principle | How it shows up on the doctor screens |
|---|---|
| **Calm and clinical** | Light canvas, white cards, one dark sidebar. One primary action per card. No motion on clinical values. |
| **Access is visible** | Every patient row says *why* the doctor can see it (consent active / awaiting / expired, "expires in 12 days"). Locked items stay in the list with a lock and a reason ("Outside the consent window"). They are not hidden. |
| **Refusals are shown, not hidden** | Blocked drugs stay in the search list with the reason. A refused AYUSH request stays as a row. A lab order with no reason can't be created. |
| **Severity before arrival** | Critical results are sorted by severity, shown in `danger`, and always sit at the top of the inbox. |
| **Out-of-range is amber, not red** | `attention` for low/high values. `danger` only for *critical* values, errors, and escalation actions. |
| **Advisory AI** | Decision support labels its source and what it cannot do, and says when it declines to guess. It never takes an action. |
| **Commerce firewall (Rule L)** | "Orders and purchases — never exposed to clinicians" is a permanent locked row. Referrals show "0 commission taken". |
| **Honest numbers** | The design pictures use example figures. **The app shows only figures an endpoint returns.** Where an endpoint doesn't exist, that part of the screen shows an honest empty or "not available yet" state. |
| **Logged access** | "Your access is logged" appears with a link to the doctor's own access log. |

### The one idea behind every doctor screen

**The screen explains itself.** Every doctor screen ends with a footnote that says
why it works the way it does:

- "Removing a slot never cancels a booking already in it."
- "Blocked drugs stay visible with the reason. Hiding them teaches nothing and invites a workaround."
- "The fourth row matters most: when the input is too thin, it says so instead of producing a plausible differential."

The doctor is treated as a colleague who is owed the reasoning, not as a user to steer.
Our copy keeps these footnotes word for word. They are part of the design, not decoration.

### Visual language

- **Shell:** 236 px dark sidebar (brand mark, "CLINICIAN" label, 4 groups: Clinical · Orders · Patients · Practice, count badges, doctor + NMC number pinned at the bottom) + a 64 px white top bar (context title or back link, search, "2FA on" pill, notifications, doctor chip).
- **Type:** Plus Jakarta Sans 500/700/800. Page title 25–30 px / 800 / tight tracking. Eyebrows 10–11.5 px / 800 / uppercase / 1.1–1.3 px tracking. IBM Plex Mono for times, values, IDs and reference codes. Georgia italic only for "Kare" in the wordmark.
- **Surfaces:** canvas → white cards (radius 20, 1 px `rule-soft` border) → `surface-3` info panels ("What you cannot see") → one dark navy hero per screen at most (Today's "Next consult").
- **Numbers:** tabular figures, weight 800, coloured only by meaning: `positive` (good), `attention` (watch), `danger` (act now), `text` (neutral). Clinical values use mono.
- **Status pills:** pill radius, 9.5–10.5 px / 800 text on a soft background: positive (Open, Shared, Paid, On track), attention (Awaiting, Due, Camp duty), danger (Urgent, Blocked, Chase, Refused), action/info (Full, On campus, Programme), neutral (Not offered, Ended, Student choosing).
- **Colour meanings:** indigo = action and privacy · green = verified, granted, in order · amber = caution, out of range, waiting · red = critical, destructive, blocked. Red never marks an ordinary out-of-range lab value.

### Motion (from the design system's "Motion & interaction" page)

| Movement | Spec | Meaning |
|---|---|---|
| Rise | 14–16 px, 500 ms, `(.2,.7,.3,1)`, 50–70 ms stagger, max 8 items | Content arriving on a screen |
| Fade | 400 ms linear | Chrome and headers that are "already there" |
| Sheet / drawer | 420 ms `(.2,.8,.3,1)`, scrim fades 300 ms | A decision that keeps its context (Critical results, Add a drug) |
| Filter re-deal | 450 ms, 40 ms stagger | Inbox filter chips, tabs changing a list |
| Tab switch | 300 ms fade, **no sliding** | Tabs are siblings, not a sequence |
| Destructive confirm | **no animation** | "Send to emergency", "End call", revoke |
| Pulse | Live dots only | "Accepting consults", "LIVE", "1 urgent" |

- **Loaders are chosen by how long and how certain the wait is:** a spinner inside a button (under 2 s), an indeterminate bar for route changes, and a skeleton matching the real layout for lists. Thinking dots are for Ayush only.
- **Focus:** 3 px ring, 3 px offset, on `:focus-visible` only. Press feedback is a 1 px drop.
- **Reduced motion:** every animation jumps to its end state and loops stop. Nothing may exist only as an animation.
- **Health values never bounce.** Icons may move; numbers don't.

### States (from the design system's "Full-screen states" page)

Every state names **what happened, what it means, and what to do next.** No state is a dead end.

- **Loading:** a skeleton shaped like the real layout (header bar, stat row, rows).
- **Empty:** a 3D illustration, a one-line title in plain words, one sentence, and **one** next step. Example: "No one in your queue right now." → "Open your schedule".
- **Error:** a calm card. It says whose side the problem is on ("This is on our side, not yours — nothing was lost"), offers Try again plus Status & help, and ends with a mono reference (`Ref ERR-503 · ClinicianConsole`).
- **Confirm dialogs:** a round icon badge (amber = caution, red = destructive, indigo = privacy), a title that asks a direct question naming the thing, one or two lines of body, the safe choice on the left (outlined) and the action on the right (filled). Labels say what the button does ("Keep booking" / "Cancel booking"), never "Yes / No". While the action runs, the button spins and Esc and the backdrop are disabled.
- **No celebration** on any doctor screen. Success moments with confetti are for commerce only, and nothing about a body is ever celebrated.

### Icons and illustrations

- 24 px line icons, 1.9–2 px stroke, round caps. In navigation, tables and buttons they are flat, 15–20 px, and use `currentColor`. `lucide-react` is already a dependency and matches this style.
- 3D glossy icons appear only at 48–140 px, as empty-state heroes (for example the stethoscope tile). They are drawn in code. **They are not in the repo yet.**
- Flat people illustrations and 3D objects are never mixed in one panel.

### Where the design and our rules disagree, and which wins

| In the pictures | What we do | Why |
|---|---|---|
| Example figures (₹6,806 due, 5.2 hrs median, Potassium 6.8) | Real endpoint data, or an honest "not available yet" state | AGENTS.md: no invented numbers, including clinical ones |
| "PREVIEW Data / Loading / Empty / Error" switcher | Not shipped. Used only in Storybook stories | It is a canvas review tool |
| Raw hex values, 9/11/15/18 px radii | Tokens; radii snapped to the 8/12/14/20 scale | DESIGN.md §3 |
| Sidebar links 31 px tall, chips ~30 px | Visual size kept; hit area padded to 44 px | Guardrail 7 |

---

## 2. Components the doctor screens need

**Reuse:** `ConfirmDialog` (`src/components/interface/`), `useApiResource`, the `DataState` pattern.
**Not reusable as-is:** `Button` / `Badge` / `Card` in `src/components/` are React Native primitives on the older "Impilo" palette (`useTheme`). The doctor console is web-only and must use `--sk-*` tokens, so these get new variants or are wrapped in `src/design-system/`. They are not duplicated.

| # | Component | Used on | States to build |
|---|---|---|---|
| C1 | `ClinicianShell` (sidebar + top bar + content slot) | all 17 console screens | current page, count badges, back-link variant, phone width (drawer) |
| C2 | `SideNavItem` + `NavGroupLabel` + `CountBadge` | shell | default, hover, focus, current |
| C3 | `TopBar` (search, 2FA pill, notification button, doctor chip) | Today, Inbox, Consult room | — |
| C4 | `PageHeader` (eyebrow?, title, subtitle, right slot) | all | with status pill / with button / with segmented tabs |
| C5 | `StatusPill` (tone: positive, attention, danger, action, neutral; optional live dot) | all | 5 tones × dot/no dot |
| C6 | `StatTile` + `StatRow` (value in tone, label, optional meta) | 11 screens | tones, loading |
| C7 | `DataTable` (column spec, header eyebrow, row, muted "lapsed" row, footnote) | Patients, Earnings, Lab orders, Referrals, Renewals, Chronic, AYUSH, AI, Schedule, Critical | data, loading, empty, error, row action |
| C8 | `Card` / `SectionCard` (web, token-based) | all | default, selected, with action |
| C9 | `Note` (info / positive / attention / danger) | Consult room, Prescribe, Today, Console | 4 tones |
| C10 | `Button` web variants: primary, secondary (outline), soft, danger, ghost, pill | all | default, hover, focus, busy, disabled |
| C11 | `SegmentedTabs` / `FilterChips` with counts | Inbox, Report reviews, Consult room | selected, focus |
| C12 | `Drawer` (right side sheet, scrim, `aria-modal`, focus trap, Esc) | Critical results, Prescribe | open, busy, done |
| C13 | `Avatar` (initials; brand / muted) | Console, Today, Inbox | — |
| C14 | `ClinicalValue` (mono value + unit + ref, tone by range) | Inbox, Critical results | normal, out-of-range, critical |
| C15 | `Timeline` (dot tone, title, tag, meta, date; "consent window begins" end marker) | Encounter note | — |
| C16 | `StateView`: `Skeleton`, `EmptyState` (illustration, title, one next step), `ErrorState` (calm copy, retry, "Ref ERR-… · Screen") | all | per screen copy from source |
| C17 | Form: `TextField`, `ChoiceChips`, `UploadField`, `Stepper` (step n of m) | Doctor apply (web + phone) | empty, filled, invalid, disabled, locked continue |

Components are created **only when the screen being built needs them.** They are not built all up front.

### Token gaps (must be fixed in `design/tokens/studentkare.tokens.json`, never hard-coded)

The design uses colours that have no token yet:

| Design value | Used for | Proposed role |
|---|---|---|
| `#283044` | sidebar background | `nav-bg` |
| `#C3C0FF` | sidebar link text | `nav-text` |
| `#A9A5E0` | sidebar group label | `nav-label` |
| `#4F46E5` | current nav item | reuse `focus`, or add `nav-current` |
| `#ECEEF8` / `#F7F8FD` | skeleton shimmer | `skeleton`, `skeleton-hi` |
| `#FFE4E6`, `#FECDD3`, `#F3D3D2` | danger pill fill, danger borders | `danger-soft`, `danger-rule` |
| `#F2F3F9`, `#777587` | neutral pill fill, locked row text | `neutral-bg`, `text-disabled` (contrast checked) |

Radii of 9/11/15/18 in the markup get snapped to the token scale (8/12/14/20). Each new pair goes through the existing WCAG AA token test.

---

## 3. Screens: order, data, and gaps

The "Endpoint" column lists what exists in `backend/services/`. **"None"** means that part of the screen gets an honest "not available yet" state until the backend exists. No placeholder numbers are shown.

| Step | Screen | Tier | Endpoint(s) found | Gap |
|---|---|---|---|---|
| 1 | **ClinicianToday** (home) + shell | 2 | `/work/appointments`, `/work/critical-results`, `/work/report-reviews`, `/work/followups` | "Verified at check-in", camp duty, renewals count, shared-records count |
| 2 | ClinicianConsole (Queue) | 2 | `/work/appointments` | per-patient consent scope/expiry for clinicians — not verified |
| 3 | ClinicianInbox | 3 | critical results + report reviews + follow-ups | student messages, referral replies |
| 4 | ClinicalReview (critical results + drawer) | 3* | `/work/critical-results`, `/lab-orders/{id}/acknowledge-critical` | "route to campus clinic", follow-up task creation |
| 5 | ClinicianLabOrder | 2 | `/work/lab-orders` | — |
| 6 | ClinicianSchedule | 3 | `/work/appointments`, `/appointments/availability` | "Add availability" (no write endpoint) |
| 7 | ClinicianEarnings | 3 | `/work/earnings` | commission rate, settlement, statement download (already documented as absent) |
| 8 | ClinicianChronic | 3 | `/work/chronic` | — |
| 9 | EncounterNote | 3* | `/encounters` POST/PATCH, `/encounters/{id}/finalize` | timeline source |
| 10 | ClinicianConsultRoom | 3* | `/consultation/{id}/state`, `/join-provider`, `/signal` | shared-records list for the consult |
| 11 | ClinicianPatients | 3 | none verified | clinician-side consent list |
| 12 | ClinicianRenewals | 3 | none | refill-request queue |
| 13 | ClinicianReferral | 3 | none | referrals |
| 14 | ClinicianAyush | 3 | none | AYUSH desk |
| 15 | ClinicianAi (decision support) | 3 | none — must use M18's separate service and the AI constitution module | whole feed |
| 16 | WebClinicianApply + ClinicianApply | 3 | none | doctor onboarding endpoints |
| 17 | **ReportReviews** | **1** | `/work/report-reviews` | — |
| 18 | **Prescribe** | **1** | `/prescriptions` POST | allergy / drug-class check source |

\* The index marks these Tier 3, but they show clinical values or act on them. Under DESIGN.md §5 ("anything showing a clinical value") they should be treated as **Tier 1**. This needs confirming.

**Tier 1 screens (ReportReviews, Prescribe) are built only after a named design reviewer *and* clinical sign-off are recorded** (DESIGN.md §5, §8.5).

### Where the code goes

`src/features/clinician/` becomes the home for these screens: views + a viewmodel per screen + data via the repository, as in the existing feature. The existing `src/screens/clinician/*` screens and `ClinicianWorkspaceHub` (a tab strip) are replaced one at a time, as each new screen lands. Each replacement keeps that screen's existing honest-data behaviour and tests. Routes stay role-gated to `NMC_DOCTOR` through `src/features/health/module.ts`.

### Definition of done, per screen (from DESIGN.md §6)

- Matches the picture: layout, copy, hierarchy.
- Tokens and components only; no hex values.
- Data, loading, empty and error states, using the copy from the source file.
- Works at 1440 px and 390 px, with no horizontal scroll.
- Role + label on every control, ≥ 44 px targets, visible focus, drawer focus trap, reduced motion.
- Viewmodel tests pass. `tsc`, lint and `tokens:check` pass.
- PR notes list every place the screen differs from the picture, and why.
