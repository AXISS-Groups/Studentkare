# M2MedicineInfo — Mobile 2.0 — Medicine information (look up by name or photo, who it is for)

| | |
|---|---|
| Canvas page | New · Medicine information (2026-10-22, no canvas board). Built in the Mobile 2.0 language (canvas page 9) |
| Platform / frame | Phone · 390×1800 (web phone frame and Expo); the same view reflows to one wider column on the public page `/medicine-info` and the student web shell |
| Tier | 1 (clinical content). Plan `docs/plans/tier1-medicine-info-2026-10-22.md`, approved by Krishna Chintakayala 2026-10-22 |
| Ticket(s) | Medicine information (founder request, 2026-10-22) |
| Picture | none on the canvas: screenshots of the build at `/home/claude/navy-shots/med-info/` |
| Design source | none |

## Icons this screen must show (all of them)

- **Line / solid icons (18):** `alert-triangle`, `arrow-left`, `box`, `camera-2`, `cart`, `check`, `check-circle`, `chevron-right`, `flask`, `info`, `lock`, `pill`, `prescription`, `search`, `shield-check`, `stethoscope`, `upload`, `users`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** — · **Images / videos (0):** — · **Data-driven graphics:** —

## Layout, top to bottom

1. **Hero** (`service-teal-deep`, white text AA): back (`arrow-left`, round on-hero), eyebrow "Medicine info", title "Know your medicine", one line saying only pharmacist-reviewed information is shown.
2. **Search** overlapping the hero: the M2 search field (`search`), "Search" button. Typo tolerant on the server (brand or salt). Crisis words never leave the device: the crisis card shows instead (existing `CrisisLinks`: 112 and Tele-MANAS, plus "Open crisis support").
3. **The note, always visible** (`stethoscope`, `surface-3`): "Take medicines only as prescribed by a doctor or as advised by a pharmacist. Consult a doctor before taking any medicine." + **Book a consult**; on a prescription medicine also the `prescription` "Needs a prescription" chip and **Send your prescription to a pharmacy**.
4. **Results** (search): cards with `pill`, brand, composition · form · maker, chips "Needs a prescription" (attention) and "Reviewed by a pharmacist" (`shield-check`, positive) or "Not reviewed yet" (neutral), `chevron-right`. No match: "We don't have reviewed information for this medicine yet — ask a pharmacist or doctor."
5. **Photo card**: "Take a photo" (`camera-2`), "Upload a photo" (`upload`, web), `lock` "Your photo is read once and not stored." When the reader is off: an `info` note "Reading photos isn't switched on yet…" instead of the buttons. "Type what's printed on the strip" opens a text area that runs the same matching.
6. **Confirm** (after a photo or typed text): "Which one is on your strip?", what was read (mono), candidate cards with `check` chips for what matched (name · salt · strength) and **This one**; **None of these**. Nothing is pre-selected; one match still needs a tap.
7. **The medicine**: back to search (`arrow-left`); chip (Rx attention / "No prescription needed"); brand; `flask` "Contains: …"; form · pack · maker; `shield-check` "Reviewed by a pharmacist on … · Source: …" or "From our medicine list. Not yet reviewed by a pharmacist."; the buy control (`cart` "Buy · ₹…" for OTC in stock; `prescription` "Send your prescription to a pharmacy" for Rx; "See it in the shop"; "We don't sell this medicine.").
8. **Reviewed sections** (only when reviewed): What it is used for (`check-circle`), Common side effects (`info`), Key warnings (`alert-triangle`), How to store it (`box`), each with its source and review date.
9. **Who is it for?** (`users`): a radio group of bands from settings (Baby · Child · Teenager · Adult · Older adult · Pregnant or breastfeeding, with their age ranges). The answer: for under-12 and pregnancy, `alert-triangle` "Ask a doctor or pharmacist before giving this." with **Book a consult** / **Ask a pharmacist**; the forms and strengths the reviewed labels list for that band (this medicine, then same-salt medicines, each with its buy control); otherwise "The reviewed label doesn't list a form for this age group…". Always: "This is what the label lists, not a dose…". The band never leaves the device.
10. **Same composition, other makers** (OTC only, reviewed); a prescription medicine shows "Only your prescriber can change a prescription medicine to another brand."
11. **Where this comes from** (`info`), then crisis help (112, Tele-MANAS) at the foot in every state.

## Where it links to

`M2Product` (Buy / See it in the shop), `PrescriptionUpload` / dispense flow (Send your prescription), `M2Consults` (Book a consult), `M2FindCare` pharmacies (Ask a pharmacist), `CrisisSupport`. Reached from Home search (`SearchEntry`, `SearchResults`), `M2Medicines` and `M2Product` ("About this medicine").

## States

Search: idle · loading (skeleton) · results · no match · error (reference MI-SEARCH) · crisis. Photo: reader off (not configured / unavailable) · reading · confirm · none of these / no match · no text · failed · error. Medicine: loading · reviewed · not reviewed · missing · error (MI-DETAIL). Age: none chosen · ask first · forms listed · not listed · no reviewed age information. Reduced motion: rises are instant.

## Honest data

Only `GET /api/medicine-info/*`. Monograph text appears only when a pharmacist reviewed exactly that value. No AI. No dose, frequency or mg/kg. The photo is never stored; the age band is never sent.

> Verify with `node scripts/icons/check-icons.mjs --screen M2MedicineInfo`.
