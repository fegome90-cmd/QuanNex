module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'security'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:security/recommended'],
  ignorePatterns: ['dist/**', 'build/**', '**/*.d.ts'],
  overrides: [
    { files: ['apps/**/**/*.ts', 'apps/**/**/*.tsx'], env: { browser: true, es2022: true } },
    { files: ['packages/**/**/*.ts'], env: { node: true, es2022: true } },
    { files: ['test/**/**.ts'], env: { node: true, mocha: true }, rules: { 'no-unused-expressions': 'off' } }
  ]
};