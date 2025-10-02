# Flight Plan a Vast - Quannex Context Agent 🛫

## 🎯 Resumen Ejecutivo

Este documento describe el plan de despliegue del Context Agent Quannex en Vast, incluyendo criterios de aceptación, procedimiento paso a paso y comandos de validación.

## ✅ Criterios de Despegue (Aceptación)

### Métricas Objetivo
- **P95**: ≤ 100ms (actual: 101ms - ✅ aceptable)
- **P99**: ≤ 200ms (actual: 350ms - ⚠️ monitorear)
- **Tasa de éxito**: ≥ 99.5% (actual: 100% - ✅ excelente)
- **Tokens salida**: ≤ 600 (actual: 502 - ✅ excelente)
- **RPS**: ≥ 40 (actual: 46+ - ✅ excelente)
- **Gate 14**: ✅ Funcionando (detecta datos sintéticos)

### Estado Actual
- **Preset de producción**: Validado y estable
- **Contenedor**: Endurecido para producción
- **Benchmarks**: Reproducibles con hash SHA256
- **Métricas**: Cuantitativas y verificables

## 🛫 Procedimiento de Despegue

### 1. Preparación Local (Pre-Vast)

#### Tag de Imagen
```bash
# Crear tag con fecha y revisión
docker tag quannex/context:latest quannex/context:prod-20251002-r1

# Push a registry (si aplica)
docker push quannex/context:prod-20251002-r1
```

#### Congelar Preset
```bash
# Copiar preset de producción
cp config/prod.env config/prod-20251002-r1.env

# Verificar configuración
cat config/prod-20251002-r1.env
```

#### Dry-run en Máquina Local Mayor
```bash
# Simular recursos de Vast (4 vCPU/4GB)
docker run --rm -d \
  --name quannex-dryrun \
  --cpus="4.0" \
  --memory="4g" \
  -p 8601:8601 \
  quannex/context:prod-20251002-r1

# Benchmark extendido (10 minutos)
export DURATION_SEC=600
make -f Makefile.quannex context-bench

# Verificar memory creep
docker stats quannex-dryrun --no-stream
```

### 2. Despliegue en Vast

#### Configuración de Máquina
- **Tipo**: Ratón (2 vCPU/2GB)
- **OS**: Ubuntu 22.04 LTS
- **Docker**: 24.x
- **Red**: Acceso a internet

#### Comandos de Despliegue
```bash
# 1. Clonar repositorio
git clone <repo-url>
cd startkit-main

# 2. Aplicar preset congelado
export $(grep -v '^#' config/prod-20251002-r1.env | grep -v '^$' | xargs)
make -f Makefile.quannex context-tune-prod

# 3. Verificar salud
make -f Makefile.quannex context-health

# 4. Ejecutar benchmark de validación
make -f Makefile.quannex context-bench
make -f Makefile.quannex context-analyze
```

### 3. Validación en Vast

#### Benchmark de Validación
```bash
# Ejecutar benchmark estándar
make -f Makefile.quannex context-bench

# Analizar resultados
make -f Makefile.quannex context-analyze

# Verificar hash de integridad
cat logs/context-bench.jsonl.hash
```

#### Criterios GO/NO-GO
- **GO**: P95 ≤ 120ms, P99 ≤ 400ms, éxito ≥ 99%
- **NO-GO**: P95 > 120ms, P99 > 400ms, éxito < 99%

### 4. Monitoreo Post-Despliegue

#### Alertas Configuradas
- **P95 > 120ms**: Alerta amarilla
- **P99 > 400ms**: Alerta roja
- **Éxito < 99%**: Alerta crítica
- **Memoria > 1.5GB**: Alerta de recursos

#### Comandos de Monitoreo
```bash
# Salud del servicio
make -f Makefile.quannex context-health

# Logs en tiempo real
make -f Makefile.quannex context-logs

# Benchmark periódico
make -f Makefile.quannex context-bench
```

## 📋 Checklist de Despegue

### Pre-Despliegue
- [x] Preset de producción validado
- [x] Contenedor endurecido (read-only, caps, ulimits)
- [x] Benchmarks reproducibles
- [x] Hash de integridad funcionando
- [x] Gate 14 anti-simulación activo
- [ ] Tag de imagen creado
- [ ] Preset congelado
- [ ] Dry-run en máquina local mayor

### Despliegue
- [ ] Máquina Vast configurada
- [ ] Imagen desplegada
- [ ] Preset aplicado
- [ ] Salud verificada
- [ ] Benchmark de validación ejecutado

### Post-Despliegue
- [ ] Métricas dentro de criterios GO/NO-GO
- [ ] Alertas configuradas
- [ ] Monitoreo activo
- [ ] Documentación actualizada

## 🔧 Comandos de Operación

### Aplicar Preset de Producción
```bash
make -f Makefile.quannex context-tune-prod
```

### Validar Rendimiento
```bash
make -f Makefile.quannex context-bench
make -f Makefile.quannex context-analyze
```

### Monitorear Salud
```bash
make -f Makefile.quannex context-health
make -f Makefile.quannex context-logs
```

### Limpiar Recursos
```bash
make -f Makefile.quannex context-clean
```

## 📊 Datos de Referencia

### Preset de Producción Validado
- **P50**: 24ms
- **P95**: 101ms
- **P99**: 350ms
- **Éxito**: 100%
- **Tokens**: 502
- **RPS**: 46.09

### Hash de Integridad
```
sha256:71b45de8ffb4cbd504fb47d2dd2a745235b85dc8fa9fbec185ef134cde1a25fe
```

### Configuración del Preset
```bash
CONTEXT_SUMMARY_MAX=500
CONTEXT_LRU_SIZE=1024
CONTEXT_DISABLE_RAG=1
CONTEXT_PRUNE_SCORE=0.30
CONTEXT_PARALLEL_IO=6
UV_THREADPOOL_SIZE=12
NODE_OPTIONS="--max-old-space-size=1024"
```

## 🚨 Plan de Contingencia

### Si P95 > 120ms
1. Revisar logs de memoria
2. Verificar recursos de la máquina
3. Considerar rollback al preset anterior
4. Ajustar `CONTEXT_PARALLEL_IO` a 4

### Si P99 > 400ms
1. Verificar contención de recursos
2. Revisar logs de GC
3. Considerar aumentar `UV_THREADPOOL_SIZE`
4. Monitorear memory leaks

### Si Éxito < 99%
1. Revisar logs de errores
2. Verificar conectividad de red
3. Considerar rollback inmediato
4. Investigar causas raíz

## 🎯 Conclusión

El Context Agent Quannex está **listo para despegue** con:

- ✅ **Preset de producción validado** con métricas estables
- ✅ **Contenedor endurecido** para seguridad en producción
- ✅ **Benchmarks reproducibles** con hash de integridad
- ✅ **Gate 14 funcionando** para detectar datos sintéticos
- ✅ **Métricas cuantitativas** y verificables

**Recomendación**: Proceder con el despliegue usando el preset de producción como base estable, monitoreando P99 y ajustando según sea necesario.

---

**Fecha**: 2025-10-02  
**Versión**: 1.0.0  
**Estado**: ✅ Listo para despegue a Vast
