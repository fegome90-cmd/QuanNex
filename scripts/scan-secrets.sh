#!/usr/bin/env bash
set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  cat <<USG
Secret scanner (lightweight)
Usage: $(basename "$0") [--staged]
Scans repo (or staged diff) for common secret patterns. Respects .secretsallow.
USG
}

mode="repo"
if [[ ${1:-} == "--staged" ]]; then mode="staged"; fi

has() { command -v "$1" >/dev/null 2>&1; }

allow_file=".secretsallow"
allow() {
  # Returns 0 if line matches any allow rule
  local line="$1"
  [[ -f $allow_file ]] || return 1
  while IFS= read -r rule; do
    [[ -z $rule || $rule =~ ^# ]] && continue
    if [[ $line =~ $rule ]]; then return 0; fi
  done <"$allow_file"
  return 1
}

collect_input() {
  if [[ $mode == "staged" ]]; then
    # Staged diff only (added lines)
    git diff --cached -U0 | sed -n 's/^+//p'
  else
    # All files tracked (exclude .git, node_modules, dist, build-like dirs)
    if has rg; then
      rg -n --hidden --no-ignore-vcs --glob '!.git' --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!reports' --glob '!variants' . | cut -d: -f3-
    else
      git ls-files -z | tr '\0' '\n' | while read -r f; do
        [[ -f $f ]] && sed -n '1,200p' "$f"
      done
    fi
  fi
}

patterns=(
  'AKIA[0-9A-Z]{16}' # AWS Access Key ID
  'ASIA[0-9A-Z]{16}' # AWS temp key
  'aws_secret_access_key[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{40}'
  'AIza[0-9A-Za-z\-_]{35}'       # Google API key
  'ghp_[0-9A-Za-z]{36,}'         # GitHub PAT
  'xox[baprs]-[0-9A-Za-z-]{10,}' # Slack tokens
  'sk-[A-Za-z0-9]{32,}'          # Generic sk- tokens
  'secret[[:space:]]*[:=][[:space:]]*[0-9A-Za-z/+]{12,}'
  'password[[:space:]]*[:=][[:space:]]*[^[:space:]]{6,}'
  '-----BEGIN.*PRIVATE KEY-----' # Private keys (simplified)
)

found=0
while IFS= read -r line; do
  for pat in "${patterns[@]}"; do
    if echo "$line" | grep -E -q "$pat"; then
      if ! allow "$line"; then
        ((found++))
        echo -e "${RED}[SECRET?]${NC} $(echo "$line" | sed 's/\t/ /g' | cut -c1-180)"
        break
      fi
    fi
  done
done < <(collect_input)

if [[ $found -gt 0 ]]; then
  echo -e "${RED}❌ Posibles secretos detectados: $found${NC}"
  echo -e "${YELLOW}Use .secretsallow para false positives (regex por línea).${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Sin secretos aparentes.${NC}"
