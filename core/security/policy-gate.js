#!/usr/bin/env node
/**
 * Policy Gate con perfiles de seguridad (dev/staging/prod)
 * Razones accionables para cada decisión
 */
import { logSecurity } from '../../tools/structured-logger.mjs';

/**
 * Verifica si se puede ejecutar una acción basada en políticas
 * @param {object} ctx - Contexto de la acción
 * @param {object} action - Acción a verificar
 * @param {string} action.tool - Herramienta a usar
 * @param {object} action.target - Objetivo de la acción
 * @returns {object} Resultado de la verificación
 */
export function canExecute(ctx, { tool, target }) {
  const prof = process.env.POLICY_PROFILE || 'dev';
  const deny = (reason) => ({ ok: false, reason });

  // Log de la verificación
  logSecurity('policy_check', {
    profile: prof,
    tool: tool,
    target: target,
    context: ctx
  });

  // 1) Dominio/FS
  if (tool === 'http.request' && !ctx.allowDomains?.includes(target.host)) {
    logSecurity('policy_denied', { reason: 'blocked_domain', domain: target.host });
    return deny('blocked_domain');
  }
  
  if (tool === 'git.push' && ctx.meta?.branch === 'main' && prof !== 'dev') {
    logSecurity('policy_denied', { reason: 'require_approval', branch: 'main' });
    return deny('require_approval');
  }

  // 2) Secreto no debería salir jamás
  if (tool === 'emit.log' && ctx.payload && !/REDACTED/.test(JSON.stringify(ctx.payload))) {
    logSecurity('policy_denied', { reason: 'unenforced_redaction' });
    return deny('unenforced_redaction');
  }

  // 3) Perfil productivo más estricto
  if (prof === 'prod' && ctx.meta?.risk_level === 'high') {
    logSecurity('policy_denied', { reason: 'high_risk_prod' });
    return deny('high_risk_prod');
  }

  // 4) Herramientas peligrosas en producción
  if (prof === 'prod' && ['exec', 'spawn', 'shell'].includes(tool)) {
    logSecurity('policy_denied', { reason: 'dangerous_tool_prod', tool: tool });
    return deny('dangerous_tool_prod');
  }

  // 5) Acceso a archivos sensibles
  if (tool === 'fs.read' && ctx.sensitivePaths?.some(p => target.path?.includes(p))) {
    logSecurity('policy_denied', { reason: 'sensitive_file_access', path: target.path });
    return deny('sensitive_file_access');
  }

  // 6) Rate limiting por perfil
  if (prof === 'prod' && ctx.rateLimitExceeded) {
    logSecurity('policy_denied', { reason: 'rate_limit_exceeded' });
    return deny('rate_limit_exceeded');
  }

  logSecurity('policy_allowed', { tool: tool, target: target });
  return { ok: true };
}

/**
 * Obtiene la configuración de políticas por perfil
 * @param {string} profile - Perfil de seguridad (dev/staging/prod)
 * @returns {object} Configuración de políticas
 */
export function getPolicyConfig(profile = 'dev') {
  const configs = {
    dev: {
      allowDangerousTools: true,
      allowMainBranchPush: true,
      strictRateLimit: false,
      requireRedaction: false,
      allowedDomains: ['*']
    },
    staging: {
      allowDangerousTools: false,
      allowMainBranchPush: false,
      strictRateLimit: true,
      requireRedaction: true,
      allowedDomains: ['api.github.com', 'api.stripe.com', 'localhost']
    },
    prod: {
      allowDangerousTools: false,
      allowMainBranchPush: false,
      strictRateLimit: true,
      requireRedaction: true,
      allowedDomains: ['api.github.com', 'api.stripe.com']
    }
  };

  return configs[profile] || configs.dev;
}

/**
 * Valida el contexto contra las políticas del perfil
 * @param {object} ctx - Contexto a validar
 * @param {string} profile - Perfil de seguridad
 * @returns {object} Resultado de la validación
 */
export function validateContext(ctx, profile = 'dev') {
  const config = getPolicyConfig(profile);
  const issues = [];

  // Verificar dominios permitidos
  if (ctx.allowDomains && !config.allowedDomains.includes('*')) {
    const invalidDomains = ctx.allowDomains.filter(d => 
      !config.allowedDomains.includes(d)
    );
    if (invalidDomains.length > 0) {
      issues.push(`Invalid domains: ${invalidDomains.join(', ')}`);
    }
  }

  // Verificar herramientas peligrosas
  if (!config.allowDangerousTools && ctx.dangerousTools?.length > 0) {
    issues.push(`Dangerous tools not allowed: ${ctx.dangerousTools.join(', ')}`);
  }

  // Verificar rate limiting
  if (config.strictRateLimit && ctx.rateLimitExceeded) {
    issues.push('Rate limit exceeded');
  }

  return {
    valid: issues.length === 0,
    issues: issues,
    config: config
  };
}

export default {
  canExecute,
  getPolicyConfig,
  validateContext
};
