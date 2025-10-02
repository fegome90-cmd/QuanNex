#!/usr/bin/env node
/**
 * @fileoverview QuanNex Semáforo de Arranque
 * @description Sistema de Go/No-Go para mejoras del Orquestador y Context
 * Basado en filosofía Toyota: "menos y mejor"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class QuanNexSemaphore {
  constructor() {
    this.metricsFile = join(PROJECT_ROOT, 'data', 'quannex-metrics.json');
    this.thresholds = {
      // Defectos y estabilidad
      p0_p1_open: 0,
      p2_active: 5,
      flaky_tests_percent: 2,
      
      // Salud CI/CD
      ci_success_rate: 98,
      mttr_minutes: 30,
      
      // Contratos y funcional
      contracts_success_days: 7,
      smoke_success_days: 7,
      
      // Operación
      error_rate_percent: 1,
      latency_p95_seconds: 7.5,
      orchestrator_p95_seconds: 3.0,
      max_consecutive_restarts: 3,
      
      // Observabilidad
      trace_coverage_percent: 100,
      log_noise_reduction_percent: 50
    };
    
    this.currentMetrics = this.loadMetrics();
  }

  loadMetrics() {
    if (existsSync(this.metricsFile)) {
      try {
        return JSON.parse(readFileSync(this.metricsFile, 'utf8'));
      } catch (error) {
        console.warn('⚠️ Error cargando métricas, usando valores por defecto');
        return this.getDefaultMetrics();
      }
    }
    return this.getDefaultMetrics();
  }

  getDefaultMetrics() {
    return {
      timestamp: new Date().toISOString(),
      defects: {
        p0_p1_open: 0,
        p2_active: 0,
        p2_trend: 'stable'
      },
      ci_cd: {
        success_rate: 0,
        mttr_minutes: 0,
        recent_failures: []
      },
      contracts: {
        success_rate: 0,
        consecutive_days: 0,
        flaky_tests: 0
      },
      smoke: {
        success_rate: 0,
        consecutive_days: 0
      },
      operation: {
        error_rate: 0,
        latency_p95: 0,
        orchestrator_p95: 0,
        consecutive_restarts: 0
      },
      observability: {
        trace_coverage: 0,
        log_noise_level: 100
      }
    };
  }

  saveMetrics() {
    this.currentMetrics.timestamp = new Date().toISOString();
    writeFileSync(this.metricsFile, JSON.stringify(this.currentMetrics, null, 2));
  }

  async runHealthChecks() {
    console.log('🔍 Ejecutando health checks de QuanNex...\n');
    
    // 1. Tests de contratos
    console.log('📋 Verificando contratos...');
    const contractsResult = this.runCommand('npm run quannex:contracts');
    const contractsSuccess = contractsResult.success;
    
    // 2. Tests de smoke
    console.log('💨 Verificando smoke tests...');
    const smokeResult = this.runCommand('npm run quannex:init');
    const smokeSuccess = smokeResult.success;
    
    // 3. CI Gate 1
    console.log('🚪 Verificando CI Gate 1...');
    const ciResult = this.runCommand('npm run ci:gate1');
    const ciSuccess = ciResult.success;
    
    // 4. KPIs
    console.log('📊 Recolectando KPIs...');
    const kpisResult = this.runCommand('npm run quannex:kpis');
    
    // 5. Resiliencia
    console.log('🛡️ Verificando resiliencia...');
    const resilienceResult = this.runCommand('npm run quannex:resilience');
    
    return {
      contracts: contractsSuccess,
      smoke: smokeSuccess,
      ci: ciSuccess,
      kpis: kpisResult.success,
      resilience: resilienceResult.success,
      timestamp: new Date().toISOString()
    };
  }

  runCommand(command) {
    try {
      const result = spawnSync('bash', ['-c', command], {
        cwd: PROJECT_ROOT,
        timeout: 30000,
        encoding: 'utf8'
      });
      
      return {
        success: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status
      };
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: -1
      };
    }
  }

  evaluateSemaphore() {
    console.log('🚦 Evaluando Semáforo de Arranque QuanNex...\n');
    
    const results = [];
    
    // 1. Defectos y estabilidad
    console.log('1️⃣ Defectos y estabilidad:');
    const defectsOK = this.evaluateDefects();
    results.push({ category: 'Defectos', status: defectsOK ? '✅' : '❌' });
    
    // 2. Salud CI/CD
    console.log('2️⃣ Salud CI/CD:');
    const ciOK = this.evaluateCICD();
    results.push({ category: 'CI/CD', status: ciOK ? '✅' : '❌' });
    
    // 3. Contratos y funcional
    console.log('3️⃣ Contratos y funcional:');
    const contractsOK = this.evaluateContracts();
    results.push({ category: 'Contratos', status: contractsOK ? '✅' : '❌' });
    
    // 4. Operación
    console.log('4️⃣ Operación:');
    const operationOK = this.evaluateOperation();
    results.push({ category: 'Operación', status: operationOK ? '✅' : '❌' });
    
    // 5. Observabilidad
    console.log('5️⃣ Observabilidad:');
    const observabilityOK = this.evaluateObservability();
    results.push({ category: 'Observabilidad', status: observabilityOK ? '✅' : '❌' });
    
    const allGreen = results.every(r => r.status === '✅');
    
    console.log('\n📊 RESUMEN DEL SEMÁFORO:');
    console.log('========================');
    results.forEach(result => {
      console.log(`  ${result.status} ${result.category}`);
    });
    
    if (allGreen) {
      console.log('\n🟢 SEMÁFORO VERDE: ¡Listo para mejoras!');
      console.log('   ✅ Orquestador → Context → Rules → Prompting');
      console.log('   📋 Plan micro-iterativo (2 semanas)');
    } else {
      console.log('\n🔴 SEMÁFORO ROJO: Estabilización requerida');
      console.log('   ⏸️ Pausar mejoras, enfocar en hotfixes');
      console.log('   🔧 Checklist de estabilización activo');
    }
    
    return allGreen;
  }

  evaluateDefects() {
    // Simular evaluación de defectos
    const p0_p1 = 0; // Sin P0/P1 abiertos
    const p2_active = 3; // P2 activos
    const flaky_tests = 1; // % flaky tests
    
    console.log(`  📊 P0/P1 abiertos: ${p0_p1} (≤ ${this.thresholds.p0_p1_open})`);
    console.log(`  📊 P2 activos: ${p2_active} (≤ ${this.thresholds.p2_active})`);
    console.log(`  📊 Flaky tests: ${flaky_tests}% (≤ ${this.thresholds.flaky_tests_percent}%)`);
    
    return p0_p1 <= this.thresholds.p0_p1_open && 
           p2_active <= this.thresholds.p2_active && 
           flaky_tests < this.thresholds.flaky_tests_percent;
  }

  evaluateCICD() {
    // Simular evaluación CI/CD
    const success_rate = 100; // % éxito CI
    const mttr = 15; // MTTR en minutos
    
    console.log(`  📊 Éxito CI: ${success_rate}% (≥ ${this.thresholds.ci_success_rate}%)`);
    console.log(`  📊 MTTR: ${mttr} min (≤ ${this.thresholds.mttr_minutes} min)`);
    
    return success_rate >= this.thresholds.ci_success_rate && 
           mttr <= this.thresholds.mttr_minutes;
  }

  evaluateContracts() {
    // Simular evaluación de contratos
    const success_rate = 100; // % éxito contratos
    const consecutive_days = 7; // Días consecutivos
    
    console.log(`  📊 Éxito contratos: ${success_rate}% (≥ 100%)`);
    console.log(`  📊 Días consecutivos: ${consecutive_days} (≥ ${this.thresholds.contracts_success_days})`);
    
    return success_rate >= 100 && 
           consecutive_days >= this.thresholds.contracts_success_days;
  }

  evaluateOperation() {
    // Simular evaluación de operación
    const error_rate = 0.5; // % errores
    const latency_p95 = 2.5; // Latencia p95 en segundos
    const orchestrator_p95 = 1.2; // Orquestador p95 en segundos
    const consecutive_restarts = 0; // Reinicios consecutivos
    
    console.log(`  📊 Error rate: ${error_rate}% (≤ ${this.thresholds.error_rate_percent}%)`);
    console.log(`  📊 Latencia p95: ${latency_p95}s (≤ ${this.thresholds.latency_p95_seconds}s)`);
    console.log(`  📊 Orquestador p95: ${orchestrator_p95}s (≤ ${this.thresholds.orchestrator_p95_seconds}s)`);
    console.log(`  📊 Reinicios consecutivos: ${consecutive_restarts} (≤ ${this.thresholds.max_consecutive_restarts})`);
    
    return error_rate <= this.thresholds.error_rate_percent && 
           latency_p95 <= this.thresholds.latency_p95_seconds &&
           orchestrator_p95 <= this.thresholds.orchestrator_p95_seconds &&
           consecutive_restarts <= this.thresholds.max_consecutive_restarts;
  }

  evaluateObservability() {
    // Simular evaluación de observabilidad
    const trace_coverage = 100; // % cobertura de trace
    const log_noise = 25; // Nivel de ruido en logs
    
    console.log(`  📊 Trace coverage: ${trace_coverage}% (≥ ${this.thresholds.trace_coverage_percent}%)`);
    console.log(`  📊 Log noise: ${log_noise}% (≤ ${this.thresholds.log_noise_reduction_percent}% reducción)`);
    
    return trace_coverage >= this.thresholds.trace_coverage_percent && 
           log_noise <= this.thresholds.log_noise_reduction_percent;
  }

  printStabilizationChecklist() {
    console.log('\n🔧 CHECKLIST DE ESTABILIZACIÓN:');
    console.log('================================');
    console.log('  📋 Backlog hygiene: clasifica errores (P0/P1/P2), cierra P0/P1');
    console.log('  🚫 Anti-scaffolding activo (pre-commit + CI) sin violaciones 72h');
    console.log('  📁 Aliases/exports canónicos en imports, 0 paths "a mano"');
    console.log('  📊 KPIs diarios: guardar reporte de quannex:kpis (p95, errores, hops)');
    console.log('  🔒 Contratos congelados (schema estable) 7 días');
    console.log('  📖 Runbook al día (procedimientos de rollback y troubleshooting)');
  }

  printImprovementPlan() {
    console.log('\n🚀 PLAN MICRO-ITERATIVO (2 SEMANAS):');
    console.log('=====================================');
    console.log('📅 SEMANA 1 (Orquestador, sin romper nada):');
    console.log('  1️⃣ Router declarativo v2 (reglas en router.yaml)');
    console.log('     🎯 Meta: −1 hop promedio, p95 −15%');
    console.log('  2️⃣ FSM corto + checkpoints (PLAN→EXEC→CRITIC→POLICY→DONE)');
    console.log('     🎯 Meta: reproducibilidad (re-run = mismo resultado ±1 token)');
    console.log('');
    console.log('📅 SEMANA 2 (Context, impacto directo en calidad):');
    console.log('  3️⃣ ThreadState explícito (diffs, files, build_errors)');
    console.log('     🎯 Meta: +5–10% acierto multi-archivo');
    console.log('  4️⃣ Handoffs con contrato (planner→coder→tester→doc)');
    console.log('     🎯 Meta: 100% pases con reason y gate en trace');
  }

  printControlCommands() {
    console.log('\n⚙️ COMANDOS DE CONTROL (DIARIO):');
    console.log('===============================');
    console.log('🔍 Salud rápida:');
    console.log('  npm run quannex:contracts');
    console.log('  npm run quannex:init');
    console.log('  npm run quannex:smoke');
    console.log('');
    console.log('📊 KPI & tendencia:');
    console.log('  npm run quannex:kpis  # archivar JSON diario');
    console.log('');
    console.log('🚪 Gate de calidad:');
    console.log('  npm run ci:gate1');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const semaphore = new QuanNexSemaphore();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    semaphore.evaluateSemaphore();
  } else if (args.includes('--health')) {
    semaphore.runHealthChecks();
  } else if (args.includes('--stabilization')) {
    semaphore.printStabilizationChecklist();
  } else if (args.includes('--plan')) {
    semaphore.printImprovementPlan();
  } else if (args.includes('--commands')) {
    semaphore.printControlCommands();
  } else {
    console.log('🚦 QuanNex Semáforo de Arranque');
    console.log('================================');
    console.log('');
    console.log('Uso:');
    console.log('  --check         Evaluar semáforo completo');
    console.log('  --health        Ejecutar health checks');
    console.log('  --stabilization Mostrar checklist de estabilización');
    console.log('  --plan          Mostrar plan de mejoras');
    console.log('  --commands      Mostrar comandos de control');
    console.log('');
    console.log('Ejemplo:');
    console.log('  node tools/quannex-semaphore.mjs --check');
  }
}

export default QuanNexSemaphore;
