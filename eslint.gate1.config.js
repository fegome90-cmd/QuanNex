import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        URL: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-extra-semi': 'warn',
      'no-func-assign': 'error',
      'no-irregular-whitespace': 'warn',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'warn',
      'no-unexpected-multiline': 'warn',
      'valid-typeof': 'error'
    }
  },
  {
    ignores: [
      'node_modules/',
      'backups/',
      'out/',
      'logs/',
      'coverage/',
      '*.min.js',
      'test-files/',
      'tools/',
      'agents/metrics/',
      'agents/optimization/',
      'agents/security/',
      'core/',
      'orchestration/',
      'archived/'
    ]
  }
];
