import typescript from "./typescript.js";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  ...typescript,
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      globals: {
        React: "readonly",
        window: "readonly",
        fetch: "readonly",
        RequestInit: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      ...nextPlugin.configs.recommended.rules,
    },
  },
];
