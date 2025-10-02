# Scripts de Validación Automática

## validate-links.sh - Validación de Enlaces y Referencias

```bash
#!/bin/bash
# validate-links.sh - Script de validación automática de enlaces y referencias

set -e

LOG_FILE="validation_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Validación de Enlaces y Referencias ==="
echo "Timestamp: $(date)"
echo "Directorio: $(pwd)"

# Función para validar enlaces internos
validate_internal_links() {
    local file="$1"
    echo "Validando enlaces en: $file"

    # Extraer enlaces markdown internos
    local links=$(grep -o '\[.*\](\.\./.*\.md)' "$file" | sed 's/.*(\.\././g' | sed 's/).*//g')

    for link in $links; do
        if [[ "$link" == docs/* ]]; then
            local full_path="$link"
        else
            local full_path="docs/$link"
        fi

        if [ ! -f "$full_path" ]; then
            echo "❌ Enlace roto en $file: $link"
            return 1
        else
            echo "✅ Enlace válido: $link"
        fi
    done

    return 0
}

# Función para validar referencias a mejoras_agentes/
validate_source_references() {
    local file="$1"
    echo "Validando referencias fuente en: $file"

    # Extraer referencias a mejoras_agentes/
    local refs=$(grep -o 'mejoras_agentes/[^)]*' "$file")

    for ref in $refs; do
        if [ ! -f "$ref" ] && [ ! -d "$ref" ]; then
            echo "❌ Referencia inexistente en $file: $ref"
            return 1
        else
            echo "✅ Referencia válida: $ref"
        fi
    done

    return 0
}

# Función para validar checksums
validate_checksums() {
    echo "Validando checksums SHA-256..."

    if [ ! -f "SHA256SUMS" ]; then
        echo "⚠️ Archivo SHA256SUMS no encontrado, omitiendo validación"
        return 0
    fi

    if sha256sum -c SHA256SUMS 2>/dev/null; then
        echo "✅ Todos los checksums válidos"
        return 0
    else
        echo "❌ Checksums inválidos detectados"
        return 1
    fi
}

# Archivos a validar
FILES_TO_CHECK=(
    "docs/ARCHITECTURE-OVERVIEW.md"
    "docs/COST-BENEFIT-ANALYSIS.md"
    "docs/VALIDATION-EMPRICA.md"
    "docs/REQUIREMENTS-TECHNICAL.md"
    "docs/integration-guides/01-20-lecciones.md"
)

# Validación principal
FAILED_VALIDATIONS=0

echo "Validando enlaces internos..."
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        if ! validate_internal_links "$file"; then
            ((FAILED_VALIDATIONS++))
        fi
        if ! validate_source_references "$file"; then
            ((FAILED_VALIDATIONS++))
        fi
    else
        echo "⚠️ Archivo no encontrado: $file"
    fi
done

echo "Validando checksums..."
if ! validate_checksums; then
    ((FAILED_VALIDATIONS++))
fi

# Reporte final
echo ""
echo "=== Reporte de Validación ==="
if [ $FAILED_VALIDATIONS -eq 0 ]; then
    echo "✅ Todas las validaciones pasaron exitosamente"
    exit 0
else
    echo "❌ $FAILED_VALIDATIONS validaciones fallaron"
    echo "Log completo guardado en: $LOG_FILE"
    exit 1
fi
```

## validate-checksums.sh - Validación de Integridad de Fuentes

