/**
 * Middleware de autenticación para endpoint /metrics
 * Seguridad sólida pero simple para entornos multi-tenant
 */

/**
 * Middleware de autenticación para métricas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function authMetrics(req, res, next) {
  // Extraer token del header Authorization
  const authHeader = req.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Verificar si hay tokens configurados
  const allowedTokens = process.env.METRICS_TOKENS?.split(',').map(t => t.trim()) || [];

  if (allowedTokens.length === 0) {
    // Sin autenticación configurada, permitir acceso
    return next();
  }

  // Verificar token
  if (!token || !allowedTokens.includes(token)) {
    // Log de intento de acceso no autorizado (sin token por seguridad)
    console.warn(
      `🚫 [AUTH-METRICS] Acceso no autorizado desde ${req.ip} - ${new Date().toISOString()}`
    );

    res.status(401);
    res.set('Content-Type', 'text/plain');
    res.set('WWW-Authenticate', 'Bearer');
    return res.send('# unauthorized\n');
  }

  // Token válido, continuar
  console.log(`✅ [AUTH-METRICS] Acceso autorizado desde ${req.ip} - ${new Date().toISOString()}`);
  next();
}

/**
 * Middleware para sanitizar logs (no exponer tokens)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export function sanitizeLogs(req, res, next) {
  // Interceptar el método log para sanitizar headers
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Función para sanitizar objetos que contengan tokens
  const sanitizeObject = obj => {
    if (typeof obj === 'string') {
      return obj.replace(/Bearer\s+[A-Za-z0-9\-_]+/gi, 'Bearer [REDACTED]');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = { ...obj };
      if (sanitized.headers?.authorization) {
        sanitized.headers.authorization = 'Bearer [REDACTED]';
      }
      return sanitized;
    }
    return obj;
  };

  // Override temporal de console methods
  console.log = (...args) => originalLog(...args.map(sanitizeObject));
  console.warn = (...args) => originalWarn(...args.map(sanitizeObject));
  console.error = (...args) => originalError(...args.map(sanitizeObject));

  next();
}

/**
 * Middleware de rate limiting para métricas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const requestCounts = new Map();

export function rateLimitMetrics(req, res, next) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = parseInt(process.env.METRICS_RATE_LIMIT || '20'); // 20 req/min por defecto

  // Limpiar entradas antiguas
  if (requestCounts.has(clientId)) {
    const clientData = requestCounts.get(clientId);
    clientData.requests = clientData.requests.filter(time => now - time < windowMs);

    if (clientData.requests.length === 0) {
      requestCounts.delete(clientId);
    }
  }

  // Verificar límite
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { requests: [] });
  }

  const clientData = requestCounts.get(clientId);

  if (clientData.requests.length >= maxRequests) {
    console.warn(
      `🚫 [RATE-LIMIT] Límite excedido para ${clientId} - ${clientData.requests.length}/${maxRequests}`
    );

    res.status(429);
    res.set('Content-Type', 'text/plain');
    res.set('Retry-After', '60');
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    return res.send('# rate limit exceeded\n');
  }

  // Agregar request actual
  clientData.requests.push(now);

  // Agregar headers informativos
  res.set('X-RateLimit-Limit', maxRequests.toString());
  res.set('X-RateLimit-Remaining', (maxRequests - clientData.requests.length).toString());
  res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

  next();
}

export default { authMetrics, sanitizeLogs, rateLimitMetrics };
