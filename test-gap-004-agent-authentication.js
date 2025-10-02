#!/usr/bin/env node
/**
 * Test Real para GAP-004: Autenticación entre Agentes
 * Este test analiza la comunicación real entre agentes sin datos simulados
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const AGENTS_TO_TEST = [
  'agents/context/agent.js',
  'agents/prompting/agent.js', 
  'agents/rules/agent.js',
  'agents/security/agent.js'
];

const SERVERS_TO_TEST = [
  'agents/context/server.js',
  'agents/prompting/server.js',
  'agents/rules/server.js'
];

// Patrones de comunicación a buscar
const COMMUNICATION_PATTERNS = [
  { pattern: /spawnSync\s*\(/g, type: 'spawn_sync', security_level: 'medium' },
  { pattern: /spawn\s*\(/g, type: 'spawn', security_level: 'medium' },
  { pattern: /exec\s*\(/g, type: 'exec', security_level: 'low' },
  { pattern: /execSync\s*\(/g, type: 'exec_sync', security_level: 'low' },
  { pattern: /handleRequest\s*\(/g, type: 'handle_request', security_level: 'medium' },
  { pattern: /onMessage\s*\(/g, type: 'on_message', security_level: 'medium' },
  { pattern: /process\.stdin/g, type: 'stdin', security_level: 'medium' },
  { pattern: /process\.stdout/g, type: 'stdout', security_level: 'medium' },
  { pattern: /JSON\.parse/g, type: 'json_parse', security_level: 'medium' },
  { pattern: /JSON\.stringify/g, type: 'json_stringify', security_level: 'medium' }
];

// Patrones de autenticación a buscar
const AUTH_PATTERNS = [
  { pattern: /token/g, type: 'token_reference', security_level: 'high' },
  { pattern: /auth/g, type: 'auth_reference', security_level: 'high' },
  { pattern: /authentication/g, type: 'authentication', security_level: 'high' },
  { pattern: /authorization/g, type: 'authorization', security_level: 'high' },
  { pattern: /jwt/g, type: 'jwt', security_level: 'high' },
  { pattern: /session/g, type: 'session', security_level: 'high' },
  { pattern: /credential/g, type: 'credential', security_level: 'high' },
  { pattern: /identity/g, type: 'identity', security_level: 'high' },
  { pattern: /verify/g, type: 'verify', security_level: 'high' },
  { pattern: /validate/g, type: 'validate', security_level: 'medium' }
];

// Casos de prueba para comunicación entre agentes
const TEST_CASES = [
  {
    name: 'Comunicación sin autenticación',
    input: {
      sources: ['README.md'],
      selectors: ['test'],
      max_tokens: 1000
    },
    expected: 'unauthenticated',
    security_risk: 'high'
  },
  {
    name: 'Comunicación con datos sensibles',
    input: {
      sources: ['README.md'],
      selectors: ['password', 'token', 'secret'],
      max_tokens: 1000,
      sensitive_data: 'password=secret123'
    },
    expected: 'authenticated',
    security_risk: 'critical'
  },
  {
    name: 'Comunicación entre agentes',
    input: {
      agent_id: 'context',
      target_agent: 'security',
      action: 'scan',
      data: { path: '.' }
    },
    expected: 'authenticated',
    security_risk: 'high'
  }
];

function analyzeCommunicationPatterns(code) {
  const findings = [];
  
  for (const pattern of COMMUNICATION_PATTERNS) {
    const matches = code.match(pattern.pattern);
    if (matches) {
      for (const match of matches) {
        findings.push({
          type: pattern.type,
          security_level: pattern.security_level,
          match: match,
          authenticated: false
        });
      }
    }
  }
  
  return findings;
}

function analyzeAuthPatterns(code) {
  const findings = [];
  
  for (const pattern of AUTH_PATTERNS) {
    const matches = code.match(pattern.pattern);
    if (matches) {
      for (const match of matches) {
        findings.push({
          type: pattern.type,
          security_level: pattern.security_level,
          match: match,
          implemented: true
        });
      }
    }
  }
  
  return findings;
}

function testAgentCommunication(agentPath, testCase) {
  console.log(`  Testing: ${testCase.name}`);
  
  const input = JSON.stringify(testCase.input);
  
  try {
    const result = spawnSync('node', [agentPath], {
      input: input,
      encoding: 'utf8',
      timeout: 10000
    });
    
    // Analizar si la comunicación fue autenticada
    const allOutput = result.stdout + result.stderr;
    const hasAuthHeaders = allOutput.includes('Authorization') || allOutput.includes('Bearer');
    const hasTokenValidation = allOutput.includes('token') && allOutput.includes('verify');
    
    const testResult = {
      name: testCase.name,
      expected: testCase.expected,
      actual: hasAuthHeaders || hasTokenValidation ? 'authenticated' : 'unauthenticated',
      security_risk: testCase.security_risk,
      authenticated: hasAuthHeaders || hasTokenValidation,
      output: allOutput.substring(0, 500),
      passed: (testCase.expected === 'authenticated') === (hasAuthHeaders || hasTokenValidation)
    };
    
    if (testResult.passed) {
      console.log(`    ✅ PASS: ${testCase.name} - Authentication ${testResult.actual}`);
    } else {
      console.log(`    ❌ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${testResult.actual}`);
    }
    
    return testResult;
    
  } catch (error) {
    console.log(`    ❌ ERROR: ${testCase.name} - ${error.message}`);
    return {
      name: testCase.name,
      expected: testCase.expected,
      actual: 'error',
      error: error.message,
      passed: false
    };
  }
}

function testAgentAuthentication(agentPath) {
  console.log(`\n🧪 Testing authentication in: ${agentPath}`);
  
  const results = {
    agent: agentPath,
    tests: [],
    overall: 'unknown',
    communication_patterns: [],
    auth_patterns: []
  };
  
  // Analizar código fuente para patrones de comunicación y autenticación
  try {
    const code = readFileSync(agentPath, 'utf8');
    results.communication_patterns = analyzeCommunicationPatterns(code);
    results.auth_patterns = analyzeAuthPatterns(code);
    
    console.log(`  📊 Communication patterns found: ${results.communication_patterns.length}`);
    console.log(`  🔐 Auth patterns found: ${results.auth_patterns.length}`);
    
    // Mostrar patrones de comunicación encontrados
    if (results.communication_patterns.length > 0) {
      console.log(`  🔍 Communication patterns:`);
      for (const pattern of results.communication_patterns) {
        console.log(`    - ${pattern.type} (${pattern.security_level})`);
      }
    }
    
    // Mostrar patrones de autenticación encontrados
    if (results.auth_patterns.length > 0) {
      console.log(`  🔐 Auth patterns:`);
      for (const pattern of results.auth_patterns) {
        console.log(`    - ${pattern.type} (${pattern.security_level})`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading agent code: ${error.message}`);
  }
  
  // Seleccionar casos de prueba apropiados para cada agente
  let testCases = TEST_CASES;
  if (agentPath.includes('prompting')) {
    testCases = TEST_CASES.map(tc => ({
      ...tc,
      input: { ...tc.input, goal: 'Test goal', context: 'Test context', constraints: ['test'], style: 'default' }
    }));
  } else if (agentPath.includes('rules')) {
    testCases = TEST_CASES.map(tc => ({
      ...tc,
      input: { ...tc.input, policy_refs: ['SECURITY.md'], tone: 'neutral', domain: 'general', compliance_level: 'strict' }
    }));
  } else if (agentPath.includes('security')) {
    testCases = TEST_CASES.map(tc => ({
      ...tc,
      input: { ...tc.input, scan_type: 'full', target_path: '.' }
    }));
  }
  
  for (const testCase of testCases) {
    const testResult = testAgentCommunication(agentPath, testCase);
    results.tests.push(testResult);
  }
  
  // Calcular resultado general
  const passedTests = results.tests.filter(t => t.passed).length;
  const totalTests = results.tests.length;
  results.overall = passedTests === totalTests ? 'pass' : 'fail';
  results.score = `${passedTests}/${totalTests}`;
  
  console.log(`  📊 Result: ${results.score} tests passed`);
  
  return results;
}

function generateReport(results) {
  console.log('\n📋 AGENT AUTHENTICATION TEST REPORT');
  console.log('='.repeat(60));
  
  let totalPassed = 0;
  let totalTests = 0;
  let totalCommunicationPatterns = 0;
  let totalAuthPatterns = 0;
  let unauthenticatedCommunications = 0;
  
  for (const result of results) {
    console.log(`\nAgent: ${result.agent}`);
    console.log(`Overall: ${result.overall.toUpperCase()} (${result.score})`);
    
    console.log(`  📊 Communication patterns: ${result.communication_patterns.length}`);
    console.log(`  🔐 Auth patterns: ${result.auth_patterns.length}`);
    
    // Contar comunicaciones no autenticadas
    const unauthenticated = result.communication_patterns.filter(p => !p.authenticated).length;
    unauthenticatedCommunications += unauthenticated;
    
    if (unauthenticated > 0) {
      console.log(`  ⚠️  Unauthenticated communications: ${unauthenticated}`);
    }
    
    for (const test of result.tests) {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
      
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      } else {
        console.log(`    Expected: ${test.expected}, Got: ${test.actual}`);
        console.log(`    Security Risk: ${test.security_risk}`);
      }
    }
    
    totalPassed += result.tests.filter(t => t.passed).length;
    totalTests += result.tests.length;
    totalCommunicationPatterns += result.communication_patterns.length;
    totalAuthPatterns += result.auth_patterns.length;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL RESULT: ${totalPassed}/${totalTests} tests passed`);
  console.log(`COMMUNICATION PATTERNS: ${totalCommunicationPatterns}`);
  console.log(`AUTH PATTERNS: ${totalAuthPatterns}`);
  console.log(`UNAUTHENTICATED COMMUNICATIONS: ${unauthenticatedCommunications}`);
  
  if (unauthenticatedCommunications === 0 && totalAuthPatterns > 0) {
    console.log('🎉 ALL AGENT COMMUNICATIONS ARE AUTHENTICATED');
    return true;
  } else if (unauthenticatedCommunications > 0 && totalAuthPatterns === 0) {
    console.log('⚠️  NO AUTHENTICATION IMPLEMENTED - HIGH SECURITY RISK');
    return false;
  } else {
    console.log('⚠️  PARTIAL AUTHENTICATION - NEEDS IMPROVEMENT');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Starting GAP-004 Agent Authentication Tests...');
console.log('Testing agent communication patterns and authentication...');

const allResults = [];

for (const agentPath of AGENTS_TO_TEST) {
  try {
    const result = await testAgentAuthentication(agentPath);
    allResults.push(result);
  } catch (error) {
    console.log(`❌ Failed to test ${agentPath}: ${error.message}`);
    allResults.push({
      agent: agentPath,
      tests: [],
      overall: 'error',
      error: error.message,
      communication_patterns: [],
      auth_patterns: []
    });
  }
}

const allPassed = generateReport(allResults);

// Guardar reporte detallado
const report = {
  timestamp: new Date().toISOString(),
  test_name: 'GAP-004 Agent Authentication Test',
  results: allResults,
  overall_passed: allPassed,
  summary: {
    total_agents: AGENTS_TO_TEST.length,
    total_tests: allResults.reduce((sum, r) => sum + r.tests.length, 0),
    passed_tests: allResults.reduce((sum, r) => sum + r.tests.filter(t => t.passed).length, 0),
    total_communication_patterns: allResults.reduce((sum, r) => sum + r.communication_patterns.length, 0),
    total_auth_patterns: allResults.reduce((sum, r) => sum + r.auth_patterns.length, 0),
    unauthenticated_communications: allResults.reduce((sum, r) => sum + r.communication_patterns.filter(p => !p.authenticated).length, 0)
  }
};

try {
  const fs = await import('node:fs');
  fs.writeFileSync('gap-004-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: gap-004-test-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(allPassed ? 0 : 1);
