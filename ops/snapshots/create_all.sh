#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# Create All Snapshots - Postgres + Qdrant
# =====================================================

# Configuración
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups"
POSTGRES_DUMP="$BACKUP_DIR/rag_postgres_$TIMESTAMP.dump"
QDRANT_SNAPSHOT_DIR="$BACKUP_DIR/qdrant_snapshots_$TIMESTAMP"
SHA256_FILE="$BACKUP_DIR/SHA256SUMS"

# Variables de entorno
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5433}
PGUSER=${PGUSER:-rag}
PGPASSWORD=${PGPASSWORD:-ragpass}
PGDATABASE=${PGDATABASE:-ragdb}
QDRANT_URL=${QDRANT_URL:-http://localhost:6333}
QDRANT_COLLECTION=${QDRANT_COLLECTION:-rag_main}

# Colores para output
red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }

echo "📸 Creating RAG snapshots - $TIMESTAMP"
echo "======================================"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# =====================================================
# 1. PostgreSQL Snapshot
# =====================================================

echo "🗄️  Creating PostgreSQL snapshot..."

# Verificar conectividad
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
    red "❌ PostgreSQL not ready"
    exit 1
fi

# Crear dump de solo tablas RAG
export PGPASSWORD
pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --schema-only \
    --no-owner \
    --no-privileges \
    -t 'rag_*' \
    -f "${POSTGRES_DUMP}.schema"

pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --data-only \
    --no-owner \
    --no-privileges \
    -t 'rag_*' \
    -Fc \
    -f "$POSTGRES_DUMP"

# Verificar tamaño del dump
DUMP_SIZE=$(du -h "$POSTGRES_DUMP" | cut -f1)
echo "✅ PostgreSQL snapshot created: $POSTGRES_DUMP ($DUMP_SIZE)"

# =====================================================
# 2. Qdrant Snapshot
# =====================================================

echo "🔍 Creating Qdrant snapshot..."

# Verificar que Qdrant esté disponible
if ! curl -sf "$QDRANT_URL/readyz" >/dev/null; then
    red "❌ Qdrant not ready"
    exit 1
fi

# Crear directorio para snapshot
mkdir -p "$QDRANT_SNAPSHOT_DIR"

# Verificar que la colección existe
COLLECTION_INFO=$(curl -s "$QDRANT_URL/collections/$QDRANT_COLLECTION")
if echo "$COLLECTION_INFO" | jq -e '.result' >/dev/null 2>&1; then
    echo "✅ Collection $QDRANT_COLLECTION found"
else
    yellow "⚠️  Collection $QDRANT_COLLECTION not found, creating empty snapshot"
    echo '{"result": {"status": "green", "vectors_count": 0, "points_count": 0}}' > "$QDRANT_SNAPSHOT_DIR/collection_info.json"
fi

# Crear snapshot de la colección
SNAPSHOT_RESPONSE=$(curl -s -X POST "$QDRANT_URL/collections/$QDRANT_COLLECTION/snapshots")
SNAPSHOT_NAME=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.result.name // empty')

if [ -n "$SNAPSHOT_NAME" ]; then
    # Guardar info del snapshot
    echo "$SNAPSHOT_RESPONSE" > "$QDRANT_SNAPSHOT_DIR/snapshot_info.json"
    
    # Guardar info de la colección
    echo "$COLLECTION_INFO" > "$QDRANT_SNAPSHOT_DIR/collection_info.json"
    
    echo "✅ Qdrant snapshot created: $SNAPSHOT_NAME"
else
    red "❌ Failed to create Qdrant snapshot"
    echo "Response: $SNAPSHOT_RESPONSE"
    exit 1
fi

# =====================================================
# 3. Metadata y Verificación
# =====================================================

echo "📋 Creating metadata..."

# Crear archivo de metadata
cat > "$BACKUP_DIR/snapshot_metadata_$TIMESTAMP.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "postgres": {
    "dump_file": "$POSTGRES_DUMP",
    "size": "$DUMP_SIZE",
    "collection": "$QDRANT_COLLECTION"
  },
  "qdrant": {
    "snapshot_name": "$SNAPSHOT_NAME",
    "snapshot_dir": "$QDRANT_SNAPSHOT_DIR",
    "collection": "$QDRANT_COLLECTION"
  },
  "environment": {
    "pg_host": "$PGHOST",
    "pg_port": "$PGPORT", 
    "pg_database": "$PGDATABASE",
    "qdrant_url": "$QDRANT_URL"
  }
}
EOF

# Calcular checksums
echo "🔐 Calculating checksums..."
cd "$BACKUP_DIR"
sha256sum "rag_postgres_$TIMESTAMP.dump" >> SHA256SUMS
sha256sum "snapshot_metadata_$TIMESTAMP.json" >> SHA256SUMS
cd ..

# =====================================================
# 4. Verificación Final
# =====================================================

echo "✅ Verification:"
echo "  📄 PostgreSQL dump: $POSTGRES_DUMP"
echo "  📄 Schema dump: ${POSTGRES_DUMP}.schema"
echo "  📄 Qdrant snapshot: $SNAPSHOT_NAME"
echo "  📄 Metadata: snapshot_metadata_$TIMESTAMP.json"
echo "  📄 Checksums: $SHA256_FILE"

# Verificar que los archivos existen y tienen tamaño > 0
for file in "$POSTGRES_DUMP" "${POSTGRES_DUMP}.schema" "$QDRANT_SNAPSHOT_DIR/snapshot_info.json" "$BACKUP_DIR/snapshot_metadata_$TIMESTAMP.json"; do
    if [ -s "$file" ]; then
        green "✅ $file exists and has content"
    else
        red "❌ $file missing or empty"
        exit 1
    fi
done

echo ""
green "🎉 All snapshots created successfully!"
echo "📊 Snapshot timestamp: $TIMESTAMP"
echo "📁 Backup directory: $BACKUP_DIR"
echo ""
echo "To restore these snapshots, run:"
echo "  make snapshot.restore SNAPSHOT_TIMESTAMP=$TIMESTAMP"
