#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

types=(frontend backend fullstack medical design generic)
tpl_modes=(off on)
spaces=(no yes)
npm_modes=(yes no)

results_dir="reports/edge"
mkdir -p "$results_dir"

run_case() {
  local t="$1" tm="$2" sp="$3" nm="$4"
  local name="edge-${t}-tpl-${tm}-spaces-${sp}-npm-${nm}"
  local base="${TMPDIR:-/tmp}/${name}"
  rm -rf "$base"; mkdir -p "$base"
  local path="$base/work"
  mkdir -p "$path"
  local proj="${name}"
  if [[ "$sp" = "yes" ]]; then proj="${name//-/_} with spaces"; fi
  local env_skip="CLAUDE_INIT_SKIP_DEPS=1"
  local env_path="PATH=$PATH"
  if [[ "$nm" = "no" ]]; then env_path="PATH=/usr/bin:/bin"; fi
  set +e
  eval "$env_path $env_skip bash ./claude-project-init.sh --name \"$proj\" --type $t --yes --path \"$path\" --use-templates $tm" >/dev/null 2>"$base/err.txt"
  local code=$?
  set -e
  # success if exit 0
  echo "${name}: $code" | tee -a "$results_dir/summary.txt"
}

for t in "${types[@]}"; do
  for tm in "${tpl_modes[@]}"; do
    for sp in "${spaces[@]}"; do
      for nm in "${npm_modes[@]}"; do
        run_case "$t" "$tm" "$sp" "$nm"
      done
    done
  done
done

echo "Edge matrix completed. Summary at $results_dir/summary.txt"

