/**
 * JWT Authentication Module - GAP-004 Implementation
 * Sistema de autenticación JWT entre agentes
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret } from './secure-secrets-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const JWT_CONFIG = {
  algorithm: 'HS256',
  expiresIn: '1h', // 1 hora
  issuer: 'mcp-quannex',
  audience: 'agents'
};

const KEYS_DIR = join(__dirname, '../.jwt_keys');
const SECRET_KEY_FILE = join(KEYS_DIR, 'secret.key');
const PUBLIC_KEY_FILE = join(KEYS_DIR, 'public.key');

// Roles de agentes
const AGENT_ROLES = {
  'context': ['read', 'write', 'scan'],
  'prompting': ['read', 'generate'],
  'rules': ['read', 'validate'],
  'security': ['read', 'write', 'scan', 'audit'],
  'metrics': ['read', 'collect'],
  'optimization': ['read', 'analyze'],
  'orchestrator': ['read', 'write', 'execute', 'manage'],
  'system': ['read', 'write', 'execute', 'manage', 'scan', 'audit'] // Agregar sistema como agente válido
};

// Asegurar que el directorio de claves existe
if (!existsSync(KEYS_DIR)) {
  mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Genera claves JWT si no existen
 */
async function ensureKeysExist() {
  if (!existsSync(SECRET_KEY_FILE)) {
    const secretKey = await getSecret('JWT_SECRET_KEY', 'mcp-quannex-secret');
    writeFileSync(SECRET_KEY_FILE, secretKey, 'utf8');
    console.log('🔑 JWT secret key generated');
  }
  
  if (!existsSync(PUBLIC_KEY_FILE)) {
    const publicKey = await getSecret('JWT_PUBLIC_KEY', 'mcp-quannex-public');
    writeFileSync(PUBLIC_KEY_FILE, publicKey, 'utf8');
    console.log('🔑 JWT public key generated');
  }
}

/**
 * Lee la clave secreta
 */
async function getSecretKey() {
  await ensureKeysExist();
  return readFileSync(SECRET_KEY_FILE, 'utf8');
}

/**
 * Lee la clave pública
 */
async function getPublicKey() {
  await ensureKeysExist();
  return readFileSync(PUBLIC_KEY_FILE, 'utf8');
}

/**
 * Codifica Base64URL
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodifica Base64URL
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Genera firma HMAC-SHA256
 */
function sign(payload, secret) {
  const header = {
    alg: JWT_CONFIG.algorithm,
    typ: 'JWT'
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifica firma HMAC-SHA256
 */
function verify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid signature');
  }
  
  return JSON.parse(base64UrlDecode(encodedPayload));
}

/**
 * Genera token JWT para un agente
 */
export async function generateToken(agentId, permissions = []) {
  const secret = await getSecretKey();
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: JWT_CONFIG.issuer,
    aud: JWT_CONFIG.audience,
    sub: agentId,
    iat: now,
    exp: now + 3600, // 1 hora
    permissions: permissions || [],
    roles: AGENT_ROLES[agentId] || []
  };
  
  return sign(payload, secret);
}

/**
 * Verifica token JWT
 */
export async function verifyToken(token) {
  const secret = await getSecretKey();
  
  try {
    const payload = verify(token, secret);
    
    // Verificar expiración
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    // Verificar audiencia
    if (payload.aud !== JWT_CONFIG.audience) {
      throw new Error('Invalid audience');
    }
    
    // Verificar emisor
    if (payload.iss !== JWT_CONFIG.issuer) {
      throw new Error('Invalid issuer');
    }
    
    return payload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Middleware de autenticación para agentes
 */
export async function authenticateAgent(agentId, token) {
  try {
    const payload = await verifyToken(token);
    
    // Verificar que el token pertenece al agente correcto
    if (payload.sub !== agentId) {
      throw new Error('Token does not belong to this agent');
    }
    
    return {
      authenticated: true,
      agentId: payload.sub,
      permissions: payload.permissions,
      roles: payload.roles,
      expiresAt: new Date(payload.exp * 1000)
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error.message
    };
  }
}

/**
 * Verifica si un agente tiene permisos específicos
 */
export function hasPermission(agentId, permission, token) {
  const auth = authenticateAgent(agentId, token);
  
  if (!auth.authenticated) {
    return false;
  }
  
  return auth.permissions.includes(permission) || auth.roles.includes(permission);
}

/**
 * Genera token para comunicación entre agentes
 */
export async function generateAgentToken(sourceAgent, permissions = [], targetAgent = 'system', action = 'read') {
  return await generateToken(sourceAgent, permissions);
}

/**
 * Middleware para validar comunicación entre agentes
 */
export async function validateAgentCommunication(sourceAgent, targetAgent, action, token) {
  const auth = await authenticateAgent(sourceAgent, token);
  
  if (!auth.authenticated) {
    return {
      valid: false,
      error: `Authentication failed: ${auth.error}`
    };
  }
  
  // Verificar que el agente tiene permisos para la acción
  if (!hasPermission(sourceAgent, action, token)) {
    return {
      valid: false,
      error: `Agent ${sourceAgent} does not have permission for action: ${action}`
    };
  }
  
  // Verificar que el agente destino puede recibir la acción
  const targetRoles = AGENT_ROLES[targetAgent] || [];
  if (!targetRoles.includes(action)) {
    return {
      valid: false,
      error: `Target agent ${targetAgent} cannot receive action: ${action}`
    };
  }
  
  return {
    valid: true,
    sourceAgent: auth.agentId,
    targetAgent: targetAgent,
    action: action,
    permissions: auth.permissions
  };
}

/**
 * Logging seguro de autenticación
 */
export function logAuthentication(agentId, action, success, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    agentId,
    action,
    success,
    details: {
      ...details,
      // Sanitizar información sensible
      token: details.token ? '***' : undefined,
      password: details.password ? '***' : undefined
    }
  };
  
  console.log(`🔐 [Auth] ${timestamp} - ${agentId}: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`);
  
  // En producción, escribir a archivo de log
  try {
    const logFile = join(KEYS_DIR, 'auth.log');
    writeFileSync(logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
  } catch (error) {
    console.error('Failed to write auth log:', error.message);
  }
}

export default {
  generateToken,
  verifyToken,
  authenticateAgent,
  hasPermission,
  generateAgentToken,
  validateAgentCommunication,
  logAuthentication,
  AGENT_ROLES,
  JWT_CONFIG
};
