# 26 — Design System, Design Kit & Icon Pipeline

**New dimension, created 2026-10-17** (`main` @ `ad01230`). Revalidated 2026-10-17 (revalidation 2) against `main` @ `d333afe`; the newest block below wins.

## 2026-10-17 revalidation 2 (`d333afe`)

| Element | Change since `ad01230` |
|---|---|
| Screen coverage | `implementation-map.json` maps **3** of 239 (`WebSecurity`, `WebConsultSummary`, `ClinicianLabOrder`). `icons:audit` not run (writes into `design/`) (TD-43) |
| Ratchets | `hex-colour-legacy.json` 170 → **148** files; `icon-legacy.json` 153 → **149** files (only shrinking, as designed) |
| Components | `src/design-system` 31 → 40 files: `clinician-shell/`, `data/DataTable`, `data/Timeline`, `navigation/Tabs`, `overlays/Drawer`, `primitives.tsx`, `icons/SkIcon.tsx`, `design-system.css` |
| Tokens | `design/tokens/studentkare.tokens.json` +44 lines; generated `sk-tokens.css` / `skTokens.ts` regenerated |
| New brand assets | `public/brand/sk-shield.svg`, `public/illustrations/stethoscope-3d.svg` |
| `design/` size | 88 MB, 1,623 files (unchanged, DS-03) |

### Finding: DS-06 — A second, hand-drawn icon set bypasses the icon manifest
- **Severity:** Medium
- **Status:** OPEN (new)
- **Location:** `src/design-system/icons/SkIcon.tsx` (commits `37a5a8e`, `63c11a0`, `8b5720e`, 2026-09-30). Used by `src/features/clinician/{today/ClinicianTodayView,apply/DoctorApplyView,consult-room/ConsultRoomScreen,prescribe/PrescribeScreen,queue/ClinicianQueueView}.tsx`, `src/design-system/overlays/Drawer.tsx` and `src/design-system/primitives.tsx`
- **Evidence:**
  - `SkIcon.tsx` defines its own `GLYPHS` map: 34 inline `<path>`/`<circle>`/`<rect>` shapes "copied from the canvas source". Examples are `today`, `inbox`, `flask`, `rx` and `earnings`.
  - It does not use `generated/skIconData` or `<Icon>`. The two only share a name prefix: `Icon.tsx` imports nothing from `SkIcon`.
  - It lives under `src/design-system`, so the ESLint raw-`<svg>` ratchet (screen files only) does not see it. `check-icons.mjs` validates names against `design/icons/icon-manifest.json`, not this map.
- **Problem:** `CLAUDE.md` says to draw icons only with `<Icon>`, `<Icon3d>`, `<Glyph>`, `<Illustration>` and `<BrandLogo>`, and to stop if an icon is not in the manifest ("Never invent an icon"). This file puts a parallel set behind a design-system name, so the rule can be bypassed without a lint failure.
- **Impact:** Clinician screens can pass review with icons the pipeline does not know about, and icon drift is invisible to the coverage check (TD-43).
- **Recommendation:**
  - Map each `SkIcon` glyph to a manifest icon. Add any that are missing to `design/icons/` with an alias entry, as `CLAUDE.md` requires, and replace `SkIcon` with `<Icon>`.
  - Until then, ban new imports of `SkIcon` with a lint rule, so it can only shrink.
- **Related reports:** 04, 22 (TD-43)

---

### Revalidation 1 (`ad01230`) content


## Why this needs its own report
Since the baseline, three things arrived:
- **A design kit.** `design/` holds 239 screen briefs, screenshots and HTML sources, 308 line icons, 27 3D tiles, 53 glyphs, 39 illustrations and 32 media assets. It has grown from 44 MB to 88 MB, 1,623 tracked files.
- **A generated icon module.** `src/design-system/icons/generated/skIconData.ts` is about 270 KB, built by `scripts/icons/build-icons.mjs`.
- **Rules that depend on them.** `CLAUDE.md` sets screen-building rules, ESLint enforces two of them as ratchets, CI runs a screen-coverage audit, and `src/design-system/` contains about 2.4K LOC of components plus Storybook 10.

