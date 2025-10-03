#!/usr/bin/env node

/**
 * Policy Versioning Acceptance Tests
 * Plan Maestro TaskDB - OLA 2: Políticas Versionadas
 * 
 * Tests de aceptación que validan la lógica de versionado de políticas
 */

import PolicyVersionManager from '../policy-version-manager.mjs';
import TaskDBCore from '../taskdb-core.mjs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

// Mock TaskDBCore para testing
class MockTaskDBCore {
  constructor() {
    this.tasks = new Map();
    this.runs = new Map();
    this.gates = new Map();
    this.nextId = 1;
  }

  createTask(taskData) {
    const id = `T-${this.nextId++}`;
    const task = {
      id,
      title: taskData.title || 'Test Task',
      description: taskData.description || '',
      status: 'pending',
      policy_version: taskData.policy_version || '1.0.0',
      created_at: new Date().toISOString(),
      ...taskData
    };
    this.tasks.set(id, task);
    return task;
  }

  createRun(runData) {
    const id = `R-${this.nextId++}`;
    const run = {
      id,
      task_id: runData.task_id,
      status: 'completed',
      created_at: new Date().toISOString(),
      ...runData
    };
    this.runs.set(id, run);
    return run;
  }

  createGate(gateData) {
    const id = `G-${this.nextId++}`;
    const gate = {
      id,
      run_id: gateData.run_id,
      type: gateData.type,
      status: gateData.status || 'pass',
      score: gateData.score || 0.95,
      created_at: new Date().toISOString(),
      ...gateData
    };
    this.gates.set(id, gate);
    return gate;
  }

  async getRunsByTaskId(taskId) {
    const runs = [];
    for (const run of this.runs.values()) {
      if (run.task_id === taskId) {
        runs.push(run);
      }
    }
    return runs;
  }

  async getGatesByRunId(runId) {
    const gates = [];
    for (const gate of this.gates.values()) {
      if (gate.run_id === runId) {
        gates.push(gate);
      }
    }
    return gates;
  }
}

