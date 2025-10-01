#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import WorkflowOrchestrator from './orchestration/orchestrator.js';

const config = JSON.parse(readFileSync('orchestration/plan.json', 'utf8'));
console.log('Config steps:', config.steps?.length);
console.log('Steps array:', Array.isArray(config.steps));

const orch = new WorkflowOrchestrator();
try {
  const wf = await orch.createWorkflow(config);
  console.log('Workflow created:', wf.workflow_id);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}
