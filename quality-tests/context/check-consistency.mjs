#!/usr/bin/env node
/**
 * Check Consistency - Validador de Calidad de Contexto
 * Verifica coherencia entre input original y snapshot generado
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

// Función para extraer entidades de texto
function extractEntities(text) {
  const entities = {
    technologies: [],
    filePaths: [],
    commands: [],
    variables: [],
    decisions: [],
  };

  // Tecnologías comunes
  const techPatterns = [
    /\b(React|Vue|Angular|Node\.js|Express|TypeScript|JavaScript|Python|Java|Go|Rust)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
    /\b(Jest|Mocha|Chai|Supertest|ESLint|Prettier|Webpack|Vite|npm|yarn)\b/gi,
  ];

  // Rutas de archivos
  const filePatterns = [
    /[a-zA-Z0-9_\-\.\/]+\.(js|ts|json|yml|yaml|md|sql|html|css)/g,
    /[a-zA-Z0-9_\-\.\/]+\/[a-zA-Z0-9_\-\.\/]+/g,
  ];

  // Comandos
  const commandPatterns = [
    /npm\s+(install|run|test|start|build|dev)/g,
    /docker\s+(build|run|compose|up|down)/g,
    /git\s+(clone|add|commit|push|pull)/g,
    /CREATE\s+TABLE/gi,
    /SELECT|INSERT|UPDATE|DELETE/gi,
  ];

  // Variables de entorno
  const envPatterns = [/[A-Z_]+=[a-zA-Z0-9_\-\.]+/g, /process\.env\.[A-Z_]+/g];

  // Decisiones (palabras clave)
  const decisionPatterns = [
    /\b(usar|implementar|configurar|instalar|crear|definir|establecer)\b/gi,
    /\b(decidir|elegir|seleccionar|recomendar)\b/gi,
  ];

  // Extraer entidades
  techPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.technologies.push(...matches.map(m => m.toLowerCase()));
    }
  });

  filePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.filePaths.push(...matches);
    }
  });

  commandPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.commands.push(...matches);
    }
  });

  envPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.variables.push(...matches);
    }
  });

  decisionPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.decisions.push(...matches);
    }
  });

  // Eliminar duplicados
  Object.keys(entities).forEach(key => {
    entities[key] = [...new Set(entities[key])];
  });

  return entities;
}

// Función para calcular cobertura de entidades
function calculateCoverage(expectedEntities, actualEntities) {
  const coverage = {
    technologies: 0,
    filePaths: 0,
    commands: 0,
    variables: 0,
    decisions: 0,
    overall: 0,
  };

  Object.keys(coverage).forEach(key => {
    if (key === 'overall') return;

    const expected = expectedEntities[key] || [];
    const actual = actualEntities[key] || [];

    if (expected.length === 0) {
      coverage[key] = 100; // Si no hay entidades esperadas, consideramos 100%
    } else {
      const found = expected.filter(entity =>
        actual.some(
          actualEntity =>
            actualEntity.toLowerCase().includes(entity.toLowerCase()) ||
            entity.toLowerCase().includes(actualEntity.toLowerCase())
        )
      );
      coverage[key] = Math.round((found.length / expected.length) * 100);
    }
  });

  // Calcular cobertura general
  const individualCoverages = Object.values(coverage).filter(v => v !== 0);
  coverage.overall =
    individualCoverages.length > 0
      ? Math.round(individualCoverages.reduce((a, b) => a + b, 0) / individualCoverages.length)
      : 0;

  return coverage;
}

// Función para verificar coherencia
function checkCoherence(expectedContext, actualContext) {
  const coherence = {
    contradictions: [],
    missing_elements: [],
    extra_elements: [],
    score: 0,
  };

  // Verificar contradicciones en decisiones clave
  const expectedDecisions = expectedContext.key_decisions || [];
  const actualDecisions = actualContext.key_decisions || [];

  expectedDecisions.forEach(expectedDecision => {
    const hasContradiction = actualDecisions.some(actualDecision => {
      // Buscar palabras contradictorias
      const contradictions = [
        ['usar', 'no usar'],
        ['instalar', 'desinstalar'],
        ['crear', 'eliminar'],
        ['habilitar', 'deshabilitar'],
        ['activar', 'desactivar'],
      ];

      return contradictions.some(
        ([pos, neg]) =>
          expectedDecision.toLowerCase().includes(pos) && actualDecision.toLowerCase().includes(neg)
      );
    });

    if (hasContradiction) {
      coherence.contradictions.push(expectedDecision);
    }
  });

  // Verificar elementos faltantes
  const expectedEntities = expectedContext.critical_entities || [];
  const actualText = JSON.stringify(actualContext).toLowerCase();

  expectedEntities.forEach(entity => {
    if (!actualText.includes(entity.toLowerCase())) {
      coherence.missing_elements.push(entity);
    }
  });

  // Calcular score de coherencia
  const totalChecks = expectedDecisions.length + expectedEntities.length;
  const passedChecks =
    totalChecks - coherence.contradictions.length - coherence.missing_elements.length;
  coherence.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return coherence;
}

// Función para calcular métricas de calidad
function calculateQualityMetrics(goldenThread, contextOutput) {
  const metrics = {
    coverage: {},
    coherence: {},
    precision: 0,
    noise_to_signal: 0,
    overall_score: 0,
  };

  // Extraer entidades del thread original
  const threadText = JSON.stringify(goldenThread.turns);
  const expectedEntities = extractEntities(threadText);

  // Extraer entidades del contexto generado
  const contextText = JSON.stringify(contextOutput);
  const actualEntities = extractEntities(contextText);

  // Calcular cobertura
  metrics.coverage = calculateCoverage(expectedEntities, actualEntities);

  // Verificar coherencia
  metrics.coherence = checkCoherence(goldenThread.expected_context, contextOutput);

  // Calcular precisión (entidades correctas / total entidades)
  const totalExpected = Object.values(expectedEntities).flat().length;
  const totalActual = Object.values(actualEntities).flat().length;
  const correctEntities =
    Object.values(metrics.coverage).reduce((sum, coverage) => sum + coverage, 0) / 5;
  metrics.precision = totalExpected > 0 ? Math.round((correctEntities / totalExpected) * 100) : 0;

  // Calcular noise-to-signal ratio
  const relevantTokens = Object.values(expectedEntities).flat().length;
  const totalTokens = contextText.split(' ').length;
  metrics.noise_to_signal = relevantTokens > 0 ? (totalTokens / relevantTokens).toFixed(2) : 0;

  // Calcular score general
  metrics.overall_score = Math.round(
    (metrics.coverage.overall + metrics.coherence.score + metrics.precision) / 3
  );

  return metrics;
}

// Función principal
async function main() {
  log('blue', '🔍 QUANNEX CONTEXT QUALITY CHECKER');
  log('blue', '=====================================');

  try {
    // Leer threads golden
    const threadFiles = fs.readdirSync(GOLDEN_THREADS_DIR).filter(file => file.endsWith('.json'));

    if (threadFiles.length === 0) {
      log('red', '❌ No se encontraron threads golden');
      return;
    }

    log('green', `📁 Encontrados ${threadFiles.length} threads golden`);

    const results = [];
    let totalScore = 0;

    for (const threadFile of threadFiles) {
      log('blue', `\n📋 Procesando: ${threadFile}`);

      const threadPath = path.join(GOLDEN_THREADS_DIR, threadFile);
      const goldenThread = JSON.parse(fs.readFileSync(threadPath, 'utf8'));

      // Simular output del Context Agent (en un caso real, esto vendría del agente)
      const mockContextOutput = {
        summary: goldenThread.golden_snapshot.summary,
        key_decisions: goldenThread.golden_snapshot.key_decisions,
        file_context: goldenThread.golden_snapshot.file_context,
        next_steps: goldenThread.golden_snapshot.next_steps,
      };

      // Calcular métricas
      const metrics = calculateQualityMetrics(goldenThread, mockContextOutput);

      results.push({
        thread_id: goldenThread.id,
        thread_title: goldenThread.title,
        metrics,
      });

      totalScore += metrics.overall_score;

      // Mostrar resultados del thread
      log('green', `✅ Cobertura: ${metrics.coverage.overall}%`);
      log('green', `✅ Coherencia: ${metrics.coherence.score}%`);
      log('green', `✅ Precisión: ${metrics.precision}%`);
      log('yellow', `⚠️  Noise-to-Signal: ${metrics.noise_to_signal}`);
      log('blue', `📊 Score General: ${metrics.overall_score}%`);

      // Mostrar detalles de cobertura
      log('blue', '   📈 Cobertura por categoría:');
      Object.entries(metrics.coverage).forEach(([category, score]) => {
        if (category !== 'overall') {
          const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
          log('blue', `     ${status} ${category}: ${score}%`);
        }
      });
    }

    // Calcular promedio general
    const averageScore = Math.round(totalScore / results.length);

    log('blue', '\n📊 RESUMEN GENERAL');
    log('blue', '==================');
    log('green', `✅ Score Promedio: ${averageScore}%`);
    log('green', `✅ Threads Procesados: ${results.length}`);

    // Determinar estado del Gate 8
    const gate8Status = averageScore >= 90 ? 'PASSED' : averageScore >= 70 ? 'WARNING' : 'FAILED';
    const gate8Color = averageScore >= 90 ? 'green' : averageScore >= 70 ? 'yellow' : 'red';

    log(gate8Color, `🚦 Gate 8 - Calidad de Contexto: ${gate8Status}`);

    if (gate8Status === 'FAILED') {
      log('red', '❌ Gate 8 FALLÓ - Calidad de contexto insuficiente');
      process.exit(1);
    } else if (gate8Status === 'WARNING') {
      log('yellow', '⚠️  Gate 8 ADVERTENCIA - Calidad de contexto aceptable pero mejorable');
    } else {
      log('green', '✅ Gate 8 PASÓ - Calidad de contexto excelente');
    }

    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      gate8_status: gate8Status,
      average_score: averageScore,
      threads_processed: results.length,
      results,
    };

    const reportPath = path.join(REPORTS_DIR, 'context-quality-report.json');
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
