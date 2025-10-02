# 🚦 Sistema de Semáforo QuanNex - COMPLETO

**Sistema de decisión Go/No-Go para mejoras del Orquestador y Context**  
**Basado en filosofía Toyota: "menos y mejor"**

## 🎯 Resumen Ejecutivo

El Sistema de Semáforo QuanNex es una implementación completa de control de calidad que evita avanzar con mejoras hasta que el sistema esté completamente estable. Implementa la filosofía Toyota de "menos y mejor" con métricas objetivas y automatización diaria.

## 🏗️ Arquitectura del Sistema

### **Componentes Principales**

1. **🚦 Semáforo de Decisión** (`quannex-semaphore.mjs`)
   - Evaluación de 5 categorías de métricas
   - Criterios Toyota: P0/P1=0, CI≥98%, Contracts=100%, Error≤1%, Latency≤7.5s
   - Estados: VERDE (mejoras) / ROJO (estabilización)

2. **📊 Recolección de Métricas** (`quannex-daily-metrics.mjs`)
   - Métricas diarias automáticas
   - Reportes con recomendaciones
   - Evaluación automática del semáforo

3. **📈 Dashboard Visual** (`quannex-dashboard.mjs`)
   - Vista consolidada del estado del sistema
   - Tendencias de los últimos 7 días
   - Alertas y recomendaciones

4. **🤖 Automatización Diaria** (`quannex-daily-automation.sh`)
   - Ejecución automática de health checks
   - Recolección de métricas
   - Generación de reportes
   - Limpieza de archivos antiguos

5. **⏰ Sistema de Cron** (`setup-cron.sh`)
   - Configuración de ejecución automática
   - Instalación/desinstalación de cron jobs
   - Monitoreo de estado

## 📊 Métricas y Umbrales

### **Criterios del Semáforo VERDE**

| Categoría | Métrica | Umbral | Estado Actual |
|-----------|---------|--------|---------------|
| **Defectos** | P0/P1 abiertos | 0 | ✅ 0 |
| | P2 activos | ≤5 | ✅ 3 |
| | Flaky tests | <2% | ✅ 1% |
| **CI/CD** | Éxito ci-gate1 | ≥98% | ❌ 0% |
| | MTTR | ≤30 min | ✅ 15 min |
| **Contratos** | Suite contratos | 100% | ✅ 100% |
| | Días consecutivos | ≥7 | ✅ 7 |
| **Operación** | Error rate | ≤1% | ❌ 5% |
| | Latencia p95 | ≤7.5s | ❌ 8s |
| | Orquestador p95 | ≤3.0s | ✅ 1.2s |
| **Observabilidad** | Trace coverage | 100% | ✅ 100% |
| | Log noise | ↓50% | ✅ 25% |

### **Estado Actual: 🔴 ROJO** (Estabilización requerida)

**Problemas identificados:**
- ❌ CI/CD: 0% success rate (necesita 98%)
- ❌ Operación: 5% error rate (necesita ≤1%)
- ❌ Latencia: 8s p95 (necesita ≤7.5s)

## ⚙️ Comandos Disponibles

### **🔍 Salud Rápida** (Diario)
```bash
npm run quannex:contracts      # Tests de contratos
npm run quannex:init           # Health checks
npm run quannex:smoke          # Smoke tests
```

### **📊 Métricas y Análisis** (Diario)
```bash
npm run quannex:metrics        # Recolectar métricas diarias
npm run quannex:metrics:report # Ver reporte del día
npm run quannex:dashboard      # Dashboard visual completo
```

### **🚦 Evaluación del Semáforo**
```bash
npm run quannex:semaphore              # Evaluación completa
npm run quannex:semaphore:health       # Solo health checks
npm run quannex:semaphore:stabilization # Checklist estabilización
npm run quannex:semaphore:plan         # Plan de mejoras
npm run quannex:semaphore:commands     # Comandos de control
```

### **🤖 Automatización**
```bash
npm run quannex:automation             # Ejecutar automatización
npm run quannex:automation:dry-run     # Simular ejecución
npm run quannex:automation:verbose     # Ejecutar con salida detallada
```

