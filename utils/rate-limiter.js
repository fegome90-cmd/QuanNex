/**
 * Rate Limiter Module - GAP-002 Implementation
 * Implementa algoritmo Token Bucket para rate limiting en agentes
 */

// Configuración de límites por agente
const AGENT_LIMITS = {
  'context': { requests: 10, window: 60000 }, // 10 req/min
  'prompting': { requests: 15, window: 60000 }, // 15 req/min
  'rules': { requests: 20, window: 60000 }, // 20 req/min
  'security': { requests: 5, window: 60000 }, // 5 req/min (más restrictivo)
  'metrics': { requests: 30, window: 60000 }, // 30 req/min
  'optimization': { requests: 10, window: 60000 }, // 10 req/min
  'docsync': { requests: 25, window: 60000 }, // 25 req/min
  'lint': { requests: 20, window: 60000 }, // 20 req/min
  'orchestrator': { requests: 50, window: 60000 }, // 50 req/min
  'refactor': { requests: 10, window: 60000 }, // 10 req/min
  'secscan': { requests: 5, window: 60000 }, // 5 req/min
  'tests': { requests: 30, window: 60000 } // 30 req/min
};

// Almacén de tokens por cliente (IP/usuario)
const tokenBuckets = new Map();

// Cleanup automático cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of tokenBuckets.entries()) {
    if (now - bucket.lastCleanup > 300000) { // 5 minutos
      tokenBuckets.delete(key);
    }
  }
}, 300000);

/**
 * Clase TokenBucket para rate limiting
 */
class TokenBucket {
  constructor(capacity, refillRate, windowMs) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.windowMs = windowMs;
    this.lastRefill = Date.now();
    this.lastCleanup = Date.now();
  }

  /**
   * Intenta consumir un token
   * @returns {boolean} true si se puede procesar, false si está limitado
   */
  tryConsume() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    // Refill tokens basado en tiempo transcurrido
    const tokensToAdd = Math.floor(timePassed / this.windowMs) * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
    
    // Intentar consumir un token
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Obtiene tiempo hasta el próximo token disponible
   * @returns {number} milisegundos hasta próximo token
   */
  getTimeUntilNextToken() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.windowMs) * this.refillRate;
    const currentTokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    
    if (currentTokens >= 1) {
      return 0;
    }
    
    return this.windowMs - (timePassed % this.windowMs);
  }
}

/**
 * Obtiene identificador único del cliente
 * @param {string} agentName - Nombre del agente
 * @returns {string} Identificador del cliente
 */
function getClientId(agentName) {
  // En un entorno real, esto podría ser IP, user ID, etc.
  // Por simplicidad, usamos un identificador basado en proceso
  return `${agentName}_${process.pid}_${Math.floor(Date.now() / 60000)}`;
}

/**
 * Middleware de rate limiting para agentes
 * @param {string} agentName - Nombre del agente
 * @returns {Function} Middleware function
 */
export function createRateLimiter(agentName) {
  const config = AGENT_LIMITS[agentName] || AGENT_LIMITS['context'];
  
  return function rateLimitMiddleware(input, next) {
    const clientId = getClientId(agentName);
    
    // Obtener o crear bucket para este cliente
    if (!tokenBuckets.has(clientId)) {
      tokenBuckets.set(clientId, new TokenBucket(
        config.requests,
        config.requests,
        config.window
      ));
    }
    
    const bucket = tokenBuckets.get(clientId);
    
    // Verificar si se puede procesar
    if (bucket.tryConsume()) {
      // Log de request permitido
      console.log(`✅ [Rate Limiter] ${agentName}: Request allowed for ${clientId}`);
      return next(input);
    } else {
      // Log de request bloqueado
      const timeUntilNext = bucket.getTimeUntilNextToken();
      console.log(`🚫 [Rate Limiter] ${agentName}: Request blocked for ${clientId}, retry in ${timeUntilNext}ms`);
      
      // Retornar error de rate limiting
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: [`Rate limit exceeded for ${agentName}. Retry in ${Math.ceil(timeUntilNext / 1000)} seconds`],
        rate_limit_info: {
          agent: agentName,
          client_id: clientId,
          retry_after_seconds: Math.ceil(timeUntilNext / 1000),
          limit: config.requests,
          window_seconds: config.window / 1000
        }
      };
    }
  };
}

/**
 * Función helper para aplicar rate limiting en agentes existentes
 * @param {string} agentName - Nombre del agente
 * @param {Function} originalHandler - Función original del agente
 * @returns {Function} Función envuelta con rate limiting
 */
export function wrapWithRateLimit(agentName, originalHandler) {
  const config = AGENT_LIMITS[agentName] || AGENT_LIMITS['context'];
  
  return function() {
    const clientId = getClientId(agentName);
    
    // Obtener o crear bucket para este cliente
    if (!tokenBuckets.has(clientId)) {
      tokenBuckets.set(clientId, new TokenBucket(
        config.requests,
        config.requests,
        config.window
      ));
    }
    
    const bucket = tokenBuckets.get(clientId);
    
    // Verificar si se puede procesar
    if (bucket.tryConsume()) {
      // Log de request permitido
      console.log(`✅ [Rate Limiter] ${agentName}: Request allowed for ${clientId}`);
      return originalHandler();
    } else {
      // Log de request bloqueado
      const timeUntilNext = bucket.getTimeUntilNextToken();
      console.log(`🚫 [Rate Limiter] ${agentName}: Request blocked for ${clientId}, retry in ${timeUntilNext}ms`);
      
      // Retornar error de rate limiting
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: [`Rate limit exceeded for ${agentName}. Retry in ${Math.ceil(timeUntilNext / 1000)} seconds`],
        rate_limit_info: {
          agent: agentName,
          client_id: clientId,
          retry_after_seconds: Math.ceil(timeUntilNext / 1000),
          limit: config.requests,
          window_seconds: config.window / 1000
        }
      };
    }
  };
}

/**
 * Obtiene estadísticas de rate limiting
 * @returns {Object} Estadísticas actuales
 */
export function getRateLimitStats() {
  const stats = {
    total_buckets: tokenBuckets.size,
    buckets_by_agent: {},
    total_requests_blocked: 0
  };
  
  for (const [key, bucket] of tokenBuckets.entries()) {
    const agentName = key.split('_')[0];
    if (!stats.buckets_by_agent[agentName]) {
      stats.buckets_by_agent[agentName] = 0;
    }
    stats.buckets_by_agent[agentName]++;
  }
  
  return stats;
}

export default {
  createRateLimiter,
  wrapWithRateLimit,
  getRateLimitStats,
  AGENT_LIMITS
};
