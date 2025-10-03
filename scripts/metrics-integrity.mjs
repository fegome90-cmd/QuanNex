#!/usr/bin/env node
/**
 * Metrics Integrity Gate Anti-Manipulación
 * Valida que las métricas sean reales, no simuladas
 * Obliga a que los contadores incrementen con tráfico real
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:3000/metrics';
const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:3000/health';

function fail(msg) {
  console.error(`❌ [METRICS-INTEGRITY] ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`🔍 [METRICS-INTEGRITY] ${msg}`);
}

function parseCounter(text, name) {
  const lines = text.split('\n');
  return lines
    .filter(line => line.startsWith(name))
    .reduce((sum, line) => {
      const match = line.match(/\}\s+([\d.eE+-]+)$/);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);
}

function parseHistogram(text, name) {
  const lines = text.split('\n');
  const buckets = lines.filter(line => line.startsWith(`${name}_bucket`));
  const sum = lines.filter(line => line.startsWith(`${name}_sum`));
  const count = lines.filter(line => line.startsWith(`${name}_count`));

  return {
    buckets: buckets.length,
    sum: sum.reduce((s, line) => {
      const match = line.match(/\}\s+([\d.eE+-]+)$/);
      return s + (match ? Number(match[1]) : 0);
    }, 0),
    count: count.reduce((s, line) => {
      const match = line.match(/\}\s+([\d.eE+-]+)$/);
      return s + (match ? Number(match[1]) : 0);
    }, 0),
  };
}

async function scrapeMetrics() {
  try {
    const response = await fetch(METRICS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Error scraping metrics: ${error.message}`);
  }
}

async function generateTraffic() {
  log('Generando tráfico real para validar métricas...');

  const promises = [];

  // Generar tráfico real usando curl nativo (no simulado)
  for (let i = 0; i < 25; i++) {
    promises.push(
      new Promise((resolve, reject) => {
        const curl = spawn('curl', ['-sf', HEALTH_URL], {
          stdio: 'pipe',
          timeout: 5000,
        });

        curl.on('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`curl failed with code ${code}`));
        });

        curl.on('error', reject);
      })
    );
  }

  await Promise.all(promises);
  log('Tráfico generado exitosamente');
}

async function validateMetricsIntegrity() {
  log('Validando integridad de métricas...');

  // Scrape inicial
  const beforeText = await scrapeMetrics();
  const beforeCounters = parseCounter(beforeText, 'qn_http_requests_total');
  const beforeHistogram = parseHistogram(beforeText, 'qn_http_request_duration_seconds');

  log(`Métricas iniciales: requests=${beforeCounters}, histogram_count=${beforeHistogram.count}`);

  // Generar tráfico real
  await generateTraffic();

  // Esperar un poco para que las métricas se actualicen
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Scrape final
  const afterText = await scrapeMetrics();
  const afterCounters = parseCounter(afterText, 'qn_http_requests_total');
  const afterHistogram = parseHistogram(afterText, 'qn_http_request_duration_seconds');

  log(`Métricas finales: requests=${afterCounters}, histogram_count=${afterHistogram.count}`);

  // Validar que los contadores incrementaron
  if (!(afterCounters > beforeCounters)) {
    fail(`Contador de requests no incrementó: ${beforeCounters} -> ${afterCounters}`);
  }

  if (!(afterHistogram.count > beforeHistogram.count)) {
    fail(
      `Contador de histogram no incrementó: ${beforeHistogram.count} -> ${afterHistogram.count}`
    );
  }

  if (!(afterHistogram.sum > beforeHistogram.sum)) {
    fail(`Suma de histogram no incrementó: ${beforeHistogram.sum} -> ${afterHistogram.sum}`);
  }

  // Validar que hay buckets de histogram
  if (afterHistogram.buckets === 0) {
    fail('No se encontraron buckets de histogram en las métricas');
  }

  log(`✅ Métricas validadas exitosamente:`);
  log(`   Requests: ${beforeCounters} -> ${afterCounters} (+${afterCounters - beforeCounters})`);
  log(
    `   Histogram count: ${beforeHistogram.count} -> ${afterHistogram.count} (+${afterHistogram.count - beforeHistogram.count})`
  );
  log(
    `   Histogram sum: ${beforeHistogram.sum.toFixed(3)} -> ${afterHistogram.sum.toFixed(3)} (+${(afterHistogram.sum - beforeHistogram.sum).toFixed(3)})`
  );
  log(`   Buckets disponibles: ${afterHistogram.buckets}`);
}

async function main() {
  try {
    log('🚀 Iniciando validación de integridad de métricas...');

    // Verificar que el endpoint de métricas esté disponible
    await scrapeMetrics();
    log('✅ Endpoint de métricas accesible');

    // Validar integridad
    await validateMetricsIntegrity();

    log('🎉 Validación de integridad completada exitosamente');
  } catch (error) {
    fail(`Error durante validación: ${error.message}`);
  }
}

main();
