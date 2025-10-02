import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';

const agentPath = resolve(process.cwd(), 'agents/rules/agent.js');

const runAgent = payload =>
  execFileSync('node', [agentPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8'
  });

test('rules agent compiles policies with version metadata', () => {
  const payload = {
    policy_refs: ['policies/writing.md'],
    tone: 'formal',
    domain: 'documentation',
    compliance_level: 'basic'
  };

  const response = JSON.parse(runAgent(payload));
  assert.strictEqual(response.schema_version, '1.0.0');
  assert.strictEqual(response.agent_version, '1.0.0');
  assert.ok(response.rules_compiled.length >= 1);
  assert.ok(response.rules_compiled[0].includes('policies/writing.md'));
  assert.ok(Array.isArray(response.advice));
  assert.ok(Array.isArray(response.violations));
  assert.ok(response.trace.includes('rules.server:ok'));
});

test('rules agent reports missing policy as violation', () => {
  const payload = {
    policy_refs: ['policies/does-not-exist.md'],
    compliance_level: 'basic'
  };
  const response = JSON.parse(runAgent(payload));
  assert.ok(response.violations.includes('missing:policies/does-not-exist.md'));
});

test('rules agent rejects invalid compliance level', () => {
  assert.throws(() => {
    runAgent({
      policy_refs: ['policies/writing.md'],
      compliance_level: 'strictly'
    });
  }, /compliance_level must be one of/);
});
