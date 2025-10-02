#!/usr/bin/env node
/**
 * Healthcheck para Context Agent
 * Verifica que el agente esté funcionando correctamente
 */

import http from 'node:http';
import { performance } from 'node:perf_hooks';

const HEALTHCHECK_TIMEOUT = 2000; // 2 segundos
const HEALTHCHECK_PORT = process.env.PORT || 8601;

function checkHealth() {
  return new Promise(resolve => {
    const startTime = performance.now();

    const req = http.request(
      {
        hostname: 'localhost',
        port: HEALTHCHECK_PORT,
        path: '/health',
        method: 'GET',
        timeout: HEALTHCHECK_TIMEOUT,
      },
      res => {
        const endTime = performance.now();
        const latency = endTime - startTime;

        if (res.statusCode === 200 && latency < HEALTHCHECK_TIMEOUT) {
          resolve(true);
        } else {
          console.error(`Health check failed: status=${res.statusCode}, latency=${latency}ms`);
          resolve(false);
        }
      }
    );

    req.on('error', err => {
      console.error('Health check error:', err.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Health check timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Ejecutar healthcheck
checkHealth().then(healthy => {
  process.exit(healthy ? 0 : 1);
});
