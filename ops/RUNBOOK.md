# QuanNex — RUNBOOK de Métricas

## 1) Síntomas

- **Alertas**: QuanNexMetricsMissing, QuanNexMetricsDegraded, E2EStale, HighLatency
- **Impacto**: paneles ciegos, decisiones sin datos, CI bloqueado

## 2) Diagnóstico rápido (ejecutar en orden)

```bash
curl -fsS -D- $METRICS_URL | sed -n '1,20p'
curl -fsS $METRICS_URL/selftest | jq
grep -E "metrics|fallback|breaker" -n server.log | tail -n 50
```

## 3) Mitigación

- **Snapshot sostenido**: revisar escritura `.cache/`, reiniciar proceso; si persiste, activar breaker 60s y observar `fallback_total`
- **HighLatency**: reducir trabajo del generador, confirmar CPU/IO, revisar p95 en dashboard
- **E2EStale**: re-ejecutar E2E; si >90 min, abrir post-mortem ligero

## 4) Verificación (vuelta a verde)

- `/metrics` = 200 + `X-Metrics-Source: live`
- `fallback_total` estable 15 min
- `live/snapshot` ratio > 95% en 1h
