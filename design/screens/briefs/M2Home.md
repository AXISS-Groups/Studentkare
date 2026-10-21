# M2Home — Mobile 2.0 — Home · For You (service tabs, highlights, today, shop by concern)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-034 |
| Picture | `design/screens/screenshots/09-mobile-2/M2Home.jpg` |
| Design source | `design/screens/source/09-mobile-2/M2Home.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (33):** `arrow-right`, `bottle`, `box`, `calendar-2`, `cart`, `chevron-down`, `doc`, `droplet`, `eye`, `file-check`, `first-aid-kit`, `heart`, `heart-3`, `home`, `home-2`, `lab`, `map-pin-2`, `mic`, `moon-2`, `phone`, `pill-3`, `pill-alt`, `plus`, `qr-code-2`, `refresh`, `search`, `shield`, `shield-alert`, `star`, `stetho`, `syringe`, `thermo`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-medicines-today-ring`

## Where it links to

`M2AskAyush`, `M2Consults`, `M2Insights`, `M2Insurance`, `M2Labs`, `M2Medicines`, `M2Orders`, `M2Product`, `M2Profile`, `M2ReportUpload`, `M2Vaccines` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon); phone call (`tel:`)

## States shown in the design's preview switcher

Service tab: For You · Medicines · Lab tests · Consults · Vaccines · Insurance · Campus; Highlight 1 · 2 · 3 (auto-advances every 4.2 s; dots switch)

Default picture: For You tab, highlight 1 ("Three checks, one visit"). Highlight 2 is the green GENERICS card ("Same medicine, a lower price" → M2Product); highlight 3 the orange "Upload a report from any lab" (→ M2ReportUpload). The source cycles the highlight with a timer; respect reduced motion.

## Tier

Tier 2 (home, like HomeDiscover). Tier 1 parts inside it: the "Medicines today" card (the student's own medicine and dose), the SOS button and the emergency-card tile — build those from reviewed components, not new code.

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- document with an upload arrow (upload a prescription / report) — at: search row "Upload a prescription" button; highlight 3 card
- card with text lines, no portrait (emergency card / insurance e-card) — at: On campus: Emergency card tile
- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- medicine bottle with a cross — at: Shop by concern: Vitamins
- open tray / till (price shown before you pay) — at: trust strip: "Price shown before you pay"
- plus with one diagonal stroke (generics highlight) — at: highlight 2 (GENERICS) card
- trend line with an up-right arrow — at: Shop by concern: Sports injury

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `bottle`: skin-care tube/bottle with shoulders; same object as `bottle`
- `calendar-2`: calendar with a short dash; `calendar-2` is the plain calendar
- `heart-3`: plain heart outline
- `pill-alt`: tablet strip drawn as a flat rectangle with a divider; `pill-alt` is the rounded capsule
- `refresh`: two-arc refresh (both arrowheads); `refresh` is a single arc

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Home`.
