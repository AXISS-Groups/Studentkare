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

- **Line / solid icons (11):** `arrow-left`, `ayush-spark`, `bookmark`, `bottle`, `bowl`, `box`, `flask`, `heart-3`, `home`, `user-5`, `walk`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-test-trend`

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Product`, `M2Profile`

## States shown in the design's preview switcher

Test: HbA1c · HDL cholesterol · Vitamin D · Haemoglobin; Graph · Table; Bookmarked on / off

Table view: one row per report, newest first (date, lab, value chip). Switching the test redraws the chart, the range bar and the badge (In range / Above / Below range).

## Tier

Tier 1: lab values over time, range bar, doctor's steps.

## Design changes (founder, 2026-11-04): Rule L exception — "Recommended for this result"

- New rail under "Your doctor's 3 steps," shown only when the selected test's latest value is out of range (HbA1c and HDL in the current mock data; nothing shown for Vitamin D or Haemoglobin while they're in range). Same product-card pattern and the same named, documented Rule L exception as `M2Insights.md`'s "Recommended for your HDL result" — see that brief for the founder's approval note; it is not a separate, independent exception. Links go to `M2Product` with no clinical value in the href.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `walk` — walking person — at: doctor's steps: Walk after lunch and dinner
- `bookmark` — bookmark — at: header bookmark button

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Trends`.