```bash
#!/bin/bash
# validate-checksums.sh - Validación de integridad de archivos fuente

set -e

LOG_FILE="checksum_validation_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Validación de Checksums SHA-256 ==="
echo "Timestamp: $(date)"

# Función para calcular checksums
calculate_checksums() {
    echo "Calculando checksums de archivos fuente..."

    find mejoras_agentes/ -type f \( -name "*.md" -o -name "*.txt" \) -exec sha256sum {} \; > checksums_current.sha256

    echo "✅ Checksums calculados y guardados en checksums_current.sha256"
}

# Función para comparar con baseline
compare_checksums() {
    if [ ! -f "checksums_baseline.sha256" ]; then
        echo "⚠️ No se encontró archivo baseline, creando uno nuevo..."
        cp checksums_current.sha256 checksums_baseline.sha256
        echo "✅ Baseline creado: checksums_baseline.sha256"
        return 0
    fi

    echo "Comparando con baseline..."

    if sha256sum -c checksums_baseline.sha256 > checksum_comparison.log 2>&1; then
        echo "✅ Todos los archivos coinciden con baseline"
        return 0
    else
        echo "❌ Se detectaron cambios en archivos fuente:"
        cat checksum_comparison.log
        return 1
    fi
}

# Función para actualizar baseline
update_baseline() {
    echo "Actualizando baseline de checksums..."
    cp checksums_current.sha256 checksums_baseline.sha256
    echo "✅ Baseline actualizado"
}

# Argumentos del script
UPDATE_BASELINE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --update-baseline)
            UPDATE_BASELINE=true
            shift
            ;;
        *)
            echo "Uso: $0 [--update-baseline]"
            exit 1
            ;;
    esac
done

# Ejecución principal
calculate_checksums

if [ "$UPDATE_BASELINE" = true ]; then
    update_baseline
    exit 0
fi

if compare_checksums; then
    echo "✅ Validación de integridad completada exitosamente"
    exit 0
else
    echo "❌ Validación de integridad falló"
    echo "Log completo guardado en: $LOG_FILE"
    exit 1
fi
```

## validate-structure.sh - Validación de Estructura Documental

```bash
#!/bin/bash
# validate-structure.sh - Validación de estructura documental modular

set -e

LOG_FILE="structure_validation_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Validación de Estructura Documental ==="
echo "Timestamp: $(date)"

# Función para validar estructura de directorios
validate_directory_structure() {
    echo "Validando estructura de directorios..."

    local required_dirs=(
        "docs"
        "docs/integration-guides"
        "docs/validation-scripts"
        "mejoras_agentes"
        "mejoras_agentes/google_engineer_book"
    )

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            echo "❌ Directorio faltante: $dir"
            return 1
        else
            echo "✅ Directorio presente: $dir"
        fi
    done

    return 0
}

# Función para validar archivos requeridos
validate_required_files() {
    echo "Validando archivos requeridos..."

    local required_files=(
        "docs/ARCHITECTURE-OVERVIEW.md"
        "docs/COST-BENEFIT-ANALYSIS.md"
        "docs/VALIDATION-EMPRICA.md"
        "docs/REQUIREMENTS-TECHNICAL.md"
        "docs/integration-guides/01-20-lecciones.md"
        "CHANGELOG.md"
        "mejoras_agentes/README_OPTIMIZADO_fast.md"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "❌ Archivo faltante: $file"
            return 1
        else
            echo "✅ Archivo presente: $file"
        fi
    done

    return 0
}

# Función para validar referencias cruzadas
validate_cross_references() {
    echo "Validando referencias cruzadas..."

    local files=(
        "docs/ARCHITECTURE-OVERVIEW.md"
        "docs/COST-BENEFIT-ANALYSIS.md"
        "docs/VALIDATION-EMPRICA.md"
        "docs/REQUIREMENTS-TECHNICAL.md"
    )

    for file in "${files[@]}"; do
        # Verificar que cada documento referencia a los otros
        local basename=$(basename "$file" .md)

        if ! grep -q "ARCHITECTURE-OVERVIEW.md" "$file" && [ "$basename" != "ARCHITECTURE-OVERVIEW" ]; then
            echo "⚠️ $file no referencia a ARCHITECTURE-OVERVIEW.md"
        fi

        if ! grep -q "COST-BENEFIT-ANALYSIS.md" "$file" && [ "$basename" != "COST-BENEFIT-ANALYSIS" ]; then
            echo "⚠️ $file no referencia a COST-BENEFIT-ANALYSIS.md"
        fi

        if ! grep -q "VALIDATION-EMPRICA.md" "$file" && [ "$basename" != "VALIDATION-EMPRICA" ]; then
            echo "⚠️ $file no referencia a VALIDATION-EMPRICA.md"
        fi

        if ! grep -q "REQUIREMENTS-TECHNICAL.md" "$file" && [ "$basename" != "REQUIREMENTS-TECHNICAL" ]; then
            echo "⚠️ $file no referencia a REQUIREMENTS-TECHNICAL.md"
        fi
    done

    return 0
}

# Función para validar navegación
validate_navigation() {
    echo "Validando navegación y enlaces..."

    # Verificar que el documento principal tenga índice
    if ! grep -q "## Índice de Contenido" "docs/ARCHITECTURE-OVERVIEW.md"; then
        echo "⚠️ ARCHITECTURE-OVERVIEW.md no tiene índice de contenido"
    fi

    # Verificar navegación en documentos modulares
    local modular_docs=(
        "docs/COST-BENEFIT-ANALYSIS.md"
        "docs/VALIDATION-EMPRICA.md"
        "docs/REQUIREMENTS-TECHNICAL.md"
    )

    for doc in "${modular_docs[@]}"; do
        if ! grep -q "Referencias Cruzadas" "$doc"; then
            echo "⚠️ $doc no tiene sección de referencias cruzadas"
        fi
    done

    return 0
}

# Ejecución principal
FAILED_CHECKS=0

if ! validate_directory_structure; then
    ((FAILED_CHECKS++))
fi

if ! validate_required_files; then
    ((FAILED_CHECKS++))
fi

validate_cross_references
validate_navigation

# Reporte final
echo ""
echo "=== Reporte de Validación Estructural ==="
if [ $FAILED_CHECKS -eq 0 ]; then
    echo "✅ Estructura documental válida"
    exit 0
else
    echo "❌ $FAILED_CHECKS checks fallaron"
    echo "Log completo guardado en: $LOG_FILE"
    exit 1
fi
```

