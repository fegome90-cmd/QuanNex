#!/usr/bin/env node

/**
 * Bench Metrics - Analizador de métricas de rendimiento
 * PR-K: Benchmarks reproducibles / métricas de rendimiento
 * 
 * Analiza métricas de rendimiento y genera reportes comparativos
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class BenchMetrics {
  constructor() {
    this.reportsDir = join(PROJECT_ROOT, 'reports', 'bench');
    this.outputDir = join(PROJECT_ROOT, 'reports', 'metrics');
    
    // Asegurar que los directorios existen
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Analizar métricas de todos los reportes
   */
  async analyzeMetrics() {
    console.log('📊 Analizando métricas de rendimiento...');
    
    const reports = this.loadReports();
    if (reports.length === 0) {
      console.log('❌ No se encontraron reportes de benchmark');
      return;
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      total_reports: reports.length,
      time_range: this.getTimeRange(reports),
      trends: this.analyzeTrends(reports),
      performance: this.analyzePerformance(reports),
      recommendations: this.generateRecommendations(reports),
      comparison: this.compareReports(reports)
    };

    // Guardar análisis
    const outputFile = join(this.outputDir, `metrics-analysis-${Date.now()}.json`);
    writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    
    // Generar reporte HTML
    const htmlReport = this.generateHTMLReport(analysis);
    const htmlFile = join(this.outputDir, `metrics-analysis-${Date.now()}.html`);
    writeFileSync(htmlFile, htmlReport);

    console.log(`✅ Análisis completado:`);
    console.log(`   JSON: ${outputFile}`);
    console.log(`   HTML: ${htmlFile}`);

    return analysis;
  }

  /**
   * Cargar todos los reportes de benchmark
   */
  loadReports() {
    if (!existsSync(this.reportsDir)) {
      return [];
    }

    const files = readdirSync(this.reportsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => join(this.reportsDir, file));

    return files.map(file => {
      try {
        const content = readFileSync(file, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️ Error cargando reporte ${file}: ${error.message}`);
        return null;
      }
    }).filter(report => report !== null);
  }

  /**
   * Obtener rango de tiempo de los reportes
   */
  getTimeRange(reports) {
    const timestamps = reports.map(r => new Date(r.benchmark_info.timestamp));
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    
    return {
      start: min.toISOString(),
      end: max.toISOString(),
      duration_days: Math.ceil((max - min) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Analizar tendencias de rendimiento
   */
  analyzeTrends(reports) {
    const sortedReports = reports.sort((a, b) => 
      new Date(a.benchmark_info.timestamp) - new Date(b.benchmark_info.timestamp)
    );

    const trends = {
      duration: this.calculateTrend(sortedReports, 'summary.duration.p50'),
      cpu: this.calculateTrend(sortedReports, 'summary.cpu.p50'),
      memory: this.calculateTrend(sortedReports, 'summary.memory.p50'),
      success_rate: this.calculateTrend(sortedReports, 'summary.success_rate')
    };

    return trends;
  }

  /**
   * Calcular tendencia de una métrica
   */
  calculateTrend(reports, metricPath) {
    const values = reports.map(r => this.getNestedValue(r, metricPath));
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    return {
      first_value: first,
      last_value: last,
      change_percent: change,
      trend: change > 5 ? 'worsening' : change < -5 ? 'improving' : 'stable',
      values: values
    };
  }

  /**
   * Obtener valor anidado de un objeto
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Analizar rendimiento general
   */
  analyzePerformance(reports) {
    const allDurations = reports.flatMap(r => 
      r.agents.flatMap(a => a.iterations.filter(i => i.success).map(i => i.duration))
    );
    
    const allCpus = reports.flatMap(r => 
      r.agents.flatMap(a => a.iterations.filter(i => i.success).map(i => i.cpu))
    );
    
    const allMemories = reports.flatMap(r => 
      r.agents.flatMap(a => a.iterations.filter(i => i.success).map(i => i.memory))
    );

    return {
      duration: this.calculateStats(allDurations),
      cpu: this.calculateStats(allCpus),
      memory: this.calculateStats(allMemories),
      total_measurements: allDurations.length
    };
  }

  /**
   * Calcular estadísticas de un conjunto de valores
   */
  calculateStats(values) {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;
    
    const percentile = (p) => {
      const index = Math.ceil((p / 100) * len) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: sorted.reduce((a, b) => a + b, 0) / len,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99)
    };
  }

  /**
   * Generar recomendaciones basadas en métricas
   */
  generateRecommendations(reports) {
    const recommendations = [];
    
    // Análisis de rendimiento general
    const avgDuration = reports.reduce((sum, r) => 
      sum + r.summary.duration.p50, 0
    ) / reports.length;
    
    if (avgDuration > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Duración promedio muy alta (>2000ms)',
        suggestion: 'Revisar algoritmos y optimizar operaciones costosas',
        impact: 'Alto impacto en experiencia de usuario'
      });
    }
    
    // Análisis de estabilidad
    const avgSuccess = reports.reduce((sum, r) => 
      sum + r.summary.success_rate, 0
    ) / reports.length;
    
    if (avgSuccess < 0.9) {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        message: 'Tasa de éxito muy baja (<90%)',
        suggestion: 'Implementar mejor manejo de errores y validación',
        impact: 'Crítico para la estabilidad del sistema'
      });
    }
    
    // Análisis de memoria
    const avgMemory = reports.reduce((sum, r) => 
      sum + r.summary.memory.p50, 0
    ) / reports.length;
    
    if (avgMemory > 50 * 1024 * 1024) { // 50MB
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'Uso de memoria alto (>50MB)',
        suggestion: 'Implementar optimización de memoria y garbage collection',
        impact: 'Puede afectar el rendimiento del sistema'
      });
    }
    
    // Análisis de tendencias
    const trends = this.analyzeTrends(reports);
    
    if (trends.duration.trend === 'worsening') {
      recommendations.push({
        type: 'trend',
        priority: 'high',
        message: `Rendimiento empeorando (${trends.duration.change_percent.toFixed(1)}%)`,
        suggestion: 'Investigar cambios recientes que puedan estar causando degradación',
        impact: 'Degradación continua del rendimiento'
      });
    }
    
    return recommendations;
  }

  /**
   * Comparar reportes
   */
  compareReports(reports) {
    if (reports.length < 2) {
      return { message: 'Se necesitan al menos 2 reportes para comparar' };
    }

    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    
    const comparison = {
      duration_change: this.compareMetric(latest.summary.duration.p50, previous.summary.duration.p50),
      cpu_change: this.compareMetric(latest.summary.cpu.p50, previous.summary.cpu.p50),
      memory_change: this.compareMetric(latest.summary.memory.p50, previous.summary.memory.p50),
      success_rate_change: this.compareMetric(latest.summary.success_rate, previous.summary.success_rate)
    };

    return comparison;
  }

  /**
   * Comparar una métrica entre dos reportes
   */
  compareMetric(latest, previous) {
    const change = ((latest - previous) / previous) * 100;
    return {
      previous: previous,
      latest: latest,
      change_percent: change,
      direction: change > 0 ? 'increase' : 'decrease',
      magnitude: Math.abs(change) > 10 ? 'significant' : Math.abs(change) > 5 ? 'moderate' : 'minor'
    };
  }

  /**
   * Generar reporte HTML
   */
  generateHTMLReport(analysis) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis de Métricas - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #007acc; }
        .trend { margin: 20px 0; }
        .trend-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .trend-improving { border-left: 4px solid #28a745; }
        .trend-worsening { border-left: 4px solid #dc3545; }
        .trend-stable { border-left: 4px solid #6c757d; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .comparison { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Análisis de Métricas de Rendimiento</h1>
        <p><strong>Fecha:</strong> ${analysis.timestamp}</p>
        <p><strong>Reportes Analizados:</strong> ${analysis.total_reports}</p>
        <p><strong>Período:</strong> ${analysis.time_range.start} - ${analysis.time_range.end}</p>
        
        <div class="summary">
            <h2>📈 Resumen de Rendimiento</h2>
            <div class="metric">
                <div class="metric-value">${analysis.performance.duration.p50.toFixed(1)}ms</div>
                <div>Duración P50</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analysis.performance.cpu.p50.toFixed(1)}ms</div>
                <div>CPU P50</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(analysis.performance.memory.p50 / 1024 / 1024).toFixed(2)}MB</div>
                <div>Memoria P50</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analysis.performance.total_measurements}</div>
                <div>Mediciones</div>
            </div>
        </div>
        
        <h2>📈 Tendencias</h2>
        <div class="trend">
            <div class="trend-item trend-${analysis.trends.duration.trend}">
                <strong>Duración:</strong> ${analysis.trends.duration.change_percent.toFixed(1)}% 
                (${analysis.trends.duration.first_value.toFixed(1)}ms → ${analysis.trends.duration.last_value.toFixed(1)}ms)
            </div>
            <div class="trend-item trend-${analysis.trends.cpu.trend}">
                <strong>CPU:</strong> ${analysis.trends.cpu.change_percent.toFixed(1)}% 
                (${analysis.trends.cpu.first_value.toFixed(1)}ms → ${analysis.trends.cpu.last_value.toFixed(1)}ms)
            </div>
            <div class="trend-item trend-${analysis.trends.memory.trend}">
                <strong>Memoria:</strong> ${analysis.trends.memory.change_percent.toFixed(1)}% 
                (${(analysis.trends.memory.first_value / 1024 / 1024).toFixed(2)}MB → ${(analysis.trends.memory.last_value / 1024 / 1024).toFixed(2)}MB)
            </div>
            <div class="trend-item trend-${analysis.trends.success_rate.trend}">
                <strong>Tasa de Éxito:</strong> ${analysis.trends.success_rate.change_percent.toFixed(1)}% 
                (${(analysis.trends.success_rate.first_value * 100).toFixed(1)}% → ${(analysis.trends.success_rate.last_value * 100).toFixed(1)}%)
            </div>
        </div>
        
        ${analysis.comparison.message ? `
        <h2>🔄 Comparación</h2>
        <div class="comparison">
            <p>${analysis.comparison.message}</p>
        </div>
        ` : `
        <h2>🔄 Comparación (Último vs Anterior)</h2>
        <div class="comparison">
            <p><strong>Duración:</strong> ${analysis.comparison.duration_change.change_percent.toFixed(1)}% 
            (${analysis.comparison.duration_change.direction})</p>
            <p><strong>CPU:</strong> ${analysis.comparison.cpu_change.change_percent.toFixed(1)}% 
            (${analysis.comparison.cpu_change.direction})</p>
            <p><strong>Memoria:</strong> ${analysis.comparison.memory_change.change_percent.toFixed(1)}% 
            (${analysis.comparison.memory_change.direction})</p>
            <p><strong>Tasa de Éxito:</strong> ${analysis.comparison.success_rate_change.change_percent.toFixed(1)}% 
            (${analysis.comparison.success_rate_change.direction})</p>
        </div>
        `}
        
        <h2>💡 Recomendaciones</h2>
        <div class="recommendations">
            ${analysis.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <strong>${rec.type.toUpperCase()}</strong> - ${rec.message}
                    <br><em>Sugerencia: ${rec.suggestion}</em>
                    <br><em>Impacto: ${rec.impact}</em>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const metrics = new BenchMetrics();

  try {
    await metrics.analyzeMetrics();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default BenchMetrics;
