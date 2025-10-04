# ops/runbooks/RAG_ROLLBACK.md (actualizado)

## 1) Prerrequisitos

- Snapshots verificados (hash + tamaño) generados por `make snapshot.create`
- Migraciones con `up.sql` **y** `down.sql` verificadas

## 2) Crear Snapshots (previos a cambios C1/C2)

```bash
# Qdrant (ejemplo REST)
curl -s -X POST "$QDRANT_URL/collections/rag_main/snapshots" | jq

# Postgres
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -Fc -f backups/rag_$(date +%Y%m%d-%H%M%S).dump
sha256sum backups/rag_*.dump > backups/SHA256SUMS
```

## 3) Rollback Automático (disparado por alertas)

```bash
make traffic:0
make snapshot.restore   # restaura Qdrant + Postgres (último snapshot "golden")
make revert:last-green  # binarios/config
make smoke && make eval.quick
```

## 4) Restauración Manual (si auto falla)

1. **Qdrant**: detener ingestas → restaurar snapshot de colección `rag_main`
2. **Postgres**: `pg_restore --clean --if-exists -d $PGDATABASE backups/…dump`
3. Reejecutar migraciones `down.sql` si hubo cambios de esquema
4. Validaciones:
   - `SELECT count(*) FROM rag_chunks WHERE model_id='…'`
   - Consulta top-k conocida, comparar score medio vs baseline (±5%)
   - RAGAS quick (20 queries) → `faithfulness ≥ 0.80`

## 5) Compatibilidad Binarios-Datos

- Mantener **matriz de compatibilidad** `ops/compat/matrix.md`:
  - (versión binario) ↔ (versión esquema) ↔ (colección Qdrant)

- **Regla**: no promover si la matriz marca `INCOMPATIBLE`

## 6) Post-Rollback

- Notificar en `#ops-alerts` (plantilla)
- Abrir **RCA** con `ops/templates/postmortem.md`
- Crear issue para "cambio seguro" (ajuste de umbrales, fix de perf, etc.)

## 7) Procedimientos de Emergencia

### Rollback Inmediato (3 AM scenario)

```bash
# 1. Detener tráfico inmediatamente
make traffic:0

# 2. Rollback automático
make rollback.auto

# 3. Verificación rápida
make smoke

# 4. Notificación automática
curl -X POST "$SLACK_WEBHOOK" -d '{"text":"🚨 ROLLBACK AUTOMÁTICO EJECUTADO - RAG Pipeline"}'
```

### Verificación Post-Rollback

```bash
# 1. Conteos básicos
docker compose exec postgres psql -U rag -d ragdb -c "
SELECT model_id, COUNT(*) as chunks,
       COUNT(DISTINCT uri) as docs
FROM rag_chunks
WHERE deleted_at IS NULL
GROUP BY model_id;"

# 2. Test de similitud
python -c "
from rag.serve.retriever import HybridRetriever
r = HybridRetriever()
chunks = r.retrieve('¿Qué es TaskDB?', k=5)
print(f'Top-5 scores: {[c.score for c in chunks]}')
print(f'Avg score: {sum(c.score for c in chunks)/len(chunks):.3f}')
"

# 3. RAGAS quick
make eval.quick
```

## 8) Matriz de Compatibilidad

### Formato: `ops/compat/matrix.md`

```markdown
| Binary Version | Schema Version | Qdrant Collection | Status          |
| -------------- | -------------- | ----------------- | --------------- |
| v1.0.0         | v1.0.0         | rag_main_v1       | ✅ OK           |
| v1.1.0         | v1.0.0         | rag_main_v1       | ⚠️ WARN         |
| v1.1.0         | v1.1.0         | rag_main_v2       | ✅ OK           |
| v2.0.0         | v1.1.0         | rag_main_v2       | ❌ INCOMPATIBLE |
```

## 9) Logs y Auditoría

### Registro de Rollbacks

```bash
# Log automático en TaskDB
echo "INSERT INTO task_events (task_id, event_type, metadata) VALUES
('rollback_$(date +%s)', 'rollback_auto', '{\"reason\":\"gate_fail_rate\",\"timestamp\":\"$(date -Iseconds)\"}');" | \
docker compose exec -T postgres psql -U rag -d ragdb
```

### Métricas de Rollback

- `rag_rollback_total{reason="gate_fail_rate"}`
- `rag_rollback_total{reason="faithfulness_drop"}`
- `rag_rollback_total{reason="latency_spike"}`
- `rag_rollback_duration_seconds`

## 10) Troubleshooting Común

### Error: "Snapshot not found"

```bash
# Listar snapshots disponibles
curl -s "$QDRANT_URL/collections/rag_main/snapshots" | jq '.result[] | {name, size}'

# Restaurar snapshot específico
curl -X POST "$QDRANT_URL/collections/rag_main/snapshots/$SNAPSHOT_NAME/recover"
```

### Error: "Database connection failed"

```bash
# Verificar conectividad
docker compose exec postgres pg_isready -U rag -d ragdb

# Verificar backups
ls -la backups/rag_*.dump
```

### Error: "Rollback incomplete"

```bash
# Verificar estado de colecciones
curl -s "$QDRANT_URL/collections" | jq '.result.collections[] | {name, status, vectors_count}'

# Verificar esquema de BD
docker compose exec postgres psql -U rag -d ragdb -c "\dt rag_*"
```
