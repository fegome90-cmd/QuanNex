#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../.reports/metrics/qnx-events.jsonl');

/**
 * Lee y parsea eventos de telemetría
 * @returns {Array} Array de eventos parseados
 */
function readTelemetryEvents() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('❌ No se encontró archivo de telemetría:', LOG_FILE);
    return [];
  }

  try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data
      .trim()
      .split('\n')
      .filter(line => line.trim());

    return lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.warn('⚠️ Línea malformada:', line.substring(0, 100));
          return null;
        }
      })
      .filter(event => event !== null);
  } catch (error) {
    console.error('❌ Error leyendo telemetría:', error.message);
    return [];
  }
}

/**
 * Genera estadísticas de componentes
 * @param {Array} events - Eventos de telemetría
 * @returns {Object} Estadísticas de componentes
 */
function generateComponentStats(events) {
  const componentEvents = events.filter(e => e.event === 'component_used');

  const stats = {
    total_invocations: componentEvents.length,
    by_component: {},
    by_run: {},
    top_components: [],
    orchestrator_share: 0,
  };

  // Agrupar por componente
  for (const event of componentEvents) {
    const component = event.component;
    if (!stats.by_component[component]) {
      stats.by_component[component] = {
        count: 0,
        success_count: 0,
        error_count: 0,
        total_latency: 0,
        avg_latency: 0,
      };
    }

    const comp = stats.by_component[component];
    comp.count++;
    if (event.ok) {
      comp.success_count++;
    } else {
      comp.error_count++;
    }

    if (event.latency_ms) {
      comp.total_latency += event.latency_ms;
    }
  }

  // Calcular promedios
  for (const [component, comp] of Object.entries(stats.by_component)) {
    comp.avg_latency = comp.count > 0 ? Math.round(comp.total_latency / comp.count) : 0;
    comp.success_rate = comp.count > 0 ? Math.round((comp.success_count / comp.count) * 100) : 0;
  }

  // Top componentes
  stats.top_components = Object.entries(stats.by_component)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({ name, ...data }));

  // Orchestrator share
  const orchestratorCount = stats.by_component.orchestrator?.count || 0;
  stats.orchestrator_share =
    stats.total_invocations > 0
      ? Math.round((orchestratorCount / stats.total_invocations) * 100)
      : 0;

  return stats;
}

/**
 * Genera estadísticas de runs
 * @param {Array} events - Eventos de telemetría
 * @returns {Object} Estadísticas de runs
 */
function generateRunStats(events) {
  const runEvents = events.filter(e => e.event === 'run_start' || e.event === 'run_end');
  const runs = {};

  // Agrupar eventos por run_id
  for (const event of runEvents) {
    const runId = event.run_id;
    if (!runs[runId]) {
      runs[runId] = {
        run_id: runId,
        start_time: null,
        end_time: null,
        success: null,
        intent: null,
        source: null,
        duration_ms: null,
      };
    }

    if (event.event === 'run_start') {
      runs[runId].start_time = event.ts;
      runs[runId].intent = event.meta?.intent || 'unknown';
      runs[runId].source = event.meta?.source || 'unknown';
    } else if (event.event === 'run_end') {
      runs[runId].end_time = event.ts;
      runs[runId].success = event.ok;

      // Calcular duración si tenemos ambos tiempos
      if (runs[runId].start_time) {
        const start = new Date(runs[runId].start_time);
        const end = new Date(runs[runId].end_time);
        runs[runId].duration_ms = end - start;
      }
    }
  }

  const runArray = Object.values(runs).filter(r => r.start_time && r.end_time);

  const stats = {
    total_runs: runArray.length,
    successful_runs: runArray.filter(r => r.success).length,
    failed_runs: runArray.filter(r => !r.success).length,
    avg_duration_ms: 0,
    by_intent: {},
    by_source: {},
    bypass_rate: 0,
    tool_misfire_rate: 0,
  };

  // Calcular duración promedio
  const durations = runArray.map(r => r.duration_ms).filter(d => d !== null);
  stats.avg_duration_ms =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Agrupar por intención
  for (const run of runArray) {
    const intent = run.intent;
    if (!stats.by_intent[intent]) {
      stats.by_intent[intent] = { count: 0, success: 0 };
    }
    stats.by_intent[intent].count++;
    if (run.success) {
      stats.by_intent[intent].success++;
    }
  }

  // Agrupar por fuente
  for (const run of runArray) {
    const source = run.source;
    if (!stats.by_source[source]) {
      stats.by_source[source] = { count: 0, success: 0 };
    }
    stats.by_source[source].count++;
    if (run.success) {
      stats.by_source[source].success++;
    }
  }

  // Calcular bypass rate
  const bypassEvents = events.filter(e => e.event === 'cursor_bypass');
  stats.bypass_rate =
    stats.total_runs > 0 ? Math.round((bypassEvents.length / stats.total_runs) * 100) : 0;

  // Calcular tool misfire rate
  const misfireEvents = events.filter(e => e.event === 'tool_misfire');
  stats.tool_misfire_rate =
    stats.total_runs > 0 ? Math.round((misfireEvents.length / stats.total_runs) * 100) : 0;

  return stats;
}

