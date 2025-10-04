# 🏢 BAU Runbook - Operación Normal

**Fecha**: 2025-10-04  
**Propósito**: Runbook para operación normal del sistema inmune  
**Estado**: ✅ **OPERATIVO**

## 🚦 Semáforo de Salida a BAU

### **✅ 3 Checks Finales Requeridos**

1. **🧪 Canarios 1–7** ejecutados y en verde
   - IDs pegados en `.reports/ci/CANARIOS.md`
   - Todos los tests pasan según expectativas

2. **🔒 Meta-guard SHA-lock** operativo
   - Comprobado que falla con `head.sha` cambiado
   - Previene rebase/update branch sin re-verificación

3. **📸 Policy snapshot** creado y agendado
   - Snapshot inicial ejecutado
   - Programado para ejecución semanal
   - Diffs fáciles de auditar

**Si los tres están OK: 🟢 LUZ VERDE A BAU**

---

## 📅 Runbook Semanal (Operación Normal)

### **🔵 Lunes - Validación y Monitoreo**

#### **Canarios (Rápido)**
```bash
# Ejecutar validación de protecciones
./scripts/canarios.sh

# Actualizar reporte con resultados
# Editar .reports/ci/CANARIOS.md con Run IDs
```

#### **Policy Snapshot**
```bash
# Capturar configuración actual
./scripts/policy-snapshot.sh

# Revisar diffs de la semana anterior
# Comparar con snapshot anterior si existe
```

**📋 Checklist Lunes**:
- [ ] Canarios ejecutados (7/7)
- [ ] Policy snapshot generado
- [ ] Diffs revisados
- [ ] Alertas investigadas

---

### **🟡 Miércoles - Auditoría y Seguridad**

#### **Auditoría de Labels**
```bash
# Revisar uso de etiquetas críticas
./scripts/monitor-labels.sh

# Verificar que no hay banalización
# Revisar .reports/ci/labels-usage.md
```

#### **Auditoría de Credenciales**
```bash
# Revisar runners, PATs, secrets
./scripts/audit-runners-pats.sh

# Revocar credenciales inactivas >30 días
# Revisar .reports/security/creds-review.md
```

**📋 Checklist Miércoles**:
- [ ] Labels críticas auditadas
- [ ] Credenciales revisadas
- [ ] Hallazgos documentados
- [ ] Acciones correctivas implementadas

---

### **🟢 Viernes - Métricas y Ajustes**

#### **Exportar Métricas**
```bash
# Generar métricas de la semana
# Crear metrics-week-XX.csv con:
# - p95/p99 de D reales por PR
# - % verify-prod ejecutado
# - % commits firmados
# - PR bloqueados por guard
# - MTTR revert
```

#### **Revisión de Umbrales**
```bash
# Revisar config/sensitive-paths.yaml
# Ajustar si hubo falsos positivos/negativos
# Documentar cambios en EXCEPTIONS-LOG.md
```

**📋 Checklist Viernes**:
- [ ] Métricas exportadas
- [ ] Umbrales revisados
- [ ] Tendencias analizadas
- [ ] Ajustes documentados

---

## 🧯 "Romper el Vidrio" (Excepciones Controladas)

### **Proceso de Excepción**

1. **Documentar en `docs/EXCEPTIONS-LOG.md`**:
   - Motivo de la excepción
   - Riesgo e impacto
   - Aprobadores
   - Evidencia
   - Fecha de expiración

2. **Usar Modo Emergencia**:
   ```yaml
   # config/sensitive-paths.yaml
   emergency:
     enabled: true
     expiration: "2025-10-11T00:00:00Z"
     reason: "Hotfix crítico de seguridad"
     approved_by: "@sre-lead"
   ```

3. **Monitorear Expiración**:
   - El meta-guard debe volver a bloquear al expirar
   - Revisar que no se colen umbrales viejos

### **Template de Excepción**
```markdown
## Excepción #YYYY-MM-DD-HHMM
- **Motivo**: [Descripción clara]
- **Riesgo**: Alto/Medio/Bajo
- **Qué se saltó**: [Check, política, proceso]
- **Aprobadores**: @owner1 @owner2
- **Evidencia**: [Links a runs/PRs/logs]
- **Contramedida a futuro**: [Qué cambiaremos]
- **Fecha de cierre**: YYYY-MM-DD
```

---

## 🎯 Extras Recomendados (Nivel Top)

### **1️⃣ OPA/Rego para PR (Política como Código)**

