import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

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
];
