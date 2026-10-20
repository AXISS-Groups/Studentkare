# Tier 1 screens: hard-coded colours moved onto design tokens (rule 11)

**Status:** held for review. Branch `feat/hex-tier1`, not pushed, not merged.
**Approved by (design):** _(name, date)_
**Approved by (clinical):** _(name, date)_

**Process note for the reviewer.** `CLAUDE.md` asks for a Tier 1 plan to be approved *before*
code is written. This branch was opened by the integrator with the code already applied, on the
understanding that nothing merges until both approvals above are filled in. Every swap is one
line; any row below can be reverted on its own without touching the others.

## What changed, and what did not

- **Only the source of colours changed.** No layout, copy, spacing, behaviour, icon or logic
  change. The only non-colour line added is `import { color } from '@/design-system/theme'` in
  four native views that had no token import.
- **Light theme (the default, `DEFAULT_THEME_PREFERENCE = 'light'`):** every safety-critical
  swap renders the exact same colour as before. The swap script refused any safety row whose
  token's current light value differs from the old hex.
- **Dark theme (opt-in in Appearance):** before, these hard-coded colours stayed the same in dark;
  after, a token follows the theme. 177 of 233 swaps render differently in dark, almost all of
  them because a white card, field or text that ignored the theme now uses the dark palette. 12
  of those are on safety-critical elements and are listed in **Decision 1** for you to approve or
  reject one by one.
- **Light-theme changes:** 68 swaps change the light colour slightly. **None of them is
  safety-critical.** They are neutral text, surface, border and brand-indigo (slate `#0f172a` →
  `text #131B2E`, indigo-600 `#4f46e5` → `action #3525CD`, etc.). They are listed in
  **Decision 2**.

### What counts as safety-critical here
Crisis / SOS / danger / critical red (fills, text, borders), every emergency affordance (SOS,
dispatch, cancel, call ICE, save emergency pass, unseal vault, remove emergency contact), the
identity-mismatch and match-meter colours in scan-verify, and clinical-value colours. These rows
are marked **⚠ safety** below.

### Rules used
1. **Swapped, identical in both themes:** the token's light *and* dark value equal the old hex
   (e.g. white on a red SOS fill → `on-danger-fill`, `#FFFFFF` in both; `#10B981` →
   `positive-fill`), an unreachable fallback is dropped (`var(--sk-color-text, #131B2E)` →
   `var(--sk-color-text)`), or a legacy alias is replaced by the token it already resolved to
   (`var(--emergency, #ef4444)`: `--emergency` is set by `ThemeProvider` to `danger`, so the
   `#ef4444` fallback never rendered).
2. **Swapped, identical in light, follows the theme in dark:** the token's light value equals the
   old hex and its role matches. Done only where the colour and the background it sits on move
   together (both tokens), so dark mode never puts a token colour on a hard-coded one.
3. **Swapped, light changes slightly:** neutral or brand colours mapped by role. Never on a
   safety-critical element.
4. **Not swapped, kept as hex** (listed at the end with a proposed token):
   - Tailwind status colours with no token of the same value (`#dc2626`, `#ef4444`, `#b91c1c`,
     `#991b1b`, `#fee2e2`, `#16a34a`, `#15803d`, `#d97706`, `#0369a1` …). Mapping them to
     `danger*` / `positive*` / `attention*` would change what the SOS, incident and blood-request
     screens look like, which this ticket must not do.
   - Neutrals that sit **directly on** such a kept status colour, or that host one directly
     (e.g. the slate text inside the pink SOS countdown card, the white SOS card holding the red
     SOS button). Tokenising those alone would put light dark-mode text on a light pink card.
     For that reason the SOS, incident and LifeShare screens only received rule-1 swaps.
   - QR codes and camera viewfinders: they must stay dark-on-light / dark in both themes.
     `DigitalIdNativeView.tsx` already exempts its QR this way with an `eslint-disable` comment;
     that file is unchanged.
   - Translucent scrims, glows and shadows (`rgba(...)`): there is no scrim token, and the shadow
     tokens carry their own offsets and blur, so using them would change geometry.

## Depends on the parallel token-value change

Another branch is changing token **values** to the founder's navy (#0C0494): nav, buttons,
selected states, brand panels. After it merges, rows here that use `action`, `action-hover`,
`focus`, `sidebar*`, `brand-navy`, `hero-*` and `on-hero*` will render in the new values. That
is intended. Rows using `danger`, `danger-fill`, `danger-bg`, `danger-rule`, `on-danger-fill`,
`positive`, `positive-fill`, `positive-bg`, `positive-rule` and `info` assume those status tokens
keep their current values. **Please confirm the navy change does not touch them**, or re-check
the ⚠ safety rows after it merges.

## Decision 1: safety-critical rows that change in dark mode only (12)

Light is identical for every one. In dark, each now follows its token, which is the
design-system's dark pair for that role.

