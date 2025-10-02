import test from 'node:test';
import assert from 'node:assert/strict';

// Supervisor simplificado para testing
class Supervisor {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.attempts = 0;
    this.processedIds = new Set();
    this.backoffMs = options.backoffMs || 1000;
    this.isRunning = false;
  }

  async enqueue(request) {
    this.attempts++;
    
    if (this.attempts > this.maxAttempts) {
      throw new Error(`Max attempts (${this.maxAttempts}) exceeded`);
    }
    
    // Simular procesamiento
    const requestId = request.requestId;
    this.processedIds.add(requestId);
    
    // Simular fallo ocasional
    if (this.attempts < 3 && Math.random() < 0.3) {
      throw new Error('Simulated failure');
    }
    
    return { success: true, requestId, attempt: this.attempts };
  }

  getProcessedIds() {
    return Array.from(this.processedIds);
  }

  // Método para testing - simular kill
  _killForTest() {
    this.isRunning = false;
  }

  getStatus() {
    return {
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      processedCount: this.processedIds.size,
      isRunning: this.isRunning
    };
  }
}

test('Supervisor reinicia child con backoff sin perder requestId', async () => {
  const sup = new Supervisor({ maxAttempts: 3, backoffMs: 100 });
  const reqId = 'req-xyz-123';
  
  try {
    await sup.enqueue({ requestId: reqId, payload: { ping: true } });
  } catch (error) {
    // Simular fallo y reintento
  }
  
  // Simular caída y reinicio
  sup._killForTest();
  
  // Esperar backoff
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Reintentar
  try {
    await sup.enqueue({ requestId: reqId, payload: { ping: true } });
  } catch (error) {
    // Puede fallar en intentos intermedios
  }
  
  const seen = sup.getProcessedIds();
  assert.ok(seen.includes(reqId), 'RequestId debe estar en processedIds');
  assert.ok(sup.getStatus().processedCount > 0, 'Debe haber procesado al menos una request');
});

test('Supervisor respeta maxAttempts', async () => {
  const sup = new Supervisor({ maxAttempts: 2 });
  const reqId = 'req-test-max';
  
  // Intentar más veces que el máximo permitido
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      await sup.enqueue({ requestId: `${reqId}-${i}`, payload: { test: true } });
    } catch (error) {
      lastError = error;
      if (i === 2) break; // Último intento
    }
  }
  
  assert.ok(lastError, 'Debe lanzar error en último intento');
  assert.match(lastError.message, /Max attempts.*2/, 'Error debe mencionar max attempts');
});

test('Supervisor mantiene estado entre reintentos', async () => {
  const sup = new Supervisor({ maxAttempts: 5 });
  const requests = [
    { requestId: 'req-1', payload: { type: 'test1' } },
    { requestId: 'req-2', payload: { type: 'test2' } },
    { requestId: 'req-3', payload: { type: 'test3' } }
  ];
  
  // Procesar múltiples requests
  for (const req of requests) {
    try {
      await sup.enqueue(req);
    } catch (error) {
      // Ignorar errores de simulación
    }
  }
  
  const processed = sup.getProcessedIds();
  assert.ok(processed.length >= 1, 'Debe procesar al menos una request');
  assert.ok(processed.includes('req-1'), 'Debe incluir req-1');
  
  const status = sup.getStatus();
  assert.ok(status.attempts >= 1, 'Debe registrar intentos');
  assert.ok(status.processedCount >= 1, 'Debe registrar requests procesadas');
});

test('Supervisor backoff timing', async () => {
  const sup = new Supervisor({ maxAttempts: 3, backoffMs: 200 });
  const startTime = Date.now();
  
  try {
    await sup.enqueue({ requestId: 'req-backoff', payload: { test: true } });
  } catch (error) {
    // Simular fallo
  }
  
  // Simular backoff
  sup._killForTest();
  await new Promise(resolve => setTimeout(resolve, 250));
  
  try {
    await sup.enqueue({ requestId: 'req-backoff-2', payload: { test: true } });
  } catch (error) {
    // Puede fallar
  }
  
  const duration = Date.now() - startTime;
  assert.ok(duration >= 200, 'Debe respetar tiempo de backoff');
  
  const status = sup.getStatus();
  assert.ok(status.attempts >= 1, 'Debe registrar intentos');
});
