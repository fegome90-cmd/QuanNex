#!/usr/bin/env node
/**
 * performance-gate.mjs
 * Métrica "ganar o no ganar" objetiva
 * Un cambio se acepta si cumple todos los criterios frente al snapshot previo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

class PerformanceGate {
  constructor() {
    this.snapshotFile = path.join(PROJECT_ROOT, '.quannex', 'perf-snapshot.json');
    this.abSnapshotFile = path.join(PROJECT_ROOT, '.quannex', 'ab-snapshot.json');
    this.gateResultsFile = path.join(PROJECT_ROOT, '.quannex', 'gate-results.json');
    
    // Criterios de aceptación
    this.criteria = {
      p95_improvement: 0.85,    // p95_new ≤ p95_old × 0.85 (15% mejora)
      error_rate_max: 1.0,      // error_rate_new ≤ 1.0%
      tokens_overhead: 1.10     // tokens_out_new ≤ tokens_out_old × 1.10 (10% overhead máximo)
    };
  }

  loadSnapshot() {
    if (!fs.existsSync(this.snapshotFile)) {
      console.log('❌ Snapshot de performance no encontrado');
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(this.snapshotFile, 'utf8'));
    } catch (error) {
      console.log('❌ Error cargando snapshot:', error.message);
      return null;
    }
  }

  loadABSnapshot() {
    if (!fs.existsSync(this.abSnapshotFile)) {
      console.log('❌ Snapshot A/B no encontrado');
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(this.abSnapshotFile, 'utf8'));
    } catch (error) {
      console.log('❌ Error cargando snapshot A/B:', error.message);
      return null;
    }
  }

  async getCurrentMetrics() {
    console.log('📊 Obteniendo métricas actuales...');
    
    try {
      // Ejecutar verificador de performance
      const { spawnSync } = await import('node:child_process');
      const result = spawnSync('node', ['tools/verify-perf.js'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
      });
      
      if (result.status !== 0) {
        console.log('❌ Error ejecutando verificador de performance');
        return null;
      }
      
      // Extraer JSON del output
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        console.log('❌ No se encontró JSON en el output del verificador');
        return null;
      }
    } catch (error) {
      console.log('❌ Error obteniendo métricas actuales:', error.message);
      return null;
    }
  }

  evaluateCriteria(baseline, current) {
    console.log('🔍 Evaluando criterios de aceptación...');
    
    const results = {
      p95_improvement: null,
      error_rate_acceptable: null,
      tokens_overhead_acceptable: null,
      overall_pass: false
    };
    
    // Criterio 1: p95_new ≤ p95_old × 0.85
    if (baseline.p95_ms && current.p95_ms) {
      const threshold = baseline.p95_ms * this.criteria.p95_improvement;
      results.p95_improvement = {
        passed: current.p95_ms <= threshold,
        current: current.p95_ms,
        baseline: baseline.p95_ms,
        threshold: threshold,
        improvement: ((baseline.p95_ms - current.p95_ms) / baseline.p95_ms) * 100
      };
      
      console.log(`📈 P95 Latencia:`);
      console.log(`   Actual: ${current.p95_ms}ms`);
      console.log(`   Baseline: ${baseline.p95_ms}ms`);
      console.log(`   Umbral: ${threshold.toFixed(1)}ms`);
      console.log(`   Mejora: ${results.p95_improvement.improvement.toFixed(1)}%`);
      console.log(`   ✅ Pasa: ${results.p95_improvement.passed ? 'SÍ' : 'NO'}`);
    } else {
      console.log('⚠️  P95 no disponible en baseline o current');
    }
    
    // Criterio 2: error_rate_new ≤ 1.0%
    if (current.error_rate_pct !== undefined) {
      results.error_rate_acceptable = {
        passed: current.error_rate_pct <= this.criteria.error_rate_max,
        current: current.error_rate_pct,
        threshold: this.criteria.error_rate_max
      };
      
      console.log(`❌ Tasa de Error:`);
      console.log(`   Actual: ${current.error_rate_pct}%`);
      console.log(`   Umbral: ${this.criteria.error_rate_max}%`);
      console.log(`   ✅ Pasa: ${results.error_rate_acceptable.passed ? 'SÍ' : 'NO'}`);
    } else {
      console.log('⚠️  Error rate no disponible en current');
    }
    
    // Criterio 3: tokens_out_new ≤ tokens_out_old × 1.10
    if (baseline.tokens_out_total && current.tokens_out_total) {
      const threshold = baseline.tokens_out_total * this.criteria.tokens_overhead;
      results.tokens_overhead_acceptable = {
        passed: current.tokens_out_total <= threshold,
        current: current.tokens_out_total,
        baseline: baseline.tokens_out_total,
        threshold: threshold,
        overhead: ((current.tokens_out_total - baseline.tokens_out_total) / baseline.tokens_out_total) * 100
      };
      
      console.log(`🎯 Tokens Output:`);
      console.log(`   Actual: ${current.tokens_out_total}`);
      console.log(`   Baseline: ${baseline.tokens_out_total}`);
      console.log(`   Umbral: ${threshold.toFixed(0)}`);
      console.log(`   Overhead: ${results.tokens_overhead_acceptable.overhead.toFixed(1)}%`);
      console.log(`   ✅ Pasa: ${results.tokens_overhead_acceptable.passed ? 'SÍ' : 'NO'}`);
    } else {
      console.log('⚠️  Tokens output no disponible en baseline o current');
    }
    
    // Evaluación general
    const allCriteria = [
      results.p95_improvement?.passed,
      results.error_rate_acceptable?.passed,
      results.tokens_overhead_acceptable?.passed
    ].filter(result => result !== null);
    
    results.overall_pass = allCriteria.length > 0 && allCriteria.every(passed => passed === true);
    
    return results;
  }

  async runGate() {
    console.log('🚪 PERFORMANCE GATE');
    console.log('===================');
    console.log('');
    
    // Cargar snapshot baseline
    const baseline = this.loadSnapshot();
    if (!baseline) {
      console.log('❌ No se puede ejecutar gate sin snapshot baseline');
      return false;
    }
    
    console.log('📸 Snapshot baseline cargado');
    console.log(`   Hash: ${baseline.raw_hash?.substring(0, 16)}...`);
    console.log(`   P95: ${baseline.p95_ms}ms`);
    console.log(`   Error rate: ${baseline.error_rate_pct}%`);
    console.log(`   Tokens out: ${baseline.tokens_out_total}`);
    console.log('');
    
    // Obtener métricas actuales
    const current = await this.getCurrentMetrics();
    if (!current) {
      console.log('❌ No se pueden obtener métricas actuales');
      return false;
    }
    
    console.log('📊 Métricas actuales obtenidas');
    console.log(`   P95: ${current.p95_ms}ms`);
    console.log(`   Error rate: ${current.error_rate_pct}%`);
    console.log(`   Tokens out: ${current.tokens_out_total}`);
    console.log('');
    
    // Evaluar criterios
    const evaluation = this.evaluateCriteria(baseline, current);
    
    console.log('');
    console.log('🎯 RESULTADO DEL GATE:');
    console.log('======================');
    
    if (evaluation.overall_pass) {
      console.log('✅ GATE PASADO - Cambio aceptado');
      console.log('🚀 El sistema cumple todos los criterios de performance');
    } else {
      console.log('❌ GATE FALLIDO - Cambio rechazado');
      console.log('⚠️  El sistema no cumple uno o más criterios de performance');
    }
    
    // Guardar resultados
    const gateResults = {
      timestamp: new Date().toISOString(),
      baseline_snapshot: baseline,
      current_metrics: current,
      evaluation: evaluation,
      gate_passed: evaluation.overall_pass,
      criteria: this.criteria
    };
    
    fs.writeFileSync(this.gateResultsFile, JSON.stringify(gateResults, null, 2));
    console.log(`💾 Resultados guardados: ${this.gateResultsFile}`);
    
    return evaluation.overall_pass;
  }

  showCriteria() {
    console.log('🎯 CRITERIOS DE ACEPTACIÓN');
    console.log('===========================');
    console.log('');
    console.log('Un cambio se acepta si TODOS los criterios se cumplen:');
    console.log('');
    console.log('1. 📈 P95 Latencia:');
    console.log(`   p95_new ≤ p95_old × ${this.criteria.p95_improvement}`);
    console.log(`   (Mejora de al menos ${((1 - this.criteria.p95_improvement) * 100).toFixed(0)}%)`);
    console.log('');
    console.log('2. ❌ Tasa de Error:');
    console.log(`   error_rate_new ≤ ${this.criteria.error_rate_max}%`);
    console.log('');
    console.log('3. 🎯 Tokens Output:');
    console.log(`   tokens_out_new ≤ tokens_out_old × ${this.criteria.tokens_overhead}`);
    console.log(`   (Overhead máximo de ${((this.criteria.tokens_overhead - 1) * 100).toFixed(0)}%)`);
    console.log('');
    console.log('📋 Archivos:');
    console.log(`   Baseline: ${this.snapshotFile}`);
    console.log(`   A/B Snapshot: ${this.abSnapshotFile}`);
    console.log(`   Gate Results: ${this.gateResultsFile}`);
  }

  showHelp() {
    console.log('Performance Gate - Métrica ganar/no-ganar objetiva');
    console.log('==================================================');
    console.log('');
    console.log('Comandos:');
    console.log('  run                   Ejecutar performance gate');
    console.log('  criteria              Mostrar criterios de aceptación');
    console.log('  help                  Mostrar esta ayuda');
    console.log('');
    console.log('Uso:');
    console.log('  node tools/performance-gate.mjs run');
    console.log('  node tools/performance-gate.mjs criteria');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const gate = new PerformanceGate();
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      gate.runGate();
      break;
      
    case 'criteria':
      gate.showCriteria();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      gate.showHelp();
      break;
      
    default:
      if (command) {
        console.log('❌ Comando desconocido:', command);
      }
      gate.showHelp();
      break;
  }
}

export default PerformanceGate;
