#!/usr/bin/env bash
set -euo pipefail

echo "[canary] Abortando rollout…"

# ejemplo k8s:
# kubectl rollout undo deploy/quannex --to-revision=$(kubectl rollout history deploy/quannex | awk '/canary/{print $1}')

# si usas compose:
# docker compose -f docker-compose.canary.yml down

echo "[canary] Rollback disparado"
