#!/bin/bash
set -Eeuo pipefail
# PHI exposure checker template for medical projects
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info(){ echo -e "${YELLOW}[PHI]${NC} $*"; }
ok(){ echo -e "${GREEN}OK${NC} $*"; }
fail(){ echo -e "${RED}FAIL${NC} $*"; }

PROJECT_TYPE='{{PROJECT_TYPE}}'
TARGET_DIR=${1:-.}
EXCLUDES=(--glob '!**/.git/**' --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/.claude/**' --glob '!**/logs/**')

if [[ "$PROJECT_TYPE" != "medical" ]]; then
  ok "Proyecto no médico (PROJECT_TYPE=$PROJECT_TYPE). No se requiere chequeo PHI."
  exit 0
fi

patterns=(
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  '\\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d{3,4}[ -]?\d{4}\\b'
  '\\b\d{3}-\d{2}-\d{4}\\b'
  '\\b(MRN|Record|Historia|Paciente|Patient)[ _:-]*\d{4,}\\b'
)

hits=0
if command -v rg >/dev/null 2>&1; then
  info "Escaneando ${TARGET_DIR} por posibles PHI (rg)"
  for p in "${patterns[@]}"; do
    if rg -n --pcre2 "${p}" -S "${EXCLUDES[@]}" "$TARGET_DIR" | head -n 1 | grep -q .; then
      rg -n --pcre2 "${p}" -S "${EXCLUDES[@]}" "$TARGET_DIR" || true
      hits=$((hits+1))
    fi
  done
else
  info "Escaneando ${TARGET_DIR} por posibles PHI (grep)"
  while IFS= read -r -d '' f; do
    for p in "${patterns[@]}"; do
      if grep -En "${p}" "$f" >/dev/null 2>&1; then
        grep -En "${p}" "$f" || true
        hits=$((hits+1))
      fi
    done
  done < <(find "$TARGET_DIR" -type f \
      ! -path "*/.git/*" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.claude/*" ! -path "*/logs/*" -print0)
fi

if [[ $hits -gt 0 ]]; then
  fail "Posibles hallazgos de PHI: $hits (revise salidas arriba)"
  exit 1
fi
ok "Sin coincidencias de PHI en el directorio analizado"

