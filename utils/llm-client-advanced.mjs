/**
 * LLM Client Avanzado - Con rate limiting, circuit breaker y degradación progresiva
 * Integra TokenBucket, ContextTrimmer y CircuitBreaker
 */

import { TokenBucket, callWithRetry, CircuitBreaker, RequestCoalescer } from './token-bucket.mjs';
import ContextTrimmer from './context-trimmer.mjs';

export class AdvancedLLMClient {
  constructor(options = {}) {
    // Configuración de rate limiting
    this.tokenBucket = new TokenBucket(options.burst || 6, options.qps || 3);

    // Circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      options.circuitThreshold || 5,
      options.circuitTimeout || 60000,
      options.circuitResetTimeout || 30000
    );

    // Request coalescing
    this.coalescer = new RequestCoalescer();

    // Context trimmer
    this.contextTrimmer = new ContextTrimmer({
      maxTokens: options.maxTokens || 4000,
      topKRAG: options.topKRAG || 3,
      rerankTopN: options.rerankTopN || 8,
      maxToolCalls: options.maxToolCalls || 2,
      trimRatio: options.trimRatio || 0.3,
    });

    // Configuración de modelos
    this.primaryModel = options.primaryModel || 'gpt-4';
    this.fallbackModels = options.fallbackModels || ['gpt-3.5-turbo'];
    this.currentModel = this.primaryModel;

    // Estadísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      circuitBreakerTrips: 0,
      modelDowngrades: 0,
      contextTrims: 0,
    };

    // Configuración de degradación
    this.degradationConfig = {
      errorCount: 0,
      lastErrorTime: null,
      contextTrimRatio: options.trimRatio || 0.3,
      topKRAG: options.topKRAG || 3,
      maxToolCalls: options.maxToolCalls || 2,
      disableNonCriticalTools: false,
    };
  }

  /**
   * Ejecuta llamada LLM con todas las optimizaciones
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

      // 2. Optimizar contexto si es necesario
      const optimizedRequest = await this.optimizeRequest(request);

      // 3. Generar hash para coalescing
      const requestHash = this.coalescer.generateHash(
        optimizedRequest.prompt || JSON.stringify(optimizedRequest),
        optimizedRequest.tools || []
      );

      // 4. Ejecutar con coalescing
      const result = await this.coalescer.execute(requestHash, async () => {
        return await this.executeWithRateLimit(optimizedRequest, options);
      });

      this.stats.successfulRequests++;
      this.resetDegradationConfig();

      return {
        ...result,
        metadata: {
          model: this.currentModel,
          tokensUsed: this.estimateTokens(optimizedRequest),
          processingTime: Date.now() - startTime,
          degradationLevel: this.getDegradationLevel(),
        },
      };
    } catch (error) {
      this.stats.failedRequests++;

      // Manejar diferentes tipos de errores
      if (error.message.includes('Rate limit')) {
        this.stats.rateLimitedRequests++;
        return await this.handleRateLimitError(request, error);
      }

      if (error.message.includes('Circuit breaker')) {
        this.stats.circuitBreakerTrips++;
        return await this.handleCircuitBreakerError(request, error);
      }

      throw error;
    }
  }

  /**
   * Ejecuta request con rate limiting
   * @param {Object} request - Request optimizado
   * @param {Object} options - Opciones
   * @returns {Promise<any>} Respuesta LLM
   */
  async executeWithRateLimit(request, options) {
    // Esperar token bucket
    await this.tokenBucket.take(1);

    // Ejecutar con circuit breaker y retry
    return await this.circuitBreaker.execute(async () => {
      return await callWithRetry(
        async () => {
          return await this.callLLMProvider(request, options);
        },
        5,
        250,
        30000
      );
    });
  }

  /**
   * Optimiza request antes de enviar
   * @param {Object} request - Request original
   * @returns {Object} Request optimizado
   */
  async optimizeRequest(request) {
    const optimized = { ...request };

    // Optimizar contexto si existe
    if (request.context && Array.isArray(request.context)) {
      const estimatedTokens = this.contextTrimmer.estimateTokens(request.context);

      if (estimatedTokens > this.contextTrimmer.maxTokens) {
        optimized.context = this.contextTrimmer.trimContext(
          request.context,
          this.degradationConfig.contextTrimRatio
        );
        this.stats.contextTrims++;
      }
    }

    // Optimizar RAG si existe
    if (request.ragChunks && Array.isArray(request.ragChunks)) {
      optimized.ragChunks = this.contextTrimmer.optimizeRAG(request.ragChunks, request.query || '');
    }

    // Limitar tool calls
    if (request.tools && Array.isArray(request.tools)) {
      optimized.tools = this.contextTrimmer.limitToolCalls(request.tools);
    }

    return optimized;
  }

  /**
   * Maneja errores de rate limit
   * @param {Object} request - Request original
   * @param {Error} error - Error de rate limit
   * @returns {Promise<any>} Respuesta degradada
   */
  async handleRateLimitError(request, error) {
    this.degradationConfig.errorCount++;
    this.degradationConfig.lastErrorTime = Date.now();

    // Aplicar degradación progresiva
    const degradedConfig = this.contextTrimmer.applyProgressiveDegradation(
      this.degradationConfig,
      this.degradationConfig.errorCount
    );

    // Intentar con modelo de fallback
    if (this.fallbackModels.length > 0) {
      this.currentModel = this.fallbackModels[0];
      this.stats.modelDowngrades++;

      try {
        return await this.callLLM(request, { model: this.currentModel });
      } catch (fallbackError) {
        // Si fallback también falla, devolver respuesta parcial
        return this.generatePartialResponse(request, error);
      }
    }

    throw error;
  }

  /**
   * Maneja errores de circuit breaker
   * @param {Object} request - Request original
   * @param {Error} error - Error de circuit breaker
   * @returns {Promise<any>} Respuesta de emergencia
   */
  async handleCircuitBreakerError(request, error) {
    // Generar respuesta parcial útil
    return this.generatePartialResponse(request, error);
  }

  /**
   * Genera respuesta parcial cuando el servicio no está disponible
   * @param {Object} request - Request original
   * @param {Error} error - Error original
   * @returns {Object} Respuesta parcial
   */
  generatePartialResponse(request, error) {
    return {
      content: `⚠️ Servicio temporalmente no disponible. Error: ${error.message}`,
      partial: true,
      continuation_plan: [
        'Reintentar en unos minutos',
        'Verificar conectividad',
        'Contactar soporte si persiste',
      ],
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString(),
        degraded: true,
      },
    };
  }

  /**
   * Llama al proveedor LLM real
   * @param {Object} request - Request LLM
   * @param {Object} options - Opciones
   * @returns {Promise<any>} Respuesta del proveedor
   */
  async callLLMProvider(request, options = {}) {
    // Aquí iría la implementación real del cliente LLM
    // Por ahora simulamos una llamada
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simular respuesta exitosa
        resolve({
          content: `Respuesta simulada para: ${request.prompt?.substring(0, 50)}...`,
          model: options.model || this.currentModel,
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        });
      }, 100);
    });
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
      tokens += this.contextTrimmer.estimateTokens(request.context);
    }

    return tokens;
  }

  /**
   * Obtiene nivel de degradación actual
   * @returns {number} Nivel de degradación (0-4)
   */
  getDegradationLevel() {
    return Math.min(4, this.degradationConfig.errorCount);
  }

  /**
   * Resetea configuración de degradación
   */
  resetDegradationConfig() {
    this.degradationConfig.errorCount = 0;
    this.degradationConfig.lastErrorTime = null;
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
    };
  }

  /**
   * Limpia recursos
   */
  destroy() {
    this.tokenBucket.destroy();
    this.coalescer.cleanup();
  }
}

export default AdvancedLLMClient;
