#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SRC_DIRS=("investigacion" "brainstorm")
DST_BASE="$ROOT/docs/research/imported"

APPLY=0
if [[ ${1:-} == "--apply" ]]; then APPLY=1; fi

echo "Research normalizer — destino: $DST_BASE (apply=$APPLY)"

mkdir -p "$DST_BASE"

for src in "${SRC_DIRS[@]}"; do
  [[ -d "$ROOT/$src" ]] || {
    echo "(skip) $src no existe"
    continue
  }
  echo "--- $src ---"
  find "$ROOT/$src" -mindepth 1 -print | while read -r path; do
    rel="${path#$ROOT/}"
    dst="$DST_BASE/$rel"
    if [[ $APPLY -eq 1 ]]; then
      mkdir -p "$(dirname "$dst")"
      git mv "$path" "$dst" 2>/dev/null || mv "$path" "$dst"
      echo "moved: $rel -> ${dst#$ROOT/}"
    else
      echo "plan: $rel -> ${dst#$ROOT/}"
    fi
  done
done

echo "Listo. Actualiza INDEX/TRAZABILIDAD tras aplicar."
