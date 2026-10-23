# M2Reorder — Mobile 2.0 — Refills · One-tap reorder

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 — new screen, no canvas board (ticket "medicine refill reminders with one-tap reorder", `feat/refill-reorder`, 2026-10-23) |
| Platform / frame | Phone · 390×1500 (the second board of `/health/refills` on the web; Expo `Refills`) |
| Tier | 2 (checkout of an earlier shop order, every price shown before paying). The prescription gate only says whether an in-date e-prescription exists and routes to the existing pharmacist path; it never matches a prescription to a product (that is Tier 1, `docs/plans/tier1-refill-reorder-2026-10-23.md`) |
| Ticket(s) | Refill reminders + one-tap reorder (`feat/refill-reorder`) |
| Picture | none on the canvas; review screenshots in `/home/claude/navy-shots/refill/` |
| Design source | none; designed in code (`src/features/refills/views/M2ReorderView.tsx`); the Pay step is the shared `PayStepView` (canvas Payment / PaymentResult) |

## Icons this screen must show (all of them)

- **Line / solid icons (17):** `alert-triangle`, `arrow-left`, `bell`, `bell-off`, `check`, `clock`, `credit-card`, `doc`, `doc-upload`, `lock`, `map-pin`, `message-circle-2`, `pill-3`, `refresh`, `shield-alert`, `shopping-bag`, `stethoscope`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

All are in `design/icons/icon-manifest.json`; none was added.

## Pictures and media

- **Illustrations (0):** — · **Images / videos (0):** — · **Data-driven graphics:** —

## Layout (top to bottom)

1. **Header**: back (`arrow-left`, to Refills), eyebrow "Refills", title "Reorder", SOS (`shield-alert`).
2. **Price note** (`clock`): "Today's price and stock, checked at {time}. You pay this, not what you paid last time." After a refused stale total: "The price changed while you were here…" and the new quote.
3. **Lines** (`pill-3`): name, pack, quantity (the order's, capped at `shop.cart_line_max`), line total, each, MRP (struck) — all today's server prices. A state pill: `check` In stock (positive) or `alert-triangle` Only N in stock / Out of stock / Needs a prescription / No longer sold here (amber, never red).
   - **Needs a prescription**: "Checking your prescriptions…" → in date: "You have a prescription in date until {date}…" **Send my prescription** (`doc`); none: **Upload a prescription** (`doc-upload`), **Book a consult** (`stethoscope`); check failed: fail closed, `refresh` Try again. Never added to the total; the shop refuses it.
   - **Out of stock / too few**: "We never swap a medicine for another one…" **Tell me when it's back** (`bell`; `bell-off` Stop telling me) and **Ask a pharmacist** (`message-circle-2`, the care directory's pharmacies). No alternatives are listed.
4. **Delivery and payment** card: `map-pin` Deliver to / Pick up (the order's own delivery); `credit-card` Pay with — the last method used on this device (UPI / Card / Net banking, kind only) or "You choose on the next step".
5. **Total** (`shopping-bag`): only in-stock, non-prescription lines; **Pay ₹N** (54 px CTA) places the order with `expectedTotalPaise` and opens the shared Pay step; `lock` note: count the new pack on Refills when it arrives.

## Where it links to

`M2Refills` (back), the Pay step / PaymentResult, `M2Orders`, prescriptions (send / upload), `M2Consults`, `M2FindCare` (pharmacies), SOS.

## States

Loading · quote · partial (some lines not buyable) · nothing buyable · prescription: checking / in date / none / check failed · out of stock: watching / not watching / busy · price changed · place failed · offline (pay refused) · pay step (all its states).

## Data

Commerce only, with ids: `POST /api/orders/{id}/reorder-quote {itemIds}`, `POST /api/orders` with `expectedTotalPaise` (409 PRICE_CHANGED), payments as checkout, `POST|DELETE /api/catalog/{id}/stock-alert`. Clinical: `GET /api/refill-tracker/rx-status` (count and latest expiry only).

> Verify with `node scripts/icons/check-icons.mjs --screen M2Reorder`.