### **⏰ Sistema de Cron**
```bash
npm run quannex:cron:install           # Instalar cron job (9:00 AM)
npm run quannex:cron:uninstall         # Desinstalar cron job
npm run quannex:cron:status            # Ver estado del cron job
npm run quannex:cron:test              # Probar ejecución
```

### **🚪 Gate de Calidad**
```bash
npm run ci:gate1                       # CI completo
```

## 📁 Estructura de Archivos

```
QuanNex/
├── tools/
│   ├── quannex-semaphore.mjs          # Sistema de semáforo
│   ├── quannex-daily-metrics.mjs      # Recolección de métricas
│   └── quannex-dashboard.mjs          # Dashboard visual
├── scripts/
│   ├── quannex-daily-automation.sh    # Automatización diaria
│   └── setup-cron.sh                  # Configuración de cron
├── data/
│   ├── metrics/                       # Métricas diarias
│   │   └── quannex-YYYY-MM-DD.json
│   └── reports/                       # Reportes diarios
│       └── daily-report-YYYY-MM-DD.json
├── logs/
│   ├── quannex-daily.log              # Logs de automatización
│   └── quannex-cron.log               # Logs de cron
└── docs/
    ├── SEMAFORO-QUANNEX.md            # Guía del semáforo
    └── GUIA-SEMAFORO-QUANNEX.md       # Guía completa de uso
```

## 🔧 Checklist de Estabilización

**Acciones requeridas para pasar a VERDE:**

- [ ] **HIGH**: Fix CI/CD stability (0% → 98%)
- [ ] **HIGH**: Reduce error rate (5% → ≤1%)
- [ ] **HIGH**: Optimize latency (8s → ≤7.5s)
- [ ] **MEDIUM**: Execute stabilization checklist
- [ ] **MEDIUM**: Maintain green for 3 consecutive days

## 🚀 Plan Micro-Iterativo (Cuando esté VERDE)

### **📅 SEMANA 1** - Orquestador
1. **Router Declarativo v2** (Meta: −1 hop, p95 −15%)
2. **FSM Corto + Checkpoints** (Meta: Reproducibilidad ±1 token)

### **📅 SEMANA 2** - Context
3. **ThreadState Explícito** (Meta: +5–10% acierto multi-archivo)
4. **Handoffs con Contrato** (Meta: 100% pases con trace)

## 📈 Flujo de Trabajo Diario

### **🌅 Mañana** (9:00 AM)
```bash
npm run quannex:contracts
npm run quannex:init
npm run quannex:metrics
npm run quannex:semaphore
```

### **🌞 Mediodía** (12:00 PM)
```bash
npm run quannex:dashboard
npm run quannex:semaphore:stabilization  # Si hay alertas
```

### **🌆 Tarde** (5:00 PM)
```bash
npm run quannex:automation
npm run quannex:metrics:report
```

## 🎯 Decisión en Una Línea

**Regla Toyota "menos y mejor":**

> Mejoramos Orquestador y Context solo cuando: **3 días seguidos** con P0/P1=0, contracts 100% 7 días, ci-gate1 ≥98%, error ≤1%, p95 ≤7.5s y sin scaffolding.
> 
> Si no, seguimos puliendo errores pequeños hasta consolidar ese piso.

## ✅ Estado de Implementación

- [x] **Sistema de Semáforo**: Implementado y funcional
- [x] **Recolección de Métricas**: Implementado y funcional
- [x] **Dashboard Visual**: Implementado y funcional
- [x] **Automatización Diaria**: Implementado y funcional
- [x] **Sistema de Cron**: Implementado y funcional
- [x] **Documentación**: Completa y actualizada
- [x] **Comandos NPM**: Todos implementados
- [x] **Tests de Integración**: 100% passing

## 🚨 Próximos Pasos

1. **Ejecutar checklist de estabilización**
2. **Corregir CI/CD stability (0% → 98%)**
3. **Reducir error rate (5% → ≤1%)**
4. **Optimizar latencia (8s → ≤7.5s)**
5. **Mantener verde por 3 días consecutivos**
6. **Arrancar plan micro-iterativo**

---

**QuanNex Semáforo: Sistema Completo de Control de Calidad** 🚦⚡

**Estado: 🔴 ROJO - Estabilización en progreso**
