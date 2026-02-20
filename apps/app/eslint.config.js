import nextApp from "../../tooling/eslint/next-app.js";

export default [
  ...nextApp,
  {
    languageOptions: {
      globals: {
        window: "readonly",
        fetch: "readonly",
        RequestInit: "readonly",
      },
    },
  },
];
