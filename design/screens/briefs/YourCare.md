# YourCare — Your Care overview

| | |
|---|---|
| Canvas page | 2 · Student app (mobile) |
| Platform / frame | Phone · 390×1034 |
| Tier | 2 |
| Ticket(s) | SK-012, SK-040, SK-145 |
| Picture | `design/screens/screenshots/02-student-app-mobile/YourCare.jpg` |
| Design source | `design/screens/source/02-student-app-mobile/YourCare.html` |

## Icons this screen must show (all of them)

- **Line / solid icons (7):** `activity-3`, `doctor-2`, `flask-2`, `heart-pulse-2`, `menu`, `pill-2`, `zap`
- **3D icon tiles (1):** `chart-alt--p4`
- **Small glyphs (0):** —
- **Brand mark:** `studentkare-logo`
- **Text symbols to replace with icons:** `✓` → `check`

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Where it links to

`Appointments`, `CrisisSupport`, `EmergencyCard`, `LabPackages`, `MoreHub`, `MyPass`, `PreventiveCare`, `RecordsVault`, `ReportInsights`

## States shown in the design's preview switcher

Data, First time, Offline

## Bottom bar superseded (Mobile 2.0, founder 2026-10-21)

The five-tab bar this board draws (Discover · Wellness · Ayush AI · Lab Tests / Records · Your Care) is replaced app-wide by the Mobile 2.0 pill nav (`design/screens/mobile-2-supersedes.md`, Navigation changes; `src/design-system/m2/PillNav.tsx`). Its tab-only icons (`compass`, `lock-5`, `map-pin`) are no longer required on this screen; the pill nav's icons are listed on the M2 briefs.

> Icons, glyphs and illustrations live in `design/icons/` and `design/illustrations/` — names match `design/icons/icon-manifest.json`. Verify with `node scripts/icons/check-icons.mjs --screen YourCare`.
