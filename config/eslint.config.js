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

export default [
  { ignores: ['node_modules', 'dist', 'backend', 'src/ai/__tests__/**'] },
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
];
