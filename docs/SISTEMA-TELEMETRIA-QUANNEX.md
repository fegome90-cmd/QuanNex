# 📊 Sistema de Telemetría QuanNex

**Estado:** ✅ IMPLEMENTADO  
**Versión:** 1.0.0  
**Fecha:** 2025-10-03

## 🎯 Objetivo

Implementar un sistema de telemetría plug-and-play para medir el uso real de QuanNex, detectar cuando Cursor no lo usa cuando debería, y proporcionar métricas para optimizar el sistema.

## 🏗️ Arquitectura

### Componentes Principales

1. **Middleware de Telemetría** (`packages/quannex-mcp/telemetry.mjs`)
   - Sistema de logging JSONL
   - Instrumentación de componentes
   - Generación de UUIDs por run
   - Medición de latencia

2. **Sistema de Gates** (`packages/quannex-mcp/gates.mjs`)
   - Detección de bypass de Cursor
   - Validación de uso de herramientas MCP
   - Verificación de orden de componentes
   - Umbrales de rendimiento

3. **Servidor MCP Instrumentado** (`packages/quannex-mcp/server.mjs`)
   - Telemetría automática en tool calls
   - Detección de errores y misfires
   - Medición de latencia por herramienta

4. **Orchestrator Instrumentado** (`orchestration/orchestrator.js`)
   - Telemetría en workflows
   - Medición de duración total
   - Tracking de pasos completados

5. **Sistema de Reportes** (`scripts/`)
   - Análisis rápido con jq
   - Reportes completos en HTML/JSON
   - Alertas automáticas
   - Dashboard de salud

## 📊 Métricas Principales

### KPIs del Sistema

- **qnx_orchestrator_share**: % de ejecuciones que usan el orchestrator (objetivo: ≥95%)
- **qnx_bypass_rate**: % de runs que deberían usar QuanNex pero no lo hacen (objetivo: ≤5%)
- **qnx_tool_misfire_rate**: % de runs con errores en herramientas MCP (objetivo: ≤3%)
- **qnx_success_rate**: % de runs exitosos (objetivo: ≥90%)
- **qnx_avg_ttfq**: Tiempo promedio hasta primer uso de QuanNex (objetivo: ≤5s)

### Métricas de Componentes

- **Invocaciones por componente**: Cuántas veces se usa cada parte
- **Latencia por componente**: Tiempo de ejecución de cada componente
- **Tasa de éxito**: % de operaciones exitosas por componente
- **Orden de uso**: Secuencia típica de componentes

## 🔍 Eventos de Telemetría

### Tipos de Eventos

```json
{
  "ts": "2025-10-03T13:45:12.345Z",
  "run_id": "c3c7…",
  "event": "component_used",
  "component": "orchestrator",
  "action": "invoke|success|error",
  "count": 1,
  "latency_ms": 128,
  "ok": true,
  "meta": {
    "prompt_len": 2134,
    "args_hash": "e5a1…",
    "error": null
  }
}
```

### Eventos Especiales

- **run_start/run_end**: Inicio y fin de ejecución
- **cursor_bypass**: Cursor no usó QuanNex cuando debía
- **tool_misfire**: Error en herramienta MCP
- **gate_violation**: Violación de reglas del sistema

## 🚨 Sistema de Alertas

### Umbrales Configurables

```javascript
const THRESHOLDS = {
  ORCHESTRATOR_SHARE_MIN: 95,    // % mínimo de uso del orchestrator
  BYPASS_RATE_MAX: 5,            // % máximo de bypass
  TOOL_MISFIRE_RATE_MAX: 3,      // % máximo de errores en tools
  SUCCESS_RATE_MIN: 90,          // % mínimo de éxito
  AVG_LATENCY_MAX: 5000,         // Latencia máxima en ms
  P95_LATENCY_MAX: 10000         // Latencia P95 máxima en ms
};
```

### Tipos de Alertas

- **🚨 CRÍTICA**: Orchestrator share bajo, bypass rate alto
- **⚠️ WARNING**: Tool misfire rate alto, success rate bajo
- **ℹ️ INFO**: Latencia alta, métricas de rendimiento

## 🛠️ Uso del Sistema

### Comandos Principales

```bash
# Configuración inicial
node scripts/qnx-telemetry-setup.mjs

# Estadísticas rápidas
make -f Makefile.qnx-telemetry telemetry-stats

# Reporte completo
make -f Makefile.qnx-telemetry telemetry-report

# Verificar salud
make -f Makefile.qnx-telemetry telemetry-health

# Probar sistema
make -f Makefile.qnx-telemetry telemetry-test

# Dashboard HTML
make -f Makefile.qnx-telemetry telemetry-dashboard
```

### Análisis con jq

