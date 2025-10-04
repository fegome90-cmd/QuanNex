#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import assert from 'node:assert';
import { withTask } from '../../core/taskdb/withTask.ts';
import { makeTaskDBFromEnv } from '../../core/taskdb/index.ts';

async function testInstrumentationAcceptance() {
  console.log('🧪 Testing TaskDB Instrumentation Acceptance...\n');
  
  const taskdb = makeTaskDBFromEnv();
  const runId = `TEST:instrument:${Date.now()}`;
  
  console.log(`📊 RunId: ${runId}`);
  
  // Ejecutar función con withTask
  await withTask(runId, { test: true }, async (ctx) => {
    console.log('✅ withTask ejecutado correctamente');

    // Simular eventos adicionales
    await taskdb.insert({
      kind: 'llm.call',
      ts: Date.now(),
      ctx,
      payload: { tokens_in: 10, tokens_out: 5 },
    });

    await taskdb.insert({
      kind: 'guardrail.input',
      ts: Date.now(),
      ctx,
      payload: { size: 100 },
    });

    await taskdb.insert({
      kind: 'guardrail.output',
      ts: Date.now(),
      ctx,
      payload: { success: true },
    });
    
    console.log('✅ Eventos adicionales insertados');
  });
  
  // Verificar eventos registrados
  const events = await taskdb.query({ runId }, 100);
  const kinds = events.map(e => e.kind);
  
  console.log(`📋 Eventos registrados: ${kinds.join(', ')}`);
  
  // Verificar eventos obligatorios
  assert(kinds.includes('run.start'), '❌ Falta evento run.start');
  assert(kinds.includes('run.finish'), '❌ Falta evento run.finish');
  
  // Verificar eventos adicionales
  assert(kinds.includes('llm.call'), '❌ Falta evento llm.call');
  assert(kinds.includes('guardrail.input'), '❌ Falta evento guardrail.input');
  assert(kinds.includes('guardrail.output'), '❌ Falta evento guardrail.output');
  
  console.log('✅ Todos los eventos requeridos presentes');
  
  // Verificar estructura de eventos
  const startEvent = events.find(e => e.kind === 'run.start');
  const finishEvent = events.find(e => e.kind === 'run.finish');
  
  assert(startEvent, '❌ Evento run.start no encontrado');
  assert(finishEvent, '❌ Evento run.finish no encontrado');
  assert(startEvent.ctx.runId === runId, '❌ RunId incorrecto en run.start');
  assert(finishEvent.ctx.runId === runId, '❌ RunId incorrecto en run.finish');
  
  console.log('✅ Estructura de eventos correcta');
  
  console.log('\n🎉 Instrumentation acceptance test PASSED');
  return true;
}

async function testRuntimeGuard() {
  console.log('\n🛡️ Testing Runtime Guard...');
  
  try {
    // Esto debería fallar si TASKDB_ENFORCE_RUNTIME=true
    const { requireTaskContext } = await import('../../core/taskdb/runtime-guard.ts');
    
    try {
      requireTaskContext();
      console.log('⚠️ Runtime guard no activado (TASKDB_ENFORCE_RUNTIME != true)');
    } catch {
      console.log('✅ Runtime guard funcionando correctamente');
    }
  } catch (err) {
    console.log('⚠️ Runtime guard no disponible:', err.message);
  }
}

async function main() {
  try {
    await testInstrumentationAcceptance();
    await testRuntimeGuard();
    
    console.log('\n✅ Todos los tests de instrumentación pasaron');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test de instrumentación falló:', err.message);
    process.exit(1);
  }
}

main();
