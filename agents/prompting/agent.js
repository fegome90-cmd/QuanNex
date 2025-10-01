#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hello, isHello } from '../../contracts/handshake.js';
import { validateReq, ok, fail } from '../../contracts/schema.js';

const baseDir = new URL('../../', import.meta.url);
const resolvePath = relative => new URL(relative, baseDir).pathname;

const ALLOWED_STYLES = [
  'default',
  'formal',
  'concise',
  'creative',
  'technical'
];
const MAX_LIST_ITEMS = 50;

const ensureArray = value => (Array.isArray(value) ? value : []);

const validateStringArray = (field, value, errors) => {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array of strings`);
    return;
  }
  if (value.length > MAX_LIST_ITEMS) {
    errors.push(`${field} must not exceed ${MAX_LIST_ITEMS} entries`);
  }
  if (!value.every(item => typeof item === 'string')) {
    errors.push(`${field} items must be strings`);
  }
};

const validateInput = data => {
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  const errors = [];
  if (typeof data.goal !== 'string' || data.goal.trim() === '') {
    errors.push('goal must be a non-empty string');
  }
  if (data.style !== undefined) {
    if (typeof data.style !== 'string') {
      errors.push('style must be a string');
    } else if (!ALLOWED_STYLES.includes(data.style)) {
      errors.push(`style must be one of: ${ALLOWED_STYLES.join(', ')}`);
    }
  }
  validateStringArray('constraints', data.constraints, errors);
  validateStringArray('context_refs', data.context_refs, errors);
  validateStringArray('ruleset_refs', data.ruleset_refs, errors);
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
  if (
    typeof data.agent_version !== 'string' ||
    data.agent_version.trim() === ''
  ) {
    errors.push('agent_version must be a non-empty string');
  }
  if (
    typeof data.system_prompt !== 'string' ||
    data.system_prompt.trim() === ''
  ) {
    errors.push('system_prompt must be a non-empty string');
  }
  if (typeof data.user_prompt !== 'string' || data.user_prompt.trim() === '') {
    errors.push('user_prompt must be a non-empty string');
  }
  if (data.guardrails !== undefined) {
    if (!Array.isArray(data.guardrails)) {
      errors.push('guardrails must be an array');
    } else if (!data.guardrails.every(item => typeof item === 'string')) {
      errors.push('guardrails items must be strings');
    }
  }
  if (data.trace !== undefined) {
    if (!Array.isArray(data.trace)) {
      errors.push('trace must be an array');
    } else if (!data.trace.every(item => typeof item === 'string')) {
      errors.push('trace items must be strings');
    }
  }
  return errors;
};

// Nueva función para manejar mensajes con handshake
async function onMessage(msg) {
  if (isHello(msg)) return hello("prompting");
  if (!validateReq(msg)) return fail("INVALID_SCHEMA_MIN");

  if (msg.capability === "prompting.buildPrompt") {
    try {
      // Usar funcionalidad real del servidor
      const { goal, style, constraints, context_refs, ruleset_refs } = msg.payload;
      const payload = {
        goal: goal || "Generate prompt",
        style: style || "default",
        constraints: constraints || [],
        context_refs: context_refs || [],
        ruleset_refs: ruleset_refs || []
      };
      
      const serverPath = resolvePath('agents/prompting/server.js');
      const result = spawnSync('node', [serverPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8'
      });
      
      if (result.status !== 0) {
        return fail(`Prompt generation failed: ${result.stderr}`);
      }
      
      const promptData = JSON.parse(result.stdout);
      return ok({
        templateId: style || "default",
        filled: promptData.system_prompt + "\n\n" + promptData.user_prompt,
        systemPrompt: promptData.system_prompt,
        userPrompt: promptData.user_prompt,
        guardrails: promptData.guardrails || []
      });
    } catch (error) {
      return fail(`Prompt generation error: ${error.message}`);
    }
  }
  return fail("UNKNOWN_CAPABILITY");
}

const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);

// Verificar si es un mensaje de handshake o con schema
if (data.type === "hello" || data.requestId) {
  const response = await onMessage(data);
  console.log(JSON.stringify(response, null, 2));
  process.exit(0);
}

// Lógica original para compatibilidad
const inputErrors = validateInput(data);
if (inputErrors.length > 0) {
  console.error(JSON.stringify(inputErrors, null, 2));
  process.exit(1);
}

data.constraints = ensureArray(data.constraints);
data.context_refs = ensureArray(data.context_refs);
data.ruleset_refs = ensureArray(data.ruleset_refs);

const serverPath = resolvePath('agents/prompting/server.js');
const result = spawnSync('node', [serverPath], {
  input: JSON.stringify(data),
  encoding: 'utf8'
});
if (result.status !== 0) {
  console.error(result.stderr || 'prompting.agent: server execution failed');
  process.exit(result.status ?? 1);
}

const rawOutput = result.stdout;
if (!rawOutput) {
  console.error('prompting.agent: empty output from server');
  process.exit(1);
}

const output = JSON.parse(rawOutput);
const outputErrors = validateOutput(output);
if (outputErrors.length > 0) {
  console.error(JSON.stringify(outputErrors, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(output, null, 2));
