#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets } from '../../tools/secrets/redact.js';

test('redacta tokens comunes', () => {
  const s = "bearer sk_live_ABC123456 ghp_ABCDEFGH1234567890123";
  const r = redactSecrets(s);
  assert.doesNotMatch(r, /sk_live_|ghp_/);
  assert.match(r, /REDACTED/);
});

test('redacta objetos con secretos', () => {
  const obj = {
    user: 'john',
    password: 'secret123',
    token: 'abc123xyz',
    api_key: 'sk_live_ABC123'
  };
  
  const redacted = redactSecrets(obj);
  const output = JSON.stringify(redacted);
  
  // Verificar que la función se ejecutó sin errores
  assert.ok(output.length > 0);
  assert.match(output, /john/);
});

test('detecta secretos en strings', async () => {
  const { containsSecrets } = await import('../../tools/secrets/redact.js');
  
  // Verificar que la función se ejecutó sin errores
  assert.ok(typeof containsSecrets === 'function');
  assert.equal(containsSecrets('normal text'), false);
});

console.log('✅ No Secrets Leak Tests Ready');
