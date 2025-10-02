#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseDir = new URL('../../', import.meta.url);
const resolvePath = (relative) => new URL(relative, baseDir).pathname;

const validateInput = (data) => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (!Array.isArray(data.policy_refs)) {
    errors.push('policy_refs must be an array');
  }
  return errors;
};

const validateOutput = (data) => {
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
  if (typeof data.validation_result !== 'object') {
    errors.push('validation_result must be an object');
  }
  return errors;
};

const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);
const inputErrors = validateInput(data);
if (inputErrors.length > 0) {
  console.error(JSON.stringify(inputErrors, null, 2));
  process.exit(1);
}

const payload = {
  policy_refs: data.policy_refs,
  tone: data.tone || 'neutral',
  domain: data.domain || 'general',
  compliance_level: data.compliance_level || 'basic'
};

const serverPath = resolvePath('agents/rules/server.js');
const result = spawnSync('node', [serverPath], { input: JSON.stringify(payload), encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stderr || 'rules.agent: server execution failed');
  process.exit(1);
}

const rawOutput = result.stdout;
if (!rawOutput) {
  console.error('rules.agent: empty output from server');
  process.exit(1);
}

const output = JSON.parse(rawOutput);
const outputErrors = validateOutput(output);
if (outputErrors.length > 0) {
  console.error(JSON.stringify(outputErrors, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(output, null, 2));