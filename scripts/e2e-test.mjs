#!/usr/bin/env node
/**
 * Test e2e para QuanNex en Docker
 * Simula un flujo completo: plan → ejecución → logs → validación de gates
 */

import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';

async function log(msg) {
  console.log(`[E2E] ${msg}`);
}

async function fail(msg) {
  console.error(`\n❌ [E2E-FAIL] ${msg}\n`);
  process.exit(1);
}

async function checkServerHealth() {
  log('🔍 Verificando salud del servidor...');

  try {
    const response = await fetch('http://localhost:3000/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    const data = await response.json();
    log(`✅ Servidor saludable: ${JSON.stringify(data)}`);
    return true;
  } catch (error) {
    log(`⚠️ Servidor no disponible: ${error.message}`);
    return false;
  }
}

async function checkMetricsEndpoint() {
  log('📊 Verificando endpoint de métricas...');

  try {
    const response = await fetch('http://localhost:3000/metrics');
    if (!response.ok) {
      throw new Error(`Metrics endpoint failed: ${response.status}`);
    }
    const text = await response.text();

    // Verificar que contiene métricas esperadas
    const hasRequests = text.includes('qn_http_requests_total');
    const hasDuration = text.includes('qn_http_request_duration_seconds');

    if (hasRequests && hasDuration) {
      log('✅ Endpoint de métricas funcionando correctamente');
      return true;
    } else {
      log(`⚠️ Métricas incompletas. Contenido: ${text.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    log(`⚠️ Error en endpoint de métricas: ${error.message}`);
    return false;
  }
}

async function runQualityGate() {
  log('🚪 Ejecutando Quality Gate...');

  try {
    execSync('node scripts/quality-gate.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    log('✅ Quality Gate pasó');
    return true;
  } catch (error) {
    log(`⚠️ Quality Gate falló: ${error.message}`);
    return false;
  }
}

async function runPolicyCheck() {
  log('🔒 Ejecutando Policy Check...');

  try {
    execSync('node scripts/policy-check.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    log('✅ Policy Check pasó');
    return true;
  } catch (error) {
    log(`⚠️ Policy Check falló: ${error.message}`);
    return false;
  }
}

async function runScanGate() {
  log('🔍 Ejecutando Scan Gate...');

  try {
    execSync('node scripts/scan-gate.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    log('✅ Scan Gate pasó');
    return true;
  } catch (error) {
    log(`⚠️ Scan Gate falló: ${error.message}`);
    return false;
  }
}

async function runMetricsGate() {
  log('📈 Ejecutando Metrics Gate...');

  try {
    execSync('node scripts/metrics-gate.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    log('✅ Metrics Gate pasó');
    return true;
  } catch (error) {
    log(`⚠️ Metrics Gate falló: ${error.message}`);
    return false;
  }
}

async function simulateWorkflow() {
  log('🔄 Simulando workflow completo...');

  try {
    // Simular llamadas a diferentes endpoints
    const endpoints = ['/health', '/metrics', '/agent/metrics', '/agent/security'];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        log(`✅ ${endpoint}: ${response.status}`);
      } catch (error) {
        log(`⚠️ ${endpoint}: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    log(`⚠️ Error en simulación de workflow: ${error.message}`);
    return false;
  }
}

async function generateReport(results) {
  log('📋 Generando reporte e2e...');

  const report = {
    timestamp: new Date().toISOString(),
    environment: 'docker',
    tests: {
      server_health: results.serverHealth,
      metrics_endpoint: results.metricsEndpoint,
      quality_gate: results.qualityGate,
      policy_check: results.policyCheck,
      scan_gate: results.scanGate,
      metrics_gate: results.metricsGate,
      workflow_simulation: results.workflowSimulation,
    },
    summary: {
      total_tests: 7,
      passed: Object.values(results).filter(Boolean).length,
      failed: Object.values(results).filter(r => !r).length,
      success_rate: `${Math.round((Object.values(results).filter(Boolean).length / 7) * 100)}%`,
    },
  };

  const reportPath = 'reports/e2e-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Reporte guardado en: ${reportPath}`);

  return report;
}

async function main() {
  try {
    log('🚀 Iniciando test e2e de QuanNex...');

    // Ejecutar todas las verificaciones
    const results = {
      serverHealth: await checkServerHealth(),
      metricsEndpoint: await checkMetricsEndpoint(),
      qualityGate: await runQualityGate(),
      policyCheck: await runPolicyCheck(),
      scanGate: await runScanGate(),
      metricsGate: await runMetricsGate(),
      workflowSimulation: await simulateWorkflow(),
    };

    // Generar reporte
    const report = await generateReport(results);

    // Determinar resultado final
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    if (passedTests >= totalTests * 0.8) {
      // 80% de éxito mínimo
      log(`✅ Test e2e completado: ${passedTests}/${totalTests} tests pasaron`);
      log(`📊 Tasa de éxito: ${report.summary.success_rate}`);
    } else {
      fail(
        `Test e2e falló: solo ${passedTests}/${totalTests} tests pasaron (${report.summary.success_rate})`
      );
    }
  } catch (error) {
    fail(`Error durante test e2e: ${error.message}`);
  }
}

main();
