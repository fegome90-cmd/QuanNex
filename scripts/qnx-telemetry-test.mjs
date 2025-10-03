#!/usr/bin/env node

// Script de prueba para telemetría QuanNex
import {
  qnxRunStart,
  qnxRunEnd,
  qnxUse,
  qnxInstrument,
  COMPONENTS,
  SOURCES,
  ACTIONS,
} from '../packages/quannex-mcp/telemetry.mjs';

async function runTest() {
  console.log('🧪 Ejecutando prueba de telemetría...');

  // Simular un workflow completo
  const runId = qnxRunStart(SOURCES.CLI, 'telemetry_test');

  try {
    // Simular orchestrator
    await qnxInstrument(
      runId,
      COMPONENTS.ORCHESTRATOR,
      async () => {
        console.log('   📊 Orchestrator ejecutándose...');
        await new Promise(resolve => setTimeout(resolve, 100));
      },
      { workflow_name: 'test_workflow' }
    );

    // Simular router
    await qnxInstrument(
      runId,
      COMPONENTS.ROUTER,
      async () => {
        console.log('   🛣️ Router ejecutándose...');
        await new Promise(resolve => setTimeout(resolve, 50));
      },
      { route: 'test_route' }
    );

    // Simular planner
    await qnxInstrument(
      runId,
      COMPONENTS.PLANNER,
      async () => {
        console.log('   📋 Planner ejecutándose...');
        await new Promise(resolve => setTimeout(resolve, 75));
      },
      { plan_type: 'test_plan' }
    );

    // Finalizar exitosamente
    qnxRunEnd(runId, true, {
      test_completed: true,
      components_tested: 3,
    });

    console.log('✅ Prueba completada exitosamente');
  } catch (error) {
    qnxRunEnd(runId, false, {
      error: error.message,
      test_failed: true,
    });
    console.error('❌ Prueba falló:', error.message);
  }
}

// Ejecutar prueba
runTest().catch(console.error);
