# Canary Rollout Policy

## Estrategia

- Despliega 10% de pods como canary (nueva versión)
- Monitorea 15 min: `SnapshotRatio_canary - SnapshotRatio_stable <= 2%`
- Abort si excede 2% o si HighLatency/Degraded firing en canary > stable

## Abort Automático (CI job)

- Consulta 3 veces la métrica diferencial (cada 5 min)
- Si 2/3 evaluaciones fallan → ejecuta `abort-canary.sh`

## Métricas de Monitoreo

- `quannex_metrics_snapshot_total` por instancia
- `quannex_circuit_breaker_active` por instancia
- `histogram_quantile(0.95, rate(qn_http_request_duration_seconds_bucket[5m]))` por instancia
