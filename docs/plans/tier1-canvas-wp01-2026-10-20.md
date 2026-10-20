# WP-01 · WebPlans (the one Tier 1 screen of the public site): canvas plan

**Approved by:** _(name, date)_

**Status:** proposed. Plan only; no screen code has been written.
**Rule:** `CLAUDE.md`, `DESIGN.md` §2.3 (prices shown before commitment) and §5, `AGENTS.md`
rule 11 (prices from one source). WebPlans is Tier 1 because it states what a payment does and
does not change about care. It needs a named design reviewer **and** founder/finance plus legal
sign-off. The other nine WP-01 screens are Tier 3 and are not in this plan.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (§3a, WP-01); brief
`design/screens/briefs/WebPlans.md`; board `design/screens/source/03-student-web-public-site/WebPlans.html`.

## Summary

| Screen | Route / files today | check-icons | Data today | Blocking decisions |
|---|---|---|---|---|
| WebPlans | `/plans` · `features/landing/views/LandingPlansView.tsx`, `LandingPlansNativeView.tsx` | 0/23 · raw `<svg>` | `GET /billing/plans` (fails closed: no price if any plan is malformed) | Plan line-up and names; the ₹2,199 package; commission figures; pay-per-use "from" prices |

**Founder prices, 2026-10-20.** Student Plus **₹149/month**, Student Plus **3-month package
₹2,199**, Premium **from ₹499**. They are declared in `backend/core/settings_registry.py` as
`billing.student_plus.monthly_inr`, `billing.student_plus.quarter_package_inr` and
`billing.premium.from_monthly_inr` (public; client defaults generated into
`src/generated/settings.ts`) on the **in-flight `feat/plan-prices` branch** (worktree
`/home/claude/wt/plan-prices`, uncommitted at the time of writing). That branch also makes
`GET /billing/plans` return `priceFrom` and `packages`, adds a `PREMIUM` plan, and adds
`planPriceLabel` / `planPackageLabels` (`src/data/datasets/billingPrices.ts`). **This plan builds
on that branch and must not start until it merges.** The page never holds a price literal; the
board's ₹0 / ₹199 / ₹249 are not used.

## Board vs today

| Board section | Today | Gap |
|---|---|---|
| Public header + footer (store badges `brand-apple`, `brand-google-play`; socials `brand-instagram`, `brand-linkedin`, `brand-youtube`; `mail`, `map-pin-2`) | Own header/footer in the view; raw `<svg>` | S10 public header/footer; icons |
| Hero: "PLANS · Your records are never behind a paywall." + price chips (Basic ₹0 forever · Premium ₹199 · Care Circle ₹249) | Banner "Prices shown before you pay." + intro | Hero copy; chips must come from the API, not the board |
| Plan cards: Basic, Premium ("MOST STUDENTS"), Care Circle ("UP TO 5 PEOPLE"), Enterprise (dark, "FOR INSTITUTIONS", Custom) with benefits and CTAs | Cards from the server catalogue (Free, Student Plus, Campus, Enterprise; + Premium and packages on plan-prices) with `check` drawn as raw `<svg>` | Card layout, badge, dark institution card; `check` icon; package line |
| "Line by line." comparison table: What you get · Basic · Premium & above (same-for-everyone rows first: records, emergency card, crisis support, critical result handling, export; then differing rows: saved measurements "Last 20 / Unlimited", reminders, trend charts, lab packages, members) | **Missing** | Whole section |
| Pay per use: Lab tests from ₹319, Medicines catalogue price, Teleconsult from ₹199, Home/hostel visit from ₹499 | Section with copy only | Four price tiles have no source |
| Where your money goes: commission splits (Doctors 10%, Clinics 12–15%, Hospitals 15–20%, Vendors 15–20%) as "Provider keeps n%" bars | Copy only; comment "no commission rate is configured, so none is shown" | Bars have no source |
| What a plan never does (navy panel): "Paying changes the price. It never changes the care." | Present | Icons/illustrations |
| FAQ (5): stop paying Premium; what Care Circle shares; paying gets me seen faster; is a plan insurance; can my campus pay | 4 FAQs (records if I stop paying; seen faster; insurance; campus pays) | Care Circle FAQ; wording |
| Illustrations: `illustration-care-circle-network`, `-hostel-pin-2`, `-lock-shield-2`, `-phones-consult`, `-rupee-receipt-2`, `-verified-badge-2`; glyph `qr-sample-2`; icons `chevron-down`, `flask`, `lock-6`, `message-circle-2`, `pin`, `plus-square`, `x-2` | Missing | All, via `<Illustration>` / `<Glyph>` / `<Icon>` |

Copy found today: 31%.

## What will change

