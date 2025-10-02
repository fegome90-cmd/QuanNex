#!/usr/bin/env node
/**
 * Proveedor de secretos unificado
 * Lee secretos sin exponerlos. Fuente: env / futuro Vault.
 */
import process from 'node:process';

const required = (name) => {
  const v = process.env[name];
  if (!v || v.length < 8) {
    throw new Error(`Missing or weak secret: ${name}`);
  }
  return v;
};

/**
 * Obtiene un secreto por nombre desde variables de entorno
 * @param {string} name - Nombre del secreto
 * @returns {Promise<string>} Valor del secreto
 */
export async function getSecret(name) {
  // hook: aquí puedes integrar Vault/KMS más adelante
  return required(name);
}

/**
 * Verifica que todos los secretos requeridos estén disponibles
 * @param {string[]} requiredSecrets - Lista de secretos requeridos
 * @returns {Promise<boolean>} True si todos están disponibles
 */
export async function validateSecrets(requiredSecrets) {
  const missing = [];
  
  for (const secret of requiredSecrets) {
    try {
      await getSecret(secret);
    } catch (e) {
      missing.push(secret);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Lista de secretos críticos del sistema
 */
export const CRITICAL_SECRETS = [
  'JWT_SECRET_KEY',
  'JWT_PUBLIC_KEY', 
  'MCP_AGENT_AUTH_TOKEN',
  'RATE_LIMIT_SECRET',
  'QUANNEX_SIGNING_KEY'
];

export default {
  getSecret,
  validateSecrets,
  CRITICAL_SECRETS
};
