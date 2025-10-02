#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class ContinuousMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 10000; // 10 segundos
    this.agents = options.agents || ['context', 'prompting', 'rules'];
    this.logFile = options.logFile || 'logs/monitor.jsonl';
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      latency: 100, // ms
      errorRate: 5, // %
      successRate: 95 // %
    };
  }

  async testAgent(agentName) {
    const start = Date.now();
    
    return new Promise((resolve) => {
      const agentPath = `agents/${agentName}/agent.js`;
      
      const payload = JSON.stringify({
        sources: ["README.md"],
        selectors: ["purpose"],
        max_tokens: 50
      });

      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdin.write(payload);
      child.stdin.end();

      child.on('close', (code) => {
        const latency = Date.now() - start;
        resolve({
          agent: agentName,
          latency,
          success: code === 0,
          timestamp: new Date().toISOString(),
          memory: process.memoryUsage()
        });
      });

      child.on('error', () => {
        const latency = Date.now() - start;
        resolve({
          agent: agentName,
          latency,
          success: false,
          timestamp: new Date().toISOString(),
          memory: process.memoryUsage()
        });
      });

      // Timeout
      setTimeout(() => {
        child.kill();
        resolve({
          agent: agentName,
          latency: Date.now() - start,
          success: false,
          timeout: true,
          timestamp: new Date().toISOString(),
          memory: process.memoryUsage()
        });
      }, 3000);
    });
  }

  updateMetrics(agentName, result) {
    if (!this.metrics.has(agentName)) {
      this.metrics.set(agentName, {
        latency: [],
        errors: 0,
        total: 0,
        lastUpdate: Date.now()
      });
    }

    const agentMetrics = this.metrics.get(agentName);
    agentMetrics.latency.push(result.latency);
    agentMetrics.total++;
    
    if (!result.success) {
      agentMetrics.errors++;
    }

    // Mantener solo los últimos 100 resultados
    if (agentMetrics.latency.length > 100) {
      agentMetrics.latency.shift();
    }

    agentMetrics.lastUpdate = Date.now();
  }

  checkAlerts(agentName, metrics) {
    const alerts = [];
    
    // Calcular métricas
    const successRate = ((metrics.total - metrics.errors) / metrics.total) * 100;
    const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length;
    
    // Verificar umbrales
    if (avgLatency > this.thresholds.latency) {
      alerts.push({
        type: 'LATENCY_HIGH',
        agent: agentName,
        value: avgLatency,
        threshold: this.thresholds.latency,
        timestamp: new Date().toISOString()
      });
    }

    if (successRate < this.thresholds.successRate) {
      alerts.push({
        type: 'SUCCESS_RATE_LOW',
        agent: agentName,
        value: successRate,
        threshold: this.thresholds.successRate,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  logResult(result, alerts = []) {
    const logEntry = {
      ...result,
      alerts: alerts.length > 0 ? alerts : undefined
    };

    // Crear directorio si no existe
    const logDir = path.dirname(this.logFile);
    fs.mkdirSync(logDir, { recursive: true });

    // Escribir en formato JSONL
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');

    // Mostrar alertas
    if (alerts.length > 0) {
      console.log(`🚨 ALERTAS para ${result.agent.toUpperCase()}:`);
      alerts.forEach(alert => {
        console.log(`   ${alert.type}: ${alert.value} (umbral: ${alert.threshold})`);
      });
    }
  }

  generateStatusReport() {
    const report = {
      timestamp: new Date().toISOString(),
      agents: {},
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    for (const [agentName, metrics] of this.metrics) {
      if (metrics.total === 0) continue;

      const successRate = ((metrics.total - metrics.errors) / metrics.total) * 100;
      const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length;
      const latencies = [...metrics.latency].sort((a, b) => a - b);
      
      report.agents[agentName] = {
        total: metrics.total,
        errors: metrics.errors,
        successRate: parseFloat(successRate.toFixed(2)),
        avgLatency: parseFloat(avgLatency.toFixed(2)),
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p95: latencies[Math.floor(latencies.length * 0.95)],
        p99: latencies[Math.floor(latencies.length * 0.99)],
        lastUpdate: new Date(metrics.lastUpdate).toISOString()
      };
    }

    return report;
  }

  displayStatus() {
    console.clear();
    console.log('📊 MONITOR CONTINUO - AGENTES MCP');
    console.log('=' .repeat(60));
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log(`🔄 Intervalo: ${this.interval}ms`);
    console.log('');

    for (const [agentName, metrics] of this.metrics) {
      if (metrics.total === 0) continue;

      const successRate = ((metrics.total - metrics.errors) / metrics.total) * 100;
      const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length;
      
      let status = '🟢';
      if (avgLatency > this.thresholds.latency || successRate < this.thresholds.successRate) {
        status = '🔴';
      }

      console.log(`${status} ${agentName.toUpperCase()}:`);
      console.log(`   Tests: ${metrics.total} | Éxito: ${successRate.toFixed(1)}% | Latencia: ${avgLatency.toFixed(1)}ms`);
      console.log('');
    }

    console.log('💡 Presiona Ctrl+C para detener');
  }

  async start() {
    console.log('🚀 Iniciando monitor continuo de agentes MCP...');
    console.log(`📊 Agentes: ${this.agents.join(', ')}`);
    console.log(`⏱️  Intervalo: ${this.interval}ms`);
    console.log(`📝 Log: ${this.logFile}`);
    console.log('');

    while (true) {
      const promises = this.agents.map(agent => this.testAgent(agent));
      const results = await Promise.all(promises);

      for (const result of results) {
        this.updateMetrics(result.agent, result);
        const agentMetrics = this.metrics.get(result.agent);
        const alerts = this.checkAlerts(result.agent, agentMetrics);
        this.logResult(result, alerts);
      }

      this.displayStatus();

      // Guardar reporte periódico
      const report = this.generateStatusReport();
      fs.writeFileSync('reports/continuous-monitor.json', JSON.stringify(report, null, 2));

      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
  }

  stop() {
    console.log('\n🛑 Deteniendo monitor...');
    const report = this.generateStatusReport();
    fs.writeFileSync('reports/final-monitor-report.json', JSON.stringify(report, null, 2));
    console.log('📊 Reporte final guardado en: reports/final-monitor-report.json');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--interval':
        options.interval = parseInt(args[++i]);
        break;
      case '--agents':
        options.agents = args[++i].split(',');
        break;
      case '--log':
        options.logFile = args[++i];
        break;
      case '--help':
        console.log(`
📊 CONTINUOUS MONITOR - AGENTES MCP

Uso: node tools/continuous-monitor.mjs [opciones]

Opciones:
  --interval <ms>      Intervalo entre monitoreos (default: 10000)
  --agents <lista>     Agentes a monitorear (default: context,prompting,rules)
  --log <archivo>      Archivo de log (default: logs/monitor.jsonl)
  --help               Mostrar esta ayuda

Ejemplos:
  node tools/continuous-monitor.mjs
  node tools/continuous-monitor.mjs --interval 5000 --agents context,prompting
  node tools/continuous-monitor.mjs --log logs/custom-monitor.jsonl
        `);
        process.exit(0);
    }
  }
  
  const monitor = new ContinuousMonitor(options);
  
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });
  
  await monitor.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ContinuousMonitor };
