# Matriz de Compatibilidad - RAG Pipeline

## Formato de Versiones

| Binary Version | Schema Version | Qdrant Collection | Status          | Notes                                       |
| -------------- | -------------- | ----------------- | --------------- | ------------------------------------------- |
| v1.0.0         | v1.0.0         | rag_main_v1       | ✅ OK           | Versión inicial estable                     |
| v1.1.0         | v1.0.0         | rag_main_v1       | ⚠️ WARN         | Schema compatible, pero sin nuevas features |
| v1.1.0         | v1.1.0         | rag_main_v2       | ✅ OK           | Nueva colección con mejoras                 |
| v1.2.0         | v1.1.0         | rag_main_v2       | ✅ OK           | Compatible hacia atrás                      |
| v2.0.0         | v1.1.0         | rag_main_v2       | ❌ INCOMPATIBLE | Breaking changes en API                     |
| v2.0.0         | v2.0.0         | rag_main_v3       | ✅ OK           | Nueva versión con breaking changes          |
| v2.1.0         | v2.0.0         | rag_main_v3       | ✅ OK           | Compatible con v2.0.0                       |

## Reglas de Compatibilidad

### ✅ OK - Deployment Permitido

- Binary version compatible con schema version
- Qdrant collection compatible con binary version
- No breaking changes detectados

### ⚠️ WARN - Deployment con Precaución

- Compatible pero con limitaciones
- Features nuevas no disponibles
- Monitoreo adicional requerido

### ❌ INCOMPATIBLE - Deployment Bloqueado

- Breaking changes detectados
- Requiere migración de datos
- Rollback automático activado

## Proceso de Verificación

1. **Pre-deployment**: Verificar matriz antes de canary
2. **Durante deployment**: Monitorear métricas de compatibilidad
3. **Post-deployment**: Validar funcionamiento completo

## Comandos de Verificación

```bash
# Verificar compatibilidad antes de deploy
make compat.check

# Verificar estado post-deploy
make compat.verify

# Forzar verificación de matriz
make compat.force-check
```

## Actualización de Matriz

La matriz debe actualizarse cuando:

- Nueva versión de binary
- Cambios en schema de BD
- Nueva colección de Qdrant
- Breaking changes detectados

## Historial de Cambios

| Fecha      | Cambio          | Versión | Detalles                                    |
| ---------- | --------------- | ------- | ------------------------------------------- |
| 2025-01-27 | Inicial         | v1.0.0  | Matriz inicial creada                       |
| 2025-01-27 | Breaking change | v2.0.0  | API incompatible, nueva colección requerida |
