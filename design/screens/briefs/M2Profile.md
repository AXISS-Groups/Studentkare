# M2Profile — Mobile 2.0 — Profile · documents · family

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1400 |
| Tier | 1 |
| Ticket(s) | SK-050, SK-057, SK-068 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Profile.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Profile.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (17):** `chevron-right`, `credit-card`, `doc`, `flask`, `lock-4`, `map-pin-2`, `message-circle-3`, `plus`, `plus-square`, `scan`, `settings`, `shield-2`, `sparkles`, `star`, `syringe`, `translate`, `user-5`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** `+` (in "+ Add") → `plus`

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** `chart-profile-complete-ring`

## Where it links to

`M2AskAyush`, `M2Consults`, `M2Home`, `M2Insights`, `M2Medicines`, `M2ReportUpload` · also: SOS (href `#` on the canvas; the app opens the existing SOS flow, SosBeacon)

## States shown in the design's preview switcher

Ayush can read my records on / off; Share with family on / off (marked coming soon)

## Tier

Tier 1: identity, blood group and vitals, emergency card, consent switches (Ayush can read my records, share with family).

## Design changes (founder, 2026-10-21)

- Document cards and the Student Plus tile run `-deep` → `-shade` (green, orange, rose), so the white counts and labels are AA. The emergency card keeps the danger family; its sub-line is `#FEE2E2` (5.3:1).

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `translate` — translate / language (文A) — at: settings row: Language

## Icon matching notes

Same object as the manifest icon, drawn a little differently on this board:

- `user-5`: person drawn as half-head and shoulders (share with family)

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Profile`.

## Added 2026-10-23: What's new

A "What's new" row (`sparkles`, "Changes in the app, from the team") above Help opens `M2WhatsNew` (/whats-new): the team's product update posts.
