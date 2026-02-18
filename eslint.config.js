import base from "./tooling/eslint/base.js";

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      ".next",
      ".turbo",
      "pnpm-lock.yaml",
      "**/node_modules",
      "**/dist",
      "**/.next",
    ],
  },
  ...base,
];
