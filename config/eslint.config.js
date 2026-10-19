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
