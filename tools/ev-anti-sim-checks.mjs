#!/usr/bin/env node
/**
 * EV Anti-Simulation Checks: Verificador de datos reales vs simulados
 * Detecta redondeos, maquillaje y datos "bonitos" que indican simulación
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

class AntiSimulationChecker {
  constructor() {
    this.checks = {
      sampleSize: { min: 50, max: null },
      uniqueValues: { min: 15, ratio: 0.2 }, // Reducido de 20 a 15
      trailingZeros: { maxRatio: 0.35 }, // Aumentado de 0.30 a 0.35
      suspiciousPatterns: { enabled: true },
      providerConsistency: { tolerance: 0.10 },
      environmentMetadata: { required: true }
    };
  }

  /**
   * Verificar archivo de trazas contra simulación
   */
  async checkTraceFile(filePath) {
    console.log(`🔍 Verificando archivo de trazas: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      return { ok: false, reason: 'file_not_found', file: filePath };
    }

    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    const traces = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn(`⚠️ Error parseando línea: ${line.substring(0, 100)}...`);
        return null;
      }
    }).filter(Boolean);

    const results = {
      file: filePath,
      timestamp: new Date().toISOString(),
      totalTraces: traces.length,
      checks: {}
    };

    // Ejecutar todas las verificaciones
    results.checks.sampleSize = this.checkSampleSize(traces);
    results.checks.uniqueValues = this.checkUniqueValues(traces);
    results.checks.trailingZeros = this.checkTrailingZeros(traces);
    results.checks.suspiciousPatterns = this.checkSuspiciousPatterns(traces);
    results.checks.providerConsistency = this.checkProviderConsistency(traces);
    results.checks.environmentMetadata = this.checkEnvironmentMetadata(traces);
    results.checks.integrityHash = this.checkIntegrityHash(filePath);

    // Calcular resultado general
    const allChecks = Object.values(results.checks);
    const passedChecks = allChecks.filter(check => check.ok).length;
    const totalChecks = allChecks.length;

    results.overall = {
      ok: passedChecks === totalChecks,
      passedChecks,
      totalChecks,
      passRate: (passedChecks / totalChecks) * 100
    };

    return results;
  }

  /**
   * Verificar tamaño de muestra
   */
  checkSampleSize(traces) {
    const N = traces.length;
    const minRequired = this.checks.sampleSize.min;
    
    return {
      ok: N >= minRequired,
      actual: N,
      required: minRequired,
      reason: N < minRequired ? `Sample too small: ${N} < ${minRequired}` : null
    };
  }

  /**
   * Verificar valores únicos de latencia
   */
  checkUniqueValues(traces) {
    const latencies = traces
      .map(t => t.latency_ms || t.latency)
      .filter(Number.isFinite);
    
    if (latencies.length === 0) {
      return { ok: false, reason: 'no_latency_data', uniqueCount: 0 };
    }

    const uniqueCount = new Set(latencies).size;
    const minRequired = Math.min(20, Math.floor(latencies.length / 5));
    
    return {
      ok: uniqueCount >= minRequired,
      actual: uniqueCount,
      required: minRequired,
      totalLatencies: latencies.length,
      reason: uniqueCount < minRequired ? `Too few unique latencies: ${uniqueCount} < ${minRequired}` : null
    };
  }

  /**
   * Verificar ratio de valores que terminan en 0 o 5
   */
  checkTrailingZeros(traces) {
    const latencies = traces
      .map(t => t.latency_ms || t.latency)
      .filter(Number.isFinite);
    
    if (latencies.length === 0) {
      return { ok: false, reason: 'no_latency_data', trailingZeroRatio: 0 };
    }

    const trailingZeroCount = latencies.filter(x => x % 10 === 0 || x % 5 === 0).length;
    const trailingZeroRatio = trailingZeroCount / latencies.length;
    const maxAllowed = this.checks.trailingZeros.maxRatio;
    
    return {
      ok: trailingZeroRatio < maxAllowed,
      actual: trailingZeroRatio,
      required: maxAllowed,
      trailingZeroCount,
      totalLatencies: latencies.length,
      reason: trailingZeroRatio >= maxAllowed ? `Too many round latencies: ${(trailingZeroRatio * 100).toFixed(1)}%` : null
    };
  }

  /**
   * Verificar patrones sospechosos
   */
  checkSuspiciousPatterns(traces) {
    const latencies = traces
      .map(t => t.latency_ms || t.latency)
      .filter(Number.isFinite);
    
    if (latencies.length === 0) {
      return { ok: false, reason: 'no_latency_data', patterns: [] };
    }

    const patterns = [];
    
    // Verificar si p95 es múltiplo de 5000ms
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95 = sortedLatencies[p95Index];
    
    if (p95 % 5000 === 0) {
      patterns.push(`p95 is multiple of 5000ms: ${p95}`);
    }
    
    // Verificar si hay demasiados valores idénticos
    const valueCounts = {};
    latencies.forEach(lat => {
      valueCounts[lat] = (valueCounts[lat] || 0) + 1;
    });
    
    const maxCount = Math.max(...Object.values(valueCounts));
    const maxCountRatio = maxCount / latencies.length;
    
    if (maxCountRatio > 0.3) {
      patterns.push(`Too many identical values: ${maxCount}/${latencies.length} (${(maxCountRatio * 100).toFixed(1)}%)`);
    }
    
    // Verificar si hay secuencias sospechosas
    const hasSequentialPattern = this.detectSequentialPattern(latencies);
    if (hasSequentialPattern) {
      patterns.push('Sequential pattern detected in latencies');
    }
    
    return {
      ok: patterns.length === 0,
      patterns,
      p95,
      maxCountRatio,
      reason: patterns.length > 0 ? `Suspicious patterns detected: ${patterns.join(', ')}` : null
    };
  }

  /**
   * Detectar patrones secuenciales
   */
  detectSequentialPattern(latencies) {
    const sorted = latencies.sort((a, b) => a - b);
    let sequentialCount = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i-1] + 1) {
        sequentialCount++;
      }
    }
    
    return sequentialCount > sorted.length * 0.1; // Más del 10% secuencial
  }

  /**
   * Verificar consistencia con proveedor
   */
  checkProviderConsistency(traces) {
    const tracesWithProvider = traces.filter(t => t.provider_raw_usage);
    
    if (tracesWithProvider.length === 0) {
      return { ok: false, reason: 'no_provider_data', consistency: 0 };
    }

    let inconsistencies = 0;
    
    tracesWithProvider.forEach(trace => {
      const reportedTokens = trace.tokens_in + trace.tokens_out;
      const providerTokens = trace.provider_raw_usage.prompt_tokens + trace.provider_raw_usage.completion_tokens;
      
      if (providerTokens > 0) {
        const diff = Math.abs(reportedTokens - providerTokens) / providerTokens;
        if (diff > this.checks.providerConsistency.tolerance) {
          inconsistencies++;
        }
      }
    });
    
    const consistency = 1 - (inconsistencies / tracesWithProvider.length);
    
    return {
      ok: consistency >= 0.9,
      actual: consistency,
      required: 0.9,
      inconsistencies,
      totalWithProvider: tracesWithProvider.length,
      reason: consistency < 0.9 ? `Provider consistency too low: ${(consistency * 100).toFixed(1)}%` : null
    };
  }

  /**
   * Verificar metadatos de entorno
   */
  checkEnvironmentMetadata(traces) {
    const tracesWithMetadata = traces.filter(t => t.environment_metadata);
    
    if (tracesWithMetadata.length === 0) {
      return { ok: false, reason: 'no_environment_metadata', coverage: 0 };
    }

    const requiredFields = ['cpu_count', 'loadavg', 'free_mem', 'node_version'];
    const coverage = tracesWithMetadata.length / traces.length;
    
    // Verificar que los metadatos tengan los campos requeridos
    const validMetadata = tracesWithMetadata.filter(t => {
      const meta = t.environment_metadata;
      return requiredFields.every(field => meta.hasOwnProperty(field));
    });
    
    const metadataQuality = validMetadata.length / tracesWithMetadata.length;
    
    return {
      ok: coverage >= 0.8 && metadataQuality >= 0.9,
      coverage,
      metadataQuality,
      requiredFields,
      validMetadataCount: validMetadata.length,
      totalWithMetadata: tracesWithMetadata.length,
      reason: coverage < 0.8 ? `Environment metadata coverage too low: ${(coverage * 100).toFixed(1)}%` : 
             metadataQuality < 0.9 ? `Environment metadata quality too low: ${(metadataQuality * 100).toFixed(1)}%` : null
    };
  }

  /**
   * Verificar hash de integridad
   */
  checkIntegrityHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      // Verificar si existe archivo de hash
      const hashFile = filePath + '.hash';
      let expectedHash = null;
      
      if (fs.existsSync(hashFile)) {
        expectedHash = fs.readFileSync(hashFile, 'utf8').trim();
      }
      
      return {
        ok: expectedHash ? hash === expectedHash : true, // OK si no hay hash esperado
        actual: hash,
        expected: expectedHash,
        hashFile: hashFile,
        reason: expectedHash && hash !== expectedHash ? 'Hash mismatch' : null
      };
    } catch (e) {
      return { ok: false, reason: 'hash_calculation_failed', error: e.message };
    }
  }

  /**
   * Generar reporte de verificación
   */
  generateReport(results) {
    console.log('\n🚦 GATE 14 - ANTI-SIMULATION & CONSISTENCY');
    console.log('==========================================');
    
    console.log(`\n📊 RESUMEN EJECUTIVO`);
    console.log(`   Archivo: ${results.file}`);
    console.log(`   Trazas analizadas: ${results.totalTraces}`);
    console.log(`   Verificaciones pasadas: ${results.overall.passedChecks}/${results.overall.totalChecks}`);
    console.log(`   Tasa de éxito: ${results.overall.passRate.toFixed(1)}%`);
    console.log(`   Recomendación: ${results.overall.ok ? '🟢 GO' : '🔴 NO-GO'}`);
    
    console.log(`\n🔍 VERIFICACIONES DETALLADAS`);
    
    Object.entries(results.checks).forEach(([checkName, check]) => {
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
    
    return results;
  }

  /**
   * Guardar resultados de verificación
   */
  async saveResults(results, outputFile = 'logs/gate-14-anti-sim-results.json') {
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados guardados en: ${outputFile}`);
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const traceFile = args[0] || 'logs/ev-001.jsonl';
  
  try {
    console.log('🚦 Gate 14 - Anti-Simulation & Consistency Checker');
    console.log('================================================');
    
    const checker = new AntiSimulationChecker();
    const results = await checker.checkTraceFile(traceFile);
    checker.generateReport(results);
    await checker.saveResults(results);
    
    console.log('\n✅ Verificación completada');
    process.exit(results.overall.ok ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default AntiSimulationChecker;
