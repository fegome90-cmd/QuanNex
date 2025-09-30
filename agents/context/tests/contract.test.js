import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';

const agentPath = resolve(process.cwd(), 'agents/context/agent.js');
const samplePath = 'agents/context/tests/fixtures/sample.txt';

const runAgent = (payload) => execFileSync('node', [agentPath], {
  input: JSON.stringify(payload),
  encoding: 'utf8'
});

test('context agent bundles selectors with versioned stats', () => {
  const input = {
    sources: [samplePath],
    selectors: ['Requisitos'],
    max_tokens: 512
  };

  const response = JSON.parse(runAgent(input));
  assert.strictEqual(response.schema_version, '1.0.0');
  assert.strictEqual(response.agent_version, '1.0.0');
  assert.ok(response.context_bundle.includes('Requisitos'));
  assert.deepStrictEqual(response.provenance, ['loaded:' + samplePath]);
  assert.strictEqual(response.stats.adjusted, false);
  assert.strictEqual(response.stats.truncated, false);
  assert.ok(response.stats.tokens_estimated >= 256);
  assert.ok(response.stats.matched > 0);
});

test('context agent adjusts low max_tokens and records trace', () => {
  const response = JSON.parse(runAgent({
    sources: [samplePath],
    selectors: ['Requisitos'],
    max_tokens: 10
  }));
  assert.strictEqual(response.stats.adjusted, true);
  assert.ok(response.trace.includes('context.server:adjusted_max_tokens'));
});

test('context agent reports empty bundle when selectors do not match', () => {
  const response = JSON.parse(runAgent({
    sources: [samplePath],
    selectors: ['NoExiste']
  }));
  assert.strictEqual(response.context_bundle, '');
  assert.ok(response.provenance.includes('empty:' + samplePath));
  assert.strictEqual(response.stats.matched, 0);
  assert.strictEqual(response.stats.truncated, false);
});

test('context agent rejects traversal attempts', () => {
  assert.throws(() => {
    runAgent({ sources: ['../secrets.txt'] });
  }, /parent directory traversal/);
});

test('context agent rejects source lists above limit', () => {
  const sources = Array.from({ length: 51 }, (_, idx) => `docs/file-${idx}.md`);
  assert.throws(() => {
    runAgent({ sources });
  }, /must not exceed 50 entries/);
});

test('context agent rejects oversized files', () => {
  const largePath = 'agents/context/tests/fixtures/large.tmp';
  const hugeContent = 'x'.repeat(2 * 1024 * 1024 + 10);
  writeFileSync(largePath, hugeContent, 'utf8');
  try {
    assert.throws(() => {
      runAgent({ sources: [largePath] });
    }, /2MB limit/);
  } finally {
    if (existsSync(largePath)) {
      unlinkSync(largePath);
    }
  }
});

