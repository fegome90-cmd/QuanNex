#!/usr/bin/env node
/**
 * EV-001 Tracer: Medición de uso real de MCP vs Cursor fallback
 * Registra todas las interacciones MCP para análisis posterior
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

class EV001Tracer {
  constructor() {
    this.logFile = 'logs/ev-001.jsonl';
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.metrics = {
      mcpCalls: 0,
      cursorFallbacks: 0,
      totalRequests: 0,
      agentCalls: {},
      latencyStats: [],
      tokenStats: { input: 0, output: 0 }
    };
    
    this.ensureLogDirectory();
    this.logSessionStart();
  }

  /**
   * Generar ID único de sesión
   */
  generateSessionId() {
    return `ev001_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Asegurar que existe el directorio de logs
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Registrar inicio de sesión
   */
  logSessionStart() {
    const log = {
      ts: new Date().toISOString(),
      type: 'session_start',
      sessionId: this.sessionId,
      experiment: 'EV-001',
      description: 'MCP Real vs Cursor Fallback Measurement',
      startTime: this.startTime
    };
    this.writeLog(log);
  }

  /**
   * Trazar llamada MCP
   */
  traceMCP(event) {
    const requestId = event.requestId || this.generateRequestId();
    const startTime = Date.now();
    
    const log = {
      ts: new Date().toISOString(),
      type: 'mcp_call',
      sessionId: this.sessionId,
      requestId: requestId,
      agent: event.agent || 'unknown',
      operation: event.operation || 'unknown',
      source: 'MCP',
      status: 'started',
      payload: this.sanitizePayload(event.payload),
      startTime: startTime,
      tokens: {
        input: this.estimateTokens(event.payload),
        output: 0 // Se actualizará al completar
      }
    };

    this.writeLog(log);
    this.metrics.mcpCalls++;
    this.metrics.totalRequests++;
    
    // Actualizar estadísticas de agentes
    if (!this.metrics.agentCalls[event.agent]) {
      this.metrics.agentCalls[event.agent] = 0;
    }
    this.metrics.agentCalls[event.agent]++;

    return requestId;
  }

  /**
   * Completar llamada MCP
   */
  completeMCP(requestId, result, error = null) {
    const endTime = Date.now();
    const latency = endTime - this.startTime;
    
    const log = {
      ts: new Date().toISOString(),
      type: 'mcp_complete',
      sessionId: this.sessionId,
      requestId: requestId,
      source: 'MCP',
      status: error ? 'error' : 'completed',
      result: this.sanitizePayload(result),
      error: error ? this.sanitizePayload(error) : null,
      endTime: endTime,
      latency: latency,
      tokens: {
        output: this.estimateTokens(result)
      }
    };

    this.writeLog(log);
    this.metrics.latencyStats.push(latency);
    this.metrics.tokenStats.output += this.estimateTokens(result);
  }

  /**
   * Trazar fallback de Cursor (cuando MCP no se usa)
   */
  traceCursorFallback(event) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const log = {
      ts: new Date().toISOString(),
      type: 'cursor_fallback',
      sessionId: this.sessionId,
      requestId: requestId,
      operation: event.operation || 'unknown',
      source: 'Cursor',
      status: 'started',
      reason: event.reason || 'MCP not invoked',
      payload: this.sanitizePayload(event.payload),
      startTime: startTime,
      tokens: {
        input: this.estimateTokens(event.payload),
        output: 0
      }
    };

    this.writeLog(log);
    this.metrics.cursorFallbacks++;
    this.metrics.totalRequests++;

    return requestId;
  }

  /**
   * Completar fallback de Cursor
   */
  completeCursorFallback(requestId, result, error = null) {
    const endTime = Date.now();
    const latency = endTime - this.startTime;
    
    const log = {
      ts: new Date().toISOString(),
      type: 'cursor_complete',
      sessionId: this.sessionId,
      requestId: requestId,
      source: 'Cursor',
      status: error ? 'error' : 'completed',
      result: this.sanitizePayload(result),
      error: error ? this.sanitizePayload(error) : null,
      endTime: endTime,
      latency: latency,
      tokens: {
        output: this.estimateTokens(result)
      }
    };

    this.writeLog(log);
    this.metrics.latencyStats.push(latency);
    this.metrics.tokenStats.output += this.estimateTokens(result);
  }

  /**
   * Generar ID único de request
   */
  generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Sanitizar payload para logging seguro
   */
  sanitizePayload(payload) {
    if (!payload) return null;
    
    try {
      const str = JSON.stringify(payload);
      // Reducir tamaño para logging
      if (str.length > 1000) {
        return { 
          _truncated: true, 
          _size: str.length,
          _preview: str.substring(0, 500) + '...'
        };
      }
      return payload;
    } catch (e) {
      return { _error: 'Failed to serialize payload' };
    }
  }

  /**
   * Estimar tokens (aproximación simple)
   */
  estimateTokens(data) {
    if (!data) return 0;
    try {
      const str = JSON.stringify(data);
      // Aproximación: 1 token ≈ 4 caracteres
      return Math.ceil(str.length / 4);
    } catch (e) {
      return 0;
    }
  }

  /**
   * Escribir log en formato JSONL
   */
  writeLog(log) {
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(log) + '\n');
    } catch (e) {
      console.error('Error writing EV-001 log:', e.message);
    }
  }

  /**
   * Registrar evento de sistema
   */
  logSystemEvent(type, data) {
    const log = {
      ts: new Date().toISOString(),
      type: 'system_event',
      sessionId: this.sessionId,
      eventType: type,
      data: this.sanitizePayload(data)
    };
    this.writeLog(log);
  }

  /**
   * Finalizar sesión y generar resumen
   */
  endSession() {
    const endTime = Date.now();
    const sessionDuration = endTime - this.startTime;
    
    const summary = {
      ts: new Date().toISOString(),
      type: 'session_end',
      sessionId: this.sessionId,
      endTime: endTime,
      duration: sessionDuration,
      metrics: this.metrics,
      mcpShare: this.calculateMCPShare(),
      analysis: this.generateAnalysis()
    };

    this.writeLog(summary);
    return summary;
  }

  /**
   * Calcular porcentaje de uso MCP
   */
  calculateMCPShare() {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.mcpCalls / this.metrics.totalRequests) * 100;
  }

  /**
   * Generar análisis básico
   */
  generateAnalysis() {
    const latencies = this.metrics.latencyStats;
    const avgLatency = latencies.length > 0 ? 
      latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    
    const p95Latency = latencies.length > 0 ?
      latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

    return {
      mcpShare: this.calculateMCPShare(),
      avgLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95Latency),
      totalTokens: this.metrics.tokenStats.input + this.metrics.tokenStats.output,
      agentDistribution: this.metrics.agentCalls,
      recommendation: this.calculateMCPShare() >= 70 ? 'GO' : 'NO-GO'
    };
  }

  /**
   * Obtener métricas en tiempo real
   */
  getMetrics() {
    return {
      ...this.metrics,
      mcpShare: this.calculateMCPShare(),
      sessionDuration: Date.now() - this.startTime
    };
  }
}

// Instancia global del tracer
let globalTracer = null;

/**
 * Inicializar tracer global
 */
export function initEV001Tracer() {
  if (!globalTracer) {
    globalTracer = new EV001Tracer();
    console.log(`🧪 EV-001 Tracer iniciado - Sesión: ${globalTracer.sessionId}`);
  }
  return globalTracer;
}

/**
 * Obtener tracer global
 */
export function getEV001Tracer() {
  if (!globalTracer) {
    return initEV001Tracer();
  }
  return globalTracer;
}

/**
 * Funciones de conveniencia para uso directo
 */
export function traceMCP(event) {
  const tracer = getEV001Tracer();
  return tracer.traceMCP(event);
}

export function completeMCP(requestId, result, error) {
  const tracer = getEV001Tracer();
  tracer.completeMCP(requestId, result, error);
}

export function traceCursorFallback(event) {
  const tracer = getEV001Tracer();
  return tracer.traceCursorFallback(event);
}

export function completeCursorFallback(requestId, result, error) {
  const tracer = getEV001Tracer();
  tracer.completeCursorFallback(requestId, result, error);
}

export function endEV001Session() {
  const tracer = getEV001Tracer();
  return tracer.endSession();
}

// Si se ejecuta directamente, inicializar tracer
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracer = initEV001Tracer();
  console.log('🧪 EV-001 Tracer listo para uso');
  console.log(`📁 Logs: ${tracer.logFile}`);
  console.log(`🆔 Sesión: ${tracer.sessionId}`);
}

export default EV001Tracer;
