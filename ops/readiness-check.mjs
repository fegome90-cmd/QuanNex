#!/usr/bin/env node
/**
 * readiness-check.mjs
 * Evalúa condiciones GO/NO-GO para QuanNex Core.
 * Ajusta las rutas en SOURCES para que apunten a tus métricas reales.
 */

import fs from 'node:fs';

const SOURCES = {
  contracts: 'artifacts/contracts-status.json',
  stability: 'artifacts/incidents.json',
  performance: 'artifacts/perf-core.json',
  resilience: 'artifacts/resilience.json',
  observability: 'artifacts/observability.json',
  security: 'artifacts/security.json',
  cicd: 'artifacts/ci-summary.json'
};

function readJson(path) {
  try {
    const raw = fs.readFileSync(path, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { error: `missing:${path}`, message: error.message };
  }
}

const data = Object.fromEntries(
  Object.entries(SOURCES).map(([key, path]) => [key, readJson(path)])
);

const checks = [
  {
    id: 'contracts',
    ok: data.contracts?.passRate >= 1 && (data.contracts?.streakDays ?? 0) >= 7,
    reason: 'Contratos 100% durante 7 días'
  },
  {
    id: 'stability',
    ok: data.stability?.p0 === 0 && data.stability?.p1 === 0 && (data.stability?.p2Open ?? 0) <= 5,
    reason: 'Incidentes P0/P1=0 y P2≤5'
  },
  {
    id: 'performance',
    ok: data.performance?.p95 <= 2.0 && data.performance?.fatalErrorRate <= 0.01,
    reason: 'p95≤2.0s y errores fatales ≤1%'
  },
  {
    id: 'resilience',
    ok: data.resilience?.lostRequests === 0,
    reason: 'Sin pérdidas en reinicios'
  },
  {
    id: 'observability',
    ok: data.observability?.tracedHops === 1 && (data.observability?.warnNoiseDelta ?? 0) <= -0.5,
    reason: '100% hops con trace y WARN/ERROR ↓≥50%'
  },
  {
    id: 'security',
    ok: data.security?.criticalViolations === 0,
    reason: '0 violaciones críticas de seguridad'
  },
  {
    id: 'ci',
    ok: data.cicd?.successRate >= 0.98 && (data.cicd?.runs ?? 0) >= 50,
    reason: 'ci-quannex-gate1 ≥98% en ≥50 corridas'
  }
];

const missing = Object.entries(data)
  .filter(([, value]) => value?.error)
  .map(([key, value]) => `${key}:${value.error}`);

if (missing.length > 0) {
  console.warn('[readiness] Fuentes faltantes:', missing.join(', '));
}

const failed = checks.filter(check => !check.ok);

if (failed.length === 0) {
  console.log('GO: todos los criterios cumplidos ✅');
  process.exit(0);
}

console.log('NO-GO: faltan criterios por cumplir ❌');
for (const check of failed) {
  console.log(`- ${check.id}: ${check.reason}`);
}
process.exit(1);
