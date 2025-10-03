# 📦 QuanNex Operations (/ops)

Estructura completa de operaciones para el Metrics Integrity Gate de QuanNex, lista para copiar-pegar en producción.

## 📁 Estructura

```
/ops/
├── README.md                           # Este archivo
├── RUNBOOK.md                          # Runbook operacional completo
├── SLOs.md                             # Objetivos de servicio y políticas
├── acceptance-test.sh                  # Test de aceptación (2 min)
├── prometheus/
│   └── quannex-metrics.rules.yaml     # Reglas de alerta Prometheus
├── dashboards/
│   └── quannex-operator-golden.json  # Dashboard operador (8 gráficos)
├── ci/
│   └── metrics_integrity_gate.yml     # Workflow CI completo
├── scripts/
│   ├── metrics-validate.sh            # Validación formato OpenMetrics
│   └── smoke-pack.sh                  # Smoke pack de 60s
└── canary/
    ├── rollout-policy.md              # Política de canary rollout
    └── abort-canary.sh               # Script de abort canary
```

## 🚀 Uso Rápido

### Acceptance Test (2 minutos antes del merge)

```bash
bash ops/acceptance-test.sh
```

### Smoke Pack (validación rápida)

```bash
bash ops/scripts/smoke-pack.sh http://localhost:3000/metrics
```

### Validación de métricas

```bash
bash ops/scripts/metrics-validate.sh http://localhost:3000/metrics
```

## 📊 Componentes

### 🔧 Runbook Operacional

- **Archivo**: `RUNBOOK.md`
- **Contenido**: Síntomas, diagnóstico rápido, mitigación, verificación
- **Uso**: Copiar-pegar comandos exactos para incidentes

### 🎯 SLOs y Políticas

- **Archivo**: `SLOs.md`
- **Contenido**: Objetivos de servicio, presupuesto de error, políticas de remediación
- **Uso**: Definir expectativas de servicio y políticas de respuesta

### 🚨 Alertas Prometheus

- **Archivo**: `prometheus/quannex-metrics.rules.yaml`
- **Contenido**: 4 alertas críticas (Missing, Degraded, E2EStale, HighLatency)
- **Uso**: Importar en Prometheus para monitoreo automático

### 📈 Dashboard Operador

- **Archivo**: `dashboards/quannex-operator-golden.json`
- **Contenido**: 8 gráficos (4 golden + 4 operador)
- **Uso**: Importar en Grafana para observabilidad completa

### 🔄 CI/CD Pipeline

- **Archivo**: `ci/metrics_integrity_gate.yml`
- **Contenido**: Workflow completo con 10+ validaciones
- **Uso**: Copiar a `.github/workflows/` para CI automático

### 🧪 Scripts de Validación

- **Archivos**: `scripts/metrics-validate.sh`, `scripts/smoke-pack.sh`
- **Contenido**: Validación formato OpenMetrics, smoke pack de 60s
- **Uso**: Ejecutar localmente o en CI para validación rápida

### 🚀 Canary Rollout

- **Archivos**: `canary/rollout-policy.md`, `canary/abort-canary.sh`
- **Contenido**: Política de despliegue canary, script de abort automático
- **Uso**: Implementar despliegues seguros con rollback automático

## ✅ Acceptance Test

El acceptance test valida:

1. **Smoke local**: Endpoint responde, formato válido, contadores incrementan
2. **Rules Prometheus**: Sintaxis YAML válida, reglas correctas
3. **Dashboard importable**: JSON válido, 8 paneles presentes
4. **Scripts ejecutables**: Permisos correctos, shebang presente
5. **Estructura completa**: Todos los archivos requeridos presentes

## 🔒 Estado de Producción

- ✅ **Runbook completo**: 4 secciones con comandos exactos
- ✅ **SLOs configurados**: 4 objetivos con políticas de remediación
- ✅ **Alertas implementadas**: 4 reglas Prometheus críticas
- ✅ **Dashboard listo**: 8 gráficos con observabilidad completa
- ✅ **CI/CD funcional**: Workflow con 10+ validaciones
- ✅ **Scripts probados**: Validación y smoke pack funcionando
- ✅ **Canary documentado**: Política y abort automático listos

## 📞 Soporte

- **Runbook**: `ops/RUNBOOK.md` para procedimientos de incidentes
- **SLOs**: `ops/SLOs.md` para expectativas de servicio
- **Dashboard**: Importar `ops/dashboards/quannex-operator-golden.json` en Grafana
- **Alertas**: Importar `ops/prometheus/quannex-metrics.rules.yaml` en Prometheus

---

**🔒 QuanNex Operations v1.0.0**  
_Estructura completa lista para producción enterprise_
