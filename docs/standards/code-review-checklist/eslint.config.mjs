import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist/**", "build/**", "coverage/**", "**/generated/**"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" }, // LINT-02
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // LINT-03: ALWAYS FIX
      eqeqeq: ["error", "always"],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/switch-exhaustiveness-check": "error", // AGT-12
      "@typescript-eslint/only-throw-error": "error", // CC-06

      // LINT-03: FIX OR JUSTIFY
      "@typescript-eslint/no-explicit-any": "error", // CC-10
      "no-console": ["error", { allow: ["warn", "error"] }], // GEN-04
      complexity: ["error", 10], // CC-03
      "max-depth": ["error", 3], // CC-03
      "max-params": ["error", 4], // CC-04
      "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }], // CC-01
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/^https?:/]", message: "HC-02: move URLs to the config module." },
        {
          selector: "TSAsExpression > CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
          message: "AGT-09 / CC-10: validate JSON.parse output with a schema (zod) instead of casting.",
        },
      ],

      // LINT-03: CONTEXTUAL (warnings)
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2, 100],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreNumericLiteralTypes: true,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
        },
      ], // HC-03
      "@typescript-eslint/require-await": "warn",
      "no-warning-comments": ["warn", { terms: ["fixme", "hack", "xxx"], location: "anywhere" }], // CMT-04
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "no-restricted-syntax": "off",
      "max-lines-per-function": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
]);
