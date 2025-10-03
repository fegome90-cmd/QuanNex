#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import http from 'node:http';
import fs from 'node:fs';

const METRICS_URL = 'http://localhost:9464/metrics';

// Umbrales configurables
const THRESHOLDS = {
  queue_depth_p95: 50,
  flush_latency_p95: 1000, // ms
  finish_rate_min: 90, // %
  error_rate_max: 5 // %
};

async function fetchMetrics() {
  try {
    const response = await fetch(METRICS_URL);
    const text = await response.text();
    return text;
  } catch (err) {
    throw new Error(`No se pudo obtener métricas: ${err.message}`);
  }
}

function parseMetrics(metricsText) {
  const lines = metricsText.split('\n');
  const metrics = {};
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    const [name, value] = line.split(' ');
    if (name && value) {
      metrics[name] = parseFloat(value);
    }
  }
  
  return metrics;
}

function evaluateThresholds(metrics) {
  const alerts = [];
  
  // Queue depth
  const queueDepth = metrics['taskdb_queue_depth'] || 0;
  if (queueDepth > THRESHOLDS.queue_depth_p95) {
    alerts.push(`Queue depth alto: ${queueDepth} > ${THRESHOLDS.queue_depth_p95}`);
  }
  
  // Flush latency (buscar histograma p95)
  const flushLatency = metrics['taskdb_flush_latency_seconds_bucket'] || 0;
  if (flushLatency * 1000 > THRESHOLDS.flush_latency_p95) {
    alerts.push(`Flush latency alto: ${flushLatency * 1000}ms > ${THRESHOLDS.flush_latency_p95}ms`);
  }
  
  // Finish rate (calcular desde eventos)
  const totalEvents = metrics['taskdb_events_total'] || 0;
  const finishEvents = metrics['taskdb_events_total{status="finish"}'] || 0;
  const errorEvents = metrics['taskdb_events_total{status="error"}'] || 0;
  
  if (totalEvents > 0) {
    const finishRate = (finishEvents / totalEvents) * 100;
    const errorRate = (errorEvents / totalEvents) * 100;
    
    if (finishRate < THRESHOLDS.finish_rate_min) {
      alerts.push(`Finish rate bajo: ${finishRate.toFixed(1)}% < ${THRESHOLDS.finish_rate_min}%`);
    }
    
    if (errorRate > THRESHOLDS.error_rate_max) {
      alerts.push(`Error rate alto: ${errorRate.toFixed(1)}% > ${THRESHOLDS.error_rate_max}%`);
    }
  }
  
  return alerts;
}

async function saveSnapshot(metricsText) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `reports/metrics-${date}.prom`;
  
  try {
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(filename, metricsText, 'utf8');
    console.log(`📸 Snapshot guardado: ${filename}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo guardar snapshot: ${err.message}`);
  }
}

async function main() {
  try {
    console.log('🚨 Verificando umbrales de métricas...\n');
    
    const metricsText = await fetchMetrics();
    const metrics = parseMetrics(metricsText);
    const alerts = evaluateThresholds(metrics);
    
    // Guardar snapshot diario
    await saveSnapshot(metricsText);
    
    if (alerts.length === 0) {
      console.log('✅ Todos los umbrales OK');
      console.log(`📊 Métricas principales:`);
      console.log(`  - Queue depth: ${metrics['taskdb_queue_depth'] || 0}`);
      console.log(`  - Total events: ${metrics['taskdb_events_total'] || 0}`);
      process.exit(0);
    } else {
      console.log('❌ Alertas detectadas:');
      alerts.forEach(alert => console.log(`  - ${alert}`));
      process.exit(1);
    }
    
  } catch (err) {
    console.error('💥 Error en verificación:', err.message);
    process.exit(1);
  }
}

main();
