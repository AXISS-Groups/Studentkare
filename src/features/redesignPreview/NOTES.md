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

## 2026-11-11 — `LabPackageDetailPreview.tsx`

Reviewed reference-app screen recordings (Apollo 24|7's lab-package detail
page) against this app and found a gap: a lab test "package" detail page
with a social-proof badge, an accordion of included tests/FAQ, a
doctor-recommendation card, a cross-sell banner and a star-rating feedback
moment — none of which currently exist together on one screen here.
`M2ProductPreview.tsx` covers single-item medicine detail and
`LabComparePreview.tsx`/`LabPrepPreview.tsx` cover comparison and
sample-collection prep; none of them is this page, and it has no
`design/screens/briefs/*` entry yet.

**Two genuinely new design-system primitives**, both added to
`src/design-system/` in this same pass:
- `Accordion` / `AccordionItem` (`src/design-system/Accordion.tsx`) — a real
  expand/collapse row, modelled on `M2ProductPreview.tsx`'s old static
  accordion rows (`What it is used for` / `Common side effects` / `Do not
  take with`), which never actually opened.
- `StarRating` (`src/design-system/StarRating.tsx`) — read-only (`value`
  only) for an average-rating display, or interactive (`value` +
  `onChange`) for a "rate your experience" moment. No shared component for
  either existed before.

**Everything else reused as-is:** `GradientHeroCard`, `M2Pill`, `M2Note`,
`M2Card`, `GlossTile`, `m2Text`, `heroStops` from `@/design-system/m2`;
`Icon` from `@/design-system/icons`; tokens only from
`@/design-system/theme`. Icons used: `flask-2`, `doctor-alt`, `doctor`,
`shield-check`, `percent`, `check-circle-2`, `cart`, `arrow-left`,
`chevron-down`/`chevron-up` (inside `Accordion`), `star`/`star-filled`
(inside `StarRating`) — all confirmed in
`design/icons/icon-manifest.json`; no trophy icon exists there, so the
"booked X times" social proof uses `shield-check` instead, as bracketed
placeholder copy (`[Booked 12,000+ times]`), not a literal counter claim,
per `AGENTS.md` rule 4 (commerce firewall — no gamification of body
metrics, no advertising dressed as fact). The doctor-recommendation card
also names no real clinician (`[Recommended by Dr. ...]`).

Per this repo's own convention, lab/report content is treated as Tier 1
(safety, consent, identity, clinical values) even on a commerce-adjacent
page — flat and non-wired here, but a plan-first, named-reviewer pass is
required before any of this is built for real, same caution as
`M2ProductPreview.tsx` and `M2MedicineInfoPreview.tsx`.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data — all `[bracketed]` copy is this preview's own placeholder choice, not
a real test list, price, rating count or doctor identity. No
`design/screens/briefs/LabPackageDetail.md` yet, so no
`check-icons.mjs --screen` run and no `design/screens/implementation-map.json`
entry — this isn't a ticket yet. `tsc --noEmit` is clean across the repo.
Added to `src/design-system/stories/RedesignPreview.stories.tsx` as
`LabPackageDetail` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `SecondOpinionPreview.tsx`

Krishna asked, as part of the same gap-analysis pass, to preview a
"surgery second opinion + cost estimator" flow seen in a reference app
(Apollo 24|7's Surgery section) — what this COULD look like if
StudentKare ever built one. **This caveat matters more than usual: a real
version of this is not a UI pattern to restyle, it is a new clinical
service line.** Surgical referrals and second-opinion review are a
category of clinical work this platform does not currently do. Before any
real engineering starts, this needs an explicit product +
clinical-governance decision covering, at minimum: who reviews a
submitted request (which clinician, what credentialing), what liability
and consent language a student must see before a request is even
accepted, and how the cost ranges shown would actually be sourced (which
hospitals, how current, who is accountable for them being right). That is
a heavier bar than the named-reviewer content check that gates an
ordinary Tier 1 screen in this repo, and this preview does not claim that
bar has been cleared.

No `design/screens/briefs/SecondOpinion.md` exists — same footing as
`LabPrep`, `DoctorCompare` and `ReferFriend`: a net-new concept with no
brief or ticket, previewed only because it was explicitly asked for.

**Built only from the approved pieces**, nothing invented:
`M2Card`, `M2Note`, `GlossTile`, `m2Text`, `RoundButton` from
`@/design-system/m2`; `StatusPill` from `@/design-system` for the
"pending review" status; `Icon` from `@/design-system/icons`, limited to
`doctor`, `doctor-alt`, `hospital`, `stethoscope`, `stethoscope-2`,
`shield-check`, `cloud-upload`, `doc-upload`, `check-circle-2`, `percent`
— all confirmed in `design/icons/icon-manifest.json`. No back-chevron icon
is used: the allowed icon list for this screen has no left-facing arrow
or chevron, and `CLAUDE.md` forbids both inventing a look-alike and using
a text arrow in its place, so the header simply has no back control here
rather than substitute one. Tokens only (`color`, `font`, `fontWeight`,
`radius`, `space`) — no hex values.

**What's on the screen:** an intro line, a textarea-styled `M2Card`
labelled "[Describe your diagnosis or planned procedure]" (static
placeholder text, not wired to state), an "[Upload existing reports
(optional)]" row matching `M2ReportUploadPreview.tsx`'s upload pattern, a
"[Submit for review]" button whose paired `M2Note` states plainly that a
human clinician reviews every request — never an instant AI-generated
opinion — a separate "[Estimate surgery cost]" section with 3 `M2Card`s
each showing a placeholder procedure name and a bracketed cost **range**
(never a single bindable number) under an `M2Note` (tone="info") stating
the ranges are illustrative only, not a quote, and vary by hospital/
surgeon/complexity, and a status section with a `StatusPill`
(tone="attention") reading "[Pending review]" plus "[Typically reviewed
within 3-5 business days]".

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every procedure name, cost range and review timeline is
bracketed placeholder copy, not a real price or clinical fact. No
`check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`SecondOpinion` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `AISkinScanPreview.tsx`

Krishna asked, as part of the same gap-analysis pass, to preview a
camera-based AI skin-analysis flow seen in a reference app (Apollo 24|7's
"Clear Steps" feature) — what this COULD look like if StudentKare ever
built one. This is the biggest-ticket, most sensitive of the 4 gap-fill
previews in this pass: the other three (`LabPackageDetailPreview`,
`SecondOpinionPreview`, and a commerce/UI pattern) are layout and
service-line previews; this one previews a **biometric/AI-diagnostic
capability** — capturing and algorithmically reading a photo of someone's
face — which this codebase has no equivalent of today.

**This caveat matters more than usual, and is stated here up front:**
(a) this file is a UI-shape preview only — no camera capture and no AI/ML
image analysis is implemented, or being proposed for implementation, in
this file or anywhere in the app; (b) a real version of this feature
would be a **new biometric/AI-diagnostic product capability**, not a
restyle of an existing screen, and would need its own dedicated product
review, its own clinical-safety review, and its own privacy review
covering camera/biometric data capture specifically — before any real
engineering work starts. That is a materially heavier bar than the
Tier-1 named-reviewer content check this repo uses for an ordinary
safety/consent/identity/clinical-value screen (CLAUDE.md), because no
existing Tier-1 screen in this repo has had to clear a biometric-capture
or AI-diagnostic-claim review; (c) this was built per Krishna's explicit
request to preview this one specific reference pattern, with this
caveat stated up front — the request was to preview it, not to build the
real thing.

No `design/screens/briefs/AISkinScan.md` exists — same footing as
`LabPrep`, `DoctorCompare`, `ReferFriend` and `SecondOpinion`: a net-new
concept with no brief or ticket, previewed only because it was explicitly
asked for.

**Built only from the approved pieces**, nothing invented: `Illustration`
from `@/design-system/icons`, reusing `illustration-face-oval-guide` (the
identity-verification face-framing illustration) for the capture-guide
step, since no skin-scan-specific illustration exists in
`design/icons/icon-manifest.json` and per `CLAUDE.md` none was invented;
`M2Pill`, `M2Note`, `M2Card`, `GlossTile`, `m2Text`, `RoundButton` from
`@/design-system/m2`; `StatusPill` from `@/design-system` for the 4
result-severity badges; `Icon` from `@/design-system/icons`, limited to
`camera`, `shield-check`, `shield-alert`, `share-nodes`, `clock` and
`arrow-left` (the last for the standard back-button chrome, same
convention as every other preview in this folder) — all confirmed in
`design/icons/icon-manifest.json`. Tokens only (`color`, `font`,
`fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen**, one scrollable preview (not a multi-screen
flow, matching this folder's own single-static-screen convention): a
"Capture" section with the face-oval-guide illustration, a
"[Position your face in the frame]" instruction line, and a disabled-
looking "[Start scan]" control (a non-interactive `View`, same `noop`
convention this folder uses for every non-functional control, not a real
button); a "Results" section shown as if a scan had already run
(static only — no scan logic anywhere) with an `M2Note`
(tone="attention", `announce`) stating plainly, near the top of the
section, that this is not a diagnosis and does not replace seeing a
dermatologist or clinician, followed by 4 `M2Card`s (`[Hydration]`,
`[Texture]`, `[Even tone]`, `[Visible pores]`) each with a `StatusPill`
severity badge (positive/attention/danger/neutral) and copy framed as "a
pattern this photo shows" — never a diagnosis, clinical finding, or
medical claim; per `AGENTS.md` rule 4 and `DESIGN.md` §2/§7 there is no
numeric score out of 100, no comparison to other people, and no streak/
history framing; a "Suggested routine" section with 3 step cards
(`M2Card` + `GlossTile`), each a placeholder product **category** (never
a real brand/product name) tagged AM/PM via `M2Pill`; and a
"[Share with a clinician]" action row — clinician-facing framing, not a
standalone consumer health-score product, matching the brief's own
not-a-diagnosis note.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every metric, severity, routine step and category is
bracketed placeholder copy, not a real scan result. No
`check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as `AISkinScan`
and in the `AllScreens` composite. Nothing committed, pushed, or opened
as a PR.

## 2026-11-11 — `InsurancePlanBuilderPreview.tsx`

Also part of the same 2026-11-11 gap-analysis pass: reviewing a reference
app's (Apollo 24|7) insurance flow against this folder found that
`M2InsurancePreview.tsx` only shows a static "your cover" screen (current
policy, a generic "what's included" list, "More cover" cards that are
"Notify me" only, per the real brief's 2026-11-04 founder note that no
partner is chosen yet). There is no "build and compare a plan" flow
anywhere — adult/child count steppers, a plan comparison table with
BEST VALUE/RECOMMENDED ribbons, and a quote/price breakdown. This screen
fills that gap. No `design/screens/briefs/InsurancePlanBuilder.md`
exists — same footing as `LabPrep`, `DoctorCompare`, `ReferFriend`,
`SecondOpinion` and `AISkinScan`: a net-new concept with no brief or
ticket.

**Built only from the approved pieces**, nothing invented: `M2Table`
(from `src/design-system/m2/M2Structure.tsx`, read first for its exact
`M2TableColumn`/`rowKey`/`cell` prop shape) reused as the plan comparison
table — no new comparison-table component was built, the same way
`DoctorComparePreview.tsx` reused it for doctors instead of lab packages.
`M2Pill` for the BEST VALUE/RECOMMENDED ribbons, `M2Card`, `M2Note`,
`GlossTile`, `m2Text`, `RoundButton` from `@/design-system/m2`; `Icon`
from `@/design-system/icons`, limited to `arrow-left`, `plus`, `minus`,
`check`, `shield-check-2` — all confirmed in
`design/icons/icon-manifest.json`. Tokens only (`color`, `font`,
`fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen:** a header with a `RoundButton` back control and
the title "[Build your plan]"; an adults/children count section reusing
`M2ProductPreview.tsx`'s exact `+`/`-` stepper pattern (two steppers, both
`noop`-wired like every other preview control in this folder); a row of 3
selectable coverage-amount chips (`[₹5L]`/`[₹10L]`/`[₹25L]`) with real,
purely visual local `useState` selection (no other effect, matching
`LabPackageDetailPreview.tsx`'s precedent of wiring a `useState` setter to
a visual-only control rather than leaving it a dead prop); an `M2Table`
with 3 columns (plan, monthly price, Covers OPD check/cross) × 3 rows,
with an `M2Pill` ribbon next to the Plus (BEST VALUE) and Max
(RECOMMENDED) plan names; a quote-breakdown `M2Card` (base price, add-ons,
GST, total, right-aligned); and an `M2Note` (tone="info") stating plainly
this is an illustrative quote only and a licensed advisor confirms the
actual premium before purchase.

