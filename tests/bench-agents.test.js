/**
 * Bench Agents Tests
 * PR-K: Benchmarks reproducibles / métricas de rendimiento
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import BenchAgents from '../tools/bench-agents.mjs';
import BenchMetrics from '../tools/bench-metrics.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const TEST_REPORTS_DIR = join(PROJECT_ROOT, 'test-reports', 'bench');

describe('Bench Agents', () => {
  let bench;

  beforeEach(() => {
    // Crear directorio de test
    if (!existsSync(TEST_REPORTS_DIR)) {
      mkdirSync(TEST_REPORTS_DIR, { recursive: true });
    }

    // Inicializar BenchAgents con directorio de test
    bench = new BenchAgents({
      outputDir: TEST_REPORTS_DIR,
      iterations: 3, // Reducir para tests
      warmup: 1,
      timeout: 5000
    });
  });

  afterEach(() => {
    // Limpiar archivos de test
    try {
      if (existsSync(TEST_REPORTS_DIR)) {
        const files = require('fs').readdirSync(TEST_REPORTS_DIR);
        files.forEach(file => {
          unlinkSync(join(TEST_REPORTS_DIR, file));
        });
      }
    } catch (error) {
      // Ignorar errores de limpieza
    }
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      assert.ok(bench);
      assert.ok(bench.config);
      assert.strictEqual(bench.config.iterations, 3);
      assert.strictEqual(bench.config.warmup, 1);
      assert.strictEqual(bench.config.timeout, 5000);
    });

    test('debe crear directorio de salida si no existe', () => {
      assert.ok(existsSync(TEST_REPORTS_DIR));
    });
  });

  describe('Cálculo de Métricas', () => {
    test('debe calcular percentiles correctamente', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const percentiles = bench.calculatePercentiles(values);

      assert.strictEqual(percentiles.p50, 5.5);
      assert.strictEqual(percentiles.p95, 9.5);
      assert.strictEqual(percentiles.p99, 9.9);
      assert.strictEqual(percentiles.min, 1);
      assert.strictEqual(percentiles.max, 10);
      assert.strictEqual(percentiles.mean, 5.5);
    });

    test('debe manejar arrays vacíos', () => {
      const values = [];
      const percentiles = bench.calculatePercentiles(values);

      assert.strictEqual(percentiles.p50, 0);
      assert.strictEqual(percentiles.p95, 0);
      assert.strictEqual(percentiles.p99, 0);
      assert.strictEqual(percentiles.min, 0);
      assert.strictEqual(percentiles.max, 0);
      assert.strictEqual(percentiles.mean, 0);
    });

    test('debe calcular métricas de iteraciones', () => {
      const iterations = [
        { success: true, duration: 100, cpu: 50, memory: 1024, throughput: 10 },
        { success: true, duration: 200, cpu: 100, memory: 2048, throughput: 5 },
        { success: false, duration: 5000, cpu: 0, memory: 0, throughput: 0 },
        { success: true, duration: 150, cpu: 75, memory: 1536, throughput: 8 }
      ];

      const metrics = bench.calculateMetrics(iterations);

      assert.strictEqual(metrics.success_rate, 0.75);
      assert.strictEqual(metrics.total_iterations, 4);
      assert.strictEqual(metrics.successful_iterations, 3);
      assert.strictEqual(metrics.duration.p50, 150);
      assert.strictEqual(metrics.cpu.p50, 75);
      assert.strictEqual(metrics.memory.p50, 1536);
      assert.strictEqual(metrics.throughput.p50, 8);
    });
  });

  describe('Creación de Input de Prueba', () => {
    test('debe crear input para agente context', () => {
      const input = bench.createTestInput('context');

      assert.ok(input.action);
      assert.ok(input.data);
      assert.ok(input.data.text);
      assert.ok(input.data.maxTokens);
    });

    test('debe crear input para agente prompting', () => {
      const input = bench.createTestInput('prompting');

      assert.ok(input.action);
      assert.ok(input.data);
      assert.ok(input.data.prompt);
      assert.ok(input.data.context);
    });

    test('debe crear input para agente rules', () => {
      const input = bench.createTestInput('rules');

      assert.ok(input.action);
      assert.ok(input.data);
      assert.ok(input.data.rules);
      assert.ok(input.data.input);
    });

    test('debe crear input por defecto para agente desconocido', () => {
      const input = bench.createTestInput('unknown');

      assert.ok(input.action);
      assert.ok(input.data);
      assert.strictEqual(input.action, 'process');
    });
  });

  describe('Generación de Reporte', () => {
    test('debe generar reporte con datos de prueba', () => {
      // Simular resultados
      bench.results = [
        {
          agent: 'test-agent',
          iterations: [
            {
              success: true,
              duration: 100,
              cpu: 50,
              memory: 1024,
              throughput: 10
            }
          ],
          metrics: {
            success_rate: 1.0,
            total_iterations: 1,
            successful_iterations: 1,
            duration: {
              p50: 100,
              p95: 100,
              p99: 100,
              min: 100,
              max: 100,
              mean: 100
            },
            cpu: { p50: 50, p95: 50, p99: 50, min: 50, max: 50, mean: 50 },
            memory: {
              p50: 1024,
              p95: 1024,
              p99: 1024,
              min: 1024,
              max: 1024,
              mean: 1024
            },
            throughput: {
              p50: 10,
              p95: 10,
              p99: 10,
              min: 10,
              max: 10,
              mean: 10
            }
          },
          timestamp: new Date().toISOString()
        }
      ];

      bench.startTime = Date.now() - 1000;
      bench.endTime = Date.now();

      const report = bench.generateReport();

      assert.ok(report);
      assert.ok(report.benchmark_info);
      assert.ok(report.summary);
      assert.ok(report.agents);
      assert.ok(report.recommendations);
      assert.strictEqual(report.agents.length, 1);
    });

    test('debe encontrar mejor y peor agente', () => {
      bench.results = [
        {
          agent: 'fast-agent',
          metrics: { duration: { p50: 100 }, cpu: { p50: 50 } }
        },
        {
          agent: 'slow-agent',
          metrics: { duration: { p50: 500 }, cpu: { p50: 250 } }
        }
      ];

      const best = bench.findBestAgent();
      const worst = bench.findWorstAgent();

      assert.strictEqual(best.agent, 'fast-agent');
      assert.strictEqual(worst.agent, 'slow-agent');
    });
  });

  describe('Generación de Recomendaciones', () => {
    test('debe generar recomendaciones para rendimiento alto', () => {
      bench.results = [
        {
          agent: 'slow-agent',
          metrics: {
            duration: { p50: 2000 },
            cpu: { p50: 1000 },
            memory: { p50: 20 * 1024 * 1024 },
            success_rate: 0.8
          }
        }
      ];

      const recommendations = bench.generateRecommendations();

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations.some(r => r.type === 'performance'));
      assert.ok(recommendations.some(r => r.type === 'reliability'));
    });

    test('debe generar recomendaciones para memoria alta', () => {
      bench.results = [
        {
          agent: 'memory-heavy-agent',
          metrics: {
            duration: { p50: 100 },
            cpu: { p50: 50 },
            memory: { p50: 100 * 1024 * 1024 },
            success_rate: 0.95
          }
        }
      ];

      const recommendations = bench.generateRecommendations();

      assert.ok(recommendations.some(r => r.type === 'memory'));
    });
  });
});

describe('Bench Metrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new BenchMetrics();
  });

  describe('Análisis de Métricas', () => {
    test('debe analizar métricas con datos de prueba', () => {
      // Crear reporte de prueba
      const testReport = {
        benchmark_info: {
          timestamp: new Date().toISOString()
        },
        summary: {
          duration: { p50: 100 },
          cpu: { p50: 50 },
          memory: { p50: 1024 * 1024 },
          success_rate: 0.95
        },
        agents: [
          {
            agent: 'test-agent',
            metrics: {
              duration: { p50: 100 },
              cpu: { p50: 50 },
              memory: { p50: 1024 * 1024 },
              success_rate: 0.95
            }
          }
        ]
      };

      // Simular directorio de reportes
      const testDir = join(PROJECT_ROOT, 'test-reports', 'bench');
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }

      // Guardar reporte de prueba
      const testFile = join(testDir, 'test-report.json');
      require('fs').writeFileSync(testFile, JSON.stringify(testReport));

      // Cambiar directorio de reportes
      metrics.reportsDir = testDir;

      const analysis = metrics.analyzeMetrics();

      assert.ok(analysis);
      assert.ok(analysis.timestamp);
      assert.ok(analysis.total_reports);
      assert.ok(analysis.trends);
      assert.ok(analysis.performance);
      assert.ok(analysis.recommendations);
    });

    test('debe calcular estadísticas correctamente', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = metrics.calculateStats(values);

      assert.strictEqual(stats.min, 1);
      assert.strictEqual(stats.max, 10);
      assert.strictEqual(stats.mean, 5.5);
      assert.strictEqual(stats.p50, 5.5);
      assert.strictEqual(stats.p95, 9.5);
      assert.strictEqual(stats.p99, 9.9);
    });

    test('debe manejar arrays vacíos en estadísticas', () => {
      const values = [];
      const stats = metrics.calculateStats(values);

      assert.strictEqual(stats.min, 0);
      assert.strictEqual(stats.max, 0);
      assert.strictEqual(stats.mean, 0);
      assert.strictEqual(stats.p50, 0);
      assert.strictEqual(stats.p95, 0);
      assert.strictEqual(stats.p99, 0);
    });
  });

  describe('Análisis de Tendencias', () => {
    test('debe calcular tendencias correctamente', () => {
      const reports = [
        {
          benchmark_info: { timestamp: '2025-01-01T00:00:00Z' },
          summary: { duration: { p50: 100 } }
        },
        {
          benchmark_info: { timestamp: '2025-01-02T00:00:00Z' },
          summary: { duration: { p50: 120 } }
        },
        {
          benchmark_info: { timestamp: '2025-01-03T00:00:00Z' },
          summary: { duration: { p50: 140 } }
        }
      ];

      const trends = metrics.analyzeTrends(reports);

      assert.ok(trends.duration);
      assert.strictEqual(trends.duration.first_value, 100);
      assert.strictEqual(trends.duration.last_value, 140);
      assert.strictEqual(trends.duration.change_percent, 40);
      assert.strictEqual(trends.duration.trend, 'worsening');
    });
  });

  describe('Comparación de Reportes', () => {
    test('debe comparar reportes correctamente', () => {
      const reports = [
        { summary: { duration: { p50: 100 }, cpu: { p50: 50 } } },
        { summary: { duration: { p50: 120 }, cpu: { p50: 60 } } }
      ];

      const comparison = metrics.compareReports(reports);

      assert.ok(comparison.duration_change);
      assert.strictEqual(comparison.duration_change.change_percent, 20);
      assert.strictEqual(comparison.duration_change.direction, 'increase');
    });

    test('debe manejar menos de 2 reportes', () => {
      const reports = [{ summary: { duration: { p50: 100 } } }];

      const comparison = metrics.compareReports(reports);

      assert.ok(comparison.message);
      assert.strictEqual(
        comparison.message,
        'Se necesitan al menos 2 reportes para comparar'
      );
    });
  });
});
