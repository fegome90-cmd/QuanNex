#!/usr/bin/env node
import WorkflowOrchestrator from './orchestrator.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testOrchestration() {
  console.log('🧪 Testing Orchestration System');
  console.log('================================\n');

  const orchestrator = new WorkflowOrchestrator();

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Agent Health Check...');
    const health = await orchestrator.healthCheck();
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

    const workflow = await orchestrator.createWorkflow(promptTemplate);
    console.log('Workflow created:', workflow.workflow_id);

    // Execute workflow
    const result = await orchestrator.executeWorkflow(workflow.workflow_id);
    console.log('Workflow executed successfully');
    console.log('Status:', result.status);
    console.log('Steps completed:', Object.keys(result.results).length);
    console.log('✅ Prompt generation workflow completed\n');

    // Test 3: Direct agent call
    console.log('3️⃣ Testing Direct Agent Call...');
    const directResult = await orchestrator.callAgent('context', 'extract', {
      sources: ['Test source for direct call'],
      selectors: ['test'],
      max_tokens: 500
    });
    console.log('Direct call result:', JSON.stringify(directResult, null, 2));
    console.log('✅ Direct agent call completed\n');

    // Test 4: List workflows
    console.log('4️⃣ Testing Workflow Listing...');
    const workflows = orchestrator.listWorkflows();
    console.log('Active workflows:', workflows.length);
    workflows.forEach(wf => {
      console.log(`- ${wf.workflow_id}: ${wf.name} (${wf.status})`);
    });
    console.log('✅ Workflow listing completed\n');

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
