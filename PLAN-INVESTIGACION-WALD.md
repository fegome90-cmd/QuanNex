# 🛩️ Plan de Investigación Mejorado (Abraham Wald)

**Fecha**: 2025-10-04  
**Metodología**: Análisis de supervivencia (qué NO fue atacado)  
**Objetivo**: Identificar agente causal, cadena de eventos y fallas del sistema inmune

## 🎯 Objetivos de Investigación

1. **Agente causal real** de las ramas-bomba (autofix u otro)
2. **Cadena de eventos** (timeline) y correlatos en CI/operación
3. **Por qué falló el sistema inmune** (defensas existen pero no se aplican)
4. **Remediación estructural**: controles técnicos + de proceso

---

## 🔍 LÍNEA 1 — Identificar al Agente Causal (autofix) y su "modus operandi"

### 1.1 Análisis de autoría y firmas

**Objetivo**: Extraer commits con patrón autofix y calcular huella de deleciones masivas

**Comandos de Forense**:
```bash
# Lista de ramas sospechosas
branches=("autofix/test-rollback-safety" "fix-pack-v1-correcciones-criticas" "ops/enterprise-metrics" "fix/rollback-emergency")

# Crear directorio de forense
mkdir -p .reports/forensics

# Extraer commits autofix por rama
for b in "${branches[@]}"; do
  echo "== $b =="
  git log --pretty='%h|%an|%ae|%ad|%s' origin/$b | grep -i 'autofix' > .reports/forensics/${b//\//_}.autofix.log
done

# Huella de deleciones por commit autofix
for b in "${branches[@]}"; do
  while IFS='|' read -r sha an ae ad subj; do
    dels=$(git diff --name-status ${sha}~1 ${sha} | awk '$1=="D"{c++} END{print c+0}')
    echo "$ad|$sha|$an|$ae|$dels" >> .reports/forensics/${b//\//_}.autofix.deletions.csv
  done < .reports/forensics/${b//\//_}.autofix.log
done
```

**Criterio de Aceptación CA-1**: Autoría identificada, huella de deleciones documentada, clasificación de rutas afectadas

### 1.2 Arqueología de código (origen del autofix)

**Objetivo**: Ubicar introducción original del autofix y su propósito declarado

**Comandos**:
```bash
# Buscar archivos/dir sospechosos
git log --all -- "**/autofix*" "ops/**" "scripts/**" ".github/workflows/**" | head -n 200

# Detección del primer commit que introdujo autofix
git log --diff-filter=A --follow --format='%h %ad %an %s' -- ops/autofix.js | tail -n 1
```

**Criterio de Aceptación CA-2**: Commit/PR "genesis" localizado, propósito y alcance inicial resumidos

### 1.3 Revisión de PRs y permisos efectivos

**Objetivo**: Revisar PRs que tocaron autofix y inventariar permisos

**Criterio de Aceptación CA-3**: Lista de PRs con responsables, permisos vigentes, autofix read-only

---

## ⏰ LÍNEA 2 — Reconstruir la Línea de Tiempo

### 2.1 Datación y distancia a main

**Objetivo**: Marcar fechas de creación y calcular merge-base vs main

**Comandos**:
```bash
for b in "${branches[@]}"; do
  echo "== $b =="
  echo "Creación (aprox):"
  git log --reverse --pretty='%ad %h %s' origin/$b | head -n 1
  echo "Último commit:"
  git log -1 --pretty='%ad %h %s' origin/$b
  echo "Merge-base con main:"
  git merge-base origin/$b origin/main | xargs -I{} git show --quiet --pretty='%ad %h %s' {}
done
```

**Criterio de Aceptación CA-4**: Timeline por rama + merge-base fechada vs main y hitos

### 2.2 Correlación con fallos/incidentes de CI/CD

**Objetivo**: Cruzar fechas con fallos de CI y despliegues

**Criterio de Aceptación CA-5**: Matriz "rama ↔ eventos CI/ops" con correlaciones claras

---

