#!/usr/bin/env node
/**
 * test-scenario.js
 * Escenario de prueba para comparar MCP vs Sin MCP
 * Tarea: Procesar 100 documentos con análisis de contexto y generación de prompts
 */
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';

class MCPComparisonTest {
  constructor() {
    this.results = {
      withMCP: null,
      withoutMCP: null
    };
    this.testDocuments = this.generateTestDocuments(100);
  }

  generateTestDocuments(count) {
    const documents = [];
    for (let i = 1; i <= count; i++) {
      documents.push({
        id: `doc_${i}`,
        title: `Documento de Prueba ${i}`,
        content: `Este es el contenido del documento ${i}. Contiene información técnica sobre optimización de sistemas y análisis de performance.`,
        category: ['technical', 'analysis', 'optimization'][i % 3],
        priority: ['high', 'medium', 'low'][i % 3]
      });
    }
    return documents;
  }

  async runComparison() {
    console.log('🧪 EXPERIMENTO: MCP vs Sin MCP');
    console.log('===============================');
    console.log(`📊 Procesando ${this.testDocuments.length} documentos`);
    console.log('');

    // Test 1: Con MCP
    console.log('🚀 Ejecutando test CON MCP...');
    this.results.withMCP = await this.runWithMCP();
    
    console.log('');
    
    // Test 2: Sin MCP
    console.log('🔧 Ejecutando test SIN MCP...');
    this.results.withoutMCP = await this.runWithoutMCP();
    
    console.log('');
    
    // Comparar resultados
    this.compareResults();
  }

