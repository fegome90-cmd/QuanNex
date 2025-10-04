# Playbook de Rollback No Destructivo

## Principios
- Preferir `git revert` del PR/commit específico.
- Hotfix desde tag estable solo si revert no aplica.
- Cambios grandes en PRs pequeñas por dominio (repair/*).

## Ritual obligatorio
1. Identificar tag base estable (vX.Y.Z).
2. Crear rama `repair/<dominio>-<ticket>`.
3. Aplicar revert o reintroducir archivos críticos desde el commit sano.
4. Abrir PR con labels `rollback` y `critical`.
5. Requisitos de merge: `verify`, `policy-scan`, `manual-rollback-guard` en verde + CODEOWNERS.
6. Post-merge: RCA breve en `docs/ROOT-CAUSE-ORG.md` con evidencias (runs/PRs).
