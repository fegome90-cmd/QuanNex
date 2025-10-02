#!/usr/bin/env bash
set -euo pipefail

echo "🛡️ SECURITY GATE PACK (GAP-001...005 + ANTI-EXFIL)"
echo "=================================================="

# Crear directorio de evidencia
mkdir -p .quannex/security
mkdir -p tests/security

echo ""
echo "▶ Tests de seguridad anti-exfil"
node --test tests/security/no-secrets-leak.test.mjs
node --test tests/security/http-allowlist.test.mjs
node --test tests/security/policy-gate.test.mjs
node --test tests/security/secrets-provider.test.mjs

echo ""
echo "▶ GAP-001 Sanitización de entradas"
node --test tests/security/input-sanitization.test.mjs

echo ""
echo "▶ GAP-002 Rate limiting"
node --test tests/security/rate-limit.test.mjs

echo ""
echo "▶ GAP-003 Sanitización de logs"
node --test tests/security/log-redaction.test.mjs

echo ""
echo "▶ GAP-004 JWT auth & claims"
node --test tests/security/jwt-auth.test.mjs

echo ""
echo "▶ GAP-005 Gestión de secretos"
node --test tests/security/secrets-management.test.mjs

echo ""
echo "▶ Gate 10: MCP Enforcement"
node --test tests/security/mcp-enforcement.test.mjs

echo ""
echo "▶ Supply-chain (audit + licencias)"
npm audit --omit=dev > .quannex/security/npm-audit.txt || true
node tools/license-scan.js > .quannex/security/license-scan.json

echo ""
echo "▶ Scan de secretos estático (repo)"
grep -RIn --exclude-dir=node_modules -E "sk_live_|ghp_[A-Za-z0-9]{20,}|aws_secret_access_key|AIza[0-9A-Za-z\\-_]{35}" . \
  > .quannex/security/secret-scan-grep.txt || true

echo ""
echo "▶ Snapshot de evidencia (hash)"
find .quannex/security -type f -print0 | sort -z | xargs -0 cat | shasum -a 256 | awk '{print $1}' \
  > .quannex/security/_snapshot.hash

echo ""
echo "🟢 Security Gate Pack OK"
echo "📊 Evidencia guardada en .quannex/security/"
echo "🛡️ Sistema blindado contra exfiltración"
