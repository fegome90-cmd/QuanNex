#!/usr/bin/env node
/**
 * HANDOFF CONSOLIDADO V3 - GESTIÓN DE TRANSFERENCIAS ENTRE AGENTES
 * Combina: Handoff V2 + V3 + Optimizaciones de performance y timeout management
 */
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURACIÓN CONSOLIDADA
// ============================================================================

// Tipos de roles expandidos
export const ROLES = {
  ENGINEER: 'engineer',
  TEACHER: 'teacher', 
  TESTER: 'tester',
  DOC: 'doc',
  RULES: 'rules',
  CONTEXT: 'context',
  PROMPTING: 'prompting',
  ORCHESTRATOR: 'orchestrator',
  SECURITY: 'security',
  METRICS: 'metrics'
};

// Estados de handoff
export const HANDOFF_STATES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled'
};

// ============================================================================
// CLASES CONSOLIDADAS
// ============================================================================

export class HandoffArgs {
  constructor(to, gate, reason, wants = [], ttl_ms = 30000, priority = 1) {
    this.to = to;
    this.gate = gate;
    this.reason = reason;
    this.wants = wants;
    this.ttl_ms = ttl_ms;
    this.priority = priority;
    this.timestamp = Date.now();
    this.id = this.generateId();
    this.state = HANDOFF_STATES.PENDING;
  }

