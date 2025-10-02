#!/usr/bin/env node
/**
 * Replay Test - Simulador de Handoffs de Contexto
 * Simula el proceso de guardar contexto en turno N y rehidratarlo en turno N+1
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const GOLDEN_THREADS_DIR = path.join(__dirname, 'golden', 'threads');
const REPORTS_DIR = path.join(__dirname, 'reports');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Simulador de Context Agent
class MockContextAgent {
  constructor() {
    this.contextCache = new Map();
  }

  // Simular procesamiento de contexto
  async processContext(threadData, turnIndex) {
    const turn = threadData.turns[turnIndex];
    const previousContext = this.contextCache.get(threadData.id) || {};

    // Simular extracción de contexto
    const context = {
      thread_id: threadData.id,
      current_turn: turnIndex + 1,
      last_message: turn.content,
      extracted_entities: this.extractEntities(turn.content),
      accumulated_decisions: this.mergeDecisions(
        previousContext.accumulated_decisions || [],
        turn.content
      ),
      file_context: this.updateFileContext(previousContext.file_context || {}, turn.content),
      next_steps: this.inferNextSteps(turn.content, threadData.turns.slice(0, turnIndex + 1)),
    };

    // Guardar en cache
    this.contextCache.set(threadData.id, context);

    return context;
  }

  // Extraer entidades del mensaje
  extractEntities(content) {
    const entities = {
      technologies: [],
      filePaths: [],
      commands: [],
      variables: [],
    };

    // Tecnologías
    const techPatterns = [
      /\b(React|Vue|Angular|Node\.js|Express|TypeScript|JavaScript|Python|Java|Go|Rust)\b/gi,
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
      /\b(Jest|Mocha|Chai|Supertest|ESLint|Prettier|Webpack|Vite|npm|yarn)\b/gi,
    ];

    techPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        entities.technologies.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Rutas de archivos
    const fileMatches = content.match(
      /[a-zA-Z0-9_\-\.\/]+\.(js|ts|json|yml|yaml|md|sql|html|css)/g
    );
    if (fileMatches) {
      entities.filePaths.push(...fileMatches);
    }

    // Comandos
    const commandMatches = content.match(
      /(npm|docker|git|CREATE|SELECT|INSERT|UPDATE|DELETE)\s+[a-zA-Z0-9_\-\.\/\s]+/gi
    );
    if (commandMatches) {
      entities.commands.push(...commandMatches);
    }

    // Variables
    const varMatches = content.match(/[A-Z_]+=[a-zA-Z0-9_\-\.]+/g);
    if (varMatches) {
      entities.variables.push(...varMatches);
    }

    return entities;
  }

  // Fusionar decisiones acumuladas
  mergeDecisions(existingDecisions, newContent) {
    const newDecisions = [];

    // Buscar decisiones en el contenido
    const decisionPatterns = [
      /\b(usar|implementar|configurar|instalar|crear|definir|establecer)\s+[a-zA-Z0-9_\-\.\/\s]+/gi,
      /\b(decidir|elegir|seleccionar|recomendar)\s+[a-zA-Z0-9_\-\.\/\s]+/gi,
    ];

    decisionPatterns.forEach(pattern => {
      const matches = newContent.match(pattern);
      if (matches) {
        newDecisions.push(...matches);
      }
    });

    // Combinar con decisiones existentes
    const allDecisions = [...existingDecisions, ...newDecisions];
    return [...new Set(allDecisions)]; // Eliminar duplicados
  }

  // Actualizar contexto de archivos
  updateFileContext(existingContext, newContent) {
    const updatedContext = { ...existingContext };

    // Buscar referencias a archivos
    const fileMatches = newContent.match(
      /[a-zA-Z0-9_\-\.\/]+\.(js|ts|json|yml|yaml|md|sql|html|css)/g
    );
    if (fileMatches) {
      fileMatches.forEach(file => {
        updatedContext[file] = {
          mentioned: true,
          last_mentioned: new Date().toISOString(),
        };
      });
    }

    return updatedContext;
  }

  // Inferir próximos pasos
  inferNextSteps(currentContent, previousTurns) {
    const nextSteps = [];

    // Analizar contenido actual para inferir próximos pasos
    if (currentContent.includes('instalar') || currentContent.includes('npm install')) {
      nextSteps.push('Verificar instalación de dependencias');
    }

    if (currentContent.includes('configurar') || currentContent.includes('setup')) {
      nextSteps.push('Configurar archivos de configuración');
    }

    if (currentContent.includes('crear') || currentContent.includes('CREATE')) {
      nextSteps.push('Implementar funcionalidad creada');
    }

    if (currentContent.includes('test') || currentContent.includes('testing')) {
      nextSteps.push('Ejecutar tests y verificar resultados');
    }

    return nextSteps;
  }

  // Simular rehidratación de contexto
  async rehydrateContext(threadId, newTurnContent) {
    const savedContext = this.contextCache.get(threadId);

    if (!savedContext) {
      throw new Error(`No se encontró contexto guardado para thread ${threadId}`);
    }

    // Simular que el agente downstream usa el contexto
    const rehydratedContext = {
      ...savedContext,
      rehydrated_at: new Date().toISOString(),
      new_turn_content: newTurnContent,
      context_used: true,
    };

    return rehydratedContext;
  }
}

// Simulador de Agente Downstream (ej. Coder Agent)
class MockDownstreamAgent {
  constructor() {
    this.taskSuccessRate = 0;
  }

  // Simular procesamiento con contexto rehidratado
  async processWithContext(rehydratedContext, task) {
    const contextQuality = this.assessContextQuality(rehydratedContext);

    // Simular éxito basado en calidad del contexto
    const successProbability = contextQuality / 100;
    const success = Math.random() < successProbability;

    if (success) {
      this.taskSuccessRate++;
    }

    return {
      success,
      context_quality: contextQuality,
      task_completed: success,
      context_used: rehydratedContext.context_used,
    };
  }

  // Evaluar calidad del contexto para el downstream
  assessContextQuality(context) {
    let quality = 0;

    // Verificar presencia de entidades críticas
    if (context.extracted_entities && Object.keys(context.extracted_entities).length > 0) {
      quality += 20;
    }

    // Verificar decisiones acumuladas
    if (context.accumulated_decisions && context.accumulated_decisions.length > 0) {
      quality += 20;
    }

    // Verificar contexto de archivos
    if (context.file_context && Object.keys(context.file_context).length > 0) {
      quality += 20;
    }

    // Verificar próximos pasos
    if (context.next_steps && context.next_steps.length > 0) {
      quality += 20;
    }

    // Verificar coherencia temporal
    if (context.current_turn && context.current_turn > 0) {
      quality += 20;
    }

    return quality;
  }
}

// Función para ejecutar replay test
async function runReplayTest(threadData) {
  const contextAgent = new MockContextAgent();
  const downstreamAgent = new MockDownstreamAgent();

  const results = {
    thread_id: threadData.id,
    thread_title: threadData.title,
    turns_tested: [],
    overall_success: 0,
    context_quality_scores: [],
  };

  // Simular handoff en diferentes puntos del thread
  const handoffPoints = [2, 3, 4]; // Turnos donde hacer handoff

  for (const turnIndex of handoffPoints) {
    if (turnIndex >= threadData.turns.length) continue;

    log('blue', `\n🔄 Simulando handoff en turno ${turnIndex + 1}`);

    // 1. Procesar contexto hasta el turno actual
    const context = await contextAgent.processContext(threadData, turnIndex);

    // 2. Simular handoff (guardar contexto)
    log('green', '💾 Contexto guardado');

    // 3. Simular nuevo turno (rehidratar contexto)
    const nextTurn = threadData.turns[turnIndex + 1];
    if (!nextTurn) continue;

    const rehydratedContext = await contextAgent.rehydrateContext(threadData.id, nextTurn.content);
    log('green', '🔄 Contexto rehidratado');

    // 4. Simular procesamiento downstream
    const task = `Continuar conversación basado en contexto del turno ${turnIndex + 1}`;
    const downstreamResult = await downstreamAgent.processWithContext(rehydratedContext, task);

    // 5. Evaluar resultado
    const turnResult = {
      turn_index: turnIndex + 1,
      context_saved: true,
      context_rehydrated: true,
      downstream_success: downstreamResult.success,
      context_quality: downstreamResult.context_quality,
      task_completed: downstreamResult.task_completed,
    };

    results.turns_tested.push(turnResult);
    results.context_quality_scores.push(downstreamResult.context_quality);

    if (downstreamResult.success) {
      results.overall_success++;
      log('green', `✅ Handoff exitoso - Calidad: ${downstreamResult.context_quality}%`);
    } else {
      log('red', `❌ Handoff fallido - Calidad: ${downstreamResult.context_quality}%`);
    }
  }

  // Calcular métricas finales
  results.success_rate =
    results.turns_tested.length > 0
      ? Math.round((results.overall_success / results.turns_tested.length) * 100)
      : 0;

  results.average_context_quality =
    results.context_quality_scores.length > 0
      ? Math.round(
          results.context_quality_scores.reduce((a, b) => a + b, 0) /
            results.context_quality_scores.length
        )
      : 0;

  return results;
}

// Función principal
async function main() {
  log('blue', '🔄 QUANNEX REPLAY TEST - SIMULADOR DE HANDOFFS');
  log('blue', '===============================================');

  try {
    // Leer threads golden
    const threadFiles = fs.readdirSync(GOLDEN_THREADS_DIR).filter(file => file.endsWith('.json'));

    if (threadFiles.length === 0) {
      log('red', '❌ No se encontraron threads golden');
      return;
    }

    log('green', `📁 Encontrados ${threadFiles.length} threads golden`);

    const allResults = [];
    let totalSuccessRate = 0;
    let totalContextQuality = 0;

    for (const threadFile of threadFiles) {
      log('blue', `\n📋 Procesando: ${threadFile}`);

      const threadPath = path.join(GOLDEN_THREADS_DIR, threadFile);
      const threadData = JSON.parse(fs.readFileSync(threadPath, 'utf8'));

      // Ejecutar replay test
      const results = await runReplayTest(threadData);
      allResults.push(results);

      totalSuccessRate += results.success_rate;
      totalContextQuality += results.average_context_quality;

      // Mostrar resultados del thread
      log('green', `✅ Success Rate: ${results.success_rate}%`);
      log('green', `✅ Context Quality: ${results.average_context_quality}%`);
      log('blue', `📊 Handoffs Tested: ${results.turns_tested.length}`);
    }

    // Calcular promedios generales
    const averageSuccessRate = Math.round(totalSuccessRate / allResults.length);
    const averageContextQuality = Math.round(totalContextQuality / allResults.length);

    log('blue', '\n📊 RESUMEN GENERAL');
    log('blue', '==================');
    log('green', `✅ Success Rate Promedio: ${averageSuccessRate}%`);
    log('green', `✅ Context Quality Promedio: ${averageContextQuality}%`);
    log('green', `✅ Threads Procesados: ${allResults.length}`);

    // Determinar estado del Gate 8 (Replay Success)
    const gate8Status =
      averageSuccessRate >= 90 ? 'PASSED' : averageSuccessRate >= 70 ? 'WARNING' : 'FAILED';
    const gate8Color =
      averageSuccessRate >= 90 ? 'green' : averageSuccessRate >= 70 ? 'yellow' : 'red';

    log(gate8Color, `🚦 Gate 8 - Replay Success Rate: ${gate8Status}`);

    if (gate8Status === 'FAILED') {
      log('red', '❌ Gate 8 FALLÓ - Replay success rate insuficiente');
      process.exit(1);
    } else if (gate8Status === 'WARNING') {
      log('yellow', '⚠️  Gate 8 ADVERTENCIA - Replay success rate aceptable pero mejorable');
    } else {
      log('green', '✅ Gate 8 PASÓ - Replay success rate excelente');
    }

    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      gate8_status: gate8Status,
      average_success_rate: averageSuccessRate,
      average_context_quality: averageContextQuality,
      threads_processed: allResults.length,
      results: allResults,
    };

    const reportPath = path.join(REPORTS_DIR, 'replay-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log('green', `\n💾 Reporte guardado en: ${reportPath}`);
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
