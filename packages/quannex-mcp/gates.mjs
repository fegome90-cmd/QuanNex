#!/usr/bin/env node

import {
  qnxFlag,
  qnxRunEnd,
  qnxSawComponent,
  EVENT_TYPES,
  COMPONENTS,
  SOURCES,
} from './telemetry.mjs';

/**
 * Configuración de intenciones que DEBEN usar QuanNex
 */
export const REQUIRED_INTENTS = [
  'auditoría',
  'audit',
  'security',
  'seguridad',
  'plan',
  'planning',
  'planificar',
  'fix-lint',
  'lint',
  'refactor',
  'refactoring',
  'refactorizar',
  'test',
  'testing',
  'tests',
  'pruebas',
  'workflow',
  'orchestration',
  'orquestación',
  'agent',
  'agente',
  'mcp',
  'quannex',
  'orchestrator',
  'orquestador',
];

/**
 * Patrones de palabras clave que indican que debe usar QuanNex
 */
export const REQUIRED_KEYWORDS = [
  'quannex',
  'orchestrator',
  'orquestador',
  'workflow',
  'agent',
  'agente',
  'mcp',
  'audit',
  'auditoría',
  'security',
  'seguridad',
  'lint',
  'refactor',
  'test',
  'prueba',
];

/**
 * Determina si una intención debe usar QuanNex
 * @param {string} intent - Intención del usuario
 * @param {string} prompt - Prompt completo del usuario
 * @returns {boolean} Si debe usar QuanNex
 */
export function shouldUseQuanNex(intent, prompt = '') {
  const lowerIntent = intent.toLowerCase();
  const lowerPrompt = prompt.toLowerCase();

  // Verificar intenciones exactas
  if (REQUIRED_INTENTS.some(req => lowerIntent.includes(req.toLowerCase()))) {
    return true;
  }

  // Verificar palabras clave en el prompt
  if (REQUIRED_KEYWORDS.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
    return true;
  }

  // Patrones específicos
  const patterns = [
    /(?:ejecutar|run|execute)\s+(?:workflow|orquestador|quannex)/i,
    /(?:crear|create)\s+(?:workflow|plan|planning)/i,
    /(?:auditar|audit)\s+(?:seguridad|security)/i,
    /(?:fix|arreglar)\s+(?:lint|linting)/i,
    /(?:refactor|refactoring|refactorizar)/i,
    /(?:test|testing|pruebas?)\s+(?:ejecutar|run)/i,
  ];

  return patterns.some(pattern => pattern.test(lowerIntent) || pattern.test(lowerPrompt));
}

/**
 * Gate principal: Verifica si Cursor usó QuanNex cuando debía
 * @param {string} run_id - ID del run
 * @param {string} intent - Intención del usuario
 * @param {string} prompt - Prompt completo
 * @param {string} source - Fuente de invocación
 * @returns {Object} Resultado del gate
 */
export function checkQuanNexGate(run_id, intent, prompt = '', source = SOURCES.CURSOR) {
  const result = {
    should_use_quannex: false,
    used_orchestrator: false,
    gate_passed: true,
    violations: [],
  };

  // Solo verificar para Cursor
  if (source !== SOURCES.CURSOR) {
    return result;
  }

  result.should_use_quannex = shouldUseQuanNex(intent, prompt);

  if (result.should_use_quannex) {
    result.used_orchestrator = qnxSawComponent(run_id, COMPONENTS.ORCHESTRATOR);

    if (!result.used_orchestrator) {
      result.gate_passed = false;
      result.violations.push('cursor_bypass');

      // Marcar como bypass
      qnxFlag(run_id, EVENT_TYPES.CURSOR_BYPASS, {
        reason: 'should_use_quannex',
        expected: COMPONENTS.ORCHESTRATOR,
        intent,
        prompt_length: prompt.length,
        source,
      });

      // Marcar run como fallido
      qnxRunEnd(run_id, false, {
        reason: 'bypass',
        gate_violations: result.violations,
      });
    }
  }

  return result;
}

/**
 * Gate de herramientas MCP: Verifica uso correcto de herramientas
 * @param {string} run_id - ID del run
 * @param {string} tool_name - Nombre de la herramienta
 * @param {Object} args - Argumentos de la herramienta
 * @param {boolean} success - Si la herramienta fue exitosa
 * @param {string} error - Error si hubo uno
 * @returns {Object} Resultado del gate
 */
