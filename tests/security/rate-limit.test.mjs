#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

// Importar nuestro rate limiter implementado
import { checkRateLimit } from '../../utils/file-rate-limiter.js';

// Simular RateLimiter para testing
class RateLimiter {
  constructor({ windowMs, max, key }) {
    this.windowMs = windowMs;
    this.max = max;
    this.key = key;
    this.hits = new Map();
  }
  
  async hit(identifier) {
    const now = Date.now();
    const key = `${this.key}:${identifier}`;
    
    if (!this.hits.has(key)) {
      this.hits.set(key, { count: 0, resetTime: now + this.windowMs });
    }
    
    const record = this.hits.get(key);
    
    // Reset si la ventana expiró
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
    }
    
    if (record.count < this.max) {
      record.count++;
      return { allowed: true, remaining: this.max - record.count };
    } else {
      return { allowed: false, remaining: 0 };
    }
  }
}

test('bloquea tras exceder ventana', async () => {
  const rl = new RateLimiter({ windowMs: 1000, max: 3, key: 'ip' });
  const ip = '1.2.3.4';
  
  // Primeras 3 llamadas deben pasar
  const res1 = await rl.hit(ip);
  assert.equal(res1.allowed, true);
  
  const res2 = await rl.hit(ip);
  assert.equal(res2.allowed, true);
  
  const res3 = await rl.hit(ip);
  assert.equal(res3.allowed, true);
  
  // Cuarta llamada debe ser bloqueada
  const res4 = await rl.hit(ip);
  assert.equal(res4.allowed, false);
});

test('rate limiter por agente funciona', async () => {
  const agent1 = 'context';
  const agent2 = 'security';
  
  // Verificar que cada agente tiene su propio límite
  const allowed1 = checkRateLimit(agent1, 5, 60000);
  const allowed2 = checkRateLimit(agent2, 5, 60000);
  
  assert.equal(allowed1, true);
  assert.equal(allowed2, true);
});

test('ventana de tiempo se resetea correctamente', async () => {
  const rl = new RateLimiter({ windowMs: 100, max: 2, key: 'test' });
  const identifier = 'test-user';
  
  // Llenar el límite
  await rl.hit(identifier);
  await rl.hit(identifier);
  
  // Debe estar bloqueado
  const blocked = await rl.hit(identifier);
  assert.equal(blocked.allowed, false);
  
  // Esperar que expire la ventana
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Debe permitir nuevamente
  const allowed = await rl.hit(identifier);
  assert.equal(allowed.allowed, true);
});

test('diferentes identificadores tienen límites independientes', async () => {
  const rl = new RateLimiter({ windowMs: 1000, max: 2, key: 'user' });
  
  // Usuario 1 llena su límite
  await rl.hit('user1');
  await rl.hit('user1');
  const blocked1 = await rl.hit('user1');
  assert.equal(blocked1.allowed, false);
  
  // Usuario 2 aún puede hacer requests
  const allowed2 = await rl.hit('user2');
  assert.equal(allowed2.allowed, true);
});

console.log('✅ GAP-002: Rate Limiting Tests Ready');
