#!/usr/bin/env node
/**
 * Quannex Context Agent - Analizador de Métricas
 * Análisis estadístico con Gate 14 anti-simulación
 */

import fs from 'node:fs';

// Función para calcular cuantiles
function quantile(arr, q) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((x, y) => x - y);
  const idx = (sorted.length - 1) * q;
  const i = Math.floor(idx);
  const f = idx - i;
  return i + 1 < sorted.length ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i];
}

// Bootstrap confidence interval
function bootstrapCI(arr, q = 0.95, B = 1000, statFn = x => quantile(x, 0.95)) {
  if (arr.length === 0) return [0, 0];

  const n = arr.length;
  const stats = [];

  for (let b = 0; b < B; b++) {
    const sample = Array.from({ length: n }, () => arr[Math.floor(Math.random() * n)]);
    stats.push(statFn(sample));
  }

  stats.sort((a, b) => a - b);
  const low = stats[Math.floor(((1 - q) / 2) * B)];
  const high = stats[Math.floor(((1 + (1 - q)) / 2) * B)];

  return [low, high];
}

// Gate 14: Anti-simulación - detectar datos falsos o sintéticos
function antiSimulationCheck(lines) {
  const latencies = lines.map(x => x.latency_ms).filter(Number.isFinite);

  if (latencies.length === 0) {
    return { ok: false, reason: 'no_valid_latencies' };
  }

  // 1. Verificar diversidad de valores únicos
  const uniqueValues = new Set(latencies).size;
  const minUniqueThreshold = Math.min(20, Math.floor(latencies.length / 5));

  // 2. Detectar patrones sospechosos (valores redondos)
  const roundValues = latencies.filter(v => v % 10 === 0 || v % 5 === 0).length;
  const roundRatio = roundValues / latencies.length;

  // 3. Verificar distribución de latencias (no debe ser demasiado uniforme)
  const sorted = [...latencies].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;

  // 4. Detectar secuencias sospechosas
  const sequentialCount = latencies.filter(
    (val, idx) => idx > 0 && Math.abs(val - latencies[idx - 1]) < 1
  ).length;
  const sequentialRatio = sequentialCount / latencies.length;

  // Criterios de validación
  const checks = {
    unique_values: uniqueValues,
    unique_threshold: minUniqueThreshold,
    round_ratio: roundRatio,
    gap_variance: gapVariance,
    sequential_ratio: sequentialRatio,
  };

  const ok =
    uniqueValues >= minUniqueThreshold &&
    roundRatio < 0.3 &&
    gapVariance > 0.1 &&
    sequentialRatio < 0.15;

  return {
    ok,
    checks,
    reason: ok ? 'passed' : 'failed_anti_simulation',
  };
}

