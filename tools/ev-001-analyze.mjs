#!/usr/bin/env node
/**
 * EV-001 Analyzer: Análisis de datos del experimento MCP vs Cursor Fallback
 * Genera reportes detallados con métricas y recomendaciones
 */
import fs from 'node:fs';
import path from 'node:path';

class EV001Analyzer {
  constructor(logFile) {
    this.logFile = logFile;
    this.data = [];
    this.sessions = new Map();
    this.analysis = {
      totalRequests: 0,
      mcpCalls: 0,
      cursorFallbacks: 0,
      mcpShare: 0,
      latencyStats: { avg: 0, p95: 0, p99: 0 },
      tokenStats: { input: 0, output: 0, total: 0 },
      agentDistribution: {},
      timeDistribution: {},
      errorRate: 0,
      recommendation: 'NO-GO'
    };
  }

  /**
   * Cargar y procesar datos del log
   */
  async loadData() {
    console.log(`📊 Cargando datos de: ${this.logFile}`);
    
    if (!fs.existsSync(this.logFile)) {
      throw new Error(`Archivo de log no encontrado: ${this.logFile}`);
    }

    const content = fs.readFileSync(this.logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        this.data.push(entry);
        this.processEntry(entry);
      } catch (e) {
        console.warn(`⚠️ Error parseando línea: ${line.substring(0, 100)}...`);
      }
    }

