#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { safeErrorLog, safeOutputLog } from '../../utils/log-sanitizer.js';

const baseDir = new URL('../../', import.meta.url);
const resolvePath = relative => new URL(relative, baseDir).pathname;

const validateInput = data => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (typeof data.goal !== 'string' || data.goal.trim() === '') {
    errors.push('goal must be a non-empty string');
  }
  return errors;
};

const validateOutput = data => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Output must be an object'];
  }
  if (data.schema_version !== '1.0.0') {
    errors.push('schema_version must equal 1.0.0');
  }
  if (typeof data.agent_version !== 'string' || data.agent_version.trim() === '') {
    errors.push('agent_version must be a non-empty string');
  }
  if (typeof data.system_prompt !== 'string') {
    errors.push('system_prompt must be a string');
  }
  return errors;
};

const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);
const inputErrors = validateInput(data);
if (inputErrors.length > 0) {
  safeErrorLog('Input validation errors:', inputErrors);
  process.exit(1);
}

const payload = {
  goal: data.goal,
  context: data.context || '',
  constraints: Array.isArray(data.constraints) ? data.constraints : [],
  style: data.style || 'default',
};

const serverPath = resolvePath('agents/prompting/server.js');
const result = spawnSync('node', [serverPath], {
  input: JSON.stringify(payload),
  encoding: 'utf8',
});
if (result.status !== 0) {
  console.error(result.stderr || 'prompting.agent: server execution failed');
  process.exit(1);
}

const rawOutput = result.stdout;
if (!rawOutput) {
  console.error('prompting.agent: empty output from server');
  process.exit(1);
}

const output = JSON.parse(rawOutput);
const outputErrors = validateOutput(output);
if (outputErrors.length > 0) {
  safeErrorLog('Output validation errors:', outputErrors);
  process.exit(1);
}

safeOutputLog(output);
