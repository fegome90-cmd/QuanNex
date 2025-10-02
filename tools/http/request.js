#!/usr/bin/env node
/**
 * HTTP Request wrapper con allowlist anti-exfil
 */
import { URL } from 'node:url';

const DEFAULT_ALLOWLIST = [
  'api.github.com',
  'api.stripe.com',
  'api.openai.com',
  'api.anthropic.com',
  'localhost',
  '127.0.0.1',
  'mcp-quannex.com',
  'api.mcp-quannex.com'
];

/**
 * Realiza una petición HTTP con allowlist de dominios
 * @param {object} options - Opciones de la petición
 * @param {string} options.url - URL de destino
 * @param {string} options.method - Método HTTP (default: GET)
 * @param {object} options.headers - Headers HTTP
 * @param {any} options.body - Cuerpo de la petición
 * @param {object} config - Configuración de seguridad
 * @param {string[]} config.allow - Lista de dominios permitidos
 * @param {number} config.timeoutMs - Timeout en milisegundos
 * @returns {Promise<string>} Respuesta de la petición
 */
export async function httpRequest(
  { url, method = 'GET', headers = {}, body = null }, 
  { allow = DEFAULT_ALLOWLIST, timeoutMs = 8000 } = {}
) {
  const host = new URL(url).host;
  const allowed = allow.some(a => host.endsWith(a));
  
  if (!allowed) {
    throw new Error(`E_DENYLIST: host ${host} not in allowlist`);
  }
  
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { 
      method, 
      headers, 
      body, 
      signal: ctl.signal 
    });
    
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}: ${res.statusText}`);
    }
    
    return await res.text();
  } finally { 
    clearTimeout(id); 
  }
}

/**
 * Verifica si un dominio está en la allowlist
 * @param {string} url - URL a verificar
 * @param {string[]} allowlist - Lista de dominios permitidos
 * @returns {boolean} True si está permitido
 */
export function isDomainAllowed(url, allowlist = DEFAULT_ALLOWLIST) {
  try {
    const host = new URL(url).host;
    return allowlist.some(a => host.endsWith(a));
  } catch (e) {
    return false;
  }
}

/**
 * Obtiene la allowlist por defecto
 * @returns {string[]} Lista de dominios permitidos
 */
export function getDefaultAllowlist() {
  return [...DEFAULT_ALLOWLIST];
}

export default {
  httpRequest,
  isDomainAllowed,
  getDefaultAllowlist
};
