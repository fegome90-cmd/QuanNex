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
  if (!Array.isArray(data.policy_refs)) {
    errors.push('policy_refs must be an array');
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
  if (typeof data.validation_result !== 'object') {
    errors.push('validation_result must be an object');
  }
  return errors;
};

/**
 * Fix para parsing JSON con caracteres de control
 */
function escapeControlCharacters(str) {
  return str
    .replace(/\n/g, '\\n') // Escapa saltos de línea
    .replace(/\r/g, '\\r') // Escapa retornos de carro
    .replace(/\t/g, '\\t') // Escapa tabs
    .replace(/\f/g, '\\f') // Escapa form feeds
    .replace(/\v/g, '\\v'); // Escapa vertical tabs
  // No escapamos \b porque puede estar en palabras normales
}

function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (
      error.message.includes('Bad control character') ||
      error.message.includes('Unexpected non-whitespace character')
    ) {
      console.warn('⚠️  Detectado carácter de control en JSON, aplicando escape...');

      // Limpiar caracteres problemáticos al final
      const cleanedJson = jsonString.trim().replace(/[^\x20-\x7E\s]+$/, '');

      // Escapar caracteres de control
      const escapedJson = escapeControlCharacters(cleanedJson);

      try {
        return JSON.parse(escapedJson);
      } catch (secondError) {
        // Si aún falla, intentar reconstruir el JSON manualmente
        console.warn('⚠️  Escape falló, intentando reconstrucción manual...');

        // Buscar el campo 'code' y escapar su contenido específicamente
        const codeMatch = cleanedJson.match(/"code"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (codeMatch) {
          const originalCode = codeMatch[1];
          const escapedCode = escapeControlCharacters(originalCode);
          const fixedJson = cleanedJson.replace(codeMatch[0], `"code": "${escapedCode}"`);
          return JSON.parse(fixedJson);
        }

        throw secondError;
      }
    }
    throw error;
  }
}

const rawInput = readFileSync(0, 'utf8');
const data = safeJsonParse(rawInput);
const inputErrors = validateInput(data);
if (inputErrors.length > 0) {
  safeErrorLog('Input validation errors:', inputErrors);
  process.exit(1);
}

const payload = {
  policy_refs: data.policy_refs,
  tone: data.tone || 'neutral',
  domain: data.domain || 'general',
  compliance_level: data.compliance_level || 'basic',
};

const serverPath = resolvePath('agents/rules/server.js');
const result = spawnSync('node', [serverPath], {
  input: JSON.stringify(payload),
  encoding: 'utf8',
});
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
  safeErrorLog('Output validation errors:', outputErrors);
  process.exit(1);
}

safeOutputLog(output);
