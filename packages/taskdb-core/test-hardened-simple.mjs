#!/usr/bin/env node

/**
 * Test Simple del ProvenanceVerifier Hardened
 * Plan Maestro TaskDB - OLA 2: Antifrágil
 *
 * Tests que validan los blindajes de seguridad, integridad y operatividad.
 * Versión simplificada sin framework de testing.
 */

import ProvenanceVerifierHardened from './provenance-verifier-hardened.mjs';

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

  updateTask(id, updates) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      task.updated_at = new Date().toISOString();
    }
    return task;
  }

  close() {}
}

// Función de test simple
async function testHardenedVerifier() {
  console.log('🧪 Ejecutando tests del ProvenanceVerifier Hardened...\n');

  const taskdb = new MockTaskDBCore();
  const verifier = new ProvenanceVerifierHardened(taskdb);

  let testsPassed = 0;
  let testsFailed = 0;

  // Helper para ejecutar tests
  async function runTest(name, testFn) {
    try {
      console.log(`📋 ${name}`);
      await testFn();
      console.log(`  ✅ PASSED\n`);
      testsPassed++;
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}\n`);
      testsFailed++;
    }
  }

  // TEST 1: Rechazar timestamp del futuro
  await runTest('BLINDAJE 1: Rechazar snapshot_ts del futuro', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const futureCheck = result.security_checks.find(c => c.check === 'timestamp_future');
    if (!futureCheck || futureCheck.status !== 'fail') {
      throw new Error('Expected timestamp_future check to fail');
    }

    if (!futureCheck.message.includes('cannot be in the future')) {
      throw new Error('Expected error message about future timestamp');
    }
  });

  // TEST 2: Rechazar timestamp muy viejo
  await runTest('BLINDAJE 1: Rechazar snapshot_ts muy viejo', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const oldCheck = result.security_checks.find(c => c.check === 'timestamp_validity_window');
    if (!oldCheck || oldCheck.status !== 'fail') {
      throw new Error('Expected timestamp_validity_window check to fail');
    }

    if (!oldCheck.message.includes('too old')) {
      throw new Error('Expected error message about old timestamp');
    }
  });

  // TEST 3: Rechazar formato de timestamp inválido
  await runTest('BLINDAJE 1: Rechazar formato de timestamp inválido', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const formatCheck = result.security_checks.find(c => c.check === 'timestamp_format');
    if (!formatCheck || formatCheck.status !== 'fail') {
      throw new Error('Expected timestamp_format check to fail');
    }

    if (!formatCheck.message.includes('Invalid format')) {
      throw new Error('Expected error message about invalid format');
    }
  });

  // TEST 4: Rechazar provenance con campos faltantes
  await runTest('BLINDAJE 2: Rechazar provenance con campos faltantes', async () => {
    const incompleteProvenance = {
      verification_snapshot_ts: new Date().toISOString(),
      task_ids: [],
      // Faltan campos requeridos
    };

    const report = {
      id: 'test-report-incomplete',
      report_provenance: incompleteProvenance,
    };

    const result = await verifier.verifyReportProvenance(report);

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const missingFieldCheck = result.integrity_checks.find(
      c => c.check === 'required_field' && c.field === 'run_ids'
    );
    if (!missingFieldCheck || missingFieldCheck.status !== 'fail') {
      throw new Error('Expected required_field check for run_ids to fail');
    }

    if (!missingFieldCheck.message.includes('Required field missing')) {
      throw new Error('Expected error message about missing required field');
    }
  });

  // TEST 5: Rechazar provenance con tipos de datos incorrectos
  await runTest('BLINDAJE 2: Rechazar provenance con tipos incorrectos', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const typeCheck = result.integrity_checks.find(
      c => c.check === 'data_type' && c.field === 'task_ids'
    );
    if (!typeCheck || typeCheck.status !== 'fail') {
      throw new Error('Expected data_type check for task_ids to fail');
    }

    if (!typeCheck.message.includes('must be an array')) {
      throw new Error('Expected error message about array type');
    }
  });

  // TEST 6: Rechazar provenance que excede límites de recursos
  await runTest('BLINDAJE 3: Rechazar provenance que excede límites', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const limitCheck = result.operability_checks.find(
      c => c.check === 'resource_limit' && c.field === 'task_ids'
    );
    if (!limitCheck || limitCheck.status !== 'fail') {
      throw new Error('Expected resource_limit check for task_ids to fail');
    }

    if (!limitCheck.message.includes('Resource limit exceeded')) {
      throw new Error('Expected error message about resource limit');
    }

    if (!limitCheck.details.includes('Count: 1001, Limit: 1000')) {
      throw new Error('Expected detailed limit information');
    }
  });

  // TEST 7: Error detallado cuando claim falla
  await runTest('BLINDAJE 4: Error detallado cuando claim falla', async () => {
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

    if (result.status !== 'fail') {
      throw new Error(`Expected status 'fail', got '${result.status}'`);
    }

    const failedCheck = result.operability_checks.find(c => c.status === 'fail');
    if (!failedCheck) {
      throw new Error('Expected a failed operability check');
    }

    if (!failedCheck.details.includes(`Task ${incompleteTask.id} had status 'in_progress'`)) {
      throw new Error('Expected detailed error about task status');
    }

    if (!failedCheck.details.includes("Expected 'completed'")) {
      throw new Error('Expected detailed error about expected status');
    }
  });

  // TEST 8: Caso de éxito con provenance válido
  await runTest('BLINDAJE 5: Caso de éxito con provenance válido', async () => {
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

    if (result.status !== 'pass') {
      throw new Error(`Expected status 'pass', got '${result.status}'`);
    }

    if (result.errors.length > 0) {
      throw new Error(
        `Expected no errors, got ${result.errors.length}: ${result.errors.join(', ')}`
      );
    }

    const securityChecks = result.security_checks.every(c => c.status === 'pass');
    if (!securityChecks) {
      throw new Error('Expected all security checks to pass');
    }

    const integrityChecks = result.integrity_checks.every(c => c.status === 'pass');
    if (!integrityChecks) {
      throw new Error('Expected all integrity checks to pass');
    }

    const operabilityChecks = result.operability_checks.every(c => c.status === 'pass');
    if (!operabilityChecks) {
      throw new Error('Expected all operability checks to pass');
    }
  });

  // Generar reporte final
  console.log('📊 RESUMEN DE TESTS:');
  console.log(`✅ Tests pasados: ${testsPassed}`);
  console.log(`❌ Tests fallidos: ${testsFailed}`);
  console.log(
    `📈 Tasa de éxito: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`
  );

  if (testsFailed > 0) {
    console.log('\n❌ ALGUNOS TESTS FALLARON - Revisar implementación');
    process.exit(1);
  } else {
    console.log('\n🎉 TODOS LOS TESTS PASARON - Blindajes funcionando correctamente');
  }

  verifier.close();
}

// Ejecutar tests
testHardenedVerifier().catch(error => {
  console.error('❌ Error ejecutando tests:', error.message);
  process.exit(1);
});
