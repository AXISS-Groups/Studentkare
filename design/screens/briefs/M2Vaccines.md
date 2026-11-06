# M2Vaccines — Mobile 2.0 — Vaccines · record and booking

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1560 |
| Tier | 1 |
| Ticket(s) | SK-042 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Vaccines.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Vaccines.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (8):** `arrow-left`, `ayush-spark`, `box`, `check`, `heart-3`, `home`, `syringe`, `user-5`
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

Vaccine: Influenza · HPV · Hepatitis B · Typhoid; Given at the clinic · Vaccine only

Vaccine only: price note changes to "Collect it; a clinic must give it".

## Tier

Tier 1 under DESIGN.md §5: "Your vaccine record" shows the student's own doses and dates (a clinical record). The booking half is Tier 2.

## Design changes (founder, 2026-10-21)

- Hero is `service-amber-deep` → `service-amber-shade` with white text and art (the yellow-to-brown hero put dark text on a 3.1:1 end). The selected vaccine badge and "Pick a slot" use the same pair.

## Design changes (founder, 2026-11-04): "About the [vaccine] vaccine" FAQ (Tata 1mg sweep)

- New accordion between the booking card and "How it works": "Common side effects" and "Who should check with a doctor first," generic per selected vaccine (same pattern as `M2Product.md`'s "About this medicine"). This is general vaccine information, not personalised: it doesn't read the student's own record (the Tier-1 "Your vaccine record" section above is untouched), and the source line makes clear a nurse still checks against the student's own history before giving it.
- Booking is already Tier 2 per this brief's own Tier note; the record section (Tier 1) wasn't touched, so this addition proceeded under the same standing Tier-1 waiver noted on `M2Insights.md`/`M2Product.md` out of caution, even though nothing clinical or personal was added.
- Board height moved from 1400 to 1560 (div + `$preview`) for the new section; verified via render, well-clear of the bottom nav.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `ayush-spark` — eight-ray spark without a centre (Ask Ayush orb glyph in the pill nav) — at: pill nav: Ask Ayush orb

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Vaccines`.
