# 🛡️ Branch Protection Setup - Configuración Manual

**Fecha**: 2025-10-04  
**Estado**: ⚠️ **REQUIERE GITHUB PRO** (Repositorio privado)  
**Alternativa**: Configuración manual documentada

## 🚨 Limitación Actual

**Error**: `Upgrade to GitHub Pro or make this repository public to enable this feature`

**Causa**: Repositorio privado sin GitHub Pro  
**Solución**: Configuración manual + documentación

## 🎯 Configuración Requerida

### **1. Branch Protection Rules (Main)**

**Configuración Ideal**:
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI - Security Hardened",
      "manual-rollback-guard", 
      "Security Audit (PR-fast)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": {
    "users": [],
    "teams": []
  }
}
```

### **2. Required Status Checks**

**Checks Obligatorios**:
- ✅ **`CI - Security Hardened`**: Verificación de seguridad
- ✅ **`manual-rollback-guard`**: Detección de rollbacks masivos
- ✅ **`Security Audit (PR-fast)`**: Escaneo de políticas

### **3. Pull Request Reviews**

**Configuración**:
- **Required approving reviews**: 2
- **Dismiss stale reviews**: true
- **Require code owner reviews**: true
- **Restrict pushes**: true

### **4. Commit Signing**

**Configuración**:
```json
{
  "required_signatures": {
    "enabled": true
  }
}
```

### **5. Merge Queue**

**Configuración**:
```json
{
  "branch_pattern": "main",
  "merge_method": "SQUASH"
}
```

## 🔧 Implementación Manual

### **Paso 1: Activar GitHub Pro**
```bash
# Opción 1: Upgrade a GitHub Pro
# Visitar: https://github.com/settings/billing

# Opción 2: Hacer repositorio público
# Settings → General → Danger Zone → Change repository visibility
```

### **Paso 2: Configurar Branch Protection**
```bash
# Una vez con GitHub Pro, ejecutar:
gh api -X PUT repos/fegome90-cmd/startkit/branches/main/protection \
  -f required_status_checks.strict=true \
  -f 'required_status_checks.contexts[]=CI - Security Hardened' \
  -f 'required_status_checks.contexts[]=manual-rollback-guard' \
  -f 'required_status_checks.contexts[]=Security Audit (PR-fast)' \
  -f enforce_admins=true \
  -f required_pull_request_reviews.required_approving_review_count=2
```

### **Paso 3: Activar Commit Signing**
```bash
gh api -X PUT repos/fegome90-cmd/startkit/branches/main/protection \
  -f required_signatures.enabled=true
```

### **Paso 4: Configurar Merge Queue**
```bash
gh api -X POST repos/fegome90-cmd/startkit/merge-queue/rulesets \
  -f branch_pattern='main' \
  -f merge_method='SQUASH'
```

## 🛡️ Protecciones Alternativas (Sin GitHub Pro)

### **1. Workflow Guards**
- ✅ **`manual-rollback-guard.yml`**: Implementado y funcional
- ✅ **Detecta rollbacks masivos**: >25 archivos eliminados
- ✅ **Bloquea paths sensibles**: `rag/`, `ops/`, `.github/workflows/`

### **2. CODEOWNERS**
- ✅ **Propietarios por área**: Configurado
- ✅ **Rutas sensibles**: Requieren aprobación especializada
- ✅ **Fallback**: `@fegome90-cmd` para todo lo demás

### **3. PR Template**
- ✅ **Ritual de rollback**: Obligatorio para cambios destructivos
- ✅ **Checklist de seguridad**: Verificaciones requeridas
- ✅ **Evidencia de testing**: Comandos obligatorios

### **4. Script Forense**
- ✅ **Análisis de cambios**: Distingue `R*` vs `D`
- ✅ **Clasificación de riesgo**: Automática
- ✅ **Reporte detallado**: CSV + resumen

## 📊 Estado Actual de Protecciones

### **✅ Implementadas y Funcionales**:
- **Guard de rollback**: Detecta y bloquea rollbacks masivos
- **Script forense**: Analiza cambios y clasifica riesgo
- **PR template**: Rituales y verificaciones obligatorias
- **CODEOWNERS**: Aprobaciones por área especializada

### **⚠️ Requieren GitHub Pro**:
- **Branch Protection Rules**: Configuración automática
- **Required Status Checks**: Checks obligatorios
- **Commit Signing**: Firmas requeridas
- **Merge Queue**: Cola de merge automática

### **🔄 Alternativas Activas**:
- **Workflow guards**: Protección a nivel de workflow
- **Manual reviews**: Proceso de revisión documentado
- **Template enforcement**: Rituales obligatorios
- **Forensic analysis**: Análisis automático de cambios

## 🎯 Recomendaciones

### **Corto Plazo**:
1. **Mantener protecciones actuales**: Workflow guards + CODEOWNERS
2. **Documentar proceso manual**: Para reviews y aprobaciones
3. **Monitorear efectividad**: Métricas de bloqueos y detecciones

### **Mediano Plazo**:
1. **Evaluar GitHub Pro**: Costo vs beneficio
2. **Considerar repositorio público**: Si es viable
3. **Implementar protecciones nativas**: Una vez disponible

### **Largo Plazo**:
1. **Automatización completa**: Branch protection + merge queue
2. **Integración con CI/CD**: Protecciones end-to-end
3. **Monitoreo avanzado**: Alertas y métricas automatizadas

## 🚀 Próximos Pasos

### **Inmediatos**:
1. **Validar protecciones actuales**: Ejecutar canarios
2. **Documentar proceso manual**: Para el equipo
3. **Monitorear efectividad**: Métricas semanales

### **Cuando se Active GitHub Pro**:
1. **Configurar Branch Protection**: Con comandos documentados
2. **Activar Commit Signing**: Para ramas críticas
3. **Implementar Merge Queue**: Para evitar carreras

---
**Estado**: ⚠️ **PROTECCIONES ALTERNATIVAS ACTIVAS**  
**Requerimiento**: GitHub Pro para protecciones nativas  
**Alternativa**: Workflow guards + CODEOWNERS + proceso manual