## automated-validation.sh - Suite Completa de Validación

```bash
#!/bin/bash
# automated-validation.sh - Suite completa de validación automática

set -e

LOG_FILE="automated_validation_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Suite Completa de Validación Automática ==="
echo "Timestamp: $(date)"
echo "Suite: Enlaces + Checksums + Estructura"

# Función para ejecutar validación con timeout
run_validation() {
    local script_name="$1"
    local timeout_seconds=300  # 5 minutos timeout

    echo "Ejecutando: $script_name"

    if timeout $timeout_seconds bash "$script_name"; then
        echo "✅ $script_name completado exitosamente"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo "❌ $script_name timeout después de ${timeout_seconds}s"
        else
            echo "❌ $script_name falló con código $exit_code"
        fi
        return 1
    fi
}

# Scripts de validación a ejecutar
VALIDATION_SCRIPTS=(
    "docs/validation-scripts/validate-links.sh"
    "docs/validation-scripts/validate-checksums.sh"
    "docs/validation-scripts/validate-structure.sh"
)

# Ejecución de validaciones
TOTAL_SCRIPTS=${#VALIDATION_SCRIPTS[@]}
PASSED_SCRIPTS=0
FAILED_SCRIPTS=0

for script in "${VALIDATION_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if run_validation "$script"; then
            ((PASSED_SCRIPTS++))
        else
            ((FAILED_SCRIPTS++))
        fi
    else
        echo "⚠️ Script no encontrado: $script"
        ((FAILED_SCRIPTS++))
    fi
done

# Reporte final
echo ""
echo "=== Reporte de Suite de Validación ==="
echo "Scripts totales: $TOTAL_SCRIPTS"
echo "Scripts pasados: $PASSED_SCRIPTS"
echo "Scripts fallados: $FAILED_SCRIPTS"

if [ $FAILED_SCRIPTS -eq 0 ]; then
    echo "✅ Suite completa pasada exitosamente"
    echo "🎉 Todos los sistemas validados correctamente"

    # Generar reporte de éxito
    cat > validation_report.json << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "success",
    "total_scripts": $TOTAL_SCRIPTS,
    "passed_scripts": $PASSED_SCRIPTS,
    "failed_scripts": $FAILED_SCRIPTS,
    "log_file": "$LOG_FILE"
}
EOF

    exit 0
else
    echo "❌ Suite falló: $FAILED_SCRIPTS scripts con errores"
    echo "📋 Revisar log completo: $LOG_FILE"

    # Generar reporte de fallo
    cat > validation_report.json << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "failed",
    "total_scripts": $TOTAL_SCRIPTS,
    "passed_scripts": $PASSED_SCRIPTS,
    "failed_scripts": $FAILED_SCRIPTS,
    "log_file": "$LOG_FILE",
    "error": "Validation suite failed"
}
EOF

    exit 1
fi
```

