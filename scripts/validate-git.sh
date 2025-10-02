#!/usr/bin/env bash
set -euo pipefail

ALLOWED_BRANCHES="${ALLOWED_BRANCHES:-main,fix/background-agent}"
REQUIRED_BRANCH="${REQUIRED_BRANCH:-main}"
ALLOWED_COMMITS="${ALLOWED_COMMITS:-}" # coma-separado, opcional

IFS=',' read -r -a allowed_branches <<< "$ALLOWED_BRANCHES"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
current_commit="$(git rev-parse --verify HEAD)"

is_commit_in_allowed_branch() {
  local commit="$1"
  for b in "${allowed_branches[@]}"; do
    if git merge-base --is-ancestor "$commit" "origin/$b"; then
      return 0
    fi
  done
  return 1
}

is_commit_whitelisted() {
  local commit="$1"
  [[ -z "$ALLOWED_COMMITS" ]] && return 1
  IFS=',' read -r -a allowed_commits <<< "$ALLOWED_COMMITS"
  for c in "${allowed_commits[@]}"; do
    [[ "$commit" == "$c" ]] && return 0
  done
  return 1
}

# 1) Rama "normal"
if [[ "$current_branch" != "HEAD" ]]; then
  # Enforce allowed branches
  ok_branch=false
  for b in "${allowed_branches[@]}"; do
    [[ "$current_branch" == "$b" ]] && ok_branch=true && break
  done
  if ! $ok_branch; then
    echo "❌ Rama '$current_branch' no permitida. Permitidas: ${ALLOWED_BRANCHES}"
    exit 2
  fi
  # Enforce required branch (si se define)
  if [[ -n "$REQUIRED_BRANCH" && "$current_branch" != "$REQUIRED_BRANCH" ]]; then
    echo "❌ Se requiere rama '$REQUIRED_BRANCH' para hot start. Actual: '$current_branch'."
    exit 3
  fi
  echo "✅ Git OK: rama '$current_branch', commit $current_commit"
  exit 0
fi

# 2) HEAD desprendida
if is_commit_in_allowed_branch "$current_commit"; then
  echo "✅ Git OK: HEAD desprendida en commit $current_commit que pertenece a una rama permitida."
  exit 0
fi
if is_commit_whitelisted "$current_commit"; then
  echo "✅ Git OK: HEAD desprendida permitida por lista blanca ($current_commit)."
  exit 0
fi

echo "❌ HEAD desprendida en commit $current_commit no permitido. Añade el commit a ALLOWED_COMMITS o cambia a una rama permitida."
exit 4
