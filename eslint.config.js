import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Web APIs
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      // Reglas base de JavaScript
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',

      // Reglas de estilo con @stylistic
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'never'],
      '@stylistic/key-spacing': [
        'error',
        { beforeColon: false, afterColon: true }
      ],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/eol-last': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/operator-linebreak': ['error', 'after'],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/space-unary-ops': 'error',
      '@stylistic/spaced-comment': ['error', 'always'],
      '@stylistic/template-curly-spacing': 'error',
      '@stylistic/yield-star-spacing': ['error', 'after']
    }
  },
  {
    files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', '**/tests/**/*.{js,ts}'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['**/agents/**/*.js', '**/server.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.reports/**',
      '*.min.js',
      '*.bundle.js',
      '.git/**',
      '.github/**',
      'templates/**',
      'docs/**',
      'ejemplos/**',
      'examples/**',
      'external/**',
      'archon/**',
      'analisis-*/**',
      'archivos-organizados/**',
      'informes-evaluacion/**',
      'planes-futuros/**',
      'reports/**',
      'schemas/**',
      'tests-bats/**',
      'migration/**',
      '*.test.*',
      '*.spec.*'
    ]
  }
];
