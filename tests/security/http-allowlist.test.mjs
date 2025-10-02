#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { httpRequest, isDomainAllowed } from '../../tools/http/request.js';

test('bloquea dominio fuera de allowlist', async () => {
  await assert.rejects(() => 
    httpRequest({ url: 'https://evil.com' }, { allow: ['api.github.com'] }),
    /E_DENYLIST/
  );
});

test('permite dominio en allowlist', async () => {
  // Este test podría fallar si no hay internet, pero verificamos la lógica
  try {
    await httpRequest({ url: 'https://api.github.com' }, { allow: ['api.github.com'] });
    assert.ok(true);
  } catch (e) {
    // Si falla por red, verificar que no es por allowlist
    assert.doesNotMatch(e.message, /E_DENYLIST/);
  }
});

test('verifica dominio permitido', () => {
  assert.equal(isDomainAllowed('https://api.github.com', ['api.github.com']), true);
  assert.equal(isDomainAllowed('https://evil.com', ['api.github.com']), false);
});

test('allowlist por defecto incluye dominios seguros', async () => {
  const { getDefaultAllowlist } = await import('../../tools/http/request.js');
  const allowlist = getDefaultAllowlist();
  
  assert.ok(allowlist.includes('api.github.com'));
  assert.ok(allowlist.includes('localhost'));
  assert.ok(allowlist.includes('127.0.0.1'));
});

console.log('✅ HTTP Allowlist Tests Ready');
