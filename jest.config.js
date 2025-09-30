export default {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json'],
  coverageThreshold: {
    global: {
      statements: 15,
      branches: 15,
      functions: 15,
      lines: 15
    }
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  transform: {},
  // Excluir archivos de agentes que usan ES modules
  testPathIgnorePatterns: [
    '/node_modules/',
    '/agents/',
    '/examples/',
    '/archivos-organizados/'
  ]
};