/**
 * Genera reporte de salud del sistema
 * @param {Object} componentStats - Estadísticas de componentes
 * @param {Object} runStats - Estadísticas de runs
 * @returns {Object} Reporte de salud
 */
function generateHealthReport(componentStats, runStats) {
  const report = {
    timestamp: new Date().toISOString(),
    overall_health: 100,
    metrics: {
      orchestrator_share: componentStats.orchestrator_share,
      bypass_rate: runStats.bypass_rate,
      tool_misfire_rate: runStats.tool_misfire_rate,
      success_rate:
        runStats.total_runs > 0
          ? Math.round((runStats.successful_runs / runStats.total_runs) * 100)
          : 100,
      avg_ttfq_ms: runStats.avg_duration_ms,
    },
    thresholds: {
      orchestrator_share_min: 95,
      bypass_rate_max: 5,
      tool_misfire_rate_max: 3,
      success_rate_min: 90,
    },
    violations: [],
    recommendations: [],
  };

  // Verificar umbrales
  if (report.metrics.orchestrator_share < report.thresholds.orchestrator_share_min) {
    report.violations.push('orchestrator_share_low');
    report.overall_health -= 20;
  }

  if (report.metrics.bypass_rate > report.thresholds.bypass_rate_max) {
    report.violations.push('bypass_rate_high');
    report.overall_health -= 25;
  }

  if (report.metrics.tool_misfire_rate > report.thresholds.tool_misfire_rate_max) {
    report.violations.push('tool_misfire_rate_high');
    report.overall_health -= 15;
  }

  if (report.metrics.success_rate < report.thresholds.success_rate_min) {
    report.violations.push('success_rate_low');
    report.overall_health -= 20;
  }

  // Generar recomendaciones
  if (report.metrics.orchestrator_share < 95) {
    report.recommendations.push(
      'El orchestrator no está siendo usado consistentemente. Revisar gates de detección.'
    );
  }

  if (report.metrics.bypass_rate > 5) {
    report.recommendations.push(
      'Alta tasa de bypass de Cursor. Revisar configuración de intenciones requeridas.'
    );
  }

  if (report.metrics.tool_misfire_rate > 3) {
    report.recommendations.push(
      'Alta tasa de errores en herramientas MCP. Revisar validación de argumentos.'
    );
  }

  if (report.metrics.avg_ttfq_ms > 5000) {
    report.recommendations.push('Latencia alta. Revisar rendimiento del sistema.');
  }

  return report;
}

/**
 * Genera reporte HTML
 * @param {Object} componentStats - Estadísticas de componentes
 * @param {Object} runStats - Estadísticas de runs
 * @param {Object} healthReport - Reporte de salud
 * @returns {string} HTML del reporte
 */
