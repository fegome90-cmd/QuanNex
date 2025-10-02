#!/usr/bin/env node
/**
 * @fileoverview Colector de KPIs para MCP
 * @description Recolecta métricas de latencia, requests y estado de salud
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import StructuredLogger from './structured-logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class MCPKPIsCollector {
  constructor() {
    this.logger = new StructuredLogger('kpis-collector');
    this.metrics = {
      agents: {},
      system: {
        totalRequests: 0,
        totalErrors: 0,
        averageLatency: 0,
        uptime: Date.now(),
        lastUpdate: null
      }
    };
    
    this.initializeAgentMetrics();
  }

  /**
   * Inicializar métricas de agentes
   */
  initializeAgentMetrics() {
    const agents = ['context', 'prompting', 'rules', 'orchestration'];
    
    agents.forEach(agent => {
      this.metrics.agents[agent] = {
        requests: 0,
        errors: 0,
        latency: [],
        averageLatency: 0,
        lastRequest: null,
        status: 'unknown',
        healthScore: 0
      };
    });
  }

  /**
   * Registrar request de agente
   */
  recordAgentRequest(agentName, latency, success = true) {
    if (!this.metrics.agents[agentName]) {
      this.initializeAgentMetrics();
    }

    const agent = this.metrics.agents[agentName];
    agent.requests++;
    agent.latency.push(latency);
    agent.lastRequest = new Date().toISOString();
    
    if (success) {
      agent.status = 'healthy';
    } else {
      agent.errors++;
      agent.status = 'unhealthy';
    }
    
    // Calcular latencia promedio
    agent.averageLatency = agent.latency.reduce((a, b) => a + b, 0) / agent.latency.length;
    
    // Calcular health score (0-100)
    const errorRate = agent.requests > 0 ? (agent.errors / agent.requests) * 100 : 0;
    const latencyScore = Math.max(0, 100 - (agent.averageLatency / 1000) * 10); // Penalizar latencias > 1s
    agent.healthScore = Math.max(0, 100 - errorRate - (100 - latencyScore));
    
    // Actualizar métricas del sistema
    this.updateSystemMetrics();
    
    this.logger.log('info', `Agent request recorded`, {
      agent: agentName,
      latency,
      success,
      healthScore: agent.healthScore
    });
  }

  /**
   * Actualizar métricas del sistema
   */
  updateSystemMetrics() {
    const agents = Object.values(this.metrics.agents);
    
    this.metrics.system.totalRequests = agents.reduce((sum, agent) => sum + agent.requests, 0);
    this.metrics.system.totalErrors = agents.reduce((sum, agent) => sum + agent.errors, 0);
    
    const allLatencies = agents.flatMap(agent => agent.latency);
    this.metrics.system.averageLatency = allLatencies.length > 0 
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length 
      : 0;
    
    this.metrics.system.lastUpdate = new Date().toISOString();
  }

  /**
   * Obtener KPIs de un agente específico
   */
  getAgentKPIs(agentName) {
    const agent = this.metrics.agents[agentName];
    if (!agent) return null;

    return {
      agent: agentName,
      requests: agent.requests,
      errors: agent.errors,
      errorRate: agent.requests > 0 ? (agent.errors / agent.requests) * 100 : 0,
      averageLatency: Math.round(agent.averageLatency),
      minLatency: agent.latency.length > 0 ? Math.min(...agent.latency) : 0,
      maxLatency: agent.latency.length > 0 ? Math.max(...agent.latency) : 0,
      status: agent.status,
      healthScore: Math.round(agent.healthScore),
      lastRequest: agent.lastRequest,
      uptime: agent.lastRequest ? Date.now() - new Date(agent.lastRequest).getTime() : 0
    };
  }

  /**
   * Obtener KPIs del sistema completo
   */
  getSystemKPIs() {
    const agents = Object.values(this.metrics.agents);
    const healthyAgents = agents.filter(agent => agent.status === 'healthy').length;
    const totalAgents = agents.length;
    
    return {
      system: {
        ...this.metrics.system,
        uptime: Date.now() - this.metrics.system.uptime,
        healthyAgents,
        totalAgents,
        healthPercentage: (healthyAgents / totalAgents) * 100
      },
      agents: Object.keys(this.metrics.agents).map(agent => this.getAgentKPIs(agent))
    };
  }

  /**
   * Generar reporte de KPIs
   */
  generateKPIsReport() {
    const kpis = this.getSystemKPIs();
    
    console.log('\n📊 REPORTE DE KPIs MCP');
    console.log('======================');
    
    // KPIs del sistema
    console.log('\n🎯 SISTEMA:');
    console.log(`  📈 Total de requests: ${kpis.system.totalRequests}`);
    console.log(`  ❌ Total de errores: ${kpis.system.totalErrors}`);
    console.log(`  ⏱️ Latencia promedio: ${Math.round(kpis.system.averageLatency)}ms`);
    console.log(`  ✅ Agentes saludables: ${kpis.system.healthyAgents}/${kpis.system.totalAgents} (${kpis.system.healthPercentage.toFixed(1)}%)`);
    console.log(`  ⏰ Uptime: ${Math.round(kpis.system.uptime / 1000)}s`);
    
    // KPIs por agente
    console.log('\n🤖 AGENTES:');
    kpis.agents.forEach(agent => {
      const status = agent.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${status} @${agent.agent}:`);
      console.log(`    Requests: ${agent.requests}`);
      console.log(`    Errores: ${agent.errors} (${agent.errorRate.toFixed(1)}%)`);
      console.log(`    Latencia: ${agent.averageLatency}ms (min: ${agent.minLatency}ms, max: ${agent.maxLatency}ms)`);
      console.log(`    Health Score: ${agent.healthScore}/100`);
      console.log(`    Último request: ${agent.lastRequest || 'Nunca'}`);
    });
    
    // Análisis de rendimiento
    this.analyzePerformance(kpis);
    
    return kpis;
  }

  /**
   * Analizar rendimiento del sistema
   */
  analyzePerformance(kpis) {
    console.log('\n🔍 ANÁLISIS DE RENDIMIENTO:');
    
    // Análisis de latencia
    const avgLatency = kpis.system.averageLatency;
    if (avgLatency < 100) {
      console.log('  ⚡ Latencia excelente (< 100ms)');
    } else if (avgLatency < 500) {
      console.log('  ✅ Latencia buena (< 500ms)');
    } else if (avgLatency < 1000) {
      console.log('  ⚠️ Latencia aceptable (< 1s)');
    } else {
      console.log('  🚨 Latencia alta (> 1s) - necesita optimización');
    }
    
    // Análisis de errores
    const errorRate = kpis.system.totalRequests > 0 ? (kpis.system.totalErrors / kpis.system.totalRequests) * 100 : 0;
    if (errorRate < 1) {
      console.log('  🎯 Tasa de errores excelente (< 1%)');
    } else if (errorRate < 5) {
      console.log('  ✅ Tasa de errores buena (< 5%)');
    } else if (errorRate < 10) {
      console.log('  ⚠️ Tasa de errores aceptable (< 10%)');
    } else {
      console.log('  🚨 Tasa de errores alta (> 10%) - necesita atención');
    }
    
    // Análisis de salud general
    const healthPercentage = kpis.system.healthPercentage;
    if (healthPercentage >= 90) {
      console.log('  🏆 Sistema muy saludable (≥ 90%)');
    } else if (healthPercentage >= 75) {
      console.log('  ✅ Sistema saludable (≥ 75%)');
    } else if (healthPercentage >= 50) {
      console.log('  ⚠️ Sistema con problemas (≥ 50%)');
    } else {
      console.log('  🚨 Sistema crítico (< 50%) - necesita intervención');
    }
    
    // Recomendaciones
    this.generateRecommendations(kpis);
  }

  /**
   * Generar recomendaciones basadas en KPIs
   */
  generateRecommendations(kpis) {
    console.log('\n💡 RECOMENDACIONES:');
    
    const recommendations = [];
    
    // Recomendaciones de latencia
    if (kpis.system.averageLatency > 1000) {
      recommendations.push('Optimizar agentes con latencia alta');
    }
    
    // Recomendaciones de errores
    if (kpis.system.totalErrors > 0) {
      recommendations.push('Investigar y corregir errores en agentes');
    }
    
    // Recomendaciones de salud
    if (kpis.system.healthPercentage < 75) {
      recommendations.push('Revisar configuración de agentes no saludables');
    }
    
    // Recomendaciones de monitoreo
    recommendations.push('Implementar alertas automáticas para KPIs críticos');
    recommendations.push('Configurar dashboard de monitoreo en tiempo real');
    recommendations.push('Establecer SLAs basados en métricas históricas');
    
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  /**
   * Guardar reporte de KPIs
   */
  async saveKPIsReport() {
    const kpis = this.getSystemKPIs();
    const reportPath = join(PROJECT_ROOT, 'out', `mcp-kpis-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      kpis,
      analysis: {
        performance: this.analyzePerformance(kpis),
        recommendations: this.generateRecommendations(kpis)
      }
    };
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Reporte de KPIs guardado: ${reportPath}`);
    return reportPath;
  }

  /**
   * Cargar métricas desde archivo
   */
  loadMetrics(filePath) {
    if (existsSync(filePath)) {
      try {
        const data = readFileSync(filePath, 'utf8');
        this.metrics = JSON.parse(data);
        this.logger.log('info', 'Métricas cargadas desde archivo', { filePath });
      } catch (error) {
        this.logger.logError(error, { filePath });
      }
    }
  }

  /**
   * Guardar métricas a archivo
   */
  saveMetrics(filePath) {
    writeFileSync(filePath, JSON.stringify(this.metrics, null, 2));
    this.logger.log('info', 'Métricas guardadas en archivo', { filePath });
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new MCPKPIsCollector();
  
  // Simular algunos datos para demostración
  collector.recordAgentRequest('context', 150, true);
  collector.recordAgentRequest('prompting', 200, true);
  collector.recordAgentRequest('rules', 100, true);
  collector.recordAgentRequest('orchestration', 300, true);
  collector.recordAgentRequest('context', 500, false);
  
  // Generar reporte
  collector.generateKPIsReport();
  collector.saveKPIsReport();
}

export default MCPKPIsCollector;