This is now a build-time subsystem with its own CI gate, generated code and governance. Reports 02 and 05 only touched on it.

## Current state (verified)

| Element | Evidence | Assessment |
|---|---|---|
| Component library | `src/design-system/{Button,Controls,Inputs,ListRow,Sheet,States,Table,Toast,…}.tsx`, `index.ts`; Storybook (`.storybook/`, `npm run storybook`) | Good. One shared surface for web and native. |
| Icons API | `<Icon>`, `<Icon3d>`, `<Glyph>`, `<Illustration>`, `<BrandLogo>` (`src/design-system/icons/Icon.tsx`, `Icon.native.tsx`) | Good |
| Generated code freshness | `npm run icons:check` → "skIconData.ts is up to date" (run locally 2026-10-17) | Passes |
| Raw-hex ratchet | `config/eslint.config.js` `noRawHex` error, minus `config/hex-colour-legacy.json` (170 files) | Good mechanism. Raw hex in TSX down from 4,625 to 2,040. |
| Icon ratchet | ESLint `sk-icons/no-raw-svg` + `lucide-react` import ban on screen files, minus `config/icon-legacy.json` (153 files) | Good mechanism |
| Screen coverage audit | `npm run icons:audit` → `check-icons.mjs --all`; `design/screens/implementation-map.json` maps **1/239** screens; CI: `0/239 screens pass` | Blocking CI (TD-39) |
| a11y in components | axe-core over the design system and key screens (`src/test/axe.ts`, `src/design-system/__tests__/axe.test.tsx`, `src/__tests__/screensAxe.test.tsx`) | Good start. Contrast and target size are not checked under jsdom, as the team's own plan notes. |
| Storybook in CI | not built in CI | Stories may rot. 3 story files fail `tsc` locally (local `node_modules` drift). |

## Findings

### Finding: DS-01 — Coverage audit blocks CI before correctness gates
**TD-39** (authoritative in 22).

### Finding: DS-02 — "Proof of done" not achievable today
**TD-43** (authoritative in 22).

### Finding: DS-03 — Design archive inside the code repo
- **Severity:** Medium
- **Status:** OPEN (worse; supersedes the size detail of TD-33)
- **Location:** `design/` (88 MB, 1,623 files); `design/screens/source/**` HTML; media in `design/assets/` and `public/assets`
- **Evidence:** `du -sh design` = 88M (44M at baseline). There is no Git LFS.
- **Impact:** Clone and CI checkout times grow. Media and generated briefs inflate history permanently. Diffs on regenerated briefs are noisy.
- **Recommendation:** Keep `briefs/`, `icon-manifest.json`, icons and tokens in the repo, since code reads them. Move screenshots, HTML sources and media to Git LFS or an artifact bucket fetched by a script.
- **Related reports:** 02, 21

### Finding: DS-04 — Generated icon data is a 270 KB TypeScript module
- **Severity:** Low
- **Status:** OPEN (new)
- **Location:** `src/design-system/icons/generated/skIconData.ts`
- **Evidence:** One generated file holds the drawing data for every icon.
- **Impact:** If any screen imports the full map, the bundle includes all icons. Not measured.
- **Recommendation:** Check bundle output. If needed, emit per-icon modules or lazy chunks.

### Finding: DS-05 — Storybook not exercised in CI
- **Severity:** Low
- **Status:** OPEN (new)
- **Recommendation:** Add `build-storybook` (or `tsc` over `src/design-system/stories`) to a non-blocking CI job.

## What is good
- The ratchet approach ("migrating a file means removing it from the list; nothing may be added") is the right way to improve a legacy codebase incrementally.
- The design-kit README and `CLAUDE.md` give a clear, mechanical definition of done for screens.
- Components carry tests and axe checks.

Related: 04 (MVVM), 05 (code quality), 27 (i18n & a11y), 18 (CI/CD).
