# 📁 Evidencias CI - Estructura y Convención

**Fecha**: 2025-10-04  
**Propósito**: Estructura persistente para evidencias de CI que sobreviven al ciclo de vida del CI

## 📂 Estructura de Carpetas

```
docs/evidencias/ci/
├── 2025-10-XX_main-verify/
│   ├── run-id.txt               # ID/URL
│   ├── resumen.md               # extracto + contexto
│   └── captura.png              # screenshot del check en verde
├── 2025-10-XX_canary-rename-ok/
│   ├── run-id.txt
│   ├── resumen.md
│   └── captura.png
├── 2025-10-XX_canary-mass-delete-deny/
│   ├── run-id.txt
│   ├── resumen.md
│   └── captura.png
└── 2025-10-XX_canary-sensitive-path-deny/
    ├── run-id.txt
    ├── resumen.md
    └── captura.png
```

## 📋 Plantilla resumen.md

```markdown
# Evidencia CI – <Caso>
- Fecha: YYYY-MM-DD
- Run URL: <https://…>
- Commit SHA: <sha>
- Plan OPA en uso: <A|B|C>
- Resultado: ✅ OK / ❌ DENY (esperado)
- Extracto del log (≤25 líneas):

<pega aquí las últimas ~20 líneas útiles del job>
```

## 🔗 Enlace desde EVIDENCIAS-OPA.md

Añadir filas que apunten a la carpeta persistente además del Run ID:

| Caso | Run ID | Carpeta Persistente |
|------|--------|---------------------|
| Main verificado | <URL> | `docs/evidencias/ci/2025-10-XX_main-verify/` |
| Canary rename OK | <URL> | `docs/evidencias/ci/2025-10-XX_canary-rename-ok/` |
| Canary mass-delete DENY | <URL> | `docs/evidencias/ci/2025-10-XX_canary-mass-delete-deny/` |
| Canary sensitive-path DENY | <URL> | `docs/evidencias/ci/2025-10-XX_canary-sensitive-path-deny/` |

## 💾 Almacenamiento Duradero Externo

Si prefieres almacenamiento duradero externo, documenta el bucket y pega el URL firmado o público del snapshot (además del Run ID).

---

**Estado**: 📁 **ESTRUCTURA LISTA**  
**Uso**: Crear carpetas con evidencias post-freeze
