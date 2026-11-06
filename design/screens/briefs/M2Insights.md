# M2Insights — Mobile 2.0 — My health · Insights

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×2200 |
| Tier | 1 |
| Ticket(s) | SK-047 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Insights.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Insights.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (20):** `ayush-spark`, `bottle`, `box`, `brain`, `check`, `chevron-right`, `droplet`, `glass`, `heart-3`, `home`, `kidney`, `pill-3`, `plus`, `refresh`, `skip-forward`, `stetho`, `thyroid`, `undo`, `user-5`, `walk`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Labs`, `M2Medicines`, `M2Orders`, `M2Product`, `M2Profile`, `M2Reminders`, `M2Steps`, `M2Trends`, `M2Water` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon)

## States shown in the design's preview switcher

Need a look (default); In range

In range: the green card gets the ring and the list shows LDL cholesterol 92, Triglycerides 118, Vitamin B12 412 (green chips).

## Tier

Tier 1: lab values, in/out of range counts, doctor's note, refills due and the doctor-ordered repeat test.

## Design changes (founder, 2026-10-21)

- New "Due from your care" card pair under the doctor's note: "Refills due" (the student's refill dates, Tier 1, from `GET /refills/plans`) with "Refill in the store" → M2Medicines, and "Repeat test your doctor ordered" (from `GET /lab-orders`, Tier 1) with "Book in Lab tests" → M2Labs. The links open the store page only; the medicine or test is never passed into catalogue or commerce queries (Rule L).
- Board is now 390×1780 to fit the pair. The doctor avatar runs `service-green-soft` → `#A7F3D0` with `service-green-shade` initials (AA); "Heart and blood" uses the rose family, not red.

## Design changes (founder, 2026-11-04): board grows to 390×2200

- The new "Recommended for your HDL result" rail and the two extra "By body system" cards add roughly 400px of content. Board height moved from 1780 to 2200 (and the preview's `$preview` height to match) so the bottom nav sits below the new content instead of overlapping it.

## Design changes (founder, 2026-11-04): solid icon watermark on the recommendation cards

- Each product card in "Recommended for your HDL result" now carries a large, low-opacity filled version of its own icon as a background watermark (same manifest path as the small line icon on top, just rendered with `fill` instead of `stroke` — not a new icon). Matches the same treatment added to `M2Trends.md`'s recommendation cards and `M2Insurance.md`'s cover cards.

## Design changes (founder, 2026-11-04): Rule L exception — "Recommended for your HDL result"

- New rail between "Due from your care" and "By body system": product cards (icon, name, one-line "why", price, Add) that link to `Product.dc.html` with no clinical value in the query or href. This **intentionally crosses Rule L** (a biomarker driving a commercial recommendation) — the founder approved it as a named, documented exception for this card only, modelled on Tata 1mg's biomarker → product pattern, rather than a silent change to the firewall. Nothing else on this screen (or elsewhere in the app) links a lab value to a product; any future card like this needs its own founder sign-off and its own brief note, not a precedent read off this one.
- Framing stays calm per DESIGN.md: a sub-line states why the card appeared and that a pharmacist checks anything new against the student's existing meds; no discount badges, urgency copy, or "Buy now" styling. "Why these? Ask Ayush" routes to `M2AskAyush` for the explanation — Ayush still only explains, per its own guardrail (see `M2AskAyush.md`).
- Enforcement note: this is a UI-only exception. The Postgres-grants / repository-boundary enforcement of Rule L (`AGENTS.md`) is untouched — the recommendation card still cannot read or write clinical tables from the commerce side; it is handed a static "reason" string at render time, same as the existing "Due from your care" cards.

## Design changes (founder, 2026-11-04): fixed a render bug in the untested-system cards

- The `tested`/`untested` flags driving the two `sc-if` blocks in each "By body system" card were set as the strings `'true'`/`'false'` instead of real booleans; since any non-empty string is truthy, both blocks rendered on every card (an untested card showing an empty dots row, a tested card showing a stray "Get this tested" chip). Caught during the Tata 1mg sweep while re-rendering other screens and fixed here; verified via render that each card now shows exactly one state.

## Design changes (founder, 2026-11-04): untested systems in "By body system"

- Added two cards for panels the student hasn't had tested: "Kidney function" (`kidney`) and "Brain and nerves" (`brain`). They carry a "Get this tested" chip instead of status dots, and link straight to `M2Labs` — same Rule-L-safe pattern as "Due from your care": the href carries no clinical data, just the store page.

## Today cards (reminders ticket, approved by the founder 2026-10-21; no board)

Two cards under the hero, before the latest report, in the same card style:

- **Medicines today** (`pill-3`, teal soft tile; Tier 1, WP-07 Medications rules): each medicine's name and dose from `GET /meds/today`, "{taken} of {planned} taken today", **Taken** (`check`), **Skip** (`skip-forward`), **Undo** (`undo`) inside the server's undo window; "Reminders" → M2Reminders. Names are fine here (My health is not a store page); M2Home keeps counts only.
- **Water** (`glass`, sky soft tile): "{consumed} of {goal} ml today" and a capped bar, **+ Glass** (`plus`), **Undo** (`undo`); "Open" → M2Water. No streak, medal or score.

Both refuse offline (nothing is queued or kept on the device) and each has its own loading, error and retry.

## Steps card (Steps ticket, 2026-10-21)

- A Mobile 2.0 gradient card (`GradientHeroCard`, teal, floating `walk` glyph) under "Due from your care": "Steps today", today's number from `GET /activity/trends?period=this_week` and where it came from (From Apple Health / From Health Connect / From this phone's motion sensor / Typed by you), or "No steps for today yet" with "Connect a step source…" (phone) or "Open the phone app to count steps automatically" (web). "Open steps" → `M2Steps`.
- Steps are a wellness number, not a clinical value: no goal, ring, streak, score or praise; the card has its own loading skeleton and "couldn't load" retry, so it never blanks the page.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `thyroid` — thyroid gland — at: By body system: Thyroid
- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav Ask Ayush orb; "Ask Ayush about this report" card
- `skip-forward` — play triangle against a bar (drawn 2026-10-21 for the reminders ticket) — at: Medicines today: Skip

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Insights`.
