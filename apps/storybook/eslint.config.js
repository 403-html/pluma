import typescript from "../../tooling/eslint/typescript.js";
import storybook from "eslint-plugin-storybook";

export default [
  {
    ignores: [
      "storybook-static",
      "public/mockServiceWorker.js",
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
        { packageJsonLocation: "./package.json" },
      ],
    },
  },
];
