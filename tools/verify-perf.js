#!/usr/bin/env node
/**
 * verify-perf.js
 * Verificador de performance desde trazas crudas (logs/trace/*.jsonl)
 * Fuente de verdad única - no dashboard, solo datos reales
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

class PerformanceVerifier {
  constructor() {
    this.traceDir = path.join(PROJECT_ROOT, 'logs', 'trace');
    this.events = [];
  }

  async loadRawTraces() {
    console.log('📊 Cargando trazas crudas...');
    
    if (!fs.existsSync(this.traceDir)) {
      console.log('⚠️  Directorio de trazas no existe:', this.traceDir);
      return;
    }

    const files = fs.readdirSync(this.traceDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    
    console.log(`📄 Archivos .jsonl encontrados: ${jsonlFiles.length}`);
    
    for (const file of jsonlFiles) {
      const filePath = path.join(this.traceDir, file);
      console.log(`  📋 Procesando: ${file}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const event = JSON.parse(line);
            
            // Extraer eventos de performance
            if (event.type === 'request_done' || event.type === 'operation_complete') {
              this.events.push({
                lat: event.latency_ms || event.duration || 0,
                err: !!(event.error || event.failed),
                tokens_in: event.tokens_in || 0,
                tokens_out: event.tokens_out || 0,
                timestamp: event.timestamp || new Date().toISOString(),
                operation: event.operation || 'unknown'
              });
            }
          } catch (parseError) {
            // Ignorar líneas malformadas
          }
        }
      } catch (error) {
        console.log(`  ❌ Error leyendo ${file}:`, error.message);
      }
    }
    
    console.log(`📊 Eventos cargados: ${this.events.length}`);
  }

  calculateStatistics() {
    if (this.events.length === 0) {
      return {
        total: 0,
        p50_ms: NaN,
        p95_ms: NaN,
        p99_ms: NaN,
        error_rate_pct: NaN,
        avg_latency_ms: NaN,
        throughput_per_sec: NaN,
        tokens_in_total: 0,
        tokens_out_total: 0
      };
    }

    // Ordenar por latencia
    const sortedEvents = [...this.events].sort((a, b) => a.lat - b.lat);
    
    // Calcular percentiles
    const p50 = this.calculatePercentile(sortedEvents, 0.5);
    const p95 = this.calculatePercentile(sortedEvents, 0.95);
    const p99 = this.calculatePercentile(sortedEvents, 0.99);
    
    // Calcular métricas
    const errorCount = this.events.filter(e => e.err).length;
    const errorRate = (errorCount / this.events.length) * 100;
    const avgLatency = this.events.reduce((sum, e) => sum + e.lat, 0) / this.events.length;
    
    // Calcular throughput (eventos por segundo)
    const timeSpan = this.calculateTimeSpan();
    const throughput = timeSpan > 0 ? this.events.length / timeSpan : 0;
    
    // Calcular tokens
    const tokensIn = this.events.reduce((sum, e) => sum + e.tokens_in, 0);
    const tokensOut = this.events.reduce((sum, e) => sum + e.tokens_out, 0);

    return {
      total: this.events.length,
      p50_ms: Math.round(p50 * 100) / 100,
      p95_ms: Math.round(p95 * 100) / 100,
      p99_ms: Math.round(p99 * 100) / 100,
      error_rate_pct: Math.round(errorRate * 100) / 100,
      avg_latency_ms: Math.round(avgLatency * 100) / 100,
      throughput_per_sec: Math.round(throughput * 100) / 100,
      tokens_in_total: tokensIn,
      tokens_out_total: tokensOut,
      time_span_sec: Math.round(timeSpan * 100) / 100
    };
  }

  calculatePercentile(sortedEvents, percentile) {
    if (sortedEvents.length === 0) return NaN;
    
    const index = Math.floor(sortedEvents.length * percentile);
    return sortedEvents[index]?.lat || 0;
  }

  calculateTimeSpan() {
    if (this.events.length === 0) return 0;
    
    const timestamps = this.events.map(e => new Date(e.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    return (maxTime - minTime) / 1000; // Convertir a segundos
  }

  generateBreakdown() {
    const breakdown = {};
    
    // Agrupar por operación
    for (const event of this.events) {
      const op = event.operation;
      if (!breakdown[op]) {
        breakdown[op] = {
          count: 0,
          latencies: [],
          errors: 0,
          tokens_in: 0,
          tokens_out: 0
        };
      }
      
      breakdown[op].count++;
      breakdown[op].latencies.push(event.lat);
      if (event.err) breakdown[op].errors++;
      breakdown[op].tokens_in += event.tokens_in;
      breakdown[op].tokens_out += event.tokens_out;
    }
    
    // Calcular estadísticas por operación
    for (const [op, data] of Object.entries(breakdown)) {
      const sorted = data.latencies.sort((a, b) => a - b);
      const p95 = this.calculatePercentile(sorted, 0.95);
      const avg = data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length;
      const errorRate = (data.errors / data.count) * 100;
      
      breakdown[op] = {
        count: data.count,
        p95_ms: Math.round(p95 * 100) / 100,
        avg_ms: Math.round(avg * 100) / 100,
        error_rate_pct: Math.round(errorRate * 100) / 100,
        tokens_in: data.tokens_in,
        tokens_out: data.tokens_out
      };
    }
    
    return breakdown;
  }

  async verify() {
    await this.loadRawTraces();
    
    const stats = this.calculateStatistics();
    const breakdown = this.generateBreakdown();
    
    const result = {
      timestamp: new Date().toISOString(),
      source: 'raw_traces',
      statistics: stats,
      breakdown: breakdown,
      raw_events_count: this.events.length
    };
    
    return result;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new PerformanceVerifier();
  
  verifier.verify().then(result => {
    console.log('📊 PERFORMANCE VERIFICATION');
    console.log('============================');
    console.log('');
    console.log('📈 Estadísticas generales:');
    console.log(`  Total eventos: ${result.statistics.total}`);
    console.log(`  P50: ${result.statistics.p50_ms}ms`);
    console.log(`  P95: ${result.statistics.p95_ms}ms`);
    console.log(`  P99: ${result.statistics.p99_ms}ms`);
    console.log(`  Error rate: ${result.statistics.error_rate_pct}%`);
    console.log(`  Throughput: ${result.statistics.throughput_per_sec} ops/s`);
    console.log(`  Tokens in: ${result.statistics.tokens_in_total}`);
    console.log(`  Tokens out: ${result.statistics.tokens_out_total}`);
    console.log('');
    
    if (Object.keys(result.breakdown).length > 0) {
      console.log('📊 Breakdown por operación:');
      for (const [op, data] of Object.entries(result.breakdown)) {
        console.log(`  ${op}: ${data.count} ops, P95=${data.p95_ms}ms, Error=${data.error_rate_pct}%`);
      }
    }
    
    console.log('');
    console.log('🔍 Resultado JSON:');
    console.log(JSON.stringify(result, null, 2));
  }).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export default PerformanceVerifier;
