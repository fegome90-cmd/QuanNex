# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Roadmap técnico RAG como ADRs secuenciales (ADR-002 a ADR-005)
- Sistema de datastores RAG (PostgreSQL+pgvector, Qdrant, Redis)
- Scripts de verificación y smoke testing para datastores

## [1.0.0] - 2025-01-27 - Security & Operations Hardening v1

### 🔒 Security & Operations Hardening

#### Added
- **Soft-delete y auditoría de purgas**: Sistema de trazabilidad completa para operaciones de limpieza
  - Nueva columna `deleted_at` en tabla `rag_chunks`
  - Tabla `rag_purge_audit` para auditoría completa de purgas
  - Índices optimizados para búsquedas "vivas"

- **PRP.lock flexible**: Sistema de versionado inteligente con políticas granulares
  - Rangos semánticos en lugar de pins duros (`text-embedding-3-*: ^2025.09`)
  - Tres políticas de pin: `strict`, `relaxed`, `ttl`
  - Configuración por patrones críticos (`docs/adr/**` → `strict`)
  - Gates de calidad automáticos con RAGAS

- **Scripts seguros por defecto**:
  - `rag-reindex.mjs`: Dry-run por defecto, umbrales de seguridad, soft-delete
  - `context-validate.mjs`: Validación contra réplica/snapshot, timeouts, O(1) queries
  - `prp-lock-update.mjs`: Actualización semi-automática con PRs

- **Makefile.rag extendido**: Comandos seguros para operaciones críticas
  - `make rag-reindex`: Dry-run seguro por defecto
  - `make rag-reindex-force`: Ejecución real con umbrales
  - `make rag-context-validate`: Validación contra réplica
  - `make prp-lock-update`: Actualización de locks

#### Security Features
- **Umbrales de seguridad**: Aborto automático si >20% del índice sería purgado
- **Transacciones atómicas**: Soft-delete con rollback automático en caso de error
- **Credenciales de lectura**: Validación contra réplica con permisos limitados
- **Timeouts configurados**: Protección contra queries colgadas (15s, 30s)
- **Auditoría completa**: Trazabilidad de actor, razón, timestamp, afectados

#### Operational Excellence
- **Dry-run por defecto**: Todos los scripts destructivos requieren flag `--force`
- **Políticas granulares**: Critical paths con políticas específicas (strict/ttl)
- **Auto-update inteligente**: PRs automáticos solo para cambios benignos
- **Métricas de calidad**: Gates con RAGAS (faithfulness ≥0.70, relevancy ≥0.70)

### Changed
- **Esquema de base de datos**: Extendido con soft-delete y auditoría
- **Sistema de versionado**: De pins duros a rangos semánticos flexibles
- **Operaciones de purga**: De borrado físico a soft-delete con trazabilidad

### Fixed
- **Riesgo de purgas masivas**: Umbrales de seguridad previenen pérdida de datos
- **Deuda técnica del prompt**: PRPs versionados y reproducibles
- **Falta de trazabilidad**: Auditoría completa de todas las operaciones críticas

### Migration Guide

#### Para operaciones de reindexación:
```bash
# Antes (peligroso)
node rag-reindex.mjs

# Ahora (seguro)
make rag-reindex          # dry-run por defecto
make rag-reindex-force    # ejecución real con umbrales
```

#### Para validación de contexto:
```bash
# Antes (sin validación)
# N/A

# Ahora (validación segura)
make rag-context-validate  # contra réplica/snapshot
```

#### Para actualización de PRP.lock:
```bash
# Antes (manual, propenso a errores)
# Edición manual de archivos

# Ahora (semi-automático)
make prp-lock-update       # actualización inteligente
```

### Breaking Changes
- Ninguno. Todos los cambios son backward-compatible.

### Dependencies
- Nuevas dependencias: `yaml` para parsing de PRP.lock
- Scripts migrados a ES modules (`.mjs`)

---

## [0.1.0] - 2025-01-27 - Initial RAG Stack

### Added
- Sistema de datastores RAG básico
- Configuración Docker Compose para PostgreSQL+pgvector, Qdrant, Redis
- Scripts de inicialización y smoke testing
- Roadmap técnico como ADRs secuenciales
- Documentación completa del sistema

---

*Este changelog sigue el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)*
