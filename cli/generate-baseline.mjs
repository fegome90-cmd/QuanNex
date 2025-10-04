#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';
import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';

const OUT_MD = 'reports/TASKDB-BASELINE.md';
const OUT_JSON = 'reports/TASKDB-BASELINE.json';
const WINDOW_MS = Number(process.env.TASKDB_BASELINE_WINDOW_MS || 1000 * 60 * 60 * 24 * 7);
const LIMIT = Number(process.env.TASKDB_BASELINE_LIMIT || 5000);
const PG_URL = process.env.TASKDB_PG_URL || 'postgres://taskdb:taskdb@localhost:5432/taskdb';
const SQLITE_PATH = process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite';

const toPct = value => `${(value * 100).toFixed(1)}%`;
const toMs = value => `${Math.round(value)}ms`;

async function fetchPostgresEvents() {
  const client = new PgClient({ connectionString: PG_URL });
  await client.connect();
  const { rows } = await client.query(
    `SELECT trace_id, span_id, parent_span_id, run_id, task_id, component, actor,
            kind, status, ts, duration_ms, payload, metadata
       FROM taskdb_events
       ORDER BY ts DESC
       LIMIT $1`,
    [LIMIT]
  );
  await client.end();
  return rows.map(row => ({
    kind: row.kind,
    status: row.status || undefined,
    ts: Number(row.ts),
    durationMs: row.duration_ms || undefined,
    payload: row.payload || undefined,
    ctx: {
      traceId: row.trace_id,
      spanId: row.span_id,
      parentSpanId: row.parent_span_id || undefined,
      runId: row.run_id,
      taskId: row.task_id,
      component: row.component,
      actor: row.actor || undefined,
    },
  }));
}

function fetchSqliteEvents() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY, err => {
      if (err) {
        reject(err);
        return;
      }
      db.all(
        `SELECT trace_id, span_id, parent_span_id, run_id, task_id, component, actor,
                kind, status, ts, duration_ms, payload, metadata
           FROM taskdb_events
           ORDER BY ts DESC
           LIMIT ?`,
        [LIMIT],
        (queryErr, rows) => {
          if (queryErr) reject(queryErr);
          else {
            resolve(
              rows.map(row => ({
                kind: row.kind,
                status: row.status || undefined,
                ts: Number(row.ts),
                durationMs: row.duration_ms || undefined,
                payload: row.payload ? JSON.parse(row.payload) : undefined,
                ctx: {
                  traceId: row.trace_id,
                  spanId: row.span_id,
                  parentSpanId: row.parent_span_id || undefined,
                  runId: row.run_id,
                  taskId: row.task_id,
                  component: row.component,
                  actor: row.actor || undefined,
                },
              }))
            );
          }
          db.close();
        }
      );
    });
  });
}

