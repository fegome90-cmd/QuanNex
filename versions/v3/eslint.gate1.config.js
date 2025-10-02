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
        URL: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off'
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
      'archived/',
      'versions/',
      'docs/',
      'tests/',
      'shared/contracts/'
    ]
  }
];
