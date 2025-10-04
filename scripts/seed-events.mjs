#!/usr/bin/env node
/* eslint-env node */

import { randomUUID } from 'node:crypto';
import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';

const PG_URL = process.env.TASKDB_PG_URL || 'postgres://taskdb:taskdb@localhost:5432/taskdb';
const SQLITE_PATH = process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite';
const TOTAL_RUNS = Number(process.env.TASKDB_SEED_EVENTS || 5);

function buildEvents(total) {
  const events = [];
  for (let i = 0; i < total; i += 1) {
    const traceId = randomUUID();
    const runId = `SEED:${Date.now()}:${i}`;
    const taskId = `TASK:${randomUUID()}`;
    const baseTs = Date.now() + i * 10;

    const context = {
      traceId,
      spanId: randomUUID(),
      parentSpanId: null,
      runId,
      taskId,
      component: 'seed-script',
      actor: 'telemetry',
    };

    events.push({
      kind: 'run.start',
      status: 'ok',
      ts: baseTs,
      durationMs: null,
      ctx: context,
      payload: { meta: { source: 'seed' } },
    });

    events.push({
      kind: 'memory.inject',
      status: 'ok',
      ts: baseTs + 5,
      durationMs: 2,
      ctx: context,
      payload: { items: 3 + i },
    });

    events.push({
      kind: 'llm.call',
      status: 'ok',
      ts: baseTs + 10,
      durationMs: 50,
      ctx: context,
      payload: { model: 'seed-model', tokens_in: 128 + i, tokens_out: 42 + i },
    });

    events.push({
      kind: 'run.finish',
      status: 'ok',
      ts: baseTs + 20,
      durationMs: 60,
      ctx: context,
      payload: { meta: { source: 'seed' } },
    });
  }
  return events;
}

async function seedPostgres(events) {
  const client = new PgClient({ connectionString: PG_URL });
  await client.connect();
  const text = `INSERT INTO taskdb_events (
    trace_id, span_id, parent_span_id, run_id, task_id, component, actor,
    kind, status, ts, duration_ms, payload, metadata
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`;

  for (const evt of events) {
    await client.query(text, [
      evt.ctx.traceId,
      evt.ctx.spanId,
      evt.ctx.parentSpanId,
      evt.ctx.runId,
      evt.ctx.taskId,
      evt.ctx.component,
      evt.ctx.actor,
      evt.kind,
      evt.status,
      evt.ts,
      evt.durationMs,
      JSON.stringify(evt.payload ?? {}),
      JSON.stringify({ source: 'seed-script' }),
    ]);
  }

  await client.end();
}

async function seedSqlite(events) {
  const db = new sqlite3.Database(SQLITE_PATH);
  const stmt = db.prepare(`INSERT INTO taskdb_events (
    trace_id, span_id, parent_span_id, run_id, task_id, component, actor,
    kind, status, ts, duration_ms, payload, metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      for (const evt of events) {
        stmt.run(
          [
            evt.ctx.traceId,
            evt.ctx.spanId,
            evt.ctx.parentSpanId,
            evt.ctx.runId,
            evt.ctx.taskId,
            evt.ctx.component,
            evt.ctx.actor,
            evt.kind,
            evt.status,
            evt.ts,
            evt.durationMs,
            JSON.stringify(evt.payload ?? {}),
            JSON.stringify({ source: 'seed-script' }),
          ],
          err => {
            if (err) reject(err);
          }
        );
      }
      stmt.finalize(err => (err ? reject(err) : resolve()));
    });
  });

  db.close();
}

async function main() {
  console.log(`🌱 Seeding TaskDB telemetry with ${TOTAL_RUNS} runs...`);
  const events = buildEvents(TOTAL_RUNS);

  try {
    await seedPostgres(events);
    console.log('✅ PostgreSQL seed complete');
  } catch (error) {
    console.warn('⚠️ PostgreSQL seed skipped:', error.message);
  }

  try {
    await seedSqlite(events);
    console.log('✅ SQLite seed complete');
  } catch (error) {
    console.warn('⚠️ SQLite seed skipped:', error.message);
  }

  console.log('✅ Seed completado');
}

main().catch(err => {
  console.error('❌ Seed falló:', err.message);
  process.exit(1);
});