  generateId() {
    return `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isExpired() {
    return Date.now() - this.timestamp > this.ttl_ms;
  }

  toJSON() {
    return {
      id: this.id,
      to: this.to,
      gate: this.gate,
      reason: this.reason,
      wants: this.wants,
      ttl_ms: this.ttl_ms,
      priority: this.priority,
      timestamp: this.timestamp,
      state: this.state,
      expired: this.isExpired()
    };
  }
}

export class HandoffTrace {
  constructor(requestId, from, to, gate, reason, timestamp = Date.now()) {
    this.requestId = requestId;
    this.from = from;
    this.to = to;
    this.gate = gate;
    this.reason = reason;
    this.timestamp = timestamp;
    this.duration = 0;
    this.success = false;
    this.error = null;
  }

  complete(success = true, error = null) {
    this.duration = Date.now() - this.timestamp;
    this.success = success;
    this.error = error;
  }

  toJSON() {
    return {
      requestId: this.requestId,
      from: this.from,
      to: this.to,
      gate: this.gate,
      reason: this.reason,
      timestamp: this.timestamp,
      duration: this.duration,
      success: this.success,
      error: this.error
    };
  }
}

// ============================================================================
// HANDOFF MANAGER CONSOLIDADO
// ============================================================================

export class ConsolidatedHandoffManager {
  constructor(options = {}) {
    this.traces = new Map(); // requestId -> trace[]
    this.activeHandoffs = new Map(); // requestId -> handoff
    this.policies = new Map(); // gate -> policy function
    this.timeouts = new Set(); // Para cleanup
    this.metrics = {
      totalHandoffs: 0,
      successfulHandoffs: 0,
      failedHandoffs: 0,
      timeoutHandoffs: 0,
      averageDuration: 0,
      totalDuration: 0
    };
    
    // Configuración
    this.maxTraces = options.maxTraces || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minuto
    this.enableMetrics = options.enableMetrics !== false;
    
    // Iniciar cleanup automático
    this.startCleanupTimer();
  }

  // ============================================================================
  // HANDOFF PRINCIPAL
  // ============================================================================

  handoff(env, handoffArgs) {
    const requestId = env.requestId || env.thread_state_id || 'unknown';
    
    // Inicializar trace si no existe
    if (!env.trace) {
      env.trace = [];
    }
    
    // Validar handoff
    if (!this.validateHandoff(handoffArgs)) {
      throw new Error('Invalid handoff arguments');
    }
    
    // Crear trace
    const trace = new HandoffTrace(
      requestId,
      env.currentAgent || 'unknown',
      handoffArgs.to,
      handoffArgs.gate,
      handoffArgs.reason
    );
    
    // Agregar a traces
    this.addTrace(requestId, trace);
    
    // Registrar handoff activo
    this.activeHandoffs.set(requestId, {
      handoffArgs,
      trace,
      startTime: Date.now(),
      state: HANDOFF_STATES.IN_PROGRESS
    });
    
    // Aplicar políticas
    if (this.policies.has(handoffArgs.gate)) {
      const policy = this.policies.get(handoffArgs.gate);
      const policyResult = policy(env, handoffArgs);
      if (!policyResult.allowed) {
        trace.complete(false, policyResult.reason);
        this.updateMetrics(false, Date.now() - trace.timestamp);
        throw new Error(`Handoff blocked by policy: ${policyResult.reason}`);
      }
    }
    
    // Configurar timeout
    this.setHandoffTimeout(requestId, handoffArgs.ttl_ms);
    
    // Actualizar environment
    env.currentAgent = handoffArgs.to;
    env.trace.push(trace.toJSON());
    
    // Actualizar métricas
    this.metrics.totalHandoffs++;
    
    return {
      success: true,
      handoffId: handoffArgs.id,
      trace: trace.toJSON(),
      nextAgent: handoffArgs.to,
      gate: handoffArgs.gate,
      reason: handoffArgs.reason,
      wants: handoffArgs.wants
    };
  }

  // ============================================================================
  // VALIDACIÓN Y POLÍTICAS
  // ============================================================================

  validateHandoff(handoffArgs) {
    if (!handoffArgs || typeof handoffArgs !== 'object') {
      return false;
    }
    
    if (!handoffArgs.to || !handoffArgs.gate || !handoffArgs.reason) {
      return false;
    }
    
    if (!Object.values(ROLES).includes(handoffArgs.to)) {
      return false;
    }
    
    if (handoffArgs.ttl_ms && (handoffArgs.ttl_ms < 1000 || handoffArgs.ttl_ms > 300000)) {
      return false;
    }
    
    return true;
  }

  addPolicy(gate, policyFunction) {
    if (typeof policyFunction !== 'function') {
      throw new Error('Policy must be a function');
    }
    
    this.policies.set(gate, policyFunction);
  }

  removePolicy(gate) {
    this.policies.delete(gate);
  }

  // ============================================================================
  // GESTIÓN DE TRACES
  // ============================================================================

  addTrace(requestId, trace) {
    if (!this.traces.has(requestId)) {
      this.traces.set(requestId, []);
    }
    
    const traces = this.traces.get(requestId);
    traces.push(trace);
    
    // Limitar número de traces
    if (traces.length > this.maxTraces) {
      traces.shift(); // Remover el más antiguo
    }
  }

  getTraces(requestId) {
    return this.traces.get(requestId) || [];
  }

  getTraceSummary(requestId) {
    const traces = this.getTraces(requestId);
    if (traces.length === 0) {
      return null;
    }
    
    const successful = traces.filter(t => t.success).length;
    const failed = traces.filter(t => !t.success).length;
    const totalDuration = traces.reduce((sum, t) => sum + t.duration, 0);
    
    return {
      requestId,
      totalTraces: traces.length,
      successful,
      failed,
      successRate: successful / traces.length,
      totalDuration,
      averageDuration: totalDuration / traces.length,
      lastTrace: traces[traces.length - 1]
    };
  }

  // ============================================================================
  // GESTIÓN DE TIMEOUTS
  // ============================================================================

  setHandoffTimeout(requestId, ttl_ms) {
    const timeout = setTimeout(() => {
      this.handleHandoffTimeout(requestId);
    }, ttl_ms);
    
    this.timeouts.add(timeout);
  }

  handleHandoffTimeout(requestId) {
    const handoff = this.activeHandoffs.get(requestId);
    if (handoff) {
      handoff.trace.complete(false, 'Handoff timeout');
      handoff.state = HANDOFF_STATES.TIMEOUT;
      this.updateMetrics(false, Date.now() - handoff.startTime);
      this.metrics.timeoutHandoffs++;
    }
    
    this.activeHandoffs.delete(requestId);
  }

  // ============================================================================
  // COMPLETAR HANDOFF
  // ============================================================================

  completeHandoff(requestId, success = true, error = null) {
    const handoff = this.activeHandoffs.get(requestId);
    if (!handoff) {
      return false;
    }
    
    handoff.trace.complete(success, error);
    handoff.state = success ? HANDOFF_STATES.COMPLETED : HANDOFF_STATES.FAILED;
    
    this.updateMetrics(success, Date.now() - handoff.startTime);
    
    this.activeHandoffs.delete(requestId);
    return true;
  }

  // ============================================================================
  // MÉTRICAS Y MONITOREO
  // ============================================================================

  updateMetrics(success, duration) {
    if (success) {
      this.metrics.successfulHandoffs++;
    } else {
      this.metrics.failedHandoffs++;
    }
    
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / 
      (this.metrics.successfulHandoffs + this.metrics.failedHandoffs);
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeHandoffs: this.activeHandoffs.size,
      totalTraces: Array.from(this.traces.values()).reduce((sum, traces) => sum + traces.length, 0),
      policies: this.policies.size,
      successRate: this.metrics.totalHandoffs > 0 ? 
        this.metrics.successfulHandoffs / this.metrics.totalHandoffs : 0
    };
  }

  // ============================================================================
  // CLEANUP Y GESTIÓN DE RECURSOS
  // ============================================================================

  startCleanupTimer() {
    const cleanup = () => {
      this.cleanup();
      const timeout = setTimeout(cleanup, this.cleanupInterval);
      this.timeouts.add(timeout);
    };
    
    const timeout = setTimeout(cleanup, this.cleanupInterval);
    this.timeouts.add(timeout);
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    // Limpiar traces antiguos
    for (const [requestId, traces] of this.traces.entries()) {
      const recentTraces = traces.filter(trace => 
        now - trace.timestamp < maxAge
      );
      
      if (recentTraces.length === 0) {
        this.traces.delete(requestId);
      } else if (recentTraces.length < traces.length) {
        this.traces.set(requestId, recentTraces);
      }
    }
    
    // Limpiar handoffs expirados
    for (const [requestId, handoff] of this.activeHandoffs.entries()) {
      if (handoff.handoffArgs.isExpired()) {
        this.handleHandoffTimeout(requestId);
      }
    }
  }

  shutdown() {
    console.log('🛑 Cerrando Handoff Manager Consolidado...');
    
    // Limpiar timeouts
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    
    // Completar handoffs activos
    for (const [requestId, handoff] of this.activeHandoffs.entries()) {
      handoff.trace.complete(false, 'System shutdown');
      handoff.state = HANDOFF_STATES.CANCELLED;
    }
    
    this.activeHandoffs.clear();
    
    console.log('✅ Handoff Manager Consolidado cerrado');
  }
}

// ============================================================================
// UTILIDADES DE CONVENIENCIA
// ============================================================================

export function createHandoff(to, gate, reason, wants = [], ttl_ms = 30000, priority = 1) {
  return new HandoffArgs(to, gate, reason, wants, ttl_ms, priority);
}

export function createHandoffManager(options = {}) {
  return new ConsolidatedHandoffManager(options);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const manager = createHandoffManager();
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    manager.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    manager.shutdown();
    process.exit(0);
  });
  
  // Procesar requests desde stdin
  if (!process.stdin.isTTY) {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const request = JSON.parse(data);
        const result = manager.handoff(request.env, request.handoffArgs);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }, null, 2));
        process.exit(1);
      }
    });
  } else {
    // Modo interactivo
    console.log('🚀 Handoff Manager Consolidado V3 iniciado');
    console.log('📊 Métricas:', manager.getMetrics());
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Función simple de handoff para compatibilidad con fsm-v2.js
export function handoff(env, options) {
  // Función simple que simula el handoff
  const result = {
    to: options.to,
    gate: options.gate,
    reason: options.reason || 'handoff',
    wants: options.wants || [],
    timestamp: new Date().toISOString(),
    requestId: env.requestId
  };
  
  // Agregar al trace si existe
  if (env.trace) {
    env.trace.push(result);
  }
  
  return result;
}

export default ConsolidatedHandoffManager;
