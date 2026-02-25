import typescript from "../../tooling/eslint/typescript.js";
import storybook from "eslint-plugin-storybook";

export default [
  {
    ignores: [
      "storybook-static",
    ],
  },
  ...typescript,
  ...storybook.configs["flat/recommended"],
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: [".storybook/main.ts"],
    rules: {
      "storybook/no-uninstalled-addons": [
        "error",
        { packageJsonLocation: "./apps/storybook/package.json" },
      ],
    },
  },
];
