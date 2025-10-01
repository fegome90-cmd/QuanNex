#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Contracts";      npm run mcp:contracts
echo "[2/5] Init";           npm run mcp:init
echo "[3/5] Smoke";          npm run mcp:smoke
echo "[4/5] CI Gate 1";      npm run ci:gate1
echo "[5/6] Anti-scaffold";  node ops/scaffold-guard.mjs
echo "[6/6] Readiness";      node ops/readiness-check.mjs || true

echo "OK (verifica readiness para GO/NO-GO en salida anterior)"
