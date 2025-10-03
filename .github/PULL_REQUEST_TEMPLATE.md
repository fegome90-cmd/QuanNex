# QuanNex Ops — Checklist PR

## 📊 Métricas & Gates

- [ ] `/metrics` 200 siempre (fallback probado)
- [ ] `X-Metrics-Source` y `Warning` en fallback
- [ ] `quannex_gate_status{gate=...}` (5+ gates)
- [ ] `quannex_metrics_fallback_total` y `quannex_e2e_last_pass_timestamp`

## 🔧 Operación

- [ ] `ops/acceptance-test.sh` OK (2')
- [ ] `ops/prometheus/quannex-metrics.rules.yaml` validado con promtool
- [ ] Dashboard `quannex-operator-golden.json` importable
- [ ] `RUNBOOK.md` actualizado (síntomas/diag/mitigación/verificación)

## 📋 Política

- [ ] SLOs revisados y sin cambios de umbrales
- [ ] Canary policy revisada (ratio snapshot canary ≤ +2%)
- [ ] CI `metrics_integrity_gate` verde en este PR

## 🧪 Testing

- [ ] Smoke pack ejecutado localmente
- [ ] Acceptance test pasado
- [ ] Reglas Prometheus validadas
- [ ] Dashboard importado en Grafana (opcional)

## 📝 Documentación

- [ ] Runbook actualizado con nuevos procedimientos
- [ ] SLOs documentados y medibles
- [ ] Políticas de remediación claras
- [ ] Comandos exactos para diagnóstico

## 🚀 Deployment

- [ ] Canary rollout policy implementada
- [ ] Abort automático configurado
- [ ] Métricas de monitoreo definidas
- [ ] Alertas Prometheus activas

---

**🔒 QuanNex Metrics Integrity Gate - PR Checklist**
