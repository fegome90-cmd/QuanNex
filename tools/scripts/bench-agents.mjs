#!/usr/bin/env node

/**
 * Bench Agents - Herramienta de benchmarks reproducibles
 * PR-K: Benchmarks reproducibles / métricas de rendimiento
 *
 * Implementa benchmarks para agentes con métricas p50/p95, CPU, memoria
 * y reportes estructurados para análisis de rendimiento
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración por defecto
const DEFAULT_CONFIG = {
  iterations: 10,
  warmup: 3,
  timeout: 30000, // 30 segundos
  outputDir: join(PROJECT_ROOT, 'reports', 'bench'),
  agents: ['context', 'prompting', 'rules'],
  metrics: ['duration', 'cpu', 'memory', 'throughput']
};

class BenchAgents {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.results = [];
    this.startTime = null;
    this.endTime = null;

    // Asegurar que el directorio de salida existe
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Ejecutar benchmark completo
   */
  async runBenchmark() {
    console.log('🚀 Iniciando benchmark de agentes...');
    this.startTime = Date.now();

    try {
      // Warmup
      console.log(
        `🔥 Ejecutando warmup (${this.config.warmup} iteraciones)...`
      );
      await this.warmup();

      // Benchmark principal
      console.log(
        `📊 Ejecutando benchmark (${this.config.iterations} iteraciones)...`
      );
      for (const agent of this.config.agents) {
        console.log(`\n📈 Benchmarking agente: ${agent}`);
        const agentResults = await this.benchmarkAgent(agent);
        this.results.push(agentResults);
      }

      // Generar reporte
      console.log('\n📋 Generando reporte...');
      const report = await this.generateReport();

      this.endTime = Date.now();
      const totalTime = this.endTime - this.startTime;

      console.log(`\n✅ Benchmark completado en ${totalTime}ms`);
      console.log(`📁 Reporte guardado en: ${report.filePath}`);

      return report;
    } catch (error) {
      console.error(`❌ Error en benchmark: ${error.message}`);
      throw error;
    }
  }

  /**
   * Warmup para estabilizar el sistema
   */
  async warmup() {
    for (let i = 0; i < this.config.warmup; i++) {
      for (const agent of this.config.agents) {
        try {
          await this.runAgentOnce(agent, { warmup: true });
        } catch (error) {
          // Ignorar errores en warmup
        }
      }
    }
  }

  /**
   * Benchmark de un agente específico
   */
  async benchmarkAgent(agentName) {
    const iterations = [];

    for (let i = 0; i < this.config.iterations; i++) {
      try {
        const result = await this.runAgentOnce(agentName, { iteration: i + 1 });
        iterations.push(result);

        // Mostrar progreso
        const progress = Math.round(((i + 1) / this.config.iterations) * 100);
        process.stdout.write(
          `\r  Progreso: ${progress}% (${i + 1}/${this.config.iterations})`
        );
      } catch (error) {
        console.error(`\n❌ Error en iteración ${i + 1}: ${error.message}`);
        iterations.push({
          error: error.message,
          duration: this.config.timeout,
          cpu: 0,
          memory: 0,
          throughput: 0
        });
      }
    }

    console.log(''); // Nueva línea después del progreso

    // Calcular métricas
    const metrics = this.calculateMetrics(iterations);

    return {
      agent: agentName,
      iterations: iterations,
      metrics: metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Ejecutar un agente una vez
   */
  async runAgentOnce(agentName, options = {}) {
    const startTime = process.hrtime.bigint();
    const startCpu = process.cpuUsage();
    const startMemory = process.memoryUsage();

    try {
      // Ejecutar agente
      const result = await this.executeAgent(agentName);

      const endTime = process.hrtime.bigint();
      const endCpu = process.cpuUsage(startCpu);
      const endMemory = process.memoryUsage();

      const duration = Number(endTime - startTime) / 1000000; // Convertir a ms
      const cpu = (endCpu.user + endCpu.system) / 1000; // Convertir a ms
      const memory = endMemory.heapUsed - startMemory.heapUsed;
      const throughput = result.throughput || 1; // Operaciones por segundo

      return {
        duration: duration,
        cpu: cpu,
        memory: memory,
        throughput: throughput,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      return {
        duration: duration,
        cpu: 0,
        memory: 0,
        throughput: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Ejecutar un agente específico
   */
  async executeAgent(agentName) {
    const agentPath = join(PROJECT_ROOT, 'agents', agentName, 'server.js');

    if (!existsSync(agentPath)) {
      throw new Error(`Agente no encontrado: ${agentPath}`);
    }

    // Crear input de prueba
    const testInput = this.createTestInput(agentName);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout después de ${this.config.timeout}ms`));
      }, this.config.timeout);

      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`Agente falló con código ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(
            new Error(`Error parseando output del agente: ${error.message}`)
          );
        }
      });

      child.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });

      // Enviar input al agente
      child.stdin.write(JSON.stringify(testInput));
      child.stdin.end();
    });
  }

  /**
   * Crear input de prueba para un agente
   */
  createTestInput(agentName) {
    const candidate = join(
      PROJECT_ROOT,
      'payloads',
      `${agentName}-test-payload.json`
    );

    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, 'utf8'));
      } catch (error) {
        console.warn(
          `⚠️  Payload inválido para ${agentName}: ${error.message}`
        );
      }
    }

    console.warn(
      `⚠️  No se encontró payload para ${agentName}, usando fallback genérico`
    );

    switch (agentName) {
      case 'context':
        return {
          sources: ['README.md'],
          selectors: ['purpose'],
          max_tokens: 256
        };
      case 'prompting':
        return {
          goal: 'Benchmark fallback prompt',
          style: 'concise'
        };
      case 'rules':
        return {
          policy_refs: ['policies/writing.md']
        };
      default:
        return {};
    }
  }

  /**
   * Calcular métricas estadísticas
   */
  calculateMetrics(iterations) {
    const successful = iterations.filter(i => i.success);
    const durations = successful.map(i => i.duration);
    const cpus = successful.map(i => i.cpu);
    const memories = successful.map(i => i.memory);
    const throughputs = successful.map(i => i.throughput);

    if (durations.length === 0) {
      return {
        success_rate: 0,
        total_iterations: iterations.length,
        successful_iterations: 0,
        duration: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        cpu: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        memory: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        throughput: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 }
      };
    }

    return {
      success_rate: successful.length / iterations.length,
      total_iterations: iterations.length,
      successful_iterations: successful.length,
      duration: this.calculatePercentiles(durations),
      cpu: this.calculatePercentiles(cpus),
      memory: this.calculatePercentiles(memories),
      throughput: this.calculatePercentiles(throughputs)
    };
  }

  /**
   * Calcular percentiles y estadísticas
   */
  calculatePercentiles(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;

    const percentile = p => {
      const index = Math.ceil((p / 100) * len) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
      min: sorted[0],
      max: sorted[len - 1],
      mean: sorted.reduce((a, b) => a + b, 0) / len
    };
  }

  /**
   * Generar reporte completo
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `benchmark-${timestamp}.json`;
    const filePath = join(this.config.outputDir, fileName);

    const report = {
      benchmark_info: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        config: this.config,
        total_duration: this.endTime - this.startTime
      },
      summary: this.generateSummary(),
      agents: this.results,
      recommendations: this.generateRecommendations()
    };

    writeFileSync(filePath, JSON.stringify(report, null, 2));

    // Generar reporte HTML
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = join(this.config.outputDir, `benchmark-${timestamp}.html`);
    writeFileSync(htmlPath, htmlReport);

    return {
      filePath: filePath,
      htmlPath: htmlPath,
      report: report
    };
  }

  /**
   * Generar resumen del benchmark
   */
  generateSummary() {
    if (this.results.length === 0) {
      return {
        total_agents: 0,
        total_iterations: 0,
        successful_iterations: 0,
        success_rate: 0,
        duration: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        cpu: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        memory: { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 },
        best_agent: null,
        worst_agent: null
      };
    }

    const allDurations = this.results.flatMap(r =>
      r.iterations.filter(i => i.success).map(i => i.duration)
    );

    const allCpus = this.results.flatMap(r =>
      r.iterations.filter(i => i.success).map(i => i.cpu)
    );

    const allMemories = this.results.flatMap(r =>
      r.iterations.filter(i => i.success).map(i => i.memory)
    );

    const totalSuccess = this.results.reduce(
      (sum, r) => sum + (r.metrics.successful_iterations || 0),
      0
    );

    const totalIterations = this.results.reduce(
      (sum, r) => sum + (r.metrics.total_iterations || 0),
      0
    );

    return {
      total_agents: this.results.length,
      total_iterations: totalIterations,
      successful_iterations: totalSuccess,
      success_rate: totalIterations > 0 ? totalSuccess / totalIterations : 0,
      duration: this.calculatePercentiles(allDurations),
      cpu: this.calculatePercentiles(allCpus),
      memory: this.calculatePercentiles(allMemories),
      best_agent: this.findBestAgent(),
      worst_agent: this.findWorstAgent()
    };
  }

  /**
   * Encontrar el mejor agente
   */
  findBestAgent() {
    if (this.results.length === 0) return null;

    return this.results.reduce((best, current) => {
      const bestScore =
        ((best.metrics.duration || {}).p50 || 0) +
        ((best.metrics.cpu || {}).p50 || 0);
      const currentScore =
        ((current.metrics.duration || {}).p50 || 0) +
        ((current.metrics.cpu || {}).p50 || 0);
      return currentScore < bestScore ? current : best;
    });
  }

  /**
   * Encontrar el peor agente
   */
  findWorstAgent() {
    if (this.results.length === 0) return null;

    return this.results.reduce((worst, current) => {
      const worstScore =
        ((worst.metrics.duration || {}).p50 || 0) +
        ((worst.metrics.cpu || {}).p50 || 0);
      const currentScore =
        ((current.metrics.duration || {}).p50 || 0) +
        ((current.metrics.cpu || {}).p50 || 0);
      return currentScore > worstScore ? current : worst;
    });
  }

  /**
   * Generar recomendaciones
   */
  generateRecommendations() {
    const recommendations = [];

    // Análisis de rendimiento
    const avgDuration =
      this.results.reduce((sum, r) => sum + r.metrics.duration.p50, 0) /
      this.results.length;

    if (avgDuration > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message:
          'Duración promedio alta (>1000ms). Considerar optimización de código.',
        suggestion: 'Revisar algoritmos y operaciones costosas'
      });
    }

    // Análisis de CPU
    const avgCpu =
      this.results.reduce((sum, r) => sum + r.metrics.cpu.p50, 0) /
      this.results.length;

    if (avgCpu > 500) {
      recommendations.push({
        type: 'cpu',
        priority: 'medium',
        message:
          'Uso de CPU alto (>500ms). Considerar optimización de procesamiento.',
        suggestion: 'Implementar procesamiento asíncrono o paralelo'
      });
    }

    // Análisis de memoria
    const avgMemory =
      this.results.reduce((sum, r) => sum + r.metrics.memory.p50, 0) /
      this.results.length;

    if (avgMemory > 10 * 1024 * 1024) {
      // 10MB
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message:
          'Uso de memoria alto (>10MB). Considerar optimización de memoria.',
        suggestion: 'Implementar garbage collection y liberación de memoria'
      });
    }

    // Análisis de éxito
    const avgSuccess =
      this.results.reduce((sum, r) => sum + r.metrics.success_rate, 0) /
      this.results.length;

    if (avgSuccess < 0.95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Tasa de éxito baja (<95%). Revisar estabilidad del sistema.',
        suggestion: 'Implementar mejor manejo de errores y validación'
      });
    }

    return recommendations;
  }

  /**
   * Generar reporte HTML
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #007acc; }
        .agent-results { margin: 20px 0; }
        .agent { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007acc; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Benchmark Report</h1>
        <p><strong>Fecha:</strong> ${report.benchmark_info.timestamp}</p>
        <p><strong>Duración Total:</strong> ${report.benchmark_info.total_duration}ms</p>
        
        <div class="summary">
            <h2>📈 Resumen General</h2>
            <div class="metric">
                <div class="metric-value">${report.summary.total_agents}</div>
                <div>Agentes</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.total_iterations}</div>
                <div>Iteraciones</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((report.summary.success_rate || 0) * 100).toFixed(1)}%</div>
                <div>Tasa de Éxito</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((report.summary.duration || {}).p50 || 0).toFixed(1)}ms</div>
                <div>Duración P50</div>
            </div>
        </div>
        
        <h2>🤖 Resultados por Agente</h2>
        <div class="agent-results">
            ${report.agents
              .map(
                agent => `
                <div class="agent">
                    <h3>${agent.agent}</h3>
                    <p><strong>Éxito:</strong> ${((agent.metrics.success_rate || 0) * 100).toFixed(1)}% (${agent.metrics.successful_iterations || 0}/${agent.metrics.total_iterations || 0})</p>
                    <p><strong>Duración P50:</strong> ${((agent.metrics.duration || {}).p50 || 0).toFixed(1)}ms</p>
                    <p><strong>CPU P50:</strong> ${((agent.metrics.cpu || {}).p50 || 0).toFixed(1)}ms</p>
                    <p><strong>Memoria P50:</strong> ${(((agent.metrics.memory || {}).p50 || 0) / 1024 / 1024).toFixed(2)}MB</p>
                </div>
            `
              )
              .join('')}
        </div>
        
        <h2>💡 Recomendaciones</h2>
        <div class="recommendations">
            ${report.recommendations
              .map(
                rec => `
                <div class="recommendation priority-${rec.priority}">
                    <strong>${rec.type.toUpperCase()}</strong> - ${rec.message}
                    <br><em>Sugerencia: ${rec.suggestion}</em>
                </div>
            `
              )
              .join('')}
        </div>
    </div>
</body>
</html>`;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const config = {};

  // Parsear argumentos de línea de comandos
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      if (key === 'iterations' || key === 'warmup' || key === 'timeout') {
        config[key] = parseInt(value);
      } else if (key === 'agents') {
        config[key] = value.split(',');
      } else {
        config[key] = value;
      }
    }
  }

  const bench = new BenchAgents(config);

  try {
    const report = await bench.runBenchmark();
    console.log('\n📊 Reporte generado:');
    console.log(`   JSON: ${report.filePath}`);
    console.log(`   HTML: ${report.htmlPath}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default BenchAgents;
