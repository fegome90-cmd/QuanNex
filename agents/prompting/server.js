#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const SCHEMA_VERSION = '1.0.0';
const AGENT_VERSION = '1.0.0';

const readStdin = () => {
  if (process.stdin.isTTY) {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Usage: server.js <input.json>');
      process.exit(1);
    }
    return readFileSync(filePath, 'utf8');
  }
  return readFileSync(0, 'utf8');
};

try {
  const raw = readStdin();
  const input = JSON.parse(raw);
  if (typeof input.goal !== 'string' || input.goal.trim() === '') {
    throw new Error('Missing required field: goal');
  }

  const style = typeof input.style === 'string' && input.style.trim() !== '' ? input.style : 'default';
  const constraints = Array.isArray(input.constraints) ? input.constraints.join('; ') : '';
  const rules = Array.isArray(input.ruleset_refs) ? input.ruleset_refs.join(', ') : '';
  const contextRefs = Array.isArray(input.context_refs) ? input.context_refs.join(', ') : '';

  const systemPrompt = [
    'You are a helpful coding assistant.',
    `Style: ${style}.`,
    constraints ? `Constraints: ${constraints}.` : '',
    rules ? `Rules: ${rules}.` : '',
    contextRefs ? `Context references: ${contextRefs}.` : ''
  ].filter(Boolean).join(' ');

  const userPrompt = `Goal: ${input.goal.trim()}`;
  const guardrails = Array.isArray(input.constraints) ? input.constraints : [];
  const trace = ['prompting.server:ok'];

  const output = {
    schema_version: SCHEMA_VERSION,
    agent_version: AGENT_VERSION,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    guardrails,
    trace
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`prompting.server:error:${error.message}\n`);
  process.exit(1);
}
