/**
 * LLM Client Enhanced - Cliente LLM con rate limiting avanzado
 * Implementa token bucket, retry con jitter y fallback models
 */

import { TokenBucket, callWithRetry, CircuitBreaker } from './token-bucket.mjs';
import { getToolLogger } from './tool-logger.mjs';

export class EnhancedLLMClient {
  constructor(options = {}) {
    // Configuración de rate limiting
    this.tokenBucket = new TokenBucket(options.burst || 6, options.qps || 3);

    // Circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      options.circuitThreshold || 5,
      options.circuitTimeout || 60000,
      options.circuitResetTimeout || 30000
    );

    // Configuración de modelos
    this.primaryModel = options.primaryModel || 'gpt-4';
    this.fallbackModels = options.fallbackModels || ['gpt-3.5-turbo'];
    this.currentModel = this.primaryModel;

    // Configuración de retry
    this.retryConfig = {
      maxRetries: options.maxRetries || 5,
      baseDelay: options.baseDelay || 250,
      maxDelay: options.maxDelay || 30000,
      jitter: options.jitter !== false, // Por defecto habilitado
    };

    // Configuración de timeout
    this.timeoutMs = options.timeoutMs || 45000;

    // Logger
    this.logger = getToolLogger();

    // Estadísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      timeoutRequests: 0,
      circuitBreakerTrips: 0,
      modelDowngrades: 0,
      retryAttempts: 0,
    };

    // Configuración de degradación
    this.degradationConfig = {
      errorCount: 0,
      lastErrorTime: null,
      consecutive429s: 0,
      last429Time: null,
    };
  }

  /**
   * Ejecuta llamada LLM con todas las protecciones
   * @param {Object} request - Request LLM
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<any>} Respuesta LLM
   */
  async callLLM(request, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // 1. Verificar circuit breaker
      if (this.circuitBreaker.state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }

      // 2. Esperar token bucket
      await this.tokenBucket.take(1);

      // 3. Ejecutar con circuit breaker y retry
      const result = await this.circuitBreaker.execute(async () => {
        return await callWithRetry(
          () => this.callLLMProvider(request, options),
          this.retryConfig.maxRetries,
          this.retryConfig.baseDelay,
          this.retryConfig.maxDelay
        );
      });

      this.stats.successfulRequests++;
      this.resetDegradationConfig();

      // Log exitoso
      this.logger.logToolCall({
        agent: 'llm-client',
        tool: 'call_llm',
        input: this.sanitizeRequest(request),
        output: result,
        duration_ms: Date.now() - startTime,
        success: true,
        metadata: {
          model: this.currentModel,
          tokens_used: this.estimateTokens(request),
        },
      });

      return {
        ...result,
        metadata: {
          model: this.currentModel,
          tokensUsed: this.estimateTokens(request),
          processingTime: Date.now() - startTime,
          degradationLevel: this.getDegradationLevel(),
        },
      };
    } catch (error) {
      this.stats.failedRequests++;

      // Manejar diferentes tipos de errores
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        return await this.handleRateLimitError(request, error, startTime);
      }

      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return await this.handleTimeoutError(request, error, startTime);
      }

      if (error.message.includes('Circuit breaker')) {
        return await this.handleCircuitBreakerError(request, error, startTime);
      }

      // Log de error genérico
      this.logger.logToolCall({
        agent: 'llm-client',
        tool: 'call_llm',
        input: this.sanitizeRequest(request),
        error: error.message,
        duration_ms: Date.now() - startTime,
        success: false,
        metadata: {
          model: this.currentModel,
          error_type: error.constructor.name,
        },
      });

      throw error;
    }
  }

  /**
   * Maneja errores de rate limit (429)
   * @param {Object} request - Request original
   * @param {Error} error - Error de rate limit
   * @param {number} startTime - Tiempo de inicio
   * @returns {Promise<any>} Respuesta degradada o de fallback
   */
  async handleRateLimitError(request, error, startTime) {
    this.stats.rateLimitedRequests++;
    this.degradationConfig.consecutive429s++;
    this.degradationConfig.last429Time = Date.now();

    this.logger.log('warn', 'Rate limit error detected', {
      consecutive429s: this.degradationConfig.consecutive429s,
      model: this.currentModel,
      error: error.message,
    });

    // Si hay 3+ errores 429 en menos de 1 minuto, degradar modelo
    if (
      this.degradationConfig.consecutive429s >= 3 &&
      this.degradationConfig.last429Time - this.degradationConfig.lastErrorTime < 60000
    ) {
      if (this.fallbackModels.length > 0) {
        this.currentModel = this.fallbackModels[0];
        this.stats.modelDowngrades++;

        this.logger.log('info', 'Model downgraded due to rate limits', {
          from: this.primaryModel,
          to: this.currentModel,
          consecutive429s: this.degradationConfig.consecutive429s,
        });

        try {
          return await this.callLLM(request, { model: this.currentModel });
        } catch (fallbackError) {
          // Si fallback también falla, devolver respuesta parcial
          return this.generatePartialResponse(request, fallbackError);
        }
      }
    }

    // Si no hay fallback o ya se agotaron, devolver respuesta parcial
    return this.generatePartialResponse(request, error);
  }

  /**
   * Maneja errores de timeout
   * @param {Object} request - Request original
   * @param {Error} error - Error de timeout
   * @param {number} startTime - Tiempo de inicio
   * @returns {Promise<any>} Respuesta de timeout
   */
  async handleTimeoutError(request, error, startTime) {
    this.stats.timeoutRequests++;

    this.logger.log('error', 'LLM request timeout', {
      timeout_ms: this.timeoutMs,
      model: this.currentModel,
      duration_ms: Date.now() - startTime,
    });

    return this.generatePartialResponse(request, error, 'timeout');
  }

  /**
   * Maneja errores de circuit breaker
   * @param {Object} request - Request original
   * @param {Error} error - Error de circuit breaker
   * @param {number} startTime - Tiempo de inicio
   * @returns {Promise<any>} Respuesta de emergencia
   */
  async handleCircuitBreakerError(request, error, startTime) {
    this.stats.circuitBreakerTrips++;

    this.logger.log('error', 'Circuit breaker opened', {
      state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      nextAttempt: this.circuitBreaker.nextAttempt,
    });

    return this.generatePartialResponse(request, error, 'circuit_breaker');
  }

  /**
   * Genera respuesta parcial cuando el servicio no está disponible
   * @param {Object} request - Request original
   * @param {Error} error - Error original
   * @param {string} reason - Razón de la respuesta parcial
   * @returns {Object} Respuesta parcial
   */
  generatePartialResponse(request, error, reason = 'service_unavailable') {
    const partialResponse = {
      content: `⚠️ Servicio LLM temporalmente no disponible. Razón: ${reason}`,
      partial: true,
      reason,
      continuation_plan: this.getContinuationPlan(reason),
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString(),
        degraded: true,
        model_attempted: this.currentModel,
      },
    };

    this.logger.log('warn', 'Generated partial response', {
      reason,
      model: this.currentModel,
      error: error.message,
    });

    return partialResponse;
  }

  /**
   * Obtiene plan de continuación basado en la razón del fallo
   * @param {string} reason - Razón del fallo
   * @returns {Array} Plan de continuación
   */
  getContinuationPlan(reason) {
    const plans = {
      rate_limit: [
        'Esperar unos minutos antes de reintentar',
        'Reducir frecuencia de requests',
        'Usar modelo alternativo si está disponible',
      ],
      timeout: [
        'Verificar conectividad de red',
        'Reducir tamaño del request',
        'Reintentar con timeout más largo',
      ],
      circuit_breaker: [
        'Esperar que el circuito se cierre automáticamente',
        'Verificar estado del servicio',
        'Contactar soporte si persiste',
      ],
      service_unavailable: [
        'Verificar estado del servicio',
        'Reintentar en unos minutos',
        'Usar respuestas en caché si están disponibles',
      ],
    };

    return plans[reason] || plans['service_unavailable'];
  }

  /**
   * Llama al proveedor LLM real
   * @param {Object} request - Request LLM
   * @param {Object} options - Opciones
   * @returns {Promise<any>} Respuesta del proveedor
   */
  async callLLMProvider(request, options = {}) {
    // Aquí iría la implementación real del cliente LLM
    // Por ahora simulamos una llamada con posibilidad de errores

    return new Promise((resolve, reject) => {
      const latency = Math.random() * 2000 + 500; // 500-2500ms

      setTimeout(() => {
        // Simular diferentes tipos de respuestas
        const random = Math.random();

        if (random < 0.85) {
          // 85% éxito
          resolve({
            content: `Respuesta simulada para: ${request.prompt?.substring(0, 50)}...`,
            model: options.model || this.currentModel,
            usage: {
              prompt_tokens: Math.floor(Math.random() * 1000) + 100,
              completion_tokens: Math.floor(Math.random() * 500) + 50,
              total_tokens: Math.floor(Math.random() * 1500) + 150,
            },
          });
        } else if (random < 0.9) {
          // 5% rate limit
          reject(new Error('Rate limit exceeded (429)'));
        } else if (random < 0.95) {
          // 5% timeout
          reject(new Error('Request timeout'));
        } else {
          // 5% error genérico
          reject(new Error('Service temporarily unavailable'));
        }
      }, latency);
    });
  }

  /**
   * Sanitiza request para logging
   * @param {Object} request - Request a sanitizar
   * @returns {Object} Request sanitizado
   */
  sanitizeRequest(request) {
    const sanitized = { ...request };

    // Limitar tamaño de prompt
    if (sanitized.prompt && sanitized.prompt.length > 500) {
      sanitized.prompt = sanitized.prompt.substring(0, 500) + '...[TRUNCATED]';
    }

    // Remover información sensible
    if (sanitized.api_key) {
      sanitized.api_key = '[REDACTED]';
    }

    return sanitized;
  }

  /**
   * Estima tokens de un request
   * @param {Object} request - Request LLM
   * @returns {number} Estimación de tokens
   */
  estimateTokens(request) {
    let tokens = 0;

    if (request.prompt) {
      tokens += Math.ceil(request.prompt.length / 4);
    }

    if (request.context) {
      tokens += Math.ceil(request.context.length / 4);
    }

    return tokens;
  }

  /**
   * Obtiene nivel de degradación actual
   * @returns {number} Nivel de degradación (0-4)
   */
  getDegradationLevel() {
    if (this.degradationConfig.consecutive429s >= 4) return 4;
    if (this.degradationConfig.consecutive429s >= 3) return 3;
    if (this.degradationConfig.consecutive429s >= 2) return 2;
    if (this.degradationConfig.consecutive429s >= 1) return 1;
    return 0;
  }

  /**
   * Resetea configuración de degradación
   */
  resetDegradationConfig() {
    this.degradationConfig.errorCount = 0;
    this.degradationConfig.lastErrorTime = null;
    this.degradationConfig.consecutive429s = 0;
    this.degradationConfig.last429Time = null;
    this.currentModel = this.primaryModel;
  }

  /**
   * Obtiene estadísticas del cliente
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      circuitBreakerState: this.circuitBreaker.getState(),
      tokenBucketTokens: this.tokenBucket.getAvailableTokens(),
      degradationLevel: this.getDegradationLevel(),
      currentModel: this.currentModel,
      successRate:
        this.stats.totalRequests > 0
          ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Limpia recursos
   */
  destroy() {
    this.tokenBucket.destroy();
  }
}

export default EnhancedLLMClient;