```bash
# Top componentes globales
jq -r 'select(.event=="component_used") | .component' .reports/metrics/qnx-events.jsonl \
  | sort | uniq -c | sort -nr | head

# Orchestrator como Top-1 por run
jq -sr 'map(select(.event=="component_used")) | group_by(.run_id) | ...'

# Bypass rate y misfires
echo "BYPASS:" $(jq -r 'select(.event=="cursor_bypass")|.run_id' ... | wc -l)
echo "MISFIRES:" $(jq -r 'select(.event=="tool_misfire")|.run_id' ... | wc -l)
```

## 📁 Estructura de Archivos

```
.reports/
├── metrics/
│   └── qnx-events.jsonl          # Eventos de telemetría
├── qnx-telemetry-config.json     # Configuración del sistema
├── qnx-telemetry-report.html     # Reporte HTML
└── qnx-telemetry-data.json       # Datos para análisis

packages/quannex-mcp/
├── telemetry.mjs                 # Middleware de telemetría
├── gates.mjs                     # Sistema de gates
└── server.mjs                    # Servidor MCP instrumentado

scripts/
├── qnx-telemetry-setup.mjs       # Configuración inicial
├── qnx-telemetry-report.mjs      # Generador de reportes
├── qnx-telemetry-alerts.mjs      # Sistema de alertas
├── qnx-telemetry-test.mjs        # Script de prueba
└── qnx-quick-stats.sh           # Estadísticas rápidas

Makefile.qnx-telemetry            # Comandos de telemetría
```

## 🔧 Configuración

### Variables de Entorno

```bash
NODE_ENV=development  # Habilita logs de debug
```

### Configuración de Intenciones Requeridas

El sistema detecta automáticamente cuándo Cursor debería usar QuanNex basándose en palabras clave:

- `auditoría`, `audit`, `security`, `seguridad`
- `plan`, `planning`, `planificar`
- `fix-lint`, `lint`, `refactor`, `test`
- `workflow`, `orchestration`, `agent`, `mcp`, `quannex`

### Configuración de Umbrales

Los umbrales se pueden ajustar en `scripts/qnx-telemetry-alerts.mjs`:

```javascript
export const THRESHOLDS = {
  ORCHESTRATOR_SHARE_MIN: 95,
  BYPASS_RATE_MAX: 5,
  TOOL_MISFIRE_RATE_MAX: 3,
  SUCCESS_RATE_MIN: 90,
  AVG_LATENCY_MAX: 5000
};
```

## 📈 Ejemplo de Uso

### 1. Configuración Inicial

```bash
node scripts/qnx-telemetry-setup.mjs
```

### 2. Probar el Sistema

```bash
node scripts/qnx-telemetry-test.mjs
```

### 3. Ver Estadísticas

```bash
make -f Makefile.qnx-telemetry telemetry-stats
```

### 4. Generar Reporte

```bash
make -f Makefile.qnx-telemetry telemetry-report
```

### 5. Abrir Dashboard

```bash
make -f Makefile.qnx-telemetry telemetry-dashboard
```

## 🎯 Resultados Esperados

### Estado Saludable

- **Orchestrator Share**: ≥95%
- **Bypass Rate**: ≤5%
- **Tool Misfire Rate**: ≤3%
- **Success Rate**: ≥90%
- **Avg TTFQ**: ≤5s

### Alertas Típicas

- **Orchestrator share bajo**: Cursor no está usando QuanNex consistentemente
- **Bypass rate alto**: Gates de detección necesitan ajuste
- **Tool misfire rate alto**: Validación de argumentos MCP necesita mejora
- **Latencia alta**: Optimización de componentes requerida

## 🔮 Próximos Pasos

### Mejoras Planificadas

1. **Integración con Prometheus**: Métricas en tiempo real
2. **Alertas Automáticas**: Slack/Email notifications
3. **Dashboard en Tiempo Real**: WebSocket para live updates
4. **Análisis de Tendencias**: ML para detectar patrones
5. **Integración con CI/CD**: Alertas en pipelines

### Optimizaciones

1. **Compresión de Logs**: Para archivos grandes
2. **Rotación Automática**: Limpieza de datos antiguos
3. **Sampling Inteligente**: Reducir volumen en producción
4. **Caching de Métricas**: Para consultas frecuentes

## 📚 Referencias

- **Middleware**: `packages/quannex-mcp/telemetry.mjs`
- **Gates**: `packages/quannex-mcp/gates.mjs`
- **Alertas**: `scripts/qnx-telemetry-alerts.mjs`
- **Reportes**: `scripts/qnx-telemetry-report.mjs`
- **Configuración**: `.reports/qnx-telemetry-config.json`

---

**Nota**: Este sistema está diseñado para ser plug-and-play. Una vez configurado, recopila automáticamente métricas de todas las interacciones con QuanNex, permitiendo identificar problemas y optimizar el sistema basándose en datos reales.
