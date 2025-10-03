# SLOs QuanNex Métricas

## Objetivos de Servicio

- **Disponibilidad /metrics** ≥ 99.9% (budget mensual ~43 min)
- **Ratio live/snapshot** ≥ 95% en 24h
- **p95 /metrics** ≤ 200 ms
- **E2E last pass age** ≤ 90 min

## Políticas de Remediation

- **Freeze deploy** si `live/snapshot < 95%` por `> 6h`
- **Post-mortem** si `E2EStale > 90 min` dos veces/semana
