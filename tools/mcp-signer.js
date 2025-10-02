#!/usr/bin/env node
/**
 * Sistema de Firmas HMAC para MCP Enforcement
 * Genera y valida firmas HMAC para commits y operaciones MCP
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSecret } from './secrets/provider.js';
import { logSecurity } from './structured-logger.mjs';

/**
 * Genera una firma HMAC para un mensaje
 * @param {string} message - Mensaje a firmar
 * @param {string} secret - Secreto para la firma
 * @returns {string} Firma HMAC en hexadecimal
 */
export function generateHMAC(message, secret) {
  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * Verifica una firma HMAC
 * @param {string} message - Mensaje original
 * @param {string} signature - Firma a verificar
 * @param {string} secret - Secreto para la verificación
 * @returns {boolean} True si la firma es válida
 */
export function verifyHMAC(message, signature, secret) {
  const expectedSignature = generateHMAC(message, secret);
  return timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Genera una firma MCP para un commit
 * @param {string} commitMessage - Mensaje del commit
 * @param {string} traceId - ID de la traza MCP
 * @returns {Promise<object>} Objeto con la firma y metadatos
 */
export async function signCommit(commitMessage, traceId) {
  try {
    const signingKey = await getSecret('QUANNEX_SIGNING_KEY');
    const messageToSign = `${commitMessage}\nQuanNex: requestId=${traceId}`;
    const signature = generateHMAC(traceId, signingKey);
    
    const signedCommit = {
      message: commitMessage,
      traceId: traceId,
      signature: signature,
      timestamp: new Date().toISOString(),
      fullMessage: `${messageToSign} sig=${signature}`
    };
    
    logSecurity('mcp_commit_signed', {
      traceId,
      signature: signature.substring(0, 8) + '...'
    });
    
    return signedCommit;
  } catch (error) {
    logSecurity('mcp_sign_error', {
      error: error.message,
      traceId
    });
    throw error;
  }
}

/**
 * Verifica una firma MCP de un commit
 * @param {string} commitMessage - Mensaje del commit
 * @param {string} traceId - ID de la traza MCP
 * @param {string} signature - Firma a verificar
 * @returns {Promise<boolean>} True si la firma es válida
 */
export async function verifyCommitSignature(commitMessage, traceId, signature) {
  try {
    const signingKey = await getSecret('QUANNEX_SIGNING_KEY');
    const isValid = verifyHMAC(traceId, signature, signingKey);
    
    logSecurity('mcp_commit_verified', {
      traceId,
      isValid,
      signature: signature.substring(0, 8) + '...'
    });
    
    return isValid;
  } catch (error) {
    logSecurity('mcp_verify_error', {
      error: error.message,
      traceId
    });
    return false;
  }
}

/**
 * Extrae información MCP de un mensaje de commit
 * @param {string} commitMessage - Mensaje del commit
 * @returns {object|null} Información MCP extraída o null si no es válida
 */
export function extractMCPInfo(commitMessage) {
  const mcpPattern = /QuanNex: requestId=([a-f0-9-]+) sig=([a-f0-9]+)/;
  const match = commitMessage.match(mcpPattern);
  
  if (!match) {
    return null;
  }
  
  return {
    traceId: match[1],
    signature: match[2],
    isValid: true
  };
}

/**
 * Genera un trailer MCP para un commit
 * @param {string} traceId - ID de la traza MCP
 * @returns {Promise<string>} Trailer MCP
 */
export async function generateMCPTrailer(traceId) {
  const signingKey = await getSecret('QUANNEX_SIGNING_KEY');
  const signature = generateHMAC(traceId, signingKey);
  
  return `QuanNex: requestId=${traceId} sig=${signature}`;
}

/**
 * Valida un trailer MCP
 * @param {string} trailer - Trailer MCP a validar
 * @returns {Promise<boolean>} True si el trailer es válido
 */
export async function validateMCPTrailer(trailer) {
  const mcpInfo = extractMCPInfo(trailer);
  
  if (!mcpInfo) {
    return false;
  }
  
  return await verifyCommitSignature('', mcpInfo.traceId, mcpInfo.signature);
}

/**
 * Genera una firma para una operación MCP
 * @param {string} operation - Operación MCP
 * @param {object} context - Contexto de la operación
 * @returns {Promise<string>} Firma de la operación
 */
export async function signOperation(operation, context) {
  const signingKey = await getSecret('QUANNEX_SIGNING_KEY');
  const message = JSON.stringify({ operation, context });
  const signature = generateHMAC(message, signingKey);
  
  logSecurity('mcp_operation_signed', {
    operation,
    signature: signature.substring(0, 8) + '...'
  });
  
  return signature;
}

/**
 * Verifica una firma de operación MCP
 * @param {string} operation - Operación MCP
 * @param {object} context - Contexto de la operación
 * @param {string} signature - Firma a verificar
 * @returns {Promise<boolean>} True si la firma es válida
 */
export async function verifyOperationSignature(operation, context, signature) {
  const signingKey = await getSecret('QUANNEX_SIGNING_KEY');
  const message = JSON.stringify({ operation, context });
  const isValid = verifyHMAC(message, signature, signingKey);
  
  logSecurity('mcp_operation_verified', {
    operation,
    isValid,
    signature: signature.substring(0, 8) + '...'
  });
  
  return isValid;
}

export default {
  generateHMAC,
  verifyHMAC,
  signCommit,
  verifyCommitSignature,
  extractMCPInfo,
  generateMCPTrailer,
  validateMCPTrailer,
  signOperation,
  verifyOperationSignature
};
