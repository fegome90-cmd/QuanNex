/**
 * Provenance Verifier OLA 2 - Extendido con Snapshot Timestamp
 * Plan Maestro TaskDB - OLA 2: Antifrágil
 *
 * Extiende el Provenance Verifier con capacidades de snapshot temporal:
 * - verification_snapshot_ts para reconstruir estado histórico
 * - verified_at, policy_version_used, row_counts
 * - Verificación contra estado en timestamp específico
 */

import TaskDBCore from './taskdb-core.mjs';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

class ProvenanceVerifierOLA2 {
  constructor(taskDbConfig) {
    this.taskdb = new TaskDBCore(taskDbConfig);
    this.verificationResults = [];
  }

  /**
   * Verificar procedencia de reporte con snapshot timestamp
   * @param {object} report Reporte a verificar
   * @returns {object} Resultado de verificación extendido
   */
  async verifyReportProvenance(report) {
    const verification = {
      report_id: report.id,
      timestamp: new Date().toISOString(),
      status: 'pending',
      checks: [],
      errors: [],
      warnings: [],
      // NUEVOS CAMPOS OLA 2
      verified_at: new Date().toISOString(),
      policy_version_used: this.getCurrentPolicyVersion(),
      row_counts: this.getCurrentRowCounts(),
    };

    try {
      const provenance = report.report_provenance;

      if (!provenance) {
        verification.errors.push('Reporte no tiene report_provenance');
        verification.status = 'fail';
        return verification;
      }

      // Verificar estructura extendida OLA 2
      await this.verifyProvenanceStructureOLA2(provenance, verification);

      // Verificar snapshot timestamp (NUEVO OLA 2)
      await this.verifySnapshotTimestamp(provenance, verification);

      // Verificar IDs de tareas contra snapshot
      await this.verifyTaskIdsAgainstSnapshot(provenance, verification);

      // Verificar IDs de runs contra snapshot
      await this.verifyRunIdsAgainstSnapshot(provenance, verification);

      // Verificar hashes de artifacts contra snapshot
      await this.verifyArtifactHashesAgainstSnapshot(provenance, verification);

      // Verificar claims con estado derivado del snapshot
      await this.verifyClaimsAgainstSnapshot(provenance, verification);

      // Determinar estado final
      verification.status = verification.errors.length === 0 ? 'pass' : 'fail';
    } catch (error) {
      verification.status = 'error';
      verification.errors.push(`Error durante verificación: ${error.message}`);
    }

    this.verificationResults.push(verification);
    return verification;
  }

  /**
   * Verificar estructura extendida OLA 2
   */
  async verifyProvenanceStructureOLA2(provenance, verification) {
    const requiredFields = [
      'task_ids',
      'run_ids',
      'artifact_hashes',
      'verification_snapshot_ts', // OBLIGATORIO OLA 2
      'verified_at', // NUEVO OLA 2
      'policy_version_used', // NUEVO OLA 2
      'row_counts', // NUEVO OLA 2
    ];

    for (const field of requiredFields) {
      if (!provenance[field]) {
        verification.errors.push(`Campo requerido OLA 2 faltante: ${field}`);
      } else {
        verification.checks.push({
          check: 'provenance_structure_ola2',
          field,
          status: 'pass',
          message: `Campo OLA 2 ${field} presente`,
        });
      }
    }

    // Verificar claims_validated
    if (!Array.isArray(provenance.claims_validated)) {
      verification.errors.push('claims_validated debe ser un array');
    } else {
      verification.checks.push({
        check: 'claims_validated_ola2',
        field: 'claims_validated',
        status: 'pass',
        message: 'claims_validated es un array válido OLA 2',
      });
    }
  }

  /**
   * Verificar snapshot timestamp (NUEVO OLA 2)
   */
  async verifySnapshotTimestamp(provenance, verification) {
    const snapshotTs = provenance.verification_snapshot_ts;

    try {
      const snapshotDate = new Date(snapshotTs);
      const now = new Date();
      const ageDays = (now - snapshotDate) / (1000 * 60 * 60 * 24);

      if (isNaN(snapshotDate.getTime())) {
        verification.errors.push(`Snapshot timestamp inválido: ${snapshotTs}`);
        return;
      }

      verification.checks.push({
        check: 'snapshot_timestamp_ola2',
        status: 'pass',
        message: `Snapshot timestamp válido: ${snapshotTs}`,
        age_days: ageDays,
        snapshot_date: snapshotDate.toISOString(),
      });

      // Advertencia si el snapshot es muy viejo
      if (ageDays > 30) {
        verification.warnings.push(`Snapshot timestamp es viejo: ${ageDays.toFixed(1)} días`);
      }
    } catch (error) {
      verification.errors.push(`Error validando snapshot timestamp: ${error.message}`);
    }
  }

