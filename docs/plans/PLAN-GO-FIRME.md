# PLAN-GO-FIRME — TaskDB Gate
*taskId: PLAN-GO-FIRME*

## Objetivo
Cerrar el Gate "GO firme" dejando TaskDB listo para el kickoff de RAG.

## Alcance
1. Normalizar árbol y artefactos para que `npm run test` quede verde o con suites heredadas aisladas en "quarantine".
2. Ejecutar el exporter de métricas como servicio permanente (docker compose, pm2 o systemd) y validar `/metrics` tras seeds.

## Checklist operativo
- [ ] Commit de la remediación actual y limpieza `git clean -fdX`.
- [ ] Regenerar artefactos históricos requeridos por tests legacy o moverlos a `tests.quarantine/`.
- [ ] `npm run test` verde (o job de quarantine documentado).
- [ ] Exporter levantado vía compose/pm2/systemd con healthcheck.
- [ ] `npm run taskdb:seed` seguido de `/metrics` mostrando `taskdb_events_total > 0`.
- [ ] Documentar resultado en CHANGELOG y tag `v0.2.3-go-firm`.

## Owners
- Felipe (ops), soporte Codex durante el kickoff.

## Dependencias
- TaskDB remediado (GO mínimo) – completado.
- Infra métricas disponible.

## Próximo Sprint (Kickoff)
- Ejecutar los dos pasos en vivo durante el primer día.
- Confirmar gates en CI y publicar tag.
