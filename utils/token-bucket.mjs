/**
 * Token Bucket Rate Limiter - Implementación avanzada
 * Controla la manguera de requests con backoff exponencial y jitter
 */

export class TokenBucket {
  constructor(capacity = 6, refillPerSec = 3) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();

    // Refill automático cada segundo
    this.refillInterval = setInterval(() => {
      this.refill();
    }, 1000);
  }

  /**
   * Refill tokens basado en tiempo transcurrido
   */
  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillPerSec;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Intenta tomar tokens, espera si no hay suficientes
   * @param {number} n - Número de tokens a tomar
   * @returns {Promise<void>}
   */
  async take(n = 1) {
    while (this.tokens < n) {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.refill();
    }
    this.tokens -= n;
  }

  /**
   * Verifica si hay tokens disponibles sin consumirlos
   * @param {number} n - Número de tokens a verificar
   * @returns {boolean}
   */
  canTake(n = 1) {
    this.refill();
    return this.tokens >= n;
  }

  /**
   * Obtiene el número de tokens disponibles
   * @returns {number}
   */
  getAvailableTokens() {
    this.refill();
    return this.tokens;
  }

  /**
   * Destruye el bucket y limpia intervalos
   */
  destroy() {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }
  }
}

/**
 * Retry con backoff exponencial y jitter
 * @param {Function} fn - Función a ejecutar
 * @param {number} maxRetries - Máximo número de reintentos
 * @param {number} baseDelay - Delay base en ms
 * @param {number} maxDelay - Delay máximo en ms
 * @returns {Promise<any>}
 */
export async function callWithRetry(fn, maxRetries = 5, baseDelay = 250, maxDelay = 30000) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.status || error?.response?.status || error?.code;

      // Solo reintentar en errores específicos
      const retryableErrors = [429, 500, 502, 503, 504, 'ECONNRESET', 'ETIMEDOUT'];

      if (!retryableErrors.includes(status) || i === maxRetries) {
        throw error;
      }

      // Calcular delay con jitter
      const exponentialDelay = baseDelay * Math.pow(2, i);
      const jitter = Math.random() * 0.5 + 0.5; // 0.5 a 1.0
      const delay = Math.min(maxDelay, Math.round(exponentialDelay * jitter));

      console.log(`🔄 Retry ${i + 1}/${maxRetries} en ${delay}ms (error: ${status})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Circuit Breaker para detectar fallos en cascada
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, resetTimeout = 30000) {
    this.threshold = threshold; // Número de fallos antes de abrir
    this.timeout = timeout; // Ventana de tiempo para contar fallos
    this.resetTimeout = resetTimeout; // Tiempo antes de intentar cerrar
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
  }

  /**
   * Ejecuta función con circuit breaker
   * @param {Function} fn - Función a ejecutar
   * @returns {Promise<any>}
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Maneja éxito - resetea contador de fallos
   */
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Maneja fallo - incrementa contador y posiblemente abre circuito
   */
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`🚨 Circuit breaker OPENED after ${this.failures} failures`);
    }
  }

  /**
   * Obtiene estado del circuit breaker
   * @returns {Object}
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt,
      timeUntilReset: this.nextAttempt ? Math.max(0, this.nextAttempt - Date.now()) : 0,
    };
  }
}

/**
 * Request Coalescing - Agrupa requests similares
 */
export class RequestCoalescer {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Genera hash para request basado en prompt y tools
   * @param {string} prompt - Prompt del request
   * @param {Array} tools - Herramientas utilizadas
   * @returns {string}
   */
  generateHash(prompt, tools = []) {
    const crypto = require('crypto');
    const content = JSON.stringify({ prompt, tools });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Ejecuta request con coalescing
   * @param {string} hash - Hash del request
   * @param {Function} fn - Función a ejecutar
   * @returns {Promise<any>}
   */
  async execute(hash, fn) {
    // Si ya hay un request pendiente con el mismo hash, esperar su resultado
    if (this.pendingRequests.has(hash)) {
      console.log(`🔄 Coalescing request: ${hash}`);
      return this.pendingRequests.get(hash);
    }

    // Crear nuevo request
    const requestPromise = fn().finally(() => {
      this.pendingRequests.delete(hash);
    });

    this.pendingRequests.set(hash, requestPromise);
    return requestPromise;
  }

  /**
   * Limpia requests pendientes
   */
  cleanup() {
    this.pendingRequests.clear();
  }
}

/**
 * Priority Queue para manejar requests por prioridad
 */
export class PriorityQueue {
  constructor() {
    this.queues = {
      critical: [],
      normal: [],
      low: [],
    };
    this.priorities = { critical: 3, normal: 2, low: 1 };
  }

  /**
   * Encola request con prioridad
   * @param {any} item - Item a encolar
   * @param {string} priority - Prioridad (critical, normal, low)
   */
  enqueue(item, priority = 'normal') {
    if (!this.queues[priority]) {
      priority = 'normal';
    }
    this.queues[priority].push(item);
  }

  /**
   * Desencola siguiente item (por prioridad)
   * @returns {any|null}
   */
  dequeue() {
    // Buscar en orden de prioridad
    for (const priority of ['critical', 'normal', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }

  /**
   * Verifica si la cola está vacía
   * @returns {boolean}
   */
  isEmpty() {
    return Object.values(this.queues).every(queue => queue.length === 0);
  }

  /**
   * Obtiene tamaño de la cola
   * @returns {Object}
   */
  getSize() {
    return {
      critical: this.queues.critical.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
      total: Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0),
    };
  }
}

export default {
  TokenBucket,
  callWithRetry,
  CircuitBreaker,
  RequestCoalescer,
  PriorityQueue,
};
