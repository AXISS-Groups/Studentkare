# M2Orders — Mobile 2.0 — Orders · live tracking and past

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1100 |
| Tier | 2 |
| Ticket(s) | SK-064 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Orders.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Orders.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (6):** `box`, `first-aid-kit`, `heart-3`, `home`, `home-2`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-order-route`

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Product`, `M2Profile`

## States shown in the design's preview switcher

Active · 1; Past

Past tab: three cards (Cetirizine and ORS · Delivered; Complete blood count · Done; Vitamin D3 60K · Picked up), each with "Buy again" and Return / See report.

## Tier

Tier 2 (orders and tracking). The handover code is a delivery code, not the check-in pass.

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- delivery scooter / two-wheeler — at: live map: the rider

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Orders`.