| File | Line | Element | Old (both themes) | Token (dark) | Effect in dark |
|---|---:|---|---|---|---|
| `OfflineEmergencyPassLocker.tsx` | 78, 79 | Save-pass button icon and label on the `emergency` / `positive` fill | `#FFFFFF` | `on-action` `#131B2E` | Dark text on the pink `#FDA4AF` / green `#6EE7B7` fills that `emergency` / `positive` already switch to. Before, it was white on pink (about 1.9:1). |
| `Flow06EmergencyScreen.tsx` | 76 | TRIGGER 1-TAP SOS button icon | `#FFFFFF` | `on-action` `#131B2E` | Matches the button's own label, which `Button` already draws in `on-action`. Before, the icon was white and the label was dark. |
| `Flow06EmergencyScreen.tsx` | 189 | Call ICE button icon | `#FFFFFF` | `on-action` `#131B2E` | Same as above (primary button). |
| `web-pass.css` | 228, 229 | Reported history item border and fill | `#FECDD3`, `#FFF1F2` | `danger-rule` `#5B2130`, `danger-bg` `#3A1420` | A dark rose card instead of a light pink card. Its text already used tokens and was light-on-light in dark before. |
| `web-pass.css` | 280–282, 287 | 'Report misuse' button: border, fill, label, hover | `#FECDD3`, `#FFFFFF`, `#BE123C`, `#FFF1F2` | `danger-rule`, `surface`, `danger` `#FDA4AF`, `danger-bg` | The dark danger button pair. |
| `webScanVerify.css` | 1059, 1060 | Scan log 'mismatch' chip fill and text | `#FFF1F2`, `#BE123C` | `danger-bg` `#3A1420`, `danger` `#FDA4AF` | The dark danger chip pair. |

## Decision 2: rows whose light colour changes (68, none safety-critical)

These are marked **CHANGES** in the *Light* column of the per-file tables. Summary:

| Old (light) | Token (light) | Where |
|---|---|---|
| `#0f172a` slate text | `text` `#131B2E` | scanners (web + native) |
| `#475569` | `text-2` `#464555` | scanners |
| `#64748b` | `text-3` `#6B6980` | scanners (web + native), scanner search icon |
| `#f8fafc`, `#f1f5f9`, `#F7F6FF` | `surface-2` `#F2F3FF` | scanners, VerifyGate 'what you need' box, VitalTrends sync strip, scan-verify visit card |
| `#f8fafc` | `surface` `#FFFFFF` | scanner diagnostic card (white keeps the kept green finding ticks at ≥ 3:1) |
| `#e2e8f0`, `#cbd5e1` card borders, `#C7D2FE` note border | `rule` `#DAE2FD` | scanners, scan-verify offline note |
| `#cbd5e1`, `#C7C4D8` input / checkbox outlines | `rule-strong` `#918F9E` | scanner search, scan-verify inputs and checkbox. Darker; meets WCAG 1.4.11 (3:1 for a control boundary), which the old outline did not. |
| `#F1F2FA` row divider | `rule-soft` `#EEF2FF` | scan-verify log |
| `#4f46e5`, `#4F46E5`, `#2563eb` indigo / blue | `action` `#3525CD` | scanner eyebrow, tabs, buttons, icons, price; VerifyGate eyebrow; VitalTrends phone icon |
| `#4338ca` | `info` `#312E81` | scanner 'Analysing' box text |
| `#2A1EA8` | `action-hover` `#2A1DB0` | scan-verify primary hover |
| `#3525CD` input focus border | `focus` `#4F46E5` | scan-verify inputs |
| `#A9A5E0` header sub-line | `on-hero-label` `#A5B4FC` | scan-verify header |
| `#131B2E` selected pill label | `on-hero-current` `#0C0494` | scan-verify context switch |

## Per-file list of every swap

*Light* / *Dark* say whether the rendered colour changed in that theme. "same" means identical.
Line numbers are from the branch.

### `src/components/CameraAcousticRespiratoryScanner.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 74 | Record/Analyze button icons (on action fill) (×2) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 75 | Record/Analyze button label (on action fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/components/ClinicalPrescriptionStudio.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 98 | Sign & Dispatch button icons (on action / positive fill) (×2) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 99 | Sign & Dispatch button label (on action / positive fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/components/DpdpConsentManagerSimulator.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 80 | Consent scope toggle thumb (same token as design-system SwitchRow thumb) | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |

