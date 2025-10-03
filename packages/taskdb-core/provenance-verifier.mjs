#!/usr/bin/env node

/**
 * Provenance Verifier - Sistema de Verificación de Procedencia
 * Plan Maestro TaskDB - Ola 1: Robustez
 *
 * Implementa verificación activa de procedencia para reportes:
 * - Verifica existencia de IDs y hashes
 * - Valida claims contra status_derived
 * - Requiere verification_snapshot_ts
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import TaskDBCore from './taskdb-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProvenanceVerifier {
  constructor(taskdbCore) {
    this.taskdb = taskdbCore;
    this.verificationResults = [];
  }

  /**
   * Verificar procedencia de un reporte
   */
  async verifyReportProvenance(report) {
    const verification = {
      report_id: report.id,
      timestamp: new Date().toISOString(),
      status: 'pending',
      checks: [],
      errors: [],
      warnings: [],
    };

    try {
      // Verificar estructura básica del provenance
      await this.verifyProvenanceStructure(report.report_provenance, verification);

      // Verificar snapshot timestamp
      await this.verifySnapshotTimestamp(report.report_provenance, verification);

      // Verificar task IDs
      await this.verifyTaskIds(report.report_provenance, verification);

      // Verificar run IDs
      await this.verifyRunIds(report.report_provenance, verification);

      // Verificar artifact hashes
      await this.verifyArtifactHashes(report.report_provenance, verification);

      // Verificar claims
      await this.verifyClaims(report.report_provenance, verification);

      // Determinar estado final
      verification.status = verification.errors.length === 0 ? 'pass' : 'fail';
    } catch (error) {
      verification.status = 'error';
      verification.errors.push(`Error crítico: ${error.message}`);
    }

    this.verificationResults.push(verification);
    return verification;
  }

  /**
   * Verificar estructura del provenance
   */
  async verifyProvenanceStructure(provenance, verification) {
    const requiredFields = ['task_ids', 'run_ids', 'artifact_hashes', 'verification_snapshot_ts'];

    for (const field of requiredFields) {
      if (!provenance[field]) {
        verification.errors.push(`Campo requerido faltante en provenance: ${field}`);
      } else {
        verification.checks.push({
          check: 'provenance_structure',
          field,
          status: 'pass',
          message: `Campo ${field} presente`,
        });
      }
    }

    // Verificar que claims_validated existe si está presente
    if (provenance.claims_validated) {
      if (!Array.isArray(provenance.claims_validated)) {
        verification.errors.push('claims_validated debe ser un array');
      } else {
        verification.checks.push({
          check: 'provenance_structure',
          field: 'claims_validated',
          status: 'pass',
          message: 'claims_validated es un array válido',
        });
      }
    }
  }

  /**
   * Verificar snapshot timestamp
   */
  async verifySnapshotTimestamp(provenance, verification) {
    const snapshotTs = provenance.verification_snapshot_ts;

    try {
      const snapshotDate = new Date(snapshotTs);
      const now = new Date();
      const ageMs = now.getTime() - snapshotDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      verification.checks.push({
        check: 'snapshot_timestamp',
        status: 'pass',
        message: `Snapshot timestamp válido: ${snapshotTs}`,
        age_days: ageDays,
      });

      // Advertir si el snapshot es muy viejo
      if (ageDays > 7) {
        verification.warnings.push(`Snapshot timestamp es viejo: ${ageDays.toFixed(1)} días`);
      }
    } catch (error) {
      verification.errors.push(`Snapshot timestamp inválido: ${snapshotTs}`);
    }
  }

  /**
   * Verificar task IDs
   */
  async verifyTaskIds(provenance, verification) {
    const taskIds = provenance.task_ids || [];

    for (const taskId of taskIds) {
      try {
        const task = this.taskdb.data.tasks.find(t => t.id === taskId);
        if (!task) {
          verification.errors.push(`Task ID no encontrado: ${taskId}`);
        } else {
          verification.checks.push({
            check: 'task_id_verification',
            task_id: taskId,
            status: 'pass',
            message: `Task encontrada: ${task.title}`,
            task_status: task.status,
          });
        }
      } catch (error) {
        verification.errors.push(`Error verificando task ID ${taskId}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar run IDs
   */
  async verifyRunIds(provenance, verification) {
    const runIds = provenance.run_ids || [];

    for (const runId of runIds) {
      try {
        const run = this.taskdb.data.runs.find(r => r.id === runId);
        if (!run) {
          verification.errors.push(`Run ID no encontrado: ${runId}`);
        } else {
          verification.checks.push({
            check: 'run_id_verification',
            run_id: runId,
            status: 'pass',
            message: `Run encontrado: ${run.status}`,
            run_status: run.status,
            duration_ms: run.duration_ms,
          });
        }
      } catch (error) {
        verification.errors.push(`Error verificando run ID ${runId}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar artifact hashes
   */
  async verifyArtifactHashes(provenance, verification) {
    const artifactHashes = provenance.artifact_hashes || [];

    for (const hash of artifactHashes) {
      try {
        const artifact = this.taskdb.data.artifacts.find(a => a.hash === hash);
        if (!artifact) {
          verification.errors.push(`Artifact hash no encontrado: ${hash}`);
        } else {
          verification.checks.push({
            check: 'artifact_hash_verification',
            hash,
            status: 'pass',
            message: `Artifact encontrado: ${artifact.name}`,
            artifact_type: artifact.type,
            size_bytes: artifact.size_bytes,
          });

          // Verificar integridad del hash si el archivo existe
          await this.verifyArtifactIntegrity(artifact, verification);
        }
      } catch (error) {
        verification.errors.push(`Error verificando artifact hash ${hash}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar integridad de un artifact
   */
  async verifyArtifactIntegrity(artifact, verification) {
    try {
      if (existsSync(artifact.uri)) {
        const fileContent = readFileSync(artifact.uri);
        const calculatedHash = createHash('sha256').update(fileContent).digest('hex');

        if (calculatedHash === artifact.hash) {
          verification.checks.push({
            check: 'artifact_integrity',
            artifact_id: artifact.id,
            status: 'pass',
            message: 'Hash del archivo coincide con el registrado',
          });
        } else {
          verification.errors.push(`Hash del archivo no coincide: ${artifact.uri}`);
        }
      } else {
        verification.warnings.push(`Archivo no encontrado: ${artifact.uri}`);
      }
    } catch (error) {
      verification.errors.push(
        `Error verificando integridad del artifact ${artifact.id}: ${error.message}`
      );
    }
  }

  /**
   * Verificar claims
   */
  async verifyClaims(provenance, verification) {
    const claims = provenance.claims_validated || [];

    for (const claim of claims) {
      try {
        const claimResult = await this.verifyClaim(claim, verification, provenance);
        verification.checks.push({
          check: 'claim_verification',
          claim: claim.claim,
          status: claimResult.status,
          message: claimResult.message,
          evidence: claim.evidence,
        });
      } catch (error) {
        verification.errors.push(`Error verificando claim: ${error.message}`);
      }
    }
  }

  /**
   * Verificar un claim individual
   */
  async verifyClaim(claim, verification, provenance) {
    const { claim: claimText, evidence, status: claimStatus } = claim;

    // Verificar que el claim tiene el formato esperado
    if (!claimText || typeof claimText !== 'string') {
      return {
        status: 'fail',
        message: 'Claim debe ser un string no vacío',
      };
    }

    // Verificar que la evidencia existe
    if (!evidence) {
      return {
        status: 'fail',
        message: 'Evidencia requerida para el claim',
      };
    }

    // Verificar contra el estado derivado de las tareas
    const taskIds = provenance.task_ids || [];
    for (const taskId of taskIds) {
      try {
        const statusDerived = this.taskdb.calculateTaskStatusDerived(taskId);

        // Ejemplo de verificación: si el claim dice que la tarea está completada
        if (claimText.includes('completada') || claimText.includes('completed')) {
          if (statusDerived.derived_status !== 'completed') {
            return {
              status: 'fail',
              message: `Claim de completitud no coincide con estado derivado: ${statusDerived.derived_status}`,
            };
          }
        }

        // Ejemplo de verificación: si el claim dice que la tarea pasó todos los gates
        if (claimText.includes('gates') && claimText.includes('pasaron')) {
          if (statusDerived.failed_gates > 0) {
            return {
              status: 'fail',
              message: `Claim de gates pasados no coincide: ${statusDerived.failed_gates} gates fallaron`,
            };
          }
        }
      } catch (error) {
        return {
          status: 'error',
          message: `Error verificando claim contra task ${taskId}: ${error.message}`,
        };
      }
    }

    return {
      status: 'pass',
      message: 'Claim verificado exitosamente',
    };
  }

  /**
   * Obtener estadísticas de verificaciones
   */
  getVerificationStats() {
    const total = this.verificationResults.length;
    const passed = this.verificationResults.filter(r => r.status === 'pass').length;
    const failed = this.verificationResults.filter(r => r.status === 'fail').length;
    const errors = this.verificationResults.filter(r => r.status === 'error').length;

    return {
      total_verifications: total,
      passed: passed,
      failed: failed,
      errors: errors,
      success_rate: total > 0 ? (passed / total) * 100 : 0,
    };
  }

  /**
   * Generar reporte de verificación
   */
  generateVerificationReport() {
    const stats = this.getVerificationStats();

    return {
      timestamp: new Date().toISOString(),
      summary: stats,
      details: this.verificationResults,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generar recomendaciones basadas en los resultados
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.success_rate < 95) {
      recommendations.push({
        type: 'critical',
        message: 'Tasa de éxito de verificación por debajo del 95%',
        action: 'Revisar y corregir reportes con verificación fallida',
      });
    }

    if (stats.errors > 0) {
      recommendations.push({
        type: 'high',
        message: `${stats.errors} verificaciones tuvieron errores críticos`,
        action: 'Investigar y corregir errores en el sistema de verificación',
      });
    }

    if (stats.failed > stats.passed) {
      recommendations.push({
        type: 'medium',
        message: 'Más verificaciones fallaron que pasaron',
        action: 'Revisar calidad de los reportes y proceso de generación',
      });
    }

    return recommendations;
  }
}

export default ProvenanceVerifier;
