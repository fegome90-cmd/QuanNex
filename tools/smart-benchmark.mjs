#!/usr/bin/env node

import { spawn } from 'child_process';

const AGENT_PAYLOADS = {
  context: {
    sources: ["README.md"],
    selectors: ["purpose"],
    max_tokens: 100
  },
  prompting: {
    goal: "Test performance benchmark",
    style: "technical"
  },
  rules: {
    policy_refs: ["README.md"],
    tone: "technical"
  }
};

async function smartBenchmark(agentName = 'context', samples = 10) {
  console.log(`🚀 SMART BENCHMARK - Agente: ${agentName.toUpperCase()}`);
  console.log(`📊 Muestras: ${samples}`);
  console.log('=' .repeat(50));

  if (!AGENT_PAYLOADS[agentName]) {
    console.error(`❌ Agente no soportado: ${agentName}`);
    console.log(`✅ Agentes disponibles: ${Object.keys(AGENT_PAYLOADS).join(', ')}`);
    return;
  }

  const results = [];
  const payload = AGENT_PAYLOADS[agentName];
  
  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    
    const result = await new Promise((resolve) => {
      const agentPath = `agents/${agentName}/agent.js`;

      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const latency = Date.now() - start;
        const success = code === 0 && stdout.includes('schema_version');
        
        resolve({
          latency,
          success,
          iteration: i + 1,
          stdout: stdout.slice(0, 100), // Primeros 100 chars para debug
          stderr: stderr.slice(0, 100)
        });
      });

      child.on('error', (error) => {
        const latency = Date.now() - start;
        resolve({
          latency,
          success: false,
          iteration: i + 1,
          error: error.message,
          stderr: stderr.slice(0, 100)
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
    const info = result.timeout ? 'TIMEOUT' : result.error ? 'ERROR' : '';
    console.log(`${status} Test ${(i + 1).toString().padStart(2)}: ${latency}ms ${info}`);
    
    // Mostrar debug si hay error
    if (!result.success && !result.timeout) {
      console.log(`    Debug: ${result.stderr || result.error || 'Sin salida'}`);
    }
  }

  // Calcular métricas
  const successful = results.filter(r => r.success);
  const latencies = successful.map(r => r.latency);
  
  if (latencies.length === 0) {
    console.log('\n❌ TODOS LOS TESTS FALLARON');
    console.log('🔍 Posibles causas:');
    console.log('   - Agente no responde correctamente');
    console.log('   - Payload incorrecto');
    console.log('   - Problema de configuración');
    return;
  }

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

async function benchmarkAllAgents(samples = 10) {
  console.log('🚀 BENCHMARK COMPLETO - TODOS LOS AGENTES');
  console.log('=' .repeat(60));
  
  const results = {};
  
  for (const agent of Object.keys(AGENT_PAYLOADS)) {
    console.log(`\n📊 Probando agente: ${agent.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    const metrics = await smartBenchmark(agent, samples);
    if (metrics) {
      results[agent] = metrics;
    }
    
    console.log(''); // Línea en blanco entre agentes
  }
  
  // Resumen comparativo
  console.log('\n📈 RESUMEN COMPARATIVO:');
  console.log('=' .repeat(60));
  console.log('Agente     | Éxito | Latencia | Estado');
  console.log('-----------|-------|----------|--------');
  
  for (const [agent, metrics] of Object.entries(results)) {
    const success = `${metrics.successRate}%`.padStart(5);
    const latency = `${metrics.avgLatency}ms`.padStart(8);
    const avgLatency = parseFloat(metrics.avgLatency);
    let status = '🟢';
    if (avgLatency > 100) status = '🟡';
    if (avgLatency > 200) status = '🟠';
    if (avgLatency > 500) status = '🔴';
    
    console.log(`${agent.padEnd(10)} | ${success} | ${latency} | ${status}`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  let agent = 'all';
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
🚀 SMART BENCHMARK - Agentes MCP

Uso: node tools/smart-benchmark.mjs [opciones]

Opciones:
  --agent <nombre>     Agente a probar (context, prompting, rules, all)
  --samples <n>        Número de muestras (default: 10)
  --help               Mostrar esta ayuda

Ejemplos:
  node tools/smart-benchmark.mjs
  node tools/smart-benchmark.mjs --agent context --samples 20
  node tools/smart-benchmark.mjs --agent all --samples 5
        `);
        process.exit(0);
    }
  }
  
  if (agent === 'all') {
    await benchmarkAllAgents(samples);
  } else {
    await smartBenchmark(agent, samples);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { smartBenchmark, benchmarkAllAgents };
