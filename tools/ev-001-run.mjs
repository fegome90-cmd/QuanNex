#!/usr/bin/env node
/**
 * EV-001 Runner: Ejecuta el experimento completo MCP vs Cursor Fallback
 * Simula uso real y genera datos para análisis
 */
import { initEV001Tracer, traceMCP, completeMCP, traceCursorFallback, completeCursorFallback, endEV001Session } from './ev-001-tracer.mjs';
import EV001Analyzer from './ev-001-analyze.mjs';

class EV001Runner {
  constructor() {
    this.tracer = initEV001Tracer();
    this.scenarios = [
      { name: 'context_query', agent: 'context', operation: 'query', complexity: 'low' },
      { name: 'prompt_generation', agent: 'prompting', operation: 'generate', complexity: 'medium' },
      { name: 'rules_validation', agent: 'rules', operation: 'validate', complexity: 'low' },
      { name: 'complex_analysis', agent: 'context', operation: 'analyze', complexity: 'high' },
      { name: 'security_check', agent: 'security', operation: 'scan', complexity: 'medium' }
    ];
  }

  /**
   * Simular escenario MCP exitoso
   */
  async simulateMCPScenario(scenario) {
    console.log(`🤖 Simulando escenario MCP: ${scenario.name}`);
    
    const requestId = traceMCP({
      agent: scenario.agent,
      operation: scenario.operation,
      payload: {
        scenario: scenario.name,
        complexity: scenario.complexity,
        timestamp: new Date().toISOString()
      }
    });

    // Simular latencia basada en complejidad
    const latency = this.calculateLatency(scenario.complexity);
    await this.sleep(latency);

    const result = {
      success: true,
      data: {
        agent: scenario.agent,
        operation: scenario.operation,
        result: `MCP processed ${scenario.name} successfully`,
        latency: latency,
        tokens: this.estimateTokens(scenario.complexity)
      }
    };

    completeMCP(requestId, result);
    return result;
  }

  /**
   * Simular escenario de fallback de Cursor
   */
  async simulateCursorFallback(scenario) {
    console.log(`🔄 Simulando fallback Cursor: ${scenario.name}`);
    
    const requestId = traceCursorFallback({
      operation: scenario.operation,
      reason: 'MCP not available or failed',
      payload: {
        scenario: scenario.name,
        complexity: scenario.complexity,
        timestamp: new Date().toISOString()
      }
    });

    // Simular latencia diferente para Cursor
    const latency = this.calculateLatency(scenario.complexity) * 1.2; // Cursor 20% más lento
    await this.sleep(latency);

    const result = {
      success: true,
      data: {
        source: 'Cursor',
        operation: scenario.operation,
        result: `Cursor fallback processed ${scenario.name}`,
        latency: latency,
        tokens: this.estimateTokens(scenario.complexity) * 1.1 // Cursor usa más tokens
      }
    };

    completeCursorFallback(requestId, result);
    return result;
  }

  /**
   * Calcular latencia basada en complejidad
   */
  calculateLatency(complexity) {
    const baseLatency = {
      low: 500,
      medium: 1500,
      high: 3000
    };
    
    // Agregar variabilidad aleatoria
    const variation = Math.random() * 0.4 - 0.2; // ±20%
    return Math.round(baseLatency[complexity] * (1 + variation));
  }

  /**
   * Estimar tokens basado en complejidad
   */
  estimateTokens(complexity) {
    const baseTokens = {
      low: 100,
      medium: 300,
      high: 600
    };
    
    const variation = Math.random() * 0.3 - 0.15; // ±15%
    return Math.round(baseTokens[complexity] * (1 + variation));
  }

  /**
   * Simular sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecutar experimento completo
   */
  async runExperiment() {
    console.log('🧪 Iniciando Experimento EV-001: MCP vs Cursor Fallback');
    console.log('=======================================================');

    const totalScenarios = 20; // Total de escenarios a ejecutar
    const mcpRatio = 0.7; // 70% MCP, 30% Cursor fallback

    for (let i = 0; i < totalScenarios; i++) {
      const scenario = this.scenarios[i % this.scenarios.length];
      const useMCP = Math.random() < mcpRatio;

      if (useMCP) {
        await this.simulateMCPScenario(scenario);
      } else {
        await this.simulateCursorFallback(scenario);
      }

      // Pequeña pausa entre escenarios
      await this.sleep(100);
    }

    console.log('\n✅ Experimento completado');
    console.log(`📊 Métricas en tiempo real:`);
    const metrics = this.tracer.getMetrics();
    console.log(`   MCP Share: ${metrics.mcpShare.toFixed(1)}%`);
    console.log(`   Total Requests: ${metrics.totalRequests}`);
    console.log(`   MCP Calls: ${metrics.mcpCalls}`);
    console.log(`   Cursor Fallbacks: ${metrics.cursorFallbacks}`);

    // Finalizar sesión
    const summary = endEV001Session();
    console.log(`\n📋 Sesión finalizada: ${summary.sessionId}`);
    
    return summary;
  }

  /**
   * Ejecutar análisis inmediato
   */
  async runAnalysis() {
    console.log('\n📊 Ejecutando análisis de resultados...');
    
    try {
      const analyzer = new EV001Analyzer('logs/ev-001.jsonl');
      await analyzer.loadData();
      analyzer.calculateMetrics();
      const report = analyzer.generateReport();
      await analyzer.saveReport('EV-001-REPORT.json');
      
      return report;
    } catch (error) {
      console.error('❌ Error en análisis:', error.message);
      throw error;
    }
  }

  /**
   * Ejecutar experimento completo con análisis
   */
  async runFullExperiment() {
    try {
      // Ejecutar experimento
      const summary = await this.runExperiment();
      
      // Ejecutar análisis
      const analysis = await this.runAnalysis();
      
      // Mostrar resultado final
      console.log('\n🎯 RESULTADO FINAL EV-001');
      console.log('==========================');
      console.log(`Recomendación: ${analysis.recommendation === 'GO' ? '🟢 GO' : '🔴 NO-GO'}`);
      console.log(`MCP Share: ${analysis.mcpShare.toFixed(1)}%`);
      console.log(`Latencia P95: ${analysis.latencyStats.p95.toFixed(0)}ms`);
      console.log(`Tokens totales: ${analysis.tokenStats.total.toLocaleString()}`);
      
      return {
        summary,
        analysis,
        recommendation: analysis.recommendation
      };
      
    } catch (error) {
      console.error('❌ Error en experimento:', error.message);
      throw error;
    }
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  try {
    const runner = new EV001Runner();
    
    switch (mode) {
      case 'experiment':
        await runner.runExperiment();
        break;
      case 'analysis':
        await runner.runAnalysis();
        break;
      case 'full':
      default:
        const result = await runner.runFullExperiment();
        process.exit(result.recommendation === 'GO' ? 0 : 1);
        break;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EV001Runner;
