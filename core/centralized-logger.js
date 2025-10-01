#!/usr/bin/env node
/**
 * Centralized Logger - Sistema de Logging Centralizado y Confiable
 *
 * Este módulo proporciona un sistema de logging robusto, consistente
 * y confiable para todos los componentes del sistema MCP.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class CentralizedLogger {
  constructor(component = 'unknown') {
    this.component = component;
    this.logDir = join(PROJECT_ROOT, '.reports');
    this.mainLogFile = join(this.logDir, 'centralized-system.log');
    this.metricsFile = join(this.logDir, 'system-metrics.json');
    this.activityFile = join(this.logDir, 'activity-tracker.json');

    this.initializeLogger();
  }

  /**
   * Inicializa el sistema de logging
   */
  initializeLogger() {
    // Crear directorio si no existe
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Inicializar archivos si no existen
    this.initializeFiles();
  }

  /**
   * Inicializa archivos de logging
   */
  initializeFiles() {
    // Inicializar métricas del sistema
    if (!existsSync(this.metricsFile)) {
      const initialMetrics = {
        version: '1.0.0',
        totalExecutions: 0,
        totalViolations: 0,
        totalActivities: 0,
        components: {},
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
    }

    // Inicializar tracker de actividad
    if (!existsSync(this.activityFile)) {
      const initialActivity = {
        version: '1.0.0',
        activities: [],
        lastActivity: null,
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(this.activityFile, JSON.stringify(initialActivity, null, 2));
    }
  }

  /**
   * Log principal del sistema
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      component: this.component,
      level: level.toUpperCase(),
      message,
      data,
      pid: process.pid
    };

    // Escribir al log principal
    const logLine = JSON.stringify(logEntry) + '\n';
    writeFileSync(this.mainLogFile, logLine, { flag: 'a' });

    // Mostrar en consola con formato
    this.consoleLog(level, message, data);
  }

  /**
   * Log de información
   */
  info(message, data = {}) {
    this.log('info', message, data);
  }

  /**
   * Log de advertencia
   */
  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  /**
   * Log de error
   */
  error(message, data = {}) {
    this.log('error', message, data);
  }

  /**
   * Log de debug
   */
  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  /**
   * Log de éxito
   */
  success(message, data = {}) {
    this.log('success', message, data);
  }

  /**
   * Registra actividad específica
   */
  recordActivity(type, details = {}) {
    const timestamp = new Date().toISOString();
    const activity = {
      timestamp,
      component: this.component,
      type,
      details,
      pid: process.pid
    };

    // Actualizar tracker de actividad
    this.updateActivityTracker(activity);

    // Log de actividad
    this.info(`Activity recorded: ${type}`, { activity });

    return activity;
  }

  /**
   * Actualiza el tracker de actividad
   */
  updateActivityTracker(activity) {
    try {
      const activityData = JSON.parse(readFileSync(this.activityFile, 'utf8'));

      activityData.activities.push(activity);

      // Mantener solo las últimas 1000 actividades
      if (activityData.activities.length > 1000) {
        activityData.activities = activityData.activities.slice(-1000);
      }

      activityData.lastActivity = activity;
      activityData.lastUpdated = new Date().toISOString();

      writeFileSync(this.activityFile, JSON.stringify(activityData, null, 2));
    } catch (error) {
      this.error('Failed to update activity tracker', { error: error.message });
    }
  }

  /**
   * Registra métricas del sistema
   */
  recordMetrics(metrics) {
    try {
      const metricsData = JSON.parse(readFileSync(this.metricsFile, 'utf8'));

      // Actualizar métricas generales
      metricsData.totalExecutions += metrics.executions || 0;
      metricsData.totalViolations += metrics.violations || 0;
      metricsData.totalActivities += metrics.activities || 0;

      // Actualizar métricas del componente
      if (!metricsData.components[this.component]) {
        metricsData.components[this.component] = {
          executions: 0,
          violations: 0,
          activities: 0,
          lastActivity: null
        };
      }

      const componentMetrics = metricsData.components[this.component];
      componentMetrics.executions += metrics.executions || 0;
      componentMetrics.violations += metrics.violations || 0;
      componentMetrics.activities += metrics.activities || 1;
      componentMetrics.lastActivity = new Date().toISOString();

      metricsData.lastUpdated = new Date().toISOString();

      writeFileSync(this.metricsFile, JSON.stringify(metricsData, null, 2));

      this.debug('Metrics recorded', { metrics, component: this.component });
    } catch (error) {
      this.error('Failed to record metrics', { error: error.message });
    }
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getSystemStats() {
    try {
      const metricsData = JSON.parse(readFileSync(this.metricsFile, 'utf8'));
      const activityData = JSON.parse(readFileSync(this.activityFile, 'utf8'));

      // Obtener estadísticas del throttle para consistencia
      let throttleExecutions = 0;
      let throttleViolations = 0;

      try {
        const throttleFile = join(this.logDir, 'rules-throttle.json');
        if (existsSync(throttleFile)) {
          const throttleData = JSON.parse(readFileSync(throttleFile, 'utf8'));
          throttleExecutions = throttleData.executions?.length || 0;
          throttleViolations = throttleData.violations?.length || 0;
        }
      } catch (error) {
        this.warn('Failed to read throttle data', { error: error.message });
      }

      // Usar el mayor valor entre métricas centralizadas y throttle
      const totalExecutions = Math.max(metricsData.totalExecutions || 0, throttleExecutions);
      const totalViolations = Math.max(metricsData.totalViolations || 0, throttleViolations);

      // Calcular estadísticas de la última hora
      const oneHourAgo = new Date(Date.now() - 3600000);
      const recentActivities = activityData.activities.filter(activity =>
        new Date(activity.timestamp) > oneHourAgo
      );

      return {
        total: {
          executions: totalExecutions,
          violations: totalViolations,
          activities: metricsData.totalActivities || 0
        },
        recent: {
          activities: recentActivities.length,
          taskCreations: recentActivities.filter(a => a.type === 'task_creation').length,
          fileCreations: recentActivities.filter(a => a.type === 'file_creation').length,
          projectCreations: recentActivities.filter(a => a.type === 'project_creation').length
        },
        components: metricsData.components || {},
        lastUpdated: metricsData.lastUpdated || new Date().toISOString(),
        throttle: {
          executions: throttleExecutions,
          violations: throttleViolations
        }
      };
    } catch (error) {
      this.error('Failed to get system stats', { error: error.message });
      return {
        total: { executions: 0, violations: 0, activities: 0 },
        recent: { activities: 0, taskCreations: 0, fileCreations: 0, projectCreations: 0 },
        components: {},
        lastUpdated: new Date().toISOString(),
        throttle: { executions: 0, violations: 0 }
      };
    }
  }

  /**
   * Obtiene logs recientes
   */
  getRecentLogs(limit = 50) {
    try {
      if (!existsSync(this.mainLogFile)) {
        return [];
      }

      const content = readFileSync(this.mainLogFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      return lines
        .slice(-limit)
        .map(line => JSON.parse(line))
        .reverse(); // Más recientes primero
    } catch (error) {
      this.error('Failed to get recent logs', { error: error.message });
      return [];
    }
  }

  /**
   * Limpia logs antiguos
   */
  cleanOldLogs(daysToKeep = 7) {
    try {
      const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

      // Limpiar log principal
      if (existsSync(this.mainLogFile)) {
        const content = readFileSync(this.mainLogFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        const recentLines = lines.filter(line => {
          try {
            const entry = JSON.parse(line);
            return new Date(entry.timestamp) > cutoffDate;
          } catch {
            return true; // Mantener líneas que no se pueden parsear
          }
        });

        writeFileSync(this.mainLogFile, recentLines.join('\n') + '\n');
      }

      // Limpiar tracker de actividad
      if (existsSync(this.activityFile)) {
        const activityData = JSON.parse(readFileSync(this.activityFile, 'utf8'));
        activityData.activities = activityData.activities.filter(activity =>
          new Date(activity.timestamp) > cutoffDate
        );
        writeFileSync(this.activityFile, JSON.stringify(activityData, null, 2));
      }

      this.info(`Cleaned logs older than ${daysToKeep} days`);
    } catch (error) {
      this.error('Failed to clean old logs', { error: error.message });
    }
  }

  /**
   * Muestra logs en consola con formato
   */
  consoleLog(level, message, data) {
    const timestamp = new Date().toISOString().substring(11, 23);
    const component = this.component.padEnd(15);

    let color = '';
    let symbol = '';

    switch (level.toUpperCase()) {
      case 'ERROR':
        color = '\x1b[31m'; // Rojo
        symbol = '❌';
        break;
      case 'WARN':
        color = '\x1b[33m'; // Amarillo
        symbol = '⚠️ ';
        break;
      case 'SUCCESS':
        color = '\x1b[32m'; // Verde
        symbol = '✅';
        break;
      case 'DEBUG':
        color = '\x1b[36m'; // Cian
        symbol = '🔍';
        break;
      default:
        color = '\x1b[34m'; // Azul
        symbol = 'ℹ️ ';
    }

    const reset = '\x1b[0m';
    const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';

    console.log(`${color}[${timestamp}] ${symbol} [${component}] ${message}${dataStr}${reset}`);
  }

  /**
   * Valida integridad del sistema de logging
   */
  validateIntegrity() {
    const issues = [];

    try {
      // Verificar archivos principales
      if (!existsSync(this.mainLogFile)) {
        issues.push('Main log file missing');
      }

      if (!existsSync(this.metricsFile)) {
        issues.push('Metrics file missing');
      }

      if (!existsSync(this.activityFile)) {
        issues.push('Activity file missing');
      }

      // Verificar formato de métricas
      try {
        const metricsData = JSON.parse(readFileSync(this.metricsFile, 'utf8'));
        if (!metricsData.version) {
          issues.push('Metrics file missing version');
        }
      } catch {
        issues.push('Metrics file corrupted');
      }

      // Verificar formato de actividad
      try {
        const activityData = JSON.parse(readFileSync(this.activityFile, 'utf8'));
        if (!Array.isArray(activityData.activities)) {
          issues.push('Activity file corrupted');
        }
      } catch {
        issues.push('Activity file corrupted');
      }

      if (issues.length === 0) {
        this.success('Logging system integrity validated');
        return { valid: true, issues: [] };
      } else {
        this.warn('Logging system integrity issues found', { issues });
        return { valid: false, issues };
      }
    } catch (error) {
      this.error('Failed to validate logging integrity', { error: error.message });
      return { valid: false, issues: ['Validation failed'] };
    }
  }
}

// Exportar para uso como módulo
export default CentralizedLogger;

// Si se ejecuta directamente, mostrar estadísticas
if (import.meta.url === `file://${process.argv[1]}`) {
  const logger = new CentralizedLogger('centralized-logger');
  const stats = logger.getSystemStats();

  // Solo imprimir JSON puro para parsing
  if (process.argv.includes('--json-only')) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log('📊 [CENTRALIZED-LOGGER] System Statistics:');
    console.log(JSON.stringify(stats, null, 2));
  }
}
