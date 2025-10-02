#!/usr/bin/env node
/**
 * CanaryManager - Gestor de despliegues canary
 * Versión simplificada para compatibilidad
 */

export default class CanaryManager {
  constructor() {
    this.canaryPercentage = 20; // 20% exacto como mencionado
    this.metrics = {
      total_requests: 0,
      canary_requests: 0,
      success_rate: 0,
      error_rate: 0
    };
  }

  /**
   * Determina si una request debe usar canary
   */
  async shouldUseCanary(request) {
    // Lógica simple: 20% de las requests van a canary
    const shouldUse = (this.metrics.total_requests % 5) === 0;
    this.metrics.total_requests++;
    
    if (shouldUse) {
      this.metrics.canary_requests++;
    }
    
    return shouldUse;
  }

  /**
   * Registra métricas de la request
   */
  async recordMetrics(request, result, usedCanary) {
    // Simular registro de métricas
    if (usedCanary) {
      this.metrics.canary_requests++;
    }
    
    // Actualizar rates
    this.metrics.success_rate = this.metrics.canary_requests / this.metrics.total_requests;
    this.metrics.error_rate = 1 - this.metrics.success_rate;
  }

  /**
   * Obtiene métricas del canary
   */
  getMetrics() {
    return {
      ...this.metrics,
      canary_percentage: this.canaryPercentage,
      status: 'active'
    };
  }
}