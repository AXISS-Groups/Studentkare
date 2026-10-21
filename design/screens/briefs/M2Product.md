# M2Product — Mobile 2.0 — Medicine detail · generics

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1300 |
| Tier | 1 |
| Ticket(s) | SK-062 |
| Picture | `design/screens/screenshots/09-mobile-2/M2Product.jpg` |
| Design source | `design/screens/source/09-mobile-2/M2Product.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (5):** `arrow-left`, `cart`, `chevron-down`, `flask`, `plus`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** `+` → `plus`, `−` → no manifest icon (see Missing icons)

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2Medicines`, `M2Orders`, `M2ReportUpload`

## States shown in the design's preview switcher

Quantity 1–9 (− / +); About: What it is used for · Common side effects · Do not take with (one open at a time, or none)

## Tier

Tier 1 under DESIGN.md §5: it shows a medicine name with composition and strength, "Prescription needed", uses, side effects, "do not take with" and generic substitution — clinical content. (The old ProductDetail board, a wellness item, was Tier 2.) Plan first and wait for a named reviewer.

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- minus sign "−" used as text on the quantity stepper (One fewer)

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Product`.
