#!/usr/bin/env node
/**
 * Rules Protection System - Sistema de Protección contra Fallos de Lógica
 *
 * Este sistema previene fallos de lógica del agente de rules que puedan:
 * - Llenar la Task DB de spam
 * - Aplicar reglas que bajen el rendimiento
 * - Entorpecer la funcionalidad de otros agentes
 * - Crear bucles infinitos
 * - Aplicar reglas excesivamente
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CentralizedLogger from './centralized-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class RulesProtectionSystem {
  constructor() {
    this.configPath = join(
      PROJECT_ROOT,
      '.reports/rules-protection-config.json'
    );
    this.activityLogPath = join(PROJECT_ROOT, '.reports/rules-activity.log');
    this.throttleConfigPath = join(
      PROJECT_ROOT,
      '.reports/rules-throttle.json'
    );
    this.performanceMetricsPath = join(
      PROJECT_ROOT,
      '.reports/rules-performance.json'
    );

    // Inicializar logger centralizado
    this.logger = new CentralizedLogger('rules-protection');

    this.initializeProtection();
  }

  /**
   * Inicializa el sistema de protección
   */
  initializeProtection() {
    this.loadConfig();
    this.initializeThrottling();
    this.initializePerformanceMonitoring();
  }

  /**
   * Carga la configuración de protección
   */
  loadConfig() {
    if (!existsSync(this.configPath)) {
      const defaultConfig = {
        protection: {
          enabled: true,
          maxTasksPerHour: 10,
          maxRulesPerExecution: 5,
          maxFileCreationsPerHour: 3,
          maxDbWritesPerHour: 20,
          executionCooldown: 300000, // 5 minutos
          performanceThreshold: 1000, // 1 segundo
          memoryThreshold: 200 * 1024 * 1024, // 200MB
          maxRetries: 3,
          circuitBreakerThreshold: 5
        },
        throttling: {
          enabled: true,
          windowSize: 3600000, // 1 hora
          maxExecutions: 10,
          backoffMultiplier: 2,
          maxBackoff: 300000 // 5 minutos
        },
        performance: {
          enabled: true,
          maxExecutionTime: 5000, // 5 segundos
          maxMemoryUsage: 200 * 1024 * 1024, // 200MB
          slowQueryThreshold: 1000, // 1 segundo
          alertThreshold: 3000 // 3 segundos
        },
        safety: {
          preventSpam: true,
          preventLoops: true,
          preventPerformanceDegradation: true,
          preventAgentInterference: true,
          requireApproval: false
        }
      };
      writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      this.config = defaultConfig;
    } else {
      this.config = JSON.parse(readFileSync(this.configPath, 'utf8'));
    }
  }

  /**
   * Inicializa el sistema de throttling
   */
  initializeThrottling() {
    if (!existsSync(this.throttleConfigPath)) {
      const throttleData = {
        executions: [],
        violations: [],
        lastReset: new Date().toISOString(),
        currentBackoff: 0
      };
      writeFileSync(
        this.throttleConfigPath,
        JSON.stringify(throttleData, null, 2)
      );
    }
  }

  /**
   * Inicializa el monitoreo de performance
   */
  initializePerformanceMonitoring() {
    if (!existsSync(this.performanceMetricsPath)) {
      const metrics = {
        executions: [],
        averageExecutionTime: 0,
        peakMemoryUsage: 0,
        slowExecutions: 0,
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(
        this.performanceMetricsPath,
        JSON.stringify(metrics, null, 2)
      );
    }
  }

  /**
   * Verifica si se puede ejecutar el agente de rules
   */
  async canExecute(context = {}) {
    try {
      console.log(
        '🛡️  [RULES-PROTECTION] Verificando permisos de ejecución...'
      );

      // 1. Verificar throttling
      if (!(await this.checkThrottling())) {
        console.log(
          '⏸️  [RULES-PROTECTION] Ejecución bloqueada por throttling'
        );
        return { allowed: false, reason: 'throttling' };
      }

      // 2. Verificar límites de actividad
      if (!(await this.checkActivityLimits())) {
        console.log(
          '⏸️  [RULES-PROTECTION] Ejecución bloqueada por límites de actividad'
        );
        return { allowed: false, reason: 'activity_limits' };
      }

      // 3. Verificar performance
      if (!(await this.checkPerformance())) {
        console.log(
          '⏸️  [RULES-PROTECTION] Ejecución bloqueada por problemas de performance'
        );
        return { allowed: false, reason: 'performance' };
      }

      // 4. Verificar circuit breaker
      if (!(await this.checkCircuitBreaker())) {
        console.log(
          '⏸️  [RULES-PROTECTION] Ejecución bloqueada por circuit breaker'
        );
        return { allowed: false, reason: 'circuit_breaker' };
      }

      // 5. Verificar interferencia con otros agentes
      if (!(await this.checkAgentInterference())) {
        console.log(
          '⏸️  [RULES-PROTECTION] Ejecución bloqueada por interferencia con otros agentes'
        );
        return { allowed: false, reason: 'agent_interference' };
      }

      console.log('✅ [RULES-PROTECTION] Ejecución permitida');
      return { allowed: true, reason: 'approved' };
    } catch (error) {
      console.error(
        '❌ [RULES-PROTECTION] Error verificando permisos:',
        error.message
      );
      return { allowed: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Verifica throttling
   */
  async checkThrottling() {
    const throttleData = JSON.parse(
      readFileSync(this.throttleConfigPath, 'utf8')
    );
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.throttling.windowSize
    );

    // Filtrar ejecuciones dentro de la ventana
    const recentExecutions = throttleData.executions.filter(
      exec => new Date(exec.timestamp) > windowStart
    );

    // Verificar si excede el límite
    if (recentExecutions.length >= this.config.throttling.maxExecutions) {
      await this.recordViolation('throttling_exceeded', {
        executions: recentExecutions.length,
        limit: this.config.throttling.maxExecutions
      });
      return false;
    }

    // Verificar backoff
    if (throttleData.currentBackoff > 0) {
      const lastExecution =
        throttleData.executions[throttleData.executions.length - 1];
      if (
        lastExecution &&
        now - new Date(lastExecution.timestamp) < throttleData.currentBackoff
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica límites de actividad
   */
  async checkActivityLimits() {
    const activityLog = await this.getActivityLog();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Contar actividades en la última hora
    const recentActivities = activityLog.filter(
      activity => new Date(activity.timestamp) > oneHourAgo
    );

    const taskCreations = recentActivities.filter(
      a => a.type === 'task_creation'
    ).length;
    const fileCreations = recentActivities.filter(
      a => a.type === 'file_creation'
    ).length;
    const dbWrites = recentActivities.filter(a => a.type === 'db_write').length;

    // Verificar límites
    if (taskCreations >= this.config.protection.maxTasksPerHour) {
      await this.recordViolation('max_tasks_exceeded', {
        count: taskCreations
      });
      return false;
    }

    if (fileCreations >= this.config.protection.maxFileCreationsPerHour) {
      await this.recordViolation('max_file_creations_exceeded', {
        count: fileCreations
      });
      return false;
    }

    if (dbWrites >= this.config.protection.maxDbWritesPerHour) {
      await this.recordViolation('max_db_writes_exceeded', { count: dbWrites });
      return false;
    }

    return true;
  }

  /**
   * Verifica performance
   */
  async checkPerformance() {
    const metrics = JSON.parse(
      readFileSync(this.performanceMetricsPath, 'utf8')
    );

    // Verificar tiempo de ejecución promedio
    if (
      metrics.averageExecutionTime > this.config.performance.maxExecutionTime
    ) {
      await this.recordViolation('performance_degraded', {
        averageTime: metrics.averageExecutionTime,
        threshold: this.config.performance.maxExecutionTime
      });
      return false;
    }

    // Verificar uso de memoria
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > this.config.performance.maxMemoryUsage) {
      await this.recordViolation('memory_usage_high', {
        current: currentMemory,
        threshold: this.config.performance.maxMemoryUsage
      });
      return false;
    }

    return true;
  }

  /**
   * Verifica circuit breaker
   */
  async checkCircuitBreaker() {
    const throttleData = JSON.parse(
      readFileSync(this.throttleConfigPath, 'utf8')
    );
    const recentViolations = throttleData.violations.filter(violation => {
      const violationTime = new Date(violation.timestamp);
      const oneHourAgo = new Date(Date.now() - 3600000);
      return violationTime > oneHourAgo;
    });

    if (
      recentViolations.length >= this.config.protection.circuitBreakerThreshold
    ) {
      await this.recordViolation('circuit_breaker_triggered', {
        violations: recentViolations.length,
        threshold: this.config.protection.circuitBreakerThreshold
      });
      return false;
    }

    return true;
  }

  /**
   * Verifica interferencia con otros agentes
   */
  async checkAgentInterference() {
    // Verificar si otros agentes están ejecutándose
    const agentProcesses = await this.getRunningAgentProcesses();

    if (agentProcesses.length > 0) {
      console.log(
        '⚠️  [RULES-PROTECTION] Otros agentes ejecutándose:',
        agentProcesses
      );

      // Verificar si hay conflictos potenciales
      const conflicts = await this.detectAgentConflicts(agentProcesses);
      if (conflicts.length > 0) {
        await this.recordViolation('agent_conflict_detected', { conflicts });
        return false;
      }
    }

    return true;
  }

  /**
   * Obtiene procesos de agentes MCP ejecutándose
   */
  async getRunningAgentProcesses() {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      // Buscar solo procesos MCP específicos, no procesos del sistema
      const { stdout } = await execAsync(
        'ps aux | grep -E "(agents/|orchestration/)" | grep -v grep'
      );

      const processes = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .filter(line => {
          // Filtrar solo procesos MCP reales
          return line.includes('agents/') ||
                 line.includes('orchestration/') ||
                 line.includes('core/rules-enforcer') ||
                 line.includes('core/auto-rules-hook');
        });

      return processes;
    } catch (error) {
      console.log(
        '⚠️  [RULES-PROTECTION] Error obteniendo procesos:',
        error.message
      );
      return [];
    }
  }

  /**
   * Detecta conflictos entre agentes
   */
  async detectAgentConflicts(processes) {
    const conflicts = [];

    // Verificar conflictos de archivos
    const fileConflicts = processes.filter(
      proc =>
        proc.includes('taskdb.json') ||
        proc.includes('workflows.json') ||
        proc.includes('.reports/')
    );

    if (fileConflicts.length > 0) {
      conflicts.push({
        type: 'file_access',
        processes: fileConflicts
      });
    }

    // Verificar conflictos de puertos
    const portConflicts = processes.filter(
      proc =>
        proc.includes(':3000') ||
        proc.includes(':8080') ||
        proc.includes(':9000')
    );

    if (portConflicts.length > 0) {
      conflicts.push({
        type: 'port_conflict',
        processes: portConflicts
      });
    }

    return conflicts;
  }

  /**
   * Registra una violación
   */
  async recordViolation(type, details) {
    const throttleData = JSON.parse(
      readFileSync(this.throttleConfigPath, 'utf8')
    );

    const violation = {
      type,
      details,
      timestamp: new Date().toISOString()
    };

    throttleData.violations.push(violation);

    // Aplicar backoff exponencial
    throttleData.currentBackoff = Math.min(
      throttleData.currentBackoff * this.config.throttling.backoffMultiplier,
      this.config.throttling.maxBackoff
    );

    writeFileSync(
      this.throttleConfigPath,
      JSON.stringify(throttleData, null, 2)
    );

    console.log(`🚨 [RULES-PROTECTION] Violación registrada: ${type}`, details);
  }

  /**
   * Registra actividad
   */
  async recordActivity(type, details = {}) {
    const activity = {
      type,
      details,
      timestamp: new Date().toISOString()
    };

    const logLine = JSON.stringify(activity) + '\n';
    writeFileSync(this.activityLogPath, logLine, { flag: 'a' });
  }

  /**
   * Obtiene el log de actividad
   */
  async getActivityLog() {
    if (!existsSync(this.activityLogPath)) {
      return [];
    }

    const content = readFileSync(this.activityLogPath, 'utf8');
    return content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }

  /**
   * Registra métricas de performance
   */
  async recordPerformanceMetrics(executionTime, memoryUsage) {
    const metrics = JSON.parse(
      readFileSync(this.performanceMetricsPath, 'utf8')
    );

    const execution = {
      timestamp: new Date().toISOString(),
      executionTime,
      memoryUsage
    };

    metrics.executions.push(execution);

    // Mantener solo las últimas 100 ejecuciones
    if (metrics.executions.length > 100) {
      metrics.executions = metrics.executions.slice(-100);
    }

    // Calcular promedio de tiempo de ejecución
    const totalTime = metrics.executions.reduce(
      (sum, exec) => sum + exec.executionTime,
      0
    );
    metrics.averageExecutionTime = totalTime / metrics.executions.length;

    // Actualizar uso máximo de memoria
    metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, memoryUsage);

    // Contar ejecuciones lentas
    metrics.slowExecutions = metrics.executions.filter(
      exec => exec.executionTime > this.config.performance.slowQueryThreshold
    ).length;

    metrics.lastUpdated = new Date().toISOString();

    writeFileSync(
      this.performanceMetricsPath,
      JSON.stringify(metrics, null, 2)
    );
  }

  /**
   * Aplica throttling después de una ejecución
   */
  async applyThrottling() {
    const throttleData = JSON.parse(
      readFileSync(this.throttleConfigPath, 'utf8')
    );

    const execution = {
      timestamp: new Date().toISOString()
    };

    throttleData.executions.push(execution);

    // Limpiar ejecuciones antiguas
    const oneHourAgo = new Date(Date.now() - 3600000);
    throttleData.executions = throttleData.executions.filter(
      exec => new Date(exec.timestamp) > oneHourAgo
    );

    writeFileSync(
      this.throttleConfigPath,
      JSON.stringify(throttleData, null, 2)
    );
  }

  /**
   * Resetea el sistema de protección
   */
  async resetProtection() {
    const throttleData = {
      executions: [],
      violations: [],
      lastReset: new Date().toISOString(),
      currentBackoff: 0
    };

    writeFileSync(
      this.throttleConfigPath,
      JSON.stringify(throttleData, null, 2)
    );

    const metrics = {
      executions: [],
      averageExecutionTime: 0,
      peakMemoryUsage: 0,
      slowExecutions: 0,
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(
      this.performanceMetricsPath,
      JSON.stringify(metrics, null, 2)
    );

    console.log('🔄 [RULES-PROTECTION] Sistema de protección reseteado');
  }

  /**
   * Obtiene estadísticas de protección
   */
  async getProtectionStats() {
    const throttleData = JSON.parse(
      readFileSync(this.throttleConfigPath, 'utf8')
    );
    const metrics = JSON.parse(
      readFileSync(this.performanceMetricsPath, 'utf8')
    );
    const activityLog = await this.getActivityLog();

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const recentViolations = throttleData.violations.filter(
      violation => new Date(violation.timestamp) > oneHourAgo
    );

    const recentActivities = activityLog.filter(
      activity => new Date(activity.timestamp) > oneHourAgo
    );

    return {
      throttling: {
        executions: throttleData.executions.length,
        violations: recentViolations.length,
        currentBackoff: throttleData.currentBackoff
      },
      performance: {
        averageExecutionTime: metrics.averageExecutionTime,
        peakMemoryUsage: metrics.peakMemoryUsage,
        slowExecutions: metrics.slowExecutions
      },
      activity: {
        total: recentActivities.length,
        taskCreations: recentActivities.filter(a => a.type === 'task_creation')
          .length,
        fileCreations: recentActivities.filter(a => a.type === 'file_creation')
          .length,
        dbWrites: recentActivities.filter(a => a.type === 'db_write').length
      }
    };
  }
}

// Exportar para uso como módulo
export default RulesProtectionSystem;

// Si se ejecuta directamente, mostrar estadísticas
if (import.meta.url === `file://${process.argv[1]}`) {
  const protection = new RulesProtectionSystem();
  protection
    .getProtectionStats()
    .then(stats => {
      console.log('📊 [RULES-PROTECTION] Estadísticas del sistema:');
      console.log(JSON.stringify(stats, null, 2));
    })
    .catch(error => {
      console.error(
        '❌ [RULES-PROTECTION] Error obteniendo estadísticas:',
        error.message
      );
      process.exit(1);
    });
}
