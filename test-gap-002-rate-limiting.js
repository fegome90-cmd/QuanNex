#!/usr/bin/env node
/**
 * Test Real para GAP-002: Rate Limiting en Endpoints
 * Este test valida el estado actual de rate limiting sin datos simulados
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const AGENTS_TO_TEST = [
  'agents/context/agent.js',
  'agents/prompting/agent.js', 
  'agents/rules/agent.js',
  'agents/security/agent.js'
];

// Casos de prueba reales para rate limiting
const TEST_CASES = [
  {
    name: 'Entrada válida única',
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
    name: 'Entrada válida para security',
    input: {
      scan_type: 'full',
      target_path: '.'
    },
    expected: 'success'
  }
];

function testAgentRateLimiting(agentPath, testCase, concurrentRequests = 10) {
  console.log(`  Testing: ${testCase.name} (${concurrentRequests} concurrent requests)`);
  
  const input = JSON.stringify(testCase.input);
  const startTime = Date.now();
  
  // Ejecutar múltiples requests concurrentes
  const promises = [];
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      new Promise((resolve) => {
        const result = spawnSync('node', [agentPath], {
          input: input,
          encoding: 'utf8',
          timeout: 10000 // 10 segundos timeout
        });
        resolve({
          index: i,
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
          duration: Date.now() - startTime
        });
      })
    );
  }
  
  return Promise.all(promises);
}

function analyzeRateLimitingResults(results, agentPath, testCase) {
  const successful = results.filter(r => r.status === 0).length;
  const failed = results.filter(r => r.status !== 0).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  const analysis = {
    agent: agentPath,
    test: testCase.name,
    total_requests: results.length,
    successful: successful,
    failed: failed,
    success_rate: (successful / results.length) * 100,
    avg_duration_ms: Math.round(avgDuration),
    rate_limiting_detected: false,
    issues: []
  };
  
  // Detectar si hay rate limiting basado en patrones
  const errorPatterns = [
    'rate limit',
    'too many requests',
    'throttle',
    'limit exceeded',
    '429',
    'quota exceeded'
  ];
  
  for (const result of results) {
    if (result.status !== 0) {
      const errorText = (result.stderr + result.stdout).toLowerCase();
      for (const pattern of errorPatterns) {
        if (errorText.includes(pattern)) {
          analysis.rate_limiting_detected = true;
          analysis.issues.push(`Rate limiting detected: ${pattern}`);
          break;
        }
      }
    }
  }
  
  // Detectar si todas las requests fueron exitosas (posible falta de rate limiting)
  if (successful === results.length && results.length > 5) {
    analysis.issues.push('No rate limiting detected - all requests succeeded');
  }
  
  // Detectar si hay degradación de performance
  if (avgDuration > 5000) { // Más de 5 segundos promedio
    analysis.issues.push(`Performance degradation detected: ${avgDuration}ms average`);
  }
  
  return analysis;
}

async function testAgentSanitization(agentPath) {
  console.log(`\n🧪 Testing rate limiting in: ${agentPath}`);
  
  const results = {
    agent: agentPath,
    tests: [],
    overall: 'unknown'
  };
  
  // Seleccionar casos de prueba apropiados para cada agente
  let testCases = TEST_CASES;
  if (agentPath.includes('prompting')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('prompting'));
  } else if (agentPath.includes('rules')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('rules'));
  } else if (agentPath.includes('security')) {
    testCases = TEST_CASES.filter(tc => tc.name.includes('security'));
  } else {
    testCases = TEST_CASES.filter(tc => tc.name.includes('única'));
  }
  
  for (const testCase of testCases) {
    try {
      // Test con diferentes niveles de concurrencia
      const concurrencyLevels = [1, 5, 10, 20];
      
      for (const concurrency of concurrencyLevels) {
        const testResults = await testAgentRateLimiting(agentPath, testCase, concurrency);
        const analysis = analyzeRateLimitingResults(testResults, agentPath, testCase);
        
        results.tests.push({
          name: `${testCase.name} (${concurrency} concurrent)`,
          concurrency: concurrency,
          analysis: analysis,
          passed: analysis.rate_limiting_detected || concurrency === 1 // Rate limiting detectado o request único
        });
        
        console.log(`    ${analysis.rate_limiting_detected ? '✅' : '❌'} ${concurrency} concurrent: ${analysis.success_rate}% success, ${analysis.avg_duration_ms}ms avg`);
        if (analysis.issues.length > 0) {
          console.log(`      Issues: ${analysis.issues.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log(`    ❌ ERROR: ${testCase.name} - ${error.message}`);
      results.tests.push({
        name: testCase.name,
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
  console.log('\n📋 RATE LIMITING TEST REPORT');
  console.log('='.repeat(60));
  
  let totalPassed = 0;
  let totalTests = 0;
  
  for (const result of results) {
    console.log(`\nAgent: ${result.agent}`);
    console.log(`Overall: ${result.overall.toUpperCase()} (${result.score})`);
    
    for (const test of result.tests) {
      const status = test.passed ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
      
      if (test.analysis) {
        console.log(`    Success Rate: ${test.analysis.success_rate}%`);
        console.log(`    Avg Duration: ${test.analysis.avg_duration_ms}ms`);
        console.log(`    Rate Limiting: ${test.analysis.rate_limiting_detected ? 'DETECTED' : 'NOT DETECTED'}`);
        if (test.analysis.issues.length > 0) {
          console.log(`    Issues: ${test.analysis.issues.join(', ')}`);
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
  
  if (totalPassed === totalTests) {
    console.log('🎉 ALL AGENTS HAVE PROPER RATE LIMITING');
    return true;
  } else {
    console.log('⚠️  SOME AGENTS LACK PROPER RATE LIMITING');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Starting GAP-002 Rate Limiting Tests...');
console.log('Testing agents with concurrent request patterns...');

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
  test_name: 'GAP-002 Rate Limiting Test',
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
  fs.writeFileSync('gap-002-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: gap-002-test-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(allPassed ? 0 : 1);
