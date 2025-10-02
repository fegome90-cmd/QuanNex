import crypto from 'node:crypto';

/**
 * Rate Limiter para controlar la frecuencia de llamadas a agentes MCP
 * Implementa rate limiting por agente con ventanas de tiempo deslizantes
 */
export class RateLimiter {
  constructor(options = {}) {
    this.requests = new Map();
    this.limits = options.limits || {
      context: { requests: 100, window: 60000 },    // 100 req/min
      prompting: { requests: 50, window: 60000 },   // 50 req/min
      rules: { requests: 30, window: 60000 },       // 30 req/min
      security: { requests: 20, window: 60000 },    // 20 req/min
      metrics: { requests: 40, window: 60000 },     // 40 req/min
      optimization: { requests: 25, window: 60000 } // 25 req/min
    };
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    this.startCleanup();
  }

  /**
   * Verifica si se puede hacer una llamada al agente
   * @param {string} agentName - Nombre del agente
   * @param {string} clientId - ID del cliente (opcional)
   * @returns {boolean} - true si se permite la llamada
   * @throws {Error} - Si se excede el límite
   */
  checkLimit(agentName, clientId = 'default') {
    const now = Date.now();
    const limit = this.limits[agentName];
    
    if (!limit) {
      // Si no hay límite definido, permitir
      return true;
    }

    const key = this.generateKey(agentName, clientId, now, limit.window);
    const current = this.requests.get(key) || 0;
    
    if (current >= limit.requests) {
      throw new Error(`Rate limit exceeded for ${agentName}: ${current}/${limit.requests} requests in ${limit.window}ms window`);
    }
    
    this.requests.set(key, current + 1);
    return true;
  }

  /**
   * Genera una clave única para la ventana de tiempo
   * @param {string} agentName - Nombre del agente
   * @param {string} clientId - ID del cliente
   * @param {number} timestamp - Timestamp actual
   * @param {number} window - Ventana de tiempo en ms
   * @returns {string} - Clave única
   */
  generateKey(agentName, clientId, timestamp, window) {
    const windowStart = Math.floor(timestamp / window) * window;
    return `${agentName}:${clientId}:${windowStart}`;
  }

  /**
   * Obtiene estadísticas de rate limiting para un agente
   * @param {string} agentName - Nombre del agente
   * @param {string} clientId - ID del cliente
   * @returns {object} - Estadísticas actuales
   */
  getStats(agentName, clientId = 'default') {
    const now = Date.now();
    const limit = this.limits[agentName];
    
    if (!limit) {
      return { agent: agentName, limit: null, current: 0, remaining: Infinity };
    }

    const key = this.generateKey(agentName, clientId, now, limit.window);
    const current = this.requests.get(key) || 0;
    const remaining = Math.max(0, limit.requests - current);
    
    return {
      agent: agentName,
      client: clientId,
      limit: limit.requests,
      window: limit.window,
      current,
      remaining,
      resetTime: Math.floor(now / limit.window) * limit.window + limit.window
    };
  }

  /**
   * Obtiene estadísticas para todos los agentes
   * @returns {object} - Estadísticas globales
   */
  getAllStats() {
    const stats = {};
    for (const agentName of Object.keys(this.limits)) {
      stats[agentName] = this.getStats(agentName);
    }
    return stats;
  }

  /**
   * Resetea el contador para un agente específico
   * @param {string} agentName - Nombre del agente
   * @param {string} clientId - ID del cliente
   */
  resetLimit(agentName, clientId = 'default') {
    const now = Date.now();
    const limit = this.limits[agentName];
    
    if (!limit) return;
    
    const key = this.generateKey(agentName, clientId, now, limit.window);
    this.requests.delete(key);
  }

  /**
   * Actualiza los límites para un agente
   * @param {string} agentName - Nombre del agente
   * @param {number} requests - Número de requests permitidos
   * @param {number} window - Ventana de tiempo en ms
   */
  updateLimit(agentName, requests, window) {
    this.limits[agentName] = { requests, window };
  }

  /**
   * Limpia entradas expiradas del mapa de requests
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, _] of this.requests) {
      const [agentName, clientId, windowStart] = key.split(':');
      const limit = this.limits[agentName];
      
      if (limit && now - parseInt(windowStart) > limit.window) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.requests.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`RateLimiter: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Inicia el proceso de limpieza automática
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Genera un ID de cliente único basado en IP o sesión
   * @param {object} request - Objeto de request (opcional)
   * @returns {string} - ID único del cliente
   */
  generateClientId(request = null) {
    if (request && request.headers && request.headers['x-forwarded-for']) {
      return crypto.createHash('md5').update(request.headers['x-forwarded-for']).digest('hex');
    }
    
    if (request && request.ip) {
      return crypto.createHash('md5').update(request.ip).digest('hex');
    }
    
    // Fallback a ID basado en PID y timestamp
    return crypto.createHash('md5').update(`${process.pid}:${Date.now()}`).digest('hex').slice(0, 8);
  }
}

// Instancia singleton para uso global
export const rateLimiter = new RateLimiter();

// Función de conveniencia para verificar límites
export function checkRateLimit(agentName, clientId = 'default') {
  return rateLimiter.checkLimit(agentName, clientId);
}

// Función de conveniencia para obtener estadísticas
export function getRateLimitStats(agentName, clientId = 'default') {
  return rateLimiter.getStats(agentName, clientId);
}

export default RateLimiter;
