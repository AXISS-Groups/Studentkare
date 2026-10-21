# M2Medicines — Mobile 2.0 — Medicines (order with Rx, call/chat to order, generics)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-041, SK-062, SK-065 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Medicines.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Medicines.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (26):** `arrow-left`, `arrow-right`, `ayush-spark`, `bottle`, `box`, `cart`, `chevron-right`, `doc-upload`, `droplet`, `eye`, `first-aid-kit`, `heart-3`, `home`, `message-circle`, `monitor`, `phone`, `pill-alt`, `refresh`, `search`, `sprout`, `stomach`, `sun`, `thermometer`, `trend-arrow`, `user-5`, `wind`
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

One layout (the auto-refill switch went with the refills list)

## Tier

Tier 2 (shop, like ShopHome). No personal health data on this board (Rule L): refills live on M2Insights.

## Design changes (founder, 2026-10-21)

- Rule L: "Auto-refill your regulars" (the student's prescribed medicines) is removed. In its place a plain link card, "Refills for your regular medicines — they live in My health", opens M2Insights; it shows no personal data.
- GENERICS card runs `service-green-deep` → `service-green-shade` (eyebrow `service-green-soft` on it, 4.8:1); the coin runs `#FDE68A` → `service-amber`.
- "Sexual health" tile uses the rose family, not red.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `doc-upload` — document with an upload arrow (upload a prescription / report) — at: "Order with prescription" card
- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `sprout` — two-leaf sprout / lotus (Ayurveda, allergy) — at: Categories: Ayurveda
- `stomach` — stomach — at: Categories: Stomach care
- `trend-arrow` — trend line with an up-right arrow — at: Categories: Sports and rehab

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `bottle`: skin-care tube/bottle with shoulders; same object as `bottle`
- `heart-3`: plain heart outline
- `pill-alt`: tablet strip drawn as a flat rectangle with a divider; `pill-alt` is the rounded capsule
- `refresh`: two-arc refresh (both arrowheads); `refresh` is a single arc

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Medicines`.
