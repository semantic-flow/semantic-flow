// eslint.config.mjs
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "quote-props": ["error", "always"],
      "quotes": ["error", "double"],
    },
  },
];