export function checkMCPToolGate(run_id, tool_name, args = {}, success = true, error = null) {
  const result = {
    tool_name,
    success,
    gate_passed: true,
    violations: [],
  };

  // Verificar argumentos requeridos
  if (!args || typeof args !== 'object') {
    result.gate_passed = false;
    result.violations.push('invalid_args');
  }

  // Verificar herramientas específicas
  if (tool_name.startsWith('quannex.')) {
    if (!success && error) {
      result.gate_passed = false;
      result.violations.push('tool_misfire');

      qnxFlag(run_id, EVENT_TYPES.TOOL_MISFIRE, {
        tool: tool_name,
        error: error,
        args_hash: JSON.stringify(args).substring(0, 100),
      });
    }
  }

  return result;
}

/**
 * Gate de componentes: Verifica que los componentes se usen en orden correcto
 * @param {string} run_id - ID del run
 * @returns {Object} Resultado del gate
 */
export function checkComponentOrderGate(run_id) {
  const result = {
    gate_passed: true,
    violations: [],
    component_order: [],
  };

  // Verificar que orchestrator sea el primer componente usado
  const orchestratorUsed = qnxSawComponent(run_id, COMPONENTS.ORCHESTRATOR);

  if (orchestratorUsed) {
    result.component_order.push(COMPONENTS.ORCHESTRATOR);
  } else {
    result.gate_passed = false;
    result.violations.push('missing_orchestrator');

    qnxFlag(run_id, EVENT_TYPES.GATE_VIOLATION, {
      reason: 'missing_orchestrator',
      expected_order: [COMPONENTS.ORCHESTRATOR],
      actual_order: result.component_order,
    });
  }

  return result;
}

/**
 * Gate de rendimiento: Verifica que las operaciones no excedan umbrales
 * @param {string} run_id - ID del run
 * @param {number} max_latency_ms - Latencia máxima permitida
 * @param {number} max_components - Número máximo de componentes
 * @returns {Object} Resultado del gate
 */
export function checkPerformanceGate(run_id, max_latency_ms = 30000, max_components = 10) {
  const result = {
    gate_passed: true,
    violations: [],
    metrics: {
      max_latency_ms,
      component_count: 0,
      total_latency_ms: 0,
    },
  };

  // TODO: Implementar análisis de métricas de rendimiento
  // Esto requeriría leer los eventos del run y calcular métricas

  return result;
}

/**
 * Ejecuta todos los gates para un run
 * @param {string} run_id - ID del run
 * @param {string} intent - Intención del usuario
 * @param {string} prompt - Prompt completo
 * @param {string} source - Fuente de invocación
 * @returns {Object} Resultado de todos los gates
 */
export function runAllGates(run_id, intent, prompt = '', source = SOURCES.CURSOR) {
  const results = {
    run_id,
    timestamp: new Date().toISOString(),
    overall_passed: true,
    gates: {},
  };

  // Gate principal de QuanNex
  results.gates.quannex = checkQuanNexGate(run_id, intent, prompt, source);
  if (!results.gates.quannex.gate_passed) {
    results.overall_passed = false;
  }

  // Gate de orden de componentes
  results.gates.component_order = checkComponentOrderGate(run_id);
  if (!results.gates.component_order.gate_passed) {
    results.overall_passed = false;
  }

  // Gate de rendimiento
  results.gates.performance = checkPerformanceGate(run_id);
  if (!results.gates.performance.gate_passed) {
    results.overall_passed = false;
  }

  return results;
}

/**
 * Genera reporte de salud del sistema basado en gates
 * @param {number} time_window_hours - Ventana de tiempo en horas
 * @returns {Object} Reporte de salud
 */
export function generateHealthReport(time_window_hours = 24) {
  // TODO: Implementar análisis de eventos en ventana de tiempo
  return {
    timestamp: new Date().toISOString(),
    time_window_hours,
    health_score: 100,
    metrics: {
      bypass_rate: 0,
      tool_misfire_rate: 0,
      orchestrator_share: 100,
      avg_ttfq_ms: 0,
    },
    recommendations: [],
  };
}
