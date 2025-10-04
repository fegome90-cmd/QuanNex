# 🚀 Configuración CI/CD para Sistema RAG

## 📋 Checklist de Configuración

### 1. Environment `rag-maintenance` (Aprobación Manual)

En GitHub, crear el environment `rag-maintenance`:

1. **Ir a**: `Settings` → `Environments` → `New environment`
2. **Nombre**: `rag-maintenance`
3. **Configurar**:
   - ✅ **Required reviewers**: 2 personas (arquitectura + conocimiento)
   - ✅ **Wait timer**: 5 minutos
   - ✅ **Prevent self-review**: Activado

### 2. Secrets Requeridos

#### Secrets del Repository (Settings → Secrets and variables → Actions)

```bash
# Credenciales de réplica/snapshot (NUNCA producción)
RAG_READ_HOST=replica-postgres.internal
RAG_READ_PORT=5432
RAG_READ_USER=rag_read
RAG_READ_PASSWORD=secure_read_only_password
RAG_READ_DB=ragdb

# API Keys para evaluación
OPENAI_API_KEY=sk-your-openai-key-here
COHERE_API_KEY=your-cohere-key-here  # si usas reranking

# Token de GitHub (automático)
GITHUB_TOKEN=ghs_...  # Se configura automáticamente
```

### 3. Protección de Ramas

#### Configuración de `main` y `develop`:

```yaml
# En Settings → Branches → Add rule
Branch name pattern: main, develop

Protection rules:
✅ Require a pull request before merging
  - Required number of reviewers: 2
  - Dismiss stale reviews: ✅
  - Require review from code owners: ✅
  - Restrict pushes that create files: ✅

✅ Require status checks to pass before merging
  - Require branches to be up to date: ✅
  - Status checks required:
    - "validate_context"
    - "rag_eval_smoke"
    - "prp_lock_update"

✅ Require conversation resolution before merging: ✅
✅ Require signed commits: ✅
✅ Require linear history: ✅
✅ Restrict pushes that create files: ✅
```

### 4. CODEOWNERS

Crear `.github/CODEOWNERS`:

```bash
# RAG System - Requiere revisión de arquitectura
/rag/ @team-architecture @team-knowledge
/scripts/gates/ @team-architecture
/prp/ @team-architecture @team-knowledge
/docs/adr/ @team-architecture

# CI/CD - Requiere revisión de DevOps
/.github/workflows/ @team-devops @team-architecture

# Configuración crítica
/config/ @team-architecture
/schema/ @team-architecture @team-dba
```

---

## 🔧 Configuración Adicional

### Variables de Entorno del Repository

```bash
# En Settings → Secrets and variables → Actions → Variables
NODE_VERSION=20.x
PY_VERSION=3.11
RAG_PURGE_THRESHOLD=20
TELEMETRY_LEVEL=lite
```

### Configuración de Notificaciones

#### Slack/Teams Integration:

1. **Webhook URL** en repository secrets:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
   ```

2. **Notificar en**:
   - ❌ Fallos de validación de contexto
   - ❌ Fallos de umbrales RAGAS
   - ⚠️ Cambios en PRP.lock (strict pins)
   - ✅ Operaciones de mantenimiento completadas

---

## 🧪 Testing del Workflow

### 1. Test Manual

```bash
# Activar workflow manualmente
gh workflow run rag-ci.yml

# Ver logs
gh run list --workflow=rag-ci.yml
gh run view <run-id>
```

### 2. Test de Validación

```bash
# Test local de validación de contexto
PGREAD_HOST=localhost \
PGREAD_USER=rag_read \
PGREAD_PASSWORD=rag_read_only \
PGREAD_DB=ragdb \
node scripts/gates/context-validate.mjs

# Test local de umbrales RAGAS
node scripts/gates/ragas-threshold-check.mjs
```

### 3. Test de PRP.lock Update

```bash
# Test local de actualización
PGREAD_HOST=localhost \
PGREAD_USER=rag \
PGREAD_PASSWORD=ragpass \
PGREAD_DB=ragdb \
node scripts/prp/prp-lock-update.mjs
```

---

## 📊 Monitoreo y Alertas

### Métricas Clave

1. **Tiempo de CI**: < 10 minutos por pipeline
2. **Tasa de éxito**: > 95% de runs exitosos
3. **Umbrales RAGAS**: Cumplimiento > 90%
4. **Context drift**: 0% en pins strict

### Alertas Configuradas

```yaml
# En repository settings → Notifications
Alertas críticas:
- ❌ Fallo en validate_context
- ❌ Fallo en rag_eval_smoke
- ⚠️ Mismatch en PRP.lock strict pins
- ⚠️ Umbral de purga excedido
```

---

## 🔄 Flujo de Trabajo

### Desarrollo Normal

1. **Push a feature branch** → Solo setup y validación básica
2. **PR a main/develop** → Full pipeline con gates
3. **Merge** → Auto-actualización de PRP.lock (relaxed/ttl)

### Mantenimiento

1. **Manual trigger** → `workflow_dispatch`
2. **Dry-run first** → `reindex_dry_run`
3. **Aprobación manual** → Environment `rag-maintenance`
4. **Ejecución real** → `reindex_force` con auditoría

### Emergencias

1. **Rollback rápido** → Soft-delete reversible
2. **Auditoría completa** → Tabla `rag_purge_audit`
3. **Notificación inmediata** → Slack/Teams

---

## ✅ Checklist de Go-Live

- [ ] Environment `rag-maintenance` creado con aprobación manual
- [ ] Todos los secrets configurados
- [ ] Protección de ramas activada
- [ ] CODEOWNERS configurado
- [ ] Notificaciones configuradas
- [ ] Test manual ejecutado exitosamente
- [ ] Documentación actualizada
- [ ] Equipo entrenado en el flujo

---

*Configuración CI/CD - Sistema RAG v1.0*
*Última actualización: $(date)*
