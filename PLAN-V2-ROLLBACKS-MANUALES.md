# 🛩️ Plan v2 - Rollbacks Manuales y Hardening de Proceso

**Fecha**: 2025-10-04  
**Basado en**: Hallazgo LÍNEA 1 - Sistema autofix NO es causal  
**Enfoque**: Rollbacks manuales + hardening de proceso humano

## 🎯 Claves del Nuevo Modelo de Riesgo

### **Riesgo Dominante Identificado**:
- **Acciones manuales** (rollbacks no ritualizados) → regresiones masivas
- **Autofix**: Inocente en este incidente
- **Causa raíz probable**: Brechas de proceso (nomenclatura, ownership, gates no obligatorios)

### **3 Decisiones Inmediatas**:
1. **Deshabilitar bypass de admins** en `main` y activar **Merge Queue**
2. **Etiquetas reservadas**: `rollback`, `critical`, `security-hotfix` solo para mantenedores
3. **Firma de commits** obligatoria (GPG/SSH/Sigstore) en `main` y `release/*`

---

## 🔍 LÍNEA 2: Reconstruir Timeline (Rollbacks Manuales)

### **Objetivo**: Probar si hubo "evento gatillante" o deriva lenta

### **Comandos de Investigación**:
```bash
# 1) Datación por rama + merge-base con main
for b in origin/autofix/test-rollback-safety origin/fix-pack-v1-correcciones-criticas; do
  echo "== $b =="
  git log --reverse --pretty='%ad %h %s' $b | head -1
  git log -1 --pretty='ULT:%ad %h %s' $b
  mb=$(git merge-base $b origin/main)
  git show --quiet --pretty='MB:%ad %h %s' $mb
done

# 2) Commits con deleción por autor (para ubicar "quién" y "cuándo")
for b in origin/autofix/test-rollback-safety origin/fix-pack-v1-correcciones-criticas; do
  git log --no-merges --pretty='%h|%an|%ae|%ad|%s' $b | while IFS='|' read sha an ae ad s; do
    dels=$(git diff --name-status ${sha}~1 ${sha} | awk '$1=="D"{c++} END{print c+0}')
    [ "$dels" -gt 0 ] && echo "$ad|$an|$ae|$sha|$dels|$s"
  done
done | sort > .reports/forensics/manual-deletions.csv
```

### **Salida Esperada**: `manual-deletions.csv` con fecha/autor/commit/deleciones

---

## 🛡️ LÍNEA 3: "Silencio de Alarmas" (CI/Protections)

### **Objetivo**: Evidenciar huecos de CI/Protections aplicables a cambios manuales

### **Checklist de Verificación**:
- ¿`verify` y `policy-scan` son **required** en `main` y `release/*`?
- ¿Existen **rulesets**/branch-protection que impidan merge con checks pendientes?
- ¿Algún PR con **verify=skipped/cancelled** llegó a merge?
- ¿Hay "Update branch"/"Rebase" que cambien el SHA luego del último `verify`?

### **Comandos GH CLI**:
```bash
# Required checks activos
gh api repos/:owner/:repo/branches/main/protection | jq '.required_status_checks'

# Runs por PR (detectar skipped/cancelled)
for n in $(gh pr list --state merged --limit 100 --json number -q '.[].number'); do
  gh run list --pr $n --json name,status,conclusion,headSha | jq -c --arg pr "$n" '.[] + {pr:$pr}'
done > .reports/ci/pr-runs.json
```

### **Resultado Esperado**: Tabla de huecos (ej: `release/*` sin gates, merges tras rebase sin re-verificación)

---

## 👥 LÍNEA 4: Móvil Organizacional (5 Whys + Evidencias)

### **Objetivo**: Entender **por qué** hubo rollbacks manuales destructivos

### **Mini-entrevista (15-20 min)**:
1. ¿Qué urgencia/situación motivó el rollback?
2. ¿Existía playbook de revert/hotfix? ¿Se conocía?
3. ¿Se percibía que CI tardaba/bloqueaba en exceso?
4. ¿Quién aprobó el riesgo? ¿Cómo se documentó?
5. ¿Qué harías diferente con un ritual obligatorio?

### **Salida**: `ROOT-CAUSE-ORG.md` con hipótesis validadas y acciones preventivas

---

## 🚨 HARDENING v2 (Centrado en lo Manual)

### **A) Guard de Rollback Manual (Action)**
Bloquea PRs con **borrado masivo** o que toquen paths sensibles **sin ritual**

### **B) Plantilla de PR con Ritual de Rollback**
Template con sección obligatoria para rollbacks

### **C) CODEOWNERS Afinado**
```
/rag/**                    @equipo-rag @lead-ml
/ops/**                    @sre-lead
/.github/workflows/**      @sre-lead @lead-backend
```

### **D) Reglas de Repositorio (GitHub Rulesets)**
- **Require signed commits** en `main`, `release/*`
- **Block force-push** y **bypass**
- **Require status checks**: `verify`, `policy-scan`, `manual-rollback-guard`
- **Restrict deletion of branches** y **protected tags**

---

## 📊 Métricas Actualizadas (Para lo Manual)

- **PR con verify ejecutado** (≥99%)
- **PR con label `rollback`** (conteo, deben seguir ritual)
- **Deleciones p95/p99** por PR (tendencia descendente)
- **Tiempo a revert** real (detección→merge revert)
- **% de commits firmados** en `main`/`release/*` (objetivo 100%)

---

## 🎯 Acciones Inmediatas (Secuencial y Corto)

1. ✅ Activar **Merge Queue** y quitar **admin bypass** en `main`
2. ✅ Subir `manual-rollback-guard.yml` como **required check**
3. ✅ Actualizar `pull_request_template.md` y `CODEOWNERS`
4. ✅ Habilitar **commit signing obligatorio**
5. ✅ Correr comandos de L2 y L3 para llenar `.reports/forensics/` y `.reports/ci/`
6. ✅ Agendar 2-3 **entrevistas L4** y crear `ROOT-CAUSE-ORG.md`

---

**Estado**: Plan v2 implementado, iniciando L2  
**Próximo**: Ejecutar comandos de timeline de rollbacks manuales
