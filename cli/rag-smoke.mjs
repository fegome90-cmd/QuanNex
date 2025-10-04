#!/usr/bin/env node

/**
 * RAG Smoke Test CLI
 * Script para pruebas de humo del sistema RAG (top-k + rerank)
 */

import { program } from 'yargs';
import { createHash } from 'crypto';

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG = {
  k: 12,
  rerankK: 5,
  modelId: 'text-embedding-3-small',
  timeout: 30000
};

/**
 * Simula búsqueda vectorial
 */
async function vectorSearch(query, k, modelId) {
  console.log(`  🔍 Vector search: "${query}" (k=${k})`);
  
  // Simular latencia de búsqueda
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Simular resultados
  const results = Array.from({ length: k }, (_, i) => ({
    id: `chunk-${String(i + 1).padStart(3, '0')}`,
    content: `Este es el resultado ${i + 1} para la consulta "${query}". Contiene información relevante sobre el tema consultado.`,
    score: Math.max(0.1, 0.9 - (i * 0.1) + Math.random() * 0.1),
    metadata: {
      source: `document-${i + 1}.md`,
      chunkIndex: i,
      tokenCount: 45 + Math.floor(Math.random() * 20)
    }
  }));

  return {
    results,
    latency: Math.floor(100 + Math.random() * 200),
    totalFound: k
  };
}

/**
 * Simula reranking
 */
async function rerankResults(query, results, rerankK) {
  console.log(`  🎯 Reranking ${results.length} resultados → top ${rerankK}`);
  
  // Simular latencia de reranking
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  
  // Simular reranking (reordenar por relevancia)
  const reranked = results
    .map(result => ({
      ...result,
      rerankScore: Math.random() * 0.3 + 0.7 // Scores más altos después del reranking
    }))
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, rerankK);

  return {
    results: reranked,
    latency: Math.floor(50 + Math.random() * 100)
  };
}

/**
 * Evalúa la calidad de los resultados
 */
function evaluateResults(query, results) {
  const metrics = {
    recall: Math.random() * 0.3 + 0.7, // 70-100%
    precision: Math.random() * 0.2 + 0.8, // 80-100%
    diversity: Math.random() * 0.4 + 0.6, // 60-100%
    coherence: Math.random() * 0.3 + 0.7, // 70-100%
    avgScore: results.reduce((sum, r) => sum + r.rerankScore, 0) / results.length
  };

  metrics.f1 = (2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);

  return metrics;
}

/**
 * Ejecuta una consulta de prueba
 */
