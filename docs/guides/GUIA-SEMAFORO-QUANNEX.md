# 🚦 Guía Completa del Semáforo QuanNex

**Sistema de decisión Go/No-Go para mejoras del Orquestador y Context**

## 🎯 ¿Qué es el Semáforo QuanNex?

El Semáforo QuanNex es un sistema de control de calidad basado en la filosofía Toyota de "menos y mejor". Su objetivo es **evitar avanzar con mejoras** hasta que el sistema esté completamente estable y todas las métricas estén en verde.

## 🚦 Estados del Semáforo

### 🟢 **VERDE** - Listo para mejoras
- **Condición**: 3 días consecutivos con TODOS los criterios en verde
- **Acción**: Proceder con plan micro-iterativo (2 semanas)
- **Prioridad**: Orquestador → Context → Rules → Prompting

### 🔴 **ROJO** - Estabilización requerida
- **Condición**: Cualquier métrica fuera de umbral
- **Acción**: Ejecutar checklist de estabilización
- **Enfoque**: Hotfixes pequeños, no mejoras grandes

## 📊 Criterios de Evaluación

### 1️⃣ **Defectos y Estabilidad**
- **P0/P1 abiertos**: 0 (crítico)
- **P2 activos**: ≤5 con tendencia a la baja
- **Flaky tests**: <2% en 50 corridas

### 2️⃣ **Salud CI/CD**
- **ci-gate1**: ≥98% de éxito en últimas 50 ejecuciones
- **MTTR**: ≤30 min (tiempo medio de corrección)

### 3️⃣ **Contratos y Funcional**
- **Suite de contratos**: 100% verde por 7 días
- **Smoke end-to-end**: 100% verde por 7 días

### 4️⃣ **Operación**
- **Error fatal**: ≤1% por 100 tareas
- **Latencia p95 global**: ≤7.5s (orquestador ≤3.0s)
- **Resiliencia**: 0 reinicios consecutivos del mismo agente

### 5️⃣ **Observabilidad**
- **100% de hops** con trace + audit completos
- **Logs "ruido"**: ↓50% vs. última semana

## ⚙️ Comandos Principales

### 🔍 **Salud Rápida** (Diario)
```bash
# Verificar estado básico del sistema
npm run quannex:contracts      # Tests de contratos
npm run quannex:init           # Health checks
npm run quannex:smoke          # Smoke tests
```

### 📊 **Métricas y Análisis** (Diario)
```bash
# Recolectar y analizar métricas
npm run quannex:metrics        # Recolectar métricas diarias
npm run quannex:metrics:report # Ver reporte del día
npm run quannex:dashboard      # Dashboard visual completo
```

### 🚦 **Evaluación del Semáforo**
```bash
# Evaluar estado del semáforo
npm run quannex:semaphore              # Evaluación completa
npm run quannex:semaphore:health       # Solo health checks
npm run quannex:semaphore:stabilization # Checklist estabilización
npm run quannex:semaphore:plan         # Plan de mejoras
npm run quannex:semaphore:commands     # Comandos de control
```

### 🤖 **Automatización**
```bash
# Automatización diaria completa
npm run quannex:automation             # Ejecutar automatización
npm run quannex:automation:dry-run     # Simular ejecución
npm run quannex:automation:verbose     # Ejecutar con salida detallada
```

### 🚪 **Gate de Calidad**
```bash
# CI completo
npm run ci:gate1                       # Lint + Contracts + Init + Smoke
```

## 🔧 Checklist de Estabilización

Cuando el semáforo está en **ROJO**, ejecutar:

- [ ] **Backlog hygiene**: Clasificar errores (P0/P1/P2), cerrar P0/P1
- [ ] **Anti-scaffolding activo**: Pre-commit + CI sin violaciones 72h
- [ ] **Aliases/exports canónicos**: 0 paths "a mano" en imports
- [ ] **KPIs diarios**: Guardar reporte de `quannex:kpis` (p95, errores, hops)
- [ ] **Contratos congelados**: Schema estable por 7 días
- [ ] **Runbook al día**: Procedimientos de rollback y troubleshooting probados

## ⚠️ Señales de "No Todavía"

Detener mejoras si aparece:

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

## 📈 Interpretación de Métricas

### 🟢 **Verde** (Bueno)
- **Defectos**: 0 P0/P1, ≤3 P2
- **CI**: ≥98% éxito
- **Contratos**: 100% éxito
- **Error rate**: ≤1%
- **Latencia**: ≤7.5s p95

### ⚠️ **Amarillo** (Atención)
- **Defectos**: 1-2 P2
- **CI**: 90-97% éxito
- **Error rate**: 1-3%
- **Latencia**: 7.5-10s p95

### 🔴 **Rojo** (Crítico)
- **Defectos**: ≥1 P0/P1, ≥5 P2
- **CI**: <90% éxito
- **Error rate**: >3%
- **Latencia**: >10s p95

## 📁 Estructura de Archivos

```
data/
├── metrics/           # Métricas diarias
│   └── quannex-YYYY-MM-DD.json
├── reports/           # Reportes diarios
│   └── daily-report-YYYY-MM-DD.json
└── logs/             # Logs del sistema
    └── quannex-daily.log

tools/
├── quannex-semaphore.mjs      # Sistema de semáforo
├── quannex-daily-metrics.mjs  # Recolección de métricas
└── quannex-dashboard.mjs      # Dashboard visual

scripts/
└── quannex-daily-automation.sh # Automatización diaria
```

## 🎯 Flujo de Trabajo Diario

### **Mañana** (9:00 AM)
```bash
# 1. Verificar salud básica
npm run quannex:contracts
npm run quannex:init

# 2. Recolectar métricas
npm run quannex:metrics

# 3. Verificar semáforo
npm run quannex:semaphore
```

### **Mediodía** (12:00 PM)
```bash
# 4. Revisar dashboard
npm run quannex:dashboard

# 5. Si hay alertas, ejecutar checklist
npm run quannex:semaphore:stabilization
```

### **Tarde** (5:00 PM)
```bash
# 6. Ejecutar automatización completa
npm run quannex:automation

# 7. Verificar reporte final
npm run quannex:metrics:report
```

## 🚨 Resolución de Problemas

### **CI/CD Falla**
```bash
# Diagnosticar
npm run ci:gate1

# Ver logs detallados
npm run quannex:automation:verbose
```

### **Contratos Fallan**
```bash
# Verificar contratos
npm run quannex:contracts

# Revisar logs
tail -f logs/quannex-daily.log
```

### **Error Rate Alto**
```bash
# Verificar sistema
npm run quannex:init

# Revisar resiliencia
npm run quannex:resilience
```

## 📊 Decisión en Una Línea

**Regla Toyota "menos y mejor":**

> Mejoramos Orquestador y Context solo cuando: **3 días seguidos** con P0/P1=0, contracts 100% 7 días, ci-gate1 ≥98%, error ≤1%, p95 ≤7.5s y sin scaffolding.
> 
> Si no, seguimos puliendo errores pequeños hasta consolidar ese piso.

---

**QuanNex Semáforo: Calidad sobre Velocidad** 🚦⚡
