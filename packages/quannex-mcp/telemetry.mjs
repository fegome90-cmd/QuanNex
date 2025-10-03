#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de telemetría
const LOG_DIR = path.resolve(process.cwd(), '.reports/metrics');
const LOG_FILE = path.join(LOG_DIR, 'qnx-events.jsonl');

// Tipos de eventos
export const EVENT_TYPES = {
  RUN_START: 'run_start',
  RUN_END: 'run_end',
  COMPONENT_USED: 'component_used',
  CURSOR_BYPASS: 'cursor_bypass',
  TOOL_MISFIRE: 'tool_misfire',
  GATE_VIOLATION: 'gate_violation',
};

// Componentes del sistema
export const COMPONENTS = {
  ORCHESTRATOR: 'orchestrator',
  ROUTER: 'router',
  PLANNER: 'planner',
  VALIDATOR: 'validator',
  RAG: 'rag',
  CODEGEN: 'codegen',
  MCP_TOOL: toolName => `mcp_tool:${toolName}`,
};

// Fuentes de invocación
export const SOURCES = {
  CURSOR: 'cursor',
  CLI: 'cli',
  API: 'api',
};

// Acciones de componentes
export const ACTIONS = {
  INVOKE: 'invoke',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Estructura de evento QuanNex
 * @typedef {Object} QnxEvent
 * @property {string} ts - Timestamp ISO
 * @property {string} run_id - UUID del run
 * @property {string} event - Tipo de evento
 * @property {string} [component] - Componente utilizado
 * @property {string} [action] - Acción realizada
 * @property {number} [count] - Contador de ocurrencias
 * @property {number} [latency_ms] - Latencia en milisegundos
 * @property {boolean} [ok] - Si la operación fue exitosa
 * @property {Object} [meta] - Metadatos adicionales
 */

/**
 * Emite un evento de telemetría
 * @param {QnxEvent} event - Evento a registrar
 */
function emit(event) {
  try {
    // Crear directorio si no existe
    fs.mkdirSync(LOG_DIR, { recursive: true });

    // Escribir evento como JSONL
    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf8');

    // Log para debug (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[QNX-TELEMETRY] ${event.event}${event.component ? `:${event.component}` : ''} ${event.ok ? '✅' : '❌'}`
      );
    }
  } catch (error) {
    console.error('[QNX-TELEMETRY] Error writing event:', error.message);
  }
}

/**
 * Obtiene timestamp actual en formato ISO
 * @returns {string} Timestamp ISO
 */
function now() {
  return new Date().toISOString();
}

/**
 * Inicia un nuevo run de QuanNex
 * @param {string} source - Fuente de invocación (cursor/cli/api)
 * @param {string} intent - Intención del usuario
 * @param {string} [run_id] - ID del run (opcional, se genera si no se proporciona)
 * @returns {string} ID del run
 */
export function qnxRunStart(source, intent, run_id = null) {
  const runId = run_id || randomUUID();

  emit({
    ts: now(),
    run_id: runId,
    event: EVENT_TYPES.RUN_START,
    ok: true,
    meta: {
      source,
      intent,
      version: '1.0.0',
    },
  });

  return runId;
}

/**
 * Finaliza un run de QuanNex
 * @param {string} run_id - ID del run
 * @param {boolean} ok - Si el run fue exitoso
 * @param {Object} meta - Metadatos adicionales
 */
export function qnxRunEnd(run_id, ok, meta = {}) {
  emit({
    ts: now(),
    run_id,
    event: EVENT_TYPES.RUN_END,
    ok,
    meta,
  });
}

/**
 * Registra el uso de un componente
 * @param {string} run_id - ID del run
 * @param {string} component - Nombre del componente
 * @param {string} action - Acción realizada
 * @param {number} [t0] - Timestamp de inicio (para calcular latencia)
 * @param {boolean} [ok=true] - Si la operación fue exitosa
 * @param {Object} meta - Metadatos adicionales
 */
