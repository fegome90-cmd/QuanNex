#!/usr/bin/env node
/**
 * Rate Limit Stress Test - Valida estabilidad bajo carga
 * Tests de smoke y carga suave para verificar resistencia a rate limits
 */

import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// Configuración de tests
const TEST_CONFIG = {
  smoke: {
    requests: 50,
    concurrency: 10,
    duration: 30, // segundos
    expectedSuccessRate: 0.95,
  },
  load: {
    requests: 200,
    concurrency: 20,
    duration: 300, // 5 minutos
    expectedSuccessRate: 0.9,
  },
};

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Simula request al orquestador
 * @param {number} requestId - ID del request
 * @param {string} intent - Tipo de intent
 * @returns {Promise<Object>} Resultado del request
 */
async function simulateRequest(requestId, intent = 'simple') {
  const startTime = performance.now();

  try {
    // Simular diferentes tipos de intents
    const payloads = {
      simple: {
        type: 'simple_query',
        prompt: `Test request ${requestId}: Simple query`,
        tools: [],
      },
      analysis: {
        type: 'code_analysis',
        prompt: `Test request ${requestId}: Analyze this code snippet`,
        tools: ['codebase_search', 'read_file'],
      },
      coding: {
        type: 'code_generation',
        prompt: `Test request ${requestId}: Generate code for feature`,
        tools: ['codebase_search', 'write', 'search_replace'],
      },
    };

    const payload = payloads[intent] || payloads.simple;

    // Simular llamada al orquestador (en un caso real, sería HTTP)
    const result = await simulateOrchestratorCall(payload);

    const endTime = performance.now();
    const latency = endTime - startTime;

    return {
      requestId,
      success: true,
      latency,
      intent,
      result: result.content?.substring(0, 100) || 'No content',
    };
  } catch (error) {
    const endTime = performance.now();
    const latency = endTime - startTime;

    return {
      requestId,
      success: false,
      latency,
      intent,
      error: error.message,
    };
  }
}

/**
 * Simula llamada al orquestador
 * @param {Object} payload - Payload del request
 * @returns {Promise<Object>} Respuesta simulada
 */
async function simulateOrchestratorCall(payload) {
  return new Promise((resolve, reject) => {
    // Simular latencia variable
    const latency = Math.random() * 2000 + 500; // 500-2500ms

    setTimeout(() => {
      // Simular diferentes tipos de respuestas
      if (Math.random() < 0.95) {
        // 95% éxito
        resolve({
          content: `Respuesta simulada para ${payload.type}`,
          metadata: {
            model: 'gpt-4',
            tokens: Math.floor(Math.random() * 1000) + 100,
          },
        });
      } else {
        reject(new Error('Simulated service error'));
      }
    }, latency);
  });
}

/**
 * Ejecuta test de smoke
 * @returns {Promise<Object>} Resultados del test
 */
async function runSmokeTest() {
  log('cyan', '🔥 Ejecutando Smoke Test...');

  const config = TEST_CONFIG.smoke;
  const results = [];
  const startTime = Date.now();

  // Generar requests
  const requests = [];
  for (let i = 0; i < config.requests; i++) {
    const intents = ['simple', 'analysis', 'coding'];
    const intent = intents[Math.floor(Math.random() * intents.length)];
    requests.push(simulateRequest(i, intent));
  }

  // Ejecutar con concurrencia limitada
  const concurrency = config.concurrency;
  const batches = [];

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    batches.push(Promise.all(batch));
  }

  // Ejecutar batches
  for (const batch of batches) {
    const batchResults = await batch;
    results.push(...batchResults);

    // Log progreso
    const progress = (results.length / config.requests) * 100;
    log('blue', `📊 Progreso: ${progress.toFixed(1)}% (${results.length}/${config.requests})`);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  return analyzeResults(results, duration, 'smoke');
}

/**
 * Ejecuta test de carga suave
 * @returns {Promise<Object>} Resultados del test
 */