## Instalación y Uso

### Requisitos
- **Bash**: Shell compatible con POSIX
- **sha256sum**: Para validación de checksums
- **find**: Para búsqueda de archivos
- **grep**: Para procesamiento de texto

### Instalación
```bash
# Crear directorio de scripts
mkdir -p docs/validation-scripts

# Copiar scripts desde este documento
# (Los scripts están incluidos como bloques de código arriba)

# Hacer ejecutables
chmod +x docs/validation-scripts/*.sh
```

### Uso Básico
```bash
# Validación completa
./docs/validation-scripts/automated-validation.sh

# Validación individual
./docs/validation-scripts/validate-links.sh
./docs/validation-scripts/validate-checksums.sh
./docs/validation-scripts/validate-structure.sh
```

### Opciones Avanzadas
```bash
# Actualizar baseline de checksums
./docs/validation-scripts/validate-checksums.sh --update-baseline

# Validación con timeout personalizado
timeout 600 ./docs/validation-scripts/automated-validation.sh
```

### Integración CI/CD
```yaml
# .github/workflows/validation.yml
name: Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run validation suite
        run: ./docs/validation-scripts/automated-validation.sh
```

## Reportes de Validación

Los scripts generan automáticamente:
- **Logs detallados**: `validation_YYYYMMDD_HHMMSS.log`
- **Reportes JSON**: `validation_report.json`
- **Comparaciones**: `checksum_comparison.log`

### Ejemplo de Reporte JSON
```json
{
    "timestamp": "2025-10-02T16:39:25-03:00",
    "status": "success",
    "total_scripts": 3,
    "passed_scripts": 3,
    "failed_scripts": 0,
    "log_file": "automated_validation_20251002_163925.log"
}
```

## Troubleshooting

### Errores Comunes

#### "Enlace roto"
```
❌ Enlace roto en docs/ARCHITECTURE-OVERVIEW.md: ../COST-BENEFIT-ANALYSIS.md
```
**Solución**: Verificar que el archivo destino existe y la ruta es correcta

#### "Checksum inválido"
```
❌ Checksums inválidos detectados
mejoras_agentes/README.md: FAILED
```
**Solución**: Verificar si el archivo fue modificado legítimamente, actualizar baseline si es necesario

#### "Archivo faltante"
```
❌ Archivo faltante: docs/integration-guides/01-20-lecciones.md
```
**Solución**: Asegurar que todos los documentos modulares estén creados

### Debug Mode
```bash
# Ejecutar con debug
bash -x ./docs/validation-scripts/validate-links.sh

# Ver logs en tiempo real
tail -f validation_*.log
```

## Métricas de Validación

| Métrica | Baseline | Objetivo | Comando |
|---------|----------|----------|---------|
| **Tiempo de validación** | <30s | <60s | `time ./automated-validation.sh` |
| **Tasa de éxito** | >95% | 100% | Reporte JSON |
| **Falsos positivos** | <5% | <2% | Análisis manual |
| **Cobertura** | 80% | 95% | Scripts ejecutados |

## Referencias

- **Arquitectura General**: Ver [ARCHITECTURE-OVERVIEW.md](../ARCHITECTURE-OVERVIEW.md)
- **Requisitos Técnicos**: Ver [REQUIREMENTS-TECHNICAL.md](../REQUIREMENTS-TECHNICAL.md)
- **Validación Empírica**: Ver [VALIDATION-EMPRICA.md](../VALIDATION-EMPRICA.md)