**This caveat matters more than the usual Tier 1 content check, same
reasoning as `SecondOpinionPreview.tsx`: a real insurance plan builder is
a pricing/underwriting decision, not a UI pattern.** Before any real
version of this is built, it needs an explicit product + compliance
decision — at minimum, how a quote is actually computed, which insurer/
partner underwrites it, what regulatory disclosures a plan comparison
must carry, and who is accountable for the numbers shown being right.
That is a heavier bar than the named-reviewer design sign-off that gates
an ordinary Tier 1 screen in this repo, and this preview does not claim
that bar has been cleared — every price, plan name and total on this
screen is bracketed placeholder copy, not a real rate.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`InsurancePlanBuilder` and in the `AllScreens` composite. Nothing
committed, pushed, or opened as a PR.

## 2026-11-11 — `LabPackageSelectionPreview.tsx`

Also part of the same 2026-11-11 gap-analysis pass: reviewing reference
apps (Tata 1mg's "Full Body Packages" and Apollo 24|7's "Lab Tests"
package-list screens) against this folder found that
`LabPackageDetailPreview.tsx` only covers the page AFTER a package is
already picked — it has no equivalent of the picker/browse screen that
comes before it: a grid of package-selector cards plus a personalised
recommendation card. This screen fills that gap. No
`design/screens/briefs/LabPackageSelection.md` exists — same footing as
`LabPrep`, `DoctorCompare`, `ReferFriend`, `SecondOpinion`, `AISkinScan`
and `InsurancePlanBuilder`: a net-new concept with no brief or ticket.

