#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'reports/TASKDB-BASELINE.md';
const SINCE_MS = 1000 * 60 * 60 * 24 * 7; // 7 días por defecto

function fmtPct(n) {
  return (n * 100).toFixed(1) + '%';
}
function fmtMs(n) {
  return `${Math.round(n)}ms`;
}

async function main() {
  // Leer datos existentes de TaskDB
  const taskdbPath = 'data/taskdb.json';
  const taskdbCorePath = 'data/taskdb-core.json';

  let events = [];
  let coreEvents = [];

  try {
    if (fs.existsSync(taskdbPath)) {
      const taskdbData = JSON.parse(fs.readFileSync(taskdbPath, 'utf8'));
      // Extraer eventos si existen en la estructura
      if (taskdbData.events) {
        events = taskdbData.events;
      }
    }

    if (fs.existsSync(taskdbCorePath)) {
      const coreData = JSON.parse(fs.readFileSync(taskdbCorePath, 'utf8'));
      // Extraer eventos si existen en la estructura
      if (coreData.events) {
        coreEvents = coreData.events;
      }
    }
  } catch (err) {
    console.warn('⚠️ Error leyendo datos de TaskDB:', err.message);
  }

  const sinceTs = Date.now() - SINCE_MS;
  const ev = [...events, ...coreEvents].filter(e => e && e.ts && e.ts >= sinceTs);

  const byKind = new Map();
  for (const e of ev) {
    const k = `${e.kind}:${e.status || 'ok'}`;
    byKind.set(k, (byKind.get(k) || 0) + 1);
  }
  const runsStart = ev.filter(e => e.kind === 'run.start').length;
  const runsFinish = ev.filter(e => e.kind === 'run.finish').length;
  const runsError = ev.filter(e => e.kind === 'run.error').length;
  const finishRate = runsStart ? runsFinish / runsStart : 0;
  const errorRate = runsStart ? runsError / runsStart : 0;

  // TTFQ: run.start -> llm.call (primera por runId)
  const firstByRun = new Map();
  const callByRun = new Map();
  for (const e of ev) {
    if (e.kind === 'run.start') firstByRun.set(e.ctx.runId, e.ts);
    if (e.kind === 'llm.call' && !callByRun.has(e.ctx.runId)) callByRun.set(e.ctx.runId, e.ts);
  }
  const deltas = [];
  for (const [runId, t0] of firstByRun) {
    const t1 = callByRun.get(runId);
    if (t1) deltas.push(t1 - t0);
  }
  deltas.sort((a, b) => a - b);
  const p = q => (deltas.length ? deltas[Math.floor(q * (deltas.length - 1))] : 0);
  const ttfq_p50 = p(0.5),
    ttfq_p95 = p(0.95);

  const md = `# TaskDB Baseline Report (últimos 7 días)

**Generado**: ${new Date().toISOString()}  
**Período**: ${new Date(sinceTs).toISOString()} - ${new Date().toISOString()}

## Resumen
- Eventos totales: **${ev.length}**
- Runs: start=${runsStart}, finish=${runsFinish}, error=${runsError}
- Tasa de finalización: **${fmtPct(finishRate)}** | Error rate: **${fmtPct(errorRate)}**
- TTFQ: p50=${fmtMs(ttfq_p50)}, p95=${fmtMs(ttfq_p95)}

## Eventos por tipo/estado
${[...byKind.entries()].map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Estado del Sistema
- **Shadow Write**: ${process.env.TASKDB_DRIVER === 'dual' ? '✅ Activo' : '❌ Inactivo'}
- **Driver**: ${process.env.TASKDB_DRIVER || 'sqlite'}
- **Archivos**: taskdb.json (${events.length} eventos), taskdb-core.json (${coreEvents.length} eventos)

## Próximos Pasos
1. Activar shadow write: \`npm run taskdb:shadow:on\`
2. Iniciar métricas: \`npm run taskdb:metrics\`
3. Monitorear: \`curl http://localhost:9464/metrics\`

> Generado automáticamente por \`cli/generate-baseline.mjs\`.
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`✅ Baseline escrito en ${OUT}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
