#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseDir = new URL('../../', import.meta.url);
const resolvePath = relative => new URL(relative, baseDir).pathname;

const MAX_LIST_ITEMS = 50;
const ALLOWED_TONES = ['neutral', 'formal', 'friendly', 'assertive'];
const ALLOWED_COMPLIANCE = ['none', 'basic', 'strict'];

const validatePolicyRefs = (policyRefs, errors) => {
  if (!Array.isArray(policyRefs) || policyRefs.length === 0) {
    errors.push('policy_refs must be a non-empty array of strings');
    return;
  }

  if (policyRefs.length > MAX_LIST_ITEMS) {
    errors.push(`policy_refs must not exceed ${MAX_LIST_ITEMS} entries`);
  }
  if (
    !policyRefs.every(item => typeof item === 'string' && item.trim() !== '')
  ) {
    errors.push('policy_refs items must be non-empty strings');
  }
  if (policyRefs.some(item => item.includes('..'))) {
    errors.push('policy_refs must not contain parent directory traversal (..)');
  }
};

const validateEnumField = (value, fieldName, allowedValues, errors) => {
  if (value === undefined) return;

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string when provided`);
    return;
  }

  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
};

const validateInput = data => {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return ['Input must be an object'];
  }

  // Validate policy_refs
  validatePolicyRefs(data.policy_refs, errors);

  // Validate optional enum fields
  validateEnumField(data.tone, 'tone', ALLOWED_TONES, errors);
  validateEnumField(
    data.compliance_level,
    'compliance_level',
    ALLOWED_COMPLIANCE,
    errors
  );

  // Validate optional string fields
  if (data.domain !== undefined && typeof data.domain !== 'string') {
    errors.push('domain must be a string when provided');
  }

  return errors;
};

const validateOutput = data => {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return ['Output must be an object'];
  }
  if (data.schema_version !== '1.0.0') {
    errors.push('schema_version must equal 1.0.0');
  }
  if (
    typeof data.agent_version !== 'string' ||
    data.agent_version.trim() === ''
  ) {
    errors.push('agent_version must be a non-empty string');
  }
  if (
    !Array.isArray(data.rules_compiled) ||
    !data.rules_compiled.every(item => typeof item === 'string')
  ) {
    errors.push('rules_compiled must be an array of strings');
  }
  if (
    data.violations !== undefined &&
    (!Array.isArray(data.violations) ||
      !data.violations.every(item => typeof item === 'string'))
  ) {
    errors.push('violations must be an array of strings when present');
  }
  if (
    data.advice !== undefined &&
    (!Array.isArray(data.advice) ||
      !data.advice.every(item => typeof item === 'string'))
  ) {
    errors.push('advice must be an array of strings when present');
  }
  if (
    data.trace !== undefined &&
    (!Array.isArray(data.trace) ||
      !data.trace.every(item => typeof item === 'string'))
  ) {
    errors.push('trace must be an array of strings when present');
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
const result = spawnSync('node', [serverPath], {
  input: JSON.stringify(payload),
  encoding: 'utf8'
});
if (result.status !== 0) {
  console.error(result.stderr || 'rules.agent: server execution failed');
  process.exit(result.status ?? 1);
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
