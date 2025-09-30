# Plan de CI (Definición)

Objetivo
- Checks esenciales y permisos mínimos; reproducible y portable.

Checks requeridos
- Lint: `core/scripts/lint-shell.sh` (shellcheck + shfmt).
- Tests: `core/scripts/test-claude-init.sh`, `core/scripts/test-flags.sh`.
- Secret scan: `core/scripts/scan-secrets.sh`.

Permisos mínimos
- A nivel job: `permissions: contents: read`.
- Elevar permisos solo si se requieren pasos que escriben en PR (no aplicable por ahora).

Buenas prácticas
- `concurrency` por ref con cancelación.
- Pin de acciones por SHA en lugar de tags flotantes.
- Dependabot para “github-actions” semanal.

Acción siguiente
- Aplicar en `.github/workflows/ci.yml`: `permissions: contents: read`, `concurrency`, pin de actions por SHA.
- Abrir PR dedicada con estos cambios.

Checklist: Pin de acciones por SHA
- Identificar acciones usadas (ej.: `actions/checkout`, `actions/setup-node`).
- Obtener SHA del commit a fijar:
  - GitHub UI: ir a la acción → Releases/Tags → abrir tag (ej. v4) → copiar “Commit SHA”.
  - GitHub CLI (con red):
    ```bash
    # Último commit de checkout
    gh api repos/actions/checkout/commits --jq '.[0].sha' | head -n1
    # Último commit de setup-node
    gh api repos/actions/setup-node/commits --jq '.[0].sha' | head -n1
    ```
- Reemplazar en workflow:
  ```yaml
  # Antes
  uses: actions/checkout@v4
  # Después
  uses: actions/checkout@<SHA>
  ```
- Validar CI en PR y documentar los SHAs (link al commit/release).
- Mantener Dependabot para avisos y evaluar actualización de pins periódicamente.
