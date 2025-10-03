# Canary Success Criteria & Rollback Plan

## 🎯 Criterios de Éxito (7 días de canario)

### Métricas Principales
- **AutoFix Success Rate**: ≥ 70% en casos objetivo
- **Playbook Match Rate**: ≥ 90% (3 canarios: React/Express/FastAPI o monorepo mixto)
- **Verify Performance**: p95 ≤ 30s, error-rate ≤ 1%
- **Policy Compliance**: 0 incidentes "policy-bypass" (validado por SARIF y policy-gate)

### Métricas Secundarias
- **Artifact Generation**: 100% de runs generan artefactos válidos
- **Gate Pass Rate**: ≥ 95% de gates pasan sin intervención manual
- **Rollback Success**: 100% de rollbacks completan en < 5 minutos
- **Dashboard Availability**: 99.9% uptime del dashboard de métricas

## 🚨 Criterios de Fallo

Si **cualquiera** de estos criterios se viola:

### AutoFix Success Rate < 70%
- **Acción**: Pausa AutoFix V2 (desactiva `AUTOFIX_V2=0`)
- **Mantiene**: AutoFix V1 funcionando
- **Issue**: Abre issue con artefactos (`autofix-*.json`, SARIF, logs)

### Playbook Match Rate < 90%
- **Acción**: Revisar señales en `config/profiles.yaml`
- **Issue**: Abre issue con análisis de detección incorrecta
- **Temporal**: Usar playbook `fallback` hasta corrección

### Verify p95 > 30s o error-rate > 1%
- **Acción**: Pausa canary hasta optimización
- **Issue**: Abre issue con análisis de performance
- **Rollback**: Revertir a configuración anterior

### Policy Bypass > 0
- **Acción**: **INMEDIATO** - Pausa todo AutoFix
- **Issue**: Abre issue de seguridad con máxima prioridad
- **Review**: Revisión completa de políticas y excepciones

## 🔄 Plan de Rollback Inmediato

### Si un autofix aplicado rompe verificación:

```bash
# 1. Obtener hash base del artefacto
BASE_HASH=$(jq -r '.start_commit' artifacts/autofix/latest.json)

# 2. Rollback completo
git fetch --all
git reset --hard $BASE_HASH
git clean -fd

# 3. Verificar estado limpio
npm ci && npm run verify
```

### Si el rollback falla:

```bash
# 1. Forzar rollback a tag estable
git fetch --all
git reset --hard v1.0.0  # o último tag estable
git clean -fd

# 2. Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# 3. Verificar
npm run verify
```

## 📊 Monitoreo Continuo

### Alertas Críticas (5 minutos)
- AutoFix success rate < 50%
- Policy violations > 0
- Verify duration p95 > 60s

### Alertas de Advertencia (15 minutos)
- AutoFix success rate < 70%
- Playbook mismatch rate > 10%
- Verify error rate > 1%

### Alertas Informativas (1 hora)
- Dashboard unavailable
- Artifact generation failed
- Gate failure rate > 5%

## 🧪 Smoke Test Diario

```bash
# Ejecutar cada mañana
npm run gate:dirty
npm run workflow:adaptive
npm run verify || node scripts/autofix.mjs '{"actions":[{"type":"install_missing_dep","name":"supertest","dev":true}],"dryRun":true}'
```

Si el dry-run se ve bien → apply en rama `autofix/<ticket>` y `npm run verify`.

## 📋 Runbook de Incidentes

### 1. Detección
- Monitoreo automático detecta violación de criterios
- Alerta enviada a equipo de platform
- Issue creado automáticamente con artefactos

### 2. Análisis
- Revisar artefactos de AutoFix (`autofix-*.json`)
- Revisar SARIF de policy violations
- Revisar logs de CI/CD
- Identificar causa raíz

### 3. Corrección
- Implementar fix según causa raíz
- Probar en ambiente de desarrollo
- Aplicar fix en producción
- Verificar métricas mejoradas

### 4. Verificación
- Confirmar criterios de éxito restaurados
- Ejecutar smoke test completo
- Monitorear por 24 horas
- Cerrar issue con resumen

## 🔧 Comandos de Emergencia

### Pausar AutoFix V2
```bash
# En CI/CD
export AUTOFIX_V2=0

# En código
sed -i 's/AUTOFIX_V2=1/AUTOFIX_V2=0/g' .github/workflows/canary-nightly.yml
```

### Forzar Rollback
```bash
# Rollback a commit específico
git reset --hard <commit-hash>
git push --force-with-lease origin main

# Rollback a tag
git reset --hard v1.0.0
git push --force-with-lease origin main
```

### Limpiar Estado
```bash
# Limpiar worktrees
git worktree prune
rm -rf .worktrees/

# Limpiar artefactos
rm -rf artifacts/autofix/
mkdir -p artifacts/autofix/

# Limpiar ramas autofix
git branch | grep autofix/ | xargs git branch -D
```

## 📈 Métricas de Éxito a Largo Plazo

### Semana 1-2: Estabilización
- AutoFix success rate: 60-70%
- Playbook match rate: 85-90%
- Verify p95: 20-30s

### Semana 3-4: Optimización
- AutoFix success rate: 70-80%
- Playbook match rate: 90-95%
- Verify p95: 15-25s

### Mes 2+: Producción
- AutoFix success rate: 80-90%
- Playbook match rate: 95-98%
- Verify p95: 10-20s

## 🎉 Criterios de Promoción a Producción

- **7 días consecutivos** cumpliendo todos los criterios
- **0 incidentes de seguridad** en el período
- **Aprobación del equipo de platform**
- **Documentación completa** de runbooks
- **Training del equipo** en operación y troubleshooting
