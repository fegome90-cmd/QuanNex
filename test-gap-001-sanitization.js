#!/usr/bin/env node
/**
 * Test Real para GAP-001: Sanitización de Entradas en Agentes
 * Este test valida el estado actual de sanitización sin datos simulados
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const AGENTS_TO_TEST = [
  'agents/context/agent.js',
  'agents/prompting/agent.js', 
  'agents/rules/agent.js',
  'agents/security/agent.js'
];

// Casos de prueba reales para sanitización
const TEST_CASES = [
  {
    name: 'Entrada válida',
    input: {
      sources: ['README.md'],
      selectors: ['descripción'],
      max_tokens: 1000
    },
    expected: 'success'
  },
  {
    name: 'Entrada válida para prompting',
    input: {
      goal: 'Test goal',
      context: 'Test context',
      constraints: ['test'],
      style: 'default'
    },
    expected: 'success'
  },
  {
    name: 'Entrada válida para rules',
    input: {
      policy_refs: ['SECURITY.md'],
      tone: 'neutral',
      domain: 'general',
      compliance_level: 'strict'
    },
    expected: 'success'
  },
  {
    name: 'Entrada con path traversal',
    input: {
      sources: ['../../../etc/passwd'],
      selectors: ['password'],
      max_tokens: 1000
    },
    expected: 'reject'
  },
  {
    name: 'Entrada con caracteres peligrosos',
    input: {
      sources: ['<script>alert("xss")</script>'],
      selectors: ['script'],
      max_tokens: 1000
    },
    expected: 'reject'
  },
  {
    name: 'Entrada con JSON malformado',
    input: '{"sources": ["test"], "selectors": ["test"], "max_tokens": 1000, "malformed": }',
    expected: 'reject'
  },
  {
    name: 'Entrada con max_tokens negativo',
    input: {
      sources: ['README.md'],
      selectors: ['descripción'],
      max_tokens: -1
    },
    expected: 'reject'
  }
];

function testAgentSanitization(agentPath) {
  console.log(`\n🧪 Testing sanitization in: ${agentPath}`);
  
  const results = {
    agent: agentPath,
    tests: [],
    overall: 'unknown'
  };
  
  // Seleccionar casos de prueba apropiados para cada agente
  let testCases = TEST_CASES;
  if (agentPath.includes('prompting')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('prompting') || tc.name.includes('path traversal') || tc.name.includes('caracteres peligrosos') || tc.name.includes('JSON malformado') || tc.name.includes('max_tokens negativo'));
  } else if (agentPath.includes('rules')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('rules') || tc.name.includes('path traversal') || tc.name.includes('caracteres peligrosos') || tc.name.includes('JSON malformado') || tc.name.includes('max_tokens negativo'));
  } else if (agentPath.includes('security')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('válida') || tc.name.includes('path traversal') || tc.name.includes('caracteres peligrosos') || tc.name.includes('JSON malformado') || tc.name.includes('max_tokens negativo'));
  }
  
  for (const testCase of testCases) {
    console.log(`  Testing: ${testCase.name}`);
    
    try {
      const input = typeof testCase.input === 'string' 
        ? testCase.input 
        : JSON.stringify(testCase.input);
      
      const result = spawnSync('node', [agentPath], {
        input: input,
        encoding: 'utf8',
        timeout: 5000
      });
      
      const testResult = {
        name: testCase.name,
        expected: testCase.expected,
        actual: result.status === 0 ? 'success' : 'reject',
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr
      };
      
      // Validar si el resultado coincide con lo esperado
      if (testResult.actual === testCase.expected) {
        testResult.passed = true;
        console.log(`    ✅ PASS: ${testCase.name}`);
      } else {
        testResult.passed = false;
        console.log(`    ❌ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${testResult.actual}`);
      }
      
      results.tests.push(testResult);
      
    } catch (error) {
      console.log(`    ❌ ERROR: ${testCase.name} - ${error.message}`);
      results.tests.push({
        name: testCase.name,
        expected: testCase.expected,
        actual: 'error',
        error: error.message,
        passed: false
      });
    }
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
  console.log('\n📋 SANITIZATION TEST REPORT');
  console.log('='.repeat(50));
  
  let totalPassed = 0;
  let totalTests = 0;
  
  for (const result of results) {
    console.log(`\nAgent: ${result.agent}`);
    console.log(`Overall: ${result.overall.toUpperCase()} (${result.score})`);
    
    for (const test of result.tests) {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.actual}`);
      if (!test.passed && test.stderr) {
        console.log(`    Error: ${test.stderr.trim()}`);
      }
    }
    
    totalPassed += result.tests.filter(t => t.passed).length;
    totalTests += result.tests.length;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL RESULT: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 ALL AGENTS PASS SANITIZATION TESTS');
    return true;
  } else {
    console.log('⚠️  SOME AGENTS FAIL SANITIZATION TESTS');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Starting GAP-001 Sanitization Tests...');
console.log('Testing agents with real input validation...');

const allResults = [];

for (const agentPath of AGENTS_TO_TEST) {
  try {
    const result = testAgentSanitization(agentPath);
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
  test_name: 'GAP-001 Sanitization Test',
  results: allResults,
  overall_passed: allPassed,
  summary: {
    total_agents: AGENTS_TO_TEST.length,
    total_tests: allResults.reduce((sum, r) => sum + r.tests.length, 0),
    passed_tests: allResults.reduce((sum, r) => sum + r.tests.filter(t => t.passed).length, 0)
  }
};

try {
  const fs = await import('node:fs');
  fs.writeFileSync('gap-001-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: gap-001-test-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(allPassed ? 0 : 1);
