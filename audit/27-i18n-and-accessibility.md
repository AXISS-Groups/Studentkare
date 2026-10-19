# 27 — Internationalisation & Accessibility

**New dimension, created 2026-10-17** (`main` @ `ad01230`). Revalidated 2026-10-17 (revalidation 2) against `main` @ `d333afe`; the newest block below wins.

## 2026-10-17 revalidation 2 (`d333afe`)

- Review status unchanged: te/hi `unreviewed` (TD-44, OPEN).
- New catalogue areas: `src/i18n/areas/care.ts` (168 lines, new); `partner.ts` +276, `campus.ts` +177, `admin.ts` +150. Per-area catalogues absorb console growth without conflicts on the central files.
- New clinical surfaces (clinician console, visit summaries, counsellor queue) add te/hi strings for clinical wording, which widens the unreviewed clinical surface under TD-44.
- A11Y-01/02 unchanged. The clinician shell has a test (`ClinicianShell.test.tsx`); axe coverage of the new console screens was not checked this pass.

---

### Revalidation 1 (`ad01230`) content


## Why this needs its own report
Since the baseline the product added full English/Telugu/Hindi localisation:
- `src/i18n/en.ts` (42 KB), `hi.ts` (78 KB), `te.ts` (85 KB), plus 10 per-area catalogues
- `useT()` adopted in 221 non-test TSX files
- automated accessibility checks (axe-core)

Translation of crisis, consent and clinical text is a safety concern in a health product, and accessibility is an AGENTS.md P0 guardrail (#7). Neither fits cleanly in an existing report.

## Current state (verified)

| Element | Evidence |
|---|---|
| Typed catalogues | `export type Catalog = Record<MessageKey, string>` (`src/i18n/en.ts:780`); `te`/`hi` typed `Catalog`, so a missing key is a compile error. Each defines the same 728 top-level keys. |
| Provider / hook | `LanguageProvider`, `useT()`, `translate()` falling back to `en` (`src/i18n/index.tsx`); language persisted via `CrossPlatformStorage` (`studentkare_language_v1`) |
| Review status | `REVIEW_STATUS = { en: 'source', te: 'unreviewed', hi: 'unreviewed' }`; `LanguageSetting` shows an info note when an unreviewed language is selected |
| Server text | `Said = { key } \| { raw }`. Server messages are shown as-is, in English. |
| Tests | `src/i18n/__tests__/i18n.test.tsx` |
| Fonts | Noto Telugu / Devanagari in the token font stack (per `docs/remediation-plan-2026-10-09.md` §3.5) |
| a11y labels | 713 `aria-label` / `accessibilityLabel` occurrences in TSX (764 at baseline; total TSX changed, so not comparable) |
| Automated a11y | axe in Vitest: `src/test/axe.ts`, `src/__tests__/screensAxe.test.tsx`, design-system and two screen tests (4 importers) |

## Findings

### Finding: I18N-01 — Unreviewed clinical/crisis translations are selectable
**TD-44** (authoritative in 22). Medium.

### Finding: I18N-02 — Backend messages are English only
- **Severity:** Low
- **Status:** OPEN (new)
- **Location:** `src/i18n/index.tsx` (`Said.raw`); FastAPI `HTTPException` detail strings throughout `backend/services/*`
- **Evidence:** Error and validation messages come from the server as English sentences, for example "Invalid or expired verification code." There are no machine-readable error codes (see 15).
- **Impact:** Telugu and Hindi users see English in failure states, which is where clarity matters most.
- **Recommendation:** Return stable `code` values with errors (already recommended in 15) and map them to catalogue keys.

### Finding: A11Y-01 — Accessibility checks stop at what jsdom can see
- **Severity:** Medium
- **Status:** OPEN
- **Evidence:** axe runs under jsdom, which cannot check colour contrast or 44×44 hit targets (the team notes this in the remediation plan, §3.1). There are no browser-based a11y runs: Playwright is installed but unused by CI (TD-30), and Storybook is not in CI (DS-05).
- **Impact:** Guardrail 7 (hit targets ≥ 44×44, labels) is enforced only by review.
- **Recommendation:** Run axe through Playwright against Storybook, or a few routes, in a non-blocking CI job. Add `eslint-plugin-jsx-a11y` as a warning ratchet.
- **Related reports:** 05, 13, 26

### Finding: A11Y-02 — No lint rule for accessibility props
- **Severity:** Low
- **Status:** OPEN (part of TD-23)

## What is good
- Missing translation keys fail at compile time, which is the strongest guarantee available.
- Unreviewed status is stated to the user, not hidden.
- Language names are always shown in their own script.
