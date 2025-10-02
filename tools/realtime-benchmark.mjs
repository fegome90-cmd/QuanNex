#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class RealtimeBenchmark {
  constructor(options = {}) {
    this.interval = options.interval || 5000; // 5 segundos por defecto
    this.duration = options.duration || 60000; // 1 minuto por defecto
    this.agent = options.agent || 'context';
    this.samples = options.samples || 10;
    this.metrics = {
      latency: [],
      throughput: [],
      errors: 0,
      total: 0,
      startTime: Date.now()
    };
    this.isRunning = false;
  }

  async runSingleTest() {
    return new Promise((resolve) => {
      const start = Date.now();
      const agentPath = `agents/${this.agent}/agent.js`;
      
      // Payload simple para testing
      const payload = JSON.stringify({
        sources: ["README.md"],
        selectors: ["purpose"],
        max_tokens: 100
      });

      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdin.write(payload);
      child.stdin.end();

      child.on('close', (code) => {
        const latency = Date.now() - start;
        resolve({
          latency,
          success: code === 0,
          timestamp: Date.now()
        });
      });

      child.on('error', () => {
        const latency = Date.now() - start;
        resolve({
          latency,
          success: false,
          timestamp: Date.now()
        });
      });

      // Timeout de 5 segundos
      setTimeout(() => {
        child.kill();
        resolve({
          latency: Date.now() - start,
          success: false,
          timeout: true,
          timestamp: Date.now()
        });
      }, 5000);
    });
  }

  calculateMetrics() {
    const { latency } = this.metrics;
    if (latency.length === 0) return null;

    const successful = latency.filter(l => l.success);
    const failed = latency.filter(l => !l.success);
    
    const latencies = successful.map(l => l.latency);
    latencies.sort((a, b) => a - b);

    return {
      total: latency.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / latency.length * 100).toFixed(2),
      avgLatency: (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2),
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies)
    };
  }

  displayMetrics(metrics) {
    if (!metrics) return;
    
    const uptime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    console.clear();
    console.log('🚀 BENCHMARK EN TIEMPO REAL - AGENTE MCP');
    console.log('=' .repeat(50));
    console.log(`📊 Agente: ${this.agent.toUpperCase()}`);
    console.log(`⏱️  Uptime: ${uptime}s`);
    console.log(`🔄 Intervalo: ${this.interval}ms`);
    console.log('');
    
    console.log('📈 MÉTRICAS DE PERFORMANCE:');
    console.log(`   Total Tests:     ${metrics.total}`);
    console.log(`   Exitosos:        ${metrics.successful} (${metrics.successRate}%)`);
    console.log(`   Fallidos:        ${metrics.failed}`);
    console.log('');
    
    console.log('⚡ LATENCIA (ms):');
    console.log(`   Promedio:        ${metrics.avgLatency}ms`);
    console.log(`   P50:             ${metrics.p50}ms`);
    console.log(`   P95:             ${metrics.p95}ms`);
    console.log(`   P99:             ${metrics.p99}ms`);
    console.log(`   Mínimo:          ${metrics.minLatency}ms`);
    console.log(`   Máximo:          ${metrics.maxLatency}ms`);
    console.log('');
    
    // Estado visual
    const avgLatency = parseFloat(metrics.avgLatency);
    let status = '🟢 EXCELENTE';
    if (avgLatency > 100) status = '🟡 BUENO';
    if (avgLatency > 200) status = '🟠 REGULAR';
    if (avgLatency > 500) status = '🔴 LENTO';
    
    console.log(`🎯 ESTADO: ${status} (${metrics.avgLatency}ms)`);
    console.log('');
    console.log('💡 Presiona Ctrl+C para detener');
  }

  async runBenchmark() {
    this.isRunning = true;
    console.log(`🚀 Iniciando benchmark en tiempo real para agente: ${this.agent}`);
    console.log(`⏱️  Intervalo: ${this.interval}ms, Duración: ${this.duration}ms`);
    console.log('');

    const startTime = Date.now();
    
    while (this.isRunning && (Date.now() - startTime) < this.duration) {
      // Ejecutar tests en paralelo
      const tests = [];
      for (let i = 0; i < this.samples; i++) {
        tests.push(this.runSingleTest());
      }
      
      const results = await Promise.all(tests);
      this.metrics.latency.push(...results);
      
      const metrics = this.calculateMetrics();
      this.displayMetrics(metrics);
      
      // Esperar hasta el próximo intervalo
      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
    
    if (this.isRunning) {
      console.log('\n⏰ Benchmark completado por tiempo');
    }
  }

  stop() {
    this.isRunning = false;
    const metrics = this.calculateMetrics();
    console.log('\n📊 REPORTE FINAL:');
    this.displayMetrics(metrics);
    
    // Guardar métricas en archivo
    const reportPath = `reports/benchmark-${this.agent}-${Date.now()}.json`;
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      agent: this.agent,
      duration: Date.now() - this.metrics.startTime,
      metrics: metrics,
      rawData: this.metrics.latency
    }, null, 2));
    
    console.log(`\n💾 Reporte guardado en: ${reportPath}`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parsear argumentos
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent':
        options.agent = args[++i];
        break;
      case '--interval':
        options.interval = parseInt(args[++i]);
        break;
      case '--duration':
        options.duration = parseInt(args[++i]);
        break;
      case '--samples':
        options.samples = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
🚀 REALTIME BENCHMARK - AGENTES MCP

Uso: node tools/realtime-benchmark.mjs [opciones]

Opciones:
  --agent <nombre>     Agente a probar (context, prompting, rules)
  --interval <ms>      Intervalo entre tests (default: 5000)
  --duration <ms>      Duración total del test (default: 60000)
  --samples <n>        Tests por intervalo (default: 10)
  --help               Mostrar esta ayuda

Ejemplos:
  node tools/realtime-benchmark.mjs --agent context
  node tools/realtime-benchmark.mjs --agent prompting --interval 3000 --duration 30000
  node tools/realtime-benchmark.mjs --agent rules --samples 5 --interval 2000
        `);
        process.exit(0);
    }
  }
  
  const benchmark = new RealtimeBenchmark(options);
  
  // Manejar Ctrl+C
  process.on('SIGINT', () => {
    benchmark.stop();
    process.exit(0);
  });
  
  await benchmark.runBenchmark();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RealtimeBenchmark };
