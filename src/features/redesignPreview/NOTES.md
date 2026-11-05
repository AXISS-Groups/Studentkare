# Redesign preview — "Student Kare — 1mg-inspired screens"

Source: https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2 (Claude Design canvas, 4 artboards).

Per Krishna's instructions (2026-11-05): all 4 screens, **flat/static design only**,
**alongside** the real screens (nothing existing touched or replaced), **both
web and native** (this codebase draws M2 screens as React Native primitives
via react-native-web, so one component serves both — no separate web/native
files were needed), **not pushed** — for review before any of this is coded
for real (wiring, navigation, data).

Storybook: `Redesign preview (for review)/1mg-inspired screens` —
`npm run storybook`.

## What each screen is, and what it is not

| Canvas file | Preview component | Paired with (existing, untouched) | Match? |
|---|---|---|---|
| `Main.dc.html` | `M2HomePreview.tsx` | `M2Home` (`src/features/m2store/views/M2HomeView.tsx`) | Redesign of an existing screen |
| `MedicineInfo.dc.html` | `M2MedicineInfoPreview.tsx` | `M2MedicineInfo` (Tier 1, `docs/plans/tier1-medicine-info-2026-10-22.md`) | **Different interaction model** — see below |
| `LabCompare.dc.html` | `LabComparePreview.tsx` | `M2Labs` (`src/features/m2store/views/M2LabsView.tsx`) | Same feature, different layout — see below |
| `LabPrep.dc.html` | `LabPrepPreview.tsx` | *(none)* | **No existing screen matches this one** — see below |

### Medicine info: a different screen than it looks

The real `M2MedicineInfo` is Tier 1 (clinical content, plan approved
2026-10-22) and its whole shape is a search → photo-or-text match → confirm →
single reviewed medicine flow (`design/screens/briefs/M2MedicineInfo.md`).
The canvas instead draws a tabbed single-medicine detail page (Uses /
Benefits / Side effects / Safety advice / FAQs) — a different navigation
model, not a restyle of the existing one. This preview builds *that* tabbed
layout as its own thing; it does not touch or replace the real search flow.
If this direction is wanted for real, it needs its own look at how (or
whether) it replaces the existing flow, under the same Tier-1 process.

### Lab compare: already shipped, just not full-screen

`M2Labs`' design log (2026-11-04) already shipped a "Comparing 2 packages"
table inline, between the package list and "How collection works" — check
`design/screens/briefs/M2Labs.md`. The canvas's `LabCompare.dc.html` is the
same comparison, as its own full screen instead of an inline section. This
preview is that full-screen take, built with the same `M2Table` the real
inline version could use — it is not a new capability.

### Lab prep: no existing screen to pair it with

The only brief with "Lab" + "Collection" in its name is `LabCollection.md` —
but that is the Tier 1 **partner/staff web run sheet**
(`src/screens/vendor/LabCollectionScreen.tsx`, 1440×1024, lab staff
scanning/dispensing), not a student-facing screen. It has nothing to do with
a student looking at a test's prep instructions. There is no existing
student-facing "test detail + before your sample" screen (checked
`M2Labs`, `LabPackages`, `ResultLabBooked` — none of them are it). This
preview is therefore new ground, placed near `M2Labs`/`LabPackages`'
booking domain by convention only. If this direction is wanted for real, it
needs its own brief and ticket before it's a redesign of anything.

## Icon substitutions

The canvas draws every icon as raw inline `<svg>` (expected — canvases are
reference only, per `CLAUDE.md`). Every shape was matched to a real manifest
icon (`design/icons/icon-manifest.json`); nothing was invented. Where a shape
didn't have an obvious 1:1 name, the already-approved icon list for the
screen it redesigns was preferred over guessing from the raw path:

- Notification bell → `bell`
- Search → `search`
- "For you" tab icon (overlapping capsule shape) → `pill-3` (same shape the
  Medicines tile also uses in the canvas, so both use `pill-3` here)
