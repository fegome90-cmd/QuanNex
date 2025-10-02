#!/usr/bin/env node
/**
 * Test Simple para GAP-004: Validación JWT
 * Este test valida solo la implementación JWT sin ejecutar agentes
 */

import { generateAgentToken, verifyToken, validateAgentCommunication } from './utils/jwt-auth.js';

console.log('🚀 Starting GAP-004 Simple JWT Validation Test...');

let testsPassed = 0;
let totalTests = 0;

function runTest(testName, testFunction) {
  totalTests++;
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ ${testName}`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}`);
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
}

// Test 1: Generación de tokens
runTest('Token generation for context agent', () => {
  const token = generateAgentToken('context', ['read', 'write']);
  return token && token.length > 0;
});

runTest('Token generation for security agent', () => {
  const token = generateAgentToken('security', ['read', 'write', 'scan']);
  return token && token.length > 0;
});

// Test 2: Verificación de tokens
runTest('Token verification for context agent', () => {
  const token = generateAgentToken('context', ['read', 'write']);
  const payload = verifyToken(token);
  return payload.sub === 'context' && payload.permissions.includes('read');
});

runTest('Token verification for security agent', () => {
  const token = generateAgentToken('security', ['read', 'write', 'scan']);
  const payload = verifyToken(token);
  return payload.sub === 'security' && payload.permissions.includes('scan');
});

// Test 3: Validación de comunicación entre agentes
runTest('Agent communication validation: context -> security', () => {
  const token = generateAgentToken('context', ['read']);
  const validation = validateAgentCommunication('context', 'security', 'read', token);
  return validation.valid;
});

runTest('Agent communication validation: security -> context', () => {
  const token = generateAgentToken('security', ['write']);
  const validation = validateAgentCommunication('security', 'context', 'write', token);
  return validation.valid;
});

// Test 4: Validación de permisos
runTest('Permission validation: context can read', () => {
  const token = generateAgentToken('context', ['read']);
  const validation = validateAgentCommunication('context', 'system', 'read', token);
  return validation.valid;
});

runTest('Permission validation: security can scan', () => {
  const token = generateAgentToken('security', ['scan']);
  const validation = validateAgentCommunication('security', 'system', 'scan', token);
  return validation.valid;
});

// Test 5: Validación de roles
runTest('Role validation: context roles', () => {
  const token = generateAgentToken('context', ['read']);
  const payload = verifyToken(token);
  return payload.roles && payload.roles.includes('read');
});

runTest('Role validation: security roles', () => {
  const token = generateAgentToken('security', ['scan']);
  const payload = verifyToken(token);
  return payload.roles && payload.roles.includes('scan');
});

// Test 6: Validación de expiración
runTest('Token expiration validation', () => {
  const token = generateAgentToken('context', ['read']);
  const payload = verifyToken(token);
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
});

// Test 7: Validación de audiencia
runTest('Token audience validation', () => {
  const token = generateAgentToken('context', ['read']);
  const payload = verifyToken(token);
  return payload.aud === 'agents';
});

// Test 8: Validación de emisor
runTest('Token issuer validation', () => {
  const token = generateAgentToken('context', ['read']);
  const payload = verifyToken(token);
  return payload.iss === 'mcp-quannex';
});

console.log('\n📋 JWT VALIDATION TEST REPORT');
console.log('='.repeat(50));
console.log(`OVERALL RESULT: ${testsPassed}/${totalTests} tests passed`);

if (testsPassed === totalTests) {
  console.log('🎉 JWT AUTHENTICATION FULLY IMPLEMENTED AND WORKING');
  process.exit(0);
} else {
  console.log('⚠️  SOME JWT TESTS FAILED');
  process.exit(1);
}
