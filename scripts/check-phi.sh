#!/usr/bin/env bash
# 🏥 PHI Check Script para @medical-reviewer
# 📅 Versión: 1.0.0
# 🎯 Propósito: Verificar protección de PHI (Protected Health Information)

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PHI_PATTERNS=(
  "ssn|social.security"
  "patient.id|patient_id"
  "medical.record|medical_record"
  "health.record|health_record"
  "diagnosis|diagnoses"
  "treatment|treatments"
  "prescription|prescriptions"
  "insurance.id|insurance_id"
  "date.of.birth|date_of_birth"
  "phone.number|phone_number"
  "email.address|email_address"
  "address|addresses"
)

OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-high}"
PHI_STRICT="${PHI_STRICT:-0}"
PHI_ALLOW_DOMAINS="${PHI_ALLOW_DOMAINS:-example.com|test.com}"
# Límite de búsqueda (raíces) y tamaño de archivo para acelerar el escaneo
PHI_SCAN_PATHS="${PHI_SCAN_PATHS:-src,app,server,client}"
PHI_MAX_FILE_SIZE_KB="${PHI_MAX_FILE_SIZE_KB:-512}"

# Función para logging
log() {
  echo -e "${BLUE}[PHI Check]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para verificar dependencias
check_dependencies() {
  log "Verificando dependencias..."

  if ! command -v grep &>/dev/null; then
    error "grep no está disponible"
    exit 1
  fi

  if ! command -v jq &>/dev/null; then
    warning "jq no está instalado, usando formato simple"
    OUTPUT_FORMAT="simple"
  fi

  success "Dependencias verificadas"
}

# Función para escanear PHI en archivos
scan_phi() {
  log "Escaneando PHI en archivos..."

  local root="${1:-.}"
  local findings=()
  local total_files=0
  local files_with_phi=0

  # Crear patrón de búsqueda
  local pattern
  pattern=$(
    IFS='|'
    echo "${PHI_PATTERNS[*]}"
  )

  # Construir raíces de escaneo a partir de PHI_SCAN_PATHS (fallback a root si no existen)
  local IFS=','
  read -r -a rootspec <<<"$PHI_SCAN_PATHS"
  local roots=()
  for sp in "${rootspec[@]}"; do
    sp="${sp// /}"
    [[ -z $sp ]] && continue
    if [[ -d "$root/$sp" ]]; then roots+=("$root/$sp"); fi
  done
  [[ ${#roots[@]} -eq 0 ]] && roots=("$root")

  local any_file=0
  for r in "${roots[@]}"; do
    while IFS= read -r -d '' file; do
      any_file=1
      ((total_files++))
      # Buscar PHI en el archivo
      if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
        ((files_with_phi++))
        # Obtener líneas con PHI
        local lines
        lines=$(grep -iE "$pattern" "$file" -n)
        while IFS= read -r line; do
          local line_num
          line_num=$(echo "$line" | cut -d: -f1)
          local content
          content=$(echo "$line" | cut -d: -f2-)
          # Ignorar emails de dominios permitidos
          if echo "$content" | grep -Eqi "@(${PHI_ALLOW_DOMAINS})\b"; then
            continue
          fi
          findings+=("$file:$line_num:$content")
        done <<<"$lines"
      fi
    done < <(find "$r" \
      \( -path "*/.git" -o -path "*/node_modules" -o -path "*/dist" -o -path "*/external" -o -path "*/templates" -o -path "*/docs" \) -prune -o \
      -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" \) \
      -size -"${PHI_MAX_FILE_SIZE_KB}"k -print0)
  done

  if [[ $any_file -eq 0 ]]; then
    warning "No se encontraron archivos de código para PHI; omitiendo"
    return 0
  fi

  log "Archivos escaneados: $total_files"
  log "Archivos con PHI: $files_with_phi"

  if [[ ${#findings[@]} -gt 0 ]]; then
    warning "Se encontraron ${#findings[@]} instancias de PHI"
    if [[ $PHI_STRICT == "1" ]]; then
      return 1
    else
      warning "Modo no estricto: aprobando con advertencias"
      return 0
    fi
  else
    success "No se encontró PHI en el código"
    return 0
  fi
}

# Función para generar reporte JSON
generate_json_report() {
  local findings=("$@")
  local output_file="phi-report.json"

  log "Generando reporte JSON..."

  # Crear estructura JSON
  cat >"$output_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scan_type": "PHI_DETECTION",
  "total_findings": ${#findings[@]},
  "severity": "HIGH",
  "findings": [
EOF

  # Agregar cada hallazgo
  for i in "${!findings[@]}"; do
    local finding="${findings[$i]}"
    local file
    file=$(echo "$finding" | cut -d: -f1)
    local line
    line=$(echo "$finding" | cut -d: -f2)
    local content
    content=$(echo "$finding" | cut -d: -f3-)

    cat >>"$output_file" <<EOF
    {
      "file": "$file",
      "line": $line,
      "content": "$content",
      "type": "PHI_DETECTED",
      "severity": "HIGH",
      "recommendation": "Remove or mask PHI data"
    }$(if [[ $i -lt $((${#findings[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$output_file" <<EOF
  ],
  "recommendations": [
    "Remove PHI from source code",
    "Implement data masking for development",
    "Use environment variables for sensitive data",
    "Implement proper access controls",
    "Add PHI detection to CI/CD pipeline"
  ]
}
EOF

  success "Reporte JSON generado: $output_file"
}

# Función para generar reporte simple
generate_simple_report() {
  local findings=("$@")
  local output_file="phi-report.txt"

  log "Generando reporte simple..."

  cat >"$output_file" <<EOF
# 🏥 Reporte de PHI Detection

## 📅 Fecha: $(date)

## 📈 Resumen
- **Total de hallazgos**: ${#findings[@]}
- **Severidad**: HIGH
- **Tipo**: PHI_DETECTED

## 🔍 Hallazgos
EOF

  for finding in "${findings[@]}"; do
    local file
    file=$(echo "$finding" | cut -d: -f1)
    local line
    line=$(echo "$finding" | cut -d: -f2)
    local content
    content=$(echo "$finding" | cut -d: -f3-)

    cat >>"$output_file" <<EOF

### Archivo: $file
- **Línea**: $line
- **Contenido**: $content
- **Recomendación**: Remove or mask PHI data
EOF
  done

  cat >>"$output_file" <<EOF

## 💡 Recomendaciones
1. Remove PHI from source code
2. Implement data masking for development
3. Use environment variables for sensitive data
4. Implement proper access controls
5. Add PHI detection to CI/CD pipeline

---
*Generado por @medical-reviewer*
EOF

  success "Reporte simple generado: $output_file"
}

# Función para analizar resultados
analyze_results() {
  local findings=("$@")

  log "Analizando resultados..."

  if [[ ${#findings[@]} -gt 0 ]]; then
    error "Se encontraron ${#findings[@]} instancias de PHI"

    # Generar reporte
    if [[ $OUTPUT_FORMAT == "json" ]]; then
      generate_json_report "${findings[@]}"
    else
      generate_simple_report "${findings[@]}"
    fi

    return 1
  else
    success "No se encontró PHI en el código"
    return 0
  fi
}

# Función principal
main() {
  log "Iniciando verificación de PHI..."

  # Verificar dependencias
  check_dependencies

  # Escanear PHI
  local findings=()
  if scan_phi "$@"; then
    success "✅ Verificación de PHI completada exitosamente"
    exit 0
  else
    # Obtener hallazgos para análisis
    local pattern
    pattern=$(
      IFS='|'
      echo "${PHI_PATTERNS[*]}"
    )
    local files="${1:-.}"

    while IFS= read -r -d '' file; do
      if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
        local lines
        lines=$(grep -iE "$pattern" "$file" -n)
        while IFS= read -r line; do
          local line_num
          line_num=$(echo "$line" | cut -d: -f1)
          local content
          content=$(echo "$line" | cut -d: -f2-)
          findings+=("$file:$line_num:$content")
        done <<<"$lines"
      fi
    done < <(find "$files" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" \) -print0)

    # Analizar resultados
    if analyze_results "${findings[@]}"; then
      success "✅ Verificación de PHI completada exitosamente"
      exit 0
    else
      error "❌ Se encontró PHI en el código"
      exit 1
    fi
  fi
}

# Ejecutar función principal
main "$@"