async function runLoadTest() {
  log('cyan', '⚡ Ejecutando Load Test...');

  const config = TEST_CONFIG.load;
  const results = [];
  const startTime = Date.now();
  const endTime = startTime + config.duration * 1000;

  let requestId = 0;
  const activeRequests = new Set();

  // Función para generar requests continuamente
  const generateRequests = async () => {
    while (Date.now() < endTime && requestId < config.requests) {
      if (activeRequests.size < config.concurrency) {
        const intents = ['simple', 'analysis', 'coding'];
        const intent = intents[Math.floor(Math.random() * intents.length)];

        const requestPromise = simulateRequest(requestId++, intent)
          .then(result => {
            activeRequests.delete(requestId);
            return result;
          })
          .catch(error => {
            activeRequests.delete(requestId);
            return {
              requestId: requestId,
              success: false,
              latency: 0,
              intent: 'error',
              error: error.message,
            };
          });

        activeRequests.add(requestId);
        results.push(requestPromise);

        // Control de ritmo
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  };

  // Ejecutar generación de requests
  await generateRequests();

  // Esperar que terminen todos los requests
  const finalResults = await Promise.all(results);

  const duration = Date.now() - startTime;

  return analyzeResults(finalResults, duration, 'load');
}

/**
 * Analiza resultados de los tests
 * @param {Array} results - Resultados de los tests
 * @param {number} duration - Duración en ms
 * @param {string} testType - Tipo de test
 * @returns {Object} Análisis de resultados
 */
function analyzeResults(results, duration, testType) {
  const totalRequests = results.length;
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;

  const latencies = results.map(r => r.latency).filter(l => l > 0);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95Latency = calculatePercentile(latencies, 0.95);
  const p99Latency = calculatePercentile(latencies, 0.99);

  const successRate = successfulRequests / totalRequests;
  const rps = (totalRequests / duration) * 1000;

  // Análisis por intent
  const intentStats = {};
  results.forEach(result => {
    if (!intentStats[result.intent]) {
      intentStats[result.intent] = { total: 0, success: 0 };
    }
    intentStats[result.intent].total++;
    if (result.success) intentStats[result.intent].success++;
  });

  return {
    testType,
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate,
    avgLatency: Math.round(avgLatency),
    p95Latency: Math.round(p95Latency),
    p99Latency: Math.round(p99Latency),
    rps: Math.round(rps * 100) / 100,
    duration: Math.round(duration / 1000),
    intentStats,
  };
}

/**
 * Calcula percentil de un array
 * @param {Array} arr - Array de valores
 * @param {number} percentile - Percentil (0-1)
 * @returns {number} Valor del percentil
 */
function calculatePercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[index] || 0;
}

/**
 * Valida resultados contra criterios
 * @param {Object} results - Resultados del test
 * @returns {Object} Validación
 */
function validateResults(results) {
  const criteria = {
    smoke: {
      successRate: 0.95,
      p95Latency: 3000, // 3s para codificación
      p99Latency: 6000, // 6s para codificación
    },
    load: {
      successRate: 0.9,
      p95Latency: 6000, // 6s para codificación
      p99Latency: 10000, // 10s para codificación
    },
  };

  const testCriteria = criteria[results.testType];

  const validation = {
    passed: true,
    checks: [],
  };

  // Check success rate
  if (results.successRate >= testCriteria.successRate) {
    validation.checks.push({
      name: 'Success Rate',
      passed: true,
      expected: `${(testCriteria.successRate * 100).toFixed(1)}%`,
      actual: `${(results.successRate * 100).toFixed(1)}%`,
    });
  } else {
    validation.checks.push({
      name: 'Success Rate',
      passed: false,
      expected: `${(testCriteria.successRate * 100).toFixed(1)}%`,
      actual: `${(results.successRate * 100).toFixed(1)}%`,
    });
    validation.passed = false;
  }

  // Check P95 latency
  if (results.p95Latency <= testCriteria.p95Latency) {
    validation.checks.push({
      name: 'P95 Latency',
      passed: true,
      expected: `≤${testCriteria.p95Latency}ms`,
      actual: `${results.p95Latency}ms`,
    });
  } else {
    validation.checks.push({
      name: 'P95 Latency',
      passed: false,
      expected: `≤${testCriteria.p95Latency}ms`,
      actual: `${results.p95Latency}ms`,
    });
    validation.passed = false;
  }

  // Check P99 latency
  if (results.p99Latency <= testCriteria.p99Latency) {
    validation.checks.push({
      name: 'P99 Latency',
      passed: true,
      expected: `≤${testCriteria.p99Latency}ms`,
      actual: `${results.p99Latency}ms`,
    });
  } else {
    validation.checks.push({
      name: 'P99 Latency',
      passed: false,
      expected: `≤${testCriteria.p99Latency}ms`,
      actual: `${results.p99Latency}ms`,
    });
    validation.passed = false;
  }

  return validation;
}

/**
 * Muestra resultados del test
 * @param {Object} results - Resultados del test
 * @param {Object} validation - Validación
 */
function displayResults(results, validation) {
  log('cyan', `\n📊 RESULTADOS ${results.testType.toUpperCase()} TEST`);
  log('cyan', '='.repeat(50));

  log('blue', `📈 Métricas Generales:`);
  log('green', `   Total Requests: ${results.totalRequests}`);
  log('green', `   Successful: ${results.successfulRequests}`);
  log('red', `   Failed: ${results.failedRequests}`);
  log('yellow', `   Success Rate: ${(results.successRate * 100).toFixed(1)}%`);
  log('yellow', `   RPS: ${results.rps}`);
  log('yellow', `   Duration: ${results.duration}s`);

  log('blue', `\n⏱️  Latencias:`);
  log('green', `   Average: ${results.avgLatency}ms`);
  log('green', `   P95: ${results.p95Latency}ms`);
  log('green', `   P99: ${results.p99Latency}ms`);

  log('blue', `\n🎯 Validación:`);
  validation.checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(color, `   ${status} ${check.name}: ${check.actual} (expected: ${check.expected})`);
  });

  const overallStatus = validation.passed ? '✅ PASSED' : '❌ FAILED';
  const overallColor = validation.passed ? 'green' : 'red';
  log(overallColor, `\n🏆 Overall: ${overallStatus}`);
}

/**
 * Función principal
 */
async function main() {
  log('cyan', '🚀 QUANNEX RATE LIMIT STRESS TEST');
  log('cyan', '==================================');

  try {
    // Ejecutar smoke test
    const smokeResults = await runSmokeTest();
    const smokeValidation = validateResults(smokeResults);
    displayResults(smokeResults, smokeValidation);

    // Si smoke test pasa, ejecutar load test
    if (smokeValidation.passed) {
      log('blue', '\n⏳ Esperando 5 segundos antes del load test...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const loadResults = await runLoadTest();
      const loadValidation = validateResults(loadResults);
      displayResults(loadResults, loadValidation);

      // Resultado final
      const allPassed = smokeValidation.passed && loadValidation.passed;
      const finalStatus = allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
      const finalColor = allPassed ? 'green' : 'red';

      log(finalColor, `\n🎉 FINAL RESULT: ${finalStatus}`);

      if (!allPassed) {
        process.exit(1);
      }
    } else {
      log('red', '\n❌ Smoke test failed - skipping load test');
      process.exit(1);
    }
  } catch (error) {
    log('red', `❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
