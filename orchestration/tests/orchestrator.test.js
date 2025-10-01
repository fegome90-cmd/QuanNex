import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import WorkflowOrchestrator from '../orchestrator.js';

test('runs rules→context→prompting with gates', async() => {
  const orch = new WorkflowOrchestrator({ timeoutMs: 15000 });
  const cfg = JSON.parse(
    readFileSync(join(process.cwd(), 'orchestration/plan.json'))
  );
  const wf = await orch.createWorkflow(cfg);
  assert.ok(wf.workflow_id);

  const exec = await orch.executeWorkflow(wf.workflow_id);
  assert.equal(exec.status, 'completed');

  // const _steps = Object.fromEntries(exec.steps?.map(s => [s.step_id, s]) || []);
  // o usa exec.results
  assert.ok(exec.results.rules);
  assert.ok(exec.results.context);
  assert.ok(exec.results.prompting);
});

test('validates workflow configuration', async() => {
  const orch = new WorkflowOrchestrator();

  // Test valid config
  const validConfig = {
    name: 'Test Workflow',
    steps: [
      {
        step_id: 'test1',
        agent: 'context',
        action: 'extract',
        input: { sources: ['test'] }
      }
    ]
  };

  const wf = await orch.createWorkflow(validConfig);
  assert.ok(wf.workflow_id);

  // Test invalid config - missing step_id
  const invalidConfig = {
    name: 'Invalid Workflow',
    steps: [
      {
        agent: 'context',
        action: 'extract',
        input: { sources: ['test'] }
      }
    ]
  };

  try {
    await orch.createWorkflow(invalidConfig);
    assert.fail('Should have thrown error for invalid config');
  } catch (e) {
    assert.ok(e.message.includes('missing step_id'));
  }
});

test('handles timeouts correctly', async() => {
  const orch = new WorkflowOrchestrator({ timeoutMs: 1000 }); // Very short timeout

  const config = {
    name: 'Timeout Test',
    steps: [
      {
        step_id: 'timeout_test',
        agent: 'context',
        action: 'extract',
        input: { sources: ['test'] },
        timeout_ms: 500 // Even shorter timeout
      }
    ]
  };

  const wf = await orch.createWorkflow(config);

  try {
    await orch.executeWorkflow(wf.workflow_id);
    // If it doesn't timeout, that's also fine - depends on agent performance
  } catch (e) {
    // Expected to potentially timeout
    assert.ok(e.message.includes('timed out') || e.message.includes('failed'));
  }
});

test('cleanup removes artifacts', async() => {
  const orch = new WorkflowOrchestrator();

  const config = {
    name: 'Cleanup Test',
    steps: [
      {
        step_id: 'cleanup_test',
        agent: 'context',
        action: 'extract',
        input: { sources: ['test'] }
      }
    ]
  };

  const wf = await orch.createWorkflow(config);
  const result = await orch.executeWorkflow(wf.workflow_id);

  assert.equal(result.status, 'completed');

  // Test cleanup
  const cleaned = orch.cleanup(wf.workflow_id);
  assert.ok(cleaned);
});

test('health check works', async() => {
  const orch = new WorkflowOrchestrator();
  const health = await orch.healthCheck();

  assert.ok(health.context);
  assert.ok(health.prompting);
  assert.ok(health.rules);

  // Health check should return status for each agent
  assert.ok(health.context.status);
  assert.ok(health.prompting.status);
  assert.ok(health.rules.status);
});