    console.log(`✅ Cargados ${this.data.length} registros`);
  }

  /**
   * Procesar entrada individual
   */
  processEntry(entry) {
    // Agrupar por sesión
    if (entry.sessionId) {
      if (!this.sessions.has(entry.sessionId)) {
        this.sessions.set(entry.sessionId, {
          startTime: null,
          endTime: null,
          requests: [],
          mcpCalls: 0,
          cursorFallbacks: 0
        });
      }
      
      const session = this.sessions.get(entry.sessionId);
      
      if (entry.type === 'session_start') {
        session.startTime = new Date(entry.ts);
      } else if (entry.type === 'session_end') {
        session.endTime = new Date(entry.ts);
      } else if (entry.type === 'mcp_call') {
        session.mcpCalls++;
        this.analysis.mcpCalls++;
      } else if (entry.type === 'cursor_fallback') {
        session.cursorFallbacks++;
        this.analysis.cursorFallbacks++;
      }
    }

    // Procesar métricas generales
    this.processMetrics(entry);
  }

  /**
   * Procesar métricas de entrada
   */
  processMetrics(entry) {
    // Contar requests totales
    if (entry.type === 'mcp_call' || entry.type === 'cursor_fallback') {
      this.analysis.totalRequests++;
    }

    // Distribución de agentes
    if (entry.agent && entry.type === 'mcp_call') {
      if (!this.analysis.agentDistribution[entry.agent]) {
        this.analysis.agentDistribution[entry.agent] = 0;
      }
      this.analysis.agentDistribution[entry.agent]++;
    }

    // Estadísticas de latencia
    if (entry.latency && typeof entry.latency === 'number') {
      if (!this.analysis.latencyStats.values) {
        this.analysis.latencyStats.values = [];
      }
      this.analysis.latencyStats.values.push(entry.latency);
    }

    // Estadísticas de tokens
    if (entry.tokens) {
      if (entry.tokens.input) {
        this.analysis.tokenStats.input += entry.tokens.input;
      }
      if (entry.tokens.output) {
        this.analysis.tokenStats.output += entry.tokens.output;
      }
    }

    // Distribución temporal
    if (entry.ts) {
      const hour = new Date(entry.ts).getHours();
      if (!this.analysis.timeDistribution[hour]) {
        this.analysis.timeDistribution[hour] = 0;
      }
      this.analysis.timeDistribution[hour]++;
    }

    // Tasa de errores
    if (entry.status === 'error') {
      this.analysis.errorRate++;
    }
  }

  /**
   * Calcular métricas finales
   */
  calculateMetrics() {
    console.log('🧮 Calculando métricas finales...');

    // Porcentaje de uso MCP
    this.analysis.mcpShare = this.analysis.totalRequests > 0 ? 
      (this.analysis.mcpCalls / this.analysis.totalRequests) * 100 : 0;

    // Estadísticas de latencia
    if (this.analysis.latencyStats.values && this.analysis.latencyStats.values.length > 0) {
      const latencies = this.analysis.latencyStats.values.sort((a, b) => a - b);
      this.analysis.latencyStats.avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      this.analysis.latencyStats.p95 = latencies[Math.floor(latencies.length * 0.95)];
      this.analysis.latencyStats.p99 = latencies[Math.floor(latencies.length * 0.99)];
      this.analysis.latencyStats.min = latencies[0];
      this.analysis.latencyStats.max = latencies[latencies.length - 1];
    }

    // Tokens totales
    this.analysis.tokenStats.total = this.analysis.tokenStats.input + this.analysis.tokenStats.output;

    // Tasa de errores
    this.analysis.errorRate = this.analysis.totalRequests > 0 ? 
      (this.analysis.errorRate / this.analysis.totalRequests) * 100 : 0;

    // Recomendación GO/NO-GO
    this.analysis.recommendation = this.determineRecommendation();
  }

  /**
   * Determinar recomendación GO/NO-GO
   */
  determineRecommendation() {
    const criteria = {
      mcpShare: this.analysis.mcpShare >= 70,
      lowErrorRate: this.analysis.errorRate <= 5,
      reasonableLatency: this.analysis.latencyStats.p95 <= 5000, // 5 segundos
      sufficientVolume: this.analysis.totalRequests >= 10
    };

    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;

    console.log('📋 Criterios de evaluación:');
    console.log(`  MCP Share ≥70%: ${criteria.mcpShare ? '✅' : '❌'} (${this.analysis.mcpShare.toFixed(1)}%)`);
    console.log(`  Error Rate ≤5%: ${criteria.lowErrorRate ? '✅' : '❌'} (${this.analysis.errorRate.toFixed(1)}%)`);
    console.log(`  Latencia P95 ≤5s: ${criteria.reasonableLatency ? '✅' : '❌'} (${this.analysis.latencyStats.p95}ms)`);
    console.log(`  Volumen ≥10 req: ${criteria.sufficientVolume ? '✅' : '❌'} (${this.analysis.totalRequests})`);

    return passedCriteria >= 3 ? 'GO' : 'NO-GO';
  }

  /**
   * Generar reporte detallado
   */
  generateReport() {
    console.log('\n📊 REPORTE EV-001: MCP Real vs Cursor Fallback');
    console.log('================================================');

    // Resumen ejecutivo
    console.log('\n🎯 RESUMEN EJECUTIVO');
    console.log(`   Recomendación: ${this.analysis.recommendation === 'GO' ? '🟢 GO' : '🔴 NO-GO'}`);
    console.log(`   Uso MCP: ${this.analysis.mcpShare.toFixed(1)}%`);
    console.log(`   Requests totales: ${this.analysis.totalRequests}`);
    console.log(`   Sesiones analizadas: ${this.sessions.size}`);

    // Métricas principales
    console.log('\n📈 MÉTRICAS PRINCIPALES');
    console.log(`   Llamadas MCP: ${this.analysis.mcpCalls}`);
    console.log(`   Fallbacks Cursor: ${this.analysis.cursorFallbacks}`);
    console.log(`   Tasa de errores: ${this.analysis.errorRate.toFixed(1)}%`);
    console.log(`   Tokens totales: ${this.analysis.tokenStats.total.toLocaleString()}`);

    // Estadísticas de latencia
    console.log('\n⏱️ LATENCIA');
    console.log(`   Promedio: ${this.analysis.latencyStats.avg.toFixed(0)}ms`);
    console.log(`   P95: ${this.analysis.latencyStats.p95.toFixed(0)}ms`);
    console.log(`   P99: ${this.analysis.latencyStats.p99.toFixed(0)}ms`);
    console.log(`   Min: ${this.analysis.latencyStats.min || 0}ms`);
    console.log(`   Max: ${this.analysis.latencyStats.max || 0}ms`);

    // Distribución de agentes
    console.log('\n🤖 DISTRIBUCIÓN DE AGENTES');
    const sortedAgents = Object.entries(this.analysis.agentDistribution)
      .sort(([,a], [,b]) => b - a);
    
    for (const [agent, count] of sortedAgents) {
      const percentage = (count / this.analysis.mcpCalls) * 100;
      console.log(`   ${agent}: ${count} (${percentage.toFixed(1)}%)`);
    }

    // Distribución temporal
    console.log('\n🕐 DISTRIBUCIÓN TEMPORAL');
    const sortedHours = Object.entries(this.analysis.timeDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));
    
    for (const [hour, count] of sortedHours.slice(0, 5)) {
      console.log(`   ${hour}:00 - ${count} requests`);
    }

    // Análisis de sesiones
    console.log('\n📋 ANÁLISIS DE SESIONES');
    for (const [sessionId, session] of this.sessions) {
      const duration = session.endTime && session.startTime ? 
        Math.round((session.endTime - session.startTime) / 1000) : 'N/A';
      const mcpShare = (session.mcpCalls + session.cursorFallbacks) > 0 ?
        (session.mcpCalls / (session.mcpCalls + session.cursorFallbacks)) * 100 : 0;
      
      console.log(`   ${sessionId}: ${session.mcpCalls} MCP, ${session.cursorFallbacks} Cursor (${mcpShare.toFixed(1)}% MCP, ${duration}s)`);
    }

    return this.analysis;
  }

  /**
   * Generar reporte en formato JSON
   */
  generateJSONReport() {
    return {
      experiment: 'EV-001',
      timestamp: new Date().toISOString(),
      summary: {
        recommendation: this.analysis.recommendation,
        mcpShare: this.analysis.mcpShare,
        totalRequests: this.analysis.totalRequests,
        sessions: this.sessions.size
      },
      metrics: this.analysis,
      sessions: Object.fromEntries(this.sessions)
    };
  }

  /**
   * Guardar reporte en archivo
   */
  async saveReport(outputFile = 'EV-001-REPORT.json') {
    const report = this.generateJSONReport();
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Reporte guardado en: ${outputFile}`);
    return report;
  }
}

/**
 * Función principal de análisis
 */
async function main() {
  const args = process.argv.slice(2);
  const logFile = args[0] || 'logs/ev-001.jsonl';
  const outputFile = args[1] || 'EV-001-REPORT.json';

  try {
    console.log('🧪 EV-001 Analyzer iniciando...');
    
    const analyzer = new EV001Analyzer(logFile);
    await analyzer.loadData();
    analyzer.calculateMetrics();
    analyzer.generateReport();
    await analyzer.saveReport(outputFile);

    console.log('\n✅ Análisis completado exitosamente');
    
    // Código de salida basado en recomendación
    const exitCode = analyzer.analysis.recommendation === 'GO' ? 0 : 1;
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Error en análisis:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EV001Analyzer;
