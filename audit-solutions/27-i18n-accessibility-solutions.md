# 27 — Internationalisation & Accessibility: Solutions

Answers [audit/27-i18n-and-accessibility.md](../audit/27-i18n-and-accessibility.md). Owns **TD-44** (unreviewed te/hi selectable), **I18N-02** (English-only server messages), **A11Y-01** (jsdom-limited checks) and **A11Y-02** (no a11y lint).

---

## TD-44 — Gate unreviewed translations on safety surfaces

**Goal:** No student reads crisis, consent or clinical wording in a translation that hasn't been reviewed by a native speaker and, for those three areas, a clinician.

**Approach:** Review status moves from per-language to **per-key area**. Tier 1 areas fall back to English until reviewed, and the UI says so.

**Steps**
1. Classify keys. Prefix-based is simplest, because the catalogues are already split by area:
   ```ts
   // src/i18n/review.ts
   export const TIER1_PREFIXES = ['crisis.', 'consent.', 'sos.', 'clinical.', 'emergency.', 'lab.result.'] as const;
   export const REVIEWED: Record<'te' | 'hi', ReadonlySet<string>> = { te: new Set(), hi: new Set() }; // filled as sign-offs land
   ```
   Adjust the prefixes to the real key names in `src/i18n/en.ts`. Add a test that every key is either Tier 1 or not, explicitly.
2. In `translate(lang, key)`:
   ```ts
   if (lang !== 'en' && isTier1(key) && !REVIEWED[lang].has(key)) return en[key];
   ```
   Tier 1 screens show a small note in the user's language: "This section is shown in English until our translation is reviewed."
3. **Production flag (alternative or additional).** `VITE_ENABLED_LANGUAGES=en` in production builds until review is complete; staging has all three. Decide in ADR-0006 ([10](10-documentation-solutions.md)).
4. **Review workflow:**
   - export the te/hi Tier 1 keys to a sheet (`scripts/i18n/export-review.mjs`);
   - the reviewer signs off by name and date;
   - the sign-off is recorded in `docs/reviews/i18n-<lang>-<date>.md`;
   - the import adds the keys to `REVIEWED`.
   `REVIEW_STATUS` flips to `'reviewed'` only when every Tier 1 key is reviewed.
5. **Consent text in particular:** the consent record already stores `language` and `version` (report 28). Record that the consent text shown was reviewed, for example with a `reviewed: true` flag on the consent version, so the DPDP evidence is complete.

**Verify:**
- Unit test: selecting `te` on the crisis screen renders English for unreviewed keys.
- The axe test still passes.

**Effort:** S (code) plus external review time. **Tier 1:** yes, named reviewer.

---

## I18N-02 — Localise server errors through codes
Depends on error codes in [15](15-api-solutions.md).
- The backend returns `{code, detail}`.
- Frontend: add catalogue keys `error.<CODE>` in `src/i18n/areas/errors.ts`, and a mapping in `http.ts` or the ViewModel:
  ```ts
  const said: Said = err.code && `error.${err.code}` in en ? { key: `error.${err.code}` as MessageKey } : { raw: err.detail };
  ```
- Start with the auth, OTP, consent and SOS codes: the moments where clarity matters most.

**Effort:** S per area after [15](15-api-solutions.md).

---

## A11Y-01 — Browser-based accessibility checks
jsdom cannot check contrast or the 44×44 targets that guardrail 7 requires.
1. Run Storybook test-runner with axe on every story, in a non-blocking job at first ([26](26-design-system-solutions.md) DS-05).
2. Playwright plus `@axe-core/playwright` on the 5 E2E journeys ([13](13-testing-solutions.md)), with `color-contrast` and `target-size` enabled.
3. Write a custom target-size check in Playwright: every element with `role=button|link`, or an `onClick`, has a bounding box of at least 44×44 CSS px. Fail on violations in mapped screens ([26](26-design-system-solutions.md)).
4. Native: React Native has no axe. Add a unit test that walks rendered trees in `src/native/__tests__` and asserts that every `Pressable`/`Touchable` has `accessibilityRole` and `accessibilityLabel`, and `hitSlop` or a style that reaches 44.

**Effort:** M.

## A11Y-02 — Lint
Add `eslint-plugin-jsx-a11y` (recommended set) as a warning, with a legacy list, then switch to error ([05](05-code-quality-solutions.md)). Add a local rule requiring `accessibilityLabel` on `Pressable` in `src/native/**` and `src/design-system/**`.
**Effort:** S.

## Keep
Typed catalogues (compile-time completeness), language names in their own script, and visible review status. Document "add keys in `src/i18n/areas/<area>.ts`" in `src/i18n/README.md` ([07](07-collaboration-solutions.md)).
