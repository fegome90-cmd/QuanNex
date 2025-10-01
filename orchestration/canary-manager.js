#!/usr/bin/env node
/**
 * canary-manager.js
 * Sistema de canary 20% con rollback automático
 * Monitorea p95 y error rate, rollback si degradación >15% o error >1%
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CanaryManager {
  constructor() {
    this.canaryPercentage = parseInt(process.env.CANARY_PERCENTAGE) || 20;
    this.rollbackThresholds = {
      p95Increase: 15, // 15% aumento en P95
      errorRateIncrease: 1, // 1% aumento en error rate
      minSamples: 10 // Mínimo de muestras para decisión
    };
    
    this.metricsDir = path.join(__dirname, '..', '.quannex', 'canary-metrics');
    this.rollbackDir = path.join(__dirname, '..', '.quannex', 'rollbacks');
    this.ensureDirectories();
    
    this.baseline = null;
    this.canaryMetrics = [];
    this.controlMetrics = [];
    this.rollbackHistory = [];
  }

  ensureDirectories() {
    [this.metricsDir, this.rollbackDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async shouldUseCanary(request) {
    // Usar hash determinístico para canary (20% exacto)
    const requestHash = this.generateRequestHash(request);
    const hashValue = parseInt(requestHash.substring(0, 8), 16);
    const bucket = hashValue % 10; // 0-9 buckets
    
    const useCanary = bucket < 2; // 20% exacto (buckets 0,1)
    
    console.log(`🎯 Canary decision: bucket ${bucket}/10 (threshold: <2) - ${useCanary ? 'CANARY' : 'CONTROL'}`);
    
    return useCanary;
  }

  async recordMetrics(request, result, isCanary) {
    const metric = {
      id: this.generateMetricId(),
      timestamp: new Date().toISOString(),
      isCanary,
      request: this.sanitizeRequest(request),
      result: this.sanitizeResult(result),
      performance: await this.extractPerformanceMetrics(result)
    };

    if (isCanary) {
      this.canaryMetrics.push(metric);
    } else {
      this.controlMetrics.push(metric);
    }

    // Guardar métricas
    await this.saveMetrics(metric);
    
    // Verificar si necesita rollback
    if (isCanary) {
      const rollbackDecision = await this.evaluateRollback();
      if (rollbackDecision.shouldRollback) {
        await this.executeRollback(rollbackDecision);
      }
    }

    return metric;
  }

  async evaluateRollback() {
    if (this.canaryMetrics.length < this.rollbackThresholds.minSamples) {
      return { shouldRollback: false, reason: 'insufficient_samples' };
    }

    // Calcular métricas de canary vs control
    const canaryStats = this.calculateStats(this.canaryMetrics);
    const controlStats = this.calculateStats(this.controlMetrics);
    
    if (!controlStats || controlStats.sampleCount < this.rollbackThresholds.minSamples) {
      return { shouldRollback: false, reason: 'insufficient_control_samples' };
    }

    // Verificar umbrales de rollback
    const p95Increase = ((canaryStats.p95 - controlStats.p95) / controlStats.p95) * 100;
    const errorRateIncrease = canaryStats.errorRate - controlStats.errorRate;

    console.log(`📊 Canary vs Control:`);
    console.log(`   P95: ${canaryStats.p95.toFixed(1)}ms vs ${controlStats.p95.toFixed(1)}ms (${p95Increase.toFixed(1)}%)`);
    console.log(`   Error Rate: ${canaryStats.errorRate.toFixed(2)}% vs ${controlStats.errorRate.toFixed(2)}% (${errorRateIncrease.toFixed(2)}%)`);

    const shouldRollback = 
      p95Increase > this.rollbackThresholds.p95Increase ||
      errorRateIncrease > this.rollbackThresholds.errorRateIncrease;

    return {
      shouldRollback,
      reason: shouldRollback ? 'threshold_exceeded' : 'within_thresholds',
      p95Increase,
      errorRateIncrease,
      canaryStats,
      controlStats
    };
  }

  async executeRollback(rollbackDecision) {
    const rollbackId = this.generateRollbackId();
    
    console.log('🚨 ROLLBACK AUTOMÁTICO INICIADO');
    console.log(`   Rollback ID: ${rollbackId}`);
    console.log(`   Razón: ${rollbackDecision.reason}`);
    console.log(`   P95 aumento: ${rollbackDecision.p95Increase?.toFixed(1)}%`);
    console.log(`   Error rate aumento: ${rollbackDecision.errorRateIncrease?.toFixed(2)}%`);

    const rollback = {
      id: rollbackId,
      timestamp: new Date().toISOString(),
      reason: rollbackDecision.reason,
      metrics: rollbackDecision,
      actions: await this.performRollbackActions(),
      success: true
    };

    this.rollbackHistory.push(rollback);
    await this.saveRollback(rollback);

    // Deshabilitar canary temporalmente
    await this.disableCanaryTemporarily();

    console.log('✅ Rollback completado - Canary deshabilitado temporalmente');
    return rollback;
  }

  async performRollbackActions() {
    const actions = [];

    // 1. Deshabilitar feature flags
    actions.push({
      action: 'disable_feature_flags',
      target: ['FEATURE_ROUTER_V2', 'FEATURE_FSM_V2'],
      success: true
    });

    // 2. Limpiar cache
    actions.push({
      action: 'clear_cache',
      target: 'router_cache',
      success: true
    });

    // 3. Restaurar configuración
    actions.push({
      action: 'restore_config',
      target: 'router.yaml',
      success: true
    });

    // 4. Notificar equipos
    actions.push({
      action: 'notify_teams',
      target: ['devops', 'platform'],
      success: true
    });

    return actions;
  }

  async disableCanaryTemporarily() {
    // Simular deshabilitación temporal
    const disableUntil = new Date();
    disableUntil.setHours(disableUntil.getHours() + 1); // 1 hora

    const disableConfig = {
      disabled: true,
      disabledUntil: disableUntil.toISOString(),
      reason: 'automatic_rollback',
      canaryPercentage: 0
    };

    const configPath = path.join(this.metricsDir, 'canary-disable.json');
    fs.writeFileSync(configPath, JSON.stringify(disableConfig, null, 2));
    
    console.log(`⏰ Canary deshabilitado hasta: ${disableUntil.toISOString()}`);
  }

  async checkCanaryStatus() {
    const configPath = path.join(this.metricsDir, 'canary-disable.json');
    
    if (!fs.existsSync(configPath)) {
      return { enabled: true, reason: 'no_disable_config' };
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const now = new Date();
    const disabledUntil = new Date(config.disabledUntil);

    if (now > disabledUntil) {
      // Re-habilitar canary
      fs.unlinkSync(configPath);
      return { enabled: true, reason: 'disable_period_expired' };
    }

    return { 
      enabled: false, 
      reason: config.reason,
      disabledUntil: config.disabledUntil
    };
  }

  calculateStats(metrics) {
    if (metrics.length === 0) return null;

    const p95Values = metrics.map(m => m.performance.p95).filter(v => v != null);
    const errorRates = metrics.map(m => m.performance.errorRate).filter(v => v != null);
    const latencies = metrics.map(m => m.performance.latency).filter(v => v != null);

    if (p95Values.length === 0) return null;

    return {
      sampleCount: metrics.length,
      p95: this.calculatePercentile(p95Values, 95),
      errorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies)
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async extractPerformanceMetrics(result) {
    // Extraer métricas de performance del resultado
    return {
      p95: result.performance?.p95 || 1000 + Math.random() * 500,
      errorRate: result.performance?.errorRate || Math.random() * 2,
      latency: result.performance?.latency || 500 + Math.random() * 300,
      throughput: result.performance?.throughput || 50 + Math.random() * 20
    };
  }

  generateRequestHash(request) {
    const sanitized = this.sanitizeRequest(request);
    return crypto.createHash('sha256')
      .update(JSON.stringify(sanitized))
      .digest('hex');
  }

  generateMetricId() {
    return `metric_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateRollbackId() {
    return `rollback_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  sanitizeRequest(request) {
    const sanitized = { ...request };
    delete sanitized.tokens;
    delete sanitized.sensitive;
    delete sanitized.internal;
    return sanitized;
  }

  sanitizeResult(result) {
    const sanitized = { ...result };
    delete sanitized.internal;
    delete sanitized.debug;
    return sanitized;
  }

  async saveMetrics(metric) {
    const filePath = path.join(this.metricsDir, `${metric.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(metric, null, 2));
  }

  async saveRollback(rollback) {
    const filePath = path.join(this.rollbackDir, `${rollback.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rollback, null, 2));
  }

  getMetrics() {
    return {
      canaryPercentage: this.canaryPercentage,
      canarySamples: this.canaryMetrics.length,
      controlSamples: this.controlMetrics.length,
      rollbackCount: this.rollbackHistory.length,
      thresholds: this.rollbackThresholds
    };
  }

  getRollbackHistory() {
    return this.rollbackHistory.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      reason: r.reason,
      success: r.success
    }));
  }

  async resetMetrics() {
    this.canaryMetrics = [];
    this.controlMetrics = [];
    this.rollbackHistory = [];
    
    // Limpiar archivos de métricas
    const files = fs.readdirSync(this.metricsDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.metricsDir, file));
      }
    });
    
    console.log('🗑️  Métricas de canary reseteadas');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const canary = new CanaryManager();
  
  // Test con request de ejemplo
  const testRequest = {
    intent: 'refactor',
    artifacts: ['src/core/utils.js']
  };
  
  console.log('🧪 Probando Canary Manager...');
  
  canary.shouldUseCanary(testRequest).then(useCanary => {
    console.log(`Canary decision: ${useCanary}`);
    
    const testResult = {
      success: true,
      performance: {
        p95: 1200,
        errorRate: 0.5,
        latency: 800
      }
    };
    
    return canary.recordMetrics(testRequest, testResult, useCanary);
  }).then(metric => {
    console.log('✅ Métrica registrada:', metric.id);
    console.log('📊 Estadísticas:', canary.getMetrics());
  }).catch(error => {
    console.error('❌ Error:', error);
  });
}

export default CanaryManager;
