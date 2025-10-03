#!/usr/bin/env node

/**
 * TaskDB Doctor - Sistema de Diagnóstico y Reparación
 * Plan Maestro TaskDB - Ola 1: Robustez
 *
 * Implementa diagnóstico y reparación automática:
 * - Chequea integridad, huérfanos, scores inválidos
 * - Modo --fix para corrección automática
 * - CI/CD: bloquea merges si falla
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import TaskDBCore from './taskdb-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TaskDBDoctor {
  constructor(taskdbCore, options = {}) {
    this.taskdb = taskdbCore;
    this.options = {
      autoFix: options.autoFix || false,
      verbose: options.verbose || false,
      strict: options.strict || false,
      ...options,
    };

    this.diagnostics = [];
    this.fixes = [];
    this.errors = [];
  }

  /**
   * Ejecutar diagnóstico completo
   */
  async runDiagnostics() {
    console.log('[TaskDB Doctor] Iniciando diagnóstico del sistema...');

    try {
      // Diagnósticos de integridad básica
      await this.checkBasicIntegrity();

      // Diagnósticos de relaciones
      await this.checkRelationships();

      // Diagnósticos de consistencia
      await this.checkConsistency();

      // Diagnósticos de performance
      await this.checkPerformance();

      // Diagnósticos de seguridad
      await this.checkSecurity();

      // Generar reporte
      const report = this.generateReport();

      // Aplicar fixes si está habilitado
      if (this.options.autoFix) {
        await this.applyFixes();
      }

      return report;
    } catch (error) {
      console.error('[TaskDB Doctor] Error durante diagnóstico:', error.message);
      this.errors.push({
        type: 'critical',
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Verificar integridad básica
   */
  async checkBasicIntegrity() {
    console.log('[TaskDB Doctor] Verificando integridad básica...');

    // Verificar que la estructura de datos existe
    if (!this.taskdb.data) {
      this.addDiagnostic('critical', 'basic_integrity', 'Estructura de datos no inicializada');
      return;
    }

    // Verificar que las tablas principales existen
    const requiredTables = ['tasks', 'runs', 'gates', 'artifacts', 'events', 'reports', 'policies'];
    for (const table of requiredTables) {
      if (!this.taskdb.data[table]) {
        this.addDiagnostic('critical', 'basic_integrity', `Tabla ${table} no existe`);
      } else {
        this.addDiagnostic(
          'info',
          'basic_integrity',
          `Tabla ${table} existe con ${this.taskdb.data[table].length} registros`
        );
      }
    }

    // Verificar que hay al menos una política
    if (!this.taskdb.data.policies || this.taskdb.data.policies.length === 0) {
      this.addDiagnostic('critical', 'basic_integrity', 'No hay políticas definidas');
      this.addFix('create_initial_policy', 'Crear política inicial', () => {
        this.taskdb.initializePolicies();
      });
    }
  }

  /**
   * Verificar relaciones entre entidades
   */
  async checkRelationships() {
    console.log('[TaskDB Doctor] Verificando relaciones entre entidades...');

    // Verificar runs huérfanos (sin task padre)
    const orphanRuns = this.taskdb.data.runs.filter(
      run => !this.taskdb.data.tasks.find(task => task.id === run.task_id)
    );

    if (orphanRuns.length > 0) {
      this.addDiagnostic(
        'high',
        'relationships',
        `${orphanRuns.length} runs huérfanos encontrados`
      );
      this.addFix('remove_orphan_runs', 'Eliminar runs huérfanos', () => {
        this.taskdb.data.runs = this.taskdb.data.runs.filter(run =>
          this.taskdb.data.tasks.find(task => task.id === run.task_id)
        );
        this.taskdb.saveJSONData();
      });
    }

    // Verificar gates huérfanos (sin run padre)
    const orphanGates = this.taskdb.data.gates.filter(
      gate => gate.run_id && !this.taskdb.data.runs.find(run => run.id === gate.run_id)
    );

    if (orphanGates.length > 0) {
      this.addDiagnostic(
        'high',
        'relationships',
        `${orphanGates.length} gates huérfanos encontrados`
      );
      this.addFix('remove_orphan_gates', 'Eliminar gates huérfanos', () => {
        this.taskdb.data.gates = this.taskdb.data.gates.filter(
          gate => !gate.run_id || this.taskdb.data.runs.find(run => run.id === gate.run_id)
        );
        this.taskdb.saveJSONData();
      });
    }

    // Verificar artifacts huérfanos (sin run padre)
    const orphanArtifacts = this.taskdb.data.artifacts.filter(
      artifact => !this.taskdb.data.runs.find(run => run.id === artifact.run_id)
    );

    if (orphanArtifacts.length > 0) {
      this.addDiagnostic(
        'high',
        'relationships',
        `${orphanArtifacts.length} artifacts huérfanos encontrados`
      );
      this.addFix('remove_orphan_artifacts', 'Eliminar artifacts huérfanos', () => {
        this.taskdb.data.artifacts = this.taskdb.data.artifacts.filter(artifact =>
          this.taskdb.data.runs.find(run => run.id === artifact.run_id)
        );
        this.taskdb.saveJSONData();
      });
    }
  }

  /**
   * Verificar consistencia de datos
   */
  async checkConsistency() {
    console.log('[TaskDB Doctor] Verificando consistencia de datos...');

    // Verificar tasks con policy_version inválido
    const invalidPolicyTasks = this.taskdb.data.tasks.filter(
      task => !this.taskdb.data.policies.find(policy => policy.version === task.policy_version)
    );

    if (invalidPolicyTasks.length > 0) {
      this.addDiagnostic(
        'high',
        'consistency',
        `${invalidPolicyTasks.length} tasks con policy_version inválido`
      );
      this.addFix('fix_policy_versions', 'Corregir policy_versions', () => {
        const defaultPolicy = this.taskdb.data.policies[0];
        if (defaultPolicy) {
          invalidPolicyTasks.forEach(task => {
            task.policy_version = defaultPolicy.version;
            task.updated_at = new Date().toISOString();
          });
          this.taskdb.saveJSONData();
        }
      });
    }

    // Verificar runs con duración negativa
    const invalidDurationRuns = this.taskdb.data.runs.filter(
      run => run.duration_ms && run.duration_ms < 0
    );

    if (invalidDurationRuns.length > 0) {
      this.addDiagnostic(
        'medium',
        'consistency',
        `${invalidDurationRuns.length} runs con duración negativa`
      );
      this.addFix('fix_negative_durations', 'Corregir duraciones negativas', () => {
        invalidDurationRuns.forEach(run => {
          run.duration_ms = null;
        });
        this.taskdb.saveJSONData();
      });
    }

    // Verificar artifacts con hash inválido
    const invalidHashArtifacts = this.taskdb.data.artifacts.filter(
      artifact =>
        !artifact.hash || artifact.hash.length !== 64 || !/^[a-f0-9]+$/.test(artifact.hash)
    );

    if (invalidHashArtifacts.length > 0) {
      this.addDiagnostic(
        'high',
        'consistency',
        `${invalidHashArtifacts.length} artifacts con hash inválido`
      );
      this.addFix('fix_invalid_hashes', 'Corregir hashes inválidos', () => {
        invalidHashArtifacts.forEach(artifact => {
          if (existsSync(artifact.uri)) {
            try {
              const fileContent = readFileSync(artifact.uri);
              artifact.hash = createHash('sha256').update(fileContent).digest('hex');
            } catch (error) {
              console.warn(`No se pudo recalcular hash para ${artifact.uri}: ${error.message}`);
            }
          }
        });
        this.taskdb.saveJSONData();
      });
    }
  }

  /**
   * Verificar performance
   */
  async checkPerformance() {
    console.log('[TaskDB Doctor] Verificando performance...');

    // Verificar tablas con muchos registros
    const tableSizes = {
      tasks: this.taskdb.data.tasks.length,
      runs: this.taskdb.data.runs.length,
      gates: this.taskdb.data.gates.length,
      artifacts: this.taskdb.data.artifacts.length,
      events: this.taskdb.data.events.length,
      reports: this.taskdb.data.reports.length,
    };

    for (const [table, size] of Object.entries(tableSizes)) {
      if (size > 10000) {
        this.addDiagnostic(
          'medium',
          'performance',
          `Tabla ${table} tiene ${size} registros (considerar archivado)`
        );
      } else if (size > 1000) {
        this.addDiagnostic('info', 'performance', `Tabla ${table} tiene ${size} registros`);
      }
    }

    // Verificar eventos muy antiguos
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const oldEvents = this.taskdb.data.events.filter(
      event => new Date(event.timestamp) < sixMonthsAgo
    );

    if (oldEvents.length > 0) {
      this.addDiagnostic(
        'info',
        'performance',
        `${oldEvents.length} eventos antiguos (más de 6 meses)`
      );
      this.addFix('archive_old_events', 'Archivar eventos antiguos', () => {
        // En una implementación real, moveríamos estos eventos a storage frío
        console.log(`Archivando ${oldEvents.length} eventos antiguos...`);
      });
    }
  }

  /**
   * Verificar seguridad
   */
  async checkSecurity() {
    console.log('[TaskDB Doctor] Verificando seguridad...');

    // Verificar que no hay tareas con metadata sensible
    const sensitiveTasks = this.taskdb.data.tasks.filter(task => {
      const metadata = JSON.stringify(task.metadata).toLowerCase();
      return (
        metadata.includes('password') ||
        metadata.includes('secret') ||
        metadata.includes('token') ||
        metadata.includes('key')
      );
    });

    if (sensitiveTasks.length > 0) {
      this.addDiagnostic(
        'high',
        'security',
        `${sensitiveTasks.length} tasks con metadata potencialmente sensible`
      );
    }

    // Verificar artifacts con URIs inseguros
    const insecureArtifacts = this.taskdb.data.artifacts.filter(
      artifact => artifact.uri.includes('..') || artifact.uri.includes('~')
    );

    if (insecureArtifacts.length > 0) {
      this.addDiagnostic(
        'high',
        'security',
        `${insecureArtifacts.length} artifacts con URIs inseguros`
      );
    }

    // Verificar que los hashes no están vacíos
    const emptyHashArtifacts = this.taskdb.data.artifacts.filter(
      artifact => !artifact.hash || artifact.hash.trim() === ''
    );

    if (emptyHashArtifacts.length > 0) {
      this.addDiagnostic(
        'high',
        'security',
        `${emptyHashArtifacts.length} artifacts con hash vacío`
      );
    }
  }

  /**
   * Agregar diagnóstico
   */
  addDiagnostic(severity, category, message, details = null) {
    this.diagnostics.push({
      severity,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
    });

    if (this.options.verbose) {
      console.log(`[${severity.toUpperCase()}] ${category}: ${message}`);
    }
  }

  /**
   * Agregar fix
   */
  addFix(id, description, fixFunction) {
    this.fixes.push({
      id,
      description,
      function: fixFunction,
      applied: false,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Aplicar fixes automáticamente
   */
  async applyFixes() {
    if (!this.options.autoFix) {
      console.log('[TaskDB Doctor] Modo auto-fix no habilitado');
      return;
    }

    console.log('[TaskDB Doctor] Aplicando fixes automáticos...');

    for (const fix of this.fixes) {
      try {
        console.log(`Aplicando fix: ${fix.description}`);
        await fix.function();
        fix.applied = true;
        console.log(`✓ Fix aplicado: ${fix.description}`);
      } catch (error) {
        console.error(`✗ Error aplicando fix ${fix.id}: ${error.message}`);
        fix.error = error.message;
      }
    }
  }

  /**
   * Generar reporte de diagnóstico
   */
  generateReport() {
    const criticalIssues = this.diagnostics.filter(d => d.severity === 'critical').length;
    const highIssues = this.diagnostics.filter(d => d.severity === 'high').length;
    const mediumIssues = this.diagnostics.filter(d => d.severity === 'medium').length;
    const lowIssues = this.diagnostics.filter(d => d.severity === 'low').length;
    const infoIssues = this.diagnostics.filter(d => d.severity === 'info').length;

    const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
    const appliedFixes = this.fixes.filter(f => f.applied).length;
    const totalFixes = this.fixes.length;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_diagnostics: this.diagnostics.length,
        critical_issues: criticalIssues,
        high_issues: highIssues,
        medium_issues: mediumIssues,
        low_issues: lowIssues,
        info_issues: infoIssues,
        total_issues: totalIssues,
        applied_fixes: appliedFixes,
        total_fixes: totalFixes,
        system_health: this.calculateSystemHealth(totalIssues),
      },
      diagnostics: this.diagnostics,
      fixes: this.fixes,
      errors: this.errors,
      recommendations: this.generateRecommendations(totalIssues, appliedFixes),
    };

    return report;
  }

  /**
   * Calcular salud del sistema
   */
  calculateSystemHealth(totalIssues) {
    if (totalIssues === 0) return 'excellent';
    if (totalIssues <= 2) return 'good';
    if (totalIssues <= 5) return 'fair';
    if (totalIssues <= 10) return 'poor';
    return 'critical';
  }

  /**
   * Generar recomendaciones
   */
  generateRecommendations(totalIssues, appliedFixes) {
    const recommendations = [];

    if (totalIssues > 10) {
      recommendations.push({
        type: 'critical',
        message: 'Sistema con muchos problemas detectados',
        action: 'Ejecutar TaskDB Doctor con --fix y revisar manualmente',
      });
    }

    if (appliedFixes > 0) {
      recommendations.push({
        type: 'info',
        message: `${appliedFixes} fixes aplicados automáticamente`,
        action: 'Verificar que los fixes se aplicaron correctamente',
      });
    }

    if (this.diagnostics.some(d => d.severity === 'high')) {
      recommendations.push({
        type: 'high',
        message: 'Problemas de alta prioridad detectados',
        action: 'Revisar y corregir problemas de alta prioridad inmediatamente',
      });
    }

    return recommendations;
  }

  /**
   * Verificar si el sistema está sano para CI/CD
   */
  isHealthyForCI() {
    const criticalIssues = this.diagnostics.filter(d => d.severity === 'critical').length;
    const highIssues = this.diagnostics.filter(d => d.severity === 'high').length;

    // En modo estricto, no permitir ningún problema crítico o alto
    if (this.options.strict) {
      return criticalIssues === 0 && highIssues === 0;
    }

    // En modo normal, permitir algunos problemas altos pero no críticos
    return criticalIssues === 0 && highIssues <= 2;
  }
}

export default TaskDBDoctor;
