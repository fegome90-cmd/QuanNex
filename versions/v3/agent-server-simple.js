#!/usr/bin/env node
/**
 * AGENT SERVER SIMPLE - SINCRONO
 * Versión completamente síncrona para evitar problemas de stdin/stdout
 */

// Leer entrada desde stdin de forma síncrona
import { readFileSync } from 'fs';
const input = readFileSync(0, 'utf8').trim();

try {
  const request = JSON.parse(input);
  const { agent, capability, payload = {} } = request;
  
  // Simular respuesta exitosa
  const result = {
    response: {
      ok: true,
      agent: agent,
      capability: capability,
      result: {
        success: true,
        data: { message: `${agent} agent responded successfully` }
      }
    }
  };
  
  console.log(JSON.stringify(result));
} catch (error) {
  const errorResult = {
    response: {
      ok: false,
      error: error.message
    }
  };
  console.error(JSON.stringify(errorResult));
  process.exit(1);
}