- **Layout** to the board's section order, inside the S10 public header/footer.
- **Plan cards** rendered only from `GET /billing/plans`: name, `planPriceLabel` ("₹149", "from
  ₹499"), period, `planPackageLabels` ("3-month package: ₹2,199"), benefits, CTA. Badge
  ("MOST STUDENTS") only if the reviewer keeps it and the server marks the plan; the dark
  institution card for `audience: "institution"`.
- **Comparison table** built from server plan benefits plus a fixed set of "same on every plan"
  rows (records, emergency card, crisis support, critical-result handling, export). The fixed
  rows are statements of policy, kept in i18n; differing rows only where the server catalogue
  says so (e.g. "Last 20" saved measurements is not enforced anywhere today and is not shown).
- **Pay-per-use tiles** show a "from" price only when a source exists (lowest live catalogue
  price per category from the API, or a registry setting); otherwise the tile shows the copy
  with "price shown before you confirm" and no number.
- **Commission bars** stay hidden until commission rates exist as a source (registry or
  contracts); the section keeps its copy.
- **Icons and art** per brief (22 + logo); `check` replaces the raw svg tick; FAQ uses
  `chevron-down` with `aria-expanded`.
- **Copy** in `src/i18n/areas/landing.ts` / `shopweb.ts` (en, te, hi); amounts formatted with
  `rupeeAmount` (en-IN grouping).
- **Native** `LandingPlansNativeView.tsx` gets the same data path and states (layout parity is a
  follow-up if the reviewer wants it).

## What will NOT change

- Checkout: online purchase stays the monthly Student Plus subscription only; the package and
  Premium are not sold online (plan-prices branch). Checkout refuses to start when the Razorpay
  plan amount differs from the registry — the page never promises a price checkout won't charge.
- Fail closed: one malformed plan → no prices at all, the error state with retry.
- "Care is never plan-gated" and "critical results are not prioritised by plan" are policy, not
  pricing; their wording changes only with legal sign-off.
- Rule L: nothing about a student's health appears on this page; no personalised price.

## Safety-critical elements

- Crisis line in the footer (112, Tele-MANAS 14416) stays outside any loading/error branch.
- Every price is the server's; a stale client default is never shown as a live price (registry
  defaults are for typing and fallback inside the API, not for this page).
- "Plan changes what you pay, never whether you can book" and the "never does" panel are claims
  the product must honour; each needs a test that the corresponding server path is not plan-gated
  (crisis, records export, critical results) — the page links to nothing that is.

## Data sources

| Element | Source | Status |
|---|---|---|
| Plans, prices, packages, `priceFrom` | `GET /billing/plans` ← settings registry | real once `feat/plan-prices` merges |
| Pay-per-use "from" prices | none | not connected (decision 4) |
| Commission splits | none | not connected (decision 3) |
| Comparison rows | server benefits + fixed policy rows | partial |

## States

Loading (skeleton cards, no "₹"), error (calm copy, retry, `Ref ERR-503 · WebPlans`, no price),
empty catalogue ("Plans will be listed here"), data. Static sections render in every state.

## Accessibility

Plan cards as a list with each card an `article` with its heading; price read as one string
("from ₹499 per month"); comparison as a real `<table>` with caption and header scopes, "same"
rows not distinguished by colour alone (text "Included" / "Always free"); FAQ buttons with
`aria-expanded` and controlled regions; ≥ 44 px targets; illustrations `aria-hidden` with
adjacent text; works at 320 px without horizontal scroll (table becomes stacked rows).

## Tests

Extend `features/landing/views/__tests__/LandingPlansView.test.tsx`: prices render exactly the
API values (₹149, "from ₹499", "3-month package: ₹2,199") with no literal in the component;
malformed plan → no price; error and loading show no "₹"; commission and pay-per-use numbers are
absent when there is no source; FAQ keyboard toggling. `check-icons --screen WebPlans` passes;
`LandingPlansView.tsx` moves to `screens` in the implementation map.

## Open decisions for the reviewer

1. **Line-up and names.** Board: Basic (free) / Premium / Care Circle / Enterprise. Server after
   plan-prices: Free / Student Plus / Premium / Campus / Enterprise. Which names, which cards, and
   is Care Circle (family plan, 5 members) a product at all? No backend exists for it.
2. **The ₹2,199 package.** Three monthly payments at ₹149 cost ₹447; the package is ₹2,199
   (about ₹733 a month, above Premium's ₹499 starting price). Please confirm the figure and what
   the package includes beyond the monthly plan before it is shown publicly.
3. **Commission disclosure.** Publish the board's rates (10%, 12–15%, 15–20%)? If yes, they need a
   source (settings or contracts) and legal sign-off; until then the bars stay hidden.
4. **Pay-per-use "from" prices** (₹319, ₹199, ₹499, free delivery over ₹299): compute from live
   catalogue/slots, make them settings, or drop the numbers?
5. **"MOST STUDENTS" badge**: a popularity claim needs data; keep, reword or drop?
6. **Premium benefits**: the server returns none for Premium ("not sold online yet"). Show the
   board's benefit list only once they exist, or show Premium as "coming soon" with its starting
   price?