async function checkMetricsEndpoint() {
  const port = Number(process.env.PORT_METRICS || process.env.METRICS_PORT || 9464);
  try {
    const res = await fetch(`http://localhost:${port}/metrics`);
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    return {
      ok:
        /taskdb_events_total/.test(text) &&
        /taskdb_queue_depth/.test(text) &&
        /taskdb_flush_latency_seconds/.test(text),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function fetchCounts() {
  const client = new PgClient({ connectionString: PG_URL });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM taskdb_events');
    return { ok: true, total: Number(rows[0]?.total || 0) };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    await client.end().catch(() => {});
  }
}

function fetchSqliteCount() {
  return new Promise(resolve => {
    const db = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY, err => {
      if (err) {
        resolve({ ok: false, error: err.message });
        return;
      }
      db.get('SELECT COUNT(*) AS total FROM taskdb_events', (queryErr, row) => {
        if (queryErr) resolve({ ok: false, error: queryErr.message });
        else resolve({ ok: true, total: Number(row?.total || 0) });
        db.close();
      });
    });
  });
}

function computeTTFQ(events) {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const startByRun = new Map();
  const llmByRun = new Map();

  for (const evt of sorted) {
    if (evt.kind === 'run.start') startByRun.set(evt.ctx.runId, evt.ts);
    if (evt.kind === 'llm.call' && !llmByRun.has(evt.ctx.runId)) llmByRun.set(evt.ctx.runId, evt.ts);
  }

  const deltas = [];
  for (const [runId, startTs] of startByRun) {
    const callTs = llmByRun.get(runId);
    if (callTs) deltas.push(callTs - startTs);
  }
  deltas.sort((a, b) => a - b);
  const percentile = q => (deltas.length ? deltas[Math.floor(q * (deltas.length - 1))] : 0);
  return { p50: percentile(0.5), p95: percentile(0.95) };
}

async function main() {
  const now = Date.now();
  const since = now - WINDOW_MS;

  let pgEvents = [];
  try {
    pgEvents = await fetchPostgresEvents();
  } catch (error) {
    console.warn('⚠️ PostgreSQL no disponible:', error.message);
  }

  let sqliteEvents = [];
  try {
    sqliteEvents = await fetchSqliteEvents();
  } catch (error) {
    console.warn('⚠️ SQLite no disponible:', error.message);
  }

  const events = [...pgEvents, ...sqliteEvents].filter(evt => evt.ts >= since);
  const runsStart = events.filter(evt => evt.kind === 'run.start').length;
  const runsFinish = events.filter(evt => evt.kind === 'run.finish').length;
  const runsError = events.filter(evt => evt.kind === 'run.error').length;
  const finishRate = runsStart ? runsFinish / runsStart : 0;
  const errorRate = runsStart ? runsError / runsStart : 0;
  const ttfq = computeTTFQ(events);

  const metricsStatus = await checkMetricsEndpoint();
  const pgStatus = await fetchCounts();
  const sqliteStatus = await fetchSqliteCount();

  const summary = {
    generatedAt: new Date(now).toISOString(),
    period: {
      start: new Date(since).toISOString(),
      end: new Date(now).toISOString(),
    },
    totals: {
      events: events.length,
      runsStart,
      runsFinish,
      runsError,
    },
    metrics: {
      finishRate,
      errorRate,
      ttfq,
    },
    health: {
      metrics_ok: metricsStatus.ok,
      pg_ok: pgStatus.ok,
      sqlite_ok: sqliteStatus.ok,
      driver: process.env.TASKDB_DRIVER || 'sqlite',
      counts: {
        postgres: pgStatus.total ?? null,
        sqlite: sqliteStatus.total ?? null,
      },
    },
    windowMs: WINDOW_MS,
    limit: LIMIT,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));

  const eventCounts = events.reduce((map, evt) => {
    const key = `${evt.kind}:${evt.status || 'ok'}`;
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  const md = `# TaskDB Baseline Report (últimos ${Math.round(WINDOW_MS / (1000 * 60 * 60 * 24))} días)

**Generado**: ${summary.generatedAt}  
**Período**: ${summary.period.start} - ${summary.period.end}

## Resumen
- Eventos totales: **${summary.totals.events}**
- Runs: start=${runsStart}, finish=${runsFinish}, error=${runsError}
- Tasa de finalización: **${toPct(finishRate)}** | Error rate: **${toPct(errorRate)}**
- TTFQ: p50=${toMs(ttfq.p50)}, p95=${toMs(ttfq.p95)}

## Salud del Sistema
- Driver activo: **${summary.health.driver}**
- Shadow Write: ${summary.health.driver === 'dual' ? '✅ Activo' : '⚠️ Revisar'}
- Métricas Prometheus: ${summary.health.metrics_ok ? '✅ OK' : '❌ Sin datos taskdb_*'}
- Postgres: ${summary.health.pg_ok ? `✅ ${summary.health.counts.postgres} eventos` : '❌ Conexión fallida'}
- SQLite: ${summary.health.sqlite_ok ? `✅ ${summary.health.counts.sqlite} eventos` : '❌ Conexión fallida'}

## Eventos recientes
${[...eventCounts.entries()].map(([key, count]) => `- ${key}: ${count}`).join('\n')}

> Generado automáticamente por \`cli/generate-baseline.mjs\`.
`;

  fs.writeFileSync(OUT_MD, md, 'utf8');
  console.log(`✅ Baseline actualizado en ${OUT_MD} y ${OUT_JSON}`);
}

main().catch(error => {
  console.error('❌ Error generando baseline:', error.message);
  process.exit(1);
});
