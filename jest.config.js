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
  // Configuración para soportar ES modules
  preset: 'jest-preset-default',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {},
  // Excluir archivos de agentes que usan ES modules
  testPathIgnorePatterns: [
    '/node_modules/',
    '/agents/',
    '/examples/',
    '/archivos-organizados/'
  ]
};
