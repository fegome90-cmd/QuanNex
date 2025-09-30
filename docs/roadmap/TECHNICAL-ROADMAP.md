# Roadmap Técnico — Claude Project Init Kit

## Objetivo
Asegurar un kit robusto, reproducible y seguro, con plantillas por tipo y CI endurecido, listo para equipos.

## Principios
- Robustez primero (determinismo, idempotencia, safe-by-default)
- Mínimo privilegio (CI, hooks, secretos)
- Verificabilidad (tests, healthcheck, métricas)

## Fases y Entregables

1) Hardening Núcleo (Semana 1)
- Flags finalizadas: `--name --type --path --yes --dry-run --force --version`
- Git fallback estable; logging a `logs/init-*.log`
- Hooks: notificaciones y lint-fix opt‑in por env
- Entregables: script endurecido + README actualizado

2) Testing y CI (Semana 1–2)
- Añadir bats-core (unit tests de parser/validadores)
- CI: `permissions: contents: read`, `concurrency`, pin de acciones por SHA
- Required checks: lint, tests init/flags, unit, secret scan
- Entregables: `.github/workflows/ci.yml` endurecido, `tests/*.bats`

3) Modularización de Plantillas (Semana 2)
- Extraer heredocs a `templates/{commands,agents,hooks,claude}/...`
- Renderizado simple (`envsubst`/placeholders) para evitar quoting frágil
- Entregables: directorio `templates/` y generador en init

4) Seguridad y Compliance (Semana 2–3)
- `.env.example` por tipo; política de PHI en proyectos “medical”
- `core/scripts/check-phi.sh` para medical; reforzar `.gitignore` en plantillas
- Secret scan gated en CI; `.secretsallow` documentado

5) Integración de Investigación (Semana 3)
- `docs/research/INDEX.md` + `TRAZABILIDAD.md` enlazadas en `CLAUDE.md`
- Comando `/research-digest` y agente `@context-engineer` (plantilla)

6) Release y Mantenimiento (Semana 4)
- `VERSION` + `core/scripts/release.sh` (SemVer, changelog, checksum)
- Dependabot para `github-actions`; documentación de soporte

## KPIs
- ≥95% PRs con CI verde; 0 secretos por release
- Tiempo init→healthcheck < 30 s (tipos base)
- Cobertura tests (bats + integración) ≥ 80% rutas críticas

## Riesgos y Mitigaciones
- Rupturas por modularización → migración por fases y tests de snapshot
- Variabilidad de entornos → fallback y validadores de versión

