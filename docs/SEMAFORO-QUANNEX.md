# 🚦 Semáforo de Arranque QuanNex

**Sistema de decisión Go/No-Go para mejoras del Orquestador y Context**  
Basado en filosofía Toyota: "menos y mejor"

## 🎯 Objetivo

Evitar "meter turbo" antes de tener un piso sólido. Solo arrancar mejoras cuando el sistema esté completamente estable y todas las métricas estén en verde.

## 🚦 Criterios del Semáforo

### ✅ **SEMÁFORO VERDE** - Listo para mejoras

**Condición**: 3 días consecutivos cumpliendo TODOS los criterios:

#### 1️⃣ **Defectos y Estabilidad**
- **P0/P1 abiertos**: 0
- **P2 activos**: ≤5 y con tendencia a la baja (burndown diario)
- **Flaky tests**: <2% en 50 corridas

#### 2️⃣ **Salud CI/CD**
- **ci-gate1**: ≥98% de éxito en últimas 50 ejecuciones
- **MTTR**: ≤30 min (tiempo medio de corrección de fallas)

#### 3️⃣ **Contratos y Funcional**
- **Suite de contratos**: 100% verde por 7 días (sin excepciones)
- **Smoke end-to-end**: 100% verde por 7 días

#### 4️⃣ **Operación**
- **Error fatal**: ≤1% por 100 tareas
- **Latencia p95 global**: ≤7.5s (orquestador p95 ≤3.0s)
- **Resiliencia**: 0 reinicios consecutivos del mismo agente

#### 5️⃣ **Observabilidad**
- **100% de hops** con trace + audit completos
- **Logs "ruido"**: ↓50% vs. última semana

### 🔴 **SEMÁFORO ROJO** - Estabilización requerida

Si **cualquier umbral** cae, pausar mejoras y volver a estabilización.

## 🔧 Checklist de Estabilización

Antes de mejorar, completar:

- [ ] **Backlog hygiene**: Clasificar errores (P0/P1/P2), cerrar P0/P1
- [ ] **Anti-scaffolding activo**: Pre-commit + CI sin violaciones 72h
- [ ] **Aliases/exports canónicos**: 0 paths "a mano" en imports
- [ ] **KPIs diarios**: Guardar reporte de `quannex:kpis` (p95, errores, hops)
- [ ] **Contratos congelados**: Schema estable por 7 días
- [ ] **Runbook al día**: Procedimientos de rollback y troubleshooting probados

## ⚠️ Señales de "No Todavía"

- Llega 1 bug P1 nuevo por cada 2 que cierras (ratio ≥0.5)
- `ci-gate1` falla ≥2 veces en 24h por causas distintas
- Aumenta el ruido de logs tras un fix (efectos secundarios)
- Aparecen nuevos archivos en `/agents/**` (violación anti-scaffold)

## 🚀 Plan Micro-Iterativo (2 Semanas)

### 📅 **SEMANA 1** - Orquestador (sin romper nada)

#### 1️⃣ **Router Declarativo v2**
- **Meta**: −1 hop promedio, p95 −15%
- **Guardas**: MAX_HOPS, BUDGET_MS, flag FEATURE_ROUTER_V2
- **Canary**: 10% de tareas

#### 2️⃣ **FSM Corto + Checkpoints**
- **Meta**: Reproducibilidad (re-run = mismo resultado ±1 token)
- **Estados**: PLAN→EXEC→CRITIC→POLICY→DONE
- **Canary**: 10% de tareas con FEATURE_FSM=1

### 📅 **SEMANA 2** - Context (impacto directo en calidad)

#### 3️⃣ **ThreadState Explícito**
- **Meta**: +5–10% acierto multi-archivo
- **Payload**: diffs, files, build_errors

#### 4️⃣ **Handoffs con Contrato**
- **Meta**: 100% pases con reason y gate en trace
- **Flujo**: planner→coder→tester→doc

## ⚙️ Comandos de Control

### 🔍 **Salud Rápida** (Diario)
```bash
npm run quannex:contracts      # Tests de contratos
npm run quannex:init           # Health checks
npm run quannex:smoke          # Smoke tests
```

### 📊 **KPI & Tendencia** (Diario)
```bash
npm run quannex:metrics        # Recolectar métricas diarias
npm run quannex:metrics:report # Ver reporte del día
npm run quannex:kpis           # KPIs en tiempo real
```

### 🚪 **Gate de Calidad**
```bash
npm run ci:gate1               # CI completo
```

### 🚦 **Semáforo**
```bash
npm run quannex:semaphore              # Evaluar semáforo
npm run quannex:semaphore:health       # Health checks
npm run quannex:semaphore:stabilization # Checklist estabilización
npm run quannex:semaphore:plan         # Plan de mejoras
npm run quannex:semaphore:commands     # Comandos de control
```

## 📊 Decisión en Una Línea

**Regla Toyota "menos y mejor":**

> Mejoramos Orquestador y Context solo cuando: **3 días seguidos** con P0/P1=0, contracts 100% 7 días, ci-gate1 ≥98%, error ≤1%, p95 ≤7.5s y sin scaffolding.
> 
> Si no, seguimos puliendo errores pequeños hasta consolidar ese piso.

## 📈 Métricas Actuales

### 🟢 **Verde** (Listo para mejoras)
- ✅ Defectos: 0 P0/P1, 3 P2
- ✅ Contratos: 100% (7 días consecutivos)
- ✅ Observabilidad: 100% trace coverage

### 🔴 **Rojo** (Estabilización requerida)
- ❌ CI/CD: 0% success rate (necesita 98%)
- ❌ Operación: 5% error rate (necesita ≤1%)
- ❌ Latencia: 8s p95 (necesita ≤7.5s)

## 🎯 Próximos Pasos

1. **Ejecutar checklist de estabilización**
2. **Corregir CI/CD stability**
3. **Reducir error rate a ≤1%**
4. **Optimizar latencia a ≤7.5s**
5. **Mantener verde por 3 días consecutivos**
6. **Arrancar plan micro-iterativo**

---

**QuanNex Semáforo: Calidad sobre Velocidad** 🚦⚡
