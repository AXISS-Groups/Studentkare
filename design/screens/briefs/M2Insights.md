# M2Insights — Mobile 2.0 — My health · Insights

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1500 |
| Tier | 1 |
| Ticket(s) | SK-047 |
| Picture | `design/screens/screenshots/09-mobile-2/M2Insights.jpg` |
| Design source | `design/screens/source/09-mobile-2/M2Insights.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (7):** `bottle`, `box`, `chevron-right`, `droplet`, `heart-3`, `home`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Orders`, `M2Profile`, `M2Trends` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon)

## States shown in the design's preview switcher

Need a look (default); In range

In range: the green card gets the ring and the list shows LDL cholesterol 92, Triglycerides 118, Vitamin B12 412 (green chips).

## Tier

Tier 1: lab values, in/out of range counts, doctor's note.

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- thyroid gland — at: By body system: Thyroid
- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav Ask Ayush orb; "Ask Ayush about this report" card

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Insights`.