  async runWithMCP() {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let successCount = 0;
    let errorCount = 0;
    const latencies = [];
    const errors = [];

    console.log('  📋 Procesando documentos con MCP...');
    
    for (let i = 0; i < this.testDocuments.length; i++) {
      const doc = this.testDocuments[i];
      const docStart = performance.now();
      
      try {
        // Simular procesamiento con MCP
        const result = await this.processDocumentWithMCP(doc);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(result.error);
        }
        
        const docLatency = performance.now() - docStart;
        latencies.push(docLatency);
        
        // Mostrar progreso cada 10 documentos
        if ((i + 1) % 10 === 0) {
          console.log(`    📊 Procesados: ${i + 1}/${this.testDocuments.length}`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push(error.message);
        const docLatency = performance.now() - docStart;
        latencies.push(docLatency);
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const totalTime = endTime - startTime;
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
    
    // Calcular métricas
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const p99Latency = this.calculatePercentile(latencies, 99);
    const errorRate = (errorCount / this.testDocuments.length) * 100;
    const throughput = this.testDocuments.length / (totalTime / 1000);

    console.log(`  ✅ Completado en ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  📊 Éxito: ${successCount}/${this.testDocuments.length} (${((successCount/this.testDocuments.length)*100).toFixed(1)}%)`);
    console.log(`  ⚡ Throughput: ${throughput.toFixed(2)} docs/s`);

    return {
      totalTime,
      memoryUsed,
      successCount,
      errorCount,
      errorRate,
      avgLatency,
      p95Latency,
      p99Latency,
      throughput,
      errors: errors.slice(0, 5) // Solo primeros 5 errores
    };
  }

  async runWithoutMCP() {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let successCount = 0;
    let errorCount = 0;
    const latencies = [];
    const errors = [];

    console.log('  📋 Procesando documentos sin MCP...');
    
    for (let i = 0; i < this.testDocuments.length; i++) {
      const doc = this.testDocuments[i];
      const docStart = performance.now();
      
      try {
        // Simular procesamiento sin MCP (más lento y menos eficiente)
        const result = await this.processDocumentWithoutMCP(doc);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(result.error);
        }
        
        const docLatency = performance.now() - docStart;
        latencies.push(docLatency);
        
        // Mostrar progreso cada 10 documentos
        if ((i + 1) % 10 === 0) {
          console.log(`    📊 Procesados: ${i + 1}/${this.testDocuments.length}`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push(error.message);
        const docLatency = performance.now() - docStart;
        latencies.push(docLatency);
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const totalTime = endTime - startTime;
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
    
    // Calcular métricas
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = this.calculatePercentile(latencies, 95);
    const p99Latency = this.calculatePercentile(latencies, 99);
    const errorRate = (errorCount / this.testDocuments.length) * 100;
    const throughput = this.testDocuments.length / (totalTime / 1000);

    console.log(`  ✅ Completado en ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  📊 Éxito: ${successCount}/${this.testDocuments.length} (${((successCount/this.testDocuments.length)*100).toFixed(1)}%)`);
    console.log(`  ⚡ Throughput: ${throughput.toFixed(2)} docs/s`);

    return {
      totalTime,
      memoryUsed,
      successCount,
      errorCount,
      errorRate,
      avgLatency,
      p95Latency,
      p99Latency,
      throughput,
      errors: errors.slice(0, 5) // Solo primeros 5 errores
    };
  }

  async processDocumentWithMCP(doc) {
    // Simular procesamiento con MCP (más eficiente)
    const startTime = performance.now();
    
    try {
      // Simular llamada a MCP para análisis de contexto
      const contextResult = await this.simulateMCPContextAnalysis(doc);
      
      // Simular llamada a MCP para generación de prompt
      const promptResult = await this.simulateMCPPromptGeneration(doc, contextResult);
      
      // Simular procesamiento final
      await this.simulateProcessing(promptResult);
      
      const latency = performance.now() - startTime;
      
      return {
        success: true,
        latency,
        contextScore: contextResult.score,
        promptQuality: promptResult.quality
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processDocumentWithoutMCP(doc) {
    // Simular procesamiento sin MCP (menos eficiente)
    const startTime = performance.now();
    
    try {
      // Simular análisis manual (más lento)
      const contextResult = await this.simulateManualContextAnalysis(doc);
      
      // Simular generación manual de prompt (más lento)
      const promptResult = await this.simulateManualPromptGeneration(doc, contextResult);
      
      // Simular procesamiento final (más lento)
      await this.simulateProcessing(promptResult);
      
      const latency = performance.now() - startTime;
      
      return {
        success: true,
        latency,
        contextScore: contextResult.score,
        promptQuality: promptResult.quality
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async simulateMCPContextAnalysis(doc) {
    // Simular análisis con MCP (más rápido y preciso)
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20)); // 10-30ms
    
    return {
      score: 0.85 + Math.random() * 0.1, // 85-95% precisión
      keywords: ['optimization', 'performance', 'analysis'],
      category: doc.category,
      confidence: 0.9 + Math.random() * 0.1
    };
  }

  async simulateManualContextAnalysis(doc) {
    // Simular análisis manual (más lento y menos preciso)
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); // 50-150ms
    
    return {
      score: 0.70 + Math.random() * 0.15, // 70-85% precisión
      keywords: ['document', 'content', 'text'],
      category: doc.category,
      confidence: 0.7 + Math.random() * 0.2
    };
  }

  async simulateMCPPromptGeneration(doc, context) {
    // Simular generación con MCP (más rápida y de mejor calidad)
    await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25)); // 15-40ms
    
    return {
      quality: 0.88 + Math.random() * 0.08, // 88-96% calidad
      length: 150 + Math.random() * 100,
      relevance: 0.9 + Math.random() * 0.08,
      prompt: `Analiza el documento "${doc.title}" con contexto ${context.category}`
    };
  }

  async simulateManualPromptGeneration(doc, _context) {
    // Simular generación manual (más lenta y de menor calidad)
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120)); // 80-200ms
    
    return {
      quality: 0.75 + Math.random() * 0.15, // 75-90% calidad
      length: 100 + Math.random() * 80,
      relevance: 0.8 + Math.random() * 0.15,
      prompt: `Procesa el documento ${doc.id}`
    };
  }

  async simulateProcessing(_result) {
    // Simular procesamiento final
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)); // 5-20ms
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  compareResults() {
    console.log('📊 COMPARACIÓN DE RESULTADOS');
    console.log('============================');
    console.log('');

    const withMCP = this.results.withMCP;
    const withoutMCP = this.results.withoutMCP;

    console.log('⏱️  TIEMPO TOTAL:');
    console.log(`  Con MCP:    ${(withMCP.totalTime / 1000).toFixed(2)}s`);
    console.log(`  Sin MCP:    ${(withoutMCP.totalTime / 1000).toFixed(2)}s`);
    console.log(`  Mejora:     ${((withoutMCP.totalTime - withMCP.totalTime) / withoutMCP.totalTime * 100).toFixed(1)}% más rápido`);
    console.log('');

    console.log('📊 ÉXITO:');
    console.log(`  Con MCP:    ${withMCP.successCount}/${this.testDocuments.length} (${(withMCP.successCount/this.testDocuments.length*100).toFixed(1)}%)`);
    console.log(`  Sin MCP:    ${withoutMCP.successCount}/${this.testDocuments.length} (${(withoutMCP.successCount/this.testDocuments.length*100).toFixed(1)}%)`);
    console.log(`  Mejora:     +${(withMCP.successCount - withoutMCP.successCount)} documentos exitosos`);
    console.log('');

    console.log('⚡ LATENCIA PROMEDIO:');
    console.log(`  Con MCP:    ${withMCP.avgLatency.toFixed(2)}ms`);
    console.log(`  Sin MCP:    ${withoutMCP.avgLatency.toFixed(2)}ms`);
    console.log(`  Mejora:     ${((withoutMCP.avgLatency - withMCP.avgLatency) / withoutMCP.avgLatency * 100).toFixed(1)}% más rápido`);
    console.log('');

    console.log('📈 P95 LATENCIA:');
    console.log(`  Con MCP:    ${withMCP.p95Latency.toFixed(2)}ms`);
    console.log(`  Sin MCP:    ${withoutMCP.p95Latency.toFixed(2)}ms`);
    console.log(`  Mejora:     ${((withoutMCP.p95Latency - withMCP.p95Latency) / withoutMCP.p95Latency * 100).toFixed(1)}% más rápido`);
    console.log('');

    console.log('🚀 THROUGHPUT:');
    console.log(`  Con MCP:    ${withMCP.throughput.toFixed(2)} docs/s`);
    console.log(`  Sin MCP:    ${withoutMCP.throughput.toFixed(2)} docs/s`);
    console.log(`  Mejora:     ${((withMCP.throughput - withoutMCP.throughput) / withoutMCP.throughput * 100).toFixed(1)}% más throughput`);
    console.log('');

    console.log('❌ TASA DE ERROR:');
    console.log(`  Con MCP:    ${withMCP.errorRate.toFixed(2)}%`);
    console.log(`  Sin MCP:    ${withoutMCP.errorRate.toFixed(2)}%`);
    console.log(`  Mejora:     ${((withoutMCP.errorRate - withMCP.errorRate) / withoutMCP.errorRate * 100).toFixed(1)}% menos errores`);
    console.log('');

    console.log('💾 MEMORIA USADA:');
    console.log(`  Con MCP:    ${(withMCP.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Sin MCP:    ${(withoutMCP.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Diferencia: ${((withMCP.memoryUsed - withoutMCP.memoryUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    // Guardar resultados detallados
    this.saveDetailedResults();
  }

  saveDetailedResults() {
    const results = {
      timestamp: new Date().toISOString(),
      testDocuments: this.testDocuments.length,
      withMCP: this.results.withMCP,
      withoutMCP: this.results.withoutMCP,
      improvements: {
        timeReduction: ((this.results.withoutMCP.totalTime - this.results.withMCP.totalTime) / this.results.withoutMCP.totalTime * 100),
        latencyReduction: ((this.results.withoutMCP.avgLatency - this.results.withMCP.avgLatency) / this.results.withoutMCP.avgLatency * 100),
        throughputIncrease: ((this.results.withMCP.throughput - this.results.withoutMCP.throughput) / this.results.withoutMCP.throughput * 100),
        errorReduction: ((this.results.withoutMCP.errorRate - this.results.withMCP.errorRate) / this.results.withoutMCP.errorRate * 100),
        successIncrease: this.results.withMCP.successCount - this.results.withoutMCP.successCount
      }
    };

    const resultsFile = path.join(process.cwd(), 'experiments', 'mcp-comparison', 'results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    console.log(`💾 Resultados detallados guardados en: ${resultsFile}`);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new MCPComparisonTest();
  test.runComparison().catch(console.error);
}

export default MCPComparisonTest;
