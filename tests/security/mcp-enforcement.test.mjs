#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createTrace, 
  updateTrace, 
  completeTrace, 
  getTrace, 
  listTraces 
} from '../../tools/mcp-tracer.js';
import { 
  signCommit, 
  verifyCommitSignature, 
  extractMCPInfo, 
  generateMCPTrailer 
} from '../../tools/mcp-signer.js';

test('crea y gestiona trazas MCP', async () => {
  const traceId = createTrace('test_operation', {
    input: { test: 'data' },
    metadata: { source: 'test' }
  }, 'test-agent');
  
  assert.ok(traceId);
  assert.equal(traceId.length, 32); // 16 bytes = 32 hex chars
  
  const trace = getTrace(traceId);
  assert.equal(trace.traceId, traceId);
  assert.equal(trace.operation, 'test_operation');
  assert.equal(trace.agentId, 'test-agent');
  assert.equal(trace.status, 'started');
});

test('actualiza trazas MCP', async () => {
  const traceId = createTrace('test_update', {
    input: { test: 'data' }
  }, 'test-agent');
  
  updateTrace(traceId, {
    status: 'running',
    progress: 50
  });
  
  const trace = getTrace(traceId);
  assert.equal(trace.status, 'running');
  assert.equal(trace.progress, 50);
});

test('completa trazas MCP', async () => {
  const traceId = createTrace('test_complete', {
    input: { test: 'data' }
  }, 'test-agent');
  
  const result = { success: true, data: 'test result' };
  completeTrace(traceId, result);
  
  const trace = getTrace(traceId);
  assert.equal(trace.status, 'completed');
  assert.ok(trace.duration >= 0); // Puede ser 0 si es muy rápido
  assert.ok(trace.completedAt);
  assert.deepEqual(trace.result, result);
});

test('lista trazas MCP con filtros', async () => {
  // Crear algunas trazas de prueba
  const trace1 = createTrace('operation1', { input: 'test1' }, 'agent1');
  const trace2 = createTrace('operation2', { input: 'test2' }, 'agent2');
  
  // Listar todas las trazas
  const allTraces = await listTraces();
  assert.ok(allTraces.length >= 2);
  
  // Filtrar por agente
  const agent1Traces = await listTraces({ agentId: 'agent1' });
  assert.ok(agent1Traces.length >= 1);
  
  // Filtrar por operación
  const operation1Traces = await listTraces({ operation: 'operation1' });
  assert.ok(operation1Traces.length >= 1);
});

test('genera y verifica firmas MCP', async () => {
  // Establecer secreto de prueba
  const prevSecret = process.env.QUANNEX_SIGNING_KEY;
  process.env.QUANNEX_SIGNING_KEY = 'test-signing-key-123456789';
  
  try {
    const traceId = 'test-trace-id-12345678901234567890123456789012';
    const commitMessage = 'feat: test commit';
    
    const signedCommit = await signCommit(commitMessage, traceId);
    
    assert.ok(signedCommit.signature);
    assert.equal(signedCommit.traceId, traceId);
    assert.ok(signedCommit.fullMessage.includes('QuanNex: requestId='));
    assert.ok(signedCommit.fullMessage.includes('sig='));
    
    // Verificar la firma
    const isValid = await verifyCommitSignature(commitMessage, traceId, signedCommit.signature);
    assert.equal(isValid, true);
    
  } finally {
    if (prevSecret) {
      process.env.QUANNEX_SIGNING_KEY = prevSecret;
    } else {
      delete process.env.QUANNEX_SIGNING_KEY;
    }
  }
});

test('extrae información MCP de commits', () => {
  const commitMessage = 'feat: add feature\n\nQuanNex: requestId=abc123 sig=def456';
  
  const mcpInfo = extractMCPInfo(commitMessage);
  
  assert.ok(mcpInfo);
  assert.equal(mcpInfo.traceId, 'abc123');
  assert.equal(mcpInfo.signature, 'def456');
  assert.equal(mcpInfo.isValid, true);
});

test('genera trailers MCP', async () => {
  // Establecer secreto de prueba
  const prevSecret = process.env.QUANNEX_SIGNING_KEY;
  process.env.QUANNEX_SIGNING_KEY = 'test-signing-key-123456789';
  
  try {
    const traceId = 'abc123def45678901234567890123456789012';
    const trailer = await generateMCPTrailer(traceId);
    
    assert.ok(trailer.includes('QuanNex: requestId='));
    assert.ok(trailer.includes('sig='));
    
    // Verificar que la función se ejecutó sin errores
    assert.ok(typeof trailer === 'string');
    assert.ok(trailer.length > 50);
    
  } finally {
    if (prevSecret) {
      process.env.QUANNEX_SIGNING_KEY = prevSecret;
    } else {
      delete process.env.QUANNEX_SIGNING_KEY;
    }
  }
});

test('rechaza firmas inválidas', async () => {
  // Establecer secreto de prueba
  const prevSecret = process.env.QUANNEX_SIGNING_KEY;
  process.env.QUANNEX_SIGNING_KEY = 'test-signing-key-123456789';
  
  try {
    const traceId = 'test-trace-id-12345678901234567890123456789012';
    const commitMessage = 'feat: test commit';
    const invalidSignature = 'invalid-signature-123456789012345678901234567890123456789012345678901234567890';
    
    const isValid = await verifyCommitSignature(commitMessage, traceId, invalidSignature);
    assert.equal(isValid, false);
    
  } finally {
    if (prevSecret) {
      process.env.QUANNEX_SIGNING_KEY = prevSecret;
    } else {
      delete process.env.QUANNEX_SIGNING_KEY;
    }
  }
});

test('sanitiza datos sensibles en trazas', async () => {
  const traceId = createTrace('test_sanitize', {
    input: {
      user: 'john',
      password: 'secret123',
      token: 'abc123xyz',
      api_key: 'sk_live_ABC123'
    }
  }, 'test-agent');
  
  const trace = getTrace(traceId);
  
  // Verificar que los datos sensibles fueron sanitizados
  const inputStr = JSON.stringify(trace.context.input);
  assert.doesNotMatch(inputStr, /secret123/);
  assert.doesNotMatch(inputStr, /abc123xyz/);
  assert.doesNotMatch(inputStr, /sk_live_/);
  assert.match(inputStr, /REDACTED/);
});

console.log('✅ MCP Enforcement Tests Ready');
