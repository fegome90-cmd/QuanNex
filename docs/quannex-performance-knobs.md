# Quannex Context Agent - Palancas de Rendimiento

## 🎯 Laboratorio Docker para Calibración Máxima

Este documento describe las palancas de rendimiento disponibles en el laboratorio Docker de Quannex para calibrar el Context Agent al máximo rendimiento.

## 📊 Palancas de Rendimiento Disponibles

| Palanca | Valor por Defecto | Rango | Efecto Esperado | Riesgo |
|---------|------------------|-------|-----------------|--------|
| `CONTEXT_SUMMARY_MAX` | 700 | 256-10000 | ↓ tokens, ↓ latencia; riesgo de perder detalle | Pérdida de contexto |
| `CONTEXT_LRU_SIZE` | 512 | 64-2048 | ↑ hit-rate de memoria; ↑ RAM | Consumo de memoria |
| `CONTEXT_RECALL_STRATEGY` | hybrid | hybrid/recent/semantic/full | Estrategia de procesamiento | Calidad vs velocidad |
| `CONTEXT_DISABLE_RAG` | 1 | 0/1 | 1=off; evita lat. extra si el RAG no aporta | Pérdida de relevancia |
| `CONTEXT_PRUNE_SCORE` | 0.35 | 0.0-1.0 | ↑ pruning (0–1): ↓ tokens; riesgo de omitir | Pérdida de información |
| `CONTEXT_PARALLEL_IO` | 4 | 1-16 | Paralelismo de I/O: ↓ latencia; cuidado saturar | Saturación de recursos |
| `UV_THREADPOOL_SIZE` | 8 | 1-32 | CPU-bound async: fino si hay hashing/IO | Contención de CPU |
| `NODE_OPTIONS` | --max-old-space-size=512 | Variable | V8/Node más agresivo | Consumo de memoria |

## ⚙️ Presets de Configuración

### 🟢 Preset Lite (RPS Bajo)
```bash
CONTEXT_SUMMARY_MAX=1000
CONTEXT_LRU_SIZE=256
CONTEXT_DISABLE_RAG=1
CONTEXT_PARALLEL_IO=2
UV_THREADPOOL_SIZE=4
NODE_OPTIONS="--max-old-space-size=256"
```
**Uso:** `make context-tune-lite`

### 🔥 Preset Agresivo (RPS Alto)
```bash
CONTEXT_SUMMARY_MAX=500
CONTEXT_LRU_SIZE=1024
CONTEXT_DISABLE_RAG=1
CONTEXT_PRUNE_SCORE=0.28
CONTEXT_PARALLEL_IO=8
UV_THREADPOOL_SIZE=16
NODE_OPTIONS="--max-old-space-size=1024"
```
**Uso:** `make context-tune-aggr`

### 🏭 Preset Producción (Balanceado)
```bash
CONTEXT_SUMMARY_MAX=700
CONTEXT_LRU_SIZE=512
CONTEXT_DISABLE_RAG=0
CONTEXT_PRUNE_SCORE=0.35
CONTEXT_PARALLEL_IO=4
UV_THREADPOOL_SIZE=8
NODE_OPTIONS="--max-old-space-size=1024"
```
**Uso:** `make context-tune-prod`

## 🚀 Comandos del Laboratorio

### Construcción y Levantamiento
```bash
# Construir imagen Docker
make context-build

# Levantar servicio
make context-up

# Verificar salud
make context-health
```

### Benchmarking y Análisis
```bash
# Ejecutar benchmark (60s, 50 RPS, 24 concurrencia)
make context-bench

# Analizar métricas con Gate 14 anti-simulación
make context-analyze

# Flujo completo de testing
make context-full-test
```

### Tuning de Rendimiento
```bash
# Configuración ligera
make context-tune-lite

# Configuración agresiva
make context-tune-aggr

# Configuración de producción
make context-tune-prod
```

### Monitoreo y Debugging
```bash
# Ver logs en tiempo real
make context-logs

# Información del laboratorio
make context-info

# Limpiar artefactos
make context-clean
```

## 📈 Criterios de Optimización

### 🎯 Objetivos de Rendimiento
- **P95 ≤ 2s** (objetivo local con 2 vCPU/1GB)
- **P99 sin colas largas** (≤ +1000 ms vs p95)
- **Tokens_in por request estable** (verifica que el pruning no rompa calidad)
- **Gate 14 OK** (anti-simulación)
- **Memoria estable** (sin crecimiento continuo en 10 min)

### 📊 Métricas Clave
- **Latencia:** P50, P95, P99 con intervalos de confianza 95%
- **Throughput:** Requests por segundo reales
- **Tokens:** Eficiencia entrada/salida
- **Memoria:** Uso estable sin leaks
- **CPU:** Utilización óptima

### 🔒 Gate 14 - Anti-Simulación
El analizador incluye Gate 14 para detectar datos falsos o sintéticos:
- **Diversidad de valores únicos:** ≥20 valores únicos
- **Patrones sospechosos:** <30% valores redondos
- **Distribución de latencias:** Varianza >0.1
- **Secuencias sospechosas:** <15% valores secuenciales

## 🔧 Flujo de Calibración Recomendado

### 1. Baseline (15-30 min)
```bash
# Build y levantar
make context-build
make context-up

# Baseline bench (60s) y analizar
make context-bench
make context-analyze
# -> guarda p50/p95/p99 y CI95%
```

### 2. Tuning Agresivo
```bash
# Tuning agresivo y repetir
make context-tune-aggr
make context-bench
make context-analyze

# Compara resultados (espera ≥15–25% mejora en p95)
```

### 3. Optimización Fina
```bash
# Ajustar palancas individualmente
CONTEXT_SUMMARY_MAX=600 make context-up
make context-bench
make context-analyze

# Documentar mejor configuración
echo "CONTEXT_SUMMARY_MAX=600" >> .env.optimal
```

## 📁 Estructura del Laboratorio

```
docker/context/
├── Dockerfile              # Imagen multi-stage con palancas
├── compose.yml             # Servicios de benchmark y perfilado
└── logs/                   # Artefactos de benchmark

tools/
├── context-bench.mjs       # Load generator sintético
└── context-analyze.mjs     # Analizador con Gate 14

Makefile.quannex           # Comandos de automatización
```

## 🎯 Endpoints del Context Agent

- **Health Check:** `http://localhost:8601/health`
- **Context Processing:** `http://localhost:8601/context/get`
- **Métricas:** Incluidas en respuesta JSON

## 📋 Checklist de Optimización

### Antes de Vast
- [ ] P95 ≤ 2s estable
- [ ] P99 sin colas largas
- [ ] Tokens_in por request estable
- [ ] Gate 14 OK (anti-simulación)
- [ ] Memoria estable (sin crecimiento continuo)
- [ ] Preset ganador documentado
- [ ] Hash de integridad generado

### Para Reproducibilidad
- [ ] Configuración guardada en `.env.optimal`
- [ ] Comandos documentados
- [ ] Artefactos JSONL con hash SHA256
- [ ] Métricas baseline vs optimizado

## 🚀 Listo para Despegar

Con este laboratorio Docker reproducible puedes:
- **Exprimir el Context Agent al máximo** sin magia
- **Datos crudos verificables** con knobs claros
- **Criterios duros** de rendimiento
- **Preset ganador** para clonar a Vast

Cuando tengas un preset ganador (p95 estable y tokens controlados), clona la receta al lab en Vast y repite los mismos tests allí.

---

**Versión:** 1.0.0  
**Fecha:** 2025-10-02  
**Estado:** Laboratorio Docker completamente funcional ✅
