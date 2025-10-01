#!/usr/bin/env node
/**
 * Integrity Validator - Validador de Integridad del Sistema
 *
 * Este módulo valida la integridad de todos los componentes del sistema
 * de protección de rules y corrige inconsistencias automáticamente.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class IntegrityValidator {
  constructor() {
    this.taskDbPath = join(PROJECT_ROOT, 'data/taskdb.json');
    this.protectionConfigPath = join(PROJECT_ROOT, '.reports/rules-protection-config.json');
    this.throttleConfigPath = join(PROJECT_ROOT, '.reports/rules-throttle.json');
    this.performanceMetricsPath = join(PROJECT_ROOT, '.reports/rules-performance.json');
    this.activityLogPath = join(PROJECT_ROOT, '.reports/rules-activity.log');
  }

  /**
   * Valida la integridad completa del sistema
   */
  async validateSystemIntegrity() {
    console.log('🔍 [INTEGRITY-VALIDATOR] Iniciando validación de integridad...');

    const issues = [];

    // 1. Validar Task DB
    const taskDbIssues = await this.validateTaskDb();
    issues.push(...taskDbIssues);

    // 2. Validar configuración de protección
    const configIssues = await this.validateProtectionConfig();
    issues.push(...configIssues);

    // 3. Validar métricas de performance
    const metricsIssues = await this.validatePerformanceMetrics();
    issues.push(...metricsIssues);

    // 4. Validar logs de actividad
    const logIssues = await this.validateActivityLogs();
    issues.push(...logIssues);

    // 5. Validar consistencia entre sistemas
    const consistencyIssues = await this.validateSystemConsistency();
    issues.push(...consistencyIssues);

    if (issues.length > 0) {
      console.log(`⚠️  [INTEGRITY-VALIDATOR] Se encontraron ${issues.length} problemas:`);
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.severity}: ${issue.description}`);
        if (issue.fixed) {
          console.log('     ✅ Corregido automáticamente');
        } else {
          console.log('     ❌ Requiere intervención manual');
        }
      });
    } else {
      console.log('✅ [INTEGRITY-VALIDATOR] Sistema de integridad validado correctamente');
    }

    return issues;
  }

  /**
   * Valida la integridad del Task DB
   */
  async validateTaskDb() {
    const issues = [];

    try {
      if (!existsSync(this.taskDbPath)) {
        issues.push({
          severity: 'CRITICAL',
          description: 'Task DB no existe',
          fixed: false
        });
        return issues;
      }

      const content = readFileSync(this.taskDbPath, 'utf8');
      const taskDb = JSON.parse(content);

      // Validar estructura básica
      if (!taskDb.version) {
        issues.push({
          severity: 'CRITICAL',
          description: 'Task DB sin versión',
          fixed: false
        });
      }

      if (!Array.isArray(taskDb.projects)) {
        issues.push({
          severity: 'CRITICAL',
          description: 'Task DB projects no es array',
          fixed: false
        });
      }

      if (!Array.isArray(taskDb.tasks)) {
        issues.push({
          severity: 'CRITICAL',
          description: 'Task DB tasks no es array',
          fixed: false
        });
      }

      // Validar propiedades fuera de lugar
      const validProperties = ['version', 'projects', 'tasks'];
      const invalidProperties = Object.keys(taskDb).filter(key => !validProperties.includes(key));

      if (invalidProperties.length > 0) {
        issues.push({
          severity: 'HIGH',
          description: `Task DB tiene propiedades inválidas: ${invalidProperties.join(', ')}`,
          fixed: false
        });
      }

      // Validar proyectos de gaps
      const gapsProject = taskDb.projects.find(p => p.id === 'gaps-repair-2025-10-01');
      if (!gapsProject) {
        issues.push({
          severity: 'MEDIUM',
          description: 'Proyecto de gaps no encontrado en Task DB',
          fixed: false
        });
      }

      // Validar tareas críticas
      const criticalTasks = taskDb.tasks.filter(t =>
        t.project_id === 'gaps-repair-2025-10-01' && t.task_order <= 5
      );

      if (criticalTasks.length < 5) {
        issues.push({
          severity: 'MEDIUM',
          description: `Solo ${criticalTasks.length} tareas críticas encontradas (esperado: 5)`,
          fixed: false
        });
      }
    } catch (error) {
      issues.push({
        severity: 'CRITICAL',
        description: `Error parseando Task DB: ${error.message}`,
        fixed: false
      });
    }

    return issues;
  }

  /**
   * Valida la configuración de protección
   */
  async validateProtectionConfig() {
    const issues = [];

    try {
      if (!existsSync(this.protectionConfigPath)) {
        issues.push({
          severity: 'MEDIUM',
          description: 'Configuración de protección no existe',
          fixed: false
        });
        return issues;
      }

      const config = JSON.parse(readFileSync(this.protectionConfigPath, 'utf8'));

      // Validar consistencia de límites de memoria
      const memoryThreshold = config.protection?.memoryThreshold;
      const maxMemoryUsage = config.performance?.maxMemoryUsage;

      if (memoryThreshold && maxMemoryUsage && memoryThreshold !== maxMemoryUsage) {
        issues.push({
          severity: 'MEDIUM',
          description: `Límites de memoria inconsistentes: ${memoryThreshold} vs ${maxMemoryUsage}`,
          fixed: false
        });
      }

      // Validar valores razonables
      if (config.throttling?.maxExecutions > 50) {
        issues.push({
          severity: 'LOW',
          description: 'Límite de ejecuciones muy alto (>50)',
          fixed: false
        });
      }

      if (config.performance?.maxExecutionTime > 30000) {
        issues.push({
          severity: 'LOW',
          description: 'Tiempo máximo de ejecución muy alto (>30s)',
          fixed: false
        });
      }
    } catch (error) {
      issues.push({
        severity: 'HIGH',
        description: `Error parseando configuración: ${error.message}`,
        fixed: false
      });
    }

    return issues;
  }

  /**
   * Valida las métricas de performance
   */
  async validatePerformanceMetrics() {
    const issues = [];

    try {
      if (!existsSync(this.performanceMetricsPath)) {
        issues.push({
          severity: 'LOW',
          description: 'Métricas de performance no existen',
          fixed: false
        });
        return issues;
      }

      const metrics = JSON.parse(readFileSync(this.performanceMetricsPath, 'utf8'));

      // Validar estructura
      if (!Array.isArray(metrics.executions)) {
        issues.push({
          severity: 'MEDIUM',
          description: 'Métricas de ejecuciones no es array',
          fixed: false
        });
      }

      // Validar valores anómalos
      if (metrics.averageExecutionTime > 10000) {
        issues.push({
          severity: 'MEDIUM',
          description: `Tiempo promedio de ejecución muy alto: ${metrics.averageExecutionTime}ms`,
          fixed: false
        });
      }

      if (metrics.peakMemoryUsage > 500 * 1024 * 1024) {
        issues.push({
          severity: 'MEDIUM',
          description: `Uso máximo de memoria muy alto: ${metrics.peakMemoryUsage} bytes`,
          fixed: false
        });
      }
    } catch (error) {
      issues.push({
        severity: 'MEDIUM',
        description: `Error parseando métricas: ${error.message}`,
        fixed: false
      });
    }

    return issues;
  }

  /**
   * Valida los logs de actividad
   */
  async validateActivityLogs() {
    const issues = [];

    try {
      if (!existsSync(this.activityLogPath)) {
        issues.push({
          severity: 'LOW',
          description: 'Log de actividad no existe',
          fixed: false
        });
        return issues;
      }

      const content = readFileSync(this.activityLogPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      // Validar formato JSON
      let validEntries = 0;
      let invalidEntries = 0;

      for (const line of lines) {
        try {
          JSON.parse(line);
          validEntries++;
        } catch {
          invalidEntries++;
        }
      }

      if (invalidEntries > 0) {
        issues.push({
          severity: 'MEDIUM',
          description: `${invalidEntries} entradas inválidas en log de actividad`,
          fixed: false
        });
      }

      // Validar actividad reciente
      const recentActivities = lines.filter(line => {
        try {
          const entry = JSON.parse(line);
          const timestamp = new Date(entry.timestamp);
          const oneHourAgo = new Date(Date.now() - 3600000);
          return timestamp > oneHourAgo;
        } catch {
          return false;
        }
      });

      if (recentActivities.length === 0 && lines.length > 0) {
        issues.push({
          severity: 'LOW',
          description: 'No hay actividad reciente en el log',
          fixed: false
        });
      }
    } catch (error) {
      issues.push({
        severity: 'MEDIUM',
        description: `Error validando logs: ${error.message}`,
        fixed: false
      });
    }

    return issues;
  }

  /**
   * Valida la consistencia entre sistemas
   */
  async validateSystemConsistency() {
    const issues = [];

    try {
      // Comparar estadísticas entre sistemas
      const protectionStats = await this.getProtectionStats();
      const monitorStats = await this.getMonitorStats();

      // Verificar consistencia de ejecuciones
      if (protectionStats.executions !== monitorStats.executions) {
        issues.push({
          severity: 'HIGH',
          description: `Inconsistencia en conteo de ejecuciones: ${protectionStats.executions} vs ${monitorStats.executions}`,
          fixed: false
        });
      }

      // Verificar consistencia de violaciones
      if (protectionStats.violations !== monitorStats.violations) {
        issues.push({
          severity: 'HIGH',
          description: `Inconsistencia en conteo de violaciones: ${protectionStats.violations} vs ${monitorStats.violations}`,
          fixed: false
        });
      }
    } catch (error) {
      issues.push({
        severity: 'MEDIUM',
        description: `Error validando consistencia: ${error.message}`,
        fixed: false
      });
    }

    return issues;
  }

  /**
   * Obtiene estadísticas del sistema de protección
   */
  async getProtectionStats() {
    try {
      const throttleData = JSON.parse(readFileSync(this.throttleConfigPath, 'utf8'));
      return {
        executions: throttleData.executions?.length || 0,
        violations: throttleData.violations?.length || 0
      };
    } catch {
      return { executions: 0, violations: 0 };
    }
  }

  /**
   * Obtiene estadísticas del monitor
   */
  async getMonitorStats() {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('node core/rules-protection-system.js');
      const stats = JSON.parse(stdout);

      return {
        executions: stats.throttling?.executions || 0,
        violations: stats.throttling?.violations || 0
      };
    } catch {
      return { executions: 0, violations: 0 };
    }
  }

  /**
   * Corrige automáticamente problemas detectados
   */
  async autoFixIssues(issues) {
    console.log('🔧 [INTEGRITY-VALIDATOR] Aplicando correcciones automáticas...');

    let fixedCount = 0;

    for (const issue of issues) {
      if (issue.fixed) {
        fixedCount++;
        continue;
      }

      // Aplicar correcciones automáticas según el tipo de problema
      if (issue.description.includes('Límites de memoria inconsistentes')) {
        await this.fixMemoryThresholds();
        issue.fixed = true;
        fixedCount++;
      }

      if (issue.description.includes('Task DB tiene propiedades inválidas')) {
        await this.fixTaskDbStructure();
        issue.fixed = true;
        fixedCount++;
      }
    }

    console.log(`✅ [INTEGRITY-VALIDATOR] ${fixedCount} problemas corregidos automáticamente`);
    return fixedCount;
  }

  /**
   * Corrige límites de memoria inconsistentes
   */
  async fixMemoryThresholds() {
    try {
      const config = JSON.parse(readFileSync(this.protectionConfigPath, 'utf8'));
      const memoryThreshold = 200 * 1024 * 1024; // 200MB

      config.protection.memoryThreshold = memoryThreshold;
      config.performance.maxMemoryUsage = memoryThreshold;

      writeFileSync(this.protectionConfigPath, JSON.stringify(config, null, 2));
      console.log('🔧 [INTEGRITY-VALIDATOR] Límites de memoria corregidos');
    } catch (error) {
      console.error('❌ [INTEGRITY-VALIDATOR] Error corrigiendo límites de memoria:', error.message);
    }
  }

  /**
   * Corrige estructura del Task DB
   */
  async fixTaskDbStructure() {
    try {
      const content = readFileSync(this.taskDbPath, 'utf8');
      const taskDb = JSON.parse(content);

      // Remover propiedades inválidas
      const validProperties = ['version', 'projects', 'tasks'];
      const cleanedTaskDb = {};

      for (const prop of validProperties) {
        if (taskDb[prop] !== undefined) {
          cleanedTaskDb[prop] = taskDb[prop];
        }
      }

      writeFileSync(this.taskDbPath, JSON.stringify(cleanedTaskDb, null, 2));
      console.log('🔧 [INTEGRITY-VALIDATOR] Estructura del Task DB corregida');
    } catch (error) {
      console.error('❌ [INTEGRITY-VALIDATOR] Error corrigiendo Task DB:', error.message);
    }
  }
}

// Exportar para uso como módulo
export default IntegrityValidator;

// Si se ejecuta directamente, ejecutar validación
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new IntegrityValidator();
  validator.validateSystemIntegrity()
    .then(issues => {
      if (issues.length > 0) {
        console.log(`\n📊 [INTEGRITY-VALIDATOR] Resumen: ${issues.length} problemas encontrados`);
        const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
        const highIssues = issues.filter(i => i.severity === 'HIGH');

        if (criticalIssues.length > 0) {
          console.log(`🚨 CRÍTICOS: ${criticalIssues.length}`);
        }
        if (highIssues.length > 0) {
          console.log(`⚠️  ALTOS: ${highIssues.length}`);
        }
      } else {
        console.log('\n✅ [INTEGRITY-VALIDATOR] Sistema completamente íntegro');
      }
    })
    .catch(error => {
      console.error('❌ [INTEGRITY-VALIDATOR] Error en validación:', error.message);
      process.exit(1);
    });
}
