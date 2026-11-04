# M2Insurance — Mobile 2.0 — Insurance · policy and claims

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1480 |
| Tier | 2 |
| Ticket(s) | SK-071 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Insurance.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Insurance.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (14):** `arrow-left`, `ayush-spark`, `box`, `card-lines`, `droplet`, `heart-3`, `heart-pulse-2`, `home`, `home-2`, `plane`, `plus`, `shield-alert`, `shield-check-2`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2AskAyush`, `M2Home`, `M2Insights`, `M2Orders`, `M2Profile`, `M2ReportUpload`

## States shown in the design's preview switcher

—

## Tier

Tier 2 (cover and claims, like ClaimsHub).

## Design changes (founder, 2026-10-21)

- "Start a claim" tile runs `service-green-deep` → `service-green-shade`.

## Design changes (founder, 2026-11-04): board grows to 390×1480

- 5 fuller product cards (across 3 grid rows) need more room than the old 3 dashed placeholders. Board height moved from 1200 to 1480 (and the preview's `$preview` height to match) so the bottom nav clears the new content.

## Design changes (founder, 2026-11-04): richer "More cover" products

- "More cover" grew from 3 dashed "Not yet" placeholder tiles to 5 Tata 1mg-style product cards (Diabetes cover, Cancer cover, Personal accident, Travel abroad, Health top-up), each with a benefit line and an indicative "From ~₹…" price. This is **not** the Rule L exception used on `M2Insights`/`M2Trends` — these cards carry no clinical value at all, so there's nothing to fire the firewall on.
- Kept deliberately honest per DESIGN.md (no invented live purchase flow): since an insurance partner is still being chosen, each card's action is "Notify me" / "You're on the list" — expressing interest only, never a price the student can actually pay today. The section intro states this plainly instead of implying the covers are on sale.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `card-lines` — card with text lines, no portrait (emergency card / insurance e-card) — at: "E-card" tile
- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `plane` — aeroplane (travel abroad) — at: More cover: Travel abroad

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Insurance`.
