#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hello, isHello } from '../../contracts/handshake.js';
import { validateReq, ok, fail } from '../../contracts/schema.js';

const baseDir = new URL('../../', import.meta.url);
const resolvePath = relative => new URL(relative, baseDir).pathname;

const MAX_LIST_ITEMS = 50;
const DEFAULT_MAX_TOKENS = 512;

const ensureStringArray = (
  field,
  value,
  errors,
  { allowEmpty = false } = {}
) => {
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
  if (
    !value.every(
      item => typeof item === 'string' && (allowEmpty || item.trim() !== '')
    )
  ) {
    errors.push(`${field} items must be non-empty strings`);
  }
};

const validateInput = data => {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return ['Input must be an object'];
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    errors.push('sources must be a non-empty array of strings');
  } else {
    if (data.sources.length > MAX_LIST_ITEMS) {
      errors.push(`sources must not exceed ${MAX_LIST_ITEMS} entries`);
    }
    if (
      !data.sources.every(
        item => typeof item === 'string' && item.trim() !== ''
      )
    ) {
      errors.push('sources items must be non-empty strings');
    }
    if (data.sources.some(item => item.includes('..'))) {
      errors.push('sources must not contain parent directory traversal (..)');
    }
  }
  ensureStringArray('selectors', data.selectors, errors);
  if (data.max_tokens !== undefined) {
    if (
      typeof data.max_tokens !== 'number' ||
      !Number.isInteger(data.max_tokens)
    ) {
      errors.push('max_tokens must be an integer when provided');
    } else if (data.max_tokens <= 0) {
      errors.push('max_tokens must be greater than zero when provided');
    }
  }
  return errors;
};

const validateStats = (stats, errors) => {
  if (typeof stats !== 'object' || stats === null) {
    errors.push('stats must be an object');
    return;
  }

  const statValidations = [
    { field: 'tokens_estimated', type: 'number' },
    { field: 'chunks', type: 'number' },
    { field: 'matched', type: 'number' },
    { field: 'truncated', type: 'boolean' },
    { field: 'adjusted', type: 'boolean' }
  ];

  statValidations.forEach(({ field, type }) => {
    if (typeof stats[field] !== type) {
      errors.push(`stats.${field} must be a ${type}`);
    }
  });
};

const validateOutput = data => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Output must be an object'];
  }

  // Basic field validations
  if (data.schema_version !== '1.0.0') {
    errors.push('schema_version must equal 1.0.0');
  }
  if (
    typeof data.agent_version !== 'string' ||
    data.agent_version.trim() === ''
  ) {
    errors.push('agent_version must be a non-empty string');
  }
  if (typeof data.context_bundle !== 'string') {
    errors.push('context_bundle must be a string');
  }
  if (
    !Array.isArray(data.provenance) ||
    !data.provenance.every(item => typeof item === 'string')
  ) {
    errors.push('provenance must be an array of strings');
  }

  // Validate stats object
  validateStats(data.stats, errors);

  // Validate optional trace field
  if (data.trace !== undefined) {
    if (
      !Array.isArray(data.trace) ||
      !data.trace.every(item => typeof item === 'string')
    ) {
      errors.push('trace must be an array of strings when provided');
    }
  }

  return errors;
};

// Nueva función para manejar mensajes con handshake
async function onMessage(msg) {
  if (isHello(msg)) return hello("context");
  if (!validateReq(msg)) return fail("INVALID_SCHEMA_MIN");

  if (msg.capability === "context.resolve") {
    try {
      // Usar funcionalidad real del servidor
      const { sources, selectors, max_tokens } = msg.payload;
      const payload = {
        sources: sources || [],
        selectors: selectors || [],
        max_tokens: max_tokens || DEFAULT_MAX_TOKENS
      };
      
      const serverPath = resolvePath('agents/context/server.js');
      const result = spawnSync('node', [serverPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8'
      });
      
      if (result.status !== 0) {
        return fail(`Context resolution failed: ${result.stderr}`);
      }
      
      const contextData = JSON.parse(result.stdout);
      return ok({
        project: process.cwd().split('/').pop(),
        branch: "main", // TODO: Implement git branch detection
        filesChanged: sources || [],
        contextBundle: contextData.context_bundle,
        provenance: contextData.provenance,
        stats: contextData.stats
      });
    } catch (error) {
      return fail(`Context resolution error: ${error.message}`);
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

const payload = {
  sources: data.sources,
  selectors: Array.isArray(data.selectors) ? data.selectors : []
};
if (typeof data.max_tokens === 'number') {
  payload.max_tokens = data.max_tokens;
}

const serverPath = resolvePath('agents/context/server.js');
const result = spawnSync('node', [serverPath], {
  input: JSON.stringify(payload),
  encoding: 'utf8'
});
if (result.status !== 0) {
  console.error(result.stderr || 'context.agent: server execution failed');
  process.exit(result.status ?? 1);
}

const rawOutput = result.stdout;
if (!rawOutput) {
  console.error('context.agent: empty output from server');
  process.exit(1);
}

const output = JSON.parse(rawOutput);
const outputErrors = validateOutput(output);
if (outputErrors.length > 0) {
  console.error(JSON.stringify(outputErrors, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(output, null, 2));
