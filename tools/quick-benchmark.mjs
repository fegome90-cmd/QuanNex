#!/usr/bin/env node

import { spawn } from 'child_process';

async function quickBenchmark(agentName = 'context', samples = 10) {
  console.log(`🚀 BENCHMARK RÁPIDO - Agente: ${agentName.toUpperCase()}`);
  console.log(`📊 Muestras: ${samples}`);
  console.log('=' .repeat(50));

  const results = [];
  
  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    
    const result = await new Promise((resolve) => {
      const agentPath = `agents/${agentName}/agent.js`;
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
          iteration: i + 1
        });
      });

      child.on('error', () => {
        const latency = Date.now() - start;
        resolve({
          latency,
          success: false,
          iteration: i + 1
        });
      });

      setTimeout(() => {
        child.kill();
        resolve({
          latency: Date.now() - start,
          success: false,
          timeout: true,
          iteration: i + 1
        });
      }, 5000);
    });

    results.push(result);
    
    // Mostrar progreso en tiempo real
    const status = result.success ? '✅' : '❌';
    const latency = result.latency.toString().padStart(3);
    console.log(`${status} Test ${(i + 1).toString().padStart(2)}: ${latency}ms`);
  }

  // Calcular métricas
  const successful = results.filter(r => r.success);
  const latencies = successful.map(r => r.latency);
  latencies.sort((a, b) => a - b);

  const metrics = {
    total: results.length,
    successful: successful.length,
    failed: results.length - successful.length,
    successRate: (successful.length / results.length * 100).toFixed(1),
    avgLatency: (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1),
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies)
  };

  console.log('\n📊 RESULTADOS FINALES:');
  console.log('=' .repeat(50));
  console.log(`Total Tests:     ${metrics.total}`);
  console.log(`Exitosos:        ${metrics.successful} (${metrics.successRate}%)`);
  console.log(`Fallidos:        ${metrics.failed}`);
  console.log('');
  console.log('⚡ LATENCIA (ms):');
  console.log(`Promedio:        ${metrics.avgLatency}ms`);
  console.log(`P50:             ${metrics.p50}ms`);
  console.log(`P95:             ${metrics.p95}ms`);
  console.log(`P99:             ${metrics.p99}ms`);
  console.log(`Mínimo:          ${metrics.minLatency}ms`);
  console.log(`Máximo:          ${metrics.maxLatency}ms`);
  
  // Estado visual
  const avgLatency = parseFloat(metrics.avgLatency);
  let status = '🟢 EXCELENTE';
  if (avgLatency > 100) status = '🟡 BUENO';
  if (avgLatency > 200) status = '🟠 REGULAR';
  if (avgLatency > 500) status = '🔴 LENTO';
  
  console.log(`\n🎯 ESTADO: ${status} (${metrics.avgLatency}ms)`);
  
  return metrics;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  let agent = 'context';
  let samples = 10;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--agent':
        agent = args[++i];
        break;
      case '--samples':
        samples = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
🚀 QUICK BENCHMARK - Agentes MCP

Uso: node tools/quick-benchmark.mjs [opciones]

Opciones:
  --agent <nombre>     Agente a probar (context, prompting, rules)
  --samples <n>        Número de muestras (default: 10)
  --help               Mostrar esta ayuda

Ejemplos:
  node tools/quick-benchmark.mjs
  node tools/quick-benchmark.mjs --agent prompting --samples 20
  node tools/quick-benchmark.mjs --agent rules --samples 5
        `);
        process.exit(0);
    }
  }
  
  await quickBenchmark(agent, samples);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { quickBenchmark };
