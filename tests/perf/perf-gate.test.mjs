import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

test('Perf gate: snapshot válido y umbrales cumplidos', () => {
  try {
    // Verificar métricas de performance
    const verifyOutput = execSync('node tools/verify-perf.js', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    const verify = JSON.parse(verifyOutput);
    
    assert.ok(verify.metrics.total > 0, 'Debe tener eventos de traza');
    
    // Umbrales (ajusta a tu baseline)
    assert.ok(verify.metrics.latencies.p95_ms <= 2000, `P95 excedido: ${verify.metrics.latencies.p95_ms}ms > 2000ms`);
    assert.ok(verify.metrics.errors.rate_pct <= 15.0, `Error rate excedido: ${verify.metrics.errors.rate_pct}% > 15.0%`);
    
    assert.equal(verify.status, 'PASS', `Performance check debe pasar: ${verify.issues?.join(', ')}`);
    
  } catch (error) {
    assert.fail(`Error ejecutando verify-perf: ${error.message}`);
  }
});

test('Perf gate: snapshot generation', () => {
  try {
    // Generar snapshot de performance
    const snapshotOutput = execSync('node tools/snapshot-perf.js', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    const snapshot = JSON.parse(snapshotOutput);
    
    assert.equal(snapshot.status, 'SUCCESS', 'Snapshot debe generarse exitosamente');
    assert.ok(snapshot.snapshot_id, 'Snapshot debe tener ID');
    assert.ok(snapshot.output_path, 'Snapshot debe tener path de output');
    
  } catch (error) {
    assert.fail(`Error ejecutando snapshot-perf: ${error.message}`);
  }
});

test('Perf gate: métricas básicas del sistema', () => {
  // Verificar que las métricas básicas están disponibles
  const startTime = Date.now();
  
  // Simular operación
  const testData = Array.from({ length: 1000 }, (_, i) => i);
  const processed = testData.map(x => x * 2);
  const endTime = Date.now();
  
  const duration = endTime - startTime;
  
  // Verificar que la operación básica es rápida
  assert.ok(duration < 100, `Operación básica debe ser rápida: ${duration}ms`);
  assert.equal(processed.length, 1000, 'Procesamiento debe completarse');
});
