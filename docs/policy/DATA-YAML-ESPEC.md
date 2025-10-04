# Especificación de `data.yaml` para OPA (Reintroducción controlada)

**Fecha**: 2025-10-04  
**Propósito**: Especificación para reintroducir data.yaml con validación completa

## 1. Problema detectado
- Fallas previas por `sensitive_globs: []` y formato inconsistentes
- Decisión: `data.yaml` **desactivado temporalmente** hasta validar esquema

## 2. Esquema propuesto (JSON Schema – conceptual)

```yaml
thresholds:
  max_files_deleted: int>=0   # default 25
  max_lines_deleted: int>=0   # default 5000
sensitive_globs:
  - "rag/**"
  - ".github/workflows/**"
  - "ops/**"
  - "core/**"
forbidden_apis:
  - "child_process"
  - "execSync("
  - "spawnSync("
  - "eval("
  - "dangerouslySetInnerHTML"
```

## 3. Validación previa (pipeline)

* Paso "validate-data-yaml" antes de invocar OPA
* Si falla validación ⇒ **no** pasar `-d data.yaml`, log "fallback a defaults"

## 4. Matriz de regresión al reintroducir

* Sensible path con/ sin `critical` (ALLOW/DENY)
* Mass deletion con/ sin `rollback` (ALLOW/DENY)
* `data.yaml` ausente ⇒ defaults
* `data.yaml` inválido ⇒ fallback + warning

---

**Estado**: 📄 **ESPECIFICACIÓN COMPLETA**  
**Responsable**: @fegome90-cmd  
**Próxima acción**: Implementar validación en Fase 1