// Helper para ejecutar tests
async function runTest(name, testFunction) {
  try {
    console.log(`🧪 Ejecutando: ${name}`);
    await testFunction();
    console.log(`✅ PASS: ${name}\n`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

// Helper para crear setup de test
function createTestSetup() {
  const taskdb = new MockTaskDBCore();
  const policyManager = new PolicyVersionManager();
  
  return { taskdb, policyManager };
}

async function testPolicyVersioning() {
  console.log('🧪 Policy Versioning Acceptance Tests');
  console.log('=====================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: COMPATIBILIDAD HACIA ATRÁS (EL MÁS CRÍTICO)
  const test1 = await runTest(
    'Validar tarea antigua (v1.0.0) como "done" después de actualizar política a v1.1.0',
    async () => {
      const { taskdb, policyManager } = createTestSetup();

      // SETUP: Crear tarea bajo política v1.0.0
      const task_v1 = taskdb.createTask({
        title: 'Tarea v1.0.0',
        policy_version: '1.0.0'
      });

      // Crear run y gates que cumplen con v1.0.0 (lint + security)
      const run = taskdb.createRun({ task_id: task_v1.id });
      taskdb.createGate({ run_id: run.id, type: 'lint', status: 'pass', score: 0.90 });
      taskdb.createGate({ run_id: run.id, type: 'security', status: 'pass', score: 0.95 });

      // ACTUAR: Validar si la tarea está "done"
      const result = await policyManager.isTaskConsideredDone(task_v1, taskdb);

      // ASSERT: Debe ser 'true' porque se evalúa contra v1.0.0
      if (!result.isDone) {
        throw new Error(`Expected task to be done, but got: ${JSON.stringify(result)}`);
      }

      if (result.reason !== 'all_criteria_met') {
        throw new Error(`Expected reason 'all_criteria_met', but got: ${result.reason}`);
      }
    }
  );

  if (test1) passed++; else failed++;

  // TEST 2: NUEVAS TAREAS USAN LA NUEVA POLÍTICA
  const test2 = await runTest(
    'Requerir que nueva tarea (v1.1.0) pase el nuevo gate "quality"',
    async () => {
      const { taskdb, policyManager } = createTestSetup();

      // SETUP: Crear tarea bajo política v1.1.0
      const task_v2 = taskdb.createTask({
        title: 'Tarea v1.1.0',
        policy_version: '1.1.0'
      });

      // Crear run con solo lint y security (falta quality)
      const run = taskdb.createRun({ task_id: task_v2.id });
      taskdb.createGate({ run_id: run.id, type: 'lint', status: 'pass', score: 0.95 });
      taskdb.createGate({ run_id: run.id, type: 'security', status: 'pass', score: 0.98 });

      // ACTUAR 1: Validar sin el gate 'quality'
      let result = await policyManager.isTaskConsideredDone(task_v2, taskdb);

      // ASSERT 1: Debe fallar porque falta 'quality'
      if (result.isDone) {
        throw new Error('Expected task to fail without quality gate');
      }

      if (result.reason !== 'missing_required_gates') {
        throw new Error(`Expected reason 'missing_required_gates', but got: ${result.reason}`);
      }

      if (!result.missing_gates.includes('quality')) {
        throw new Error('Expected missing_gates to include "quality"');
      }

      // ACTUAR 2: Añadir el gate 'quality'
      taskdb.createGate({ run_id: run.id, type: 'quality', status: 'pass', score: 0.85 });

      result = await policyManager.isTaskConsideredDone(task_v2, taskdb);

      // ASSERT 2: Ahora debe pasar
      if (!result.isDone) {
        throw new Error(`Expected task to pass with quality gate, but got: ${JSON.stringify(result)}`);
      }
    }
  );

  if (test2) passed++; else failed++;

  // TEST 3: GATE DE SEGURIDAD CONTRA VERSIONES INEXISTENTES
  const test3 = await runTest(
    'Lanzar error PolicyVersionNotFound para versión desconocida',
    async () => {
      const { taskdb, policyManager } = createTestSetup();

      // SETUP: Crear tarea con versión inexistente
      const rogueTask = taskdb.createTask({
        title: 'Tarea con versión inválida',
        policy_version: '9.9.9'
      });

      // ACTUAR Y ASSERT: Debe lanzar error
      try {
        await policyManager.isTaskConsideredDone(rogueTask, taskdb);
        throw new Error('Expected PolicyVersionNotFound error, but none was thrown');
      } catch (error) {
        if (!error.message.includes('PolicyVersionNotFound')) {
          throw new Error(`Expected PolicyVersionNotFound error, but got: ${error.message}`);
        }
        if (!error.message.includes('9.9.9')) {
          throw new Error('Error message should include the invalid version');
        }
      }
    }
  );

  if (test3) passed++; else failed++;

  // TEST 4: VALIDACIÓN DE UMBRALES MÁS ESTRICTOS
  const test4 = await runTest(
    'Validar que umbrales más estrictos en v1.1.0 se aplican correctamente',
    async () => {
      const { taskdb, policyManager } = createTestSetup();

      // SETUP: Crear tarea v1.1.0 con security score bajo (0.92 < 0.95)
      const task_v2 = taskdb.createTask({
        title: 'Tarea con security score bajo',
        policy_version: '1.1.0'
      });

      const run = taskdb.createRun({ task_id: task_v2.id });
      taskdb.createGate({ run_id: run.id, type: 'lint', status: 'pass', score: 0.95 });
      taskdb.createGate({ run_id: run.id, type: 'security', status: 'pass', score: 0.92 }); // Bajo threshold
      taskdb.createGate({ run_id: run.id, type: 'quality', status: 'pass', score: 0.85 });

      // ACTUAR: Validar tarea
      const result = await policyManager.isTaskConsideredDone(task_v2, taskdb);

      // ASSERT: Debe fallar por threshold
      if (result.isDone) {
        throw new Error('Expected task to fail due to low security threshold');
      }

      if (result.reason !== 'threshold_not_met') {
        throw new Error(`Expected reason 'threshold_not_met', but got: ${result.reason}`);
      }

      // Verificar que security está en failing_gates
      const securityFailing = result.failing_gates.find(g => g.type === 'security');
      if (!securityFailing) {
        throw new Error('Expected security gate to be in failing_gates');
      }
    }
  );

  if (test4) passed++; else failed++;

  // TEST 5: COMPATIBILIDAD ENTRE VERSIONES
  const test5 = await runTest(
    'Verificar información de compatibilidad entre versiones',
    async () => {
      const { policyManager } = createTestSetup();

      // ACTUAR: Obtener info de compatibilidad
      const compatInfo = policyManager.getCompatibilityInfo('1.0.0', '1.1.0');

      // ASSERT: Verificar cambios
      if (compatInfo.from_version !== '1.0.0') {
        throw new Error(`Expected from_version '1.0.0', but got: ${compatInfo.from_version}`);
      }

      if (compatInfo.to_version !== '1.1.0') {
        throw new Error(`Expected to_version '1.1.0', but got: ${compatInfo.to_version}`);
      }

      if (!compatInfo.added_gates.includes('quality')) {
        throw new Error('Expected added_gates to include "quality"');
      }

      if (!compatInfo.is_breaking) {
        throw new Error('Expected is_breaking to be true for this upgrade');
      }

      // Verificar cambios en thresholds
      if (compatInfo.threshold_changes.security.from !== 0.90) {
        throw new Error('Expected security threshold change from 0.90');
      }

      if (compatInfo.threshold_changes.security.to !== 0.95) {
        throw new Error('Expected security threshold change to 0.95');
      }
    }
  );

  if (test5) passed++; else failed++;

  // RESUMEN FINAL
  console.log('📊 RESUMEN DE TESTS');
  console.log('===================');
  console.log(`✅ Tests pasados: ${passed}`);
  console.log(`❌ Tests fallidos: ${failed}`);
  console.log(`📈 Tasa de éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 TODOS LOS TESTS DE ACEPTACIÓN PASARON');
    console.log('✅ Políticas Versionadas implementadas correctamente');
    console.log('✅ Compatibilidad hacia atrás garantizada');
    console.log('✅ Gates de seguridad funcionando');
    console.log('✅ OLA 2 - Antifrágil: LISTO PARA CIERRE FORMAL');
  } else {
    console.log('\n❌ ALGUNOS TESTS FALLARON');
    console.log('⚠️  Revisar implementación antes del cierre formal');
    process.exit(1);
  }
}

// Ejecutar tests si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testPolicyVersioning()
    .then(() => {
      console.log('\n✅ Tests de aceptación completados exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error ejecutando tests:', error.message);
      process.exit(1);
    });
}

export default testPolicyVersioning;
