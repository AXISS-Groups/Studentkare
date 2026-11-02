# 0006. Passport QR placeholder uses the approved canvas `qr-code` icon

- **Status:** Accepted
- **Date:** 2026-11-02
- **Deciders:** designer (approval relayed in the Phase 5 Batch A integration; name not recorded here)

## Context
`src/features/digital_id/views/HealthPassportQRScreen.tsx` shows a QR-sized graphic when no
scannable passport QR exists yet. The screen's message says so: "A scannable passport QR isn't
available yet. Nothing has been shared." No passport board exists in the canvas, so no
passport-specific drawing was available. The Lucide `QrCode` icon was replaced with the canvas
`qr-code` icon during the screen move.

## Decision
The canvas `qr-code` icon is accepted as a decorative placeholder for this unavailable state only.

- The passport QR is not a functional or scannable code. The graphic does not encode anything.
- The icon stays `aria-hidden` and keeps its 40% opacity.
- The unavailable-state message stays visible and is the only information the user receives.
- No new icon asset is created and the icon manifest is not regenerated for this decision.
- This approval does not extend to any other screen or any other use of `qr-code`.

## Consequences
- The icon must never be presented as a working QR code, and no QR-generation or sharing
  behaviour may be attached to it without a new decision.
- When a real passport QR is introduced, this placeholder is replaced and this ADR is superseded.
- Any other screen that wants a QR graphic needs its own design input.
