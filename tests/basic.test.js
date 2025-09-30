// Test básico para verificar que Jest funciona
describe('Basic functionality', () => {
  test('should pass basic test', () => {
    expect(true).toBe(true);
  });

  test('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle string operations', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
  });
});

// Test para verificar que los agentes existen
describe('Agent files', () => {
  const fs = require('fs');
  const path = require('path');

  test('should have prompting agent', () => {
    const agentPath = path.join(__dirname, '../agents/prompting/agent.js');
    expect(fs.existsSync(agentPath)).toBe(true);
  });

  test('should have context agent', () => {
    const agentPath = path.join(__dirname, '../agents/context/agent.js');
    expect(fs.existsSync(agentPath)).toBe(true);
  });

  test('should have rules agent', () => {
    const agentPath = path.join(__dirname, '../agents/rules/agent.js');
    expect(fs.existsSync(agentPath)).toBe(true);
  });
});