- Sample-collection tube / lab tests → `lab` (already on `M2Home`'s approved
  icon list, not `flask`, to match the existing screen's vocabulary)
- Doctors tile (the canvas drew a plain cross-in-a-box) → `stethoscope`
- Vaccines → `syringe`, Camps → `calendar-2`, Insurance → `shield-check`,
  Refills → `refresh`, Find care → `map-pin-2` (all already on an existing
  M2 screen's approved list)
- Bottom nav icons and the service-tab rail are not hand-drawn at all: both
  reuse the real `PillNav` and `ServiceRail` components, so their icons are
  whatever those components already ship (`home`, `box`, `ayush-spark`,
  `heart-3`, `user-5`) rather than a fresh guess from the canvas's own nav
  icons (cart/message-bubble/zig-zag/person), which would have duplicated
  existing, approved choices with slightly different ones.
- Verified (shield-check), close (`x`), check / minus (included / not
  included in the compare table) → `shield-check`, `x`, `check`, `minus`
- Back chevron → `arrow-left` (the M2 convention; see `M2Header`'s own note
  that boards draw `arrow-left`, not `chevron-left`)
- Numbered circles (prep steps 1–4) are not icons — they're text badges, like
  the canvas drew them.

No icon used anywhere in these 4 files is missing from
`design/icons/icon-manifest.json` — checked against the generated icon data
(`src/design-system/icons/generated/skIconData.ts`) directly, file by file.

## Part 2 (2026-11-05): the rest of Home's grid

Krishna then asked to extend the same visual language to the other
destinations the new Home grid links to — there is no canvas mockup for
these; the canvas only ever had the 4 screens above. Each of the 8 below is
built from its own **real, already-shipped brief** (not the canvas), so
unlike Part 1 these use the screen's actual described content and states
rather than `[bracketed]` placeholders, except where a value is genuinely
the student's own data (then it stays bracketed, same reasoning as Part 1).

| Preview component | Real screen | Tier | What's shown |
|---|---|---|---|
| `M2ConsultsPreview.tsx` | `M2Consults` | 2 (the counsellor/Tele-MANAS note is Tier 1) | Concern chips, the Tier-1 safety note, two sample doctor cards |
| `M2VaccinesPreview.tsx` | `M2Vaccines` | **1** ("Your vaccine record") + 2 (booking) | One placeholder record row (labelled as such — never an invented real dose), vaccine picker, booking card |
| `M2InsurancePreview.tsx` | `M2Insurance` | 2 | Current policy card, "More cover" grid — "Notify me" only, per the real brief's 2026-11-04 note that no partner is chosen yet |
| `M2OrdersPreview.tsx` | `M2Orders` | 2 | Active tab + the brief's own 3 Past-tab examples verbatim |
| `M2CampsPreview.tsx` | `M2Camps` | 2 (pass/check-in/results/drives are Tier 1, not drawn here) | A booking card, two upcoming camps, the privacy note |
| `M2RefillsPreview.tsx` | `M2Refills` | 2 (explicitly: a count, never dosing advice) | One tracked medicine, the "we only count" note, Track a refill |
| `M2FindCarePreview.tsx` | `M2FindCare` | 2 (the 112/108 strip and campus SOS link are Tier 1) | The pinned emergency strip, care-type tabs, two sample listings |
| `M2ProfilePreview.tsx` | `M2Profile` | **1** (whole screen: identity, vitals, emergency card, consent) | Every value is a `[bracketed]` placeholder for exactly that reason; consent switches shown off/disabled, never defaulted to a state nobody chose |

**Tier 1 is why `M2VaccinesPreview` and `M2ProfilePreview` lean so heavily on
placeholders** — per `AGENTS.md`/`CLAUDE.md`, a Tier-1 screen (safety,
consent, identity, clinical values) needs a written plan and a named
reviewer's sign-off before code, same as `M2MedicineInfoPreview` in Part 1.
These are flat visual previews only, built on that same understanding — not
a claim that Tier-1 sign-off has happened. If any of the 8 is wanted for
real, the Tier-1 ones need that process first; the Tier-2 ones still need
their own brief/screenshot/source read (already done here) plus
`design/screens/implementation-map.json` entries before
`check-icons.mjs` has anything to check against.

Icon choices for Part 2 came from each screen's own approved icon list in
its brief, not fresh guesses — every name listed there was checked against
`src/design-system/icons/generated/skIconData.ts` and confirmed present (33
distinct icon names used across the 8 files, zero missing).

## Part 3 (2026-11-05): the rest of the M2 student screens, plus 2 net-new concepts

Krishna then asked to (a) cover the remaining M2 student screens not yet
previewed, and (b) invent 2–3 net-new screens with no existing brief at
all — same spirit as the canvas's own `LabPrep`. 13 more briefed screens
and 2 net-new concepts were added; still flat, non-functional, same
component kit, same tokens, same icon-manifest discipline.

| Preview component | Real screen | Tier | What's shown |
|---|---|---|---|
| `M2LabsPreview.tsx` | `M2Labs` (package list) | 2 | Audience tabs, 3 package cards with fasting chip + Compare (opens `LabComparePreview`'s table) |
| `M2AskAyushPreview.tsx` | `M2AskAyush` | **1** | Consent note, latest-report card, a sample Q&A exchange ending in "a doctor will guide you" (the brief's own AI-split guardrail, kept as written content) |
| `M2FacilityDetailPreview.tsx` | `M2FacilityDetail` | 2 | Type tile, chips, Call/Directions, address/hours/departments/checked card, 112/108 strip — no beds, ratings or "open now" (brief's honest-data rule) |
| `M2InsightsPreview.tsx` | `M2Insights` | **1** | Today cards, "Needs a look" report card, doctor's note, "Due from your care," the named Rule L exception rail ("Recommended for your HDL result"), untested-system cards, steps card |
| `M2MedicinesPreview.tsx` | `M2Medicines` | 2 | Rx order card, Rule-L-safe refills link (no personal data), categories grid, a deal card |
| `M2ProductPreview.tsx` | `M2Product` | **1** | Quantity stepper, "Often added with this" plain cross-sell (brief is explicit this is not a Rule L exception), 3 accordion sections |
| `M2RemindersPreview.tsx` | `M2Reminders` | **1** | One medicine's dose count, Taken/Skip, reminder chips, water-reminders link — no streak or score (brief's rule, kept) |
| `M2ReorderPreview.tsx` | `M2Reorder` | 2 | Price-checked-at note, an in-stock line and a needs-prescription line (no alternative swapped in), delivery/pay card, total + Pay |
| `M2ReportUploadPreview.tsx` | `M2ReportUpload` | **1** | The new "Kind" step's 4 document tiles, carrying the brief's own "Design concept, not yet built this way" banner verbatim — the real app has no document reader at all, by deliberate Tier-1 decision, so this preview does not imply otherwise |
| `M2StepsPreview.tsx` | `M2Steps` | 2 | Hero number + source chip, week bars (empty dashed track for no-data days, never a zero bar), source rows, no goals/streaks (brief's rule) |
| `M2TrendsPreview.tsx` | `M2Trends` | **1** | Graph/Table tabs, range badge, doctor's 3 steps, the same named Rule L exception rail as `M2Insights` ("Recommended for this result") |
| `M2WaterPreview.tsx` | `M2Water` | 2 | Hero + glass/undo, today's entries, goal row, week bars (same no-zero-bar rule), no streak/medal/comparison (brief's rule) |
| `M2WhatsNewPreview.tsx` | `M2WhatsNew` | 3 | Two sample post cards, "All StudentKare news" link — editorial only, nothing about the student (Rule L) |

**Net-new concepts (no existing brief or screen at all):**

| Preview component | What it is | Why it's here |
|---|---|---|
| `DoctorComparePreview.tsx` | Comparing two doctors before booking, using the same `M2Table` as `LabComparePreview` | Extends the canvas's own compare pattern (lab packages) to consults, the way Tata 1mg-style apps do for either. **No brief or ticket exists for this** — same caution as the canvas's own `LabPrep`: if wanted for real, it needs its own brief and ticket first. |
| `ReferFriendPreview.tsx` | A plain "invite a friend" screen: a share link, a placeholder thank-you line, Share button | A common pattern this canvas and the briefs don't cover. Deliberately Tier 3 / promotional only — no personal health data, no clinical content, no real reward amount (bracketed). **No brief or ticket exists for this** — same caution as above. |

Icon choices for Part 3 came from each screen's own approved icon list in
its brief (all already in the manifest — the briefs for this batch
confirm "None [missing icons]" line by line); the 2 net-new screens reused
icons already on other approved screens' lists (`check`, `minus`, `copy`,
`share`, `heart-3`) rather than inventing anything. A full project-wide
icon-name sweep across all 27 files in this folder (not just this batch)
confirms every icon name resolves in `skIconData.ts` — 74 distinct names,
zero missing.

## Part 4 (2026-11-06): starting the Web (signed-in student web) screens

Krishna then asked for all 271 screen briefs in the repo. That's 248 beyond
the 23 M2 screens already covered. Two things worth recording here since
they shape how this part proceeds:

1. **Scale** — 248 screens is a multi-session effort, not one batch. This
   part covers the first 6 of the 45 `Web*` briefs; the rest of `Web*`,
   the ~90 other shared/student briefs (`Lab*`, `Search*`, `Onboarding*`,
   `Ayush*`, etc.), and the 82 internal-console briefs (`Campus*`,
   `Admin*`, `Clinician*`, `Vendor*`, `Partner*`, `Super*`) are tracked as
   separate, not-yet-started batches.
2. **Design fit** — the 82 internal-console briefs are staff tools (data
   tables, approval queues, compliance workflows), not a shopping app.
   Applying the flat 1mg consumer style to them wasn't assumed; Krishna's
   been asked to confirm before any of those are built this way.

| Preview component | Real screen | Tier | What's shown |
|---|---|---|---|
| `WebDashboardPreview.tsx` | `WebDashboard` | 2 | Welcome header, 3 stat cards, vault/emergency-card cards, a "signed in on this device" note |
| `WebShopPreview.tsx` | `WebShop` | 2 | Search, category row, 3 product cards with price/MRP and Add |
| `WebProductPreview.tsx` | `WebProduct` | 2 | Product detail with verified/delivery/returns badges, price + Add to cart, 3 accordion sections |
| `WebCheckoutPreview.tsx` | `WebCheckout` | 2 | Delivery/payment/line-item card, encryption/no-ad-sharing trust row, order summary + Place order |
| `WebOrdersPreview.tsx` | `WebOrders` | 2 | The brief's own 3 sample orders (same data `M2OrdersPreview` uses) |
| `WebReorderPreview.tsx` | `WebReorder` | 2 | Reorder card + a private (not public-review) rating row, per the brief's own "ratings are private" framing |

All 6 are wrapped in the **real** `StudentWebShell` component
(`WebShellPreview.tsx`, a thin shared wrapper around it) rather than a
hand-drawn header/sidebar — same principle as reusing `PillNav` on the
phone screens. Full-length marketing content (illustrations, footer bands,
brand-logo social row) from the original briefs' public-site pages is out
of scope for these signed-in app screens; they don't carry a public
footer in the first place (that's `PublicSitePage`, used for the public
pages like `WebConsult`/`WebLabList`/`WebHome` signed-out — not yet built).

## Part 5 (2026-11-06): QA pass — gradients, text overlap, illustrations

Krishna asked for two things: (1) check all built screens for gradient
button rendering issues and text overlapping on cards, (2) add the vector
illustration graphics the briefs call for, which had been skipped.

**Gradient/overlap audit.** Grepped all of `src/features/redesignPreview/`
for raw gradient usage — none found; every gradient visible in the
screenshots (e.g. `M2HeroPanel` hero backgrounds on Consults/Camps/
FindCare) is the real, already-shipped component's own correct behavior,
not something built here. Screenshotted and visually reviewed 11 screens
at their real render sizes (8 phone: Consults, Camps, Product, Reorder,
FindCare, Orders, Insights, FacilityDetail; 3 web: WebProduct, WebCheckout,
WebReorder) — no text overlap, no broken gradients, no clipped content in
any of them. No fixes were needed.

**Illustrations.** Checked every built screen's brief for a "Pictures /
illustrations" section — only `WebReorder.md` lists any
(`illustration-confused-buyer`, `illustration-hostel-pin`,
`illustration-lock-shield`, `illustration-rupee-receipt`,
`illustration-verified-badge`); every other screen's brief says
"Illustrations (0)" or has no such section. Added all 5 to
`WebReorderPreview.tsx` via the real `<Illustration name="..." />`
component: a 3-up trust strip (verified-badge / lock-shield /
rupee-receipt) under the rating note, hostel-pin on the delivery-address
card, and confused-buyer on a new "Not sure what to reorder? Ask Ayush"
card. Re-ran `tsc --noEmit` (clean) and re-screenshotted — all 5 render as
real multi-color gradient-filled vector art with no overlap.

## Part 6 (2026-11-05): video reference — order-card thumbnails, Care circle, honest insurance info

Krishna shared two screen recordings (Tata 1mg's own app, and Blinkit) and
asked for a "family hub" and missing illustrations for family/diabetes/
insurance, plus the delivery/order card pattern with scrolling item
thumbnails.

**What the videos actually showed, and what was built from them:**

- **Order card item-thumbnail row.** Blinkit's Order History screen shows
  a row of item thumbnails above "Reorder" / "Rate order" on each past
  order. Added the same pattern to `M2OrdersPreview.tsx` (both the active
  order and all 3 past orders) and `WebOrdersPreview.tsx` — a small
  `<Icon>` tile per line item (no product photography exists in this
  system, so icons stand in for photos: pill/droplet/capsule/flask/
  med-bottle, picked per item).
- **"Family hub."** 1mg's video shows an avatar-switcher letting one
  account see another member's full record — that model conflicts with
  this product's 18+-only, student-owned-record architecture (AGENTS.md
  rule 8: any flow that could admit a minor must fail closed; a
  family-managed profile is exactly that shape). StudentKare already has
  its own, very different answer to "family": `FamilyCircle` ("Care
  circle", Tier 1, `design/screens/briefs/FamilyCircle.md`) — a guardian
  who pays sees a short, named list of what they're shown, every switch is
  the student's own to flip, and "paying does not buy access." Built
  `M2FamilyCirclePreview.tsx` from that real brief/screenshot/HTML source
  instead of the video. Like every other Tier-1 preview this session, it
  hasn't been through the named-reviewer sign-off CLAUDE.md requires
  before real code.
- **Insurance "diabetes cover" / plan-details treatment.** 1mg's Insurance
  tab uses numbered "choose plan → get your policy" onboarding steps and a
  real stock photo hero. The photo isn't reproducible or appropriate here
  (this design system has no photography component at all — Icon/Icon3d/
  Glyph/Illustration/BrandLogo only), and the numbered purchase-funnel
  stepper directly conflicts with `M2Insurance.md`'s own founder note
  (2026-11-04): "no invented live purchase flow" since no partner is
  chosen yet. Built a toned-down "What's usually included" icon-row
  section instead — generic, non-numeric descriptions (no invented
  policy figures), no purchase funnel — added to `M2InsurancePreview.tsx`
  above the existing "More cover" grid.
- **No new illustration assets were created.** Checked the full 39-entry
  illustration catalog (`design/icons/icon-manifest.json`) — there is no
  family/diabetes/insurance-themed illustration, and per CLAUDE.md ("never
  invent an icon... don't substitute a look-alike") none was invented.
  Everything above uses existing `<Icon>`/`<Switch>`/`<M2Note>` components.

## Part 7 (2026-11-06): plain brand footer, Devices, Teleconsult

Continuing from Part 6's video reference, Krishna asked for (1) the
StudentKare logo somewhere near the bottom of screens, after noticing 1mg's
wordmark placement in its footer area, and (2) two more screens spotted in
the video: a "select your wearable" connected-devices pattern and an
incoming-call consult screen, plus confirmation that illustrations had
already been added (Part 5/6 cover that; nothing new was missing here).

- **`BrandFooter.tsx`** — a new shared component: `<BrandLogo size={18} />`
  + "Student Kare" text, nothing else. 1mg's own footer in the video pairs
  its wordmark with a colourful rotating ad banner ("Adding some sunshine to
  your life" + coupons) — `AGENTS.md` rule 4 is "No advertising. No
  gamification," so that part was deliberately left out. This is a plain
  mark, the same way a copyright line sits at a page's end — no tagline, no
  promo copy, no coupon. Added to the bottom of all 6 `Web*Preview.tsx`
  files (`WebDashboard`, `WebShop`, `WebProduct`, `WebCheckout`,
  `WebOrders`, `WebReorder`), right before each screen's closing content.
  Not added to the phone (`M2*`) previews — 1mg's footer pattern is a
  page-level, web-site convention; the real `PillNav` already occupies that
  position on phone screens.
- **`DevicesPreview.tsx`** — built from the real
  `design/screens/briefs/Devices.md` ("Devices & readings", Tier 1), not
  invented from the video. The video's "select your wearable" pairing
  screen doesn't fit this product (StudentKare has no wearable-pairing
  flow of its own yet); the brief's actual content — honest
  reading-provenance ("we no longer take readings with your phone camera,"
  every reading says which device or person it came from) — covers the
  same "connected sources" idea without inventing anything. Connected
  Health Connect/BP-cuff/glucometer toggles, 3 sample readings each tagged
  with its real source, the brief's own privacy footnote.
- **`TeleconsultPreview.tsx`** — built from the real
  `design/screens/briefs/Teleconsult.md` (Tier 1), matching the video's
  incoming/live-call pattern far more directly: dark full-screen call UI,
  floating self-view tile, doctor identity + NMC-verified badge, a
  "shared for this consult" card naming exactly which 2 reports are visible
  and the brief's own access-ends-with-the-call note, call controls with a
  red end-call button (same `dangerFill`/`onDangerFill` pattern as
  `M2SosButton`), and "End and see the visit note." Static only — no live
  call, no running timer, no waveform animation.
- Both are Tier 1 and have **not** been through the named-reviewer
  sign-off `CLAUDE.md` requires before real code — same preview-only
  caveat as every other Tier-1 screen in this project.
- Wired into `RedesignPreview.stories.tsx` (`Devices`, `Teleconsult`
  stories + `AllScreens`). `tsc --noEmit` clean across the repo;
  `check-icons.mjs --screen Devices/Teleconsult` both pass. Screenshot-
  verified via Storybook: both new screens render correctly, and
  `WebDashboard`/`WebCheckout` show the footer rendering as a plain logo +
  name with no ad styling.
- No new illustration assets were needed or created this round.

## Part 8 (2026-11-06): illustration-coverage sweep — checking whether more screens are actually unbuilt

Krishna asked to check whether other screens (across "different dashboards")
still need building, in the context of the illustration/vector work. Rather
than guess, every illustration-tagged screen in `design/icons/icon-manifest.json`
was cross-checked against the real, shipped app — not just this preview
folder — before building anything.

**Result: almost none of them were actually unbuilt.** 26 of the 27
illustration-carrying screens that looked like gaps (because no
`*Preview.tsx` existed for them) turned out to already be real, shipped,
functional screens elsewhere in the codebase:

- All 11 public marketing pages (`Landing`, `LandingCampus`,
  `LandingClinician`, `WebPartnerships`, `WebWellness`, `WebConsult`,
  `WebLabList`, `WebLabTests`, `WebPrograms`, `SplashPulse`,
  `StatusMoments`) — real views under `src/features/landing/`,
  `src/features/auth/views/SplashView.tsx`, and the shared
  `src/design-system/ResultMoment.tsx`/`Moments.tsx`. `IllustrationLibrary`
  is a dev-only illustration-catalog reference page, correctly skipped.
- All 4 result/confirmation screens (`PaymentResult`, `ResultCampBooked`,
  `ResultLabBooked`, `ResultRefund`) — real views under
  `src/features/camp/`, `src/features/labBooking/`, `src/features/requests/`,
  `src/features/payments/`, all driven by the shared `ResultMoment.tsx` and
  each confirmed to render its brief's illustration correctly.
- 5 of 6 "account & health" screens — `AccountDetails`
  (`AccountDetailsCard.tsx`/`AccountDetailsBoard.tsx`), `WebMyLabTests`
  (`WebMyLabTestsView.tsx`), `WebPlans` (`LandingPlansView.tsx`),
  `WebReportInsights` (`ReportInsightsView.tsx`), and `WebAccount` — which
  isn't a separate screen at all: per `docs/plans/tier1-parity-2026-10-24.md
  §11` it's deliberately `M2Profile` shown wide.
- 4 of 5 identity-verification screens — `ScanVerify`/`WebScanVerify`
  (shared `VerifyFlow.tsx`), `VerifyIdentity` (`IdentityVerifyPanel.tsx`).

**Two genuine findings came out of the sweep, not from building fake
previews but from reading the real shipped code:**

1. **`WebVerify` has a silent illustration gap, not a missing screen.**
   `src/features/auth/views/VerifyGateCard.tsx` renders `IdentityCheckRow`
   without ever passing its `art` prop, even though `IdentityCheckRow.tsx`
   already documents that prop as "the check's illustration, drawn beside
   the words on the wide board." Net effect: all 5 of `WebVerify.md`'s
   required illustrations (`illustration-face-oval-guide-4`,
   `illustration-email-verify`, `illustration-campus-verify`,
   `illustration-gov-id-verify`, `illustration-id-function`) are currently
   missing from the real, shipped screen. This is a small wiring fix in an
   existing file, not a new preview — flagging it here rather than
   "fixing" it myself, since `VerifyGateCard.tsx` is real, wired, shipped
   code, outside this preview-only folder's scope.
2. **`NewDevice` is genuinely unbuilt.** Confirmed by
   `src/features/auth/views/LostPhonePanel.tsx`'s own doc comment:
   *"'Got a new phone?' waits for NewDevice."* Its brief
   (`design/screens/briefs/NewDevice.md`, Tier 1) calls for
   `illustration-face-oval-guide-2`. Not built this round — reported, not
   previewed, since Krishna's last answer didn't yet confirm it as a
   priority the way `Devices`/`Teleconsult` were in Part 7.

**The one real gap that was built: `VitalTrendsPreview.tsx`.** Built from
the real `design/screens/briefs/VitalTrends.md` (Tier 1, SK-045) — nothing
else in `src/` references `VitalTrends` at all. 4 cards (resting heart
rate, SpO₂, blood pressure, sleep), each paired with its matching
`illustration-sparkline-bpm`/`-steady`/`-readings`/`-average` and the
brief's own MEASURED/MANUAL/ESTIMATE provenance labels. No streaks, scores,
or comparisons, per `AGENTS.md` rule 4.

**A real cross-cutting bug was found and fixed while verifying this
screenshot**, not invented for it: all 4 `illustration-sparkline-*` SVGs
(`design/illustrations/*.svg`) ship with a CSS line-draw animation keyed to
`@keyframes skDraw`, but that keyframe is defined only in
`src/features/landing/views/landing.css`. Outside the Landing page — like
`VitalTrends`, a student-app phone screen with nothing to do with
Landing — the animation never plays: `stroke-dashoffset` stays parked at
its initial value and only the small endpoint dot shows, with the whole
line invisible. Added the same keyframe to `.storybook/preview-head.html`
so it renders correctly in every Storybook story that uses one of these
illustrations, not just this one. **This same bug would hit production
too** if `VitalTrends` (or anything else using these 4 illustrations) is
ever built for real outside the Landing page — the real app's global CSS
needs this keyframe loaded somewhere other than `landing.css`, which is
flagged here as a finding for whoever picks up `VitalTrends` for real, not
fixed in app code from this preview-only task.

Typecheck (`tsc --noEmit`) is clean across the repo; `check-icons.mjs
--screen VitalTrends` passes. Screenshot-verified via Storybook+Playwright
after the keyframe fix — all 4 sparkline charts render correctly as actual
line shapes, not squished boxes or bare dots.

## What's deliberately not done yet (all four parts)

- Not wired into navigation, routing, or `studentPhoneBoards.tsx`.
- No real data. Part 1's `[bracketed]` placeholders are the canvas's own;
  Part 2 and 3's are this preview's own choice, for the Tier-1 fields
  specifically (and, for the 2 net-new screens, for anything that would
  otherwise invent a real reward amount or doctor identity).
- No `design/screens/implementation-map.json` entries for any of the 33
  previews — these aren't tickets yet, so `check-icons.mjs` has nothing to
  check against. That, a brief/screenshot/source trio for `LabPrep`,
  `DoctorCompare` and `ReferFriend` (none of which have one), and Tier-1
  sign-off for every Tier-1 screen's domain (`M2MedicineInfo`, `M2Vaccines`'
  record section, `M2Profile`, `M2AskAyush`, `M2Insights`, `M2Product`,
  `M2Reminders`, `M2ReportUpload`, `M2Trends`), is what "later we can code"
  would need.
- Nothing committed, pushed, or opened as a PR.
