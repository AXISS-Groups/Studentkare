import { readFileSync } from 'node:fs';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

/**
 * DESIGN.md §3: colours come from tokens, never raw hex. This is a ratchet:
 * the rule is an error everywhere except the files listed in
 * hex-colour-legacy.json, which predate it. Migrating a file means removing it
 * from that list; nothing may be added to it.
 */
const HEX = '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?\\b';
const hexLegacy = JSON.parse(readFileSync(new URL('./hex-colour-legacy.json', import.meta.url), 'utf8'));
const noRawHex = ['error',
  { selector: `Literal[value=/${HEX}/]`, message: 'Use a design token (skTokens / --sk-*) instead of a raw hex colour. See DESIGN.md §3.' },
  { selector: `TemplateElement[value.raw=/${HEX}/]`, message: 'Use a design token (skTokens / --sk-*) instead of a raw hex colour. See DESIGN.md §3.' },
];

/**
 * CLAUDE.md: screens draw icons only through src/design-system/icons. Same
 * ratchet as above: files in icon-legacy.json predate the rule (TODO: migrate
 * each to <Icon> and remove it from the list); nothing may be added to it.
 */
const SCREEN_FILES = ['src/screens/**/*.tsx', 'src/modules/**/view/**/*.tsx', 'src/features/*/views/**/*.tsx', 'src/features/*/screens/**/*.tsx'];
const iconLegacy = JSON.parse(readFileSync(new URL('./icon-legacy.json', import.meta.url), 'utf8'));
/**
 * Audit DS-06: SkIcon is a second, hand-drawn icon set outside the manifest.
 * Same ratchet: only the files in skicon-legacy.json may use it (TODO: move each
 * to <Icon> with manifest names and remove it from the list); nothing may be
 * added. SkIconName from '@/design-system/icons' is the manifest type and is fine.
 */
const skIconLegacy = JSON.parse(readFileSync(new URL('./skicon-legacy.json', import.meta.url), 'utf8'));
const SKICON_SOURCES = /(^@\/design-system$|(^|\/)design-system(\/index)?$|\/SkIcon$)/;
/**
 * AGENTS.md guardrail 10: strict TypeScript, no escape hatches (audit TD-23).
 * Same ratchet: files in any-legacy.json predate the rule; nothing may be added.
 * scripts/check-legacy-lists.mjs fails CI if any legacy list grows.
 */
const anyLegacy = JSON.parse(readFileSync(new URL('./any-legacy.json', import.meta.url), 'utf8'));
const tsCommentLegacy = JSON.parse(readFileSync(new URL('./ts-comment-legacy.json', import.meta.url), 'utf8'));

/**
 * AGENTS.md rule 11: nothing hard-coded. User-facing text comes from the i18n
 * catalogues (src/i18n: en, te, hi) through t(key), never a literal in JSX.
 * The rule flags letters in JSX text, a string literal rendered as a child, and
 * string literals in the attributes a person reads or hears. Same ratchet as the
 * lists above: files in copy-literal-legacy.json predate the rule (TODO: move
 * each one's copy into the catalogues and remove it from the list); nothing may
 * be added. Brand names and symbols without letters (e.g. "·", "—") pass.
 */
