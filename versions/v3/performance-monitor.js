#!/usr/bin/env node
/**
 * PerformanceMonitor - Monitor de performance
 * Versión simplificada para compatibilidad
 */

export default class PerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.metrics = {
      requests_per_second: 0,
      average_latency_ms: 0,
      error_rate: 0,
      memory_usage_mb: 0,
      cpu_usage_percent: 0
    };
  }

  /**
   * Inicia el monitoreo
   */
  async startMonitoring() {
    this.isMonitoring = true;
    console.log('📊 [PerformanceMonitor] Monitoreo iniciado');
    
    // Simular actualización de métricas
    setInterval(() => {
      this.updateMetrics();
    }, 5000);
  }

  /**
   * Actualiza las métricas
   */
  updateMetrics() {
    if (!this.isMonitoring) return;
    
    // Simular métricas reales
    this.metrics.requests_per_second = Math.floor(Math.random() * 100) + 50;
    this.metrics.average_latency_ms = Math.floor(Math.random() * 200) + 100;
    this.metrics.error_rate = Math.random() * 0.02; // 0-2%
    this.metrics.memory_usage_mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    this.metrics.cpu_usage_percent = Math.random() * 20; // 0-20%
  }

  /**
   * Obtiene el estado del monitor
   */
  getStatus() {
    return {
      is_monitoring: this.isMonitoring,
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 [PerformanceMonitor] Monitoreo detenido');
  }
}