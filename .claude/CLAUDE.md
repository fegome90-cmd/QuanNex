# Contexto IA — Reglas de Estabilidad y Calidad

Objetivo
- Mantener la robustez del kit (Toyota‑grade): prevenir > detectar > recuperar > medir.
- Evitar introducir fallas críticas en nuevas contribuciones asistidas por IA.

Modo por defecto (estabilización)
- Templates: `--use-templates=off` a menos que el PR incluya validador y tests (PR10–PR11).
- Hooks: sin `--fix`; activar sólo con `CLAUDE_HOOKS_LINT_FIX=1` documentado.
- MCP/Playwright: deshabilitar si no está disponible o validado (PR12).

Prohibiciones y límites
- No auto‑instalar dependencias ni elevar privilegios.
- No `chown`/cambiar ownership; ofrecer guías/fix scripts opt‑in.
- No escribir fuera del destino; siempre paths citados y relativos.
- No introducir secretos ni credenciales en archivos o logs.

Validaciones obligatorias (antes de tocar disco)
- Permisos/espacio: verificar escritura y ≥50MB libres en `--path`.
- Nombre de proyecto: whitelist `^[a-zA-Z0-9._-]{1,64}$` (sin control chars).
- Concurrencia: lock por destino; abortar si ya existe.

Plantillas (cuando se usen)
- Sustitución total: 0 `{{…}}` en salidas; valores por defecto seguros.
- Integridad: validar JSON (jq si disponible) y estructura por tipo.
- Compatibilidad: `templates/manifest.json {version, min_init_version, checksums, deps}`; rechazar incompatibles.
- Dependencias: detectar ciclos/rotas en `deps`; abortar con diagnóstico.

FS/Transaccionalidad/Portabilidad
- Crear en staging (`.<name>.staging`) y mover atómicamente; cleanup seguro en fallo.
- Encoding UTF‑8 y line endings LF (añadir `.gitattributes` si faltara).
- Rutas con espacios: comillar/escapar; opción `--allow-spaces` explícita.

Hooks/MCP
- Hooks Bash‑only si no hay Node; verificar ejecutabilidad.
- MCP en `.claude/mcp.json`: `state: enabled|disabled(reason)`; healthcheck debe reflejarlo.

CI y testing
- Required checks: lint, init, flags, unit, secret scan, edge.
- Healthcheck profundo por tipo (scripts 0755, `.gitignore`, agentes/commands críticos, MCP/hook, `.env.example`).
- Publicar `reports/init-report.json` y `reports/validation.json`.

Andón (parar la línea)
- Si falla cualquier gate (A–E en docs/STABILITY-POLICY.md), no avanzar; proponer plan + pruebas.

Workflow esperado (PRs)
- Explorar → Planificar → Ejecutar → Confirmar.
- Entregar: cambios mínimos, tests, logs, docs actualizadas y riesgos.

Referencias
- `docs/STABILITY-POLICY.md`, `docs/ci/PLAN.md`, `docs/onboarding/workflows/*`.
