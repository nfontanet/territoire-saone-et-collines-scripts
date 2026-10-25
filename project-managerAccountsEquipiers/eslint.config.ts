import eslint from "@eslint/js";
import prettierLint from "eslint-config-prettier";
import n from "eslint-plugin-n";
import promise from "eslint-plugin-promise";
import globals from "globals";
import tseslint from 'typescript-eslint';

export default [
  // Config TypeScript de base
  ...tseslint.configs.recommended,

  // Fichiers à analyser
  {
    files: ["packages/*/src/**/*.ts"]
  },

  // Fichiers à ignorer
  {
    ignores: ["**/*.d.ts"]
  },

  // Plugins
  {
    plugins: { promise, n }
  },

  // Options du langage
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    }
  },

  // Règles
  {
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.eslintRecommended.rules, // désactive règles déjà gérées par TS
      ...promise.configs.recommended.rules,
      ...n.configs.recommended.rules,

      // règles "erreur"
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
      "promise/valid-params": "error",
      "promise/no-multiple-resolved": "error",

      // désactivées
      "no-unused-vars": "on",
      "no-multiple-empty-lines": "off",
      "no-use-before-define": "off",
      "camelcase": "on",
      "@typescript-eslint/no-explicit-any": "off",
      "n/no-extraneous-import": "off",
      "n/no-unpublished-import": "off",
      "n/no-missing-import": "off",

      // Prettier à la fin pour éviter conflits
      ...prettierLint.rules
    }
  }
];