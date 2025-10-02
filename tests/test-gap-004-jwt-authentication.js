#!/usr/bin/env node
/**
 * Test Específico para GAP-004: Autenticación JWT entre Agentes
 * Este test valida la autenticación JWT real con tokens generados
 */

import { generateAgentToken, verifyToken } from './utils/jwt-auth.js';
import { spawnSync } from 'node:child_process';

const AGENTS_TO_TEST = ['agents/context/agent.js', 'agents/security/agent.js'];

// Casos de prueba con autenticación JWT
const TEST_CASES = [
  {
    name: 'Comunicación autenticada con token válido',
    input: {
      sources: ['README.md'],
      selectors: ['test'],
      max_tokens: 1000,
    },
    expected: 'authenticated',
    security_risk: 'low',
  },
  {
    name: 'Comunicación con datos sensibles autenticada',
    input: {
      sources: ['README.md'],
      selectors: ['password', 'token', 'secret'],
      max_tokens: 1000,
      sensitive_data: 'password=secret123',
    },
    expected: 'authenticated',
    security_risk: 'medium',
  },
  {
    name: 'Comunicación entre agentes autenticada',
    input: {
      agent_id: 'context',
      target_agent: 'security',
      action: 'scan',
      data: { path: '.' },
    },
    expected: 'authenticated',
    security_risk: 'low',
  },
];

function testAgentJWT(agentPath, testCase) {
  console.log(`  Testing: ${testCase.name}`);

  try {
    // Generar token JWT para el agente
    const agentId = agentPath.includes('context') ? 'context' : 'security';
    const token = generateAgentToken(agentId, ['read', 'write']);

    // Agregar token al input
    const authenticatedInput = {
      ...testCase.input,
      token: token,
    };

    const input = JSON.stringify(authenticatedInput);

    const result = spawnSync('node', [agentPath], {
      input: input,
      encoding: 'utf8',
      timeout: 10000,
    });

    // Verificar que el agente procesó correctamente
    const allOutput = result.stdout + result.stderr;
    const hasAuthSuccess = allOutput.includes('authenticated') || allOutput.includes('Auth');
    const hasError = result.status !== 0;

    const testResult = {
      name: testCase.name,
      expected: testCase.expected,
      actual: hasAuthSuccess && !hasError ? 'authenticated' : 'failed',
      security_risk: testCase.security_risk,
      authenticated: hasAuthSuccess && !hasError,
      status: result.status,
      output: allOutput.substring(0, 300),
      passed: (testCase.expected === 'authenticated') === (hasAuthSuccess && !hasError),
    };

    if (testResult.passed) {
      console.log(`    ✅ PASS: ${testCase.name} - JWT Authentication successful`);
    } else {
      console.log(`    ❌ FAIL: ${testCase.name} - JWT Authentication failed`);
      console.log(`      Status: ${result.status}`);
      console.log(`      Output: ${testResult.output}`);
    }

    return testResult;
  } catch (error) {
    console.log(`    ❌ ERROR: ${testCase.name} - ${error.message}`);
    return {
      name: testCase.name,
      expected: testCase.expected,
      actual: 'error',
      error: error.message,
      passed: false,
    };
  }
}

function testAgentJWTImplementation(agentPath) {
  console.log(`\n🧪 Testing JWT authentication in: ${agentPath}`);

  const results = {
    agent: agentPath,
    tests: [],
    overall: 'unknown',
    jwt_tests: [],
  };

  // Test de generación y verificación de tokens
  try {
    const agentId = agentPath.includes('context') ? 'context' : 'security';

    // Test 1: Generar token
    const token = generateAgentToken(agentId, ['read', 'write']);
    console.log(`  🔑 Token generated for ${agentId}: ${token.substring(0, 20)}...`);

    // Test 2: Verificar token
    const payload = verifyToken(token);
    console.log(
      `  ✅ Token verified: ${payload.sub} with permissions: ${payload.permissions.join(', ')}`
    );

    results.jwt_tests.push({
      test: 'token_generation',
      passed: true,
      agentId: payload.sub,
      permissions: payload.permissions,
    });

    results.jwt_tests.push({
      test: 'token_verification',
      passed: true,
      payload: payload,
    });
  } catch (error) {
    console.log(`  ❌ JWT test failed: ${error.message}`);
    results.jwt_tests.push({
      test: 'jwt_error',
      passed: false,
      error: error.message,
    });
  }

  // Ejecutar tests de comunicación autenticada
  for (const testCase of TEST_CASES) {
    const testResult = testAgentJWT(agentPath, testCase);
    results.tests.push(testResult);
  }

  // Calcular resultado general
  const passedTests = results.tests.filter(t => t.passed).length;
  const totalTests = results.tests.length;
  const jwtTestsPassed = results.jwt_tests.filter(t => t.passed).length;
  const totalJwtTests = results.jwt_tests.length;

  results.overall =
    passedTests === totalTests && jwtTestsPassed === totalJwtTests ? 'pass' : 'fail';
  results.score = `${passedTests}/${totalTests}`;
  results.jwt_score = `${jwtTestsPassed}/${totalJwtTests}`;

  console.log(`  📊 Communication Result: ${results.score} tests passed`);
  console.log(`  🔐 JWT Result: ${results.jwt_score} tests passed`);

  return results;
}

