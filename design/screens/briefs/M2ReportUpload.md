# M2ReportUpload — Mobile 2.0 — Add a health document (lab report, prescription, vaccination record, discharge summary)

| | |
|---|---|
| Canvas page | 9 · Mobile 2.0 (approved 2026-10-21) |
| Platform / frame | Phone · 390×920 |
| Tier | 1 |
| Ticket(s) | SK-046, SK-047 |
| Picture | `design/screens/screenshots/10-mobile-2/M2ReportUpload.jpg` |
| Design source | `design/screens/source/10-mobile-2/M2ReportUpload.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (10):** `alert-triangle`, `arrow-left`, `camera-2`, `check`, `chevron-right`, `doc-upload`, `flask`, `hospital`, `prescription`, `syringe`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`M2Insights`, `M2Trends`, `M2Orders` (send a read prescription to a pharmacy), `M2Vaccines` (see vaccination record)

## States shown in the design's preview switcher

Kind (what are you adding: Lab report · Prescription · Vaccination record · Discharge summary); Add (pick a source, worded and iconed per kind); Read (reading…); Check (confirm the fields found, untick any); Saved (added to your record)

Kind: four tiles, each with its own icon and one-line hint; picking one sets the rest of the flow's copy and fields and moves to Add. "Change document kind" on the Add step returns here without losing the kind already picked for that session. Read: a document sheet with a scanning line, a kind-specific "Reading…" line, progress bar and a "Continue (preview)" button (the canvas preview would advance on its own after 2.6 s in a live state engine; this static preview needs the button). Check: the fields found for that kind, each with its own meta line and a status chip, "Save N to my record". Saved: green tick in a pulsing ring, "Added to your record", a kind-specific primary link (lab → "Ask a doctor to explain it" / M2Insights; prescription → "Send to a pharmacy" / M2Orders; vaccination record → "See my vaccination record" / M2Vaccines; discharge summary → "Ask a doctor to explain it" / M2Insights) and "Back to My health" (→ M2Insights).

## Tier

Tier 1: values read from a report, confirmed by the student before saving.

## Design changes (founder, 2026-10-21)

- Hero runs `service-orange-deep` → `service-orange-shade`; the done tick circle runs `service-green-deep` → `service-green-shade`.

## Design changes (founder, 2026-11-04): re-checked against Tata 1mg, no change needed

- Re-confirmed during the Tata 1mg sweep (this board was reviewed earlier and found to already match Tata's OCR confirm-before-save pattern; re-checked now that the sweep covers every screen in this canvas page, not just the first five). Source picker, scan animation, per-value confirm-and-edit with range chips, and the saved state all already match the pattern, plus the explicit "Nothing is saved until you confirm" framing Tata doesn't have. No code changes made (at that point).

## Design changes (founder, 2026-11-05): widened to more document kinds — design concept only, explicitly flagged as not-yet-approved for real reading

- **Why this is marked a concept, not a build instruction.** The actual shipped upload flow (`ReportUploadViewModel.ts`, Tier 1 decision D-M2-12, approved 2026-10-21) deliberately has **no reader at all** — the student types the values themselves — specifically so the app never pretends to read a document it isn't reading, and it's hardcoded to save only as a `LAB` record. This board's "we read it" animation was always aspirational and was never carried into the real build. Widening it to more document kinds therefore extends an aspiration, not a shipped pattern, so the board now says so directly: a standing banner on every step reads "Design concept, not yet built this way… pending the same review before any of it is real."
- **What changed.** A new first step, "Kind" (`What are you adding?`), lets the preview pick one of four document kinds before the existing Add/Read/Check/Saved steps: **Lab report** (unchanged — 8 values, lab range chips), **Prescription** (medicine, strength, "as written on the script" — explicitly never a suggested dose, only a copy of what the script already says), **Vaccination record** (vaccine, dose number, date given), **Discharge summary** (diagnosis, medicines on discharge, follow-up date — each "as written in the summary"). Picking a kind changes the hero copy, the source options (the "From a StudentKare lab" source only makes sense for lab reports, so it's hidden for the other three kinds), the fields shown on Check, and the Saved step's next-step link and destination.
- **What did not change.** The core shape (pick a source → reading animation → confirm each field individually, nothing saved until ticked and confirmed → saved) is identical across all four kinds — this is a copy/data change, not a new interaction pattern. The always-true honesty line ("Nothing is saved until you confirm") still applies to every kind.
- **Board height** grew from 390×1250 to 390×920 — the 1250 height included a lot of unused slack for every state; re-measured against the new tallest state (lab's 8-field Check step, now with the banner) and trimmed to a tight fit, verified via render (no clipping, no overflow) across all four kinds and all five steps.

## Missing icons

None. The drawings this board had with no manifest icon were drawn into the kit on 2026-10-21 (house line style) and are in the list above:

- `doc-upload` — document with an upload arrow (upload a prescription / report) — at: source "Upload a PDF"
- `prescription` — Rx symbol — at: Kind picker "Prescription"; now also drawn large (at 22px, in-tile) matching the other three kind tiles
- `syringe` — at: Kind picker "Vaccination record"
- `hospital` — at: Kind picker "Discharge summary"
- `alert-triangle` — at: the "Design concept, not yet built this way" banner shown on every step

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. The boards draw icons as inline SVG; this list names the manifest icon for each drawing. Colours: see `design/screens/mobile-2-supersedes.md`. Verify with `node scripts/icons/check-icons.mjs --screen M2ReportUpload`.