#### **Implementación**
```rego
package pr.security

default allow = true

# Definir paths sensibles
sensitive_path(p) { startswith(p, "rag/") }
sensitive_path(p) { startswith(p, "core/") }
sensitive_path(p) { startswith(p, "ops/") }
sensitive_path(p) { startswith(p, ".github/workflows/") }

# Bloquear si toca paths sensibles sin label critical
deny[msg] {
  some i
  sensitive_path(input.changed_files[i])
  not input.labels[_] == "critical"
  msg := "Tocar rutas sensibles requiere label 'critical' + CODEOWNERS"
}

# Bloquear si hay demasiadas deleciones sin label rollback
deny[msg] {
  input.deletions > 25
  not input.labels[_] == "rollback"
  msg := "Deleciones masivas requieren label 'rollback' + CODEOWNERS"
}
```

#### **Workflows de Validación (Endurecido Plus)**

**Plan A: OPA Pinned con Checksum + Retries (Recomendado)**
```yaml
# .github/workflows/opa-policy-check-v2.yml
# - Versión específica (0.58.0) con checksum
# - Cache de binario por versión
# - Retries con backoff exponencial
# - Comentarios automáticos en PR
```

**Plan B: Contenedor Oficial (Sin Instalar)**
```yaml
# .github/workflows/opa-policy-check-container.yml
# - ghcr.io/openpolicyagent/opa:0.58.0
# - Sin problemas de red/SSL
# - Siempre funciona
```

**Plan C: Fallback Bash Puro**
```yaml
# .github/workflows/simple-policy-check.yml
# - No requiere OPA
# - Lee config/sensitive-paths.yaml
# - Siempre funciona
```

**Características del Endurecido Plus**:
- ✅ **Integridad de binarios**: Checksum + retry con backoff
- ✅ **Cache por versión**: Menos latencia, menos fallos
- ✅ **Entrada estandarizada**: `input.json` común para todos los planes
- ✅ **Comentarios automáticos**: Violaciones posteadas en PR
- ✅ **Sincronización YAML**: `generate-opa-data.sh` para mantener consistencia

---

### **2️⃣ OpenSSF Scorecard (Semanal)**

#### **Workflow de Scorecard**
```yaml
name: openssf-scorecard
on:
  schedule: [{cron: "0 6 * * 1"}]  # Lunes 06:00
  workflow_dispatch:
jobs:
  scorecard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run OpenSSF Scorecard
        uses: ossf/scorecard-action@v2.3.1
        with:
          results_file: results.sarif
          results_format: sarif
          publish_results: true
      
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
      
      - name: Check Scorecard Score
        run: |
          # Verificar que el score sea ≥7/10
          SCORE=$(jq -r '.score' results.sarif)
          if [ "$SCORE" -lt 7 ]; then
            echo "::error::Scorecard score $SCORE < 7/10"
            exit 1
          fi
          echo "✅ Scorecard score: $SCORE/10"
```

#### **Objetivos de Scorecard**
- **Score mínimo**: ≥7/10
- **Frecuencia**: Semanal (lunes)
- **Acción**: Bloquear si score <7
- **Mejora**: Plan de acción si score baja

---

### **3️⃣ Firma de Artefactos (Cosign, Keyless)**

#### **Configuración de Cosign**
```bash
# Instalar Cosign
curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

#### **Firma de Artefactos**
```bash
# Firmar artefacto (ejemplo: build)
cosign sign-blob --yes ./dist/app.tgz > ./dist/app.tgz.sig

