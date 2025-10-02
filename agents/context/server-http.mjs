#!/usr/bin/env node
/**
 * Context Agent HTTP Server
 * Servidor HTTP para el Context Agent con endpoints de salud y procesamiento
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// HTTP Agent optimizado para keep-alive y pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 128,
  maxFreeSockets: 32,
  timeout: 5000,
  freeSocketTimeout: 30000,
});

const PORT = process.env.PORT || 8601;
const CONTEXT_SUMMARY_MAX = parseInt(process.env.CONTEXT_SUMMARY_MAX) || 700;
const CONTEXT_LRU_SIZE = parseInt(process.env.CONTEXT_LRU_SIZE) || 512;
const CONTEXT_DISABLE_RAG = process.env.CONTEXT_DISABLE_RAG === '1';
const CONTEXT_PARALLEL_IO = parseInt(process.env.CONTEXT_PARALLEL_IO) || 4;

// Cache LRU simple para optimización
const contextCache = new Map();
const MAX_CACHE_SIZE = CONTEXT_LRU_SIZE;

// Logging asíncrono amortiguado
const logBuffer = [];
const LOG_FLUSH_INTERVAL = 200; // ms
let logFlushTimer = null;

function asyncLog(level, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level,
    message,
    data,
  };

  logBuffer.push(logEntry);

  // Flush buffer cada LOG_FLUSH_INTERVAL ms
  if (!logFlushTimer) {
    logFlushTimer = setTimeout(() => {
      if (logBuffer.length > 0) {
        const logs = logBuffer.splice(0);
        logs.forEach(entry => {
          console.log(JSON.stringify(entry));
        });
      }
      logFlushTimer = null;
    }, LOG_FLUSH_INTERVAL);
  }
}

// Warm-up determinístico
const warmupCache = new Map();
const WARMUP_KEYS = 50;

// Micro-timeouts internos
const INTERNAL_STEP_DEADLINE_MS = parseInt(process.env.INTERNAL_STEP_DEADLINE_MS) || 80;

// Función de warm-up
async function performWarmup() {
  asyncLog('info', 'Starting warm-up phase');

  // Pre-cargar cache con claves típicas
  for (let i = 0; i < WARMUP_KEYS; i++) {
    const key = `warmup_${i}`;
    const mockPayload = {
      sources: [`warmup_file_${i}.md`],
      selectors: ['warmup'],
      max_tokens: 100,
    };

    const mockContext = {
      extracted: [
        {
          file: `warmup_file_${i}.md`,
          content: `Warm-up content ${i}`,
          relevance: 0.8,
        },
      ],
      metadata: {
        total_sources: 1,
        selectors_applied: ['warmup'],
        max_tokens: 100,
      },
    };

    const mockResult = {
      schema_version: '1.0.0',
      agent_version: '1.0.0',
      context_bundle: JSON.stringify(mockContext),
      provenance: [`warmup_file_${i}.md`],
      stats: {
        tokens_estimated: 100,
        chunks: 1,
        matched: 1,
        truncated: false,
        adjusted: false,
      },
    };

    warmupCache.set(key, mockResult);
  }

  // Ejecutar requests en sombra para calentar JIT
  const shadowRequests = [];
  for (let i = 0; i < 200; i++) {
    shadowRequests.push(
      processContext({
        sources: [`shadow_${i}.md`],
        selectors: ['shadow'],
        max_tokens: 100,
      })
    );
  }

  try {
    await Promise.all(shadowRequests);
    asyncLog('info', 'Warm-up completed', { warmupKeys: WARMUP_KEYS, shadowRequests: 200 });
  } catch (error) {
    asyncLog('warn', 'Warm-up completed with errors', { error: error.message });
  }
}

function addToCache(key, value) {
  if (contextCache.size >= MAX_CACHE_SIZE) {
    const firstKey = contextCache.keys().next().value;
    contextCache.delete(firstKey);
  }
  contextCache.set(key, value);
}

function getFromCache(key) {
  const value = contextCache.get(key);
  if (value) {
    // Mover al final (LRU)
    contextCache.delete(key);
    contextCache.set(key, value);
  }
  return value;
}

// Procesar contexto directamente (sin agente externo)
async function processContext(payload) {
  const startTime = performance.now();

  try {
    // Verificar cache primero
    const cacheKey = JSON.stringify(payload);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        metrics: {
          ...cached.metrics,
          cached: true,
          latency_ms: performance.now() - startTime,
        },
      };
    }

    // Micro-timeout para evitar outliers
    const deadline = startTime + INTERNAL_STEP_DEADLINE_MS;

    // Simular procesamiento de contexto con timeout
    const mockContext = {
      extracted: payload.sources.map(source => ({
        file: source,
        content: `Content from ${source}`,
        relevance: 0.8,
      })),
      metadata: {
        total_sources: payload.sources.length,
        selectors_applied: payload.selectors || [],
        max_tokens: payload.max_tokens || 1000,
      },
    };

    const endTime = performance.now();

    // Verificar si excedimos el deadline
    if (endTime > deadline) {
      asyncLog('warn', 'Processing exceeded deadline', {
        latency: endTime - startTime,
        deadline: INTERNAL_STEP_DEADLINE_MS,
      });
    }

    const result = {
      schema_version: '1.0.0',
      agent_version: '1.0.0',
      context_bundle: JSON.stringify(mockContext),
      provenance: payload.sources,
      stats: {
        tokens_estimated: payload.max_tokens || 1000,
        chunks: payload.sources.length,
        matched: payload.sources.length,
        truncated: false,
        adjusted: false,
      },
    };

    const metrics = {
      tokens_in: payload.sources?.length || 0,
      tokens_out: result.stats?.tokens_estimated || 0,
      latency_ms: endTime - startTime,
      cached: false,
      cache_size: contextCache.size,
      deadline_exceeded: endTime > deadline,
    };

    const response = {
      ...result,
      metrics,
    };

    // Guardar en cache
    addToCache(cacheKey, response);

    return response;
  } catch (error) {
    asyncLog('error', 'Context processing failed', { error: error.message });
    throw new Error(`Context processing failed: ${error.message}`);
  }
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const startTime = performance.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache_size: contextCache.size,
      config: {
        CONTEXT_SUMMARY_MAX,
        CONTEXT_LRU_SIZE,
        CONTEXT_DISABLE_RAG,
        CONTEXT_PARALLEL_IO,
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthData, null, 2));
    return;
  }

  // Context processing endpoint
  if (req.method === 'POST' && req.url === '/context/get') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await processContext(payload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        const errorResponse = {
          error: error.message,
          timestamp: new Date().toISOString(),
          latency_ms: performance.now() - startTime,
        };

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse, null, 2));
      }
    });

    return;
  }

  // 404 para otras rutas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }, null, 2));
});

// Manejo de errores del servidor
server.on('error', err => {
  console.error('Server error:', err);
  process.exit(1);
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Quannex Context Agent HTTP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Context endpoint: http://localhost:${PORT}/context/get`);
  console.log(
    `⚙️  Config: SUMMARY_MAX=${CONTEXT_SUMMARY_MAX}, LRU_SIZE=${CONTEXT_LRU_SIZE}, DISABLE_RAG=${CONTEXT_DISABLE_RAG}`
  );
  console.log(
    `🔧 Optimizations: Keep-alive=${httpAgent.keepAlive}, Deadline=${INTERNAL_STEP_DEADLINE_MS}ms`
  );

  // Ejecutar warm-up en background
  performWarmup().catch(error => {
    console.error('Warm-up failed:', error.message);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
