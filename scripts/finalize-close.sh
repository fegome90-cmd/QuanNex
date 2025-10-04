#!/usr/bin/env bash
set -euo pipefail

# === Configuración ===
TAG_NAME="release/OPA_Cierre_Tecnico_2025-10-09"
TAG_MSG="Sign-off técnico completado - OPA Estacionamiento Resiliente (QuanNex ✅)"
REMOTE="origin"
MAIN_BRANCH="main"

# Patrones de ramas a eliminar (remotas y locales)
# Se preservan ramas bajo quarantine/* si existieran
DELETE_PATTERNS=("autofix/" "rollback/" "hotfix/rollback" "ops/rollback" "fix/rollback")

# Modo seguro por defecto (no borra nada)
DRY_RUN="${DRY_RUN:-true}"

echo "== Cierre Técnico OPA | DRY_RUN=${DRY_RUN} =="
echo "Remote: ${REMOTE} | Main: ${MAIN_BRANCH} | Tag: ${TAG_NAME}"
echo

# 1) Chequeos previos
echo "1) Chequeos previos…"
git rev-parse --is-inside-work-tree >/dev/null
CUR_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CUR_BRANCH}" != "${MAIN_BRANCH}" ]]; then
  echo "❌ Debes estar en '${MAIN_BRANCH}'. Rama actual: ${CUR_BRANCH}"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree no limpio. Haz commit/stash antes de continuar."
  exit 1
fi

git fetch --all --prune
echo "✅ Chequeos OK"
echo

# 2) Crear tag (si no existe)
echo "2) Snapshot/tag de cierre…"
if git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null; then
  echo "ℹ️ Tag ya existe: ${TAG_NAME}"
else
  echo "🏷️ Creando tag ${TAG_NAME}"
  if [[ "${DRY_RUN}" == "false" ]]; then
    git tag -a "${TAG_NAME}" -m "${TAG_MSG}"
  fi
fi
echo "✅ Tag preparado"
echo

# 3) Identificar ramas problemáticas (remotas)
echo "3) Descubrimiento de ramas problemáticas en remoto…"
REMOTE_BRANCHES=$(git branch -r | sed 's|^[ *]*||' | sed "s|${REMOTE}/||")
TO_DELETE_REMOTE=()
while IFS= read -r br; do
  # saltar main y tags y quarantine/*
  if [[ "${br}" == "${MAIN_BRANCH}" ]] || [[ "${br}" == */HEAD ]] || [[ "${br}" == quarantine/* ]]; then
    continue
  fi
  for p in "${DELETE_PATTERNS[@]}"; do
    if [[ "${br}" == ${p}* ]]; then
      TO_DELETE_REMOTE+=("${br}")
      break
    fi
  done
done < <(echo "${REMOTE_BRANCHES}" | tr ' ' '\n' | awk 'NF' | sort -u)

if ((${#TO_DELETE_REMOTE[@]})); then
  echo "🧹 Ramas remotas candidatas a eliminar:"
  printf ' - %s\n' "${TO_DELETE_REMOTE[@]}"
else
  echo "ℹ️ No se detectaron ramas remotas problemáticas según patrones."
fi
echo

# 4) Identificar ramas problemáticas (locales)
echo "4) Descubrimiento de ramas problemáticas locales…"
LOCAL_BRANCHES=$(git branch --format='%(refname:short)')
TO_DELETE_LOCAL=()
while IFS= read -r br; do
  if [[ "${br}" == "${MAIN_BRANCH}" ]] || [[ "${br}" == quarantine/* ]]; then
    continue
  fi
  for p in "${DELETE_PATTERNS[@]}"; do
    if [[ "${br}" == ${p}* ]]; then
      TO_DELETE_LOCAL+=("${br}")
      break
    fi
  done
done < <(echo "${LOCAL_BRANCHES}" | tr ' ' '\n' | awk 'NF' | sort -u)

if ((${#TO_DELETE_LOCAL[@]})); then
  echo "🧹 Ramas locales candidatas a eliminar:"
  printf ' - %s\n' "${TO_DELETE_LOCAL[@]}"
else
  echo "ℹ️ No se detectaron ramas locales problemáticas según patrones."
fi
echo

# 5) Plan de ejecución
echo "5) PLAN:"
echo " - Push de tag ${TAG_NAME} → ${REMOTE}"
if ((${#TO_DELETE_REMOTE[@]})); then
  echo " - Eliminar REMOTAS: ${TO_DELETE_REMOTE[*]}"
fi
if ((${#TO_DELETE_LOCAL[@]})); then
  echo " - Eliminar LOCALES: ${TO_DELETE_LOCAL[*]}"
fi
echo

# 6) Confirmación de ejecución (según DRY_RUN)
if [[ "${DRY_RUN}" == "true" ]]; then
  echo "🔒 DRY-RUN activo: no se harán cambios. Ajusta 'DRY_RUN=false' para ejecutar."
  exit 0
fi

# 7) Ejecutar: push tag
echo "7) Push de tag…"
git push "${REMOTE}" "refs/tags/${TAG_NAME}" --no-verify
echo "✅ Tag push OK"
echo

# 8) Ejecutar: eliminar ramas remotas
if ((${#TO_DELETE_REMOTE[@]})); then
  echo "8) Eliminando ramas remotas…"
  for br in "${TO_DELETE_REMOTE[@]}"; do
    echo " - ${REMOTE}/${br}"
    git push "${REMOTE}" --delete "${br}" --no-verify
  done
  echo "✅ Ramas remotas eliminadas"
else
  echo "8) No hay ramas remotas a eliminar"
fi
echo

# 9) Ejecutar: eliminar ramas locales
if ((${#TO_DELETE_LOCAL[@]})); then
  echo "9) Eliminando ramas locales…"
  for br in "${TO_DELETE_LOCAL[@]}"; do
    git branch -D "${br}"
  done
  echo "✅ Ramas locales eliminadas"
else
  echo "9) No hay ramas locales a eliminar"
fi
echo

# 10) Verificación final
echo "🔍 Verificación final…"
git fetch --all --prune
echo "Ramas remotas actuales:"
git branch -r
echo
echo "✅ Cierre completado. Sólo debe permanecer '${REMOTE}/${MAIN_BRANCH}' y el tag '${TAG_NAME}'."
