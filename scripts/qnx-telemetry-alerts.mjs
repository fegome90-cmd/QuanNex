#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración de umbrales para alertas
 */
export const THRESHOLDS = {
  // Orchestrator share - % de runs que usan el orchestrator
  ORCHESTRATOR_SHARE_MIN: 95,

  // Bypass rate - % de runs que deberían usar QuanNex pero no lo hacen
  BYPASS_RATE_MAX: 5,

  // Tool misfire rate - % de runs con errores en herramientas MCP
  TOOL_MISFIRE_RATE_MAX: 3,

  // Success rate - % de runs exitosos
  SUCCESS_RATE_MIN: 90,

  // Latencia promedio máxima en ms
  AVG_LATENCY_MAX: 5000,

  // Latencia p95 máxima en ms
  P95_LATENCY_MAX: 10000,

  // Número máximo de componentes por run
  MAX_COMPONENTS_PER_RUN: 10,

  // Tiempo máximo de ejecución de run en ms
  MAX_RUN_DURATION_MS: 30000,
};

/**
 * Tipos de alertas
 */
export const ALERT_TYPES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Configuración de alertas por tipo
 */
export const ALERT_CONFIG = {
  [ALERT_TYPES.CRITICAL]: {
    color: 'red',
    emoji: '🚨',
    priority: 1,
    auto_action: true,
  },
  [ALERT_TYPES.WARNING]: {
    color: 'orange',
    emoji: '⚠️',
    priority: 2,
    auto_action: false,
  },
  [ALERT_TYPES.INFO]: {
    color: 'blue',
    emoji: 'ℹ️',
    priority: 3,
    auto_action: false,
  },
};

/**
 * Analiza métricas y genera alertas
 * @param {Object} metrics - Métricas del sistema
 * @returns {Array} Array de alertas
 */
export function analyzeMetrics(metrics) {
  const alerts = [];

  // Orchestrator share bajo
  if (metrics.orchestrator_share < THRESHOLDS.ORCHESTRATOR_SHARE_MIN) {
    alerts.push({
      type: ALERT_TYPES.CRITICAL,
      code: 'ORCHESTRATOR_SHARE_LOW',
      message: `Orchestrator share bajo: ${metrics.orchestrator_share}% (objetivo: ≥${THRESHOLDS.ORCHESTRATOR_SHARE_MIN}%)`,
      value: metrics.orchestrator_share,
      threshold: THRESHOLDS.ORCHESTRATOR_SHARE_MIN,
      recommendation:
        'Revisar gates de detección de bypass y configuración de intenciones requeridas',
    });
  }

  // Bypass rate alto
  if (metrics.bypass_rate > THRESHOLDS.BYPASS_RATE_MAX) {
    alerts.push({
      type: ALERT_TYPES.CRITICAL,
      code: 'BYPASS_RATE_HIGH',
      message: `Bypass rate alto: ${metrics.bypass_rate}% (objetivo: ≤${THRESHOLDS.BYPASS_RATE_MAX}%)`,
      value: metrics.bypass_rate,
      threshold: THRESHOLDS.BYPASS_RATE_MAX,
      recommendation: 'Revisar configuración de intenciones requeridas y gates de detección',
    });
  }

  // Tool misfire rate alto
  if (metrics.tool_misfire_rate > THRESHOLDS.TOOL_MISFIRE_RATE_MAX) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      code: 'TOOL_MISFIRE_RATE_HIGH',
      message: `Tool misfire rate alto: ${metrics.tool_misfire_rate}% (objetivo: ≤${THRESHOLDS.TOOL_MISFIRE_RATE_MAX}%)`,
      value: metrics.tool_misfire_rate,
      threshold: THRESHOLDS.TOOL_MISFIRE_RATE_MAX,
      recommendation: 'Revisar validación de argumentos en herramientas MCP',
    });
  }

  // Success rate bajo
  if (metrics.success_rate < THRESHOLDS.SUCCESS_RATE_MIN) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      code: 'SUCCESS_RATE_LOW',
      message: `Success rate bajo: ${metrics.success_rate}% (objetivo: ≥${THRESHOLDS.SUCCESS_RATE_MIN}%)`,
      value: metrics.success_rate,
      threshold: THRESHOLDS.SUCCESS_RATE_MIN,
      recommendation: 'Revisar logs de errores y configuración del sistema',
    });
  }

  // Latencia alta
  if (metrics.avg_latency_ms > THRESHOLDS.AVG_LATENCY_MAX) {
    alerts.push({
      type: ALERT_TYPES.WARNING,
      code: 'HIGH_LATENCY',
      message: `Latencia promedio alta: ${metrics.avg_latency_ms}ms (objetivo: ≤${THRESHOLDS.AVG_LATENCY_MAX}ms)`,
      value: metrics.avg_latency_ms,
      threshold: THRESHOLDS.AVG_LATENCY_MAX,
      recommendation: 'Revisar rendimiento del sistema y optimizar componentes lentos',
    });
  }

  // Latencia p95 alta
  if (metrics.p95_latency_ms > THRESHOLDS.P95_LATENCY_MAX) {
    alerts.push({
      type: ALERT_TYPES.INFO,
      code: 'HIGH_P95_LATENCY',
      message: `Latencia P95 alta: ${metrics.p95_latency_ms}ms (objetivo: ≤${THRESHOLDS.P95_LATENCY_MAX}ms)`,
      value: metrics.p95_latency_ms,
      threshold: THRESHOLDS.P95_LATENCY_MAX,
      recommendation: 'Monitorear casos extremos de latencia',
    });
  }

  return alerts.sort((a, b) => ALERT_CONFIG[a.type].priority - ALERT_CONFIG[b.type].priority);
}

