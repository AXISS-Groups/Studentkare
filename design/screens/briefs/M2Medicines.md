# M2Medicines — Mobile 2.0 — Medicines (order with Rx, call/chat to order, generics, auto-refill)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-041, SK-062, SK-065 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Medicines.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Medicines.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (20):** `arrow-left`, `arrow-right`, `bottle`, `box`, `cart`, `droplet`, `eye`, `first-aid-kit`, `heart-3`, `home`, `message-circle`, `monitor`, `phone`, `pill-alt`, `refresh`, `search`, `sun`, `thermometer`, `user-5`, `wind`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Product`, `M2Profile`, `M2ReportUpload` · also: phone call (`tel:`)

## States shown in the design's preview switcher

Auto-refill on; Auto-refill off

## Tier

Tier 2 (shop, like ShopHome). Tier 1 part: "Auto-refill your regulars" lists the student's own prescribed medicines (cf. RefillRequest, Tier 1).

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- document with an upload arrow (upload a prescription / report) — at: "Order with prescription" card
- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- two-leaf sprout / lotus (Ayurveda, allergy) — at: Categories: Ayurveda
- stomach — at: Categories: Stomach care
- trend line with an up-right arrow — at: Categories: Sports and rehab

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `bottle`: skin-care tube/bottle with shoulders; same object as `bottle`
- `heart-3`: plain heart outline
- `pill-alt`: tablet strip drawn as a flat rectangle with a divider; `pill-alt` is the rounded capsule
- `refresh`: two-arc refresh (both arrowheads); `refresh` is a single arc

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Medicines`.
