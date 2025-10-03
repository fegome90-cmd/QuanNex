/**
 * Tests para ProvenanceVerifier Hardened
 * Plan Maestro TaskDB - OLA 2: Antifrágil
 *
 * Tests que validan los blindajes de seguridad, integridad y operatividad.
 * Estos tests NO prueban el caso feliz - prueban que los blindajes funcionan
 * y que el sistema falla como y cuando debe.
 */

import ProvenanceVerifierHardened from './provenance-verifier-hardened.mjs';
import TaskDBCore from './taskdb-core.mjs';

// Mock del TaskDBCore para tests controlados
class MockTaskDBCore {
  constructor() {
    this.data = {
      tasks: [],
      runs: [],
      gates: [],
      artifacts: [],
      events: [],
      reports: [],
      policies: [],
    };
  }

  getTask(id) {
    return this.data.tasks.find(t => t.id === id);
  }

  getRun(id) {
    return this.data.runs.find(r => r.id === id);
  }

  createTask(taskData) {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.tasks.push(task);
    return task;
  }

  createRun(runData) {
    const run = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...runData,
      start_time: new Date().toISOString(),
    };
    this.data.runs.push(run);
    return run;
  }

  close() {}
}

describe('ProvenanceVerifier Security Hardening', () => {
  let verifier;
  let taskdb;

  beforeEach(() => {
    taskdb = new MockTaskDBCore();
    verifier = new ProvenanceVerifierHardened({ taskdb });
  });

  afterEach(() => {
    verifier.close();
  });

  describe('BLINDAJE 1: Seguridad de Timestamp', () => {
    it('should REJECT a snapshot_ts from the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const maliciousProvenance = {
        verification_snapshot_ts: futureDate.toISOString(),
        task_ids: [],
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: {},
      };

      const report = {
        id: 'test-report-future',
        report_provenance: maliciousProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.security_checks).toContainEqual(
        expect.objectContaining({
          check: 'timestamp_future',
          status: 'fail',
          message: 'Security validation failed: verification_snapshot_ts cannot be in the future.',
        })
      );
    });

    it('should REJECT a snapshot_ts older than the configured validity window', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 días atrás (límite es 7)

      const maliciousProvenance = {
        verification_snapshot_ts: oldDate.toISOString(),
        task_ids: [],
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: {},
      };

      const report = {
        id: 'test-report-old',
        report_provenance: maliciousProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.security_checks).toContainEqual(
        expect.objectContaining({
          check: 'timestamp_validity_window',
          status: 'fail',
          message: expect.stringContaining('is too old (max 7 days)'),
        })
      );
    });

    it('should REJECT an invalid timestamp format', async () => {
      const maliciousProvenance = {
        verification_snapshot_ts: 'invalid-date-format',
        task_ids: [],
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: {},
      };

      const report = {
        id: 'test-report-invalid',
        report_provenance: maliciousProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.security_checks).toContainEqual(
        expect.objectContaining({
          check: 'timestamp_format',
          status: 'fail',
          message: 'Invalid format for verification_snapshot_ts. Must be ISO8601.',
        })
      );
    });
  });

  describe('BLINDAJE 2: Integridad de Estructura', () => {
    it('should REJECT provenance missing required fields', async () => {
      const incompleteProvenance = {
        verification_snapshot_ts: new Date().toISOString(),
        // Faltan campos requeridos
        task_ids: [],
      };

      const report = {
        id: 'test-report-incomplete',
        report_provenance: incompleteProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.integrity_checks).toContainEqual(
        expect.objectContaining({
          check: 'required_field',
          field: 'run_ids',
          status: 'fail',
          message: 'Required field missing: run_ids',
        })
      );
    });

    it('should REJECT provenance with wrong data types', async () => {
      const wrongTypesProvenance = {
        verification_snapshot_ts: new Date().toISOString(),
        task_ids: 'not-an-array', // Debería ser array
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: {},
      };

      const report = {
        id: 'test-report-wrong-types',
        report_provenance: wrongTypesProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.integrity_checks).toContainEqual(
        expect.objectContaining({
          check: 'data_type',
          field: 'task_ids',
          status: 'fail',
          message: 'task_ids must be an array',
        })
      );
    });
  });

  describe('BLINDAJE 3: Límites de Recursos', () => {
    it('should REJECT provenance exceeding resource limits', async () => {
      const oversizedProvenance = {
        verification_snapshot_ts: new Date().toISOString(),
        task_ids: Array(1001)
          .fill()
          .map((_, i) => `task-${i}`), // Excede límite de 1000
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: {},
      };

      const report = {
        id: 'test-report-oversized',
        report_provenance: oversizedProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');
      expect(result.operability_checks).toContainEqual(
        expect.objectContaining({
          check: 'resource_limit',
          field: 'task_ids',
          status: 'fail',
          message: 'Resource limit exceeded for task_ids',
          details: 'Count: 1001, Limit: 1000',
        })
      );
    });
  });

  describe('BLINDAJE 4: Verificación de Claims con Errores Detallados', () => {
    it('should provide DETAILED error message when a claim fails verification', async () => {
      // Crear tarea que NO está completada
      const incompleteTask = taskdb.createTask({
        title: 'Incomplete Task',
        status: 'in_progress', // NO está completed
        priority: 'high',
      });

      const provenanceWithBadClaim = {
        verification_snapshot_ts: new Date().toISOString(),
        task_ids: [incompleteTask.id],
        run_ids: [],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: { tasks: 1, runs: 0, gates: 0, artifacts: 0, events: 0, reports: 0 },
        claims_validated: [
          {
            claim: 'Todas las tareas están completadas',
            evidence: 'Verificación de estado de tareas',
            status: 'validated',
          },
        ],
      };

      const report = {
        id: 'test-report-bad-claim',
        report_provenance: provenanceWithBadClaim,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');

      const failedCheck = result.operability_checks.find(c => c.status === 'fail');
      expect(failedCheck).toBeDefined();
      expect(failedCheck.details).toContain(`Task ${incompleteTask.id} had status 'in_progress'`);
      expect(failedCheck.details).toContain("Expected 'completed'");
    });

    it('should provide DETAILED error when gates fail verification', async () => {
      const task = taskdb.createTask({
        title: 'Task with Failed Gates',
        status: 'completed',
        priority: 'high',
      });

      const run = taskdb.createRun({
        task_id: task.id,
        status: 'completed',
      });

      // Crear gate que FALLA
      taskdb.data.gates.push({
        id: 'gate-failed',
        run_id: run.id,
        name: 'security_check',
        type: 'security',
        status: 'fail', // FALLA
        created_at: new Date().toISOString(),
      });

      const provenanceWithFailedGates = {
        verification_snapshot_ts: new Date().toISOString(),
        task_ids: [task.id],
        run_ids: [run.id],
        artifact_hashes: [],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: { tasks: 1, runs: 1, gates: 1, artifacts: 0, events: 0, reports: 0 },
        claims_validated: [
          {
            claim: 'Todos los gates pasaron',
            evidence: 'Verificación de gates de seguridad',
            status: 'validated',
          },
        ],
      };

      const report = {
        id: 'test-report-failed-gates',
        report_provenance: provenanceWithFailedGates,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');

      const failedCheck = result.operability_checks.find(c => c.status === 'fail');
      expect(failedCheck).toBeDefined();
      expect(failedCheck.details).toContain('had 1 failed gates');
      expect(failedCheck.details).toContain('security_check');
    });

    it('should provide DETAILED error when artifacts are created after snapshot', async () => {
      const task = taskdb.createTask({
        title: 'Task with Late Artifact',
        status: 'completed',
        priority: 'high',
      });

      const run = taskdb.createRun({
        task_id: task.id,
        status: 'completed',
      });

      const snapshotTs = new Date();
      snapshotTs.setHours(snapshotTs.getHours() - 2); // 2 horas atrás

      // Crear artifact DESPUÉS del snapshot
      const lateArtifact = {
        id: 'artifact-late',
        run_id: run.id,
        name: 'late_artifact.js',
        type: 'code',
        uri: '/tmp/late.js',
        hash: 'abc123def456',
        created_at: new Date().toISOString(), // AHORA (después del snapshot)
        size_bytes: 1024,
      };
      taskdb.data.artifacts.push(lateArtifact);

      const provenanceWithLateArtifact = {
        verification_snapshot_ts: snapshotTs.toISOString(),
        task_ids: [task.id],
        run_ids: [run.id],
        artifact_hashes: [lateArtifact.hash],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: { tasks: 1, runs: 1, gates: 0, artifacts: 1, events: 0, reports: 0 },
        claims_validated: [
          {
            claim: 'Implementación completada',
            evidence: 'Artifacts generados',
            status: 'validated',
          },
        ],
      };

      const report = {
        id: 'test-report-late-artifact',
        report_provenance: provenanceWithLateArtifact,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('fail');

      const failedCheck = result.operability_checks.find(c => c.status === 'fail');
      expect(failedCheck).toBeDefined();
      expect(failedCheck.details).toContain('was created at');
      expect(failedCheck.details).toContain('after snapshot_ts');
    });
  });

  describe('BLINDAJE 5: Casos de Éxito', () => {
    it('should PASS with valid provenance and correct claims', async () => {
      const task = taskdb.createTask({
        title: 'Completed Task',
        status: 'completed',
        priority: 'high',
      });

      const run = taskdb.createRun({
        task_id: task.id,
        status: 'completed',
      });

      // Crear gate que PASA
      taskdb.data.gates.push({
        id: 'gate-passed',
        run_id: run.id,
        name: 'security_check',
        type: 'security',
        status: 'pass',
        created_at: new Date().toISOString(),
      });

      const artifact = {
        id: 'artifact-valid',
        run_id: run.id,
        name: 'valid_artifact.js',
        type: 'code',
        uri: '/tmp/valid.js',
        hash: 'def456ghi789',
        created_at: new Date().toISOString(),
        size_bytes: 2048,
      };
      taskdb.data.artifacts.push(artifact);

      const validProvenance = {
        verification_snapshot_ts: new Date().toISOString(),
        task_ids: [task.id],
        run_ids: [run.id],
        artifact_hashes: [artifact.hash],
        verified_at: new Date().toISOString(),
        policy_version_used: '1.0.0',
        row_counts: { tasks: 1, runs: 1, gates: 1, artifacts: 1, events: 0, reports: 0 },
        claims_validated: [
          {
            claim: 'Implementación completada exitosamente',
            evidence: 'Todas las verificaciones pasaron',
            status: 'validated',
          },
        ],
      };

      const report = {
        id: 'test-report-valid',
        report_provenance: validProvenance,
      };

      const result = await verifier.verifyReportProvenance(report);

      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
      expect(result.security_checks.every(c => c.status === 'pass')).toBe(true);
      expect(result.integrity_checks.every(c => c.status === 'pass')).toBe(true);
      expect(result.operability_checks.every(c => c.status === 'pass')).toBe(true);
    });
  });

  describe('Estadísticas y Reportes', () => {
    it('should generate comprehensive verification statistics', async () => {
      // Ejecutar varias verificaciones para generar estadísticas
      const reports = [
        {
          id: 'test-1',
          report_provenance: {
            verification_snapshot_ts: new Date().toISOString(),
            task_ids: [],
            run_ids: [],
            artifact_hashes: [],
            verified_at: new Date().toISOString(),
            policy_version_used: '1.0.0',
            row_counts: {},
          },
        },
        {
          id: 'test-2',
          report_provenance: {
            verification_snapshot_ts: 'invalid-date',
            task_ids: [],
            run_ids: [],
            artifact_hashes: [],
            verified_at: new Date().toISOString(),
            policy_version_used: '1.0.0',
            row_counts: {},
          },
        },
      ];

      for (const report of reports) {
        await verifier.verifyReportProvenance(report);
      }

      const stats = verifier.getVerificationStats();

      expect(stats.total_verifications).toBe(2);
      expect(stats.security_checks).toBeDefined();
      expect(stats.integrity_checks).toBeDefined();
      expect(stats.operability_checks).toBeDefined();
      expect(stats.success_rate).toBeGreaterThanOrEqual(0);
      expect(stats.success_rate).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations based on verification results', async () => {
      // Ejecutar verificación que falla para generar recomendaciones
      const badReport = {
        id: 'test-bad',
        report_provenance: {
          verification_snapshot_ts: 'invalid-date',
          task_ids: [],
          run_ids: [],
          artifact_hashes: [],
          verified_at: new Date().toISOString(),
          policy_version_used: '1.0.0',
          row_counts: {},
        },
      };

      await verifier.verifyReportProvenance(badReport);
      const report = verifier.generateVerificationReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.configuration).toBeDefined();
    });
  });
});

// Función para ejecutar tests si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Ejecutando tests del ProvenanceVerifier Hardened...');

  // Mock de describe, it, expect para ejecución simple
  global.describe = (name, fn) => {
    console.log(`\n📋 ${name}`);
    fn();
  };

  global.it = (name, fn) => {
    console.log(`  ✅ ${name}`);
    return fn();
  };

  global.expect = actual => ({
    toBe: expected => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
      return true;
    },
    toContainEqual: expected => {
      if (!actual.some(item => JSON.stringify(item) === JSON.stringify(expected))) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      }
      return true;
    },
    toHaveLength: expected => {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual.length}`);
      }
      return true;
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
      return true;
    },
    toBeGreaterThanOrEqual: expected => {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
      return true;
    },
    toBeLessThanOrEqual: expected => {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
      return true;
    },
    toContain: expected => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
      return true;
    },
    stringContaining: expected => ({
      test: actual => actual.includes(expected),
    }),
    objectContaining: expected => ({
      test: actual => Object.keys(expected).every(key => actual[key] === expected[key]),
    }),
    every: predicate => {
      if (!actual.every(predicate)) {
        throw new Error('Expected all items to pass predicate');
      }
      return true;
    },
  });

  console.log('✅ Tests del ProvenanceVerifier Hardened completados');
}
