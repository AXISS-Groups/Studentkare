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

- **Line / solid icons (11):** `ayush-spark`, `box`, `chevron-right`, `download`, `first-aid-kit`, `heart-3`, `home`, `home-2`, `message-circle`, `scooter`, `user-5`
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

## Design changes (founder, 2026-11-04): "Need help" row + invoice link (Tata 1mg sweep)

- Active order card: a "Need help with this order?" row added under the tracking timeline, linking to Profile/Help (same destination as the header's existing "Help" button) — matches Tata's post-purchase support access.
- Past order cards: a third "Invoice" action (download icon) added next to "Buy again"/"Return" for the two purchased items (Cetirizine and ORS; Vitamin D3 60K); the lab-report item ("Complete blood count") correctly has no invoice action, since it was never a paid delivery on this board.
- Uses `message-circle` (same path as `M2Medicines.md`'s "Chat to order") and `download` from the manifest; `chevron-right` reused for the row's trailing arrow.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb
- `scooter` — delivery scooter / two-wheeler — at: live map: the rider

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Orders`.
