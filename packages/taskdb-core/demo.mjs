#!/usr/bin/env node

/**
 * Demo del Sistema TaskDB Core
 * Plan Maestro TaskDB - Ola 1: Robustez
 *
 * Demuestra las capacidades del sistema:
 * - Creación de tareas, runs, gates, artifacts
 * - Verificación de procedencia
 * - Diagnóstico con TaskDB Doctor
 * - Generación de reportes con provenance
 */

import TaskDBCore from './taskdb-core.mjs';
import TaskDBDoctor from './taskdb-doctor.mjs';
import ProvenanceVerifier from './provenance-verifier.mjs';

async function runDemo() {
  console.log('🚀 Iniciando Demo del Sistema TaskDB Core\n');

  // 1. Inicializar sistema
  console.log('1️⃣ Inicializando TaskDB Core...');
  const taskdb = new TaskDBCore();
  const doctor = new TaskDBDoctor(taskdb, { verbose: true });
  const verifier = new ProvenanceVerifier(taskdb);
  console.log('✅ Sistema inicializado\n');

  // 2. Crear tareas de ejemplo
  console.log('2️⃣ Creando tareas de ejemplo...');
  const task1 = taskdb.createTask({
    title: 'Implementar sistema de autenticación',
    description: 'Implementar autenticación JWT con refresh tokens',
    priority: 'high',
    tags: ['auth', 'security', 'backend'],
  });

  const task2 = taskdb.createTask({
    title: 'Crear dashboard de métricas',
    description: 'Dashboard en tiempo real con métricas de sistema',
    priority: 'medium',
    tags: ['frontend', 'dashboard', 'metrics'],
  });

  console.log(`✅ Tarea 1 creada: ${task1.id.substring(0, 8)}... - ${task1.title}`);
  console.log(`✅ Tarea 2 creada: ${task2.id.substring(0, 8)}... - ${task2.title}\n`);

  // 3. Crear runs para las tareas
  console.log('3️⃣ Creando runs de ejecución...');
  const run1 = taskdb.createRun({
    task_id: task1.id,
    tool_calls: [
      {
        tool_name: 'npm install',
        args: { packages: ['jsonwebtoken', 'bcryptjs'] },
        result: { success: true, packages_installed: 2 },
        duration_ms: 1500,
      },
      {
        tool_name: 'code_generation',
        args: { feature: 'jwt_auth' },
        result: { files_created: 3, lines_of_code: 250 },
        duration_ms: 8000,
      },
    ],
  });

  const run2 = taskdb.createRun({
    task_id: task2.id,
    tool_calls: [
      {
        tool_name: 'npm install',
        args: { packages: ['chart.js', 'react'] },
        result: { success: true, packages_installed: 15 },
        duration_ms: 3000,
      },
    ],
  });

  console.log(`✅ Run 1 creado: ${run1.id.substring(0, 8)}... para tarea de autenticación`);
  console.log(`✅ Run 2 creado: ${run2.id.substring(0, 8)}... para tarea de dashboard\n`);

  // 4. Completar runs
  console.log('4️⃣ Completando runs...');
  taskdb.updateRun(run1.id, {
    status: 'completed',
    metrics: {
      success_rate: 1.0,
      error_count: 0,
      latency_p50: 1200,
      latency_p95: 2500,
    },
  });

  taskdb.updateRun(run2.id, {
    status: 'completed',
    metrics: {
      success_rate: 1.0,
      error_count: 0,
      latency_p50: 800,
      latency_p95: 1500,
    },
  });

  console.log('✅ Runs completados exitosamente\n');

  // 5. Crear gates de verificación
  console.log('5️⃣ Creando gates de verificación...');
  const gate1 = taskdb.createGate({
    name: 'security_audit',
    type: 'security',
    run_id: run1.id,
    checks: [
      {
        name: 'jwt_security_check',
        status: 'pass',
        message: 'JWT tokens configurados con expiración segura',
      },
      {
        name: 'password_hashing_check',
        status: 'pass',
        message: 'Passwords hasheados con bcrypt',
      },
    ],
  });

  const gate2 = taskdb.createGate({
    name: 'code_quality',
    type: 'quality',
    run_id: run1.id,
    checks: [
      {
        name: 'eslint_check',
        status: 'pass',
        message: 'Código pasa todas las reglas de ESLint',
      },
      {
        name: 'test_coverage',
        status: 'pass',
        message: 'Cobertura de tests > 80%',
      },
    ],
  });

  taskdb.updateGate(gate1.id, { status: 'pass' });
  taskdb.updateGate(gate2.id, { status: 'pass' });

  console.log(`✅ Gate de seguridad: ${gate1.name} - ${gate1.status}`);
  console.log(`✅ Gate de calidad: ${gate2.name} - ${gate2.status}\n`);

  // 6. Crear artifacts
  console.log('6️⃣ Creando artifacts...');
  const artifact1 = taskdb.createArtifact({
    name: 'auth-middleware.js',
    type: 'code',
    uri: 'src/middleware/auth.js',
    hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    size_bytes: 2048,
    run_id: run1.id,
  });

  const artifact2 = taskdb.createArtifact({
    name: 'dashboard-component.jsx',
    type: 'code',
    uri: 'src/components/Dashboard.jsx',
    hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1',
    size_bytes: 4096,
    run_id: run2.id,
  });

  console.log(`✅ Artifact 1: ${artifact1.name} (${artifact1.size_bytes} bytes)`);
  console.log(`✅ Artifact 2: ${artifact2.name} (${artifact2.size_bytes} bytes)\n`);

  // 7. Crear reporte con provenance
  console.log('7️⃣ Creando reporte con procedencia...');
  const report = taskdb.createReport({
    title: 'Reporte de Implementación - Sprint 1',
    type: 'analysis',
    content: {
      summary: 'Implementación exitosa de autenticación y dashboard',
      tasks_completed: 2,
      features_delivered: ['JWT Auth', 'Metrics Dashboard'],
      quality_metrics: {
        test_coverage: 85,
        security_score: 95,
        performance_score: 90,
      },
    },
    report_provenance: {
      task_ids: [task1.id, task2.id],
      run_ids: [run1.id, run2.id],
      artifact_hashes: [artifact1.hash, artifact2.hash],
      claims_validated: [
        {
          claim: 'Sistema de autenticación implementado correctamente',
          evidence: 'Gates de seguridad pasados, tests ejecutados',
          status: 'validated',
        },
        {
          claim: 'Dashboard de métricas funcional',
          evidence: 'Componente creado, integración exitosa',
          status: 'validated',
        },
      ],
      verification_snapshot_ts: new Date().toISOString(),
    },
  });

  console.log(`✅ Reporte creado: ${report.title}\n`);

  // 8. Verificar procedencia del reporte
  console.log('8️⃣ Verificando procedencia del reporte...');
  const verification = await verifier.verifyReportProvenance(report);
  console.log(`✅ Verificación completada: ${verification.status}`);
  console.log(`   Checks realizados: ${verification.checks.length}`);
  console.log(`   Errores: ${verification.errors.length}`);
  console.log(`   Advertencias: ${verification.warnings.length}\n`);

  // 9. Ejecutar TaskDB Doctor
  console.log('9️⃣ Ejecutando TaskDB Doctor...');
  const doctorReport = await doctor.runDiagnostics();
  console.log(`✅ Diagnóstico completado`);
  console.log(`   Salud del sistema: ${doctorReport.summary.system_health}`);
  console.log(`   Problemas críticos: ${doctorReport.summary.critical_issues}`);
  console.log(`   Problemas altos: ${doctorReport.summary.high_issues}`);
  console.log(`   Problemas medios: ${doctorReport.summary.medium_issues}\n`);

  // 10. Mostrar estadísticas finales
  console.log('🔟 Estadísticas finales del sistema...');
  const stats = taskdb.getSystemStats();
  console.log(`✅ Estadísticas:`);
  console.log(`   Total tareas: ${stats.total_tasks}`);
  console.log(`   Total runs: ${stats.total_runs}`);
  console.log(`   Total gates: ${stats.total_gates}`);
  console.log(`   Total artifacts: ${stats.total_artifacts}`);
  console.log(`   Total eventos: ${stats.total_events}`);
  console.log(`   Total reportes: ${stats.total_reports}\n`);

  // 11. Calcular status derivado
  console.log('1️⃣1️⃣ Calculando status derivado...');
  const statusDerived1 = taskdb.calculateTaskStatusDerived(task1.id);
  const statusDerived2 = taskdb.calculateTaskStatusDerived(task2.id);

  console.log(`✅ Status derivado Tarea 1:`);
  console.log(`   Estado derivado: ${statusDerived1.derived_status}`);
  console.log(`   Score de salud: ${statusDerived1.health_score.toFixed(2)}`);
  console.log(`   Runs exitosos: ${statusDerived1.successful_runs}/${statusDerived1.total_runs}`);
  console.log(`   Gates pasados: ${statusDerived1.passed_gates}/${statusDerived1.total_gates}`);

  console.log(`✅ Status derivado Tarea 2:`);
  console.log(`   Estado derivado: ${statusDerived2.derived_status}`);
  console.log(`   Score de salud: ${statusDerived2.health_score.toFixed(2)}`);
  console.log(`   Runs exitosos: ${statusDerived2.successful_runs}/${statusDerived2.total_runs}`);
  console.log(`   Gates pasados: ${statusDerived2.passed_gates}/${statusDerived2.total_gates}\n`);

  console.log('🎉 Demo completado exitosamente!');
  console.log('\n📊 Resumen de capacidades demostradas:');
  console.log('   ✅ Gestión de tareas con policy_version');
  console.log('   ✅ Ejecución y tracking de runs');
  console.log('   ✅ Verificación con gates');
  console.log('   ✅ Creación de artifacts verificables');
  console.log('   ✅ Timeline de eventos inmutable');
  console.log('   ✅ Reportes con procedencia completa');
  console.log('   ✅ Verificación automática de procedencia');
  console.log('   ✅ Diagnóstico y reparación con Doctor');
  console.log('   ✅ Cálculo de status derivado');
  console.log('   ✅ Sistema antifrágil operativo');
}

// Ejecutar demo
runDemo().catch(console.error);
