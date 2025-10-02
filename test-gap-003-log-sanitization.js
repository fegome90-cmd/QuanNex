#!/usr/bin/env node
/**
 * Test Real para GAP-003: Sanitización de Logs Sensibles
 * Este test analiza logs reales sin datos simulados
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const AGENTS_TO_TEST = [
  'agents/context/agent.js',
  'agents/prompting/agent.js', 
  'agents/rules/agent.js',
  'agents/security/agent.js'
];

// Patrones de información sensible a buscar en logs
const SENSITIVE_PATTERNS = [
  // Credenciales y autenticación
  { pattern: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'password', severity: 'critical' },
  { pattern: /token\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'token', severity: 'critical' },
  { pattern: /key\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'key', severity: 'high' },
  { pattern: /secret\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'secret', severity: 'critical' },
  { pattern: /credential\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'credential', severity: 'high' },
  { pattern: /auth\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'auth', severity: 'medium' },
  
  // Datos personales
  { pattern: /email\s*[:=]\s*["']?[^"'\s@]+@[^"'\s]+\.[^"'\s]+["']?/gi, type: 'email', severity: 'high' },
  { pattern: /phone\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'phone', severity: 'medium' },
  { pattern: /ssn\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'ssn', severity: 'critical' },
  
  // Datos de entrada/salida completos
  { pattern: /input\s*[:=]\s*\{[^}]*\}/gi, type: 'full_input', severity: 'medium' },
  { pattern: /output\s*[:=]\s*\{[^}]*\}/gi, type: 'full_output', severity: 'medium' },
  { pattern: /payload\s*[:=]\s*\{[^}]*\}/gi, type: 'full_payload', severity: 'medium' },
  { pattern: /data\s*[:=]\s*\{[^}]*\}/gi, type: 'full_data', severity: 'medium' },
  
  // Headers y cookies
  { pattern: /header\s*[:=]\s*\{[^}]*\}/gi, type: 'full_headers', severity: 'medium' },
  { pattern: /cookie\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'cookie', severity: 'medium' },
  { pattern: /session\s*[:=]\s*["']?[^"'\s]+["']?/gi, type: 'session', severity: 'medium' }
];

// Casos de prueba con datos sensibles
const TEST_CASES = [
  {
    name: 'Entrada con password',
    input: {
      sources: ['README.md'],
      selectors: ['password'],
      max_tokens: 1000,
      password: 'secret123',
      token: 'abc123xyz'
    },
    expected: 'sanitized'
  },
  {
    name: 'Entrada con datos personales',
    input: {
      sources: ['README.md'],
      selectors: ['email'],
      max_tokens: 1000,
      email: 'user@example.com',
      phone: '555-1234'
    },
    expected: 'sanitized'
  },
  {
    name: 'Entrada con datos completos',
    input: {
      sources: ['README.md'],
      selectors: ['data'],
      max_tokens: 1000,
      fullData: { password: 'secret', token: 'abc123', email: 'user@test.com' }
    },
    expected: 'sanitized'
  }
];

function analyzeLogsForSensitiveData(logOutput) {
  const findings = [];
  
  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = logOutput.match(pattern.pattern);
    if (matches) {
      for (const match of matches) {
        findings.push({
          type: pattern.type,
          severity: pattern.severity,
          match: match,
          sanitized: false
        });
      }
    }
  }
  
  return findings;
}

function testAgentLogSanitization(agentPath, testCase) {
  console.log(`  Testing: ${testCase.name}`);
  
  const input = JSON.stringify(testCase.input);
  
  try {
    const result = spawnSync('node', [agentPath], {
      input: input,
      encoding: 'utf8',
      timeout: 10000
    });
    
    // Analizar stdout y stderr para información sensible
    const allOutput = result.stdout + result.stderr;
    const findings = analyzeLogsForSensitiveData(allOutput);
    
    const testResult = {
      name: testCase.name,
      expected: testCase.expected,
      actual: findings.length === 0 ? 'sanitized' : 'exposed',
      findings: findings,
      passed: findings.length === 0,
      output: allOutput.substring(0, 500) // Primeros 500 caracteres para análisis
    };
    
    if (testResult.passed) {
      console.log(`    ✅ PASS: ${testCase.name} - No sensitive data exposed`);
    } else {
      console.log(`    ❌ FAIL: ${testCase.name} - Sensitive data exposed:`);
      for (const finding of findings) {
        console.log(`      - ${finding.severity.toUpperCase()}: ${finding.type} - ${finding.match}`);
      }
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

function testAgentSanitization(agentPath) {
  console.log(`\n🧪 Testing log sanitization in: ${agentPath}`);
  
  const results = {
    agent: agentPath,
    tests: [],
    overall: 'unknown'
  };
  
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
    const testResult = testAgentLogSanitization(agentPath, testCase);
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
  console.log('\n📋 LOG SANITIZATION TEST REPORT');
  console.log('='.repeat(60));
  
  let totalPassed = 0;
  let totalTests = 0;
  let totalFindings = 0;
  
  for (const result of results) {
    console.log(`\nAgent: ${result.agent}`);
    console.log(`Overall: ${result.overall.toUpperCase()} (${result.score})`);
    
    for (const test of result.tests) {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
      
      if (test.findings && test.findings.length > 0) {
        console.log(`    Sensitive data exposed:`);
        for (const finding of test.findings) {
          console.log(`      - ${finding.severity.toUpperCase()}: ${finding.type}`);
          console.log(`        Match: ${finding.match}`);
          totalFindings++;
        }
      }
      
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
    }
    
    totalPassed += result.tests.filter(t => t.passed).length;
    totalTests += result.tests.length;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL RESULT: ${totalPassed}/${totalTests} tests passed`);
  console.log(`SENSITIVE DATA FINDINGS: ${totalFindings}`);
  
  if (totalFindings === 0) {
    console.log('🎉 ALL LOGS ARE PROPERLY SANITIZED');
    return true;
  } else {
    console.log('⚠️  SOME LOGS EXPOSE SENSITIVE DATA');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Starting GAP-003 Log Sanitization Tests...');
console.log('Testing agents for sensitive data exposure in logs...');

const allResults = [];

for (const agentPath of AGENTS_TO_TEST) {
  try {
    const result = await testAgentSanitization(agentPath);
    allResults.push(result);
  } catch (error) {
    console.log(`❌ Failed to test ${agentPath}: ${error.message}`);
    allResults.push({
      agent: agentPath,
      tests: [],
      overall: 'error',
      error: error.message
    });
  }
}

const allPassed = generateReport(allResults);

// Guardar reporte detallado
const report = {
  timestamp: new Date().toISOString(),
  test_name: 'GAP-003 Log Sanitization Test',
  results: allResults,
  overall_passed: allPassed,
  summary: {
    total_agents: AGENTS_TO_TEST.length,
    total_tests: allResults.reduce((sum, r) => sum + r.tests.length, 0),
    passed_tests: allResults.reduce((sum, r) => sum + r.tests.filter(t => t.passed).length, 0),
    sensitive_findings: allResults.reduce((sum, r) => sum + r.tests.reduce((s, t) => s + (t.findings ? t.findings.length : 0), 0), 0)
  }
};

try {
  const fs = await import('node:fs');
  fs.writeFileSync('gap-003-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: gap-003-test-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(allPassed ? 0 : 1);
