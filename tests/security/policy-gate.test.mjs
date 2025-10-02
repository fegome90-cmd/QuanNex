#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { canExecute, getPolicyConfig, validateContext } from '../../core/security/policy-gate.js';

test('rechaza push a main en prod', () => {
  const ctx = { 
    meta: { branch: 'main' }, 
    allowDomains: [] 
  };
  process.env.POLICY_PROFILE = 'prod';
  
  const r = canExecute(ctx, { tool: 'git.push', target: {} });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'require_approval');
});

test('permite push a main en dev', () => {
  const ctx = { 
    meta: { branch: 'main' }, 
    allowDomains: [] 
  };
  process.env.POLICY_PROFILE = 'dev';
  
  const r = canExecute(ctx, { tool: 'git.push', target: {} });
  assert.equal(r.ok, true);
});

test('rechaza herramientas peligrosas en prod', () => {
  const ctx = { 
    meta: { risk_level: 'high' },
    allowDomains: []
  };
  process.env.POLICY_PROFILE = 'prod';
  
  const r = canExecute(ctx, { tool: 'exec', target: {} });
  assert.equal(r.ok, false);
  // Verificar que se rechaza por alguna razón válida
  assert.ok(['dangerous_tool_prod', 'high_risk_prod'].includes(r.reason));
});

test('configuración de políticas por perfil', () => {
  const devConfig = getPolicyConfig('dev');
  const prodConfig = getPolicyConfig('prod');
  
  assert.equal(devConfig.allowDangerousTools, true);
  assert.equal(prodConfig.allowDangerousTools, false);
  
  assert.equal(devConfig.allowMainBranchPush, true);
  assert.equal(prodConfig.allowMainBranchPush, false);
});

test('validación de contexto', () => {
  const ctx = {
    allowDomains: ['evil.com'],
    dangerousTools: ['exec'],
    rateLimitExceeded: true
  };
  
  const validation = validateContext(ctx, 'prod');
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.length > 0);
});

console.log('✅ Policy Gate Tests Ready');
