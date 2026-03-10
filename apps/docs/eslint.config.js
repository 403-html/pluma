import nextApp from "../../tooling/eslint/next-app.js";

export default [
  { ignores: ["out/**", ".next/**"] },
  ...nextApp,
];
