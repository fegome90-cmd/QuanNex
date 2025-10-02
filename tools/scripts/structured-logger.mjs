#!/usr/bin/env node
/**
 * @fileoverview Structured Logger para agentes MCP
 * @description Logger estructurado con formato JSON para observabilidad
 */

import { createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class StructuredLogger {
  constructor(agentName = 'unknown', logLevel = 'info') {
    this.agentName = agentName;
    this.logLevel = logLevel;
    this.logFile = join(PROJECT_ROOT, 'logs', `${agentName}-${new Date().toISOString().split('T')[0]}.jsonl`);
    this.metrics = {
      requests: 0,
      errors: 0,
      latency: [],
      startTime: Date.now()
    };
    
    // Crear directorio de logs si no existe (sincrónico)
    this.ensureLogDir();
  }

  /**
   * Asegurar que el directorio de logs existe
   */
  ensureLogDir() {
    try {
      const { existsSync, mkdirSync } = require('node:fs');
      const logDir = join(PROJECT_ROOT, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      // Fallback si require no funciona
      console.warn('Warning: Could not create logs directory:', error.message);
    }
  }

  /**
   * Log estructurado con formato JSON
   */
  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      agent: this.agentName,
      message,
      metadata: {
        ...metadata,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Escribir a archivo
    const logStream = createWriteStream(this.logFile, { flags: 'a' });
    logStream.write(JSON.stringify(logEntry) + '\n');
    logStream.end();

    // Log a consola si es verbose
    if (process.env.MCP_VERBOSE === '1') {
      console.log(`[${logEntry.timestamp}] ${logEntry.level} [${this.agentName}] ${message}`, metadata);
    }
  }

  /**
   * Log de request
   */
  logRequest(input, startTime = Date.now()) {
    this.metrics.requests++;
    const latency = Date.now() - startTime;
    this.metrics.latency.push(latency);

    this.log('info', 'Request received', {
      input: typeof input === 'string' ? input.substring(0, 100) : input,
      latency,
      requestId: this.metrics.requests
    });

    return latency;
  }

  /**
   * Log de response
   */
  logResponse(output, latency) {
    this.log('info', 'Response sent', {
      output: typeof output === 'string' ? output.substring(0, 100) : output,
      latency,
      success: true
    });
  }

  /**
   * Log de error
   */
  logError(error, context = {}) {
    this.metrics.errors++;
    this.log('error', 'Error occurred', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Log de métricas
   */
  logMetrics() {
    const avgLatency = this.metrics.latency.length > 0 
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length 
      : 0;

    const metrics = {
      ...this.metrics,
      avgLatency: Math.round(avgLatency),
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      uptime: Date.now() - this.metrics.startTime
    };

    this.log('info', 'Metrics snapshot', metrics);
    return metrics;
  }

  /**
   * Log de health check
   */
  logHealth(status = 'healthy') {
    this.log('info', 'Health check', {
      status,
      metrics: this.logMetrics()
    });
  }
}

export default StructuredLogger;
