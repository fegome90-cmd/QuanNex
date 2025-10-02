module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { 
    ecmaVersion: "latest", 
    sourceType: "module",
    project: "./tsconfig.json"
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "complexity": ["error", { "max": 10 }],
    "max-lines-per-function": ["error", { "max": 80, "skipComments": true, "skipBlankLines": true }],
    "import/order": ["error", { "alphabetize": { "order": "asc" }, "newlines-between": "always" }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_"}],
    "@typescript-eslint/no-empty-function": "error",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-var-requires": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-duplicate-imports": "error",
    "no-unused-expressions": "error",
    "no-useless-return": "error",
    "prefer-template": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error"
  },
  ignorePatterns: [
    "dist/**", 
    "coverage/**", 
    "node_modules/**",
    "*.min.js",
    "build/**",
    ".husky/**"
  ],
  overrides: [
    {
      files: ["*.js", "*.mjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    },
    {
      files: ["scripts/**/*", "tools/**/*"],
      rules: {
        "no-console": "off",
        "max-lines-per-function": "off"
      }
    }
  ]
};
