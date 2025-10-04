# Catálogo de Reglas OPA (Política de PR)

**Fecha**: 2025-10-04  
**Propósito**: Catálogo formal de reglas implementadas en OPA

## Contexto/ADR
- **RUNBOOK**: `docs/BAU/RUNBOOK-REANUDACION-OPA.md`
- **ADR**: `docs/adr/ADR-XXXX-opa-guards.md` (pendiente)

## 1. Entrada estándar
`input.json` con:
- `labels: string[]`
- `files: string[]`
- `deleted_files: string[]`

## 2. Reglas (MVP)

| Regla | Descripción | Entrada | Acción si viola | Excepción | Evidencia | Justificación/Contexto |
|------|--------------|---------|-----------------|-----------|-----------|----------------------|
| SensitivePath | Tocar rutas sensibles requiere `critical` + CODEOWNERS | labels, files | DENY | Label `critical` | PR comment + job fail | Proteger rutas críticas del sistema |
| MassDeletion | >max_files_deleted requiere `rollback` + CODEOWNERS | labels, deleted_files | DENY | Label `rollback` | PR comment + job fail | Prevenir pérdida accidental de código |

> **Umbrales/paths**: por ahora *hardcode* en Rego; `data.yaml` se reintroduce con validación (ver DATA-YAML-ESPEC.md).

## 3. Matriz de pruebas (conceptual)

| Caso | labels | files | deleted_files | Esperado |
|------|--------|-------|---------------|----------|
| SENS-1 | [] | ["rag/a.ts"] | [] | DENY |
| SENS-2 | ["critical"] | ["rag/a.ts"] | [] | ALLOW |
| MASS-1 | [] | [] | 30 | DENY |
| MASS-2 | ["rollback"] | [] | 30 | ALLOW |

## 4. Compatibilidad OPA
- Versión: 0.58.0
- Sintaxis: `p := input.files[_]`; **no** usar `default deny = []` junto con `deny[msg]`.

---

**Estado**: 📚 **CATÁLOGO FORMAL**  
**Responsable**: @fegome90-cmd  
**Última actualización**: 2025-10-04
