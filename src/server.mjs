#!/usr/bin/env node
/**
 * QuanNex Metrics Server - Hot-fix con fallback a snapshot
 * Nunca responde 500; si falla, entrega último snapshot válido
 */

import express from 'express';
import metricsRouter from './server/metrics.mjs';
import { authMetrics, sanitizeLogs, rateLimitMetrics } from './middleware/auth-metrics.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Middleware de sanitización de logs
app.use(sanitizeLogs);

// Middleware para métricas de timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    service: 'QuanNex Metrics Server',
  });
});

// Endpoint de ping para agentes
app.get('/agent/ping', (req, res) => {
  const responseTime = Date.now() - req.startTime;
  res.json({
    pong: true,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de métricas con autenticación y rate limiting
if (process.env.METRICS_TOKENS) {
  console.log('🔐 [AUTH] Autenticación habilitada para /metrics');
  app.use('/metrics', authMetrics);
}
app.use('/metrics', rateLimitMetrics);

// Montar router de métricas (incluye /metrics, /metrics/selftest, /metrics/meta)
app.use('/', metricsRouter);

// Endpoint raíz
app.get('/', (req, res) => {
  res.json({
    service: 'QuanNex Metrics Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ping: '/agent/ping',
      metrics: '/metrics',
      selftest: '/metrics/selftest',
      meta: '/metrics/meta',
    },
  });
});

// Middleware de logging de métricas
app.use((req, res, next) => {
  const responseTime = Date.now() - req.startTime;
  console.warn(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
  next();
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error en servidor:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Iniciar servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.warn(`🚀 QuanNex Metrics Server running on port ${PORT}`);
    console.warn(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.warn(`❤️  Health check at http://localhost:${PORT}/health`);
    console.warn(`🔧 Self-test at http://localhost:${PORT}/metrics/selftest`);
    console.warn(`📋 Metadata at http://localhost:${PORT}/metrics/meta`);
  });
}

export default app;
