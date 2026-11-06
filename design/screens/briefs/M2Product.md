# M2Product — Mobile 2.0 — Medicine detail · generics

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×1620 |
| Tier | 1 |
| Ticket(s) | SK-062 |
| Picture | `design/screens/screenshots/10-mobile-2/M2Product.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2Product.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (6):** `arrow-left`, `cart`, `chevron-down`, `flask`, `minus`, `plus`
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

## Design changes (founder, 2026-11-04): "Often added with this" cross-sell (Tata 1mg sweep)

- New section between "Same composition, other makers" and "About this medicine": 2 companion products (ORS rehydration sachet, Vitamin C effervescent), each with a pre-checked box, price and a running "N selected · total" bar with "Add selected". This is a **plain product-to-product cross-sell**, not a repeat of the Insights/Trends Rule L exception — nothing here reads a clinical value or a lab result to pick the companions, and the sub-line says so directly ("nothing here is suggested from your reports"), so Rule L's firewall is not crossed and this did not need a separate named exception.
- This screen is Tier 1 for the medicine content already on it (dosage, side effects, interactions) — unchanged by this edit. Per the founder's standing instruction for this sweep ("no rules built like Tata" on the Tier-1 gate, given when approving the Insights/Trends Rule L exception), this addition proceeded under that same waiver rather than waiting on a separate named-reviewer sign-off; it is called out here, same as on `M2Insights.md`, rather than left undocumented.
- Icon watermark treatment applied to the two companion-item tiles, matching the other reworked screens (same manifest paths, no new icons).
- Board height moved from 1300 to 1620 (div + `$preview`) so the new section doesn't push "About this medicine" under the sticky "Add to cart" bar — verified via render, 39px clearance.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `minus` — minus sign "−" on the quantity stepper (One fewer): the board sets it as text; build it with `<Icon name="minus">` (and `plus` for One more)

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2Product`.
