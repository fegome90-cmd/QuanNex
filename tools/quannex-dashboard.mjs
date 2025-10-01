#!/usr/bin/env node
/**
 * @fileoverview QuanNex Dashboard
 * @description Dashboard visual para métricas y estado del semáforo
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class QuanNexDashboard {
  constructor() {
    this.metricsDir = join(PROJECT_ROOT, 'data', 'metrics');
    this.reportsDir = join(PROJECT_ROOT, 'data', 'reports');
    this.logsDir = join(PROJECT_ROOT, 'logs');
  }

  async generateDashboard() {
    console.log('📊 QUANNEX DASHBOARD');
    console.log('===================');
    console.log('');

    // 1. Estado actual del semáforo
    await this.showSemaphoreStatus();

    // 2. Métricas de los últimos 7 días
    await this.showWeeklyMetrics();

    // 3. Tendencias y análisis
    await this.showTrends();

    // 4. Alertas y recomendaciones
    await this.showAlerts();

    // 5. Estado del sistema
    await this.showSystemStatus();

    console.log('');
    console.log('📁 Archivos de datos:');
    console.log(`  📊 Métricas: ${this.metricsDir}`);
    console.log(`  📋 Reportes: ${this.reportsDir}`);
    console.log(`  📝 Logs: ${this.logsDir}`);
  }

  async showSemaphoreStatus() {
    console.log('🚦 ESTADO DEL SEMÁFORO');
    console.log('======================');

    const latestReport = this.getLatestReport();
    if (!latestReport) {
      console.log('❌ No hay reportes disponibles');
      return;
    }

    const status = latestReport.summary.semaphore_status;
    const recommendation = latestReport.summary.recommendation;

    // Mostrar estado con emoji
    const statusEmoji = status === 'GREEN' ? '🟢' : '🔴';
    console.log(`${statusEmoji} Estado: ${status}`);
    console.log(`💡 Recomendación: ${recommendation}`);

    // Mostrar métricas clave
    console.log('');
    console.log('📈 Métricas Clave:');
    Object.entries(latestReport.summary.key_metrics).forEach(([key, value]) => {
      const emoji = this.getMetricEmoji(key, value);
      console.log(`  ${emoji} ${key}: ${value}`);
    });

    console.log('');
  }

  async showWeeklyMetrics() {
    console.log('📅 MÉTRICAS DE LOS ÚLTIMOS 7 DÍAS');
    console.log('==================================');

    const reports = this.getWeeklyReports();
    if (reports.length === 0) {
      console.log('❌ No hay datos de la última semana');
      return;
    }

    // Calcular promedios
    const avgMetrics = this.calculateWeeklyAverages(reports);

    console.log('📊 Promedios semanales:');
    console.log(`  🎯 Éxito CI: ${avgMetrics.ci_success.toFixed(1)}%`);
    console.log(`  📋 Contratos: ${avgMetrics.contracts_success.toFixed(1)}%`);
    console.log(`  ⚡ Error rate: ${avgMetrics.error_rate.toFixed(1)}%`);
    console.log(`  🚀 Latencia p95: ${avgMetrics.latency_p95.toFixed(1)}s`);

    // Mostrar días con semáforo verde
    const greenDays = reports.filter(r => r.summary.semaphore_status === 'GREEN').length;
    console.log(`  🟢 Días con semáforo verde: ${greenDays}/7`);

    console.log('');
  }

  async showTrends() {
    console.log('📈 TENDENCIAS Y ANÁLISIS');
    console.log('=========================');

    const reports = this.getWeeklyReports();
    if (reports.length < 2) {
      console.log('❌ Datos insuficientes para análisis de tendencias');
      return;
    }

    // Analizar tendencias
    const trends = this.analyzeTrends(reports);

    console.log('📊 Tendencias detectadas:');
    Object.entries(trends).forEach(([metric, trend]) => {
      const emoji = this.getTrendEmoji(trend);
      console.log(`  ${emoji} ${metric}: ${trend}`);
    });

    console.log('');
  }

  async showAlerts() {
    console.log('⚠️ ALERTAS Y RECOMENDACIONES');
    console.log('=============================');

    const latestReport = this.getLatestReport();
    if (!latestReport) {
      console.log('❌ No hay reportes disponibles');
      return;
    }

    const alerts = latestReport.actions || [];
    if (alerts.length === 0) {
      console.log('✅ No hay alertas activas');
    } else {
      alerts.forEach((alert, index) => {
        const priorityEmoji = this.getPriorityEmoji(alert.priority);
        console.log(`  ${priorityEmoji} [${alert.priority}] ${alert.action}`);
        console.log(`     📝 Razón: ${alert.reason}`);
      });
    }

    console.log('');
  }

  async showSystemStatus() {
    console.log('⚙️ ESTADO DEL SISTEMA');
    console.log('=====================');

    // Verificar archivos críticos
    const criticalFiles = [
      '.cursor/mcp.json',
      '.mcp.json',
      'orchestration/mcp/server.js',
      'contracts/handshake.js',
      'contracts/schema.js'
    ];

    console.log('📁 Archivos críticos:');
    criticalFiles.forEach(file => {
      const exists = existsSync(join(PROJECT_ROOT, file));
      const emoji = exists ? '✅' : '❌';
      console.log(`  ${emoji} ${file}`);
    });

    // Verificar directorios de datos
    console.log('');
    console.log('📂 Directorios de datos:');
    const dataDirs = ['data/metrics', 'data/reports', 'logs'];
    dataDirs.forEach(dir => {
      const exists = existsSync(join(PROJECT_ROOT, dir));
      const emoji = exists ? '✅' : '❌';
      console.log(`  ${emoji} ${dir}`);
    });

    console.log('');
  }

  getLatestReport() {
    try {
      const reports = this.getWeeklyReports();
      return reports[reports.length - 1];
    } catch (error) {
      return null;
    }
  }

  getWeeklyReports() {
    const reports = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const reportFile = join(this.reportsDir, `daily-report-${dateStr}.json`);
      
      if (existsSync(reportFile)) {
        try {
          const report = JSON.parse(readFileSync(reportFile, 'utf8'));
          reports.push(report);
        } catch (error) {
          // Ignorar archivos corruptos
        }
      }
    }
    
    return reports;
  }

  calculateWeeklyAverages(reports) {
    if (reports.length === 0) return {};

    const totals = {
      ci_success: 0,
      contracts_success: 0,
      error_rate: 0,
      latency_p95: 0
    };

    reports.forEach(report => {
      if (report.details) {
        totals.ci_success += report.details.ci_cd?.success_rate || 0;
        totals.contracts_success += report.details.contracts?.success_rate || 0;
        totals.error_rate += report.details.operation?.error_rate || 0;
        totals.latency_p95 += report.details.operation?.latency_p95 || 0;
      }
    });

    const count = reports.length;
    return {
      ci_success: totals.ci_success / count,
      contracts_success: totals.contracts_success / count,
      error_rate: totals.error_rate / count,
      latency_p95: totals.latency_p95 / count
    };
  }

  analyzeTrends(reports) {
    if (reports.length < 2) return {};

    const first = reports[0];
    const last = reports[reports.length - 1];

    const trends = {};

    // Analizar tendencias de métricas clave
    if (first.details && last.details) {
      const firstCi = first.details.ci_cd?.success_rate || 0;
      const lastCi = last.details.ci_cd?.success_rate || 0;
      trends['CI Success'] = this.getTrendDirection(firstCi, lastCi);

      const firstError = first.details.operation?.error_rate || 0;
      const lastError = last.details.operation?.error_rate || 0;
      trends['Error Rate'] = this.getTrendDirection(firstError, lastError, true); // Invertir para error rate

      const firstLatency = first.details.operation?.latency_p95 || 0;
      const lastLatency = last.details.operation?.latency_p95 || 0;
      trends['Latency'] = this.getTrendDirection(firstLatency, lastLatency, true); // Invertir para latencia
    }

    return trends;
  }

  getTrendDirection(first, last, invert = false) {
    const diff = last - first;
    const threshold = 0.1; // 10% de cambio mínimo para considerar tendencia

    if (Math.abs(diff) < threshold) return 'stable';
    
    const isImprovement = invert ? diff < 0 : diff > 0;
    return isImprovement ? 'improving' : 'declining';
  }

  getMetricEmoji(key, value) {
    if (key.includes('defects')) {
      const count = parseInt(value.split(' ')[0]);
      return count === 0 ? '✅' : count <= 3 ? '⚠️' : '❌';
    }
    if (key.includes('ci_success')) {
      const percent = parseInt(value);
      return percent >= 98 ? '✅' : percent >= 90 ? '⚠️' : '❌';
    }
    if (key.includes('contracts')) {
      const percent = parseInt(value);
      return percent === 100 ? '✅' : '❌';
    }
    if (key.includes('error_rate')) {
      const percent = parseFloat(value);
      return percent <= 1 ? '✅' : percent <= 3 ? '⚠️' : '❌';
    }
    if (key.includes('latency')) {
      const seconds = parseFloat(value);
      return seconds <= 7.5 ? '✅' : seconds <= 10 ? '⚠️' : '❌';
    }
    return '📊';
  }

  getTrendEmoji(trend) {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  }

  getPriorityEmoji(priority) {
    switch (priority) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '📋';
      case 'LOW': return 'ℹ️';
      default: return '📌';
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new QuanNexDashboard();
  dashboard.generateDashboard().catch(console.error);
}

export default QuanNexDashboard;
