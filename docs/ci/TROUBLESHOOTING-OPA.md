# 🔧 Troubleshooting OPA - Guía Rápida

**Fecha**: 2025-10-04  
**Propósito**: Solución rápida a problemas comunes con OPA Endurecido Plus

## 🚨 Problemas Comunes y Soluciones

### **1. "No hay `jq`/`tar`/`sha256sum`" en el runner**

**Síntoma**: Error de comando no encontrado durante la instalación de OPA

**Solución**:
```yaml
- name: Install dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y jq coreutils tar
```

**Prevención**: Los runners de GitHub Actions ya incluyen estas herramientas, pero si falla, añadir este paso antes de la instalación de OPA.

---

### **2. OPA Download Timeout**

**Síntoma**: Timeout al descargar OPA desde GitHub releases

**Solución**:
- ✅ **Ya implementado**: Retries con backoff exponencial (3 intentos)
- ✅ **Plan B**: Usar contenedor oficial (`ghcr.io/openpolicyagent/opa:0.58.0`)
- ✅ **Plan C**: Fallback bash puro (siempre funciona)

**Comando de verificación**:
```bash
# Verificar conectividad
curl -I https://github.com/open-policy-agent/opa/releases/latest/download/opa_linux_amd64_v0.58.0.tar.gz
```

---

### **3. Violaciones Vacías pero Debería Fallar**

**Síntoma**: El PR debería ser bloqueado pero pasa sin violaciones

**Diagnóstico**:
```bash
# Verificar input.json
cat input.json | jq '.'

# Verificar diff.txt
cat diff.txt

# Verificar base/head
echo "Base: ${{ github.event.pull_request.base.sha }}"
echo "Head: ${{ github.event.pull_request.head.sha }}"
```

**Soluciones**:
1. **PR draft sin cambios**: Validar que `base`/`head` sean diferentes
2. **Usar `${{ github.sha }}` como fallback**:
   ```yaml
   base="${{ github.event.pull_request.base.sha || github.sha }}"
   head="${{ github.event.pull_request.head.sha || github.sha }}"
   ```

---

### **4. Labels No Detectadas**

**Síntoma**: Labels no se detectan en forks o repos privados

**Solución**: Consultar labels vía API
```yaml
- name: Get labels via API
  uses: actions/github-script@v7
  id: labels
  with:
    script: |
      const { data } = await github.rest.issues.listLabelsOnIssue({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number
      });
      return data.map(x => x.name);

- name: Update input with API labels
  run: |
    jq -nc --argjson labels "$(echo '${{ steps.labels.outputs.result }}')" \
      --argjson input "$(cat input.json)" \
      '.input + {labels: $labels}' > input-with-labels.json
```

---

### **5. Data YAML No Encontrada**

**Síntoma**: Warning "data.yaml no encontrada (usando defaults)"

**Solución**:
```bash
# Generar data.yaml
./scripts/generate-opa-data.sh

# Verificar que existe
ls -la policies/data.yaml
```

**Prevención**: Ejecutar `generate-opa-data.sh` en el workflow antes de evaluar OPA.

---

### **6. Cache de OPA No Funciona**

**Síntoma**: OPA se descarga cada vez aunque esté en cache

**Diagnóstico**:
```yaml
- name: Debug cache
  run: |
    echo "Cache key: opa-bin-${{ runner.os }}-0.58.0"
    echo "Cache path: /usr/local/bin/opa"
    ls -la /usr/local/bin/opa || echo "OPA not in cache"
```

**Solución**: Verificar que la key del cache sea única y consistente.

---

### **7. Contenedor OPA No Inicia**

**Síntoma**: Error al ejecutar contenedor de OPA

**Diagnóstico**:
```bash
# Verificar que Docker funciona
docker run --rm hello-world

# Verificar imagen OPA
docker pull ghcr.io/openpolicyagent/opa:0.58.0
```

**Solución**: Usar Plan C (bash puro) como fallback.

---

### **8. Políticas Rego No Evalúan**

**Síntoma**: OPA no encuentra violaciones cuando debería

**Diagnóstico**:
```bash
# Verificar sintaxis Rego
opa check policies/pr_security.rego

# Evaluar manualmente
opa eval --format=pretty -i input.json -d policies/ 'data.pr.deny'
```

**Solución**: Verificar sintaxis y lógica de las políticas.

---

## 🧪 Comandos de Diagnóstico

### **Verificación Completa del Sistema**
```bash
# Smoke test completo
./scripts/smoke-test-opa.sh

# Health check del sistema
./scripts/health-check.sh

# Generar data YAML
./scripts/generate-opa-data.sh
```

### **Verificación de OPA Local**
```bash
# Instalar OPA localmente
curl -L -o opa https://github.com/open-policy-agent/opa/releases/download/v0.58.0/opa_linux_amd64
chmod +x opa
sudo mv opa /usr/local/bin/

# Verificar instalación
opa version

# Evaluar políticas
opa eval --format=json -i input.json -d policies/ 'data.pr.deny'
```

### **Verificación de Contenedor**
```bash
# Probar contenedor OPA
docker run --rm -v "$PWD":/work -w /work ghcr.io/openpolicyagent/opa:0.58.0 \
  eval --format=json -i input.json -d policies/ 'data.pr.deny'
```

---

## 📊 Logs y Debugging

### **Habilitar Debug en Workflows**
```yaml
- name: Debug OPA
  run: |
    echo "Input JSON:"
    cat input.json | jq '.'
    echo "Data YAML:"
    cat policies/data.yaml || echo "No data.yaml"
    echo "OPA Version:"
    opa version
```

### **Logs Útiles**
- **GitHub Actions**: Revisar logs del workflow completo
- **OPA**: Usar `--format=pretty` para output legible
- **Bash**: Usar `set -x` para debug de scripts

---

## 🎯 Escalación de Problemas

### **Nivel 1: Verificación Básica**
1. Ejecutar smoke test local
2. Verificar permisos del workflow
3. Revisar logs de GitHub Actions

### **Nivel 2: Diagnóstico Avanzado**
1. Probar cada plan por separado (A/B/C)
2. Verificar conectividad de red
3. Revisar configuración de cache

### **Nivel 3: Fallback a Plan C**
1. Desactivar Plan A y B
2. Activar Plan C (bash puro)
3. Verificar que funciona

### **Nivel 4: Escalación**
1. Revisar documentación de OPA
2. Consultar con el equipo
3. Crear issue en el repositorio

---

## ✅ Checklist de Verificación

- [ ] **Smoke test local** pasa
- [ ] **Permisos** configurados correctamente
- [ ] **Acciones pinedas** (sin @main)
- [ ] **Input.json** se genera correctamente
- [ ] **Data.yaml** existe y es válido
- [ ] **Comentarios automáticos** funcionan
- [ ] **Timeouts** configurados (3-5 min)
- [ ] **Concurrency** activado

---

**Estado**: ✅ **TROUBLESHOOTING COMPLETO**  
**Responsable**: @fegome90-cmd  
**Última actualización**: 2025-10-04