const copyLiteralLegacy = JSON.parse(readFileSync(new URL('./copy-literal-legacy.json', import.meta.url), 'utf8'));
const COPY_ATTRIBUTES = new Set(['aria-label', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext', 'placeholder', 'title', 'alt', 'accessibilityLabel', 'accessibilityHint']);
const HAS_LETTER = /\p{L}/u;
const COPY_MESSAGE = 'User-facing text comes from the i18n catalogues (src/i18n, en/te/hi) via t(key), not a literal. See AGENTS.md rule 11.';
const literalCopy = (expression) =>
  (expression.type === 'Literal' && typeof expression.value === 'string' && HAS_LETTER.test(expression.value))
  || (expression.type === 'TemplateLiteral' && expression.quasis.some((q) => HAS_LETTER.test(q.value.cooked ?? q.value.raw)));
const skCopy = {
  rules: {
    'no-literal-copy': {
      meta: { type: 'problem', schema: [] },
      create: (context) => ({
        JSXText(node) {
          if (HAS_LETTER.test(node.value)) context.report({ node, message: COPY_MESSAGE });
        },
        JSXExpressionContainer(node) {
          const parent = node.parent?.type;
          if ((parent === 'JSXElement' || parent === 'JSXFragment') && literalCopy(node.expression)) {
            context.report({ node, message: COPY_MESSAGE });
          }
        },
        JSXAttribute(node) {
          if (node.name.type !== 'JSXIdentifier' || !COPY_ATTRIBUTES.has(node.name.name) || !node.value) return;
          const value = node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
          if (literalCopy(value)) context.report({ node, message: COPY_MESSAGE });
        },
      }),
    },
  },
};
/** The files the copy rule covers (exported for its tests). Tests, stories and generated code are fixtures. */
export const COPY_RULE_FILES = ['src/**/*.tsx'];
export const COPY_RULE_IGNORES = ['src/**/__tests__/**', 'src/**/*.test.tsx', 'src/**/*.stories.tsx', 'src/test/**', 'src/design-system/icons/generated/**'];

const skIcons = {
  rules: {
    'no-skicon': {
      meta: { type: 'problem', schema: [] },
      create: (context) => ({
        ImportDeclaration(node) {
          const source = String(node.source.value);
          if (!SKICON_SOURCES.test(source)) return;
          for (const spec of node.specifiers) {
            const name = spec.type === 'ImportSpecifier' ? spec.imported.name : null;
            if (/\/SkIcon$/.test(source) || name === 'SkIcon' || name === 'SkIconName') {
              context.report({ node: spec, message: 'SkIcon is outside the icon manifest (audit DS-06). Use <Icon> from src/design-system/icons with a manifest name.' });
            }
          }
        },
      }),
    },
    'no-raw-svg': {
      meta: { type: 'problem', schema: [] },
      create: (context) => ({
        JSXOpeningElement(node) {
          if (node.name.type === 'JSXIdentifier' && node.name.name === 'svg') {
            context.report({ node, message: 'Draw icons with <Icon>, <Icon3d>, <Glyph> or <Illustration> from src/design-system/icons, not a raw <svg>.' });
          }
        },
      }),
    },
  },
};

/**
 * src/modules was a second MVVM architecture the app never ran; it was deleted
 * (audit TD-06) except two slices that are still live and await a move into
 * src/features: m04-emergency (SOS views, Tier 1) and m16-checkout. New code
 * belongs in src/features/<domain> (npm run gen:module). Flat config does not
 * merge rule options across blocks, so the screen block below repeats this list.
 */
const MODULE_IMPORT_BAN = {
  group: ['@/modules/*', '!@/modules/m04-emergency', '!@/modules/m04-emergency/**', '!@/modules/m16-checkout', '!@/modules/m16-checkout/**',
    '**/modules/m*', '!**/modules/m04-emergency', '!**/modules/m04-emergency/**', '!**/modules/m16-checkout', '!**/modules/m16-checkout/**'],
  message: 'src/modules was removed. Put feature code in src/features/<domain> (npm run gen:module).',
};

export default [
  { ignores: ['node_modules', 'dist', 'backend', 'src/ai/__tests__/**', 'src/design-system/icons/generated/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // Autofixable: removes unused imports.
      'unused-imports/no-unused-imports': 'error',
      // Autofixable: removes unused destructured/locals (ignore catch bindings).
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [MODULE_IMPORT_BAN] }] },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/__tests__/**', 'src/theme/tokens/generated/**', ...hexLegacy],
    rules: { 'no-restricted-syntax': noRawHex },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/design-system/icons/SkIcon.tsx', 'src/design-system/index.ts', ...skIconLegacy],
    plugins: { 'sk-icons': skIcons },
    rules: { 'sk-icons/no-skicon': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: tsCommentLegacy,
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // @ts-expect-error with a reason is allowed; @ts-ignore and @ts-nocheck are not.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: anyLegacy,
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: COPY_RULE_FILES,
    ignores: [...COPY_RULE_IGNORES, ...copyLiteralLegacy],
    plugins: { 'sk-copy': skCopy },
    rules: { 'sk-copy/no-literal-copy': 'error' },
  },
  {
    files: SCREEN_FILES,
    ignores: ['src/**/__tests__/**', ...iconLegacy],
    plugins: { 'sk-icons': skIcons },
    rules: {
      'sk-icons/no-raw-svg': 'error',
      'no-restricted-imports': ['error', {
        paths: [{ name: 'lucide-react', message: 'Use <Icon> from src/design-system/icons so drawings match the canvas.' }],
        patterns: [MODULE_IMPORT_BAN],
      }],
    },
  },
];
