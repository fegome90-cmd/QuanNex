# Plan de Rollback Express - TaskDB v2

## 🚨 Rollback Inmediato

### 1. Cambiar driver a jsonl

```bash
export TASKDB_DRIVER=jsonl
```

### 2. Mantener sistema funcionando (append-only)

- El sistema seguirá funcionando con JSONL
- No se perderán datos
- Append-only es seguro

### 3. Migrar datos cuando PG esté sano

```bash
npx ts-node ops/migrate/jsonl-to-pg.ts ./logs/taskdb-*.jsonl
```

### 4. Volver a PostgreSQL

```bash
export TASKDB_DRIVER=pg
# o para dual si quieres revalidar
export TASKDB_DRIVER=dual
```

## 🔄 Rollback por Etapas

### Etapa 1: Rollback a SQLite

- Cambiar `TASKDB_DRIVER=sqlite`
- Verificar que los datos estén intactos
- Continuar operaciones normales

### Etapa 2: Rollback a JSONL

- Cambiar `TASKDB_DRIVER=jsonl`
- Verificar integridad de logs
- Sistema funcionará en modo append-only

### Etapa 3: Análisis Post-Rollback

- Revisar logs de errores
- Identificar causa raíz
- Planificar corrección

## 📋 Checklist de Rollback

- [ ] Cambiar variable de entorno TASKDB_DRIVER
- [ ] Verificar que el sistema responde
- [ ] Confirmar que no se pierden datos
- [ ] Monitorear métricas por 15 minutos
- [ ] Documentar causa del rollback
- [ ] Planificar corrección

## 🆘 Contacto de Emergencia

Si el rollback no funciona:

1. Revisar logs en `./logs/`
2. Verificar configuración en `config/`
3. Ejecutar `npm run taskdb:doctor`
4. Contactar al equipo de desarrollo
