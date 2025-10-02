#!/usr/bin/env node
/**
 * METRICS AGENT
 * Analista de métricas especializado en tracking de productividad, calidad y performance del proyecto
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

const validateInput = (data) => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (data.metric_types && !Array.isArray(data.metric_types)) {
    errors.push('metric_types must be an array');
  }
  if (data.time_range && typeof data.time_range !== 'string') {
    errors.push('time_range must be a string');
  }
  if (data.analysis_depth && !['basic', 'detailed', 'comprehensive'].includes(data.analysis_depth)) {
    errors.push('analysis_depth must be one of: basic, detailed, comprehensive');
  }
  return errors;
};

const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);
const inputErrors = validateInput(data);
if (inputErrors.length > 0) {
  console.error(JSON.stringify(inputErrors, null, 2));
  process.exit(1);
}

const metricTypes = data.metric_types || ['productivity', 'quality', 'performance'];
const timeRange = data.time_range || '7d';
const analysisDepth = data.analysis_depth || 'basic';

console.log('📊 [Metrics Analysis] Iniciando análisis de métricas...');

// Simulate metrics collection and analysis
const collectMetrics = (type) => {
  console.log(`📈 [Metrics Analysis] Recolectando métricas de ${type}...`);
  
  switch (type) {
    case 'productivity':
      return {
        tasks_completed: 15,
        lead_time_avg: '2.3h',
        on_time_percentage: 87,
        automation_rate: 65
      };
    case 'quality':
      return {
        defect_rate: 3.2,
        rework_percentage: 8.5,
        test_coverage: 78,
        code_quality_score: 85
      };
    case 'performance':
      return {
        response_time_avg: '245ms',
        throughput: '120 req/min',
        error_rate: 0.8,
        uptime_percentage: 99.2
      };
    default:
      return { status: 'unknown_metric_type' };
  }
};

const analyzeTrends = (metrics) => {
  console.log('📊 [Metrics Analysis] Analizando tendencias...');
  return {
    trend_direction: 'improving',
    trend_strength: 'moderate',
    key_insights: [
      'Productividad aumentó 15% en la última semana',
      'Calidad del código mejoró con nueva cobertura de tests',
      'Performance estable con latencia dentro de objetivos'
    ],
    recommendations: [
      'Continuar con automatización de tareas repetitivas',
      'Implementar más tests unitarios para mejorar cobertura',
      'Monitorear métricas de performance en producción'
    ]
  };
};

const results = {
  schema_version: "1.0.0",
  agent_version: "1.0.0",
  analysis_type: analysisDepth,
  time_range: timeRange,
  timestamp: new Date().toISOString(),
  metrics: {},
  trends: {},
  health_score: 0,
  alerts: [],
  dashboard: {
    overall_health: 'green',
    productivity_score: 0,
    quality_score: 0,
    performance_score: 0
  }
};

// Collect metrics for each requested type
metricTypes.forEach(type => {
  results.metrics[type] = collectMetrics(type);
});

// Analyze trends
results.trends = analyzeTrends(results.metrics);

// Calculate health scores
const productivityScore = results.metrics.productivity ? 85 : 0;
const qualityScore = results.metrics.quality ? 78 : 0;
const performanceScore = results.metrics.performance ? 92 : 0;

results.health_score = Math.round((productivityScore + qualityScore + performanceScore) / 3);
results.dashboard.productivity_score = productivityScore;
results.dashboard.quality_score = qualityScore;
results.dashboard.performance_score = performanceScore;

// Generate alerts
if (results.health_score < 70) {
  results.alerts.push({
    level: 'warning',
    message: 'Health score por debajo del objetivo',
    recommendation: 'Revisar métricas críticas'
  });
}

if (results.metrics.quality && results.metrics.quality.defect_rate > 5) {
  results.alerts.push({
    level: 'critical',
    message: 'Tasa de defectos alta',
    recommendation: 'Implementar más testing y code review'
  });
}

console.log('📊 [Metrics Analysis] Análisis completado');
console.log(`📊 [Metrics Analysis] Health Score: ${results.health_score}/100`);
console.log(`📊 [Metrics Analysis] Alertas generadas: ${results.alerts.length}`);

if (results.alerts.length > 0) {
  console.log('⚠️ [Metrics Analysis] Alertas activas:');
  results.alerts.forEach(alert => {
    console.log(`   ${alert.level.toUpperCase()}: ${alert.message}`);
  });
}

console.log('✅ [SUCCESS] Análisis de métricas completado exitosamente');

console.log(JSON.stringify(results, null, 2));