// Análisis estadístico completo
function analyzeMetrics(filePath) {
  console.log(`📊 Analizando métricas de: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(filePath, 'utf8').trim();
  if (!rawData) {
    console.error(`❌ Archivo vacío: ${filePath}`);
    process.exit(1);
  }

  const lines = rawData
    .split('\n')
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.warn(`⚠️  Línea inválida ignorada: ${line.substring(0, 50)}...`);
        return null;
      }
    })
    .filter(Boolean);

  if (lines.length === 0) {
    console.error(`❌ No hay datos válidos en el archivo`);
    process.exit(1);
  }

  // Separar requests exitosos y fallidos
  const successful = lines.filter(r => r.status === 200);
  const failed = lines.filter(r => r.status !== 200);

  // Métricas de latencia
  const latencies = successful.map(r => r.latency_ms).filter(Number.isFinite);

  if (latencies.length === 0) {
    console.error(`❌ No hay latencias válidas para analizar`);
    process.exit(1);
  }

  // Estadísticas básicas
  const p50 = quantile(latencies, 0.5);
  const p95 = quantile(latencies, 0.95);
  const p99 = quantile(latencies, 0.99);
  const p99_9 = quantile(latencies, 0.999);

  // Confidence intervals
  const [p95_ci_low, p95_ci_high] = bootstrapCI(latencies, 0.95, 800, a => quantile(a, 0.95));
  const [p99_ci_low, p99_ci_high] = bootstrapCI(latencies, 0.99, 800, a => quantile(a, 0.99));

  // Métricas de tokens
  const tokensIn = successful.map(r => r.tokens_in).filter(Number.isFinite);
  const tokensOut = successful.map(r => r.tokens_out).filter(Number.isFinite);

  // Gate 14: Anti-simulación
  const antiSim = antiSimulationCheck(lines);

  // Compilar resultados
  const results = {
    metadata: {
      file: filePath,
      timestamp: new Date().toISOString(),
      total_requests: lines.length,
      successful_requests: successful.length,
      failed_requests: failed.length,
      success_rate: ((successful.length / lines.length) * 100).toFixed(2) + '%',
    },

    latency_stats: {
      p50_ms: Math.round(p50),
      p95_ms: Math.round(p95),
      p99_ms: Math.round(p99),
      p99_9_ms: Math.round(p99_9),
      p95_ci95: [Math.round(p95_ci_low), Math.round(p95_ci_high)],
      p99_ci95: [Math.round(p99_ci_low), Math.round(p99_ci_high)],
      min_ms: Math.round(Math.min(...latencies)),
      max_ms: Math.round(Math.max(...latencies)),
      mean_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    },

    token_stats: {
      avg_tokens_in:
        tokensIn.length > 0 ? Math.round(tokensIn.reduce((a, b) => a + b, 0) / tokensIn.length) : 0,
      avg_tokens_out:
        tokensOut.length > 0
          ? Math.round(tokensOut.reduce((a, b) => a + b, 0) / tokensOut.length)
          : 0,
      total_tokens_in: tokensIn.reduce((a, b) => a + b, 0),
      total_tokens_out: tokensOut.reduce((a, b) => a + b, 0),
    },

    gate14_anti_simulation: antiSim,

    performance_grade: (() => {
      if (p95 <= 1000) return 'A+';
      if (p95 <= 2000) return 'A';
      if (p95 <= 3000) return 'B';
      if (p95 <= 5000) return 'C';
      return 'D';
    })(),
  };

  return results;
}

// Función principal
function main() {
  const filePath = process.argv[2] || 'logs/context-bench.jsonl';

  try {
    const results = analyzeMetrics(filePath);

    // Mostrar resultados
    console.log('\n' + '='.repeat(60));
    console.log('📊 QUANNEX CONTEXT AGENT - ANÁLISIS DE MÉTRICAS');
    console.log('='.repeat(60));

    console.log(`\n📈 RESUMEN GENERAL:`);
    console.log(`   Total requests: ${results.metadata.total_requests}`);
    console.log(`   Exitosos: ${results.metadata.successful_requests}`);
    console.log(`   Fallidos: ${results.metadata.failed_requests}`);
    console.log(`   Tasa de éxito: ${results.metadata.success_rate}`);

    console.log(`\n⏱️  LATENCIAS (ms):`);
    console.log(`   P50:  ${results.latency_stats.p50_ms}ms`);
    console.log(
      `   P95:  ${results.latency_stats.p95_ms}ms (CI95%: ${results.latency_stats.p95_ci95[0]}-${results.latency_stats.p95_ci95[1]})`
    );
    console.log(
      `   P99:  ${results.latency_stats.p99_ms}ms (CI95%: ${results.latency_stats.p99_ci95[0]}-${results.latency_stats.p99_ci95[1]})`
    );
    console.log(`   P99.9: ${results.latency_stats.p99_9_ms}ms`);
    console.log(`   Min:  ${results.latency_stats.min_ms}ms`);
    console.log(`   Max:  ${results.latency_stats.max_ms}ms`);
    console.log(`   Mean: ${results.latency_stats.mean_ms}ms`);

    console.log(`\n🎯 TOKENS:`);
    console.log(`   Promedio entrada: ${results.token_stats.avg_tokens_in}`);
    console.log(`   Promedio salida: ${results.token_stats.avg_tokens_out}`);
    console.log(`   Total entrada: ${results.token_stats.total_tokens_in}`);
    console.log(`   Total salida: ${results.token_stats.total_tokens_out}`);

    console.log(`\n🔒 GATE 14 - ANTI-SIMULACIÓN:`);
    console.log(`   Estado: ${results.gate14_anti_simulation.ok ? '✅ PASÓ' : '❌ FALLÓ'}`);
    if (!results.gate14_anti_simulation.ok) {
      console.log(`   Razón: ${results.gate14_anti_simulation.reason}`);
      console.log(`   Checks: ${JSON.stringify(results.gate14_anti_simulation.checks, null, 2)}`);
    }

    console.log(`\n🏆 CALIFICACIÓN DE RENDIMIENTO: ${results.performance_grade}`);

    // Guardar resultados completos
    const outputFile = filePath.replace('.jsonl', '-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados completos guardados en: ${outputFile}`);

    // Exit code basado en Gate 14
    if (!results.gate14_anti_simulation.ok) {
      console.log('\n❌ Gate 14 FALLÓ - Datos sospechosos detectados');
      process.exit(2);
    }

    console.log('\n✅ Análisis completado exitosamente');
  } catch (error) {
    console.error('❌ Error en análisis:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
