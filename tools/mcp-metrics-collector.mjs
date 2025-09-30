#!/usr/bin/env node
/**
 * @fileoverview MCP Metrics Collector - Recopilación de métricas usando agentes MCP
 * @description Sistema que ejecuta agentes MCP para recopilar métricas en cada paso
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class MCPMetricsCollector {
  constructor() {
    this.metrics = {
      optimization: [],
      security: [],
      quality: []
    };
    this.timestamp = new Date().toISOString();
  }

  /**
   * Ejecutar agente MCP
   */
  async runAgent(agentName, payload) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const payloadJson = JSON.stringify(payload);
      const agentPath = join(PROJECT_ROOT, 'agents', agentName, 'agent.js');

      const child = spawn('node', [agentPath, payloadJson], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => stdout += data.toString());
      child.stderr.on('data', data => stderr += data.toString());

      child.on('close', code => {
        const duration = Date.now() - startTime;
        
        try {
          // Buscar el JSON en stdout (puede haber logs antes)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in output');
          }
          
          const result = JSON.parse(jsonMatch[0]);

          resolve({
            agent: agentName,
            duration_ms: duration,
            success: code === 0 && !result.error,
            result: result
          });
        } catch (error) {
          reject({
            agent: agentName,
            duration_ms: duration,
            success: false,
            error: `Parse error: ${error.message}`,
            stdout_preview: stdout.substring(0, 200)
          });
        }
      });
    });
  }

  /**
   * Analizar con todos los agentes
   */
  async analyzeComplete(targetPath) {
    console.log(`📊 Análisis completo de ${targetPath}...`);
    const startTime = Date.now();

    // Optimization
    const optResult = await this.runAgent('optimization', {
      target_path: targetPath,
      optimization_types: ['performance', 'maintainability', 'security'],
      scan_depth: 2
    });

    if (optResult.success) {
      this.metrics.optimization.push({
        target: targetPath,
        total: optResult.result.optimization_report?.summary?.total_optimizations || 0,
        duration_ms: optResult.duration_ms
      });
      console.log(`✅ Optimizaciones: ${optResult.result.optimization_report?.summary?.total_optimizations || 0}`);
    }

    // Security
    const secResult = await this.runAgent('security', {
      target_path: targetPath,
      check_mode: 'scan',
      scan_depth: 2
    });

    if (secResult.success) {
      this.metrics.security.push({
        target: targetPath,
        vulnerabilities: secResult.result.security_report?.summary?.vulnerabilities_found || 0,
        compliance: secResult.result.security_report?.summary?.compliance_score || 0,
        duration_ms: secResult.duration_ms
      });
      console.log(`✅ Vulnerabilidades: ${secResult.result.security_report?.summary?.vulnerabilities_found || 0}`);
      console.log(`✅ Compliance: ${secResult.result.security_report?.summary?.compliance_score || 0}/100`);
    }

    // Quality
    const qualityResult = await this.runAgent('metrics', {
      target_path: targetPath,
      metric_types: ['performance', 'coverage', 'quality'],
      scan_depth: 2
    });

    if (qualityResult.success) {
      this.metrics.quality.push({
        target: targetPath,
        quality_score: qualityResult.result.metrics_report?.quality?.quality_score || 0,
        coverage: qualityResult.result.metrics_report?.summary?.coverage_percentage || 0,
        duration_ms: qualityResult.duration_ms
      });
      console.log(`✅ Quality: ${qualityResult.result.metrics_report?.quality?.quality_score || 0}/100`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`\n⏱️  Análisis completado en ${totalDuration}ms`);

    return {
      optimization: optResult,
      security: secResult,
      quality: qualityResult,
      total_duration_ms: totalDuration
    };
  }

  /**
   * Generar reporte
   */
  generateReport() {
    return {
      timestamp: this.timestamp,
      metrics: this.metrics,
      summary: {
        total_optimizations: this.metrics.optimization.reduce((sum, m) => sum + m.total, 0),
        total_vulnerabilities: this.metrics.security.reduce((sum, m) => sum + m.vulnerabilities, 0),
        avg_compliance: this.metrics.security.reduce((sum, m) => sum + m.compliance, 0) / (this.metrics.security.length || 1),
        avg_quality: this.metrics.quality.reduce((sum, m) => sum + m.quality_score, 0) / (this.metrics.quality.length || 1)
      }
    };
  }

  /**
   * Guardar reporte
   */
  async saveReport(outputPath) {
    const report = this.generateReport();
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    return report;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || 'agents/';
  const output = process.argv[3] || 'out/mcp-metrics-report.json';

  const collector = new MCPMetricsCollector();
  
  collector.analyzeComplete(target)
    .then(() => collector.saveReport(output))
    .then(report => {
      console.log('\n📊 RESUMEN:');
      console.log(JSON.stringify(report.summary, null, 2));
    })
    .catch(error => {
      console.error('❌ Error:', error.message || error);
      process.exit(1);
    });
}

export default MCPMetricsCollector;
