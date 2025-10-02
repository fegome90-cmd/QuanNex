#!/usr/bin/env node
/**
 * Prompting Agent Server - Generación de prompts
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer input desde stdin
const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);

// Procesar prompt
const prompt = {
  goal: data.goal || 'Generate content',
  context: data.context || '',
  constraints: data.constraints || [],
  style: data.style || 'default',
  timestamp: new Date().toISOString()
};

// Generar prompt
const systemPrompt = `# ${prompt.goal}

## Context
${prompt.context}

## Constraints
${prompt.constraints.join('\n- ')}

## Style
${prompt.style}

Generated at: ${prompt.timestamp}`;

// Output del agente según schema esperado
const output = {
  schema_version: '1.0.0',
  agent_version: '1.0.0',
  system_prompt: systemPrompt,
  metadata: {
    goal: prompt.goal,
    style: prompt.style,
    constraints_count: prompt.constraints.length,
    timestamp: prompt.timestamp
  },
  stats: {
    prompt_length: systemPrompt.length,
    constraints_applied: prompt.constraints.length,
    context_length: prompt.context.length
  }
};

console.log(JSON.stringify(output, null, 2));