/**
 * Genera reporte de alertas
 * @param {Array} alerts - Array de alertas
 * @param {Object} metrics - Métricas del sistema
 * @returns {Object} Reporte de alertas
 */
export function generateAlertReport(alerts, metrics) {
  const report = {
    timestamp: new Date().toISOString(),
    total_alerts: alerts.length,
    critical_alerts: alerts.filter(a => a.type === ALERT_TYPES.CRITICAL).length,
    warning_alerts: alerts.filter(a => a.type === ALERT_TYPES.WARNING).length,
    info_alerts: alerts.filter(a => a.type === ALERT_TYPES.INFO).length,
    health_score: calculateHealthScore(alerts, metrics),
    alerts: alerts,
    summary: generateSummary(alerts, metrics),
  };

  return report;
}

/**
 * Calcula puntuación de salud del sistema
 * @param {Array} alerts - Array de alertas
 * @param {Object} metrics - Métricas del sistema
 * @returns {number} Puntuación de salud (0-100)
 */
function calculateHealthScore(alerts, metrics) {
  let score = 100;

  // Descontar por alertas críticas
  const criticalAlerts = alerts.filter(a => a.type === ALERT_TYPES.CRITICAL);
  score -= criticalAlerts.length * 25;

  // Descontar por alertas de warning
  const warningAlerts = alerts.filter(a => a.type === ALERT_TYPES.WARNING);
  score -= warningAlerts.length * 10;

  // Descontar por alertas de info
  const infoAlerts = alerts.filter(a => a.type === ALERT_TYPES.INFO);
  score -= infoAlerts.length * 5;

  return Math.max(0, score);
}

/**
 * Genera resumen de alertas
 * @param {Array} alerts - Array de alertas
 * @param {Object} metrics - Métricas del sistema
 * @returns {Object} Resumen
 */
function generateSummary(alerts, metrics) {
  const summary = {
    overall_status:
      alerts.length === 0
        ? 'healthy'
        : alerts.some(a => a.type === ALERT_TYPES.CRITICAL)
          ? 'critical'
          : alerts.some(a => a.type === ALERT_TYPES.WARNING)
            ? 'warning'
            : 'info',
    key_metrics: {
      orchestrator_share: `${metrics.orchestrator_share}%`,
      bypass_rate: `${metrics.bypass_rate}%`,
      tool_misfire_rate: `${metrics.tool_misfire_rate}%`,
      success_rate: `${metrics.success_rate}%`,
      avg_latency: `${metrics.avg_latency_ms}ms`,
    },
    recommendations: alerts.map(a => a.recommendation).filter((v, i, a) => a.indexOf(v) === i),
  };

  return summary;
}

/**
 * Envía alertas (placeholder para integración con sistemas externos)
 * @param {Array} alerts - Array de alertas
 * @param {Object} config - Configuración de envío
 */
export async function sendAlerts(alerts, config = {}) {
  const criticalAlerts = alerts.filter(a => a.type === ALERT_TYPES.CRITICAL);

  if (criticalAlerts.length > 0 && config.auto_action) {
    console.log('🚨 ALERTAS CRÍTICAS DETECTADAS:');
    criticalAlerts.forEach(alert => {
      console.log(`   ${ALERT_CONFIG[alert.type].emoji} ${alert.message}`);
      console.log(`   💡 ${alert.recommendation}`);
    });

    // Aquí se podría integrar con:
    // - Slack webhook
    // - Email notification
    // - PagerDuty
    // - Discord webhook
    // - etc.
  }
}

/**
 * Guarda reporte de alertas
 * @param {Object} report - Reporte de alertas
 * @param {string} filename - Nombre del archivo
 */
export function saveAlertReport(report, filename = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `qnx-alerts-${timestamp}.json`;
  const filepath = path.join(__dirname, '../.reports', filename || defaultFilename);

  try {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📄 Reporte de alertas guardado: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Error guardando reporte de alertas:', error.message);
    return null;
  }
}

/**
 * Función principal para verificar alertas
 */
export async function checkAlerts(metrics) {
  console.log('🔍 Verificando alertas del sistema...\n');

  const alerts = analyzeMetrics(metrics);
  const report = generateAlertReport(alerts, metrics);

  // Mostrar resumen
  console.log(`📊 Salud del Sistema: ${report.health_score}%`);
  console.log(`🎯 Estado General: ${report.summary.overall_status.toUpperCase()}`);
  console.log(
    `📈 Alertas: ${report.critical_alerts} críticas, ${report.warning_alerts} warnings, ${report.info_alerts} info\n`
  );

  // Mostrar alertas
  if (alerts.length > 0) {
    console.log('🚨 ALERTAS ACTIVAS:');
    alerts.forEach(alert => {
      const config = ALERT_CONFIG[alert.type];
      console.log(`   ${config.emoji} [${alert.type.toUpperCase()}] ${alert.message}`);
      console.log(`   💡 ${alert.recommendation}\n`);
    });
  } else {
    console.log('✅ No hay alertas activas - Sistema saludable\n');
  }

  // Mostrar métricas clave
  console.log('📊 MÉTRICAS CLAVE:');
  Object.entries(report.summary.key_metrics).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');

  // Guardar reporte
  const savedPath = saveAlertReport(report);

  return report;
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  // Ejemplo de uso
  const sampleMetrics = {
    orchestrator_share: 85,
    bypass_rate: 8,
    tool_misfire_rate: 2,
    success_rate: 95,
    avg_latency_ms: 3000,
    p95_latency_ms: 8000,
  };

  checkAlerts(sampleMetrics).catch(console.error);
}
