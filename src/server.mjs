#!/usr/bin/env node
/**
 * QuanNex Metrics Server
 * Expone métricas Prometheus para eliminar unknown_metric_type
 */

import express from 'express';
import { createPrometheusMetrics } from './metrics/prometheus.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para métricas
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Endpoint de métricas Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await createPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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

// Middleware de logging de métricas
app.use((req, res, next) => {
  const responseTime = Date.now() - req.startTime;
  console.warn(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
  next();
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Iniciar servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.warn(`🚀 QuanNex Metrics Server running on port ${PORT}`);
    console.warn(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.warn(`❤️  Health check at http://localhost:${PORT}/health`);
  });
}

export default app;
