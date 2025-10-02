/**
 * Tool Logger Centralizado - Registra todas las llamadas a herramientas
 * Implementa logging estructurado con almacenamiento en disco y DB
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ToolLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || join(__dirname, '../logs');
    this.toolCallsFile = join(this.logDir, 'tool_calls.jsonl');
    this.errorsFile = join(this.logDir, 'tool_errors.jsonl');
    this.statsFile = join(this.logDir, 'tool_stats.json');

    // Crear directorio de logs si no existe
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Estadísticas en memoria
    this.stats = {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      agents: {},
      tools: {},
      errors: {},
      last_reset: new Date().toISOString(),
    };

    // Cargar estadísticas existentes
    this.loadStats();
  }

  /**
   * Log de llamada a herramienta
   * @param {string} level - Nivel de log (info, warn, error)
   * @param {string} message - Mensaje del log
   * @param {Object} data - Datos adicionales
   */
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
    };

    // Escribir a archivo JSONL
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      appendFileSync(this.toolCallsFile, logLine);
    } catch (error) {
      console.error('Failed to write tool log:', error.message);
    }

    // Actualizar estadísticas
    this.updateStats(logEntry);

    // Log a consola si es error
    if (level === 'error') {
      console.error(`[TOOL-ERROR] ${message}:`, data);
    }
  }

  /**
   * Log específico para tool calls
   * @param {Object} toolCallData - Datos de la llamada a herramienta
   */
  logToolCall(toolCallData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: toolCallData.agent || 'unknown',
      tool: toolCallData.tool,
      input: this.sanitizeForLog(toolCallData.input),
      output: toolCallData.success ? this.sanitizeForLog(toolCallData.output) : null,
      error: toolCallData.success ? null : toolCallData.error,
      duration_ms: toolCallData.duration_ms || 0,
      success: toolCallData.success,
      metadata: toolCallData.metadata || {},
    };

    this.log('info', 'tool_call', logEntry);

    // Si es error, también loggear en archivo de errores
    if (!toolCallData.success) {
      this.logError(toolCallData);
    }
  }

  /**
   * Log específico para errores de herramientas
   * @param {Object} errorData - Datos del error
   */
  logError(errorData) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      agent: errorData.agent || 'unknown',
      tool: errorData.tool,
      error: errorData.error,
      input: this.sanitizeForLog(errorData.input),
      duration_ms: errorData.duration_ms || 0,
      stack_trace: errorData.stack_trace || null,
      context: errorData.context || {},
    };

    const logLine = JSON.stringify(errorEntry) + '\n';

    try {
      appendFileSync(this.errorsFile, logLine);
    } catch (error) {
      console.error('Failed to write error log:', error.message);
    }
  }

  /**
   * Sanitiza datos para logging
   * @param {any} data - Datos a sanitizar
   * @returns {any} Datos sanitizados
   */
  sanitizeForLog(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remover campos sensibles
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'api_key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Limitar tamaño de strings largos
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[TRUNCATED]';
      }
    });

    return sanitized;
  }

  /**
   * Actualiza estadísticas en memoria
   * @param {Object} logEntry - Entrada de log
   */
  updateStats(logEntry) {
    this.stats.total_calls++;

    if (logEntry.success === true) {
      this.stats.successful_calls++;
    } else if (logEntry.success === false) {
      this.stats.failed_calls++;
    }

    // Estadísticas por agente
    const agent = logEntry.agent || 'unknown';
    if (!this.stats.agents[agent]) {
      this.stats.agents[agent] = { total: 0, successful: 0, failed: 0 };
    }
    this.stats.agents[agent].total++;
    if (logEntry.success === true) this.stats.agents[agent].successful++;
    if (logEntry.success === false) this.stats.agents[agent].failed++;

    // Estadísticas por herramienta
    const tool = logEntry.tool || 'unknown';
    if (!this.stats.tools[tool]) {
      this.stats.tools[tool] = { total: 0, successful: 0, failed: 0, avg_duration: 0 };
    }
    this.stats.tools[tool].total++;
    if (logEntry.success === true) this.stats.tools[tool].successful++;
    if (logEntry.success === false) this.stats.tools[tool].failed++;

    // Actualizar duración promedio
    if (logEntry.duration_ms) {
      const currentAvg = this.stats.tools[tool].avg_duration;
      const count = this.stats.tools[tool].total;
      this.stats.tools[tool].avg_duration =
        (currentAvg * (count - 1) + logEntry.duration_ms) / count;
    }

    // Estadísticas de errores
    if (logEntry.error) {
      const errorType = this.categorizeError(logEntry.error);
      if (!this.stats.errors[errorType]) {
        this.stats.errors[errorType] = 0;
      }
      this.stats.errors[errorType]++;
    }

    // Guardar estadísticas cada 100 llamadas
    if (this.stats.total_calls % 100 === 0) {
      this.saveStats();
    }
  }

  /**
   * Categoriza errores por tipo
   * @param {string} error - Mensaje de error
   * @returns {string} Categoría del error
   */
  categorizeError(error) {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('network') || errorLower.includes('connection')) return 'network';
    if (errorLower.includes('permission') || errorLower.includes('access')) return 'permission';
    if (errorLower.includes('validation') || errorLower.includes('invalid')) return 'validation';
    if (errorLower.includes('not found') || errorLower.includes('missing')) return 'not_found';
    if (errorLower.includes('rate limit') || errorLower.includes('429')) return 'rate_limit';

    return 'other';
  }

  /**
   * Guarda estadísticas en disco
   */
  saveStats() {
    try {
      writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      console.error('Failed to save tool stats:', error.message);
    }
  }

  /**
   * Carga estadísticas desde disco
   */
  loadStats() {
    try {
      if (existsSync(this.statsFile)) {
        const statsData = JSON.parse(require('fs').readFileSync(this.statsFile, 'utf8'));
        this.stats = { ...this.stats, ...statsData };
      }
    } catch (error) {
      console.error('Failed to load tool stats:', error.message);
    }
  }

  /**
   * Obtiene estadísticas actuales
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      success_rate:
        this.stats.total_calls > 0
          ? ((this.stats.successful_calls / this.stats.total_calls) * 100).toFixed(2) + '%'
          : '0%',
      error_rate:
        this.stats.total_calls > 0
          ? ((this.stats.failed_calls / this.stats.total_calls) * 100).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Obtiene estadísticas por agente
   * @param {string} agent - Nombre del agente
   * @returns {Object} Estadísticas del agente
   */
  getAgentStats(agent) {
    return this.stats.agents[agent] || { total: 0, successful: 0, failed: 0 };
  }

  /**
   * Obtiene estadísticas por herramienta
   * @param {string} tool - Nombre de la herramienta
   * @returns {Object} Estadísticas de la herramienta
   */
  getToolStats(tool) {
    return this.stats.tools[tool] || { total: 0, successful: 0, failed: 0, avg_duration: 0 };
  }

  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.stats = {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      agents: {},
      tools: {},
      errors: {},
      last_reset: new Date().toISOString(),
    };
    this.saveStats();
  }

  /**
   * Obtiene logs recientes
   * @param {number} limit - Número de logs a obtener
   * @param {string} level - Nivel de log a filtrar
   * @returns {Array} Array de logs
   */
  getRecentLogs(limit = 50, level = null) {
    try {
      if (!existsSync(this.toolCallsFile)) {
        return [];
      }

      const logs = require('fs')
        .readFileSync(this.toolCallsFile, 'utf8')
        .trim()
        .split('\n')
        .slice(-limit)
        .map(line => JSON.parse(line));

      if (level) {
        return logs.filter(log => log.level === level);
      }

      return logs;
    } catch (error) {
      console.error('Failed to read recent logs:', error.message);
      return [];
    }
  }

  /**
   * Limpia logs antiguos
   * @param {number} daysToKeep - Días de logs a mantener
   */
  cleanupOldLogs(daysToKeep = 7) {
    // Implementación básica - en producción usaría rotación de logs
    console.log(`Log cleanup not implemented yet. Would keep ${daysToKeep} days of logs.`);
  }
}

// Instancia singleton del logger
let toolLoggerInstance = null;

/**
 * Obtiene la instancia singleton del logger
 * @returns {ToolLogger} Instancia del logger
 */
export function getToolLogger() {
  if (!toolLoggerInstance) {
    toolLoggerInstance = new ToolLogger();
  }
  return toolLoggerInstance;
}

export default ToolLogger;
