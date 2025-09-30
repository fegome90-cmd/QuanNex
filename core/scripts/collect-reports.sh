#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT_DIR="$ROOT/reports/ci"
mkdir -p "$OUT_DIR"

# collect from claude-test-projects
BASE="${TMPDIR:-/tmp}/claude-test-projects"
if [[ -d $BASE ]]; then
  for proj in "$BASE"/*; do
    [[ -d $proj ]] || continue
    if [[ -x "$proj/healthcheck.sh" ]]; then
      bash "$ROOT/core/scripts/validate-project.sh" "$proj" >/dev/null || true
      if [[ -f "$proj/reports/validation.json" ]]; then
        name=$(basename "$proj")
        cp "$proj/reports/validation.json" "$OUT_DIR/${name}-validation.json" || true
      fi
      if [[ -f "$proj/reports/init-report.json" ]]; then
        name=$(basename "$proj")
        cp "$proj/reports/init-report.json" "$OUT_DIR/${name}-init-report.json" || true
      fi
    fi
  done
else
  echo "No se encontró $BASE; omitiendo recolección."
fi

# collect from edge matrix runs
for base in ${TMPDIR:-/tmp}/edge-*; do
  [[ -d $base ]] || continue
  if [[ -d "$base/work" ]]; then
    for proj in "$base"/work/*; do
      [[ -d $proj ]] || continue
      if [[ -x "$proj/healthcheck.sh" ]]; then
        bash "$ROOT/core/scripts/validate-project.sh" "$proj" >/dev/null || true
        name=$(basename "$proj")
        if [[ -f "$proj/reports/validation.json" ]]; then
          cp "$proj/reports/validation.json" "$OUT_DIR/${name}-validation.json" || true
        fi
        if [[ -f "$proj/reports/init-report.json" ]]; then
          cp "$proj/reports/init-report.json" "$OUT_DIR/${name}-init-report.json" || true
        fi
      fi
    done
  fi
done

echo "Reportes recolectados en $OUT_DIR"
