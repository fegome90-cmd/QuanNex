#!/usr/bin/env node
/**
 * Context Agent Server - Versión Docker
 * Servidor simple para el Context Agent en contenedor Docker
 */

import { readFileSync } from 'node:fs';

// Leer input desde stdin
const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);

// Simular procesamiento de contexto
const mockContext = {
  extracted: data.sources.map(source => ({
    file: source,
    content: `Content from ${source}`,
    relevance: 0.8,
  })),
  metadata: {
    total_sources: data.sources.length,
    selectors_applied: data.selectors || [],
    max_tokens: data.max_tokens || 1000,
  },
};

// Respuesta del agente
const response = {
  schema_version: '1.0.0',
  agent_version: '1.0.0',
  context_bundle: JSON.stringify(mockContext),
  provenance: data.sources,
  stats: {
    tokens_estimated: data.max_tokens || 1000,
    chunks: data.sources.length,
    matched: data.sources.length,
    truncated: false,
    adjusted: false,
  },
};

// Output JSON
console.log(JSON.stringify(response));
