#!/usr/bin/env bash

# =====================================================
# Smoke Test para Datastores RAG
# =====================================================

set -euo pipefail

# Cargar variables de entorno si existe el archivo
if [ -f "env.datastores" ]; then
    export $(cat env.datastores | grep -v '^#' | xargs)
fi

# Funciones de colores
red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }
blue() { printf "\e[34m%s\e[0m\n" "$*"; }

ok() { green "✅ OK - $*"; }
ko() { red "❌ FAIL - $*"; exit 1; }
info() { blue "ℹ️  INFO - $*"; }

echo "🧪 Iniciando smoke test de datastores RAG..."

# Verificar que docker-compose esté corriendo
if ! docker compose ps | grep -qE "(Up|healthy)"; then
    ko "Docker Compose no está corriendo. Ejecuta: docker compose up -d"
fi

info "Verificando servicios de Docker Compose..."

# =====================================================
# PostgreSQL + pgvector
# =====================================================

info "Probando PostgreSQL + pgvector..."

# Verificar que PostgreSQL esté listo
if ! docker compose exec -T postgres pg_isready -U "${PGUSER:-rag}" >/dev/null 2>&1; then
    ko "PostgreSQL no está listo"
fi

# Verificar extensión vector
if ! docker compose exec -T postgres psql -U "${PGUSER:-rag}" -d "${PGDATABASE:-ragdb}" -At -c "SELECT 1 FROM pg_extension WHERE extname = 'vector';" | grep -q "1"; then
    ko "Extensión pgvector no está instalada"
fi

# Contar chunks en la tabla
CNT=$(docker compose exec -T postgres psql -U "${PGUSER:-rag}" -d "${PGDATABASE:-ragdb}" -At -c "SELECT count(*) FROM rag_chunks;" 2>/dev/null || echo "-1")

if [ "$CNT" -ge 0 ]; then
    ok "PostgreSQL + pgvector funcionando (rag_chunks=$CNT)"
else
    ko "Error al consultar tabla rag_chunks"
fi

# Verificar función de búsqueda
SEARCH_TEST=$(docker compose exec -T postgres psql -U "${PGUSER:-rag}" -d "${PGDATABASE:-ragdb}" -At -c "SELECT count(*) FROM search_similar_chunks('[0.1,0.2,0.3,0.4]'::vector, 'demo-emb-4d', 5);" 2>/dev/null || echo "-1")

if [ "$SEARCH_TEST" -ge 0 ]; then
    ok "Función de búsqueda vectorial funcionando (resultados=$SEARCH_TEST)"
else
    ko "Error en función de búsqueda vectorial"
fi

# =====================================================
# Qdrant
# =====================================================

info "Probando Qdrant..."

# Verificar que Qdrant esté listo
if ! curl -sf "${QDRANT_URL:-http://localhost:6333}/readyz" >/dev/null 2>&1; then
    ko "Qdrant no está listo"
fi

# Crear colección demo si no existe (ignorar error si ya existe)
curl -s -X PUT "${QDRANT_URL:-http://localhost:6333}/collections/rag_demo" \
  -H 'Content-Type: application/json' \
  -d '{"vectors":{"size":4,"distance":"Cosine"}}' >/dev/null 2>&1 || true

# Verificar que la colección existe
if curl -sf "${QDRANT_URL:-http://localhost:6333}/collections/rag_demo" | jq -e '.result.status' >/dev/null 2>&1; then
    ok "Qdrant funcionando (colección rag_demo creada)"
else
    ko "Error al crear/verificar colección en Qdrant"
fi

# Insertar punto de prueba
POINT_ID=$(date +%s)
curl -s -X PUT "${QDRANT_URL:-http://localhost:6333}/collections/rag_demo/points" \
  -H 'Content-Type: application/json' \
  -d "{
    \"points\": [{
      \"id\": $POINT_ID,
      \"vector\": [0.1, 0.2, 0.3, 0.4],
      \"payload\": {\"text\": \"test point\", \"source\": \"smoke-test\"}
    }]
  }" >/dev/null 2>&1

# Verificar que el punto se insertó
if curl -sf "${QDRANT_URL:-http://localhost:6333}/collections/rag_demo/points/$POINT_ID" | jq -e '.result' >/dev/null 2>&1; then
    ok "Inserción de puntos en Qdrant funcionando"
else
    ko "Error al insertar punto en Qdrant"
fi

# =====================================================
# Redis
# =====================================================

info "Probando Redis..."

# Verificar que Redis responda
if ! docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
    ko "Redis no responde al ping"
fi

# Probar operaciones básicas
docker compose exec -T redis redis-cli set "rag:test" "hello" >/dev/null 2>&1
if docker compose exec -T redis redis-cli get "rag:test" | grep -q "hello"; then
    ok "Redis funcionando (set/get OK)"
else
    ko "Error en operaciones Redis"
fi

# Limpiar test
docker compose exec -T redis redis-cli del "rag:test" >/dev/null 2>&1

# =====================================================
# Resumen
# =====================================================

echo ""
green "🎉 Smoke test de datastores COMPLETADO"
echo ""
info "Resumen de servicios:"
echo "  📊 PostgreSQL + pgvector: ✅"
echo "  🔍 Qdrant: ✅"
echo "  💾 Redis: ✅"
echo ""
info "Todos los datastores están listos para el sistema RAG"
