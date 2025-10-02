#!/usr/bin/env node
/**
 * @fileoverview Detailed Reports Generator
 * @description Generador de reportes detallados con métricas de correcciones aplicadas
 * PR-I: Tarea 4 - Generar reportes detallados de correcciones
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración CLI
const argv = yargs(hideBin(process.argv))
  .usage('Uso: $0 [opciones]')
  .option('reports-dir', {
    alias: 'r',
    type: 'string',
    description: 'Directorio de reportes a procesar',
    default: './out'
  })
  .option('output-format', {
    alias: 'f',
    type: 'string',
    description: 'Formato de salida (json, html, markdown)',
    default: 'json'
  })
  .option('include-metrics', {
    alias: 'm',
    type: 'boolean',
    description: 'Incluir métricas detalladas',
    default: true
  })
  .option('include-charts', {
    alias: 'c',
    type: 'boolean',
    description: 'Incluir gráficos en reportes HTML',
    default: false
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Salida detallada',
    default: false
  })
  .help()
  .alias('help', 'h').argv;

class DetailedReportsGenerator {
  constructor() {
    this.reportsDir = argv.reportsDir;
    this.outputFormat = argv.outputFormat;
    this.includeMetrics = argv.includeMetrics;
    this.includeCharts = argv.includeCharts;
    this.verbose = argv.verbose;
    this.outputDir = join(PROJECT_ROOT, 'out');
    this.reports = [];
    this.metrics = {};
  }

  /**
   * Ejecutar generador de reportes detallados
   */
  async run() {
    try {
      console.log('📊 Iniciando Detailed Reports Generator...');

      // Paso 1: Recopilar todos los reportes
      await this.collectReports();

      // Paso 2: Procesar métricas
      if (this.includeMetrics) {
        await this.processMetrics();
      }

      // Paso 3: Generar reporte consolidado
      await this.generateConsolidatedReport();

      // Paso 4: Generar reportes específicos por formato
      await this.generateFormattedReports();

      console.log('✅ Detailed Reports Generator completado exitosamente');
    } catch (error) {
      console.error('❌ Error en Detailed Reports Generator:', error.message);
      process.exit(1);
    }
  }

  /**
   * Recopilar todos los reportes disponibles
   */
  async collectReports() {
    console.log(`📁 Recopilando reportes desde: ${this.reportsDir}`);

    if (!existsSync(this.reportsDir)) {
      console.warn(
        `⚠️ Directorio de reportes no encontrado: ${this.reportsDir}`
      );
      return;
    }

    const files = readdirSync(this.reportsDir);
    const reportFiles = files.filter(
      file =>
        file.includes('optimization-autofix') ||
        file.includes('auto-correction') ||
        file.includes('retry-rollback')
    );

    console.log(`📋 Encontrados ${reportFiles.length} archivos de reporte`);

    for (const file of reportFiles) {
      try {
        const filePath = join(this.reportsDir, file);
        const content = readFileSync(filePath, 'utf8');
        const report = JSON.parse(content);

        this.reports.push({
          file,
          path: filePath,
          timestamp: this.extractTimestamp(file),
          data: report
        });

        if (this.verbose) {
          console.log(`📄 Procesado: ${file}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando ${file}: ${error.message}`);
      }
    }

    console.log(`✅ ${this.reports.length} reportes recopilados exitosamente`);
  }

  /**
   * Extraer timestamp del nombre del archivo
   */
  extractTimestamp(filename) {
    const match = filename.match(/(\d{13})/);
    return match
      ? new Date(parseInt(match[1])).toISOString()
      : new Date().toISOString();
  }

  /**
   * Procesar métricas de todos los reportes
   */
  async processMetrics() {
    console.log('📈 Procesando métricas detalladas...');

    this.metrics = {
      total_reports: this.reports.length,
      optimization_reports: 0,
      correction_reports: 0,
      retry_reports: 0,
      total_corrections_applied: 0,
      total_corrections_failed: 0,
      total_attempts: 0,
      success_rate: 0,
      average_attempts: 0,
      by_type: {},
      by_priority: {},
      timeline: []
    };

    for (const report of this.reports) {
      this.processReportMetrics(report);
    }

    // Calcular métricas agregadas
    if (
      this.metrics.total_corrections_applied +
        this.metrics.total_corrections_failed >
      0
    ) {
      this.metrics.success_rate =
        (
          (this.metrics.total_corrections_applied /
            (this.metrics.total_corrections_applied +
              this.metrics.total_corrections_failed)) *
          100
        ).toFixed(2) + '%';
    }

    if (this.metrics.total_attempts > 0) {
      this.metrics.average_attempts = (
        this.metrics.total_attempts / this.reports.length
      ).toFixed(2);
    }

    console.log(
      `📊 Métricas procesadas: ${this.metrics.total_corrections_applied} aplicadas, ${this.metrics.total_corrections_failed} fallidas`
    );
  }

  /**
   * Procesar métricas de un reporte individual
   */
  processReportMetrics(report) {
    const data = report.data;

    // Clasificar tipo de reporte
    if (data.integration_report) {
      this.metrics.optimization_reports++;
    } else if (data.auto_correction_report) {
      this.metrics.correction_reports++;
      this.metrics.total_corrections_applied +=
        data.auto_correction_report.results.applied || 0;
      this.metrics.total_corrections_failed +=
        data.auto_correction_report.results.failed || 0;
    } else if (data.retry_rollback_report) {
      this.metrics.retry_reports++;
      this.metrics.total_attempts +=
        data.retry_rollback_report.results.total_attempts || 0;
    }

    // Procesar timeline
    this.metrics.timeline.push({
      timestamp: report.timestamp,
      type: this.getReportType(data),
      success: this.getReportSuccess(data)
    });
  }

  /**
   * Determinar tipo de reporte
   */
  getReportType(data) {
    if (data.integration_report) return 'optimization';
    if (data.auto_correction_report) return 'correction';
    if (data.retry_rollback_report) return 'retry';
    return 'unknown';
  }

  /**
   * Determinar éxito del reporte
   */
  getReportSuccess(data) {
    if (data.auto_correction_report) {
      return data.auto_correction_report.results.failed === 0;
    }
    if (data.retry_rollback_report) {
      return data.retry_rollback_report.results.failed === 0;
    }
    return true;
  }

  /**
   * Generar reporte consolidado
   */
  async generateConsolidatedReport() {
    console.log('📋 Generando reporte consolidado...');

    const consolidatedReport = {
      detailed_reports_summary: {
        timestamp: new Date().toISOString(),
        generator_version: '1.0.0',
        reports_processed: this.reports.length,
        metrics: this.metrics,
        individual_reports: this.reports.map(r => ({
          file: r.file,
          timestamp: r.timestamp,
          type: this.getReportType(r.data),
          success: this.getReportSuccess(r.data)
        }))
      }
    };

    // Asegurar que el directorio out existe
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    const reportFile = join(
      this.outputDir,
      `detailed-reports-summary-${Date.now()}.json`
    );
    writeFileSync(reportFile, JSON.stringify(consolidatedReport, null, 2));

    console.log(`📊 Reporte consolidado generado: ${reportFile}`);
  }

  /**
   * Generar reportes en formatos específicos
   */
  async generateFormattedReports() {
    console.log(`📝 Generando reportes en formato ${this.outputFormat}...`);

    switch (this.outputFormat) {
      case 'html':
        await this.generateHTMLReport();
        break;
      case 'markdown':
        await this.generateMarkdownReport();
        break;
      case 'json':
      default:
        await this.generateJSONReport();
        break;
    }
  }

  /**
   * Generar reporte HTML
   */
  async generateHTMLReport() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Detallado de Correcciones Automáticas</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #e8f4f8; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c5aa0; }
        .metric-label { color: #666; margin-top: 5px; }
        .timeline { margin: 20px 0; }
        .timeline-item { padding: 10px; margin: 5px 0; border-left: 3px solid #2c5aa0; background: #f9f9f9; }
        .success { border-left-color: #28a745; }
        .failure { border-left-color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Reporte Detallado de Correcciones Automáticas</h1>
        <p>Generado el: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">${this.metrics.total_reports}</div>
            <div class="metric-label">Reportes Totales</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.metrics.total_corrections_applied}</div>
            <div class="metric-label">Correcciones Aplicadas</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.metrics.total_corrections_failed}</div>
            <div class="metric-label">Correcciones Fallidas</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.metrics.success_rate}</div>
            <div class="metric-label">Tasa de Éxito</div>
        </div>
    </div>
    
    <div class="timeline">
        <h2>📈 Timeline de Ejecuciones</h2>
        ${this.metrics.timeline
          .map(
            item => `
            <div class="timeline-item ${item.success ? 'success' : 'failure'}">
                <strong>${new Date(item.timestamp).toLocaleString()}</strong> - 
                ${item.type} - 
                ${item.success ? '✅ Exitoso' : '❌ Fallido'}
            </div>
        `
          )
          .join('')}
    </div>
</body>
</html>`;

    const htmlFile = join(
      this.outputDir,
      `detailed-reports-${Date.now()}.html`
    );
    writeFileSync(htmlFile, htmlContent);
    console.log(`📄 Reporte HTML generado: ${htmlFile}`);
  }

  /**
   * Generar reporte Markdown
   */
  async generateMarkdownReport() {
    const markdownContent = `# 📊 Reporte Detallado de Correcciones Automáticas

**Generado el:** ${new Date().toLocaleString()}

## 📈 Métricas Generales

| Métrica | Valor |
|---------|-------|
| Reportes Totales | ${this.metrics.total_reports} |
| Correcciones Aplicadas | ${this.metrics.total_corrections_applied} |
| Correcciones Fallidas | ${this.metrics.total_corrections_failed} |
| Tasa de Éxito | ${this.metrics.success_rate} |
| Intentos Totales | ${this.metrics.total_attempts} |
| Promedio de Intentos | ${this.metrics.average_attempts} |

## 📋 Tipos de Reportes

- **Optimization Reports:** ${this.metrics.optimization_reports}
- **Correction Reports:** ${this.metrics.correction_reports}
- **Retry Reports:** ${this.metrics.retry_reports}

## 📈 Timeline de Ejecuciones

${this.metrics.timeline
  .map(
    item =>
      `- **${new Date(item.timestamp).toLocaleString()}** - ${item.type} - ${item.success ? '✅ Exitoso' : '❌ Fallido'}`
  )
  .join('\n')}

## 🔧 Herramientas Utilizadas

- **Optimization-Autofix Integration:** Conecta @optimization con run-autofix
- **Auto Correction Engine:** Aplica correcciones automáticamente
- **Retry Rollback System:** Maneja reintentos y rollbacks
- **Detailed Reports Generator:** Genera reportes consolidados

---

*Reporte generado por Detailed Reports Generator v1.0.0*
`;

    const markdownFile = join(
      this.outputDir,
      `detailed-reports-${Date.now()}.md`
    );
    writeFileSync(markdownFile, markdownContent);
    console.log(`📄 Reporte Markdown generado: ${markdownFile}`);
  }

  /**
   * Generar reporte JSON
   */
  async generateJSONReport() {
    const jsonReport = {
      detailed_reports_json: {
        timestamp: new Date().toISOString(),
        generator_version: '1.0.0',
        summary: {
          total_reports: this.metrics.total_reports,
          corrections_applied: this.metrics.total_corrections_applied,
          corrections_failed: this.metrics.total_corrections_failed,
          success_rate: this.metrics.success_rate,
          total_attempts: this.metrics.total_attempts,
          average_attempts: this.metrics.average_attempts
        },
        detailed_metrics: this.metrics,
        reports: this.reports.map(r => ({
          file: r.file,
          timestamp: r.timestamp,
          type: this.getReportType(r.data),
          success: this.getReportSuccess(r.data),
          data: r.data
        }))
      }
    };

    const jsonFile = join(
      this.outputDir,
      `detailed-reports-${Date.now()}.json`
    );
    writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2));
    console.log(`📄 Reporte JSON generado: ${jsonFile}`);
  }
}

// Ejecutar generador si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const generator = new DetailedReportsGenerator();
  generator.run().catch(console.error);
}

export default DetailedReportsGenerator;