function generateReport(results) {
  console.log('\n📋 JWT AUTHENTICATION TEST REPORT');
  console.log('='.repeat(60));

  let totalPassed = 0;
  let totalTests = 0;
  let totalJwtPassed = 0;
  let totalJwtTests = 0;

  for (const result of results) {
    console.log(`\nAgent: ${result.agent}`);
    console.log(`Overall: ${result.overall.toUpperCase()} (${result.score})`);
    console.log(`JWT Tests: ${result.jwt_score}`);

    // Mostrar tests JWT
    if (result.jwt_tests.length > 0) {
      console.log(`  🔐 JWT Implementation:`);
      for (const jwtTest of result.jwt_tests) {
        const status = jwtTest.passed ? '✅' : '❌';
        console.log(`    ${status} ${jwtTest.test}`);
        if (jwtTest.error) {
          console.log(`      Error: ${jwtTest.error}`);
        }
      }
    }

    // Mostrar tests de comunicación
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
    totalJwtPassed += result.jwt_tests.filter(t => t.passed).length;
    totalJwtTests += result.jwt_tests.length;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL RESULT: ${totalPassed}/${totalTests} communication tests passed`);
  console.log(`JWT IMPLEMENTATION: ${totalJwtPassed}/${totalJwtTests} JWT tests passed`);

  if (totalJwtPassed === totalJwtTests && totalPassed === totalTests) {
    console.log('🎉 JWT AUTHENTICATION FULLY IMPLEMENTED');
    return true;
  } else if (totalJwtPassed === totalJwtTests && totalPassed < totalTests) {
    console.log('⚠️  JWT IMPLEMENTED BUT COMMUNICATION ISSUES');
    return false;
  } else {
    console.log('❌ JWT AUTHENTICATION NOT WORKING');
    return false;
  }
}

// Ejecutar tests
console.log('🚀 Starting GAP-004 JWT Authentication Tests...');
console.log('Testing JWT implementation and authenticated communication...');

const allResults = [];

for (const agentPath of AGENTS_TO_TEST) {
  try {
    const result = await testAgentJWTImplementation(agentPath);
    allResults.push(result);
  } catch (error) {
    console.log(`❌ Failed to test ${agentPath}: ${error.message}`);
    allResults.push({
      agent: agentPath,
      tests: [],
      overall: 'error',
      error: error.message,
      jwt_tests: [],
    });
  }
}

const allPassed = generateReport(allResults);

// Guardar reporte detallado
const report = {
  timestamp: new Date().toISOString(),
  test_name: 'GAP-004 JWT Authentication Test',
  results: allResults,
  overall_passed: allPassed,
  summary: {
    total_agents: AGENTS_TO_TEST.length,
    total_tests: allResults.reduce((sum, r) => sum + r.tests.length, 0),
    passed_tests: allResults.reduce((sum, r) => sum + r.tests.filter(t => t.passed).length, 0),
    total_jwt_tests: allResults.reduce((sum, r) => sum + r.jwt_tests.length, 0),
    passed_jwt_tests: allResults.reduce(
      (sum, r) => sum + r.jwt_tests.filter(t => t.passed).length,
      0
    ),
  },
};

try {
  const fs = await import('node:fs');
  fs.writeFileSync('gap-004-jwt-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: gap-004-jwt-test-report.json');
} catch (error) {
  console.log(`\n⚠️  Could not save report: ${error.message}`);
}

// Exit con código apropiado
process.exit(allPassed ? 0 : 1);
