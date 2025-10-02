/**
 * File-Based Rate Limiter - GAP-002 Implementation
 * Usa archivos para mantener estado compartido entre procesos
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RATE_LIMIT_DIR = join(__dirname, '../.rate-limits');

// Asegurar que el directorio existe
if (!existsSync(RATE_LIMIT_DIR)) {
  mkdirSync(RATE_LIMIT_DIR, { recursive: true });
}

// Límites por agente (requests por minuto)
const AGENT_LIMITS = {
  'context': 10,
  'prompting': 15,
  'rules': 20,
  'security': 5,
  'metrics': 30,
  'optimization': 10,
  'docsync': 25,
  'lint': 20,
  'orchestrator': 50,
  'refactor': 10,
  'secscan': 5,
  'tests': 30
};

/**
 * Obtiene el path del archivo de rate limiting para un agente
 * @param {string} agentName - Nombre del agente
 * @returns {string} Path del archivo
 */
function getRateLimitFilePath(agentName) {
  return join(RATE_LIMIT_DIR, `${agentName}.json`);
}

/**
 * Lee el estado actual del rate limiting
 * @param {string} agentName - Nombre del agente
 * @returns {Object} Estado actual
 */
function readRateLimitState(agentName) {
  const filePath = getRateLimitFilePath(agentName);
  
  if (!existsSync(filePath)) {
    return {
      count: 0,
      resetTime: Date.now() + 60000 // Reset en 1 minuto
    };
  }
  
  try {
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      count: 0,
      resetTime: Date.now() + 60000
    };
  }
}

/**
 * Escribe el estado del rate limiting
 * @param {string} agentName - Nombre del agente
 * @param {Object} state - Estado a escribir
 */
function writeRateLimitState(agentName, state) {
  const filePath = getRateLimitFilePath(agentName);
  
  try {
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error(`Error writing rate limit state for ${agentName}:`, error.message);
  }
}

/**
 * Verifica si se puede procesar una request
 * @param {string} agentName - Nombre del agente
 * @returns {boolean} true si se puede procesar, false si está limitado
 */
export function checkRateLimit(agentName) {
  const now = Date.now();
  const limit = AGENT_LIMITS[agentName] || AGENT_LIMITS['context'];
  
  // Leer estado actual
  let state = readRateLimitState(agentName);
  
  // Reset si ha pasado el tiempo
  if (now >= state.resetTime) {
    state = {
      count: 0,
      resetTime: now + 60000 // Reset en 1 minuto
    };
  }
  
  // Verificar límite
  if (state.count >= limit) {
    console.log(`🚫 [Rate Limiter] ${agentName}: Rate limit exceeded (${state.count}/${limit})`);
    return false;
  }
  
  // Incrementar contador y escribir estado
  state.count++;
  writeRateLimitState(agentName, state);
  
  console.log(`✅ [Rate Limiter] ${agentName}: Request allowed (${state.count}/${limit})`);
  return true;
}

/**
 * Obtiene estadísticas de rate limiting
 * @returns {Object} Estadísticas actuales
 */
export function getRateLimitStats() {
  const stats = {
    agents: {},
    total_requests: 0
  };
  
  for (const agentName of Object.keys(AGENT_LIMITS)) {
    const state = readRateLimitState(agentName);
    const limit = AGENT_LIMITS[agentName];
    
    stats.agents[agentName] = {
      requests: state.count,
      limit: limit,
      remaining: Math.max(0, limit - state.count),
      reset_in_seconds: Math.max(0, Math.ceil((state.resetTime - Date.now()) / 1000))
    };
    stats.total_requests += state.count;
  }
  
  return stats;
}

/**
 * Limpia archivos de rate limiting expirados
 */
export function cleanupExpiredRateLimits() {
  const now = Date.now();
  
  for (const agentName of Object.keys(AGENT_LIMITS)) {
    const state = readRateLimitState(agentName);
    
    if (now >= state.resetTime) {
      const filePath = getRateLimitFilePath(agentName);
      try {
        writeFileSync(filePath, JSON.stringify({
          count: 0,
          resetTime: now + 60000
        }, null, 2));
      } catch (error) {
        console.error(`Error cleaning up rate limit for ${agentName}:`, error.message);
      }
    }
  }
}

export default {
  checkRateLimit,
  getRateLimitStats,
  cleanupExpiredRateLimits,
  AGENT_LIMITS
};