## 🛡️ LÍNEA 3 — "Silencio de las alarmas": Sistema Inmune

### 3.1 Auditoría de CI (triggers, required checks, bypass)

**Objetivo**: Listar workflows, confirmar required checks, detectar skips

**Preguntas guía**:
- ¿CI corre en toda branch o solo en PR hacia main?
- ¿Existen condiciones `if:` que omiten verify?
- ¿Algún admin pudo mergear con checks fallando?

**Criterio de Aceptación CA-6**: Tabla "Workflow ↔ Evento ↔ Ramas cubiertas ↔ Required/Optional"

### 3.2 Políticas de seguridad como hard gate

**Objetivo**: Verificar si policy-scan es bloqueante

**Criterio de Aceptación CA-7**: policy-scan y verify en required checks, backlog de remediación

---

## 👥 LÍNEA 4 — Móvil y Condiciones Organizacionales

**Objetivo**: Entender el por qué humano/operativo

**Acciones**:
- Entrevistas cortas (15-20 min) a responsables clave
- Cuestionario estándar: propósito, prisa, entendimiento de riesgos
- Contratos de cambio: ¿existe DoD común?

**Criterio de Aceptación CA-8**: Resumen de hipótesis organizacionales validadas

---

## 🚨 CONTENCIÓN Y REMEDIACIÓN (Paralelo)

### C1. Kill-switch y mínimo privilegio

- `AUTOFIX_ENABLED=false` en repo
- Revocar `repo:write` de apps/tokens no esenciales

**CA-C1**: Ningún job autofix puede escribir sin elevar AUTOFIX_ENABLED

### C2. Gating real (PR-first + required checks)

- `verify` y `policy-scan` como required en main y release/*
- destructive-guard y sensitive-paths

**CA-C2**: Ningún PR mergeable sin 4 checks, deleciones masivas requieren ritual

### C3. Convenciones y playbooks

- Convención de ramas: feature/, fix/, docs/, chore/, hotfix/
- Playbooks: AUTOFIX.md, ROLLBACK.md, SECURITY-POLICY.md

**CA-C3**: Playbooks versionados y referenciados en PR template

---

## 📦 ARTEFACTOS A PRODUCIR (48h)

1. **Informe Forense Base**: autoría autofix, huella de deleciones, timeline
2. **Matriz CI**: coverage real, qué corre, dónde, required checks
3. **Mapa de Automatizaciones**: quién llama a autofix, permisos, diagramas
4. **Backlog de Remediación**: 28 violaciones → issues con dueño/fecha
5. **Playbooks + CODEOWNERS + PR template** actualizados
6. **Evidencia de Canarios**: 3-5 pruebas de resiliencia

---

## 📊 MÉTRICAS DE ÉXITO

- **Cobertura de CI real**: % PR con verify ejecutado (≥ 99%)
- **PR bloqueados por guard** (semanal) y **deleciones p95/p99**
- **Tiempo a revert** (detección → revert en main)
- **Incidentes autofix**: nº ejecuciones, ratio dry-run vs apply
- **Violaciones de política abiertas** (tendencia a cero en ≤10 días)

---

## 📅 CRONOGRAMA & RACI

| Día | Entrega clave | Dueño |
|-----|---------------|-------|
| 0 | Kill-switch autofix, protections, required checks | SRE Lead |
| 0-1 | Autoría/huella autofix, merge-base, timeline | Forensics |
| 1 | Matriz CI + huecos (required vs ejecutado) | SRE Lead |
| 1-2 | Mapa de automatizaciones + permisos revocados | DevOps |
| 2 | Playbooks + CODEOWNERS + PR template | Lead BE |
| 2-4 | Backlog 28 violaciones (issues) | Tech Leads |
| 3-4 | Canarios y Evidencia de Resiliencia | SRE Lead |
| 5 | Informe ejecutivo y plan de cierre | PM/Arq |

---

**Estado**: Plan implementado, iniciando LÍNEA 1  
**Próximo**: Ejecutar comandos de forense para identificar agente causal
