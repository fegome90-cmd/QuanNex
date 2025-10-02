#!/usr/bin/env node
/**
 * Gate 14 - Anti-Simulation & Consistency
 * Verifica que los datos no sean simulados o "prettificados"
 */
import fs from 'node:fs';
import AntiSimulationChecker from './ev-anti-sim-checks.mjs';
import EVPreciseTracer from './ev-precise-tracer.mjs';

class Gate14AntiSimulation {
  constructor() {
    this.gateId = 'GATE-14';
    this.gateName = 'Anti-Simulation & Consistency';
    this.traceFile = 'logs/ev-precise-traces.jsonl';
    this.results = {
      gateId: this.gateId,
      gateName: this.gateName,
      timestamp: new Date().toISOString(),
      status: 'pending',
      checks: {},
      overall: { ok: false, reason: null }
    };
  }

  /**
   * Ejecutar Gate 14 completo
   */
  async runGate() {
    console.log(`🚦 ${this.gateId} - ${this.gateName}`);
    console.log('=====================================');
    
    try {
      // Paso 1: Generar trazas precisas
      console.log('\n📊 Paso 1: Generando trazas precisas...');
      const tracer = new EVPreciseTracer();
      await tracer.runPreciseTest();
      
      // Paso 2: Verificar anti-simulación
      console.log('\n🔍 Paso 2: Verificando anti-simulación...');
      const checker = new AntiSimulationChecker();
      const verificationResults = await checker.checkTraceFile(this.traceFile);
      
      // Paso 3: Evaluar criterios
      console.log('\n📋 Paso 3: Evaluando criterios...');
      this.evaluateCriteria(verificationResults);
      
      // Paso 4: Generar reporte
      console.log('\n📊 Paso 4: Generando reporte...');
      this.generateReport();
      
      // Paso 5: Guardar resultados
      await this.saveResults();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Error en Gate 14:', error.message);
      this.results.status = 'failed';
      this.results.overall = { ok: false, reason: error.message };
      return this.results;
    }
  }

  /**
   * Evaluar criterios de Gate 14
   */
  evaluateCriteria(verificationResults) {
    this.results.checks = verificationResults.checks;
    this.results.verificationResults = verificationResults;
    
    // Criterios específicos de Gate 14
    const criteria = {
      sampleSize: verificationResults.checks.sampleSize?.ok || false,
      uniqueValues: verificationResults.checks.uniqueValues?.ok || false,
      trailingZeros: verificationResults.checks.trailingZeros?.ok || false,
      suspiciousPatterns: verificationResults.checks.suspiciousPatterns?.ok || false,
      providerConsistency: verificationResults.checks.providerConsistency?.ok || false,
      environmentMetadata: verificationResults.checks.environmentMetadata?.ok || false,
      integrityHash: verificationResults.checks.integrityHash?.ok || false
    };
    
    // Calcular resultado general
    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;
    const passRate = (passedCriteria / totalCriteria) * 100;
    
    // Gate 14 requiere ≥85% de criterios pasados
    const gatePassed = passRate >= 85;
    
    this.results.criteria = criteria;
    this.results.overall = {
      ok: gatePassed,
      reason: gatePassed ? 'Gate passed' : `Only ${passRate.toFixed(1)}% criteria passed (required ≥85%)`,
      passRate,
      passedCriteria,
      totalCriteria
    };
    
    this.results.status = gatePassed ? 'passed' : 'failed';
  }

  /**
   * Generar reporte detallado
   */
  generateReport() {
    console.log(`\n📊 REPORTE ${this.gateId}`);
    console.log('========================');
    
    console.log(`\n🎯 RESUMEN EJECUTIVO`);
    console.log(`   Estado: ${this.results.status === 'passed' ? '🟢 PASÓ' : '🔴 FALLÓ'}`);
    console.log(`   Criterios pasados: ${this.results.overall.passedCriteria}/${this.results.overall.totalCriteria}`);
    console.log(`   Tasa de éxito: ${this.results.overall.passRate.toFixed(1)}%`);
    console.log(`   Razón: ${this.results.overall.reason}`);
    
    console.log(`\n📋 CRITERIOS DE EVALUACIÓN`);
    Object.entries(this.results.criteria).forEach(([criterion, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`   ${criterion}: ${status} ${passed ? 'PASÓ' : 'FALLÓ'}`);
    });
    
    console.log(`\n🔍 VERIFICACIONES DETALLADAS`);
    if (this.results.verificationResults) {
      Object.entries(this.results.verificationResults.checks).forEach(([checkName, check]) => {
        const status = check.ok ? '✅' : '❌';
        console.log(`   ${checkName}: ${status} ${check.ok ? 'PASÓ' : 'FALLÓ'}`);
        
        if (!check.ok && check.reason) {
          console.log(`     Razón: ${check.reason}`);
        }
        
        if (check.actual !== undefined) {
          console.log(`     Valor: ${check.actual}`);
          if (check.required !== undefined) {
            console.log(`     Requerido: ${check.required}`);
          }
        }
      });
    }
    
    console.log(`\n📈 MÉTRICAS DE CALIDAD`);
    if (this.results.verificationResults) {
      const checks = this.results.verificationResults.checks;
      
      if (checks.uniqueValues) {
        console.log(`   Valores únicos de latencia: ${checks.uniqueValues.actual}/${checks.uniqueValues.required}`);
      }
      
      if (checks.trailingZeros) {
        console.log(`   Ratio de valores redondeados: ${(checks.trailingZeros.actual * 100).toFixed(1)}%`);
      }
      
      if (checks.providerConsistency) {
        console.log(`   Consistencia con proveedor: ${(checks.providerConsistency.actual * 100).toFixed(1)}%`);
      }
      
      if (checks.environmentMetadata) {
        console.log(`   Cobertura de metadatos: ${(checks.environmentMetadata.coverage * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Guardar resultados
   */
  async saveResults() {
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const resultsFile = `logs/${this.gateId.toLowerCase()}-results.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Resultados guardados en: ${resultsFile}`);
  }

  /**
   * Verificar si Gate 14 está habilitado
   */
  static isEnabled() {
    return process.env.GATE_14_ENABLED === 'true' || process.env.QUANNEX_GATES === 'all';
  }

  /**
   * Ejecutar Gate 14 si está habilitado
   */
  static async runIfEnabled() {
    if (!Gate14AntiSimulation.isEnabled()) {
      console.log('⏭️ Gate 14 deshabilitado (GATE_14_ENABLED=false)');
      return { ok: true, reason: 'disabled' };
    }
    
    const gate = new Gate14AntiSimulation();
    return await gate.runGate();
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    const gate = new Gate14AntiSimulation();
    const results = await gate.runGate();
    
    console.log('\n✅ Gate 14 completado');
    process.exit(results.overall.ok ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error en Gate 14:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default Gate14AntiSimulation;