export function qnxUse(
  run_id,
  component,
  action = ACTIONS.INVOKE,
  t0 = null,
  ok = true,
  meta = {}
) {
  const latency_ms = t0 ? Date.now() - t0 : undefined;

  emit({
    ts: now(),
    run_id,
    event: EVENT_TYPES.COMPONENT_USED,
    component,
    action,
    count: 1,
    latency_ms,
    ok,
    meta,
  });
}

/**
 * Marca eventos especiales (bypass, misfire, gate violations)
 * @param {string} run_id - ID del run
 * @param {string} event - Tipo de evento especial
 * @param {Object} meta - Metadatos del evento
 */
export function qnxFlag(run_id, event, meta = {}) {
  emit({
    ts: now(),
    run_id,
    event,
    ok: false,
    meta,
  });
}

/**
 * Wrapper para instrumentar funciones con telemetría
 * @param {string} run_id - ID del run
 * @param {string} component - Nombre del componente
 * @param {Function} fn - Función a instrumentar
 * @param {Object} meta - Metadatos adicionales
 * @returns {Promise} Resultado de la función
 */
export async function qnxInstrument(run_id, component, fn, meta = {}) {
  const t0 = Date.now();

  try {
    qnxUse(run_id, component, ACTIONS.INVOKE, t0, true, meta);
    const result = await fn();
    qnxUse(run_id, component, ACTIONS.SUCCESS, t0, true, { ...meta, result_type: typeof result });
    return result;
  } catch (error) {
    qnxUse(run_id, component, ACTIONS.ERROR, t0, false, {
      ...meta,
      error: error.message,
      error_type: error.constructor.name,
    });
    throw error;
  }
}

/**
 * Verifica si un componente fue usado en un run
 * @param {string} run_id - ID del run
 * @param {string} component - Nombre del componente
 * @returns {boolean} Si el componente fue usado
 */
export function qnxSawComponent(run_id, component) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return false;
    }

    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data
      .trim()
      .split('\n')
      .filter(line => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (
          event.run_id === run_id &&
          event.event === EVENT_TYPES.COMPONENT_USED &&
          event.component === component
        ) {
          return true;
        }
      } catch (parseError) {
        // Ignorar líneas malformadas
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error('[QNX-TELEMETRY] Error checking component:', error.message);
    return false;
  }
}

/**
 * Obtiene estadísticas de un run específico
 * @param {string} run_id - ID del run
 * @returns {Object} Estadísticas del run
 */
export function qnxGetRunStats(run_id) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return { error: 'No telemetry data available' };
    }

    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data
      .trim()
      .split('\n')
      .filter(line => line.trim());

    const runEvents = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.run_id === run_id) {
          runEvents.push(event);
        }
      } catch (parseError) {
        continue;
      }
    }

    if (runEvents.length === 0) {
      return { error: 'Run not found' };
    }

    const stats = {
      run_id,
      total_events: runEvents.length,
      components_used: new Set(),
      total_latency_ms: 0,
      errors: 0,
      events_by_type: {},
      events_by_component: {},
    };

    for (const event of runEvents) {
      // Contar por tipo
      stats.events_by_type[event.event] = (stats.events_by_type[event.event] || 0) + 1;

      // Contar por componente
      if (event.component) {
        stats.components_used.add(event.component);
        stats.events_by_component[event.component] =
          (stats.events_by_component[event.component] || 0) + 1;
      }

      // Sumar latencia
      if (event.latency_ms) {
        stats.total_latency_ms += event.latency_ms;
      }

      // Contar errores
      if (!event.ok) {
        stats.errors++;
      }
    }

    stats.components_used = Array.from(stats.components_used);

    return stats;
  } catch (error) {
    return { error: error.message };
  }
}

// Las constantes ya están exportadas arriba, no necesitamos re-exportarlas
