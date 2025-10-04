# 📌 Imágenes Pinned - Registro de Digests SHA256

**Fecha**: 2025-10-04  
**Propósito**: Registro de imágenes de contenedores pinned por digest SHA256

## 🐳 Imágenes de Contenedores

### **OPA (Open Policy Agent)**

#### **Imagen Actual**
- **Tag**: `openpolicyagent/opa:0.58.0`
- **Digest**: [PENDIENTE - Obtener al levantar freeze]
- **Plataforma**: `linux/amd64`
- **Tamaño**: [PENDIENTE - Obtener al levantar freeze]

#### **Comando para Obtener Digest**
```bash
# Obtener digest SHA256
docker pull openpolicyagent/opa:0.58.0
docker inspect openpolicyagent/opa:0.58.0 | jq -r '.[0].RepoDigests[0]'

# Resultado esperado:
# openpolicyagent/opa@sha256:63186b7f0d95e51cf4c7ee38cae6fd2cf9168020abd09d48104bd87c99f863fe
```

#### **Uso en Workflow**
```yaml
# Antes (tag)
docker run --rm openpolicyagent/opa:0.58.0

# Después (digest)
docker run --rm openpolicyagent/opa@sha256:63186b7f0d95e51cf4c7ee38cae6fd2cf9168020abd09d48104bd87c99f863fe
```

---

## 🔧 GitHub Actions

### **actions/checkout**
- **Versión actual**: `@v4`
- **Digest**: [PENDIENTE - Obtener al levantar freeze]
- **Última actualización**: [PENDIENTE]

### **actions/cache**
- **Versión actual**: `@v4`
- **Digest**: [PENDIENTE - Obtener al levantar freeze]
- **Última actualización**: [PENDIENTE]

### **actions/github-script**
- **Versión actual**: `@v7`
- **Digest**: [PENDIENTE - Obtener al levantar freeze]
- **Última actualización**: [PENDIENTE]

---

## 📋 Comandos de Obtención

### **Para GitHub Actions**
```bash
# Obtener digest de una acción
gh api repos/actions/checkout/actions/runs --jq '.workflow_runs[0].head_sha'

# Obtener digest de una versión específica
gh api repos/actions/checkout/contents/action.yml --jq '.sha'
```

### **Para Contenedores Docker**
```bash
# Obtener digest de imagen
docker pull openpolicyagent/opa:0.58.0
docker inspect openpolicyagent/opa:0.58.0 | jq -r '.[0].RepoDigests[0]'

# Verificar integridad
docker run --rm openpolicyagent/opa@sha256:<digest> version
```

---

## 🔄 Proceso de Actualización

### **1. Verificar Nueva Versión**
```bash
# Verificar última versión disponible
docker pull openpolicyagent/opa:latest
docker inspect openpolicyagent/opa:latest | jq -r '.[0].RepoDigests[0]'
```

### **2. Obtener Digest**
```bash
# Obtener digest de la nueva versión
docker pull openpolicyagent/opa:0.59.0
docker inspect openpolicyagent/opa:0.59.0 | jq -r '.[0].RepoDigests[0]'
```

### **3. Actualizar Workflow**
```yaml
# Actualizar en .github/workflows/opa-policy-check-container.yml
docker run --rm openpolicyagent/opa@sha256:<nuevo-digest>
```

### **4. Validar Funcionamiento**
```bash
# Ejecutar smoke test
./scripts/smoke-test-opa.sh
```

### **5. Documentar Cambio**
- Actualizar este archivo con nuevo digest
- Registrar fecha de actualización
- Documentar motivo del cambio

---

## 📊 Registro de Cambios

| Fecha | Imagen | Versión | Digest | Motivo | Responsable |
|-------|--------|---------|--------|--------|-------------|
| 2025-10-04 | openpolicyagent/opa | 0.58.0 | [PENDIENTE] | Implementación inicial | @fegome90-cmd |

---

## 🛡️ Beneficios de Pinning por Digest

### **Seguridad**
- **Inmutabilidad**: El digest SHA256 no puede cambiar
- **Integridad**: Verificación automática de integridad
- **Auditabilidad**: Trazabilidad completa de versiones

### **Confiabilidad**
- **Reproducibilidad**: Mismos resultados en cualquier entorno
- **Estabilidad**: No hay sorpresas por actualizaciones automáticas
- **Control**: Control total sobre cuándo actualizar

### **Compliance**
- **Regulaciones**: Cumplimiento con políticas de seguridad
- **Auditorías**: Evidencia clara de versiones utilizadas
- **Trazabilidad**: Historial completo de cambios

---

## ⚠️ Consideraciones

### **Mantenimiento**
- **Actualizaciones**: Requiere actualización manual
- **Seguridad**: Necesita monitoreo de vulnerabilidades
- **Compatibilidad**: Verificar compatibilidad antes de actualizar

### **Troubleshooting**
- **Digest no encontrado**: Verificar que la imagen existe
- **Fallos de pull**: Verificar conectividad de red
- **Versiones incompatibles**: Verificar compatibilidad de API

---

## 🔍 Verificación de Integridad

### **Comando de Verificación**
```bash
# Verificar que el digest es correcto
docker run --rm openpolicyagent/opa@sha256:<digest> version

# Verificar que la imagen no ha cambiado
docker inspect openpolicyagent/opa@sha256:<digest> | jq -r '.[0].Created'
```

### **Automatización**
```yaml
# Step de verificación en workflow
- name: Verify image integrity
  run: |
    docker run --rm openpolicyagent/opa@sha256:<digest> version
    echo "✅ Image integrity verified"
```

---

**Estado**: 📌 **REGISTRO DE DIGESTS**  
**Responsable**: @fegome90-cmd  
**Próxima actualización**: Al levantar freeze de Git
