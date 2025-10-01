/**
 * orchestration/handoff.js
 * Handoffs con contrato (Planner→Coder→Tester→Doc)
 * Pasa la posta con razón, gate y wants; deja traza y permite políticas
 */
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tipos de roles
export const ROLES = {
  ENGINEER: 'engineer',
  TEACHER: 'teacher', 
  TESTER: 'tester',
  DOC: 'doc',
  RULES: 'rules'
};

// Argumentos de handoff
export class HandoffArgs {
  constructor(to, gate, reason, wants = [], ttl_ms = 30000) {
    this.to = to;
    this.gate = gate;
    this.reason = reason;
    this.wants = wants;
    this.ttl_ms = ttl_ms;
    this.timestamp = Date.now();
  }
}

// Clase principal de handoff
export class HandoffManager {
  constructor() {
    this.traces = new Map(); // requestId -> trace[]
    this.activeHandoffs = new Map(); // requestId -> handoff
    this.policies = new Map(); // gate -> policy function
  }

  // Ejecutar handoff
  handoff(env, handoffArgs) {
    const requestId = env.requestId || env.thread_state_id || 'unknown';
    
    // Inicializar trace si no existe
    if (!env.trace) {
      env.trace = [];
    }
    
    // Validar handoff
    const validation = this.validateHandoff(handoffArgs);
    if (!validation.valid) {
      throw new Error(`Handoff validation failed: ${validation.error}`);
    }

    // Agregar a trace
    const traceEntry = {
      ts: Date.now(),
      agent: 'orchestrator',
      to: handoffArgs.to,
      gate: handoffArgs.gate,
      reason: handoffArgs.reason,
      wants: handoffArgs.wants,
      ttl_ms: handoffArgs.ttl_ms,
      status: 'pending'
    };
    
    env.trace.push(traceEntry);
    
    // Registrar handoff activo
    this.activeHandoffs.set(requestId, {
      ...handoffArgs,
      requestId,
      startTime: Date.now()
    });

    if (process.env.HANDOFF_LOGS_ENABLED === '1') {
      console.error(`🔄 Handoff: ${handoffArgs.to} (gate: ${handoffArgs.gate}, reason: ${handoffArgs.reason})`);
    }
    
    // Ejecutar política si existe
    if (this.policies.has(handoffArgs.gate)) {
      const policy = this.policies.get(handoffArgs.gate);
      const policyResult = policy(env, handoffArgs);
      
      if (!policyResult.allowed) {
        traceEntry.status = 'blocked';
        traceEntry.policy_reason = policyResult.reason;
        throw new Error(`Handoff blocked by policy: ${policyResult.reason}`);
      }
    }

    // Dispatch al agente objetivo
    const result = this.dispatch(env, handoffArgs);
    
    traceEntry.status = 'completed';
    traceEntry.result = result;
    
    return result;
  }

  // Dispatch al agente objetivo
  dispatch(env, handoffArgs) {
    const { to, gate, wants } = handoffArgs;
    
    // Simular dispatch (en producción sería real)
    const dispatchResult = {
      success: true,
      agent: to,
      gate: gate,
      wants_fulfilled: wants,
      timestamp: new Date().toISOString(),
      latency_ms: Math.random() * 1000 + 500
    };

    // Simular cumplimiento de wants
    if (wants && wants.length > 0) {
      dispatchResult.outputs = {};
      wants.forEach(want => {
        dispatchResult.outputs[want] = `generated_${want}_${Date.now()}`;
      });
    }

    return dispatchResult;
  }

  // Validar handoff
  validateHandoff(handoffArgs) {
    if (!handoffArgs.to || !Object.values(ROLES).includes(handoffArgs.to)) {
      return { valid: false, error: 'Invalid role' };
    }
    
    if (!handoffArgs.gate || typeof handoffArgs.gate !== 'string') {
      return { valid: false, error: 'Invalid gate' };
    }
    
    if (!handoffArgs.reason || typeof handoffArgs.reason !== 'string') {
      return { valid: false, error: 'Invalid reason' };
    }
    
    if (handoffArgs.wants && !Array.isArray(handoffArgs.wants)) {
      return { valid: false, error: 'Wants must be array' };
    }
    
    if (handoffArgs.ttl_ms && (typeof handoffArgs.ttl_ms !== 'number' || handoffArgs.ttl_ms <= 0)) {
      return { valid: false, error: 'TTL must be positive number' };
    }
    
    return { valid: true, error: null };
  }

  // Registrar política para un gate
  registerPolicy(gate, policyFunction) {
    this.policies.set(gate, policyFunction);
    if (process.env.HANDOFF_LOGS_ENABLED === '1') {
      console.error(`📋 Política registrada para gate: ${gate}`);
    }
  }

  // Obtener trace de un request
  getTrace(requestId) {
    return this.traces.get(requestId) || [];
  }

  // Obtener handoff activo
  getActiveHandoff(requestId) {
    return this.activeHandoffs.get(requestId);
  }

  // Limpiar handoffs expirados
  cleanupExpiredHandoffs() {
    const now = Date.now();
    const expired = [];
    
    for (const [requestId, handoff] of this.activeHandoffs) {
      if (now - handoff.startTime > handoff.ttl_ms) {
        expired.push(requestId);
      }
    }
    
    expired.forEach(requestId => {
      this.activeHandoffs.delete(requestId);
      console.log(`🧹 Handoff expirado limpiado: ${requestId}`);
    });
    
    return expired.length;
  }

  // Obtener estadísticas
  getStats() {
    return {
      activeHandoffs: this.activeHandoffs.size,
      registeredPolicies: this.policies.size,
      totalTraces: this.traces.size
    };
  }
}

// Instancia global
export const handoffManager = new HandoffManager();

// Función helper para handoff simple
export function handoff(env, handoffArgs) {
  return handoffManager.handoff(env, handoffArgs);
}

// Políticas predefinidas
export const defaultPolicies = {
  // Política para planner gate
  planner: (env, handoffArgs) => {
    if (!env.payload?.sources || env.payload.sources.length === 0) {
      return { allowed: false, reason: 'No sources provided' };
    }
    return { allowed: true, reason: 'Sources available' };
  },

  // Política para critic gate
  critic: (env, handoffArgs) => {
    const lastTrace = env.trace[env.trace.length - 1];
    if (!lastTrace || lastTrace.status !== 'completed') {
      return { allowed: false, reason: 'Previous step not completed' };
    }
    return { allowed: true, reason: 'Previous step completed' };
  },

  // Política para policy gate
  policy_gate: (env, handoffArgs) => {
    if (!env.payload?.policy_ok) {
      return { allowed: false, reason: 'Policy check failed' };
    }
    return { allowed: true, reason: 'Policy check passed' };
  }
};

// Registrar políticas por defecto
Object.entries(defaultPolicies).forEach(([gate, policy]) => {
  handoffManager.registerPolicy(gate, policy);
});

export default {
  ROLES,
  HandoffArgs,
  HandoffManager,
  handoffManager,
  handoff,
  defaultPolicies
};