function generateHTMLReport(componentStats, runStats, healthReport) {
  const healthColor =
    healthReport.overall_health >= 80
      ? 'green'
      : healthReport.overall_health >= 60
        ? 'orange'
        : 'red';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Telemetría QuanNex</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { color: #666; font-size: 14px; }
        .health-${healthColor} { color: ${healthColor === 'green' ? '#28a745' : healthColor === 'orange' ? '#fd7e14' : '#dc3545'}; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .violation { color: #dc3545; font-weight: bold; }
        .recommendation { background: #e3f2fd; padding: 10px; border-radius: 4px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Reporte de Telemetría QuanNex</h1>
        <p>Generado: ${new Date().toLocaleString()}</p>
    </div>

    <div class="metric">
        <div class="metric-value health-${healthColor}">${healthReport.overall_health}%</div>
        <div class="metric-label">Salud General</div>
    </div>
    
    <div class="metric">
        <div class="metric-value">${componentStats.orchestrator_share}%</div>
        <div class="metric-label">Uso Orchestrator</div>
    </div>
    
    <div class="metric">
        <div class="metric-value">${runStats.bypass_rate}%</div>
        <div class="metric-label">Bypass Rate</div>
    </div>
    
    <div class="metric">
        <div class="metric-value">${runStats.tool_misfire_rate}%</div>
        <div class="metric-label">Tool Misfire Rate</div>
    </div>

    <h2>📈 Top Componentes</h2>
    <table>
        <thead>
            <tr>
                <th>Componente</th>
                <th>Invocaciones</th>
                <th>Éxito</th>
                <th>Latencia Promedio</th>
            </tr>
        </thead>
        <tbody>
            ${componentStats.top_components
              .map(
                comp => `
                <tr>
                    <td><code>${comp.name}</code></td>
                    <td>${comp.count}</td>
                    <td>${comp.success_rate}%</td>
                    <td>${comp.avg_latency}ms</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <h2>🏃 Estadísticas de Runs</h2>
    <table>
        <thead>
            <tr>
                <th>Métrica</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Runs</td>
                <td>${runStats.total_runs}</td>
            </tr>
            <tr>
                <td>Runs Exitosos</td>
                <td>${runStats.successful_runs}</td>
            </tr>
            <tr>
                <td>Runs Fallidos</td>
                <td>${runStats.failed_runs}</td>
            </tr>
            <tr>
                <td>Duración Promedio</td>
                <td>${runStats.avg_duration_ms}ms</td>
            </tr>
        </tbody>
    </table>

    ${
      healthReport.violations.length > 0
        ? `
    <h2>⚠️ Violaciones</h2>
    <ul>
        ${healthReport.violations.map(violation => `<li class="violation">${violation}</li>`).join('')}
    </ul>
    `
        : ''
    }

    ${
      healthReport.recommendations.length > 0
        ? `
    <h2>💡 Recomendaciones</h2>
    ${healthReport.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
    `
        : ''
    }
</body>
</html>
  `;
}

/**
 * Función principal
 */
function main() {
  console.log('📊 Generando reporte de telemetría QuanNex...\n');

  const events = readTelemetryEvents();

  if (events.length === 0) {
    console.log('❌ No hay datos de telemetría disponibles.');
    return;
  }

  console.log(`📈 Analizando ${events.length} eventos de telemetría...\n`);

  const componentStats = generateComponentStats(events);
  const runStats = generateRunStats(events);
  const healthReport = generateHealthReport(componentStats, runStats);

  // Mostrar métricas principales
  console.log('🎯 MÉTRICAS PRINCIPALES:');
  console.log(`   Salud General: ${healthReport.overall_health}%`);
  console.log(`   Orchestrator Share: ${componentStats.orchestrator_share}%`);
  console.log(`   Bypass Rate: ${runStats.bypass_rate}%`);
  console.log(`   Tool Misfire Rate: ${runStats.tool_misfire_rate}%`);
  console.log(`   Success Rate: ${healthReport.metrics.success_rate}%`);
  console.log(`   Avg TTFQ: ${healthReport.metrics.avg_ttfq_ms}ms\n`);

  // Mostrar top componentes
  console.log('🏆 TOP COMPONENTES:');
  componentStats.top_components.slice(0, 5).forEach((comp, i) => {
    console.log(
      `   ${i + 1}. ${comp.name}: ${comp.count} invocaciones (${comp.success_rate}% éxito)`
    );
  });
  console.log('');

  // Mostrar violaciones
  if (healthReport.violations.length > 0) {
    console.log('⚠️ VIOLACIONES:');
    healthReport.violations.forEach(violation => {
      console.log(`   - ${violation}`);
    });
    console.log('');
  }

  // Mostrar recomendaciones
  if (healthReport.recommendations.length > 0) {
    console.log('💡 RECOMENDACIONES:');
    healthReport.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
    console.log('');
  }

  // Generar reporte HTML
  const htmlReport = generateHTMLReport(componentStats, runStats, healthReport);
  const htmlPath = path.join(__dirname, '../.reports/qnx-telemetry-report.html');

  try {
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`📄 Reporte HTML generado: ${htmlPath}`);
  } catch (error) {
    console.error('❌ Error generando reporte HTML:', error.message);
  }

  // Guardar datos JSON
  const jsonPath = path.join(__dirname, '../.reports/qnx-telemetry-data.json');
  const jsonData = {
    timestamp: new Date().toISOString(),
    component_stats: componentStats,
    run_stats: runStats,
    health_report: healthReport,
  };

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`📊 Datos JSON guardados: ${jsonPath}`);
  } catch (error) {
    console.error('❌ Error guardando datos JSON:', error.message);
  }

  console.log('\n✅ Reporte completado');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
