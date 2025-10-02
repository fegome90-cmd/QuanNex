/**
 * Simple Rate Limiter - GAP-002 Implementation
 * Implementación simplificada sin interferir con el flujo de agentes
 */

// Contadores simples por agente
const requestCounts = new Map();
const lastReset = new Map();

// Límites por agente (requests por minuto)
const AGENT_LIMITS = {
  'context': 10,
  'prompting': 15,
  'rules': 20,
  'security': 5,
  'metrics': 30,
  'optimization': 10,
  'docsync': 25,
  'lint': 20,
  'orchestrator': 50,
  'refactor': 10,
  'secscan': 5,
  'tests': 30
};

/**
 * Verifica si se puede procesar una request
 * @param {string} agentName - Nombre del agente
 * @returns {boolean} true si se puede procesar, false si está limitado
 */
export function checkRateLimit(agentName) {
  const now = Date.now();
  const limit = AGENT_LIMITS[agentName] || AGENT_LIMITS['context'];
  
  // Reset contador cada minuto
  if (!lastReset.has(agentName) || (now - lastReset.get(agentName)) > 60000) {
    requestCounts.set(agentName, 0);
    lastReset.set(agentName, now);
  }
  
  const currentCount = requestCounts.get(agentName) || 0;
  
  if (currentCount >= limit) {
    console.log(`🚫 [Rate Limiter] ${agentName}: Rate limit exceeded (${currentCount}/${limit})`);
    return false;
  }
  
  // Incrementar contador
  requestCounts.set(agentName, currentCount + 1);
  console.log(`✅ [Rate Limiter] ${agentName}: Request allowed (${currentCount + 1}/${limit})`);
  return true;
}

/**
 * Obtiene estadísticas de rate limiting
 * @returns {Object} Estadísticas actuales
 */
export function getRateLimitStats() {
  const stats = {
    agents: {},
    total_requests: 0
  };
  
  for (const [agent, count] of requestCounts.entries()) {
    stats.agents[agent] = {
      requests: count,
      limit: AGENT_LIMITS[agent] || AGENT_LIMITS['context'],
      remaining: Math.max(0, (AGENT_LIMITS[agent] || AGENT_LIMITS['context']) - count)
    };
    stats.total_requests += count;
  }
  
  return stats;
}

export default {
  checkRateLimit,
  getRateLimitStats,
  AGENT_LIMITS
};