# Verificar firma
cosign verify-blob --signature ./dist/app.tgz.sig ./dist/app.tgz
```

#### **Integración en Pipeline**
```yaml
name: sign-artifacts
on: [release]
jobs:
  sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
      
      - name: Sign Artifacts
        run: |
          # Firmar todos los artefactos
          for file in dist/*.tgz; do
            cosign sign-blob --yes "$file" > "$file.sig"
          done
      
      - name: Upload Signed Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: signed-artifacts
          path: dist/*.sig
```

---

## 🧪 Health-Check Express (Lunes a Primera Hora)

### **Métricas Críticas**
```bash
# Verificar métricas clave
echo "=== HEALTH CHECK EXPRESS ==="
echo "Fecha: $(date)"

# 1. % PR con verify-prod ≥ 99%
echo "✅ % PR con verify-prod: [PENDIENTE - calcular]"

# 2. p95/p99 D reales por PR estables
echo "✅ p95/p99 D reales: [PENDIENTE - calcular]"

# 3. PR bloqueados por guard ↓ semana a semana
echo "✅ PR bloqueados: [PENDIENTE - calcular]"

# 4. % commits firmados en main/release/* = 100%
echo "✅ % commits firmados: [PENDIENTE - calcular]"

# 5. 0 excepciones activas vencidas
echo "✅ Excepciones vencidas: [PENDIENTE - verificar]"
```

### **Script de Health-Check**
```bash
#!/bin/bash
# scripts/health-check.sh

echo "🏥 Health Check Express - $(date)"
echo "================================"

# Verificar kill-switch
if [ -f "ops/flags/AUTOFIX_ENABLED" ]; then
    AUTOFIX_STATUS=$(cat ops/flags/AUTOFIX_ENABLED)
    if [ "$AUTOFIX_STATUS" = "false" ]; then
        echo "✅ Kill-switch: ACTIVO"
    else
        echo "❌ Kill-switch: INACTIVO"
    fi
else
    echo "❌ Kill-switch: NO ENCONTRADO"
fi

# Verificar workflows críticos
CRITICAL_WORKFLOWS=("manual-rollback-guard.yml" "policy-scan.yml" "checks-all-green.yml")
for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo "✅ $workflow: PRESENTE"
    else
        echo "❌ $workflow: FALTANTE"
    fi
done

# Verificar configuración
if [ -f "config/sensitive-paths.yaml" ]; then
    echo "✅ sensitive-paths.yaml: PRESENTE"
else
    echo "❌ sensitive-paths.yaml: FALTANTE"
fi

echo "🏥 Health check completado"
```

---

## 📊 Trazabilidad y Auditoría

### **Estructura de Reportes**
```
.reports/
├── ci/
│   ├── CANARIOS.md
│   ├── labels-usage.md
│   └── metrics-week-*.csv
├── security/
│   ├── creds-review-*.md
│   └── apis-prohibidas-*.txt
├── policy-snapshots/
│   └── snapshot-policy-*.md
└── forensics/
    └── [archivos de incidentes]
```

### **Retención de Datos**
- **Reportes semanales**: 12 semanas
- **Snapshots de política**: 4 semanas
- **Auditorías de seguridad**: 26 semanas
- **Forense de incidentes**: 52 semanas

---

## 🎯 Criterios de Éxito

### **Sistema Inmune Saludable**
- ✅ **Frenos inteligentes**: No castiga trabajo legítimo
- ✅ **Bloquea destrucción real**: Por diseño
- ✅ **Trazabilidad completa**: Políticas y credenciales
- ✅ **Métricas continuas**: Para mantenerse sano
- ✅ **Respuesta rápida**: A cambios inesperados

### **Equipo Operativo**
- ✅ **Runbook claro**: Procesos documentados
- ✅ **Herramientas automatizadas**: Scripts listos
- ✅ **Métricas visibles**: Dashboards y reportes
- ✅ **Excepciones controladas**: Proceso documentado

### **Organización Resiliente**
- ✅ **Prevención proactiva**: Canarios y snapshots
- ✅ **Detección temprana**: Alertas y monitoreo
- ✅ **Respuesta rápida**: Procedimientos claros
- ✅ **Mejora continua**: Métricas y ajustes

---

## 🚀 Próximos Pasos

### **Inmediatos (Esta Semana)**
1. **Ejecutar canarios**: Validar protecciones
2. **Health-check**: Verificar estado del sistema
3. **Entrenar equipo**: Explicar runbook semanal

### **Corto Plazo (Próximas 2 Semanas)**
1. **Implementar OPA**: Política como código
2. **Configurar Scorecard**: OpenSSF semanal
3. **Integrar Cosign**: Firma de artefactos

### **Mediano Plazo (Próximo Mes)**
1. **Automatizar métricas**: Dashboards
2. **Mejorar alertas**: Notificaciones proactivas
3. **Expandir cobertura**: A más repositorios

---

## 📞 Contactos y Escalación

### **Responsables**
- **Mantenedor Principal**: @fegome90-cmd
- **SRE Lead**: @sre-lead
- **Backend Lead**: @lead-backend
- **QA Lead**: @qa-lead

### **Escalación**
1. **Nivel 1**: Revisar runbook y scripts
2. **Nivel 2**: Consultar con mantenedor principal
3. **Nivel 3**: Escalar a SRE lead
4. **Crítico**: Activar procedimiento de incidente

---

**Estado**: ✅ **BAU OPERATIVO**  
**Responsable**: @fegome90-cmd  
**Próxima revisión**: 2025-10-11
