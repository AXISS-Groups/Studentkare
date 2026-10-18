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
 * AGENTS.md guardrail 10: strict TypeScript, no escape hatches (audit TD-23).
 * Same ratchet: files in any-legacy.json predate the rule; nothing may be added.
 * scripts/check-legacy-lists.mjs fails CI if any legacy list grows.
 */
const anyLegacy = JSON.parse(readFileSync(new URL('./any-legacy.json', import.meta.url), 'utf8'));
const tsCommentLegacy = JSON.parse(readFileSync(new URL('./ts-comment-legacy.json', import.meta.url), 'utf8'));

const skIcons = {
  rules: {
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
    files: ['src/**/*.tsx'],
    ignores: ['src/**/__tests__/**', 'src/theme/tokens/generated/**', ...hexLegacy],
    rules: { 'no-restricted-syntax': noRawHex },
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
    files: SCREEN_FILES,
    ignores: ['src/**/__tests__/**', ...iconLegacy],
    plugins: { 'sk-icons': skIcons },
    rules: {
      'sk-icons/no-raw-svg': 'error',
      'no-restricted-imports': ['error', { paths: [{ name: 'lucide-react', message: 'Use <Icon> from src/design-system/icons so drawings match the canvas.' }] }],
    },
  },
];
