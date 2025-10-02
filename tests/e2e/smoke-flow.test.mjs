import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

test('Smoke E2E: Context Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'context', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, FEATURE_FSM: '0', FEATURE_ROUTER_V2: '0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  p.stdout.on('data', d => stdout += d);
  p.stderr.on('data', d => stderr += d);
  
  // Payload válido para context agent
  const payload = {
    sources: ['README.md'],
    selectors: ['QuanNex'],
    max_tokens: 500
  };
  
  p.stdin.write(JSON.stringify(payload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  assert.equal(code, 0, `Context agent debe ejecutarse sin errores. Code: ${code}, stderr: ${stderr}`);
  assert.ok(stdout.length > 0, 'Context agent debe producir output');
});

test('Smoke E2E: Prompting Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'prompting', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, FEATURE_FSM: '0', FEATURE_ROUTER_V2: '0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  p.stdout.on('data', d => stdout += d);
  p.stderr.on('data', d => stderr += d);
  
  // Payload válido para prompting agent
  const payload = {
    goal: 'Generate a test prompt',
    style: 'formal',
    context: 'Testing the prompting agent',
    constraints: ['Be concise', 'Be clear']
  };
  
  p.stdin.write(JSON.stringify(payload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  assert.equal(code, 0, `Prompting agent debe ejecutarse sin errores. Code: ${code}, stderr: ${stderr}`);
  assert.ok(stdout.length > 0, 'Prompting agent debe producir output');
});

test('Smoke E2E: Rules Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'rules', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, FEATURE_FSM: '0', FEATURE_ROUTER_V2: '0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  p.stdout.on('data', d => stdout += d);
  p.stderr.on('data', d => stderr += d);
  
  // Payload válido para rules agent
  const payload = {
    policy_refs: ['README.md'],
    compliance_level: 'basic',
    tone: 'neutral',
    context: 'Testing the rules agent'
  };
  
  p.stdin.write(JSON.stringify(payload));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  assert.equal(code, 0, `Rules agent debe ejecutarse sin errores. Code: ${code}, stderr: ${stderr}`);
  assert.ok(stdout.length > 0, 'Rules agent debe producir output');
});

test('Smoke E2E: Orchestrator Health Check', async (t) => {
  const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
  const p = spawn('node', [orchestratorPath, 'health'], { 
    env: { ...process.env, FEATURE_FSM: '0', FEATURE_ROUTER_V2: '0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  p.stdout.on('data', d => stdout += d);
  p.stderr.on('data', d => stderr += d);
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  assert.equal(code, 0, `Orchestrator health check debe ejecutarse sin errores. Code: ${code}, stderr: ${stderr}`);
  assert.ok(stdout.length > 0, 'Orchestrator debe producir output');
  
  // Verificar que el output contiene información de health
  assert.ok(stdout.includes('healthy') || stdout.includes('status'), 'Health check debe incluir status');
});
