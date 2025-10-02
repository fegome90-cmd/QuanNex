# Quannex Context Agent - Dockerfile Multi-Stage
# Laboratorio de experimentos para calibración máxima de rendimiento

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci --omit=dev --frozen-lockfile

# Stage 2: Runtime mínimo
FROM node:22-alpine AS runner
WORKDIR /app

# Variables de entorno para palancas de rendimiento
ENV NODE_ENV=production
ENV CONTEXT_SUMMARY_MAX=700 \
    CONTEXT_LRU_SIZE=512 \
    CONTEXT_RECALL_STRATEGY=hybrid \
    CONTEXT_DISABLE_RAG=1 \
    CONTEXT_PRUNE_SCORE=0.35 \
    CONTEXT_PARALLEL_IO=4 \
    UV_THREADPOOL_SIZE=8 \
    NODE_OPTIONS="--max-old-space-size=512"

# Seguridad básica - usuario no-root
RUN addgroup -S quannex && adduser -S quannex -G quannex

# Copiar código mínimo necesario
COPY --chown=quannex:quannex agents/context/ ./agents/context/
COPY --chown=quannex:quannex utils/ ./utils/
COPY --chown=quannex:quannex config/ ./config/
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=quannex:quannex package*.json ./

# Healthcheck simple HTTP
HEALTHCHECK --interval=10s --timeout=2s --start-period=10s --retries=6 \
  CMD node agents/context/healthcheck.mjs || exit 1

# Puerto del Context Agent
EXPOSE 8601

# Usar reloj monotónico para medición interna
CMD ["node", "agents/context/server-http.mjs"]
