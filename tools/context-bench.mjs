#!/usr/bin/env node
/**
 * Quannex Context Agent - Load Generator/Benchmark Tool
 * Generador de carga sintética para calibración de rendimiento
 */

import fs from 'node:fs';
import http from 'node:http';
import { performance } from 'node:perf_hooks';

// Configuración desde variables de entorno
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8601';
const DURATION_SEC = parseInt(process.env.DURATION_SEC) || 60;
const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 24;
const RPS = parseInt(process.env.RPS) || 50;
const OUT_FILE = process.env.OUT_FILE || 'logs/context-bench.jsonl';

// Crear directorio de logs si no existe
fs.mkdirSync('logs', { recursive: true });

// Timestamp de finalización
const endAt = Date.now() + DURATION_SEC * 1000;

// Función para obtener tiempo de alta resolución en milisegundos
function hrms() {
  return Number(process.hrtime.bigint() / 1000000n);
}

// Generar payload sintético para testing
function generatePayload(threadId, window = 5) {
  const sources = [];
  const selectors = ['main', 'core', 'primary'];

  // Generar fuentes sintéticas
  for (let i = 0; i < window; i++) {
    sources.push(`test/source_${threadId}_${i}.js`);
  }

  return {
    threadId: `t${threadId}`,
    window: window,
    sources: sources,
    selectors: selectors.slice(0, Math.floor(Math.random() * 3) + 1),
    max_tokens: Math.floor(Math.random() * 500) + 256, // 256-756 tokens
  };
}

// Ejecutar una sola request
function executeRequest(requestId) {
  return new Promise(resolve => {
    const ts0 = hrms();
    const payload = generatePayload(requestId);

    const req = http.request(
      TARGET_URL + '/context/get',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Quannex-Bench/1.0',
        },
        timeout: 10000, // 10 segundos timeout
      },
      res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));

        res.on('end', () => {
          const ts1 = hrms();
          const latency = ts1 - ts0;

          let tokensIn = null;
          let tokensOut = null;
          let status = res.statusCode;
          let error = null;

          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            tokensIn = body?.metrics?.tokens_in ?? null;
            tokensOut = body?.metrics?.tokens_out ?? null;

            // Validar que la respuesta tenga la estructura esperada
            if (!body.schema_version || !body.context_bundle) {
              error = 'invalid_response_structure';
            }
          } catch (parseError) {
            error = 'parse_error';
          }

          // Escribir métrica a archivo JSONL
          const metric = {
            ts: new Date().toISOString(),
            request_id: requestId,
            route: '/context/get',
            latency_ms: latency,
            status: status,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            error: error,
            arm: 'context-only',
            payload_size: JSON.stringify(payload).length,
          };

          fs.appendFileSync(OUT_FILE, JSON.stringify(metric) + '\n');
          resolve();
        });
      }
    );

    req.on('error', err => {
      const ts1 = hrms();
      const metric = {
        ts: new Date().toISOString(),
        request_id: requestId,
        route: '/context/get',
        latency_ms: ts1 - ts0,
        status: 599,
        error: 'conn_error',
        error_detail: err.message,
        arm: 'context-only',
      };

      fs.appendFileSync(OUT_FILE, JSON.stringify(metric) + '\n');
      resolve();
    });

    req.on('timeout', () => {
      const ts1 = hrms();
      const metric = {
        ts: new Date().toISOString(),
        request_id: requestId,
        route: '/context/get',
        latency_ms: ts1 - ts0,
        status: 599,
        error: 'timeout',
        arm: 'context-only',
      };

      fs.appendFileSync(OUT_FILE, JSON.stringify(metric) + '\n');
      req.destroy();
      resolve();
    });

    // Enviar payload
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Función principal de benchmark
async function runBenchmark() {
  console.log(`🚀 Iniciando benchmark Quannex Context Agent`);
  console.log(`📊 Target: ${TARGET_URL}`);
  console.log(`⏱️  Duración: ${DURATION_SEC}s`);
  console.log(`🔄 RPS objetivo: ${RPS}`);
  console.log(`👥 Concurrencia: ${CONCURRENCY}`);
  console.log(`📁 Output: ${OUT_FILE}`);
  console.log('─'.repeat(50));

  const startTime = Date.now();
  const requests = [];
  let requestId = 0;

  // Control de ritmo simple
  const perTick = Math.max(1, Math.floor(RPS / CONCURRENCY));

  while (Date.now() < endAt) {
    const batch = [];

    // Crear batch de requests
    for (let c = 0; c < CONCURRENCY; c++) {
      for (let k = 0; k < perTick; k++) {
        batch.push(executeRequest(requestId++));
      }
    }

    requests.push(...batch);

    // Control de ritmo - esperar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mostrar progreso cada 10 segundos
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0 && elapsed > 0) {
      console.log(`⏳ Progreso: ${elapsed}s/${DURATION_SEC}s - Requests: ${requestId}`);
    }
  }

  console.log('⏳ Esperando que terminen todas las requests...');
  await Promise.all(requests);

  // Generar hash de integridad
  const data = fs.readFileSync(OUT_FILE, 'utf8');
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(data).digest('hex');

  // Escribir archivo de hash
  fs.writeFileSync(OUT_FILE + '.hash', `sha256:${hash}\n`);

  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  const actualRPS = requestId / totalDuration;

  console.log('─'.repeat(50));
  console.log(`✅ Benchmark completado`);
  console.log(`📊 Total requests: ${requestId}`);
  console.log(`⏱️  Duración real: ${totalDuration.toFixed(2)}s`);
  console.log(`🔄 RPS real: ${actualRPS.toFixed(2)}`);
  console.log(`📁 Archivo: ${OUT_FILE}`);
  console.log(`🔐 Hash: sha256:${hash}`);

  return {
    total_requests: requestId,
    duration_sec: totalDuration,
    actual_rps: actualRPS,
    target_rps: RPS,
    hash: hash,
  };
}

// Ejecutar benchmark
runBenchmark().catch(error => {
  console.error('❌ Error en benchmark:', error);
  process.exit(1);
});
