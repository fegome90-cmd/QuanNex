#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCRIPT_PATH="$ROOT_DIR/core/claude-project-init.sh"
TMP_BASE="${TMPDIR:-/tmp}/claude-flags-test-$$"
mkdir -p "$TMP_BASE"

pass=0
fail=0
green='\033[0;32m'
red='\033[0;31m'
yellow='\033[1;33m'
nc='\033[0m'

it() { echo -e "${yellow}•${nc} $*"; }
ok() {
  echo -e "${green}  ✅ $*${nc}"
  pass=$((pass + 1))
}
ko() {
  echo -e "${red}  ❌ $*${nc}"
  fail=$((fail + 1))
}

trap 'echo -e "${red}Error en tests de flags${nc}" >&2' ERR

# 1) Dry run should not create directory and exit 0
it "dry-run no crea directorios y retorna 0"
proj1="$TMP_BASE/dryrun"
mkdir -p "$TMP_BASE"
set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --name dryrun --type frontend --path "$TMP_BASE" --dry-run >"$TMP_BASE/out1.txt" 2>&1
code=$?
set -e
if [[ $code -eq 0 && ! -d $proj1 ]]; then ok "dry-run correcto"; else ko "dry-run falló (code=$code, dir exists: $(test -d "$proj1" && echo yes || echo no))"; fi

# 2) --yes sin --name debe fallar
it "--yes sin --name falla"
set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --yes --type 6 --path "$TMP_BASE" >"$TMP_BASE/out2.txt" 2>&1
code=$?
set -e
if [[ $code -ne 0 ]]; then ok "valida --name con --yes"; else ko "aceptó --yes sin --name"; fi

# 3) No interactivo crea proyecto generic en tmp
it "no interactivo crea generic en tmp"
proj3="$TMP_BASE/noninteractive"
CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --name noninteractive --type generic --yes --path "$TMP_BASE" >/dev/null
if [[ -d "$proj3/.claude" && -f "$proj3/CLAUDE.md" ]]; then ok "estructura creada"; else ko "estructura faltante"; fi

# 4) --force permite usar dir vacío existente
it "--force permite dir vacío existente"
proj4="$TMP_BASE/emptydir"
mkdir -p "$proj4"
CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --name emptydir --type 1 --yes --path "$TMP_BASE" --force >/dev/null
if [[ -d "$proj4/.git" ]]; then ok "forzado en dir vacío"; else ko "no inicializó en dir vacío"; fi

# 5) --force NO sobrescribe dir con archivos
it "--force rechaza dir no vacío"
proj5="$TMP_BASE/nonempty"
mkdir -p "$proj5" && echo foo >"$proj5/file.txt"
set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --name nonempty --type 2 --yes --path "$TMP_BASE" --force >/dev/null 2>&1
code=$?
set -e
if [[ $code -ne 0 ]]; then ok "protegido contra overwrite"; else ko "permitió overwrite"; fi

echo -e "\nResumen: ${green}$pass ok${nc}, ${red}$fail fail${nc}"
if [[ $fail -ne 0 ]]; then exit 1; fi
