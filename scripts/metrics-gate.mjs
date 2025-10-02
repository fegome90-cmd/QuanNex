#!/usr/bin/env node
/**
 * Metrics Gate - Falla si hay unknown_metric_type
 */

import { collectMetrics } from '../agents/metrics/agent.mjs';

async function main() {
  console.log('🔍 Metrics Gate - Verificando tipos de métricas...\n');

  try {
    const r = await collectMetrics();

    if (r.error) {
      console.error(`❌ Error collecting metrics: ${r.error}`);
      process.exit(1);
    }

    const bad = Object.entries(r).filter(([k, v]) => v && v.status === 'unknown_metric_type');

    if (bad.length) {
      console.error(`❌ [METRICS-GATE] Tipos desconocidos: ${bad.map(([k]) => k).join(', ')}`);
      process.exit(1);
    }

    console.log('✅ [METRICS-GATE] OK - Todos los tipos de métricas son válidos');

    // Mostrar resumen de métricas
    console.log('\n📊 Resumen de métricas:');
    Object.entries(r).forEach(([category, data]) => {
      if (data && data.status) {
        console.log(`  ${category}: ${data.status}`);
        if (data.response_time_p95_ms) {
          console.log(`    P95: ${data.response_time_p95_ms}ms`);
        }
        if (data.requests_count) {
          console.log(`    Requests: ${data.requests_count}`);
        }
      }
    });
  } catch (error) {
    console.error(`❌ Metrics gate failed: ${error.message}`);
    process.exit(1);
  }
}

main();
