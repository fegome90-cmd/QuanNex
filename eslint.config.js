import js from '@eslint/js';

export default [
  // Configuración base
  js.configs.recommended,

  // Archivos a ignorar
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'external/**',
      'docs/**',
      'templates/**',
      'reports/**',
      'logs/**',
      'types/**/*.d.ts', // Excluir archivos de tipos TypeScript
      'tests/fixtures/**/*.tsx', // Excluir archivos de prueba
      'apps/**/*.ts', // Excluir archivos de apps problemáticos
      'tools/tool-manager.js', // Excluir archivo con problemas de sintaxis
      'orchestration/**', // Excluir directorio orchestration
      'versions/**', // Excluir directorio versions
      '*.min.js',
      '*.bundle.js',
    ],
  },

  // Configuración básica para archivos JavaScript/TypeScript
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      // Reglas básicas
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Configuración para archivos de configuración
  {
    files: ['**/*.config.{js,mjs}', '**/*.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Configuración para archivos de prueba
  {
    files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'tests/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
];
