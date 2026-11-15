import globals from "globals";
export default [
  { ignores: ["node_modules/**", "dist/**", ".expo/**"] },
  {
    files: ["**/*.js", "**/*.cjs", "../app.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
    },
  },
];
