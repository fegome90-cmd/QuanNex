import crypto from 'node:crypto';

const DEFAULT_MAX_LENGTH = 4096;
const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i
];

export function sanitizeString(value, { maxLength = DEFAULT_MAX_LENGTH } = {}) {
  if (typeof value !== 'string') return value;
  let sanitized = value.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\r\n\t]/g, ' ').trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export function sanitizePath(path) {
  const sanitized = sanitizeString(path, { maxLength: 1024 });
  if (sanitized.includes('..')) {
    throw new Error(`Unsafe path detected: ${path}`);
  }
  return sanitized;
}

export function sanitizeObject(input) {
  if (Array.isArray(input)) {
    return input.map(item => sanitizeObject(item));
  }
  if (input && typeof input === 'object') {
    const copy = {};
    for (const [key, value] of Object.entries(input)) {
      copy[key] = sanitizeObject(value);
    }
    return copy;
  }
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  return input;
}

export function redactSecrets(text = '') {
  if (typeof text !== 'string') return text;
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

export function enforceAgentAuth(payload, agentName) {
  const expectedToken = process.env.MCP_AGENT_AUTH_TOKEN;
  if (!expectedToken) {
    return true;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('UNAUTHORIZED_AGENT_REQUEST');
  }

  const token = payload.auth_token || payload?.payload?.auth_token;
  if (!token || token !== expectedToken) {
    throw new Error(`UNAUTHORIZED_AGENT_REQUEST:${agentName}`);
  }

  return true;
}

export function stripAuthToken(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  delete copy.auth_token;
  if (copy.payload && typeof copy.payload === 'object') {
    const inner = { ...copy.payload };
    delete inner.auth_token;
    copy.payload = inner;
  }
  return copy;
}

export function generateCanaryAssignment(percentage = 0) {
  const normalized = Math.min(Math.max(Number(percentage) || 0, 0), 100);
  const threshold = normalized / 100;
  const randomValue = crypto.randomInt(0, 1000) / 1000;
  return randomValue < threshold;
}

export function sanitizeLogObject(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      if (typeof value === 'string') {
        return redactSecrets(value);
      }
      return value;
    })
  );
}
