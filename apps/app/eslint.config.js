import nextApp from "../../tooling/eslint/next-app.js";

export default [
  ...nextApp,
  // TypeScript handles undefined-variable checks in test files;
  // `no-undef` produces false positives for top-level await imports.
  {
    files: ["**/*.test.ts"],
    rules: { "no-undef": "off" },
  },
];
