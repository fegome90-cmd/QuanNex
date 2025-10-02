#!/usr/bin/env node
/**
 * Sistema de Trazas MCP (Model Context Protocol)
 * Genera y gestiona trazas de todas las operaciones MCP
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logSecurity } from './structured-logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRACE_DIR = join(__dirname, '../.quannex/trace');

// Asegurar que el directorio de trazas existe
if (!existsSync(TRACE_DIR)) {
  mkdirSync(TRACE_DIR, { recursive: true });
}

/**
 * Genera un ID único para la traza MCP
 * @returns {string} ID único de la traza
 */
export function generateTraceId() {
  return randomBytes(16).toString('hex');
}

/**
 * Crea una nueva traza MCP
 * @param {string} operation - Operación realizada
 * @param {object} context - Contexto de la operación
 * @param {string} agentId - ID del agente que ejecuta la operación
 * @returns {string} ID de la traza creada
 */
export function createTrace(operation, context, agentId) {
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  
  const trace = {
    traceId,
    timestamp,
    operation,
    agentId,
    context: {
      ...context,
      // Sanitizar información sensible
      input: sanitizeTraceData(context.input),
      output: sanitizeTraceData(context.output),
      metadata: context.metadata || {}
    },
    status: 'started',
    duration: null,
    error: null
  };
  
  // Guardar traza inicial
  const traceFile = join(TRACE_DIR, `${traceId}.json`);
  writeFileSync(traceFile, JSON.stringify(trace, null, 2), 'utf8');
  
  logSecurity('mcp_trace_created', {
    traceId,
    operation,
    agentId
  });
  
  return traceId;
}

/**
 * Actualiza una traza MCP existente
 * @param {string} traceId - ID de la traza
 * @param {object} updates - Actualizaciones a aplicar
 */
export function updateTrace(traceId, updates) {
  const traceFile = join(TRACE_DIR, `${traceId}.json`);
  
  if (!existsSync(traceFile)) {
    throw new Error(`Trace ${traceId} not found`);
  }
  
  const trace = JSON.parse(readFileSync(traceFile, 'utf8'));
  
  // Aplicar actualizaciones
  Object.assign(trace, updates);
  
  // Sanitizar datos sensibles en las actualizaciones
  if (updates.context) {
    trace.context = {
      ...trace.context,
      ...updates.context,
      input: sanitizeTraceData(updates.context.input),
      output: sanitizeTraceData(updates.context.output)
    };
  }
  
  writeFileSync(traceFile, JSON.stringify(trace, null, 2), 'utf8');
  
  logSecurity('mcp_trace_updated', {
    traceId,
    updates: Object.keys(updates)
  });
}

/**
 * Completa una traza MCP
 * @param {string} traceId - ID de la traza
 * @param {object} result - Resultado de la operación
 * @param {Error} error - Error si ocurrió alguno
 */
export function completeTrace(traceId, result = null, error = null) {
  const traceFile = join(TRACE_DIR, `${traceId}.json`);
  
  if (!existsSync(traceFile)) {
    throw new Error(`Trace ${traceId} not found`);
  }
  
  const trace = JSON.parse(readFileSync(traceFile, 'utf8'));
  const endTime = new Date();
  const startTime = new Date(trace.timestamp);
  
  const updates = {
    status: error ? 'failed' : 'completed',
    duration: endTime - startTime,
    completedAt: endTime.toISOString(),
    result: sanitizeTraceData(result),
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null
  };
  
  updateTrace(traceId, updates);
  
  logSecurity('mcp_trace_completed', {
    traceId,
    status: updates.status,
    duration: updates.duration
  });
}

/**
 * Obtiene una traza MCP por ID
 * @param {string} traceId - ID de la traza
 * @returns {object} Traza MCP
 */
export function getTrace(traceId) {
  const traceFile = join(TRACE_DIR, `${traceId}.json`);
  
  if (!existsSync(traceFile)) {
    throw new Error(`Trace ${traceId} not found`);
  }
  
  return JSON.parse(readFileSync(traceFile, 'utf8'));
}

/**
 * Lista todas las trazas MCP
 * @param {object} filters - Filtros opcionales
 * @returns {object[]} Lista de trazas
 */
export async function listTraces(filters = {}) {
  const fs = await import('node:fs');
  const files = fs.readdirSync(TRACE_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const traceId = file.replace('.json', '');
      return getTrace(traceId);
    });
  
  // Aplicar filtros
  let filteredTraces = files;
  
  if (filters.agentId) {
    filteredTraces = filteredTraces.filter(trace => trace.agentId === filters.agentId);
  }
  
  if (filters.operation) {
    filteredTraces = filteredTraces.filter(trace => trace.operation === filters.operation);
  }
  
  if (filters.status) {
    filteredTraces = filteredTraces.filter(trace => trace.status === filters.status);
  }
  
  if (filters.since) {
    const sinceDate = new Date(filters.since);
    filteredTraces = filteredTraces.filter(trace => new Date(trace.timestamp) >= sinceDate);
  }
  
  return filteredTraces.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Sanitiza datos sensibles en las trazas
 * @param {any} data - Datos a sanitizar
 * @returns {any} Datos sanitizados
 */
function sanitizeTraceData(data) {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Redactar patrones de secretos
    return data
      .replace(/sk_live_[A-Za-z0-9]+/g, '[REDACTED]')
      .replace(/ghp_[A-Za-z0-9]{20,}/g, '[REDACTED]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED]')
      .replace(/password[^\\s]*/gi, '[REDACTED]')
      .replace(/token[^\\s]*/gi, '[REDACTED]')
      .replace(/secret[^\\s]*/gi, '[REDACTED]')
      .replace(/key[^\\s]*/gi, '[REDACTED]');
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('key') ||
          lowerKey.includes('auth')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeTraceData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Limpia trazas antiguas
 * @param {number} maxAgeDays - Edad máxima en días
 */
export async function cleanupOldTraces(maxAgeDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  const fs = await import('node:fs');
  const files = fs.readdirSync(TRACE_DIR)
    .filter(file => file.endsWith('.json'));
  
  let cleanedCount = 0;
  
  for (const file of files) {
    const traceId = file.replace('.json', '');
    const trace = getTrace(traceId);
    
    if (new Date(trace.timestamp) < cutoffDate) {
      const traceFile = join(TRACE_DIR, file);
      fs.unlinkSync(traceFile);
      cleanedCount++;
    }
  }
  
  logSecurity('mcp_traces_cleaned', {
    cleanedCount,
    maxAgeDays
  });
  
  return cleanedCount;
}

export default {
  generateTraceId,
  createTrace,
  updateTrace,
  completeTrace,
  getTrace,
  listTraces,
  cleanupOldTraces
};
