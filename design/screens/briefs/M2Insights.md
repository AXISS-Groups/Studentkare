# M2Insights — Mobile 2.0 — My health · Insights

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1780 |
| Tier | 1 |
| Ticket(s) | SK-047 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Insights.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Insights.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (18):** `ayush-spark`, `bottle`, `box`, `check`, `chevron-right`, `droplet`, `glass`, `heart-3`, `home`, `pill-3`, `plus`, `refresh`, `skip-forward`, `stetho`, `thyroid`, `undo`, `user-5`, `walk`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Labs`, `M2Medicines`, `M2Orders`, `M2Profile`, `M2Reminders`, `M2Steps`, `M2Trends`, `M2Water` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon)

## States shown in the design's preview switcher

Need a look (default); In range

In range: the green card gets the ring and the list shows LDL cholesterol 92, Triglycerides 118, Vitamin B12 412 (green chips).

## Tier

Tier 1: lab values, in/out of range counts, doctor's note, refills due and the doctor-ordered repeat test.

## Design changes (founder, 2026-10-21)

- New "Due from your care" card pair under the doctor's note: "Refills due" (the student's refill dates, Tier 1, from `GET /refills/plans`) with "Refill in the store" → M2Medicines, and "Repeat test your doctor ordered" (from `GET /lab-orders`, Tier 1) with "Book in Lab tests" → M2Labs. The links open the store page only; the medicine or test is never passed into catalogue or commerce queries (Rule L).
- Board is now 390×1780 to fit the pair. The doctor avatar runs `service-green-soft` → `#A7F3D0` with `service-green-shade` initials (AA); "Heart and blood" uses the rose family, not red.

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
