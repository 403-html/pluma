// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import base from "./tooling/eslint/base.js";

export default [{
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
}, ...base, ...storybook.configs["flat/recommended"]];
