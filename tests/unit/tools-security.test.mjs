import test from 'node:test';
import assert from 'node:assert/strict';

// Función HTTP request con allowlist para testing
async function httpRequest(options, config = {}) {
  const { url } = options;
  const { allow = [], deny = [] } = config;
  
  // Simular verificación de allowlist
  const domain = new URL(url).hostname;
  
  if (deny.length > 0 && deny.some(d => domain.includes(d))) {
    throw new Error(`DENYLIST: Domain ${domain} is blocked`);
  }
  
  if (allow.length > 0 && !allow.some(a => domain.includes(a))) {
    throw new Error(`ALLOWLIST: Domain ${domain} is not in allowed list`);
  }
  
  // Simular request exitoso
  return {
    status: 200,
    data: { message: 'Request successful' },
    url: url
  };
}

test('HTTP allowlist: bloquea dominios fuera de lista', async () => {
  try {
    await httpRequest({ url: 'https://evil.com' }, { allow: ['api.github.com'] });
    assert.fail('Debió lanzar error para dominio no permitido');
  } catch (e) {
    assert.match(e.message, /ALLOWLIST|blocked|allowlist/, 'Debe lanzar error de allowlist');
  }
});

test('HTTP allowlist: permite dominios en la lista', async () => {
  const result = await httpRequest({ url: 'https://api.github.com/users' }, { allow: ['api.github.com'] });
  assert.equal(result.status, 200, 'Request debe ser exitoso');
  assert.equal(result.url, 'https://api.github.com/users', 'URL debe ser preservada');
});

test('HTTP denylist: bloquea dominios en lista negra', async () => {
  try {
    await httpRequest({ url: 'https://malicious-site.com' }, { deny: ['malicious-site.com'] });
    assert.fail('Debió lanzar error para dominio en denylist');
  } catch (e) {
    assert.match(e.message, /DENYLIST|blocked/, 'Debe lanzar error de denylist');
  }
});

test('HTTP security: permite dominios cuando no hay restricciones', async () => {
  const result = await httpRequest({ url: 'https://example.com' }, {});
  assert.equal(result.status, 200, 'Request debe ser exitoso sin restricciones');
});

test('HTTP security: denylist tiene prioridad sobre allowlist', async () => {
  try {
    await httpRequest({ url: 'https://blocked.com/api' }, { 
      allow: ['api'], 
      deny: ['blocked.com'] 
    });
    assert.fail('Denylist debe tener prioridad sobre allowlist');
  } catch (e) {
    assert.match(e.message, /DENYLIST/, 'Debe usar denylist cuando hay conflicto');
  }
});
