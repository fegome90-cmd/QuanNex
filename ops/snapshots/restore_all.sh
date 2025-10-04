#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# Restore All Snapshots - Postgres + Qdrant
# =====================================================

# Configuración
BACKUP_DIR="backups"
SNAPSHOT_TIMESTAMP=${1:-$(ls -t backups/snapshot_metadata_*.json 2>/dev/null | head -1 | sed 's/.*snapshot_metadata_\(.*\)\.json/\1/')}

# Variables de entorno
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5433}
PGUSER=${PGUSER:-rag}
PGPASSWORD=${PGPASSWORD:-ragpass}
PGDATABASE=${PGDATABASE:-ragdb}
QDRANT_URL=${QDRANT_URL:-http://localhost:6333}

# Colores para output
red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }

echo "🔄 Restoring RAG snapshots - $SNAPSHOT_TIMESTAMP"
echo "================================================"

# Verificar que el timestamp existe
if [ -z "$SNAPSHOT_TIMESTAMP" ]; then
    red "❌ No snapshot timestamp provided and no snapshots found"
    echo "Usage: $0 <timestamp>"
    echo "Available snapshots:"
    ls -la backups/snapshot_metadata_*.json 2>/dev/null || echo "No snapshots found"
    exit 1
fi

# Archivos del snapshot
METADATA_FILE="$BACKUP_DIR/snapshot_metadata_$SNAPSHOT_TIMESTAMP.json"
POSTGRES_DUMP="$BACKUP_DIR/rag_postgres_$SNAPSHOT_TIMESTAMP.dump"
POSTGRES_SCHEMA="$BACKUP_DIR/rag_postgres_$SNAPSHOT_TIMESTAMP.dump.schema"
QDRANT_SNAPSHOT_DIR="$BACKUP_DIR/qdrant_snapshots_$SNAPSHOT_TIMESTAMP"

# Verificar que todos los archivos existen
echo "🔍 Verifying snapshot files..."
for file in "$METADATA_FILE" "$POSTGRES_DUMP" "$POSTGRES_SCHEMA" "$QDRANT_SNAPSHOT_DIR/snapshot_info.json"; do
    if [ -f "$file" ]; then
        green "✅ $file exists"
    else
        red "❌ $file missing"
        exit 1
    fi
done

# Cargar metadata
echo "📋 Loading snapshot metadata..."
COLLECTION_NAME=$(jq -r '.qdrant.collection' "$METADATA_FILE")
SNAPSHOT_NAME=$(jq -r '.qdrant.snapshot_name' "$METADATA_FILE")

echo "  Collection: $COLLECTION_NAME"
echo "  Snapshot: $SNAPSHOT_NAME"

# =====================================================
# 1. Restaurar PostgreSQL
# =====================================================

echo "🗄️  Restoring PostgreSQL..."

# Verificar conectividad
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
    red "❌ PostgreSQL not ready"
    exit 1
fi

# Verificar checksum
echo "🔐 Verifying checksum..."
cd "$BACKUP_DIR"
if ! sha256sum -c SHA256SUMS >/dev/null 2>&1; then
    red "❌ Checksum verification failed"
    exit 1
fi
cd ..

export PGPASSWORD

# Backup de seguridad antes de restaurar
echo "💾 Creating safety backup..."
SAFETY_BACKUP="$BACKUP_DIR/safety_backup_$(date +%Y%m%d-%H%M%S).dump"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$SAFETY_BACKUP"
echo "✅ Safety backup created: $SAFETY_BACKUP"

# Restaurar esquema primero
echo "📋 Restoring schema..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$POSTGRES_SCHEMA"

# Restaurar datos
echo "📊 Restoring data..."
pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    "$POSTGRES_DUMP"

echo "✅ PostgreSQL restored successfully"

# =====================================================
# 2. Restaurar Qdrant
# =====================================================

echo "🔍 Restoring Qdrant..."

# Verificar que Qdrant esté disponible
if ! curl -sf "$QDRANT_URL/readyz" >/dev/null; then
    red "❌ Qdrant not ready"
    exit 1
fi

# Verificar que el snapshot existe
SNAPSHOT_LIST=$(curl -s "$QDRANT_URL/collections/$COLLECTION_NAME/snapshots")
if ! echo "$SNAPSHOT_LIST" | jq -e ".result[] | select(.name == \"$SNAPSHOT_NAME\")" >/dev/null 2>&1; then
    red "❌ Snapshot $SNAPSHOT_NAME not found in Qdrant"
    echo "Available snapshots:"
    echo "$SNAPSHOT_LIST" | jq -r '.result[]?.name // "none"'
    exit 1
fi

# Restaurar snapshot
echo "📸 Restoring Qdrant snapshot: $SNAPSHOT_NAME"
RESTORE_RESPONSE=$(curl -s -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/snapshots/$SNAPSHOT_NAME/recover")

if echo "$RESTORE_RESPONSE" | jq -e '.result' >/dev/null 2>&1; then
    green "✅ Qdrant snapshot restored successfully"
else
    red "❌ Failed to restore Qdrant snapshot"
    echo "Response: $RESTORE_RESPONSE"
    exit 1
fi

# =====================================================
# 3. Verificación Post-Restore
# =====================================================

echo "🔍 Post-restore verification..."

# Verificar PostgreSQL
echo "🗄️  Checking PostgreSQL..."
PG_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM rag_chunks WHERE deleted_at IS NULL;" | xargs)
echo "  📊 RAG chunks: $PG_COUNT"

# Verificar Qdrant
echo "🔍 Checking Qdrant..."
QDRANT_INFO=$(curl -s "$QDRANT_URL/collections/$COLLECTION_NAME")
QDRANT_COUNT=$(echo "$QDRANT_INFO" | jq -r '.result.points_count // 0')
echo "  📊 Qdrant points: $QDRANT_COUNT"

# Verificar que los conteos son razonables
if [ "$PG_COUNT" -gt 0 ] && [ "$QDRANT_COUNT" -gt 0 ]; then
    green "✅ Both PostgreSQL and Qdrant have data"
else
    yellow "⚠️  One or both stores appear empty"
fi

# =====================================================
# 4. Smoke Test
# =====================================================

echo "🧪 Running smoke test..."

# Test básico de conectividad
if make smoke >/dev/null 2>&1; then
    green "✅ Smoke test passed"
else
    yellow "⚠️  Smoke test failed - manual verification recommended"
fi

# =====================================================
# 5. Finalización
# =====================================================

echo ""
green "🎉 Snapshot restore completed successfully!"
echo "📊 Restored snapshot: $SNAPSHOT_TIMESTAMP"
echo "🗄️  PostgreSQL chunks: $PG_COUNT"
echo "🔍 Qdrant points: $QDRANT_COUNT"
echo "💾 Safety backup: $SAFETY_BACKUP"
echo ""
echo "Next steps:"
echo "  1. Run: make smoke"
echo "  2. Run: make eval.quick"
echo "  3. Verify metrics in Grafana"
echo "  4. If issues: restore safety backup from $SAFETY_BACKUP"
