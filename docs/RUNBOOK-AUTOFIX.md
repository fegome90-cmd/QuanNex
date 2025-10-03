# QuanNex AutoFix Runbook

## 🚨 Alertas y Respuesta Rápida

### 1. 🔴 Alerta → Abre panel/últimos logs de gates

**Comandos rápidos:**
```bash
# Ver dashboard en tiempo real
npm run dashboard

# Ver logs de gates recientes
npm run gate:policy && npm run gate:diff && npm run gate:dirty

# Ver métricas de AutoFix
curl http://localhost:3000/metrics | grep qn_autofix
```

### 2. Identifica step fallido (policy/diff/metrics/workflow)

**Gates principales:**
- `gate:policy`: APIs prohibidas, riesgo > 3
- `gate:diff`: Cambios fuera de zonas seguras (src/**, config/**, package.json)
- `gate:dirty`: Árbol sucio tras ejecución
- `gate:workflow`: Plan vacío, perfil no detectado

**Diagnóstico:**
```bash
# Verificar estado de cada gate
npm run gate:policy    # Policy violations
npm run gate:diff      # Unauthorized file changes  
npm run gate:dirty     # Dirty working tree
npm run gate:workflow  # Empty plan or profile detection
```

### 3. Reintento 1 (retry workflow) / Reintento 2 (AutoFix dry→apply)

**Reintento 1 - Retry Workflow:**
```bash
# Ejecutar workflow adaptativo completo
npm run workflow:adaptive

# Si falla, verificar perfil detectado
node -e "console.log(require('./src/workflow/route.mjs').routePlaybook())"
```

**Reintento 2 - AutoFix dry→apply:**
```bash
# 1. Proponer fix en dry-run
node scripts/autofix.mjs '{"actions":[{"type":"install_missing_dep","name":"supertest","dev":true}],"dryRun":true}'

# 2. Si el diff se ve bien, aplicar
node scripts/autofix.mjs '{"actions":[{"type":"install_missing_dep","name":"supertest","dev":true}],"dryRun":false,"branch":"autofix/incident-$(date +%s)"}'

# 3. Verificar resultado
npm run verify
```

### 4. Si persiste: issue con etiqueta incident + datos

**Template de issue:**
```markdown
## 🚨 Incident: [Título del problema]

**Componente:** AutoFix/Workflow/Gates
**Severidad:** Warning/Critical
**Tiempo:** [timestamp]

### Datos del incidente:
- **Commit:** [hash]
- **Gate fallido:** [gate:policy/gate:diff/gate:dirty/gate:workflow]
- **Métricas:** [autofix_success_rate, verify_duration_p95, mismatch_rate]
- **Logs:** [últimos logs relevantes]

### Acciones tomadas:
- [ ] Reintento 1 (workflow)
- [ ] Reintento 2 (AutoFix dry→apply)
- [ ] Verificación manual

### Estado:
- [ ] Resuelto
- [ ] En progreso
- [ ] Requiere investigación adicional
```

## 📊 SLOs Q3 Piloto

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| AutoFix Success Rate | ≥70% | [dashboard] | ✅/❌ |
| Playbook Match | ≥90% | [dashboard] | ✅/❌ |
| Verify p95 | ≤30s | [dashboard] | ✅/❌ |
| Error Rate | ≤1% | [dashboard] | ✅/❌ |

## 🔧 Comandos de Diagnóstico

```bash
# Dashboard completo
npm run dashboard

# E2E AutoFix rojo→verde
npm run e2e:simple

# Verificar métricas Prometheus
curl http://localhost:3000/metrics | grep -E "(qn_autofix|qn_playbook|qn_verify)"

# Verificar configuración
cat config/fixes.json
cat config/profiles.yaml
cat config/playbooks.yaml
```

## 📞 Escalación

1. **Nivel 1:** Reintento automático (workflow + AutoFix)
2. **Nivel 2:** Issue con etiqueta `incident` + datos completos
3. **Nivel 3:** Rollback a versión estable + análisis post-mortem
