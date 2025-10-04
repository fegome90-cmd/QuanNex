#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import http from 'node:http';

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:9464/metrics';

// Umbrales de alerta
const THRESHOLDS = {
  queue_depth: 50,
  flush_latency_p95: 1.0, // segundos
  finish_rate_min: 0.90,
  error_rate_max: 0.05
};

function fetchMetrics() {
  return new Promise((resolve, reject) => {
    http.get(METRICS_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

function parseMetrics(metricsRaw) {
  const metrics = {};
  metricsRaw.split('\n').forEach(line => {
    if (line.startsWith('#') || line.trim() === '') return;
    const parts = line.split(' ');
    const name = parts[0];
    const value = parseFloat(parts[1]);
    if (!isNaN(value)) {
      metrics[name] = value;
    }
  });
  return metrics;
}

function getMetricValue(metrics, pattern) {
  const keys = Object.keys(metrics).filter(k => k.includes(pattern));
  if (keys.length === 0) return 0;
  
  // Para histogramas, usar el bucket más alto
  if (pattern.includes('bucket')) {
    const bucketValues = keys.map(k => metrics[k]).filter(v => !isNaN(v));
    return bucketValues.length > 0 ? Math.max(...bucketValues) : 0;
  }
  
  return metrics[keys[0]] || 0;
}

async function main() {
  console.log('🚨 Verificando umbrales de alerta TaskDB...\n');
  
  let exitCode = 0;
  const alerts = [];
  
  try {
    // 1. Obtener métricas
    const metricsRaw = await fetchMetrics();
    const metrics = parseMetrics(metricsRaw);
    
    console.log('📊 Métricas obtenidas:', Object.keys(metrics).length, 'series');
    
    // 2. Verificar umbrales
    const queueDepth = getMetricValue(metrics, 'taskdb_queue_depth');
    const flushLatency = getMetricValue(metrics, 'taskdb_flush_latency_seconds_bucket');
    const eventsTotal = getMetricValue(metrics, 'taskdb_events_total');
    
    console.log(`📈 Queue Depth: ${queueDepth}`);
    console.log(`⏱️ Flush Latency: ${flushLatency}s`);
    console.log(`📊 Total Events: ${eventsTotal}`);
    
    // 3. Evaluar umbrales
    if (queueDepth > THRESHOLDS.queue_depth) {
      alerts.push(`Queue depth (${queueDepth}) > ${THRESHOLDS.queue_depth}`);
    }
    
    if (flushLatency > THRESHOLDS.flush_latency_p95) {
      alerts.push(`Flush latency (${flushLatency}s) > ${THRESHOLDS.flush_latency_p95}s`);
    }
    
    // 4. Reportar resultados
    if (alerts.length > 0) {
      console.log('\n🚨 ALERTAS ACTIVADAS:');
      alerts.forEach(alert => console.log(`  ❌ ${alert}`));
      exitCode = 2; // High deviation
    } else {
      console.log('\n✅ Todos los umbrales OK');
      exitCode = 0;
    }
    
  } catch (error) {
    console.error('❌ Error verificando umbrales:', error.message);
    exitCode = 1;
  }
  
  process.exit(exitCode);
}

main();
