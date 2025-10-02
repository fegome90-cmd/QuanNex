#!/usr/bin/env node
import ConsolidatedOrchestratorV3 from './consolidated-orchestrator.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testOrchestration() {
  console.log('🧪 Testing Orchestration System');
  console.log('================================\n');

  const orchestrator = new ConsolidatedOrchestratorV3();

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Agent Health Check...');
    const health = await orchestrator.getStatus();
    console.log('Health Status:', JSON.stringify(health, null, 2));
    console.log('✅ Health check completed\n');

    // Test 2: Load and execute prompt generation workflow
    console.log('2️⃣ Testing Prompt Generation Workflow...');
    const promptTemplate = JSON.parse(
      readFileSync(
        join(__dirname, 'workflows', 'prompt-generation.json'),
        'utf8'
      )
    );

    // Add some test context
    promptTemplate.context = {
      ...promptTemplate.context,
      test_sources: [
        'This is a test project for AI development',
        'We need to create prompts for code generation',
        'The system should be secure and compliant'
      ]
    };

    promptTemplate.steps[0].input.sources = promptTemplate.context.test_sources;
    promptTemplate.steps[1].input.goal =
      'Create a prompt for generating secure code';
    promptTemplate.steps[1].input.constraints = [
      'Security first',
      'Clean code',
      'Documentation'
    ];

    // Simular creación de workflow (el ConsolidatedOrchestratorV3 no tiene createWorkflow)
    const workflowId = 'test-workflow-' + Date.now();
    console.log('Workflow ID:', workflowId);

    // Execute workflow
    const result = await orchestrator.executeWorkflow(workflowId, promptTemplate);
    console.log('Workflow executed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('✅ Prompt generation workflow completed\n');

    // Test 3: Direct agent call
    console.log('3️⃣ Testing Direct Agent Call...');
    const directResult = await orchestrator.callAgent('context', {
      requestId: 'test-direct-call',
      agent: 'context',
      capability: 'context.resolve',
      payload: {
        sources: ['Test source for direct call'],
        selectors: ['test'],
        max_tokens: 500
      },
      ts: new Date().toISOString()
    });
    console.log('Direct call result:', JSON.stringify(directResult, null, 2));
    console.log('✅ Direct agent call completed\n');

    // Test 4: Status check
    console.log('4️⃣ Testing Status Check...');
    const status = await orchestrator.getStatus();
    console.log('Active workflows:', status.workflows.active);
    console.log('✅ Status check completed\n');

    console.log('🎉 All orchestration tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOrchestration();
}

export default testOrchestration;
