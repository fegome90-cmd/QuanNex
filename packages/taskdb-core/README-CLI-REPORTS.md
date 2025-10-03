# QuanNex TaskDB CLI - Reportes Blindados

**Plan Maestro TaskDB - OLA 2: Antifrágil**

CLI para gestión de reportes con blindajes de seguridad, integridad y operatividad conectado al ProvenanceVerifier Hardened.

## 🚀 Instalación y Uso

### Instalación Rápida

```bash
# Hacer ejecutable el CLI
chmod +x packages/taskdb-core/qn

# Crear alias para uso global (opcional)
alias qn="node /ruta/al/proyecto/packages/taskdb-core/cli-reports.mjs"
```

### Uso Básico

```bash
# Validar un reporte
./packages/taskdb-core/qn report:validate path/to/report.json

# Publicar un reporte validado
./packages/taskdb-core/qn report:publish path/to/report.json

# Retractar un reporte publicado
./packages/taskdb-core/qn report:retract REPORT-123 --reason "Error en datos"
```

## 📋 Comandos Disponibles

### `qn report:validate <archivo>`

Valida la procedencia de un reporte usando el ProvenanceVerifier Hardened.

**Opciones:**

- `--json, -j`: Salida en formato JSON
- `--verbose, -v`: Salida detallada con contexto
- `--policy, -p`: Versión de política a usar (default: 1.0.0)
- `--strict, -s`: Modo estricto (falla en warnings)

**Ejemplos:**

```bash
# Validación básica
qn report:validate reports/mi-reporte.json

# Validación con salida JSON para CI/CD
qn report:validate reports/mi-reporte.json --json

# Validación estricta (falla en warnings)
qn report:validate reports/mi-reporte.json --strict

# Validación con detalles completos
qn report:validate reports/mi-reporte.json --verbose
```

**Blindajes Validados:**

- 🔒 **Seguridad**: Timestamp validation, ventana de validez, formato ISO8601
- 🔍 **Integridad**: Estructura, tipos de datos, campos requeridos
- ⚙️ **Operatividad**: Límites de recursos, claims detallados
- 📊 **Claims**: Verificación contra estado derivado histórico

### `qn report:publish <archivo>`

Publica un reporte validado marcándolo como oficial.

**Opciones:**

- `--force, -f`: Forzar publicación sin validación previa
- `--dry-run, -d`: Simular publicación sin cambios
- `--json, -j`: Salida en formato JSON

**Ejemplos:**

```bash
# Publicación normal (con validación)
qn report:publish reports/mi-reporte.json

# Publicación forzada (sin validación)
qn report:publish reports/mi-reporte.json --force

# Simulación de publicación
qn report:publish reports/mi-reporte.json --dry-run

# Publicación con salida JSON
qn report:publish reports/mi-reporte.json --json
```

**Proceso de Publicación:**

1. ✅ Validación con ProvenanceVerifier Hardened
2. 📦 Creación de artifact con hash SHA256
3. 📄 Registro en TaskDB como reporte publicado
4. 🔒 Verificación de integridad del archivo

### `qn report:retract <id>`

Retracta un reporte publicado y opcionalmente crea una tarea de corrección.

**Opciones:**

- `--reason, -r`: Razón de la retractación (requerido)
- `--create-task, -t`: Crear tarea de corrección automática (default: true)
- `--json, -j`: Salida en formato JSON

**Ejemplos:**

```bash
# Retractación con razón
qn report:retract REPORT-123 --reason "Error en datos de entrada"

# Retractación sin tarea de corrección
qn report:retract REPORT-123 --reason "Duplicado" --no-create-task

# Retractación con salida JSON
qn report:retract REPORT-123 --reason "Inconsistencia" --json
```

**Proceso de Retractación:**

1. 🔍 Verificación de que el reporte existe y está publicado
2. 🔄 Actualización del estado a "retracted"
3. 📝 Registro de la razón y timestamp
4. 📋 Creación automática de tarea de corrección
5. 📊 Logging del evento en TaskDB

## 🔧 Integración con CI/CD

### Pre-commit Hook

Crear `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Validar reportes antes de commit
find . -name "*.json" -path "*/reports/*" -exec ./packages/taskdb-core/qn report:validate {} \; || exit 1
echo "✅ Todos los reportes validados correctamente"
```

### GitHub Actions

```yaml
name: Validate Reports
on: [push, pull_request]

jobs:
  validate-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Validate Reports
        run: |
          find . -name "*.json" -path "*/reports/*" | while read file; do
            echo "Validating $file"
            node packages/taskdb-core/cli-reports.mjs report:validate "$file" --json
          done
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Validate Reports') {
            steps {
                sh '''
                    find . -name "*.json" -path "*/reports/*" | while read file; do
                        echo "Validating $file"
                        node packages/taskdb-core/cli-reports.mjs report:validate "$file" --json
                    done
                '''
            }
        }
        stage('Publish Reports') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    find . -name "*.json" -path "*/reports/*" | while read file; do
                        echo "Publishing $file"
                        node packages/taskdb-core/cli-reports.mjs report:publish "$file" --json
                    done
                '''
            }
        }
    }
}
```

