import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.{ts,js,mjs}',
      'utils/**/*.test.{ts,js,mjs}',
      'agents/**/*.test.{ts,js,mjs}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'build/**',
      'tests/**/*.test.{ts,js,mjs}',
    ],
    coverage: {
      provider: 'istanbul',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 0,
        functions: 0,
        statements: 0,
        branches: 0,
      }, // mediremos en el quality gate
      include: ['src/**/*.{ts,js,mjs}', 'utils/**/*.{ts,js,mjs}', 'agents/**/*.{ts,js,mjs}'],
      exclude: [
        '**/*.test.{ts,js,mjs}',
        '**/*.spec.{ts,js,mjs}',
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
