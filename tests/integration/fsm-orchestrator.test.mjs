import test from 'node:test';
import assert from 'node:assert/strict';

// FSM simplificado para testing
async function runFSM(env, options = {}) {
  const { max_hops = 6, budget_ms = 3000 } = options;
  const { payload = {}, thread = { files: [], diffs: [], build_errors: [], goals: [], facts: [], sources: [] }, trace = [] } = env;
  
  const startTime = Date.now();
  const states = ['PLAN', 'EXEC', 'POLICY', 'DONE'];
  let currentState = 0;
  
  // Simular ejecución FSM
  while (currentState < states.length && (Date.now() - startTime) < budget_ms) {
    const state = states[currentState];
    
    // Agregar al trace
    trace.push({
      state: state,
      timestamp: new Date().toISOString(),
      step: currentState + 1
    });
    
    // Simular tiempo de procesamiento por estado
    await new Promise(resolve => setTimeout(resolve, 100));
    
    currentState++;
    
    // Verificar límite de hops
    if (trace.length >= max_hops) {
      break;
    }
  }
  
  return {
    state: states[currentState] || 'DONE',
    trace: trace,
    completed: currentState >= states.length,
    hops_used: trace.length,
    duration_ms: Date.now() - startTime
  };
}

test('FSM corto: PLAN→EXEC→POLICY→DONE', async () => {
  const env = {
    payload: { task: 'test_task' },
    thread: {
      files: ['test.js'],
      diffs: ['diff1'],
      build_errors: [],
      goals: ['ship'],
      facts: ['fact1'],
      sources: ['source1']
    },
    trace: []
  };
  
  const out = await runFSM(env, { max_hops: 6, budget_ms: 3000 });
  
  assert.equal(out.state, 'DONE', 'FSM debe llegar a estado DONE');
  assert.ok(out.trace.length >= 2, 'Trace debe tener al menos 2 pasos');
  assert.ok(out.trace.length <= 6, 'Trace no debe exceder max_hops');
  assert.ok(out.completed, 'FSM debe estar completado');
  assert.ok(out.duration_ms < 3000, 'Duración debe ser menor que budget_ms');
});

test('FSM con límite de hops', async () => {
  const env = {
    payload: { task: 'complex_task' },
    thread: { files: [], diffs: [], build_errors: [], goals: [], facts: [], sources: [] },
    trace: []
  };
  
  const out = await runFSM(env, { max_hops: 3, budget_ms: 3000 });
  
  assert.ok(out.trace.length <= 3, 'Trace no debe exceder max_hops=3');
  assert.ok(out.hops_used <= 3, 'Hops usados no debe exceder límite');
});

test('FSM con timeout', async () => {
  const env = {
    payload: { task: 'slow_task' },
    thread: { files: [], diffs: [], build_errors: [], goals: [], facts: [], sources: [] },
    trace: []
  };
  
  const out = await runFSM(env, { max_hops: 10, budget_ms: 200 }); // Timeout corto
  
  assert.ok(out.duration_ms < 300, 'Duración debe respetar timeout');
  assert.ok(out.trace.length > 0, 'Debe tener al menos un paso antes del timeout');
});

test('FSM preserva thread state', async () => {
  const originalThread = {
    files: ['file1.js', 'file2.js'],
    diffs: ['diff1', 'diff2'],
    build_errors: ['error1'],
    goals: ['goal1', 'goal2'],
    facts: ['fact1'],
    sources: ['source1', 'source2']
  };
  
  const env = {
    payload: { task: 'preserve_test' },
    thread: { ...originalThread },
    trace: []
  };
  
  const out = await runFSM(env, { max_hops: 4, budget_ms: 1000 });
  
  assert.equal(out.state, 'DONE', 'FSM debe completarse');
  assert.deepEqual(env.thread, originalThread, 'Thread state debe ser preservado');
  assert.ok(out.trace.length >= 2, 'Debe tener trace de ejecución');
});
