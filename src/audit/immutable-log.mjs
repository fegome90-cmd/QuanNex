/**
 * Log inmutable (append-only) para auditoría anti-tamper
 * Registra cambios críticos con UID + timestamp
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

const AUDIT_LOG_PATH = path.join(process.cwd(), '.cache/audit.log');
const AUDIT_LOG_LOCK_PATH = path.join(process.cwd(), '.cache/audit.lock');

/**
 * Genera UID único para eventos de auditoría
 */
function generateAuditUID() {
  return randomUUID();
}

/**
 * Genera hash SHA256 de un objeto para integridad
 */
function generateIntegrityHash(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Escribe entrada de auditoría de forma inmutable
 */
function writeAuditEntry(eventType, data) {
  const uid = generateAuditUID();
  const timestamp = Date.now();
  const isoTime = new Date(timestamp).toISOString();

  const entry = {
    uid,
    timestamp,
    isoTime,
    eventType,
    data,
    integrityHash: generateIntegrityHash({ uid, timestamp, eventType, data }),
  };

  const logLine = JSON.stringify(entry) + '\n';

  try {
    // Crear directorio si no existe
    fs.mkdirSync(path.dirname(AUDIT_LOG_PATH), { recursive: true });

    // Escribir de forma append-only
    fs.appendFileSync(AUDIT_LOG_PATH, logLine, { flag: 'a' });

    console.log(`📝 [AUDIT] ${eventType} - UID: ${uid} - ${isoTime}`);

    return uid;
  } catch (error) {
    console.error(`❌ [AUDIT] Error escribiendo entrada: ${error.message}`);
    throw error;
  }
}

/**
 * Registra cambio de circuit breaker
 */
export function auditCircuitBreakerChange(oldState, newState, reason) {
  return writeAuditEntry('circuit_breaker_change', {
    oldState,
    newState,
    reason,
    processId: process.pid,
    nodeVersion: process.version,
  });
}

/**
 * Registra fallback a snapshot
 */
export function auditSnapshotFallback(reason, snapshotAge) {
  return writeAuditEntry('snapshot_fallback', {
    reason,
    snapshotAge,
    processId: process.pid,
    nodeVersion: process.version,
  });
}

/**
 * Registra cambio en contadores de métricas
 */
export function auditMetricsCounterChange(counterName, oldValue, newValue, delta) {
  return writeAuditEntry('metrics_counter_change', {
    counterName,
    oldValue,
    newValue,
    delta,
    processId: process.pid,
    nodeVersion: process.version,
  });
}

/**
 * Registra evento de autenticación
 */
export function auditAuthEvent(eventType, clientIp, success, reason) {
  return writeAuditEntry('auth_event', {
    eventType,
    clientIp,
    success,
    reason: reason || null,
    processId: process.pid,
    nodeVersion: process.version,
  });
}

/**
 * Registra evento de rate limiting
 */
export function auditRateLimitEvent(clientIp, requestsCount, limit, action) {
  return writeAuditEntry('rate_limit_event', {
    clientIp,
    requestsCount,
    limit,
    action,
    processId: process.pid,
    nodeVersion: process.version,
  });
}

/**
 * Verifica integridad del log de auditoría
 */
export function verifyAuditLogIntegrity() {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return { valid: true, entries: 0, errors: [] };
    }

    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    const lines = content
      .trim()
      .split('\n')
      .filter(line => line.trim());

    let validEntries = 0;
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);

        // Verificar estructura básica
        if (!entry.uid || !entry.timestamp || !entry.eventType || !entry.integrityHash) {
          errors.push(`Línea ${i + 1}: Estructura inválida`);
          continue;
        }

        // Verificar integridad
        const expectedHash = generateIntegrityHash({
          uid: entry.uid,
          timestamp: entry.timestamp,
          eventType: entry.eventType,
          data: entry.data,
        });

        if (entry.integrityHash !== expectedHash) {
          errors.push(`Línea ${i + 1}: Hash de integridad inválido`);
          continue;
        }

        validEntries++;
      } catch (parseError) {
        errors.push(`Línea ${i + 1}: Error de parsing - ${parseError.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      entries: validEntries,
      totalLines: lines.length,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      entries: 0,
      errors: [`Error verificando integridad: ${error.message}`],
    };
  }
}

/**
 * Obtiene estadísticas del log de auditoría
 */
export function getAuditLogStats() {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return { totalEntries: 0, eventTypes: {}, lastEntry: null };
    }

    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    const lines = content
      .trim()
      .split('\n')
      .filter(line => line.trim());

    const eventTypes = {};
    let lastEntry = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        eventTypes[entry.eventType] = (eventTypes[entry.eventType] || 0) + 1;
        lastEntry = entry;
      } catch (error) {
        // Ignorar líneas malformadas
      }
    }

    return {
      totalEntries: lines.length,
      eventTypes,
      lastEntry,
    };
  } catch (error) {
    return {
      totalEntries: 0,
      eventTypes: {},
      lastEntry: null,
      error: error.message,
    };
  }
}

export default {
  auditCircuitBreakerChange,
  auditSnapshotFallback,
  auditMetricsCounterChange,
  auditAuthEvent,
  auditRateLimitEvent,
  verifyAuditLogIntegrity,
  getAuditLogStats,
};
