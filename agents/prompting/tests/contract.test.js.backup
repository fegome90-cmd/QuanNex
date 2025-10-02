import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';

const agentPath = resolve(process.cwd(), 'agents/prompting/agent.js');
const runAgent = payload =>
  execFileSync('node', [agentPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8'
  });

test('prompting agent returns versioned prompts', () => {
  const response = JSON.parse(
    runAgent({
      goal: 'Generar README inicial',
      style: 'concise',
      constraints: ['español', 'máx 300 palabras'],
      context_refs: ['docs/INTRO.md'],
      ruleset_refs: ['policies/writing.md']
    })
  );

  assert.strictEqual(response.schema_version, '1.0.0');
  assert.strictEqual(response.agent_version, '1.0.0');
  assert.ok(response.system_prompt.includes('Style: concise'));
  assert.ok(response.user_prompt.includes('Generar README inicial'));
  assert.ok(Array.isArray(response.guardrails));
  assert.ok(Array.isArray(response.trace));
});

test('prompting agent rejects unsupported style', () => {
  assert.throws(() => {
    runAgent({ goal: 'Demo', style: 'casual' });
  }, /style must be one of/);
});
