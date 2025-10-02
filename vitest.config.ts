import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,js}', 'utils/**/*.test.{ts,js}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'build/**',
      'tests/**/*.test.{ts,js}',
      'agents/**/*.test.{ts,js}',
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 0,
        functions: 0,
        statements: 0,
        branches: 0,
      }, // mediremos en el quality gate
      include: ['src/**/*.{ts,js}', 'utils/**/*.{ts,js}', 'agents/**/*.{ts,js}'],
      exclude: [
        '**/*.test.{ts,js}',
        '**/*.spec.{ts,js}',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/build/**',
        '**/*.d.ts',
      ],
    },
    environment: 'node',
    globals: true,
    testTimeout: 10000,
  },
});
