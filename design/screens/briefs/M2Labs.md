# M2Labs — Mobile 2.0 — Lab tests (packages by audience, doctor-ordered, collection)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1640 |
| Tier | 2 |
| Ticket(s) | SK-036 |
| Picture | `design/screens/screenshots/09-mobile-2/M2Labs.jpg` |
| Design source | `design/screens/source/09-mobile-2/M2Labs.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (13):** `arrow-left`, `bottle`, `box`, `droplet`, `dumbbell`, `heart-3`, `home`, `person-badge`, `phone`, `search`, `stetho`, `thermometer`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Profile`, `M2ReportUpload` · also: phone call (`tel:`)

## States shown in the design's preview switcher

Packages for: Everyone · Women · Men · Fitness · By concern

Each audience swaps the package list (e.g. Women: Women's wellness, PCOS panel, Iron and anaemia).

## Tier

Tier 2 (lab catalogue and booking, like LabPackages). Tier 1 part: the "Your doctor asked for a repeat test" card (a clinician order for this student).

## Missing icons

Drawn on the board but not in `design/icons/icon-manifest.json`. Do not substitute a look-alike: these need a decision (add the drawing to the kit, or merge with an existing icon through `aliases.json`).

- document with an upload arrow (upload a prescription / report) — at: quick action "Upload Rx"
- thyroid gland — at: By concern: Thyroid package
- eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- two-leaf sprout / lotus (Ayurveda, allergy) — at: By concern: Allergy panel
- female symbol ♀ — at: Women: Women's wellness package
- male symbol ♂ — at: Men: Men's wellness package
- trend line with an up-right arrow — at: Fitness: Sports fitness package
- line chart on axes — at: quick action "Reports"
- trend line (zigzag, no arrow) — at: Men: Lipid profile package

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `dumbbell`: dumbbell drawn level with flat plates; `dumbbell` is diagonal with round ends
- `heart-3`: plain heart outline
- `person-badge`: standing figure (full body check)

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Labs`.
