# 📄 Especificación Data.yaml - Plan de Reintroducción

**Fecha**: 2025-10-04  
**Propósito**: Especificación para reintroducir data.yaml con validación completa

## 🚨 Estado Actual

### **Problema Detectado**
- **Formato inconsistente**: `sensitive_globs: []` vacío
- **Merge error**: OPA no puede procesar el YAML generado
- **Validación faltante**: No hay esquema definido

### **Decisión Tomada**
- **Estado**: Desactivado temporalmente en Plan B
- **Razón**: Evitar fallos en CI hasta validación completa
- **Fallback**: Usar valores hardcodeados en Rego

---

## 📋 Esquema Propuesto

### **Estructura Base**
```yaml
# Data YAML para OPA - Esquema validado
version: "1.0"
generated_at: "2025-10-04T15:52:24Z"
source: "config/sensitive-paths.yaml"

# Umbrales de seguridad
thresholds:
  max_files_deleted: 25
  max_lines_deleted: 5000
  sync_with_opa: true

# Rutas sensibles (mínimo 1 item)
sensitive_globs:
  - "rag/**"
  - ".github/workflows/**"
  - "ops/**"
  - "core/**"

# APIs prohibidas
forbidden_apis:
  - "eval("
  - "innerHTML"
  - "document.write"

# Configuración de emergencia
emergency:
  enabled: false
  expiration: "2025-10-11T00:00:00Z"
  reason: "Modo emergencia"
  approved_by: "@fegome90-cmd"
```

### **JSON Schema de Validación**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "thresholds", "sensitive_globs"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+$"
    },
    "generated_at": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "type": "string"
    },
    "thresholds": {
      "type": "object",
      "required": ["max_files_deleted", "max_lines_deleted"],
      "properties": {
        "max_files_deleted": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "max_lines_deleted": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100000
        },
        "sync_with_opa": {
          "type": "boolean"
        }
      }
    },
    "sensitive_globs": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "pattern": "^[^*]+\\*\\*$"
      }
    },
    "forbidden_apis": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "emergency": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean"
        },
        "expiration": {
          "type": "string",
          "format": "date-time"
        },
        "reason": {
          "type": "string"
        },
        "approved_by": {
          "type": "string"
        }
      }
    }
  }
}
```

---

## 🔧 Implementación de Validación

### **Step de Validación Previa**
```yaml
- name: Validate data.yaml schema
  run: |
    set -euo pipefail
    
    # Verificar que data.yaml existe
    if [ ! -f policies/data.yaml ]; then
      echo "⚠️ data.yaml no encontrada, usando defaults"
      exit 0
    fi
    
    # Validar esquema JSON
    if command -v yq &> /dev/null; then
      echo "🔍 Validando esquema de data.yaml..."
      yq eval -o=json policies/data.yaml | jq -f policies/data-schema.json
      echo "✅ data.yaml válido"
    else
      echo "⚠️ yq no disponible, saltando validación"
    fi
```

### **Fallback Automático**
```yaml
- name: Evaluate Rego with data.yaml (if valid)
  run: |
    set -euo pipefail
    
    if [ -f policies/data.yaml ] && [ -f policies/data-validated ]; then
      echo "🔍 Evaluando con data externa..."
      opa eval --format=json -i input.json -d policies/ -d policies/data.yaml 'data.pr.deny' > eval.json
    else
      echo "🔍 Evaluando con defaults..."
      opa eval --format=json -i input.json -d policies/ 'data.pr.deny' > eval.json
    fi
```

---

## 🧪 Testing de Validación

### **Casos de Prueba**

#### **Caso 1: Data.yaml Válido**
```yaml
version: "1.0"
thresholds:
  max_files_deleted: 25
  max_lines_deleted: 5000
sensitive_globs:
  - "rag/**"
  - ".github/workflows/**"
```
**Resultado Esperado**: ✅ Validación exitosa

#### **Caso 2: Data.yaml Inválido (sensitive_globs vacío)**
```yaml
version: "1.0"
thresholds:
  max_files_deleted: 25
  max_lines_deleted: 5000
sensitive_globs: []
```
**Resultado Esperado**: ❌ Error de validación, fallback a defaults

#### **Caso 3: Data.yaml Inválido (thresholds faltantes)**
```yaml
version: "1.0"
sensitive_globs:
  - "rag/**"
```
**Resultado Esperado**: ❌ Error de validación, fallback a defaults

#### **Caso 4: Data.yaml No Existe**
**Resultado Esperado**: ⚠️ Warning, fallback a defaults

---

## 🔄 Plan de Reintroducción

### **Fase 1: Preparación**
- [ ] Crear JSON Schema de validación
- [ ] Implementar step de validación previa
- [ ] Crear casos de prueba
- [ ] Documentar fallback automático

### **Fase 2: Testing**
- [ ] Probar con data.yaml válido
- [ ] Probar con data.yaml inválido
- [ ] Probar sin data.yaml
- [ ] Verificar fallback automático

### **Fase 3: Activación**
- [ ] Activar en Plan A (pinned)
- [ ] Activar en Plan B (container)
- [ ] Mantener Plan C sin data.yaml
- [ ] Monitorear por 1 semana

### **Fase 4: Estabilización**
- [ ] Revisar logs de validación
- [ ] Ajustar esquema si es necesario
- [ ] Documentar lecciones aprendidas
- [ ] Considerar activación en Plan C

---

## 📊 Métricas de Éxito

### **Validación**
- **Tasa de éxito**: >95% de data.yaml válidos
- **Tiempo de validación**: <2 segundos
- **Falsos positivos**: <1% de fallbacks incorrectos

### **Rendimiento**
- **Tiempo de evaluación**: Sin impacto significativo
- **Memoria**: Sin aumento significativo
- **Logs**: Información clara de fallback

---

## 🔧 Herramientas Requeridas

### **Validación**
- **yq**: Para convertir YAML a JSON
- **jq**: Para validar contra JSON Schema
- **opa**: Para evaluación de políticas

### **Testing**
- **Docker**: Para contenedores de prueba
- **GitHub Actions**: Para CI/CD
- **Smoke test**: Para validación local

---

## 📝 Documentación Relacionada

- **VALIDACION-FINAL-OPA.md**: Checklist de validación
- **ESTACIONAMIENTO-SEGURO-OPA.md**: Estado actual
- **CATALOGO-REGLAS-OPA.md**: Reglas implementadas
- **EVIDENCIAS-OPA.md**: Registro de pruebas

---

**Estado**: 📄 **ESPECIFICACIÓN COMPLETA**  
**Responsable**: @fegome90-cmd  
**Próxima acción**: Implementar validación en Fase 1
