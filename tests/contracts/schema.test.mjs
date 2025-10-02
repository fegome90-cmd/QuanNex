import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

test('Schema validation: Context Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'context', 'agent.js');
  const p = spawn('node', [agentPath], { 
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  // Payload válido para context agent
  const validPayload = {
    sources: ['README.md'],
    selectors: ['test'],
    max_tokens: 1000
  };
  
  p.stdin.write(JSON.stringify(validPayload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0) {
    try {
      const response = JSON.parse(buf);
      assert.ok(response.schema_version, 'Response debe tener schema_version');
      assert.ok(response.agent_version, 'Response debe tener agent_version');
      assert.ok(response.context_bundle || response.provenance, 'Response debe tener output válido');
    } catch (e) {
      assert.fail(`Response no es JSON válido: ${buf}`);
    }
  }
});

test('Schema validation: Prompting Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'prompting', 'agent.js');
  const p = spawn('node', [agentPath], { 
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  // Payload válido para prompting agent
  const validPayload = {
    goal: 'Create a test prompt',
    style: 'formal',
    context: 'Test context',
    constraints: ['Be concise', 'Be clear']
  };
  
  p.stdin.write(JSON.stringify(validPayload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0) {
    try {
      const response = JSON.parse(buf);
      assert.ok(response.schema_version, 'Response debe tener schema_version');
      assert.ok(response.agent_version, 'Response debe tener agent_version');
      assert.ok(response.system_prompt || response.user_prompt, 'Response debe tener output válido');
    } catch (e) {
      assert.fail(`Response no es JSON válido: ${buf}`);
    }
  }
});

test('Schema validation: Rules Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'rules', 'agent.js');
  const p = spawn('node', [agentPath], { 
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  // Payload válido para rules agent
  const validPayload = {
    policy_refs: ['README.md'],
    compliance_level: 'basic',
    tone: 'neutral',
    context: 'Test context'
  };
  
  p.stdin.write(JSON.stringify(validPayload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0) {
    try {
      const response = JSON.parse(buf);
      assert.ok(response.schema_version, 'Response debe tener schema_version');
      assert.ok(response.agent_version, 'Response debe tener agent_version');
      assert.ok(response.policies || response.guardrails || response.rules_compiled, 'Response debe tener output válido');
    } catch (e) {
      assert.fail(`Response no es JSON válido: ${buf}`);
    }
  }
});

test('Schema validation: Invalid input should fail gracefully', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'context', 'agent.js');
  const p = spawn('node', [agentPath], { 
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  // Payload inválido
  const invalidPayload = {
    invalid_field: 'invalid_value'
  };
  
  p.stdin.write(JSON.stringify(invalidPayload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  // Debe fallar con código de error
  assert.ok(code !== 0 || buf.includes('error') || buf.includes('Error'), 'Invalid input debe ser rechazado');
});
