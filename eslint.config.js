import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  // Configuración estricta solo para archivos nuevos
  {
    files: ['src/**/*.{ts,tsx,js,mjs}', 'utils/**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      complexity: ['error', { max: 10 }],
      'max-lines-per-function': ['error', { max: 80, skipComments: true, skipBlankLines: true }],
      'import/order': ['error', { alphabetize: { order: 'asc' }, 'newlines-between': 'always' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-useless-return': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
    },
  },
  // Configuración permisiva para archivos legacy
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
      eqeqeq: 'off',
      complexity: 'off',
      'max-lines-per-function': 'off',
      'import/order': 'off',
      'prefer-const': 'off',
      'no-var': 'off',
      'no-duplicate-imports': 'off',
      'no-unused-expressions': 'off',
      'no-useless-return': 'off',
      'prefer-template': 'off',
      'object-shorthand': 'off',
      'prefer-arrow-callback': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '*.min.js',
      'build/**',
      '.husky/**',
      'versions/**',
      'tools/**',
      'core/**',
      'agents/**',
      'orchestration/**',
      'tests/**',
      'scripts/**',
      'archived/**',
      'backups/**',
      'legacy/**',
      'old/**',
    ],
  },
];