  /**
   * Verificar IDs de tareas contra snapshot temporal
   */
  async verifyTaskIdsAgainstSnapshot(provenance, verification) {
    const taskIds = provenance.task_ids || [];
    const snapshotTs = provenance.verification_snapshot_ts;

    for (const taskId of taskIds) {
      try {
        const task = this.taskdb.getTask(taskId);

        if (!task) {
          verification.errors.push(`Task ${taskId} no encontrada en TaskDB actual`);
          continue;
        }

        // Verificar que la tarea existía al momento del snapshot
        const taskCreatedAt = new Date(task.created_at);
        const snapshotDate = new Date(snapshotTs);

        if (taskCreatedAt <= snapshotDate) {
          verification.checks.push({
            check: 'task_exists_at_snapshot',
            task_id: taskId,
            status: 'pass',
            message: `Task existía al momento del snapshot: ${task.title}`,
            task_status: task.status,
            created_at: task.created_at,
            snapshot_ts: snapshotTs,
          });
        } else {
          verification.errors.push(
            `Task ${taskId} fue creada después del snapshot (${task.created_at} > ${snapshotTs})`
          );
        }
      } catch (error) {
        verification.errors.push(`Error verificando task ${taskId}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar IDs de runs contra snapshot temporal
   */
  async verifyRunIdsAgainstSnapshot(provenance, verification) {
    const runIds = provenance.run_ids || [];
    const snapshotTs = provenance.verification_snapshot_ts;

    for (const runId of runIds) {
      try {
        const run = this.taskdb.getRun(runId);

        if (!run) {
          verification.errors.push(`Run ${runId} no encontrado en TaskDB actual`);
          continue;
        }

        // Verificar que el run existía al momento del snapshot
        const runStartTime = new Date(run.start_time);
        const snapshotDate = new Date(snapshotTs);

        if (runStartTime <= snapshotDate) {
          verification.checks.push({
            check: 'run_exists_at_snapshot',
            run_id: runId,
            status: 'pass',
            message: `Run existía al momento del snapshot: ${run.status}`,
            run_status: run.status,
            start_time: run.start_time,
            snapshot_ts: snapshotTs,
          });
        } else {
          verification.errors.push(
            `Run ${runId} fue iniciado después del snapshot (${run.start_time} > ${snapshotTs})`
          );
        }
      } catch (error) {
        verification.errors.push(`Error verificando run ${runId}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar hashes de artifacts contra snapshot temporal
   */
  async verifyArtifactHashesAgainstSnapshot(provenance, verification) {
    const artifactHashes = provenance.artifact_hashes || [];
    const snapshotTs = provenance.verification_snapshot_ts;

    for (const hash of artifactHashes) {
      try {
        const artifact = this.taskdb.data.artifacts.find(a => a.hash === hash);

        if (!artifact) {
          verification.errors.push(`Artifact con hash ${hash} no encontrado`);
          continue;
        }

        // Verificar que el artifact existía al momento del snapshot
        const artifactCreatedAt = new Date(artifact.created_at);
        const snapshotDate = new Date(snapshotTs);

        if (artifactCreatedAt <= snapshotDate) {
          verification.checks.push({
            check: 'artifact_exists_at_snapshot',
            artifact_id: artifact.id,
            status: 'pass',
            message: `Artifact existía al momento del snapshot: ${artifact.name}`,
            artifact_type: artifact.type,
            size_bytes: artifact.size_bytes,
            created_at: artifact.created_at,
            snapshot_ts: snapshotTs,
          });

          // Verificar integridad del archivo si existe
          if (artifact.uri && artifact.uri !== '/dev/null') {
            await this.verifyArtifactIntegrityAtSnapshot(artifact, verification);
          }
        } else {
          verification.errors.push(
            `Artifact ${artifact.id} fue creado después del snapshot (${artifact.created_at} > ${snapshotTs})`
          );
        }
      } catch (error) {
        verification.errors.push(`Error verificando artifact con hash ${hash}: ${error.message}`);
      }
    }
  }

  /**
   * Verificar integridad de artifact al momento del snapshot
   */
  async verifyArtifactIntegrityAtSnapshot(artifact, verification) {
    try {
      const fileContent = readFileSync(artifact.uri);
      const calculatedHash = createHash('sha256').update(fileContent).digest('hex');

      if (calculatedHash === artifact.hash) {
        verification.checks.push({
          check: 'artifact_integrity_at_snapshot',
          artifact_id: artifact.id,
          status: 'pass',
          message: 'Hash del archivo coincide con el registrado al snapshot',
        });
      } else {
        verification.errors.push(
          `Hash del artifact ${artifact.id} no coincide: esperado ${artifact.hash}, actual ${calculatedHash}`
        );
      }
    } catch (error) {
      verification.errors.push(
        `Error verificando integridad del artifact ${artifact.id}: ${error.message}`
      );
    }
  }

  /**
   * Verificar claims contra estado derivado del snapshot
   */
  async verifyClaimsAgainstSnapshot(provenance, verification) {
    const claims = provenance.claims_validated || [];
    const snapshotTs = provenance.verification_snapshot_ts;

    for (const claim of claims) {
      try {
        const claimResult = await this.verifyClaimAgainstSnapshot(claim, verification, provenance);
        verification.checks.push({
          check: 'claim_verification_at_snapshot',
          claim: claim.claim,
          status: claimResult.status,
          message: claimResult.message,
          evidence: claim.evidence,
          snapshot_ts: snapshotTs,
        });
      } catch (error) {
        verification.errors.push(`Error verificando claim: ${error.message}`);
      }
    }
  }

  /**
   * Verificar un claim individual contra snapshot
   */
  async verifyClaimAgainstSnapshot(claim, verification, provenance) {
    const { claim: claimText, evidence, status: claimStatus } = claim;

    // Verificar que el claim tiene el formato esperado
    if (!claimText || typeof claimText !== 'string') {
      return {
        status: 'fail',
        message: 'Claim debe ser un string no vacío',
      };
    }

    // Verificar que tiene evidencia
    if (!evidence || typeof evidence !== 'string') {
      return {
        status: 'fail',
        message: 'Evidencia requerida para el claim',
      };
    }

    // Verificar contra el estado derivado de las tareas al snapshot
    const taskIds = provenance.task_ids || [];
    const snapshotTs = provenance.verification_snapshot_ts;

    for (const taskId of taskIds) {
      try {
        // Calcular estado derivado al momento del snapshot
        const statusDerived = this.calculateTaskStatusDerivedAtSnapshot(taskId, snapshotTs);

        // Verificar claims específicos
        if (claimText.includes('completada') || claimText.includes('completed')) {
          if (statusDerived.derived_status !== 'completed') {
            return {
              status: 'fail',
              message: `Claim de completitud no coincide con estado derivado al snapshot: ${statusDerived.derived_status}`,
            };
          }
        }

        if (claimText.includes('gates pasados') || claimText.includes('gates passed')) {
          if (statusDerived.failed_gates > 0) {
            return {
              status: 'fail',
              message: `Claim de gates pasados no coincide al snapshot: ${statusDerived.failed_gates} gates fallaron`,
            };
          }
        }
      } catch (error) {
        return {
          status: 'error',
          message: `Error verificando claim contra task ${taskId} al snapshot: ${error.message}`,
        };
      }
    }

    return {
      status: 'pass',
      message: 'Claim verificado exitosamente contra snapshot',
    };
  }

  /**
   * Calcular estado derivado de una tarea al momento del snapshot
   */
  calculateTaskStatusDerivedAtSnapshot(taskId, snapshotTs) {
    const task = this.taskdb.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} no encontrada`);
    }

    // Filtrar runs que existían al momento del snapshot
    const runsAtSnapshot = this.taskdb.data.runs.filter(
      run => run.task_id === taskId && new Date(run.start_time) <= new Date(snapshotTs)
    );

    // Filtrar gates que existían al momento del snapshot
    const gatesAtSnapshot = this.taskdb.data.gates.filter(gate => {
      const run = this.taskdb.data.runs.find(r => r.id === gate.run_id);
      return run && run.task_id === taskId && new Date(gate.created_at) <= new Date(snapshotTs);
    });

    const totalRuns = runsAtSnapshot.length;
    const successfulRuns = runsAtSnapshot.filter(r => r.status === 'completed').length;
    const totalGates = gatesAtSnapshot.length;
    const passedGates = gatesAtSnapshot.filter(g => g.status === 'pass').length;
    const failedGates = gatesAtSnapshot.filter(g => g.status === 'fail').length;

    const healthScore =
      totalRuns === 0
        ? 0.0
        : (successfulRuns / totalRuns) * (totalGates === 0 ? 1 : passedGates / totalGates);

    let derivedStatus;
    if (failedGates > 0) {
      derivedStatus = 'blocked';
    } else if (successfulRuns === totalRuns && totalRuns > 0) {
      derivedStatus = 'completed';
    } else if (successfulRuns > 0) {
      derivedStatus = 'in_progress';
    } else {
      derivedStatus = 'pending';
    }

    return {
      task_id: taskId,
      snapshot_ts: snapshotTs,
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      total_gates: totalGates,
      passed_gates: passedGates,
      failed_gates: failedGates,
      health_score: healthScore,
      derived_status: derivedStatus,
    };
  }

  /**
   * Obtener versión de política actual
   */
  getCurrentPolicyVersion() {
    const policies = this.taskdb.data.policies;
    const activePolicy = policies.find(p => p.is_active);
    return activePolicy ? activePolicy.version : '1.0.0';
  }

  /**
   * Obtener conteos actuales de filas
   */
  getCurrentRowCounts() {
    return {
      tasks: this.taskdb.data.tasks.length,
      runs: this.taskdb.data.runs.length,
      gates: this.taskdb.data.gates.length,
      artifacts: this.taskdb.data.artifacts.length,
      events: this.taskdb.data.events.length,
      reports: this.taskdb.data.reports.length,
    };
  }

  /**
   * Obtener estadísticas de verificación
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
   * Generar recomendaciones basadas en estadísticas
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

  /**
   * Cerrar conexiones
   */
  close() {
    this.taskdb.close();
  }
}

export default ProvenanceVerifierOLA2;