## 🛡️ Blindajes de Seguridad

### Configuración

El CLI usa la configuración de `taskdb-hardened.yaml`:

```yaml
provenance_verifier:
  snapshot_validity_window_days: 7
  resource_limits:
    max_task_ids_per_report: 1000
    max_run_ids_per_report: 1000
    max_artifact_hashes_per_report: 500
    max_claims_per_report: 100
  security:
    reject_future_timestamps: true
    reject_invalid_iso8601: true
    require_evidence_for_claims: true
```

### Blindajes Implementados

1. **🔒 Seguridad de Timestamp**
   - Rechaza timestamps del futuro
   - Rechaza timestamps muy viejos (>7 días)
   - Valida formato ISO8601

2. **🔍 Integridad de Estructura**
   - Campos requeridos OLA 2
   - Tipos de datos correctos
   - Arrays válidos

3. **⚙️ Operatividad y Recursos**
   - Límites de arrays (1000 tasks, 1000 runs, 500 artifacts)
   - Límites de claims (100 por reporte)
   - Timeouts configurables

4. **📊 Claims Detallados**
   - Errores con contexto específico
   - Verificación contra estado histórico
   - Evidencia requerida para claims

## 📊 Formato de Salida

### Modo Normal

```
🔍 Validando reporte: reports/mi-reporte.json

📊 RESULTADO DE VALIDACIÓN
Estado: ✅ PASS
Timestamp: 2025-10-03T21:30:00.000Z

🔒 BLINDAJES DE SEGURIDAD:
  ✅ timestamp_security: Timestamp security validation passed

🔍 BLINDAJES DE INTEGRIDAD:
  ✅ required_field: Required field present: task_ids

⚙️  BLINDAJES DE OPERATIVIDAD:
  ✅ resource_limit: Resource limit OK for task_ids

✅ Validación exitosa
```

### Modo JSON

```json
{
  "status": "pass",
  "timestamp": "2025-10-03T21:30:00.000Z",
  "security_checks": [
    {
      "check": "timestamp_security",
      "status": "pass",
      "message": "Timestamp security validation passed"
    }
  ],
  "integrity_checks": [...],
  "operability_checks": [...]
}
```

## 🚨 Códigos de Salida

- `0`: Éxito (validación pass, publicación exitosa, retractación exitosa)
- `1`: Error (validación fail, error de publicación, error de retractación)

## 🔧 Troubleshooting

### Error: "Archivo no encontrado"

```bash
# Verificar que el archivo existe
ls -la path/to/report.json

# Usar ruta absoluta si es necesario
qn report:validate /ruta/absoluta/report.json
```

### Error: "Validación fallida"

```bash
# Usar modo verbose para más detalles
qn report:validate report.json --verbose

# Usar modo JSON para análisis programático
qn report:validate report.json --json | jq '.errors'
```

### Error: "Reporte no encontrado" (retract)

```bash
# Listar reportes disponibles
# (Implementar comando qn report:list si es necesario)
```

## 📚 Ejemplos Completos

### Flujo Completo de Validación y Publicación

```bash
# 1. Validar reporte
qn report:validate reports/ola2-progress.json --verbose

# 2. Si la validación pasa, publicar
qn report:publish reports/ola2-progress.json

# 3. Si hay problemas, retractar
qn report:retract REPORT-123 --reason "Error en datos"
```

### Integración con Scripts

```bash
#!/bin/bash
# Script para validar y publicar múltiples reportes

REPORTS_DIR="reports"
VALIDATION_FAILED=false

for report in "$REPORTS_DIR"/*.json; do
    echo "Validating $report"
    if ! qn report:validate "$report" --json; then
        echo "❌ Validation failed for $report"
        VALIDATION_FAILED=true
    else
        echo "✅ Validation passed for $report"
    fi
done

if [ "$VALIDATION_FAILED" = true ]; then
    echo "❌ Some reports failed validation"
    exit 1
else
    echo "✅ All reports validated successfully"
fi
```

## 🎯 Próximos Pasos

1. **Comando `qn report:list`** - Listar reportes disponibles
2. **Comando `qn report:history`** - Historial de cambios
3. **Comando `qn report:diff`** - Comparar versiones
4. **Integración con Cursor** - Plugin para IDE
5. **Métricas Prometheus** - Exposición de métricas

---

**QuanNex TaskDB CLI - Plan Maestro OLA 2: Antifrágil**  
_Blindajes de seguridad, integridad y operatividad para reportes de producción_
