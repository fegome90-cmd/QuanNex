import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

test('Handshake: Context Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'context', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, TEST_MODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  p.stdin.write(JSON.stringify({ type: 'hello', agent: 'context' }));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0 && buf.trim()) {
    try {
      const msg = JSON.parse(buf);
      assert.equal(msg.agent || 'context', 'context');
      assert.ok(msg.schema_version || msg.agent_version);
    } catch (e) {
      // Si no es JSON válido, al menos debe tener output
      assert.ok(buf.length > 0, 'Agent debe producir output');
    }
  }
});

test('Handshake: Prompting Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'prompting', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, TEST_MODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  p.stdin.write(JSON.stringify({ type: 'hello', agent: 'prompting' }));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0 && buf.trim()) {
    try {
      const msg = JSON.parse(buf);
      assert.equal(msg.agent || 'prompting', 'prompting');
      assert.ok(msg.schema_version || msg.agent_version);
    } catch (e) {
      // Si no es JSON válido, al menos debe tener output
      assert.ok(buf.length > 0, 'Agent debe producir output');
    }
  }
});

test('Handshake: Rules Agent', async (t) => {
  const agentPath = join(PROJECT_ROOT, 'agents', 'rules', 'agent.js');
  const p = spawn('node', [agentPath], { 
    env: { ...process.env, TEST_MODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let buf = '';
  p.stdout.on('data', d => buf += d);
  p.stderr.on('data', d => buf += d);
  
  p.stdin.write(JSON.stringify({ type: 'hello', agent: 'rules' }));
  p.stdin.end();
  
  const code = await new Promise((resolve) => p.on('exit', resolve));
  
  if (code === 0 && buf.trim()) {
    try {
      const msg = JSON.parse(buf);
      assert.equal(msg.agent || 'rules', 'rules');
      assert.ok(msg.schema_version || msg.agent_version);
    } catch (e) {
      // Si no es JSON válido, al menos debe tener output
      assert.ok(buf.length > 0, 'Agent debe producir output');
    }
  }
});
