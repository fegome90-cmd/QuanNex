# 🔗 Trazabilidad Inversa en los Gates

**Fecha**: 2025-10-04  
**Propósito**: Mensajes de error autoexplicativos con enlaces directos al porqué

## A. manual-rollback-guard.yml

```yaml
- name: Fail on mass deletion
  shell: bash
  run: |
    echo "::error file=guard.sh,title=Mass deletion detected::Se detectaron ${D} líneas borradas (> ${TH}). Motivo y reglas: docs/BAU/RUNBOOK-REANUDACION-OPA.md#por-que-existe-este-guard y docs/policy/CATALOGO-REGLAS-OPA.md"
    exit 1
```

## B. opa-policy-check-*.yml (cuando hay violación)

```yaml
- name: Comment violations on PR
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const why = [
        "ℹ️ *¿Por qué existe este gate?*",
        "- RUNBOOK: docs/BAU/RUNBOOK-REANUDACION-OPA.md",
        "- ADR (si aplica): docs/adr/ADR-XXXX-opa-guards.md",
        "- Catálogo reglas: docs/policy/CATALOGO-REGLAS-OPA.md"
      ].join("\n");
      const fs = require('fs');
      const lines = fs.readFileSync('violations.txt','utf8').split('\n').filter(Boolean);
      const body = `❌ **Política PR**\n\n${lines.map(l=>`- ${l}`).join('\n')}\n\n${why}`;
      github.rest.issues.createComment({ owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, body });
```

## C. Mensaje Estándar para Sensitive Paths

```
Se tocaron rutas sensibles sin 'critical'. Ver justificación y proceso: docs/policy/CATALOGO-REGLAS-OPA.md#sensitivepath y RUNBOOK sección B.2.
```

## D. Mensaje Estándar para Mass Deletion

```
Se detectaron deleciones masivas sin 'rollback'. Ver justificación y proceso: docs/policy/CATALOGO-REGLAS-OPA.md#massdeletion y RUNBOOK sección B.2.
```

## E. Mensaje Estándar para OPA Violations

```
❌ **Política PR Violada**

- [Violación específica]

ℹ️ *¿Por qué existe este gate?*
- RUNBOOK: docs/BAU/RUNBOOK-REANUDACION-OPA.md
- ADR (si aplica): docs/adr/ADR-XXXX-opa-guards.md
- Catálogo reglas: docs/policy/CATALOGO-REGLAS-OPA.md
```

---

**Estado**: 🔗 **TRAZABILIDAD INVERSA LISTA**  
**Uso**: Copy-paste en workflows para mensajes autoexplicativos
