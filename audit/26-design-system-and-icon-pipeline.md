# 26 — Design System, Design Kit & Icon Pipeline

**New dimension, created 2026-10-17** (`main` @ `ad01230`).

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
