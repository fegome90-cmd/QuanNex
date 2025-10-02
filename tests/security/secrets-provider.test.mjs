#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSecret, validateSecrets, CRITICAL_SECRETS } from '../../tools/secrets/provider.js';

test('falla si secreto ausente o débil', async () => {
  const prev = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  
  await assert.rejects(() => getSecret('JWT_SECRET'), /Missing or weak secret/);
  
  process.env.JWT_SECRET = prev;
});

test('falla si secreto es muy corto', async () => {
  const prev = process.env.TEST_SECRET;
  process.env.TEST_SECRET = 'short';
  
  await assert.rejects(() => getSecret('TEST_SECRET'), /Missing or weak secret/);
  
  if (prev) {
    process.env.TEST_SECRET = prev;
  } else {
    delete process.env.TEST_SECRET;
  }
});

test('obtiene secreto válido', async () => {
  const prev = process.env.TEST_SECRET;
  process.env.TEST_SECRET = 'this-is-a-valid-secret-key';
  
  const secret = await getSecret('TEST_SECRET');
  assert.equal(secret, 'this-is-a-valid-secret-key');
  
  if (prev) {
    process.env.TEST_SECRET = prev;
  } else {
    delete process.env.TEST_SECRET;
  }
});

test('valida secretos críticos', async () => {
  // Establecer secretos de prueba
  const testSecrets = CRITICAL_SECRETS.reduce((acc, secret) => {
    acc[secret] = `test-${secret.toLowerCase()}-key-123456789`;
    return acc;
  }, {});
  
  const prevEnv = { ...process.env };
  
  // Establecer secretos de prueba
  Object.entries(testSecrets).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  try {
    const result = await validateSecrets(CRITICAL_SECRETS);
    assert.equal(result, true);
  } finally {
    // Restaurar entorno original
    Object.keys(testSecrets).forEach(key => {
      if (prevEnv[key]) {
        process.env[key] = prevEnv[key];
      } else {
        delete process.env[key];
      }
    });
  }
});

test('lista secretos críticos', () => {
  assert.ok(CRITICAL_SECRETS.length > 0);
  assert.ok(CRITICAL_SECRETS.includes('JWT_SECRET_KEY'));
  assert.ok(CRITICAL_SECRETS.includes('QUANNEX_SIGNING_KEY'));
});

console.log('✅ Secrets Provider Tests Ready');
