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

- **Line / solid icons (11):** `ayush-spark`, `bottle`, `box`, `chevron-right`, `droplet`, `heart-3`, `home`, `refresh`, `stetho`, `thyroid`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Labs`, `M2Medicines`, `M2Orders`, `M2Profile`, `M2Trends` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon)

## States shown in the design's preview switcher

Need a look (default); In range

In range: the green card gets the ring and the list shows LDL cholesterol 92, Triglycerides 118, Vitamin B12 412 (green chips).

## Tier

Tier 1: lab values, in/out of range counts, doctor's note, refills due and the doctor-ordered repeat test.

## Design changes (founder, 2026-10-21)

- New "Due from your care" card pair under the doctor's note: "Refills due" (the student's refill dates, Tier 1, from `GET /refills/plans`) with "Refill in the store" → M2Medicines, and "Repeat test your doctor ordered" (from `GET /lab-orders`, Tier 1) with "Book in Lab tests" → M2Labs. The links open the store page only; the medicine or test is never passed into catalogue or commerce queries (Rule L).
- Board is now 390×1780 to fit the pair. The doctor avatar runs `service-green-soft` → `#A7F3D0` with `service-green-shade` initials (AA); "Heart and blood" uses the rose family, not red.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `thyroid` — thyroid gland — at: By body system: Thyroid
- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav Ask Ayush orb; "Ask Ayush about this report" card

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Insights`.