**Built only from the approved pieces**, nothing invented: `M2Card`,
`GlossTile`, `m2Text`, `M2Pill`, `RoundButton`, `M2Note` from
`@/design-system/m2`; `Accordion` from `@/design-system/Accordion` (the
same expand/collapse primitive `LabPackageDetailPreview.tsx` introduced,
reused here for the single "[Why is this recommended?]" row instead of a
new disclosure pattern); `Icon` from `@/design-system/icons`, limited to
`arrow-left`, `flask`, `flask-2`, `percent`, `check-circle-2`, `heart`,
`heart-plus`, `clock` and `scan` — all confirmed in
`design/icons/icon-manifest.json` before use. Tokens only (`color`,
`font`, `fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen:** a header with a `RoundButton` back control and
the title "[Choose a health package]"; a stack of 3 package-selector
`M2Card`s — "[Popular Package]" with a POPULAR `M2Pill`, "[Build your
own]" (custom/scan-based, using the `scan` icon for a "Scan & build"
affordance), and "[Full Body Advanced]" with a NEW `M2Pill` — each
showing a name, a bracketed description line, a test count, a price row
(current price, struck-through MRP, and a %-off `M2Pill` where
applicable) and a "Select" affordance; a separate "Recommended for you"
`M2Card` below the grid with bracketed personalised copy and the
`Accordion`-based "[Why is this recommended?]" row wrapping one short
explanation, plus an `M2Note` (tone="info") stating plainly this
suggestion is placeholder copy, not a real report, value or clinical
judgement; and a simple "Continue" button in a sticky footer, matching
this folder's own footer-button convention.

Per `AGENTS.md` rule 4 (commerce firewall), the "POPULAR"/"[Booked ...]"-
style and "Recommended for you" copy is deliberately bracketed
placeholder text, not a literal counter claim or a real clinical
inference. Like `LabPackageDetailPreview.tsx`, this repo treats lab/
package content as Tier 1 (safety, consent, identity, clinical values)
even on a commerce-adjacent page — flat and non-wired here, but a named-
reviewer plan-first pass is required before any of this is built for
real.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every name, description, price and recommendation is
bracketed placeholder copy. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`LabPackageSelection` and in the `AllScreens` composite. Nothing
committed, pushed, or opened as a PR.

## 2026-11-11 — `PaymentRetrySheetPreview.tsx`

Also part of the same 2026-11-11 gap-analysis pass: two more still-missing
reusable UI patterns, put on one preview screen rather than two files —
(1) a payment-failure/retry bottom sheet, and (2) a loyalty/coins commerce
card. Neither exists anywhere in this folder yet (every `*Checkout*`/
`*Order*` preview so far shows the happy path only). No
`design/screens/briefs/*` entry exists for either pattern — same footing
as `LabPrep`, `DoctorCompare`, `ReferFriend`, `SecondOpinion`,
`AISkinScan`, `InsurancePlanBuilder`: net-new, no brief or ticket.

**Bottom sheet component used:** searched `src/design-system/` first, per
the task's instruction to prefer an existing one. `Sheet.tsx`/
`Sheet.native.tsx` (wrapping `Overlay`, variant `"sheet"`) and `Drawer.tsx`
both exist, but both are real, stateful, focus-trapping overlays driven by
`visible`/`open` + `onClose` — wiring one up would mean either giving this
flat preview a live `useState` toggle (outside this round's "flat/static,
always-visible" convention every sibling preview follows) or passing a
fake no-op `onClose` into a component built to trap focus and handle Esc,
which would misrepresent it as functional when it isn't. So, per the
task's own fallback instruction, the sheet here is a local, non-reusable
absolutely-positioned `View` — a `color.scrim` backdrop plus a
rounded-top (`radius.xl`, top corners only) panel with `shadow.float`,
matching `Overlay`'s own CSS (`overlays.css`: `sk-ov__scrim` /
`sk-ov__panel` roundness and surface tint) and `shadow`/`radius` tokens —
shown already open, no toggle, no new component file. If this pattern is
wanted for real, it should be built as an actual `Sheet` usage with a real
open/close state, not a copy of this local style object.

**Built only from the approved pieces**, nothing invented: `GlossTile`,
`M2Card`, `M2Note`, `M2Pill`, `RoundButton`, `m2Text` from
`@/design-system/m2`; `Icon` from `@/design-system/icons`, limited to
`arrow-left` (back button), `shield-alert` (payment-failure tile),
`check-circle-2` (retry button), `clock` (support note and the loyalty
card's bonus-expiry pill), `star-filled` (the loyalty/coins tile) — all
confirmed in `design/icons/icon-manifest.json`. No `coin`, `wallet`, `gift`
or `tag` icon exists in the manifest (checked by name before picking a
substitute, per `CLAUDE.md`'s "never invent an icon" rule); `star-filled`
was chosen as the loyalty/coins stand-in because it is the nearest
rewards-shaped icon that already exists, not a guess at a missing one.
Tokens only (`color`, `font`, `fontWeight`, `radius`, `shadow`, `space`) —
no hex values.

**What's on the screen:** a minimal `[Checkout]` header with a
`RoundButton` back control; a background "screen" with an order-summary
`M2Card` (`[2 items]` / `[₹486]` / delivery note) so the sheet has
something to sit over; a loyalty card (`M2Card` + `GlossTile`) showing
`[120 coins earned]`, `[Use coins on your next order]`, and an `M2Pill`
bonus-expiry tag (`[2x bonus · ends in 3 days]`) — commerce-only, no
streaks, scores or gamification of any health/clinical metric, per
`AGENTS.md` rule 4; and the payment-retry sheet itself: `shield-alert`
tile, `[Payment failed]` title, `[Your bank declined this transaction]`
line, a primary `[Retry payment]` button, a secondary
`[Use a different payment method]` link-style button, and an `M2Note`
`[Need help? Contact support]` line.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every amount, balance and tag is bracketed placeholder
copy. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`PaymentRetrySheet` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `StepDiagram.tsx` (shared component) and `CarePlanBenefitsPreview.tsx`

Also part of the same 2026-11-11 gap-analysis pass. Two reference-video
reviews independently surfaced the same UI shape — a Blinkit forex-card
activation flow and an Apollo 24|7 insurance "How a Top-Up Works"
explainer both use a vertical numbered step list (circled step number,
connected to the next by a vertical rule, title + description beside it).
Because it showed up twice, independently, it was built as a real shared
component — `src/design-system/StepDiagram.tsx`, exporting
`StepDiagram({ steps, testID })` — rather than drawn inline on one
screen. It uses only `color`, `font`, `fontWeight`, `radius`, `space`
from `@/design-system/theme`, no hex values, and is exported from
`src/design-system/index.ts` alongside the other recent additions
(`Accordion`/`AccordionItem`, `StarRating`).

`CarePlanBenefitsPreview.tsx` is the flat, non-functional preview this
component was built for: a membership/benefits screen modelled on a
reference app's "My Care Plan" section. There is no existing brief or
screen for this — same footing as the other net-new concepts in this
folder (`LabPrep`, `DoctorCompare`, `ReferFriend`, `SecondOpinion`,
`AISkinScan`, `InsurancePlanBuilder`): no `design/screens/briefs/
CarePlanBenefits.md` exists, previewed only because it was explicitly
asked for.

**Built only from the approved pieces**, nothing invented: `M2Card`,
`GlossTile`, `m2Text`, `M2Note`, `RoundButton` from `@/design-system/m2`;
`StatusPill` from `@/design-system` for the membership status; the new
`StepDiagram` for the "[How your benefits work]" 3-step explainer;
`Accordion`/`AccordionItem` (reused, not rebuilt) for the FAQ; `Icon`
from `@/design-system/icons`, limited to `check-circle-2`, `percent`,
`clock`, `arrow-left` and `shield-check` — all confirmed in
`design/icons/icon-manifest.json` (`chevron-down`/`chevron-up` are used
inside the reused `Accordion`, not directly on this screen). Tokens only
— no hex values.

**Perforated "ticket" card — implementation choice:** built as a plain
`View`/`StyleSheet` composition, no SVG and no new icon. Each benefit
card is a row of three parts: a narrow icon "stub" on the left
(`GlossTile`), a 1px-wide perforation column of small circular `View`s
coloured to match the screen's canvas background (simulating punched
holes against the card's `surface` fill), and the benefit title + usage
counter on the right. This was simpler to implement correctly with plain
RN primitives than a dashed-border divider (RN's `borderStyle: 'dashed'`
support is inconsistent across platforms this app targets), and reads
clearly as a coupon/ticket at this card size. Kept inline in this
screen's `StyleSheet`, not extracted as a shared component — the
perforation treatment is specific to this one card shape and wasn't
asked for elsewhere.

**What's on the screen:** a header with a `RoundButton` back control and
the title "[My Care Plan]"; a membership status `M2Card` with a
`StatusPill` (tone="positive") reading "[Active till Dec 2026]" and a
short renewal note; a stacked row of 3 perforated ticket cards
("[20% off next lab test]", "[Free home sample collection]",
"[Priority support]"), each with a "[Used N of M times]" counter; a
"[Use your benefits]" checklist of 5 rows, each a check-circle icon plus
a benefit line; a "[How your benefits work]" `StepDiagram` inside an
`M2Card`, in 3 steps (activate, use at checkout, track savings); an
`M2Note` (tone="info") noting benefits reset each billing cycle; and a
2-item FAQ `Accordion`.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every benefit name, usage count and date is bracketed
placeholder copy, not a real entitlement. No `check-icons.mjs --screen`
run and no `design/screens/implementation-map.json` entry, since there
is no brief or ticket yet. `tsc --noEmit` is clean across the repo.
Added to `src/design-system/stories/RedesignPreview.stories.tsx` as
`CarePlanBenefits` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `HomeCollectionStatusPreview.tsx` (gap-analysis pass, round 2)

Also part of the 2026-11-11 gap-analysis pass, round 2 — three small card
patterns from reference-app videos that aren't in this app yet, all natural
to a "your home sample collection is on the way" status screen: a
phlebotomist/home-visit staff credentials card, a testimonial card, and a
compact secondary promo strip (distinct from the full gradient hero banners
used elsewhere, e.g. `LabPackageDetailPreview.tsx`'s cross-sell card). No
`design/screens/briefs/*` entry exists for this screen — same net-new
footing as `LabPrep`, `DoctorCompare`, `ReferFriend`.

This is commerce/logistics content, not clinical, so the caution in the
file's own comment is lighter-weight, matching `ReferFriendPreview.tsx`.
One thing is still called out deliberately: the phlebotomist's name,
photo, "ID verified" badge and rating are bracketed placeholder copy
standing in for a UI shape, not a real verified identity — if this is
built for real, the verification badge must be backed by an actual
checked credential and fail closed if that check can't complete, never a
decorative icon.

**Built only from the approved pieces**, nothing invented: `StatusPill`
and `StarRating` from `@/design-system`; `GlossTile`, `M2Card`, `M2Note`,
`RoundButton`, `m2Text` from `@/design-system/m2`; `Icon` from
`@/design-system/icons`, limited to `arrow-left` (back button), `user`
(photo-placeholder tile), `shield-check` (ID-verified badge), `phone` and
`message-circle` (the non-functional call/message `RoundButton` row),
`percent` and `chevron-right` (the promo strip), and `clock` (the closing
`M2Note`) — all confirmed in `design/icons/icon-manifest.json` before use.
Tokens only (`color`, `font`, `fontWeight`, `radius`, `space`) — no hex
values.

**What's on the screen:** a header with a `RoundButton`-style back control
and the title "[Your sample collection]"; a status `M2Card` with a `live`
`StatusPill` reading "[Technician on the way — ETA 20 mins]" and an
address placeholder note; a phlebotomist credentials `M2Card` — photo
`GlossTile`, "[Rohit K.]", "[Certified phlebotomist]", a `shield-check`
"[ID verified]" badge, a read-only `StarRating` "(4.9)", and a
non-functional call/message `RoundButton` row; a slim single-line promo
strip (not a full hero card) reading "[Add a free follow-up consult and
save more — ends today]" with a trailing chevron; and a testimonial
`M2Card` with a read-only 5-star `StarRating`, an italic placeholder
quote, and "[— Priya S., verified patient]".

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every name, photo, badge, rating and quote is bracketed
placeholder copy, not a real verified identity or review. No
`check-icons.mjs --screen` run and no `design/screens/implementation-map.json`
entry, since there is no brief or ticket yet. `tsc --noEmit` is clean
across the repo. Added to `src/design-system/stories/RedesignPreview.stories.tsx`
as `HomeCollectionStatus` and in the `AllScreens` composite. Nothing
committed, pushed, or opened as a PR.

## 2026-11-11 — `AskAyushOrderCardPreview.tsx` (round 2)

Also part of the same 2026-11-11 gap-analysis pass. A reference app's AI
chatbot flow ("Ask Apollo") renders a structured order-summary card
inline inside the chat, not just a text reply — a pattern this repo's
real AI-chat screen, `M2AskAyushPreview.tsx` (Tier 1), doesn't have yet.
This preview demonstrates that ONE new card type on its own: it is a
SEPARATE, ADDITIONAL screen, not an edit to `M2AskAyushPreview.tsx` — the
real chat screen is untouched.

**This is more than a visual tweak to an existing Tier 1 screen.** Letting
an AI assistant render a confirm-and-transact card inside a health-records
chat is a product decision about what Ask Ayush is allowed to add to a
cart or place an order for on a student's behalf — under what consent,
with what spending/category limits, and with what fallback if a check
can't complete. None of that is decided here. Per `CLAUDE.md`'s Tier 1
rule and `AGENTS.md`'s fail-closed/consent guardrails, this needs its own
named-reviewer plan-first pass before any real build — this preview only
shows the visual shape of the card, nothing about what it is permitted to
transact.

**Built only from the approved pieces**, nothing invented: `M2Card`,
`GlossTile`, `m2Text`, `M2Note`, `RoundButton` from `@/design-system/m2`;
`Icon` from `@/design-system/icons`, limited to `arrow-left` (back
button), `cart` (order-card eyebrow tile), `clock` (ETA line),
`check-circle-2` (confirm-order button), `percent` (the "apply discount"
quick-reply chip), and `message-circle` (closing `M2Note`) — all
confirmed in `design/icons/icon-manifest.json` before use.
`message-circle-2`, `message-circle-3` and `cart-alt` also exist in the
manifest but weren't needed. Tokens only (`color`, `font`, `fontWeight`,
`radius`, `space`) — no hex values. Chat-bubble styling (user bubble vs.
AI bubble background/alignment/radius, header layout) is copied from
`M2AskAyushPreview.tsx` so the new card type reads as if it belongs in
that same chat UI.

**What's on the screen:** a header matching `M2AskAyushPreview.tsx`'s
style, title "Ask Ayush"; a student chat bubble "[Can you order my usual
vitamin D supplement?]"; an AI text bubble "[Sure — here's what I found
and added to your cart:]"; then the new pattern — an inline order-summary
`M2Card` sitting where a bot message would be, with 2 line items (name +
qty + price), a delivery-address line, a `clock`-icon ETA line "[Delivery
by 6 PM today]", a 3-line charges breakdown (items total / delivery fee /
total), and a non-functional "[Confirm order]" button; a closing AI
bubble "[Want me to apply your Care Plan discount?]" with 2 non-functional
quick-reply chips ("[Yes, apply]" / "[No, thanks]"); and a closing
`M2Note` restating that what this card can transact for the student is
still an open product decision.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every item, price, address and ETA is bracketed
placeholder copy, not a real order. No `check-icons.mjs --screen` run and
no `design/screens/implementation-map.json` entry, since there is no
brief or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`AskAyushOrderCard` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `CategoryBrowsePreview.tsx`

Also part of the same 2026-11-11 gap-analysis pass, round 2: 3 small
commerce/browse card patterns found in reference-app videos that this
repo's shared component set doesn't cover yet as a distinct reusable
shape, even though a generic product card already exists — a category
icon-tile grid where each tile can carry a ribbon badge, a persona/
avatar selector row ("who are you shopping for on this order"), and a
BOGO/family-offer promo tile pair. No `design/screens/briefs/*` entry
exists for this — net-new, same footing as `ReferFriendPreview.tsx` and
the other unticketed previews in this folder.

**Persona selector vs. "Family Hub" — the distinction this screen is
careful about.** NOTES.md Part 6 (2026-11-05) already covers why this
repo rejected a 1mg-style family-avatar-switcher: it lets one account
view another member's full record, which conflicts with this product's
18+-only, student-owned-record architecture (AGENTS.md rule 8) — and
this repo's real answer to "family" is `FamilyCircle` ("Care circle",
Tier 1). `CategoryBrowsePreview.tsx`'s persona row is deliberately a much
smaller thing: 4 plain chips ("[Myself]" / "[Partner]" / "[Parent]" /
"[Add profile]"), one highlighted via local `useState`, with no profile-
switching logic, no shared or visible health data across people, and no
clinical content anywhere on the row. It only answers "who is this single
commerce order for" — closer to a shipping-recipient picker on a shopping
cart than a family profile system — and the file's own caution comment
says so explicitly so it isn't mistaken for the rejected pattern later.

**Built only from the approved pieces**, nothing invented: `GlossTile`,
`M2Card`, `m2Text`, `M2Pill`, `RoundButton` from `@/design-system/m2`.
Icons confirmed in `design/icons/icon-manifest.json` before use:
`arrow-left` (back button), `user`/`user-2`/`user-3`/`plus` (persona
chips), `capsule`/`droplet`/`heart-pulse`/`activity`/`box`/`devices`
(the 6 category tiles), `percent` (promo discount pills), `users`
(family-pack promo tile). The manifest has no `trending`, `flame`, or
literal `new` icon, so two ribbon badges use the nearest existing
stand-ins rather than an invented one: `trend-arrow` for "[Trending]"
and `sparkle` for "[New]"; "[Best Seller]" uses `star-filled`, the
substitute the task itself suggested. Tokens only (`color`, `font`,
`fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen:** a header with a `RoundButton` back control and
the title "[Shop by category]"; the persona chip row described above;
a 6-tile category grid ("[Vitamins]", "[Skin Care]", "[Diabetes Care]",
"[Pain Relief]", "[Baby Care]", "[Devices]") where 3 tiles carry a
corner ribbon `M2Pill` ("[Trending]", "[Best Seller]", "[New]"); and a
2-up promo row of compact `M2Card`s — "[Buy 1 Get 1 — Vitamins]" with a
`[BOGO]` pill and "[Family pack — Save 30%]" with a `[30% off]` pill.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every category, badge and offer is bracketed placeholder
copy. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`CategoryBrowse` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `DoctorBrowsePreview.tsx` (round 3)

Also part of the 2026-11-11 gap-analysis pass, round 3: a reference app's
doctor-browsing flow renders a horizontally-scrollable carousel of doctor
profile cards for discovery, distinct from `DoctorComparePreview.tsx` in
this same folder, which is a side-by-side table comparing two
already-chosen doctors. `DoctorBrowsePreview` is the step before that —
scanning a filtered list of doctors to find one worth comparing or
booking. It is a SEPARATE, ADDITIONAL screen, not an edit to
`DoctorComparePreview.tsx`, which is untouched.

Doctor booking content here is adjacent to this repo's real appointments
feature. If this direction is wanted for real, "Book" must route through
the existing appointments/teleconsult booking logic (consent, slot
availability, fail-closed checks per AGENTS.md) rather than reinventing
it here — this preview only shows the visual shape of a browse/discovery
carousel, with no booking logic, no real doctors, and no real
availability.

**Built only from the approved pieces**, nothing invented: `M2Card`,
`GlossTile`, `m2Text`, `M2Pill`, `RoundButton`, `M2Note` from
`@/design-system/m2`; `StarRating` from `@/design-system`; `Icon` from
`@/design-system/icons`, limited to `arrow-left` (back button) and
`doctor` (photo-placeholder tile and the "Book" `RoundButton`'s icon) —
both confirmed in `design/icons/icon-manifest.json` before use.
`doctor-alt`, `check-circle-2` and `shield-check` also exist in the
manifest but weren't needed for this screen's content. Tokens only
(`color`, `font`, `fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen:** a header with a round back button and the
title "[Find a doctor]"; a horizontally-scrollable specialty filter chip
row ("[General Physician]", "[Dermatologist]", "[Pediatrician]",
"[Cardiologist]") with local `useState` selection, visual only; a
horizontally-scrollable carousel of 5 doctor profile `M2Card`s, each with
a `GlossTile` photo-placeholder, name, specialty line, years-of-experience
line, a read-only `StarRating` with a review count, an `M2Pill`
availability badge ("[Available today]" / "[Next slot tomorrow]"), and a
non-functional "Book" `RoundButton`; and a closing "[Why book through
StudentKare]" `M2Note` (tone="info") with a generic, explicitly
placeholder mention of verified credentials — not a real compliance
claim, per AGENTS.md rule 6.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every doctor name, specialty, rating, review count and
availability badge is bracketed placeholder copy, not a real doctor or
review. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`DoctorBrowse` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `CommerceExtrasPreview.tsx` (round 3)

Also part of the same 2026-11-11 gap-analysis pass, round 3: 6 small
commerce/checkout UI patterns found in reference-app screen recordings
(Tata 1mg, Blinkit) that this repo's shared component set doesn't cover
yet — a delivery-speed toggle, a "frequently bought together" horizontal
carousel, a "plan applied" savings banner, a brand-logo strip, a
"continue browsing" recently-viewed row with per-card dismiss, and a
quick-add floating mini overlay. There is no `design/screens/briefs/*`
entry for this screen — net-new, same footing as `ReferFriendPreview.tsx`
and `CategoryBrowsePreview.tsx`.

Deliberately Tier 3 / commerce only: no clinical content, no personal
health data, no real brand names (every brand tile is bracketed
placeholder copy, per the task's own instruction not to invent brand
names), and no invented prices beyond placeholder figures. The "plan
applied" savings banner is static only — no confetti or animation — kept
deliberately understated rather than celebratory, consistent with
AGENTS.md rule 4's commerce firewall even though a discount applied to a
commerce order (not a clinical body metric) is in scope here.

**Built only from the approved pieces**, nothing invented: `M2Card`,
`GlossTile`, `m2Text`, `M2Pill`, `M2Note`, `RoundButton` from
`@/design-system/m2`. Icons confirmed in `design/icons/icon-manifest.json`
before use: `arrow-left` (back button), `zap` and `truck` (delivery-speed
option icons), `cart` (quick-add mini overlay), `check-circle-2`
(plan-applied savings banner), `percent` (available for discount pills),
`capsule`, `droplet`, `heart-pulse`, `box`, `activity`, `devices`
(product-card thumbnails). For the dismiss icon on each recently-viewed
card, the manifest has a confirmed `x` entry and no separate `close` or
`dismiss` entry, so `x` was used — the correct confirmed icon per the
task's own fallback instruction. Tokens only (`color`, `font`,
`fontWeight`, `radius`, `space`) — no hex values.

**What's on the screen:** a header with a `RoundButton` back control and
the title "[Checkout extras]"; (1) a 2-up delivery-speed toggle
("[Faster — ₹29/patient, by 6 PM today]" vs "[Standard — Free, by
tomorrow]") with local `useState` selection; (2) a "Frequently bought
together" horizontal `ScrollView` of 3 small product cards (`GlossTile`
thumbnail, name, price, non-functional "[Add]" button); (3) a slim
"Plan applied" `M2Note` savings banner, visually distinct from a hero
card, reading "[Care Plan discount applied — you saved ₹140]"; (4) a
"[Top brands for you]" heading with a horizontal row of 5 placeholder
brand `GlossTile` squares; (5) a "Continue browsing" recently-viewed row
of 3 small product cards, each with a dismiss `x` icon-button in the
top-right corner, backed by local `useState` so a tapped card visually
disappears from this preview; (6) a small pill-shaped floating quick-add
overlay near the bottom, above where a real footer would sit, showing
"[2 items added]" with a mini `cart` icon and a "[View cart]" `M2Pill`,
static/always-visible for this preview.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
data anywhere — every name, price and brand label is bracketed
placeholder copy. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet. `tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`CommerceExtras` and in the `AllScreens` composite. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — `WebLabPackageSelectionPreview.tsx` and `WebLabPackageDetailPreview.tsx` (round 4)

Also part of the 2026-11-11 gap-analysis pass, round 4: the web
counterparts of this folder's two mobile lab-package screens,
`LabPackageSelectionPreview.tsx` (the package-picker grid) and
`LabPackageDetailPreview.tsx` (a single package's detail page), laid
out for desktop width inside the real `StudentWebShell` via
`WebShellPreview`, following the same convention as `WebProductPreview`,
`WebShopPreview` and the other `Web*Preview` screens — not a straight
copy-paste of the phone-frame layout.

This repo has a real `studentweb` screen, `WebMyLabTestsView.tsx`
(`src/features/studentweb/views/t1/WebMyLabTestsView.tsx`), which is
Tier-1-approved for tracking the student's OWN existing lab orders and
results. Confirmed by reading it: it does not cover browsing or picking
a NEW lab package to book. These two web previews cover that separate
browse/decide moment, so they do not duplicate it.

`WebLabPackageSelectionPreview.tsx` lays the 3 package-selector cards
(popular / build-your-own / advanced) out side-by-side in a desktop
row inside the shell body, instead of the mobile version's vertical
stack, and keeps the "Recommended for you" card with its `Accordion`
"why recommended" row unchanged in content. `WebLabPackageDetailPreview.tsx`
keeps the title/price/badge/`StarRating` block at the top, then splits
into a two-column desktop layout: left column holds the "What's
included" `Accordion`, the FAQ `Accordion` and the rating-feedback
`StarRating`; right column holds the doctor-recommendation `M2Card` and
the `GradientHeroCard` cross-sell banner, which sit stacked below each
other on mobile but side of the accordions on desktop.

**Built only from the approved pieces**, nothing invented: `Accordion`,
`StarRating` from `@/design-system`; `GlossTile`, `M2Card`, `M2Note`,
`M2Pill`, `GradientHeroCard`, `heroStops`, `m2Text` from
`@/design-system/m2`; `Icon` from `@/design-system/icons`, limited to
icons already used by the mobile versions (`flask-2`, `scan`, `flask`,
`heart`, `heart-plus`, `percent`, `clock`, `check-circle-2`, `shield-check`,
`doctor-alt`, `doctor`, `cart`) — all re-confirmed in
`design/icons/icon-manifest.json` before use. `WebShellPreview` and
`BrandFooter` reused as-is. Tokens only (`color`, `font`, `fontWeight`,
`radius`, `space`) — no hex values.

Used `WebShellPreview route="lab-tests"` for both — the real route in
`src/lib/utils/routes/routePaths.ts` for browsing lab tests, distinct
from `my-lab-tests` (the real `WebMyLabTestsView.tsx`'s route).

Per AGENTS.md rule 4 (commerce firewall), the "Recommended for you"
copy and the social-proof booked-count badge stay deliberately
bracketed placeholder text, not a real clinical inference or a literal
counter claim, and the doctor-recommendation card names no real
clinician — unchanged from the mobile versions. Like the other
Tier-1-adjacent previews in this folder, lab/package content is
treated as Tier 1 even on this commerce-adjacent page — flat and
non-wired here, but a named-reviewer plan-first pass is required
before any of this is built for real.

Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No
real data anywhere — every package, price, badge and review count is
bracketed placeholder copy. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no
brief or ticket yet (same footing as the mobile versions they mirror).
`tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`WebLabPackageSelection` and `WebLabPackageDetail`, and in the
`AllScreens` composite. Nothing committed, pushed, or opened as a PR.

## 2026-11-11 — `WebCommerceExtrasPreview.tsx` and `WebCategoryBrowsePreview.tsx` (round 3)

Also part of the same 2026-11-11 gap-analysis pass, round 3: the web
counterparts of `CommerceExtrasPreview.tsx` and `CategoryBrowsePreview.tsx`,
following the same `Web*Preview` convention as `WebProductPreview.tsx` and
`WebShopPreview.tsx` — wrapped in `WebShellPreview route="shop"` (reusing
the real `StudentWebShell`, not a hand-drawn header), laid out for a wider
desktop body (`maxWidth` on the body style) instead of a 390px phone
frame, and ending with `<BrandFooter />`. Both reuse their mobile source
file's content, copy and icons verbatim — no new icon, no new design-
system component, and no hex values; both are Tier 3 / non-clinical,
same footing as the mobile versions.

`WebCommerceExtrasPreview` shows the same 6 patterns as the mobile
source — delivery-speed toggle, "frequently bought together", "plan
applied" savings note, brand-logo strip, "continue browsing" dismissible
cards, and the quick-add overlay — but with the "frequently bought
together" row shown as 3 cards side by side instead of a horizontal
scroll, since the desktop body is wide enough; "continue browsing" stays
a horizontal scroll per card width. `WebCategoryBrowsePreview` shows the
same persona chip row, category tile grid, and BOGO/family-offer promo
tiles as the mobile source, with the 6 category tiles able to sit in one
row on the wider desktop body instead of mobile's 3-column wrap. The
persona row is unchanged from the mobile file's own caution comment: a
plain visual chip selector only, not the family-avatar-switcher/"Family
Hub" pattern this repo already rejected (AGENTS.md rule 8).

Not wired into navigation or routing. No real data anywhere — every
name, price, brand label and badge is the same bracketed placeholder
copy as the mobile source files. No `check-icons.mjs --screen` run and
no `design/screens/implementation-map.json` entry, since there is no
brief or ticket yet (same footing as the mobile versions they mirror).
`tsc --noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`WebCommerceExtras` and `WebCategoryBrowse`, and in the `AllScreens`
composite. Nothing committed, pushed, or opened as a PR.

## 2026-11-11 — `WebInsurancePlanBuilderPreview.tsx` and `WebDoctorBrowsePreview.tsx`

Also part of the 2026-11-11 gap-analysis pass: the web counterparts of
`InsurancePlanBuilderPreview.tsx` and `DoctorBrowsePreview.tsx`, following
the same `Web*Preview` convention as `WebProductPreview.tsx` and
`WebShopPreview.tsx` — wrapped in `WebShellPreview` (reusing the real
`StudentWebShell`, not a hand-drawn header), laid out for a wider desktop
body (`maxWidth` on the body style) instead of a 390px phone frame, and
ending with `<BrandFooter />`. Both reuse their mobile source file's
components, copy and icons verbatim — no new icon, no new design-system
component, and no hex values. No `design/screens/briefs/WebInsurancePlanBuilder.md`
or `WebDoctorBrowse.md` exists — same net-new footing as the mobile
screens they mirror.

`WebInsurancePlanBuilderPreview` reuses `M2Table`, `StepDiagram`,
`M2Pill`, `M2Note`, `M2Card` and `RoundButton` from the mobile source,
rearranged into two desktop columns instead of one stacked column: the
adults/children steppers, coverage chips, "How a top-up works" step
diagram and the "Talk to an advisor" action sit in a left column; the
wider plan-comparison `M2Table`, the quote-breakdown card and the
illustrative-quote `M2Note` sit beside it in a right column, so the table
and the numbers it drives are visible together without scrolling. The
same caution as the mobile file carries over verbatim and applies equally
to this layout: a real insurance plan builder is a pricing/underwriting
decision needing product + compliance (actuarial/underwriting) review,
not just a named-reviewer design approval — nothing on this screen
computes, quotes, or binds a real premium, and no additional review has
happened for the web layout either.

`WebDoctorBrowsePreview` reuses `M2Card`, `GlossTile`, `m2Text`, `M2Pill`,
`RoundButton`, `M2Note` and `StarRating` from the mobile source, replacing
the phone's horizontally-scrolling doctor carousel with a desktop grid
(`flexDirection: 'row'`, `flexWrap: 'wrap'`) so more doctor cards are
visible at once without scrolling; the specialty filter chip row and the
closing trust `M2Note` are otherwise unchanged. The same caution as the
mobile file carries over verbatim: doctor booking content here is
adjacent to this repo's real appointments feature, and if this direction
is wanted for real, "Book" must route through the existing
appointments/teleconsult booking logic (consent, slot availability,
fail-closed checks per AGENTS.md) rather than reinventing it here.

`WebShellPreview` routes used: `"insurance"` (an existing route in
`src/lib/utils/routes/routePaths.ts`, already insurance-adjacent) for the
plan builder, and `"appointments"` (also an existing route, doctor/consult-
adjacent) for the doctor browse screen.

Not wired into navigation or routing. No real data anywhere — every
price, plan name, doctor name, specialty, rating and availability badge
is the same bracketed placeholder copy as the mobile source files. No
`check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet (same footing as the mobile versions they mirror). `tsc
--noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`WebInsurancePlanBuilder` and `WebDoctorBrowse`, and in the `AllScreens`
composite. Nothing committed, pushed, or opened as a PR.

## 2026-11-11 — `WebCarePlanBenefitsPreview.tsx` and `WebSecondOpinionPreview.tsx`

Also part of the 2026-11-11 gap-analysis pass: the web counterparts of
`CarePlanBenefitsPreview.tsx` and `SecondOpinionPreview.tsx`, following
the same `Web*Preview` convention as `WebProductPreview.tsx` and
`WebShopPreview.tsx` — wrapped in `WebShellPreview` (reusing the real
`StudentWebShell`, not a hand-drawn header), laid out for a wider desktop
body (`maxWidth` on the body style) instead of a 390px phone frame, and
ending with `<BrandFooter />`. Both reuse their mobile source file's
components, copy and icons verbatim — no new icon, no new design-system
component, and no hex values. No `design/screens/briefs/WebCarePlanBenefits.md`
or `WebSecondOpinion.md` exists — same net-new footing as the mobile
screens they mirror.

`WebCarePlanBenefitsPreview` reuses `StepDiagram`, `Accordion`,
`StatusPill`, `GlossTile`, `M2Card`, `M2Note` and `m2Text` from the mobile
source, with only one layout change for the wider body: the three
perforated, coupon-style benefit cards sit in a row instead of the
mobile version's vertical stack. The membership status bar, benefits
checklist, "how your benefits work" `StepDiagram` section and the FAQ
`Accordion` keep the same single-column reading order as the mobile
screen. The mobile file's own caution carries over unchanged: this is a
commerce/membership pattern (perforated coupon cards, a membership
status bar) that doesn't exist in this design system yet, and there is
no existing brief or screen for it — if this direction is wanted for
real it needs its own brief and ticket first, same caution as the other
previews in this folder.

`WebSecondOpinionPreview` reuses `M2Card`, `M2Note`, `GlossTile`,
`RoundButton`, `StatusPill` and `m2Text` from the mobile source, with
only one layout change for the wider body: the three illustrative
cost-range cards sit side by side instead of a mobile stack. The
describe-diagnosis text area, upload-reports row, submit-for-review
button with its clinician-review `M2Note`, and the request `StatusPill`
section keep the same single-column form order as the mobile screen,
since a submission form doesn't benefit from being split into columns.

The mobile file's clinical-governance caution carries over **verbatim**
to this web layout, because it applies just as much here: this is a UI-
shape preview only, nothing is wired and nothing reads or writes real
data. A real "second opinion" / surgical cost-estimator feature is a NEW
CLINICAL SERVICE LINE, not a UI pattern to restyle — before any real
engineering starts it needs an explicit product + clinical-governance
decision covering, at minimum: who reviews a submitted request (which
clinician, what credentialing), what liability and consent language is
required of the student before a request is even accepted, and how the
cost ranges shown would actually be sourced (which hospitals, how
current, who is accountable for them being right). That is a heavier bar
than the named-reviewer content check that gates an ordinary Tier 1
screen, and this screen — mobile or web — does not claim that bar has
been cleared.

`WebShellPreview` routes used: `"rewards"` (an existing route in
`src/lib/utils/routes/routePaths.ts`; no route named "benefits" or "care
plan" exists, and `rewards` is the closest existing match for a savings/
perks surface) for the care-plan benefits screen, and `"care-navigator"`
(also an existing route; no route named "second-opinion" or "surgery"
exists, and `care-navigator` is the closest existing match for a
getting-referred-to-care flow) for the second-opinion screen. Neither
route collides with routes other `Web*Preview` files already claim
(`shop`, `orders`, `appointments`, `buy-again`, `lab-tests`, `home`,
`insurance`).

Not wired into navigation or routing. No real data anywhere — every
benefit, coupon, checklist item, diagnosis placeholder, cost range and
status badge is the same bracketed placeholder copy as the mobile source
files. No `check-icons.mjs --screen` run and no
`design/screens/implementation-map.json` entry, since there is no brief
or ticket yet (same footing as the mobile versions they mirror). `tsc
--noEmit` is clean across the repo. Added to
`src/design-system/stories/RedesignPreview.stories.tsx` as
`WebCarePlanBenefits` and `WebSecondOpinion`, and in the `AllScreens`
composite. Nothing committed, pushed, or opened as a PR.

## 2026-11-11 — AskAyush contrast fix + landing-page audit follow-ups

**Contrast bug fixed in the real, shipped screen.** The same dark-on-dark
bug found and fixed earlier this round in `AskAyushOrderCardPreview.tsx`
(student chat bubble using `color.action` background with `bubbleText`
unconditionally set to `color.text`) was confirmed to pre-exist in
`M2AskAyushPreview.tsx` — a real preview screen already in the repo, not
part of this round's new builds. Fixed the same way: added a
`studentBubbleText: { color: color.onAction }` style applied only to the
student bubble's `Text`, leaving the Ayush bubble (light background,
dark text) untouched. `tsc --noEmit` clean.

**Landing-page FAQ/step-diagram gaps closed**, per the audit finding that
4 of 8 public landing pages had no FAQ section and the Consult page had
no step-by-step walkthrough, while sibling pages (Lab Tests, Plans,
Programs) already use `LwFaq`/`LwSteps` for this. No new components or
icons: both are existing shared primitives from `landingWebKit.tsx`
(`LwFaq` already uses `chevron-down`, confirmed present in
`icon-manifest.json`).

- `LandingCampusView.tsx` — added `LwFaq` (3 Qs): what a campus admin can
  see (reuses `campus.boundary.body`/`.enrolment` verbatim), whether
  cohort/attendance reporting exists (reuses `campus.gap.body` verbatim —
  already states it is not built), and how to get set up (new copy,
  points at the existing enquiry form / admin console sign-in).
- `LandingClinicianView.tsx` — added `LwFaq` (3 Qs), all reusing existing
  translated copy verbatim: access scope (`clinician.access.body`), pay
  and commission (`clinician.gap.payBody`), and joining
  (`clinician.joining.body`).
- `LandingLabListView.tsx` — added `LwFaq` (2 Qs): which test to book
  (reuses `lablist.disclaimer` verbatim) and price accuracy (new copy,
  states prices come straight from the public catalogue API, the same
  one used at checkout).
- `LandingPartnershipsView.tsx` — added `LwFaq` (2 Qs), both reusing
  existing translated copy verbatim: paid placement
  (`partners.nfs.search` + `partners.nfs.ads` concatenated) and what
  happens after submitting (`partners.sent.body`).
- `LandingConsultView.tsx` — added `LwSteps` ("How a consult works",
  3 steps: pick a specialty, book a slot, consult and keep your
  prescription — new copy, grounded only in facts the page already
  states: fee shown before booking, prescription saved to vault, college
  never told).

New i18n keys added to **all three** locale blocks in
`src/i18n/areas/landing.ts` (`landingEn`, `landingTe`, `landingHi`) so
the `Record<keyof typeof landingEn, string>` type constraint holds:
`landing.campus.faq.*`, `landing.clinician.faq.*`,
`landing.lablist.faq.*`, `landing.partners.faq.*`,
`landing.consult.howTitle`/`howLede`/`step1-3Title`/`step1-3Body`. Where
an answer reuses an existing key verbatim, no new key was added for the
answer — only for the question. Telugu and Hindi are first-draft
translations by Claude, not reviewed by a native speaker (same
unreviewed-first-draft status the file's header already documents for
this file generally); new copy (not reused verbatim from elsewhere) is
limited to the campus "how do I get set up" answer, the lablist price-
accuracy answer, and the three consult steps.

`tsc --noEmit` clean across the repo after all edits. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 — Round 4: remaining video re-watch findings

3 new screens plus 2 refinements to existing round-3 screens, closing out
the small/medium items from the deep video re-watch audit (full list
presented to the user; the rating/CSAT item was deliberately left out,
pending a product decision on scope).

**New screens:**
- `PaymentFailureScreenPreview.tsx` — a dedicated full-screen payment-
  failure state, distinct from the existing `PaymentRetrySheetPreview.tsx`
  bottom sheet (the Tata 1mg reference shows both shapes depending on
  where in the flow the failure happens). Order-ID card, Retry/Cash-on-
  Delivery buttons, support note. `shield-alert`, `check-circle-2`,
  `credit-card-2` icons, all manifest-confirmed.
- `InlineAyushSuggestionPreview.tsx` — an Ask Ayush suggestion embedded
  inline in a content feed between two ordinary cards, distinct from the
  full `M2AskAyushPreview.tsx` chat screen and from
  `AskAyushOrderCardPreview.tsx` (an order card inside the chat). Carries
  the same "pattern, not diagnosis, routes to a doctor" guardrail as the
  other Ayush screens, plus a caution note that proactive/unprompted AI
  surfacing in a feed is its own consent/frequency product decision, not
  just a UI question. `sparkle`, `x`, `arrow-right` icons.
- `PhysiotherapyAtHomeLandingPreview.tsx` — an entirely uncatalogued
  concept surfaced by a second close re-watch of the reference videos: a
  3-step `StepDiagram` ("tell us what hurts" → "matched with a
  physiotherapist" → "session at your hostel or home") plus a 2x2 benefit
  grid. Heaviest caution JSDoc in this batch — standing up a home-visit
  allied-health service line is a new product/clinical-governance/
  liability decision, flagged the same way as `AISkinScanPreview.tsx` and
  `SecondOpinionPreview.tsx`. "[Licensed physiotherapists]" and
  "[Credentials checked]" are explicitly placeholder copy, not a claim
  that any verification exists yet (same discipline as the phlebotomist
  "ID verified" badge in `HomeCollectionStatusPreview.tsx`). `home`,
  `person-badge`, `activity`, `clock`, `dumbbell` icons.

**Refinements to existing round-3 screens:**
- `CommerceExtrasPreview.tsx` — added a 4th "frequently bought together"
  card ("[Antibiotic course]") carrying an `M2Pill` "[Rx]" badge
  (`tone="attention"`, `prescription-2` icon), matching the Rx-needed
  badge on Blinkit's pharmacy grid cards. Reuses the existing `M2Pill`
  component rather than a hand-built badge, so colour comes from the
  pill's own tone map, not a one-off value.
- `HomeCollectionStatusPreview.tsx` — added a "[Collection fulfilled by
  Partner Lab]" attribution strip (`flask-2` icon) between the status
  card and the phlebotomist card; a "[Preparations guide]" row built from
  the shared `Accordion` component; and replaced the single testimonial
  card with a horizontally-scrollable set of 2, with a dot-pagination row
  below — matching the reference recording's paginated "rate your order"
  strip rather than a single static card. The first dot-pagination attempt
  used `color.ruleSoft` for inactive dots, which is nearly the same
  lightness as `color.canvas` and was effectively invisible in a
  screenshot; fixed to `color.ruleStrong` for real contrast.

All 5 new/changed stories added to
`src/design-system/stories/RedesignPreview.stories.tsx` (individual
exports `PaymentFailureScreen`, `InlineAyushSuggestion`,
`PhysiotherapyAtHomeLanding`, plus the `AllScreens` composite — 61 total
stories now). Screenshotted via the established Playwright pipeline and
visually verified before reporting back; the dot-contrast issue above was
caught this way. `tsc --noEmit` clean across the repo. Nothing committed,
pushed, or opened as a PR.

## 2026-11-11 (later) — one more re-audit gap built; one deliberately blocked

A fork re-checked all four video reports against the ground truth above
(NOTES.md itself, implementation-map.json, the stories file) and found
almost nothing survived — 61 stories already cover the four videos. Two
items did survive:

- `HealthPlansMarketplacePreview.tsx` — built. 1mg's "Health Plans" tab:
  partner condition-management programs (diabetes, weight, stress, heart
  risk), each a card with category `M2Pill`, bracketed "[Partner name —
  not yet chosen]" line, price, and "[Learn more]"/"[Enroll]" CTAs.
  Distinct from `InsurancePlanBuilderPreview.tsx` (insurance underwriting,
  not third-party coaching programs). Same caution weight as
  `PhysiotherapyAtHomeLandingPreview.tsx` — standing this up for real means
  vetting actual partners and deciding StudentKare's liability in a
  coaching relationship it doesn't clinically run itself; not solved here.
  No program promises a number (no "lose X kg", no "lower HbA1c by Y%"),
  consistent with AGENTS.md's no-gamification-of-body-metrics rule
  extended to not overpromising outcomes. `droplet`, `activity`,
  `brain-2`, `heart-plus`, `chevron-right`, `alert-circle-3` icons, all
  confirmed in the manifest first.
- Loyalty/rewards coin-balance card (Tata 1mg's NeuCoins pattern) —
  **not built.** `design/icons/icon-manifest.json` has no coin, reward,
  medal, trophy, gift, wallet or token icon anywhere across `icons`,
  `icons3d` or `other`/illustrations (checked directly, not assumed).
  CLAUDE.md is explicit: never invent an icon, never substitute a
  look-alike silently. `star`/`star-filled` exist but aren't the same
  concept and weren't substituted. This one stays blocked until a real
  icon is added to the manifest in its own PR — a design-kit change, not
  something to solve inside a screen file.

Added `HealthPlansMarketplace` to
`src/design-system/stories/RedesignPreview.stories.tsx` (individual
export + the `AllScreens` composite — 62 total stories now). `tsc
--noEmit` clean. No implementation-map.json entry (no brief/ticket, same
as every other file in this directory). Nothing committed, pushed, or
opened as a PR.

## 2026-11-11 (later still) — OTC medicine identity-layer importer

Built `backend/scripts/import_otc_medicine_dataset.py`: bulk-imports
identity-only fields (brand, composition, pack, manufacturer) from an open
dataset such as github.com/junioralive/indian-medicine-dataset into
`care_medicines`/`care_medicine_ingredients`. See
`docs/plans/catalog-expansion-2026-11-11.md` for why this exists.

The dataset has no schedule/prescription-requirement column at all — real
rows in a 2,000-row sample include prescription-only antibiotics
(Augmentin, Azithral) with nothing to distinguish them from true OTC
items. Guessing a schedule would be a patient-safety mistake, not a
cosmetic one, so every row this script writes is locked: `schedule: H1`
(strictest), `requires_prescription: true`, `active: false`, `source:
"BULK_IMPORT_UNCLASSIFIED"` — nothing imported here is buyable, searchable
to students, or shown with any schedule claim until a human reclassifies
it via the existing `PATCH /api/ops/medicines/{id}`. The script never
writes to `care_medicine_info_fields` (the pharmacist-reviewed monograph
table) — there's nothing in this dataset to put there, and Rule 2 of
`tier1-medicine-info-2026-10-22.md` ("no AI writes monograph text") is
untouched.

Dry-run against the real, full 253,973-row dataset: 211,388 rows
(~83%) parse cleanly and would import under the lock above; the rest are
skipped with a specific, printed reason (31,990 unparseable composition,
7,905 discontinued, 2,069 unparseable dosage form, 485 unmapped strength
unit, 136 out-of-range strength) rather than guessed. 12 new tests in
`backend/tests/test_import_otc_medicine_dataset.py` cover the lock,
cross-run dedup (a real bug caught and fixed: the first version only
deduped within a single run), the --confirm gate, --limit, and the
parsing rules against the dataset's actual formats. Also extended
`backend/services/demo_seed.py` with sample (clearly `SAMPLE_NOTE`-tagged)
entries for 4 new categories the founder confirmed as a real storefront
expansion: wellness-fitness, cosmetics, apparel, footwear — apparel/
footwear flagged as single-size placeholders, since the catalog model has
no size/colour variants yet. `backend/tests/test_seed_demo.py` (24 tests)
still passes. Not run against a real database — `services/db_sql.py` only
allows Postgres outside test mode, so the actual bulk import still needs
someone to run the script with a real `DATABASE_URL` set.

## Part 9 (2026-11-11): task #65's "45 Web* briefs" — almost all already real, same lesson as Part 8

Re-reading task #65 ("build flat previews for the 45 `Web*.md` briefs"), 38
had no `*Preview.tsx` here and looked unbuilt by that test. **That test is
wrong, and Part 8 already said so.** 5 previews were built before this was
caught (`WebSearchResults`, `WebLoggedOut`, `WebSignOut`, `WebClinicianApply`,
`WebPartnerApply`) — all 5 turned out, on checking, to already be real,
shipped screens (`WebSearchResultsView.tsx`, `LoggedOutView.tsx`,
`SignOutConsequences.tsx`, `PartnerApplyScreen.tsx`, the clinician apply
model). Deleted before committing; nothing redundant landed.

Checking the real `src/features/` tree (not just this folder) for the
remaining 33, confirmed via `design/screens/implementation-map.json`:

- **31 already real** — `WebAccount` (= `M2Profile` wide), `WebHome` (=
  `M2HomeRoute` wide, same pattern, `WorkspaceScreen.tsx`'s `case 'home'`),
  `WebPartnerships`, `WebWellness`, `WebConsult`, `WebLabList`, `WebLabTests`,
  `WebPrograms` (all real landing pages), `WebMyLabTests`, `WebPlans`,
  `WebReportInsights`, `WebScanVerify`, `WebVerify`, `WebDeleteAccount`,
  `WebEmergencyCard`, `WebFindCare`, `WebLeaveCampus`, `WebLostPhone`,
  `WebNewsroom`, `WebNotifications`, `WebPost`, `WebRequests`, `WebSecurity`,
  `WebSeries`, `WebSignIn`, `WebVault`, `WebVerifyGate`, `WebLegal`,
  `WebConsultSummary`, `WebAyush`, `WebPass`.
- **3 genuine gaps**, confirmed `[]` (empty) in implementation-map.json:
  `WebGuardianApprove`, `WebGuardianConsent`, `WebReportAssistant`. All
  three Tier 1. Built as flat previews, same caveat as every other Tier-1
  preview here (no reviewer sign-off claimed).

**`WebGuardianApprovePreview.tsx`** — the guardian's own page, opened from
an SMS link, no account, no shell. Keeps the brief's consent boundary
verbatim: approving gives the guardian none of the student's records,
reports, chats, or counselling/sexual-health data — only that Student Kare
keeps records and the student can book care. Passes `check-icons.mjs`
clean (1 icon, brand mark via the real `<BrandLogo>`).

**`WebGuardianConsentPreview.tsx`** — the under-18 student's own "ask a
guardian" page, inside `WebShellPreview` (`route="verify"`). Does **not**
pass `check-icons.mjs` clean (5 of the brief's 24 sidebar icons missing:
`bar-chart`, `flask`, `map-pin`, `sparkle`, `user`) — not an oversight.
`studentNav.ts`'s own doc comment records a 2026-10-23 parity decision that
consolidated several sidebar items the brief's older screenshot still
shows (My lab tests folded into Orders, Report insights moved to a card,
no separate Account item). The real shipped shell can't draw icons it no
longer has a nav item for, so a preview wrapping that real shell can't
either. Flagging this rather than drawing fake sidebar rows just to pass
the check.

**`WebReportAssistantPreview.tsx`** — "Ayush report explainer", inside
`WebShellPreview` (`route="report-insights"`). The one screen in this round
that's also clinical-AI content, same caution class as `M2MedicineInfo`'s
"no AI writes monograph text" rule. The brief's own copy already draws
that line and is kept verbatim, not extended: Ayush explains a
clinician-reviewed report ("I explain; I don't diagnose or prescribe")
and routes anything needing a decision to a real consult, rather than
answering it itself. Same `check-icons.mjs` gap as `WebGuardianConsent` and
for the same reason (missing: most of the brief's 41-icon sidebar/system
list, plus 2 of 3 small glyphs) — a representative subset of the health-
system rows and the chat, not full coverage.

Task #65 is now complete: of the original 45 `Web*.md` briefs, 6
(`WebDashboard`, `WebShop`, `WebProduct`, `WebCheckout`, `WebOrders`,
`WebReorder`) already had flat previews before this session, 36 are
already real shipped screens (not previews — the 31 above plus
`WebSearchResults`, `WebLoggedOut`, `WebSignOut`, `WebClinicianApply`,
`WebPartnerApply`, `WebAccount`, `WebHome` confirmed this round), and the
3 genuine Tier-1 gaps now have flat previews. Nothing wired, committed,
pushed, or opened as a PR this round.

## Part 10 (2026-11-11): task #65 follow-up — `CheckinReceipt`, `PrescriptionUpload`, mobile `GuardianApprove`/`GuardianConsent`; `Onboarding3` was NOT a gap

Asked to build flat previews for 5 screens said to be "confirmed genuine
gaps": `CheckinReceipt` (Tier 1), `Onboarding3` (Tier 3), `PrescriptionUpload`
(Tier 1), `GuardianApprove` (Tier 1, mobile), `GuardianConsent` (Tier 1,
mobile). Re-verified each against `implementation-map.json` and a repo-wide
grep for the brief's exact copy, same test as Parts 8–9.

**`Onboarding3` is NOT a gap — same lesson as Parts 8–9, again.** The "Ask
Ayush before you Google it." slide is already real and shipped: the third
panel (`id: 'ayush'`) of `src/features/auth/views/welcomeSlides.ts`,
rendered by `WelcomeCarouselView.tsx`'s `AyushPanel`, word-for-word matching
the brief's title and body. `implementation-map.json` already lists
`WelcomeCarouselView.tsx` / `WelcomeFlowView.tsx` / `welcomeSlides.ts`
against `Onboarding3` — not empty, which the task's instructions to read
this file first would have caught. A flat `Onboarding3Preview.tsx` was
built, discovered redundant, and **deleted before committing** — never
wired into the stories file in its final state. No files changed for this
screen.

**The other 4 are genuine gaps**, confirmed empty `[]` in
`implementation-map.json` and no matching copy anywhere under `src/`
outside this folder (`CheckinReceipt`: no "Sealed bag" / "How you were
checked" anywhere; `PrescriptionUpload`: no "registration number and
signature" / "within the last 6 months" anywhere — the existing
`uploadPrescription` handlers in Reminders/Refills route to
`RecordCaptureScreen`, a generic multi-kind vault-capture screen with none
of this brief's checklist copy, not this screen; `GuardianApprove` /
`GuardianConsent` mobile: no hits, and `SignupConsent.tsx` has a comment
confirming D4 deliberately removed the guardian branch from the real
signup flow). Built as flat previews:

**`CheckinReceiptPreview.tsx`** — the handover receipt after collecting an
order, kept verbatim from the brief: the face photo used to verify pickup
is deleted the next day, only the bag photo stays with the receipt.
`check-icons.mjs` clean (`check`, `chevron-left`).

**`PrescriptionUploadPreview.tsx`** — upload screen for a scheduled
medicine's prescription. The commerce-firewall line is kept verbatim: the
file goes to the student's vault for a pharmacist to review, never to the
shop, never used to pick what's shown (AGENTS.md rule 4). No camera/file
picker wired. `check-icons.mjs` clean (`arrow-left`, `camera`, `check`,
`file-text`, `lock-5`, `share` — the brief's "share" is the Files button's
upload-tray glyph, matching the HTML source's icon, not a social-share
icon).

**`GuardianApprovePreview.tsx` / `GuardianConsentPreview.tsx` (mobile) —
built, then removed before this landed anywhere.** **DESIGN.md §9 "D4"**
(resolved 2026-09-26) records, in these exact words, that `GuardianConsent`
and `GuardianApprove` were **"Dropped. Its whole purpose is under-18
registration"** and **"Dropped. The guardian's side of the same flow"** —
because AGENTS.md guardrail 8 makes Student Kare 18+ only, and this
brief's own title is literally "GuardianConsent — Under 18 — ask a
guardian (student)". This is recorded as a settled, dated decision
("Anyone reopening this is changing the constitution, not a screen"), not
a stale or ambiguous signal — `implementation-map.json` listing these two
as empty `[]` means "correctly never built because it's out of scope",
not "unbuilt gap", for this pair specifically.

The mobile pair was built first (same mistake as every prior round: an
empty map entry read as "build it" without checking DESIGN.md), the
conflict was caught, and both files were deleted — along with their
Storybook wiring — before anything was committed. **This also means the
`WebGuardianApprovePreview.tsx` / `WebGuardianConsentPreview.tsx` files
from Part 9 above, covering the identical dropped under-18 flow, were a
mistake under the same rule** — and those were already merged into
`development` via PR #309 earlier the same day, before this conflict
surfaced. That is now a real, open problem on the shared branch, not just
a local one: flagged to Krishna directly rather than silently reverted or
left in place, since reverting already-merged, already-public history is
a call that belongs to him. No Guardian preview — mobile or web — should
be treated as evidence this flow is in scope until that's resolved.

**Icon manifest note:** `PrescriptionUpload`'s `lock-5` is a confirmed
distinct entry in `icon-manifest.json` (the padlock-on-a-safe glyph for the
vault note), not a typo for `lock` — used as named, not substituted.

**Verification:** `npx tsc --noEmit` clean. `npx eslint --config
config/eslint.config.js src` — 0 errors, repo-wide. `npx vitest run
src/features/redesignPreview src/design-system` — 23 files, 777 tests,
all passing (re-run after removing the Guardian mobile pair). `check-icons.mjs`
clean for the 2 files that remain (`CheckinReceipt`, `PrescriptionUpload`).
`git status` before and after touched only those 2 new `*Preview.tsx`
files, this file,
`src/i18n/areas/redesignPreview.ts` and
`src/design-system/stories/RedesignPreview.stories.tsx` — nothing else in
the working tree was touched. Nothing wired into the real app shell or
router, nothing committed, nothing pushed.

## Part 11 (2026-11-12): task #67's audit was wrong — corrected; 3 genuine gaps built; Family Hub (#70)

Krishna's instruction was "build all screens which are pending and
blocked" — tasks #66 (shared/student screens), #67 (82 internal console
screens, pending a decision), and #70 (Family Hub, blocked on a standing
rejected-pattern rule). Before building #67, Krishna chose "Build in the
same flat 1mg-consumer style" (over skipping it), and for #70 chose
"Build it anyway, flagged as a concept-only preview".

**The #67 audit that produced an 11-screen build list was wrong.** That
audit's source-tree search covered `src/features/`, `src/native/` and
`src/design-system/` but never `src/screens/` — an entire directory
holding a fully-built vendor/console screen suite
(`VendorOrdersScreen.tsx`, `VendorRxReviewScreen.tsx`,
`PartnerStaffScreen.tsx`, etc., all wired through `VendorShell.tsx` /
`vendorNavigation.ts`). A background build agent assigned to 7 of the
11 "gaps" (`ClinicianApply`, `PartnerStaff`, `VendorCampIntake`,
`VendorCatalogue`, `VendorConsole`, `VendorHandover`, `VendorOrders`)
independently discovered they already existed there, which caught this
directly — the same "no `*Preview.tsx` file ≠ unbuilt" lesson as Parts
8–9, just tripped a second way by the audit script's own directory
blind spot. Independently re-verified via `ls src/screens/vendor/` and
`implementation-map.json` before trusting the agent's finding or acting
on it.

**Corrected #67 audit, this time including `src/screens/`:** built a
list of 105 console-ish briefs (Admin*, Campus*, Clinician*, Lab*,
Partner*, Vendor*, Staff*, SuperAdminConsole and related Web* briefs)
from `design/screens/briefs/`, cross-checked every one against
`implementation-map.json`. **103 of 105 already have real, non-empty
map entries — already built.** Only 2 had empty/missing entries:
`LandingClinician` and `WebLeaveCampus`. Both turned out to already be
real, shipped screens too (`LandingClinicianView.tsx` /
`LandingClinicianNativeView.tsx`; `LeaveCampusView.tsx`) — both already
documented as such in this file's own Part 8. **Task #67's genuine gap
count is zero.** No console screens were built this round; none needed
to be.

**The same corrected method, applied to the system-wide empty-map list
(25 entries), found 3 genuine gaps** — the other 22 were already
resolved this session (`CheckinReceipt`, `PrescriptionUpload`,
`WebReportAssistant`), out of scope per DESIGN.md D4
(`GuardianApprove`/`GuardianConsent`/`WebGuardianApprove`/`WebGuardianConsent`),
already real under a different name (`AyushChat`, `Devices`,
`Medications`, `ProductList`, `RefillRequest`, `StateScreens`,
`StatusMoments`, `Teleconsult`, `VitalTrends`, `LandingClinician`), or
correctly out-of-scope design-system reference pages on canvas page 8
(`FlowMap`, `IconSystem`, `IllustrationLibrary`, `MotionSystem`,
`NavSheets` — all Tier 3, same category Part 8 already called out for
`IllustrationLibrary`).

**The 3 genuine gaps all touch DESIGN.md's Tier-1 safety bullets
directly, not just a Tier-1 board placement — flagged to Krishna before
building, per the same caution as the Guardian-consent finding:**

- `AyushSheet` (Ayush phone bottom sheet, SK-020): its own HTML source
  has a working crisis-detection regex branch — `/(suicid|kill
  myself|...)/i` → a "You don't have to handle this alone" panel with
  Tele-MANAS/counsellor numbers. That's DESIGN.md's "Crisis support,
  SOS" bullet verbatim. Built as a flat preview per Krishna's call: no
  crisis-detection logic exists in `AyushSheetPreview.tsx`, the sample
  exchange shown is a fixed, hard-coded illustration of the non-crisis
  path only, and it never renders a crisis panel.
- `NewDevice` ("New phone — move your account", SK-033): its content is
  a selfie-match identity-verification step ("Capture" / "Matches your
  verified photo"), DESIGN.md's "identity verification and the gate"
  bullet. Built as a flat preview: no camera opens, no match runs,
  "Capture" and "All set" are `noop`.
- `NotificationTemplates` ("copy + rules", SK-141): a reference table of
  notification copy that includes rows for account deletion and
  clinical-report notifications (both explicit Tier-1 bullets) **and a
  "Guardian consent request" SMS row** — the exact flow DESIGN.md D4
  just dropped. Per Krishna's explicit call, `NotificationTemplatesPreview.tsx`
  drops that one row and keeps the other 6 (safety sign-in/deletion,
  verification, care, orders) — same reasoning as the
  WebGuardianApprove/WebGuardianConsent revert, just caught before
  anything was built this time instead of after.

**Task #70 (Family Hub):** net-new concept, no brief or ticket — same
footing as `LabPrep`/`DoctorCompare`/`ReferFriend`. An avatar-circle
family-member switcher (You / member name / lock icon) + "Add member",
modeled on the 1mg video reference Krishna shared. Built per his
explicit call despite the same underlying conflict that shaped the real
`FamilyCircle` screen (Part 6/7): 1mg's switcher lets one account see
another member's full record, which this product's 18+,
student-owned-record architecture (AGENTS.md rule 8) doesn't allow — so
every member except "You" shows a lock icon, which is the whole point:
it reads as "can't switch into this", never a working switch. Nothing
in `M2FamilyHubPreview.tsx` is wired.

**Icon manifest notes:** `NewDevice`'s brief-listed `circle` icon maps to
the source's per-item transfer-progress spinner, not the selfie
placeholder — rebuilt step 2 as a 4-row transfer checklist (`check` /
`circle` per row) matching the source's `rs` array (`R = ['Check-in pass
issued...', ...]`) instead of a single static line. `AyushSheet`'s
brief-listed `chevron-down` and text-glyph `check` map to the sheet's
resize-toggle pair (make taller/smaller) and the "✓ {{ m.src }}"
source-confirmation pill respectively — both were missing from the
first draft and added once `check-icons.mjs` caught them.
`NotificationTemplates`'s text-glyph `arrow-right` maps to the intro
line's "Super admin → Message templates", not any table content.

**Verification:** `npx tsc --noEmit` clean (after removing 2
accidental duplicate `preview.capture` keys — Te/Hi blocks — introduced
when adding `NewDevice`'s i18n). `npx eslint --config config/eslint.config.js
src` — 0 errors, repo-wide. `npx vitest run src/features/redesignPreview
src/design-system` — 23 files, 777 tests, all passing. `check-icons.mjs`
clean for `AyushSheet`, `NewDevice`, `NotificationTemplates`
(`M2FamilyHub` has no brief/ticket, so no check-icons entry — same as
`DoctorCompare`/`ReferFriend`; its 3 icons — `arrow-left`, `lock-5`,
`plus` — were confirmed against `icon-manifest.json` by hand). `git
status` before and after touched only the 4 new `*Preview.tsx` files,
this file, `src/i18n/areas/redesignPreview.ts` and
`src/design-system/stories/RedesignPreview.stories.tsx` — nothing else
in the working tree was touched. Nothing wired into the real app shell
or router, nothing committed, nothing pushed yet.
