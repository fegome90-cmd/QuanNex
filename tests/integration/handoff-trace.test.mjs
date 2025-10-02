import test from 'node:test';
import assert from 'node:assert/strict';

// Función handoff simplificada para testing
function handoff(env, options) {
  const { to, gate, reason, wants = [] } = options;
  
  const handoffEntry = {
    to: to,
    gate: gate,
    reason: reason || 'handoff',
    wants: wants,
    timestamp: new Date().toISOString(),
    requestId: env.requestId || 'unknown'
  };
  
  // Agregar al trace si existe
  if (env.trace) {
    env.trace.push(handoffEntry);
  }
  
  return {
    ...env,
    trace: env.trace || [],
    lastHandoff: handoffEntry
  };
}

test('Handoff agrega a trace {to, gate, reason}', () => {
  const env = { trace: [] };
  const res = handoff(env, { 
    to: 'engineer', 
    gate: 'planner', 
    reason: 'build-plan', 
    wants: ['plan', 'implementation'] 
  });
  
  assert.equal(res.trace.length, 1, 'Trace debe tener un elemento');
  assert.equal(res.trace[0].to, 'engineer', 'Handoff debe ir a engineer');
  assert.equal(res.trace[0].gate, 'planner', 'Gate debe ser planner');
  assert.equal(res.trace[0].reason, 'build-plan', 'Reason debe ser build-plan');
  assert.deepEqual(res.trace[0].wants, ['plan', 'implementation'], 'Wants debe ser preservado');
  assert.ok(res.trace[0].timestamp, 'Timestamp debe estar presente');
});

test('Handoff múltiples entradas en trace', () => {
  let env = { trace: [] };
  
  // Primer handoff
  env = handoff(env, { to: 'engineer', gate: 'planner', reason: 'plan' });
  assert.equal(env.trace.length, 1, 'Primer handoff debe agregar al trace');
  
  // Segundo handoff
  env = handoff(env, { to: 'teacher', gate: 'critic', reason: 'review' });
  assert.equal(env.trace.length, 2, 'Segundo handoff debe agregar al trace');
  
  // Verificar contenido
  assert.equal(env.trace[0].to, 'engineer', 'Primer handoff debe ser a engineer');
  assert.equal(env.trace[1].to, 'teacher', 'Segundo handoff debe ser a teacher');
  assert.equal(env.trace[0].gate, 'planner', 'Primer gate debe ser planner');
  assert.equal(env.trace[1].gate, 'critic', 'Segundo gate debe ser critic');
});

test('Handoff preserva requestId', () => {
  const env = { 
    trace: [],
    requestId: 'req-12345'
  };
  
  const res = handoff(env, { to: 'rules', gate: 'policy', reason: 'validate' });
  
  assert.equal(res.trace[0].requestId, 'req-12345', 'RequestId debe ser preservado');
  assert.equal(res.lastHandoff.requestId, 'req-12345', 'LastHandoff debe tener requestId');
});

test('Handoff con wants vacío', () => {
  const env = { trace: [] };
  const res = handoff(env, { to: 'tester', gate: 'test', reason: 'execute' });
  
  assert.deepEqual(res.trace[0].wants, [], 'Wants debe ser array vacío por defecto');
  assert.equal(res.trace[0].to, 'tester', 'To debe ser preservado');
  assert.equal(res.trace[0].gate, 'test', 'Gate debe ser preservado');
});

test('Handoff con reason por defecto', () => {
  const env = { trace: [] };
  const res = handoff(env, { to: 'prompting', gate: 'generate' });
  
  assert.equal(res.trace[0].reason, 'handoff', 'Reason debe usar valor por defecto');
  assert.equal(res.trace[0].to, 'prompting', 'To debe ser preservado');
  assert.equal(res.trace[0].gate, 'generate', 'Gate debe ser preservado');
});