### `src/components/LiveWebcamDocScanner.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 100 | Capture button icon (on action fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 101 | Capture button label (on action fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/components/OfflineEmergencyHealthCard.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 108 | Re-Encrypt Offline button icon (on action fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 109 | Re-Encrypt Offline button label (on action fill) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/components/OfflineEmergencyPassLocker.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 78 | Save-pass button icons (on emergency / positive fill) (×2) ⚠ safety | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 79 | Save-pass button label (on emergency / positive fill) ⚠ safety | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/components/emergency/EmergencyCasualtyHandoverModal.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 37 | CASUALTY ER HANDOVER eyebrow. Was the legacy --emergency var (= danger, set by ThemeProvider); #ef4444 was only an unreachable fallback ⚠ safety | `legacy `--emergency` (= danger)` | `danger` | #BE123C / #FDA4AF | same | same |
| 44 | Vault-unsealed success box border ⚠ safety | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 45 | Vault-unsealed success tick icon ⚠ safety | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 90 | Unseal Health Vault button label (on #ef4444 fill) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/components/emergency/EmergencySosBeaconWidget.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 53 | SOS beacon card text (on red gradient) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 62 | SOS beacon heading (on red gradient) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 75 | Broadcast countdown number (on red gradient) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 99 | Stand-down button label (on red gradient) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/components/health/PrescriptionRefillRequestModal.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 36 | Refill-requested success box border | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 37 | Refill-requested success tick icon | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |

### `src/features/auth/views/VerifyGateView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 16 | Gate dialog card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 22 | Close (X) button | `#6B6980` | `text-3` | #6B6980 / #A5B1CE | same | **CHANGES** #6B6980 → #A5B1CE |
| 28 | Icon tile | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 28 | Icon tile glyph | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 33 | Eyebrow label | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 34 | Title | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 37 | Body | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 42 | 'What you need' box | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 42 | 'What you need' box border | `#EEF2FF` | `rule-soft` | #EEF2FF / #283350 | same | **CHANGES** #EEF2FF → #283350 |
| 43 | 'What you need' heading | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 44 | 'What you need' list | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 54 | Secondary button border | `#DAE2FD` | `rule` | #DAE2FD / #354161 | same | **CHANGES** #DAE2FD → #354161 |
| 54 | Secondary button fill | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 54 | Secondary button label | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 65 | Primary (verify) button fill | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 66 | Primary (verify) button label | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/features/digital_id/views/web-pass.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 31 | Pass card gradient start | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 31 | Pass card gradient end | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 32 | Pass card border: unreachable fallback removed | `token already applied; fallback unreachable` | `rule` | #DAE2FD / #354161 | same | same |
| 65 | Avatar inner ring (card-coloured gap) | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 65 | Avatar verified outer ring | `#6EE7B7` | `positive-rule` | #6EE7B7 / #2F6B57 | same | **CHANGES** #6EE7B7 → #2F6B57 |
| 75 | Verified badge dot | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 76 | Verified badge cut-out border | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 91 | User name: fallback removed | `token already applied; fallback unreachable` | `text` | #131B2E / #EEF2FF | same | same |
| 97 | User sub-line: fallback removed | `token already applied; fallback unreachable` | `text-2` | #464555 / #BCC7E2 | same | same |
| 103 | 'Verified' line: fallback removed | `token already applied; fallback unreachable` | `positive` | #047857 / #6EE7B7 | same | same |
| 192 | Pass code value: fallback removed | `token already applied; fallback unreachable` | `text` | #131B2E / #EEF2FF | same | same |
| 199 | Instructions: fallback removed | `token already applied; fallback unreachable` | `text-2` | #464555 / #BCC7E2 | same | same |
| 222 | History item card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 223 | History item border: fallback removed | `token already applied; fallback unreachable` | `rule-soft` | #EEF2FF / #283350 | same | same |
| 228 | Reported history item border ⚠ safety | `#FECDD3` | `danger-rule` | #FECDD3 / #5B2130 | same | **CHANGES** #FECDD3 → #5B2130 |
| 229 | Reported history item fill ⚠ safety | `#FFF1F2` | `danger-bg` | #FFF1F2 / #3A1420 | same | **CHANGES** #FFF1F2 → #3A1420 |
| 237 | History icon tile | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 243 | History icon glyph | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 257 | History provider: fallback removed | `token already applied; fallback unreachable` | `text` | #131B2E / #EEF2FF | same | same |
| 263 | History meta: fallback removed | `token already applied; fallback unreachable` | `text-2` | #464555 / #BCC7E2 | same | same |
| 280 | 'Report misuse' button border ⚠ safety | `#FECDD3` | `danger-rule` | #FECDD3 / #5B2130 | same | **CHANGES** #FECDD3 → #5B2130 |
| 281 | 'Report misuse' button fill ⚠ safety | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 282 | 'Report misuse' button label ⚠ safety | `#BE123C` | `danger` | #BE123C / #FDA4AF | same | **CHANGES** #BE123C → #FDA4AF |
| 287 | 'Report misuse' button hover ⚠ safety | `#FFF1F2` | `danger-bg` | #FFF1F2 / #3A1420 | same | **CHANGES** #FFF1F2 → #3A1420 |
| 312 | Security tile | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 313 | Security tile border: fallback removed | `token already applied; fallback unreachable` | `rule-soft` | #EEF2FF / #283350 | same | same |
| 317 | Security tile text: fallback removed | `token already applied; fallback unreachable` | `text` | #131B2E / #EEF2FF | same | same |
| 346 | Dialog box | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |

### `src/features/emergency/views/EmergencySosNativeView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 123 | SOS button 'SOS' label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 128 | SOS button sub-label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 201 | DISPATCH NOW label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/emergency/views/emergency.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 55 | SOS trigger button label (on red gradient) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 172 | Dispatch-now button label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/incidents/views/IncidentTriageNativeView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 190 | TRIGGER 112 SOS label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/incidents/views/incidents.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 44 | SOS trigger button label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/lifeshare/views/LifeShareNativeView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 144 | Selected blood-group pill label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 152 | Request button label (on #dc2626; white on grey when disabled, unchanged) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/lifeshare/views/lifeshare.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 94 | Selected blood-group pill label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 148 | Submit request label (on #dc2626; white on grey when disabled, unchanged) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 156 | Primary button label (on #dc2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |

### `src/features/scanners/views/MedicalScannerNativeView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 114 | Screen background | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 116 | Eyebrow | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 117 | Title | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 120 | Tab row track | `#F1F5F9` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F1F5F9 → #F2F3FF | **CHANGES** #F1F5F9 → #202A48 |
| 122 | Active tab | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 123 | Tab label | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |
| 124 | Active tab label | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 125 | Card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 125 | Card border | `#E2E8F0` | `rule` | #DAE2FD / #354161 | **CHANGES** #E2E8F0 → #DAE2FD | **CHANGES** #E2E8F0 → #354161 |
| 126 | Card title | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 128 | Search input outline (control boundary) | `#CBD5E1` | `rule-strong` | #918F9E / #56699D | **CHANGES** #CBD5E1 → #918F9E | **CHANGES** #CBD5E1 → #56699D |
| 128 | Search input fill | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 129 | Search button | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 130 | Search button label | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 131 | Medicine result card | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 131 | Medicine result card border | `#E2E8F0` | `rule` | #DAE2FD / #354161 | **CHANGES** #E2E8F0 → #DAE2FD | **CHANGES** #E2E8F0 → #354161 |
| 133 | Medicine brand name | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 135 | Medicine description | `#475569` | `text-2` | #464555 / #BCC7E2 | **CHANGES** #475569 → #464555 | **CHANGES** #475569 → #BCC7E2 |
| 136 | Upload area | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 136 | Upload area dashed border | `#CBD5E1` | `rule` | #DAE2FD / #354161 | **CHANGES** #CBD5E1 → #DAE2FD | **CHANGES** #CBD5E1 → #354161 |
| 137 | Upload title | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 138 | Upload hint | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |

### `src/features/scanners/views/MedicalScannerWebView.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 66 | Search field icon | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |
| 85 | Upload icon | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 116 | Report upload icon | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 123 | Analysing spinner | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 131 | AI sparkles icon | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |

### `src/features/scanners/views/scanners.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 5 | Scanner container | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 6 | Scanner container border | `#E2E8F0` | `rule` | #DAE2FD / #354161 | **CHANGES** #E2E8F0 → #DAE2FD | **CHANGES** #E2E8F0 → #354161 |
| 19 | Eyebrow | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 27 | Title | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 33 | Subtitle | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |
| 40 | Tab track | `#F1F5F9` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F1F5F9 → #F2F3FF | **CHANGES** #F1F5F9 → #202A48 |
| 57 | Tab label | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |
| 63 | Active tab | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 64 | Active tab label | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 79 | Search bar | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 80 | Search bar outline (control boundary) | `#CBD5E1` | `rule-strong` | #918F9E / #56699D | **CHANGES** #CBD5E1 → #918F9E | **CHANGES** #CBD5E1 → #56699D |
| 90 | Search input text | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 97 | Search button | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 98 | Search button label | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 111 | Upload box | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 112 | Upload box dashed border | `#CBD5E1` | `rule` | #DAE2FD / #354161 | **CHANGES** #CBD5E1 → #DAE2FD | **CHANGES** #CBD5E1 → #354161 |
| 121 | Upload box hover border | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 137 | Upload box hint | `#475569` | `text-2` | #464555 / #BCC7E2 | **CHANGES** #475569 → #464555 | **CHANGES** #475569 → #BCC7E2 |
| 151 | Results heading | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 156 | Medicine card | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 157 | Medicine card border | `#E2E8F0` | `rule` | #DAE2FD / #354161 | **CHANGES** #E2E8F0 → #DAE2FD | **CHANGES** #E2E8F0 → #354161 |
| 172 | Medicine brand name | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 187 | Medicine description | `#475569` | `text-2` | #464555 / #BCC7E2 | **CHANGES** #475569 → #464555 | **CHANGES** #475569 → #BCC7E2 |
| 193 | Price | `#4F46E5` | `action` | #3525CD / #A5B4FC | **CHANGES** #4F46E5 → #3525CD | **CHANGES** #4F46E5 → #A5B4FC |
| 203 | 'Analysing' box | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 205 | 'Analysing' box text (info on surface-3) | `#4338CA` | `info` | #312E81 / #C7D2FE | **CHANGES** #4338CA → #312E81 | **CHANGES** #4338CA → #C7D2FE |
| 212 | Diagnostic card (surface, not surface-2: keeps the kept #16a34a finding ticks at >= 3:1) | `#F8FAFC` | `surface` | #FFFFFF / #171F38 | **CHANGES** #F8FAFC → #FFFFFF | **CHANGES** #F8FAFC → #171F38 |
| 213 | Diagnostic card border | `#E2E8F0` | `rule` | #DAE2FD / #354161 | **CHANGES** #E2E8F0 → #DAE2FD | **CHANGES** #E2E8F0 → #354161 |
| 227 | Diagnostic heading | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 242 | Diagnostic section labels | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |
| 260 | Finding list items | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 265 | Impression box | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 266 | Impression box border | `#CBD5E1` | `rule` | #DAE2FD / #354161 | **CHANGES** #CBD5E1 → #DAE2FD | **CHANGES** #CBD5E1 → #354161 |
| 274 | Impression text | `#0F172A` | `text` | #131B2E / #EEF2FF | **CHANGES** #0F172A → #131B2E | **CHANGES** #0F172A → #EEF2FF |
| 279 | Reference note | `#64748B` | `text-3` | #6B6980 / #A5B1CE | **CHANGES** #64748B → #6B6980 | **CHANGES** #64748B → #A5B1CE |

### `src/screens/emergency/EmergencyContactsSetupScreen.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 89 | Contact card. --surface-card is defined nowhere, so #fff was what rendered | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 99 | Remove-contact button. Was the legacy --emergency var (= danger); #ef4444 was an unreachable fallback ⚠ safety | `legacy `--emergency` (= danger)` | `danger` | #BE123C / #FDA4AF | same | same |

### `src/screens/emergency/Flow06EmergencyScreen.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 76 | TRIGGER 1-TAP SOS button icon. Button variant=danger draws its label in on-action; icon now matches ⚠ safety | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 101 | LifeShare card droplet icon ⚠ safety | `#E11D48` | `danger-fill` | #E11D48 / #E11D48 | same | same |
| 189 | Call ICE button icon (primary button; label already on-action) ⚠ safety | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |

### `src/screens/health/VitalTrendsTelemetryScreen.tsx`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 45 | Device-sync strip. --surface-subtle is defined nowhere, so #f8fafc was what rendered | `#F8FAFC` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F8FAFC → #F2F3FF | **CHANGES** #F8FAFC → #202A48 |
| 47 | Phone (device) icon | `#2563EB` | `action` | #3525CD / #A5B4FC | **CHANGES** #2563EB → #3525CD | **CHANGES** #2563EB → #A5B4FC |
| 78 | Telemetry log success tick | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |

### `src/theme/styles/webScanVerify.css`

| Line | Element | Old | Token | Token now (light / dark) | Light | Dark |
|---:|---|---|---|---|---|---|
| 89 | Page background | `#FAF8FF` | `canvas` | #FAF8FF / #0E1428 | same | **CHANGES** #FAF8FF → #0E1428 |
| 94 | Page text | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 105 | Console sidebar | `#283044` | `sidebar` | #283044 / #1A2033 | same | **CHANGES** #283044 → #1A2033 |
| 137 | Sidebar brand name | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 150 | Sidebar partner line | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 165 | Sidebar section label | `#A9A5E0` | `sidebar-ink-3` | #A9A5E0 / #A9A5E0 | same | same |
| 178 | Sidebar link | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 190 | Sidebar link text | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 194 | Sidebar link icon | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 195 | Sidebar link icon stroke | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 201 | Sidebar link hover | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 205 | Sidebar link hover text | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 209 | Sidebar link hover icon | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 210 | Sidebar link hover icon stroke | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 215 | Sidebar current page fill | `#4F46E5` | `sidebar-active` | #4F46E5 / #4F46E5 | same | same |
| 216 | Sidebar current page | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 222 | Sidebar current page text | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 228 | Sidebar current page icon | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 229 | Sidebar current page icon stroke | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 239 | Sidebar count badge ⚠ safety | `#E11D48` | `danger-fill` | #E11D48 / #E11D48 | same | same |
| 245 | Sidebar count badge number ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 263 | Sidebar help link | `#C3C0FF` | `sidebar-ink-2` | #C3C0FF / #C3C0FF | same | same |
| 272 | Sidebar help link hover | `#FFFFFF` | `sidebar-ink` | #FFFFFF / #EEF2FF | same | **CHANGES** #FFFFFF → #EEF2FF |
| 287 | Header bar | `#1E1B4B` | `brand-navy` | #1E1B4B / #0B1020 | same | **CHANGES** #1E1B4B → #0B1020 |
| 305 | Header title | `#FFFFFF` | `on-hero` | #FFFFFF / #FFFFFF | same | same |
| 322 | Network pill text | `#FFFFFF` | `on-hero` | #FFFFFF / #FFFFFF | same | same |
| 328 | Online pill border | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 349 | Header sub-line | `#A9A5E0` | `on-hero-label` | #A5B4FC / #A5B4FC | **CHANGES** #A9A5E0 → #A5B4FC | **CHANGES** #A9A5E0 → #A5B4FC |
| 369 | Context switch button label | `#C7D2FE` | `on-hero-2` | #C7D2FE / #C7D2FE | same | same |
| 376 | Context switch button hover | `#FFFFFF` | `on-hero` | #FFFFFF / #FFFFFF | same | same |
| 380 | Context switch selected pill | `#FFFFFF` | `hero-current` | #FFFFFF / #FFFFFF | same | same |
| 381 | Context switch selected label | `#131B2E` | `on-hero-current` | #0C0494 / #0C0494 | **CHANGES** #131B2E → #0C0494 | **CHANGES** #131B2E → #0C0494 |
| 492 | Primary button | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 496 | Primary button label | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 506 | Primary button hover | `#2A1EA8` | `action-hover` | #2A1DB0 / #C7D2FE | **CHANGES** #2A1EA8 → #2A1DB0 | **CHANGES** #2A1EA8 → #C7D2FE |
| 510 | Primary button disabled fill | `#DAE2FD` | `action-soft` | #DAE2FD / #2E3862 | same | **CHANGES** #DAE2FD → #2E3862 |
| 511 | Primary button disabled label | `#6B6980` | `text-3` | #6B6980 / #A5B1CE | same | **CHANGES** #6B6980 → #A5B1CE |
| 528 | Pass-code input outline (control boundary) | `#C7C4D8` | `rule-strong` | #918F9E / #56699D | **CHANGES** #C7C4D8 → #918F9E | **CHANGES** #C7C4D8 → #56699D |
| 533 | Pass-code input fill | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 534 | Pass-code input text | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 539 | Pass-code input focus border | `#3525CD` | `focus` | #4F46E5 / #A5B4FC | **CHANGES** #3525CD → #4F46E5 | **CHANGES** #3525CD → #A5B4FC |
| 552 | Code button (disabled) | `#DAE2FD` | `action-soft` | #DAE2FD / #2E3862 | same | **CHANGES** #DAE2FD → #2E3862 |
| 553 | Code button label (disabled) | `#6B6980` | `text-3` | #6B6980 / #A5B1CE | same | **CHANGES** #6B6980 → #A5B1CE |
| 558 | Code button (enabled) | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 559 | Code button label (enabled) | `#FFFFFF` | `on-action` | #FFFFFF / #131B2E | same | **CHANGES** #FFFFFF → #131B2E |
| 574 | Link button | `#3525CD` | `action` | #3525CD / #A5B4FC | same | **CHANGES** #3525CD → #A5B4FC |
| 605 | Field label | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 612 | Text input outline (control boundary) | `#C7C4D8` | `rule-strong` | #918F9E / #56699D | **CHANGES** #C7C4D8 → #918F9E | **CHANGES** #C7C4D8 → #56699D |
| 617 | Text input fill | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 618 | Text input text | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 622 | Text input focus border | `#3525CD` | `focus` | #4F46E5 / #A5B4FC | **CHANGES** #3525CD → #4F46E5 | **CHANGES** #3525CD → #A5B4FC |
| 633 | Checkbox label | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 646 | Checkbox box | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 647 | Checkbox outline (control boundary) | `#C7C4D8` | `rule-strong` | #918F9E / #56699D | **CHANGES** #C7C4D8 → #918F9E | **CHANGES** #C7C4D8 → #56699D |
| 652 | Checkbox checked fill | `#047857` | `positive` | #047857 / #6EE7B7 | same | **CHANGES** #047857 → #6EE7B7 |
| 653 | Checkbox checked border | `#047857` | `positive` | #047857 / #6EE7B7 | same | **CHANGES** #047857 → #6EE7B7 |
| 685 | Student card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 686 | Student card border | `#EEF2FF` | `rule-soft` | #EEF2FF / #283350 | same | **CHANGES** #EEF2FF → #283350 |
| 716 | 'Verified' tag on student card | `#047857` | `positive` | #047857 / #6EE7B7 | same | **CHANGES** #047857 → #6EE7B7 |
| 722 | Student name | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 728 | Student roll number | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 734 | Student date | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 741 | Visit card | `#F7F6FF` | `surface-2` | #F2F3FF / #202A48 | **CHANGES** #F7F6FF → #F2F3FF | **CHANGES** #F7F6FF → #202A48 |
| 750 | Visit title | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 756 | Visit sub-line | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 823 | Photo-compare label | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 839 | Match meter heading | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 853 | Match meter fill ⚠ safety | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 905 | Success card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 919 | Success badge ⚠ safety | `#10B981` | `positive-fill` | #10B981 / #10B981 | same | same |
| 994 | Flag button label when active (on #DC2626) ⚠ safety | `#FFFFFF` | `on-danger-fill` | #FFFFFF / #FFFFFF | same | same |
| 1007 | Scan log card | `#FFFFFF` | `surface` | #FFFFFF / #171F38 | same | **CHANGES** #FFFFFF → #171F38 |
| 1008 | Scan log card border | `#EEF2FF` | `rule-soft` | #EEF2FF / #283350 | same | **CHANGES** #EEF2FF → #283350 |
| 1015 | Scan log title | `#464555` | `text-2` | #464555 / #BCC7E2 | same | **CHANGES** #464555 → #BCC7E2 |
| 1025 | Scan log row divider | `#F1F2FA` | `rule-soft` | #EEF2FF / #283350 | **CHANGES** #F1F2FA → #EEF2FF | **CHANGES** #F1F2FA → #283350 |
| 1036 | Scan log name | `#131B2E` | `text` | #131B2E / #EEF2FF | same | **CHANGES** #131B2E → #EEF2FF |
| 1042 | Scan log time | `#6B6980` | `text-3` | #6B6980 / #A5B1CE | same | **CHANGES** #6B6980 → #A5B1CE |
| 1054 | Scan log 'ok' chip fill | `#ECFDF5` | `positive-bg` | #ECFDF5 / #0F2E26 | same | **CHANGES** #ECFDF5 → #0F2E26 |
| 1055 | Scan log 'ok' chip text | `#047857` | `positive` | #047857 / #6EE7B7 | same | **CHANGES** #047857 → #6EE7B7 |
| 1059 | Scan log 'mismatch' chip fill ⚠ safety | `#FFF1F2` | `danger-bg` | #FFF1F2 / #3A1420 | same | **CHANGES** #FFF1F2 → #3A1420 |
| 1060 | Scan log 'mismatch' chip text ⚠ safety | `#BE123C` | `danger` | #BE123C / #FDA4AF | same | **CHANGES** #BE123C → #FDA4AF |
| 1067 | Rules card | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 1074 | Rules card text | `#312E81` | `info` | #312E81 / #C7D2FE | same | **CHANGES** #312E81 → #C7D2FE |
| 1111 | Offline note | `#EEF2FF` | `surface-3` | #EEF2FF / #2E3862 | same | **CHANGES** #EEF2FF → #2E3862 |
| 1112 | Offline note border | `#C7D2FE` | `rule` | #DAE2FD / #354161 | **CHANGES** #C7D2FE → #DAE2FD | **CHANGES** #C7D2FE → #354161 |
| 1116 | Offline note text | `#312E81` | `info` | #312E81 / #C7D2FE | same | **CHANGES** #312E81 → #C7D2FE |

## Not swapped: kept as hex, with the token each would need

Nothing in this section was changed. It is the work list for a later, reviewed ticket.

### Needs a design decision (a token exists, but its value differs, so the screen would look different)

| Old colours | Role | Proposed token (current light value) | Files |
|---|---|---|---|
| `#dc2626`, `#ef4444`, `#b91c1c`, `#991b1b`, `#7f1d1d` | SOS / crisis fills and text | `danger-fill` `#E11D48` (fills), `danger` `#BE123C` (text) | emergency.css, EmergencySosNativeView, EmergencySosWebView, EmergencySosBeaconWidget, incidents.css, IncidentTriageNativeView, IncidentTriageWebView, lifeshare.css, LifeShareNativeView, LifeShareWebView, EmergencyCasualtyHandoverModal (button fill), webScanVerify.css (reject / flag buttons) |
| `#fee2e2`, `#fef2f2`, `#fff5f5`, `#ffe4e6` | crisis tints | `danger-bg` `#FFF1F2` | same files, plus scanners error banners |
| `#fecaca`, `#fca5a5`, `#FDA4AF`, `#FB7185` | crisis borders | `danger-rule` `#FECDD3` | same files, Flow06 LifeShare card |
| `#9F1239`, `#881337`, `#fca5a5` / `#fecaca` text on red | crisis text | `danger` `#BE123C`; `on-danger-fill` for text on a red fill | webScanVerify.css stop card, Flow06, EmergencySosBeaconWidget |
| `#16a34a`, `#15803d`, `#166534`, `#14532d`, `#065f46`, `#34d399`, `#A7F3D0` | dispatched / sent / open / confidence | `positive` `#047857`, `positive-fill` `#10B981` | emergency views, incidents, lifeshare, scanners, VitalTrends, webScanVerify header pill |
| `#bbf7d0`, `#f0fdf4`, `#dcfce7` | success tints | `positive-rule` `#6EE7B7`, `positive-bg` `#ECFDF5` | emergency views, scanners |
| `#d97706`, `#ea580c`, `#F59E0B`, `#FBBF24`, `#FDE68A`, `#FCD34D`, `#92400E`, `#78350F`, `#FFFBEB` | medium / high severity, offline and warning callouts | `attention` `#B45309`, `attention-bg` `#FFFBEB` | incidents (severity pills), webScanVerify.css (warn callout, alert card, offline alert, offline pill) |
| `#065F46` | accept-button hover | `positive` has no hover step; needs `positive-hover` | webScanVerify.css |
| `#0369a1` / `#e0f2fe`, `#1e40af` / `#dbeafe` | category tags, "dispatched" tag, PRIMARY contact badge | `info` `#312E81` on `surface-3` `#EEF2FF` | scanners (web + native), incidents.css, EmergencyContactsSetupScreen |
| Slate neutrals (`#0f172a`, `#334155`, `#475569`, `#64748b`, `#94a3b8`, `#cbd5e1`, `#e2e8f0`, `#f1f5f9`, `#f8fafc`, `#ffffff`) and indigo `#4f46e5` | text, surfaces, borders, buttons **on SOS / incident / LifeShare screens** | `text*`, `surface*`, `rule*`, `action` | emergency, incidents, lifeshare (web + native). Kept only because they host or sit on the kept crisis colours above; they should move in the same ticket as the crisis colours. Same for the scanner native diagnostic card (it holds the green confidence text). |
| `#E5E7F2` | face-match meter track | `rule` `#DAE2FD` or `neutral-bg` `#F2F3F9` | webScanVerify.css |

### Needs a new token (no token exists for the role)

| Old colours | Role | Proposed new token | Files |
|---|---|---|---|
| `#FFFFFF` + `#131B2E` / `#000000` / `#111827` | QR code light and dark modules (must not invert in dark) | `qr-light`, `qr-dark` (fixed in both themes) | web-pass.css, OfflineEmergencyHealthCard.tsx; DigitalIdNativeView.tsx already exempts its QR with `eslint-disable` |
| `#111827`, `#2A2F55` → `#0B1020`, `#818CF8`, `#A5B4FC`, `#C7D2FE`, `#F0F4FF`, `#4b5563`, `#9ca3af`, overlay `#ffffff` | camera viewfinder, reticle, laser line, shutter, hint text | `camera-bg`, `camera-accent`, `on-camera` | LiveWebcamDocScanner.tsx, webScanVerify.css |
| `#818CF8` → `#3525CD`, `#6366F1` → `#312E81`, initials `#FFFFFF` | avatar / photo placeholder gradient | `avatar-from`, `avatar-to`, `on-avatar` | web-pass.css, webScanVerify.css |
| `#131B2E` + `#FFFFFF` | toast (inverse surface) | `inverse-surface`, `on-inverse` | web-pass.css, webScanVerify.css |
| `#ef4444`, `#3b82f6`, `#10b981`, `#8b5cf6`, `#f59e0b` | per-vital accent colour (heart rate, BP, SpO2, sleep, temperature) | categorical `chart-1` … `chart-5`. **Clinical review needed:** heart rate in red reads as a danger signal, and DESIGN.md says vitals are never red. | VitalTrendsTelemetryScreen.tsx |
| `#FECDD3` fill + `#FFFFFF` label | disabled flag button | `danger-soft` / `on-danger-soft` | webScanVerify.css |
| `#fff` fill with red label | white pill buttons on the red SOS card | `on-danger-fill` used as a fill, or a `danger-pill` token | EmergencySosBeaconWidget.tsx |
| `rgba(...)` | scrims, glows, card shadows, translucent tints on red / navy | `scrim`; shadow tokens exist (`--sk-shadow-card/float/sheet`) but have their own offsets and blur | all files with `rgba` |

## Legacy list

`config/hex-colour-legacy.json`: **116 → 110**. Removed because no hex remains:
`CameraAcousticRespiratoryScanner.tsx`, `ClinicalPrescriptionStudio.tsx`,
`DpdpConsentManagerSimulator.tsx`, `OfflineEmergencyPassLocker.tsx`,
`health/PrescriptionRefillRequestModal.tsx`, `auth/views/VerifyGateView.tsx`. Every other batch
file stays on the list (or, for CSS, keeps hex) for the reasons above. Nothing was added.

## Checks run on the branch

`npx tsc --noEmit` and `-p config/tsconfig.native.json`: clean. ESLint on every changed TS/TSX
file: clean. `npm run lint:ratchet`: passes (110). `npm run tokens:check`: up to date. Full
`npx vitest run`: 244 files, 2761 tests passed. `var(--sk-color-…)` passed to a lucide icon's `color` prop
renders in Chromium (checked headless; the repo already does this in
`IntegratedTeleconsultSoapScribe.tsx`). `sk-tokens.css` is imported globally from `main.tsx`, so
every `var(--sk-color-…)` used in these CSS files is defined.