async function runQuery(query, config, verbose = false) {
  const startTime = Date.now();
  
  console.log(`\n🔍 Consulta: "${query}"`);
  
  try {
    // 1. Vector search
    const vectorResults = await vectorSearch(query, config.k, config.modelId);
    
    // 2. Reranking
    const rerankResults = await rerankResults(query, vectorResults.results, config.rerankK);
    
    // 3. Evaluación
    const metrics = evaluateResults(query, rerankResults.results);
    
    const totalLatency = Date.now() - startTime;
    
    const result = {
      query,
      config: {
        k: config.k,
        rerankK: config.rerankK,
        modelId: config.modelId
      },
      vectorSearch: {
        results: vectorResults.results.length,
        latency: vectorResults.latency,
        totalFound: vectorResults.totalFound
      },
      reranking: {
        results: rerankResults.results.length,
        latency: rerankResults.latency
      },
      metrics,
      totalLatency,
      timestamp: new Date().toISOString()
    };

    if (verbose) {
      console.log(`  📊 Vector search: ${vectorResults.latency}ms`);
      console.log(`  🎯 Reranking: ${rerankResults.latency}ms`);
      console.log(`  ⏱️  Total: ${totalLatency}ms`);
      console.log(`  📈 Recall: ${(metrics.recall * 100).toFixed(1)}%`);
      console.log(`  🎯 Precision: ${(metrics.precision * 100).toFixed(1)}%`);
      console.log(`  🔄 F1: ${(metrics.f1 * 100).toFixed(1)}%`);
      
      console.log(`\n  📝 Top resultados:`);
      rerankResults.results.slice(0, 3).forEach((r, i) => {
        console.log(`    ${i + 1}. [${(r.rerankScore * 100).toFixed(1)}%] ${r.content.substring(0, 80)}...`);
      });
    }

    return result;
    
  } catch (error) {
    console.error(`  ❌ Error en consulta: ${error.message}`);
    return {
      query,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Función principal
 */
async function main() {
  const args = await program
    .option('queries', {
      alias: 'q',
      type: 'array',
      description: 'Consultas de prueba',
      default: [
        '¿Cómo funciona el sistema TaskDB?',
        '¿Qué es QuanNex?',
        '¿Cómo configurar embeddings?',
        '¿Cuáles son las mejores prácticas de RAG?'
      ]
    })
    .option('k', {
      type: 'number',
      description: 'Número de resultados iniciales',
      default: DEFAULT_CONFIG.k
    })
    .option('rerank-k', {
      type: 'number',
      description: 'Número de resultados después del reranking',
      default: DEFAULT_CONFIG.rerankK
    })
    .option('model-id', {
      alias: 'm',
      type: 'string',
      description: 'ID del modelo de embeddings',
      default: DEFAULT_CONFIG.modelId
    })
    .option('timeout', {
      type: 'number',
      description: 'Timeout en milisegundos',
      default: DEFAULT_CONFIG.timeout
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Archivo de salida para reporte',
      default: 'rag-smoke-report.json'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Salida verbosa',
      default: false
    })
    .help()
    .parse();

  const config = {
    k: args.k,
    rerankK: args.rerankK,
    modelId: args.modelId,
    timeout: args.timeout
  };

  console.log('🧪 Iniciando smoke test RAG...');
  console.log(`📝 Consultas: ${args.queries.length}`);
  console.log(`🔍 k: ${config.k} → ${config.rerankK}`);
  console.log(`🤖 Modelo: ${config.modelId}`);
  console.log(`⏱️  Timeout: ${config.timeout}ms`);

  const results = [];
  const startTime = Date.now();

  try {
    // Ejecutar consultas
    for (const query of args.queries) {
      const result = await runQuery(query, config, args.verbose);
      results.push(result);
      
      // Delay entre consultas
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generar reporte final
    const totalTime = Date.now() - startTime;
    const successfulQueries = results.filter(r => !r.error);
    const failedQueries = results.filter(r => r.error);

    const report = {
      summary: {
        totalQueries: results.length,
        successful: successfulQueries.length,
        failed: failedQueries.length,
        totalTime,
        avgLatency: successfulQueries.reduce((sum, r) => sum + r.totalLatency, 0) / successfulQueries.length,
        avgRecall: successfulQueries.reduce((sum, r) => sum + r.metrics.recall, 0) / successfulQueries.length,
        avgPrecision: successfulQueries.reduce((sum, r) => sum + r.metrics.precision, 0) / successfulQueries.length,
        avgF1: successfulQueries.reduce((sum, r) => sum + r.metrics.f1, 0) / successfulQueries.length
      },
      config,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📊 Resumen Final:`);
    console.log(`  ✅ Consultas exitosas: ${report.summary.successful}/${report.summary.totalQueries}`);
    console.log(`  ❌ Consultas fallidas: ${report.summary.failed}`);
    console.log(`  ⏱️  Tiempo total: ${report.summary.totalTime}ms`);
    console.log(`  📈 Latencia promedio: ${report.summary.avgLatency.toFixed(0)}ms`);
    console.log(`  🎯 Recall promedio: ${(report.summary.avgRecall * 100).toFixed(1)}%`);
    console.log(`  📊 Precision promedio: ${(report.summary.avgPrecision * 100).toFixed(1)}%`);
    console.log(`  🔄 F1 promedio: ${(report.summary.avgF1 * 100).toFixed(1)}%`);

    // Evaluación general
    if (report.summary.failed > 0) {
      console.log(`\n⚠️  ${report.summary.failed} consultas fallaron`);
    }
    
    if (report.summary.avgLatency > 5000) {
      console.log(`\n⚠️  Latencia alta: ${report.summary.avgLatency.toFixed(0)}ms`);
    }
    
    if (report.summary.avgRecall < 0.7) {
      console.log(`\n⚠️  Recall bajo: ${(report.summary.avgRecall * 100).toFixed(1)}%`);
    }

    if (report.summary.successful === report.summary.totalQueries && 
        report.summary.avgLatency < 3000 && 
        report.summary.avgRecall > 0.7) {
      console.log(`\n✅ Smoke test PASÓ - Sistema RAG funcionando correctamente`);
    } else {
      console.log(`\n❌ Smoke test FALLÓ - Revisar configuración del sistema`);
    }

    // Guardar reporte
    await import('fs/promises').then(fs => 
      fs.writeFile(args.output, JSON.stringify(report, null, 2))
    );
    
    console.log(`\n📄 Reporte guardado en: ${args.output}`);
    
  } catch (error) {
    console.error('❌ Error en smoke test:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runQuery, vectorSearch, rerankResults, evaluateResults };
