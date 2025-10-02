#!/usr/bin/env node
/**
 * SLO Check Script
 * Verifica latencia p95 para endpoints internos
 */

import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const SLO_P95_THRESHOLD = 600; // 600ms p95
const REQUESTS_COUNT = 50;
const ENDPOINT = 'http://localhost:3000/agent/ping';

// Función para hacer una request HTTP
async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const curl = spawn('curl', ['-s', '-w', '%{time_total}', '-o', '/dev/null', url]);

    curl.on('close', code => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (code === 0) {
        resolve(responseTime);
      } else {
        reject(new Error(`curl failed with code ${code}`));
      }
    });

    curl.on('error', reject);
  });
}

// Función para calcular percentil 95
function calculateP95(times) {
  const sorted = times.sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index];
}

// Función para calcular estadísticas
function calculateStats(times) {
  const sorted = times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / times.length),
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
  };
}

async function main() {
  console.log('🚀 SLO Check - Testing endpoint latency...\n');

  // Verificar que el endpoint esté disponible
  try {
    await makeRequest(ENDPOINT);
    console.log(`✅ Endpoint ${ENDPOINT} is accessible`);
  } catch (error) {
    console.error(`❌ Endpoint ${ENDPOINT} is not accessible: ${error.message}`);
    console.error('Make sure the server is running on port 3000');
    process.exit(1);
  }

  console.log(`📊 Running ${REQUESTS_COUNT} requests to measure latency...\n`);

  const responseTimes = [];
  const errors = [];

  // Ejecutar requests
  for (let i = 0; i < REQUESTS_COUNT; i++) {
    try {
      const startTime = Date.now();
      const responseTime = await makeRequest(ENDPOINT);
      responseTimes.push(responseTime);

      // Mostrar progreso cada 10 requests
      if ((i + 1) % 10 === 0) {
        console.log(`  Completed ${i + 1}/${REQUESTS_COUNT} requests`);
      }

      // Pequeña pausa entre requests
      await setTimeout(10);
    } catch (error) {
      errors.push(error);
      console.error(`  Request ${i + 1} failed: ${error.message}`);
    }
  }

  console.log('\n📈 Analyzing results...\n');

  if (responseTimes.length === 0) {
    console.error('❌ No successful requests - cannot calculate SLO');
    process.exit(1);
  }

  const stats = calculateStats(responseTimes);
  const p95 = stats.p95;

  console.log('📊 Latency Statistics:');
  console.log(`  Min:     ${stats.min}ms`);
  console.log(`  Max:     ${stats.max}ms`);
  console.log(`  Average: ${stats.avg}ms`);
  console.log(`  P50:     ${stats.p50}ms`);
  console.log(`  P95:     ${stats.p95}ms`);
  console.log(`  P99:     ${stats.p99}ms`);

  console.log(`\n🎯 SLO Check Results:`);
  console.log(`  Threshold: ${SLO_P95_THRESHOLD}ms (P95)`);
  console.log(`  Actual:    ${p95}ms (P95)`);

  if (errors.length > 0) {
    console.log(`  Errors:   ${errors.length}/${REQUESTS_COUNT} requests failed`);
  }

  // Verificar SLO
  if (p95 > SLO_P95_THRESHOLD) {
    console.log(
      `\n❌ SLO FAILED: P95 latency (${p95}ms) exceeds threshold (${SLO_P95_THRESHOLD}ms)`
    );
    process.exit(1);
  } else {
    console.log(
      `\n✅ SLO PASSED: P95 latency (${p95}ms) is within threshold (${SLO_P95_THRESHOLD}ms)`
    );
  }

  // Mostrar distribución de tiempos
  console.log('\n📊 Response Time Distribution:');
  const ranges = [
    { min: 0, max: 100, label: '0-100ms' },
    { min: 100, max: 200, label: '100-200ms' },
    { min: 200, max: 300, label: '200-300ms' },
    { min: 300, max: 500, label: '300-500ms' },
    { min: 500, max: 1000, label: '500-1000ms' },
    { min: 1000, max: Infinity, label: '>1000ms' },
  ];

  ranges.forEach(range => {
    const count = responseTimes.filter(t => t >= range.min && t < range.max).length;
    const percentage = Math.round((count / responseTimes.length) * 100);
    console.log(`  ${range.label}: ${count} requests (${percentage}%)`);
  });
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ SLO check failed:', error.message);
    process.exit(1);
  });
}

export default main;
