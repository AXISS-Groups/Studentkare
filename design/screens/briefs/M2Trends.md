# M2Trends — Mobile 2.0 — Trends · each test over time

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1300 |
| Tier | 1 |
| Ticket(s) | SK-045, SK-047 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Trends.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Trends.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (10):** `arrow-left`, `ayush-spark`, `bookmark`, `bowl`, `box`, `flask`, `heart-3`, `home`, `user-5`, `walk`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-test-trend`

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Profile`

## States shown in the design's preview switcher

Test: HbA1c · HDL cholesterol · Vitamin D · Haemoglobin; Graph · Table; Bookmarked on / off

Table view: one row per report, newest first (date, lab, value chip). Switching the test redraws the chart, the range bar and the badge (In range / Above / Below range).

## Tier

Tier 1: lab values over time, range bar, doctor's steps.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `walk` — walking person — at: doctor's steps: Walk after lunch and dinner
- `bookmark` — bookmark — at: header bookmark button

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Trends`.
