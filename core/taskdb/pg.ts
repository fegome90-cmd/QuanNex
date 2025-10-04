import { Pool } from 'pg';
import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter, TaskEventPayload } from './types.ts';

export interface PostgresTaskDBOptions {
  connectionString?: string;
  pool?: Pool;
}

const INSERT_COLUMNS = `trace_id, span_id, parent_span_id, run_id, task_id, component, actor, kind, status, ts, duration_ms, payload, metadata`;

function validateEvent(evt: TaskEvent): void {
  if (!evt.ctx.traceId) throw new Error('TaskDB event missing traceId');
  if (!evt.ctx.spanId) throw new Error('TaskDB event missing spanId');
  if (!evt.ctx.runId || !evt.ctx.taskId) {
    throw new Error('TaskDB event missing runId/taskId');
  }
}

function toPgRow<T extends TaskEventPayload>(evt: TaskEvent<T>): any[] {
  validateEvent(evt);
  return [
    evt.ctx.traceId,
    evt.ctx.spanId,
    evt.ctx.parentSpanId ?? null,
    evt.ctx.runId,
    evt.ctx.taskId,
    evt.ctx.component,
    evt.ctx.actor ?? null,
    evt.kind,
    evt.status ?? null,
    evt.ts,
    evt.durationMs ?? null,
    evt.payload ? JSON.stringify(evt.payload) : null,
    evt.metadata ? JSON.stringify(evt.metadata) : null,
  ];
}

function fromPgRow(row: any): TaskEvent {
  return {
    id: row.id,
    kind: row.kind,
    ts: Number(row.ts),
    status: row.status ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    payload: row.payload ?? undefined,
    metadata: row.metadata ?? undefined,
    ctx: {
      traceId: row.trace_id,
      spanId: row.span_id,
      parentSpanId: row.parent_span_id ?? undefined,
      runId: row.run_id,
      taskId: row.task_id,
      component: row.component,
      actor: row.actor ?? undefined,
    },
  };
}

export class PostgresTaskDB implements TaskDB {
  private pool: Pool;

  constructor(options: PostgresTaskDBOptions = {}) {
    this.pool = options.pool ?? new Pool({
      connectionString: options.connectionString ?? process.env.TASKDB_PG_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS taskdb_events (
          id BIGSERIAL PRIMARY KEY,
          trace_id TEXT NOT NULL,
          span_id TEXT NOT NULL,
          parent_span_id TEXT,
          run_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          component TEXT NOT NULL,
          actor TEXT,
          kind TEXT NOT NULL,
          status TEXT,
          ts BIGINT NOT NULL,
          duration_ms INTEGER,
          payload JSONB,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_taskdb_events_ts ON taskdb_events (ts DESC);
        CREATE INDEX IF NOT EXISTS idx_taskdb_events_run ON taskdb_events (run_id);
        CREATE INDEX IF NOT EXISTS idx_taskdb_events_task ON taskdb_events (task_id);
        CREATE INDEX IF NOT EXISTS idx_taskdb_events_kind ON taskdb_events (kind);
        CREATE INDEX IF NOT EXISTS idx_taskdb_events_component ON taskdb_events (component);
      `);
    } finally {
      client.release();
    }
  }

  async insert<T extends TaskEventPayload>(evt: TaskEvent<T>): Promise<void> {
    await this.pool.query(
      `INSERT INTO taskdb_events (${INSERT_COLUMNS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      toPgRow(evt)
    );
  }

  async bulkInsert<T extends TaskEventPayload>(evts: TaskEvent<T>[]): Promise<void> {
    if (!evts.length) return;
    const values: string[] = [];
    const params: any[] = [];

    evts.forEach((evt, idx) => {
      const row = toPgRow(evt);
      const offset = idx * row.length;
      values.push(`(${row.map((_, i) => `$${offset + i + 1}`).join(',')})`);
      params.push(...row);
    });

    await this.pool.query(
      `INSERT INTO taskdb_events (${INSERT_COLUMNS}) VALUES ${values.join(',')}`,
      params
    );
  }

  async query(filter: TaskEventFilter, limit = 1000): Promise<TaskEvent[]> {
    const where: string[] = [];
    const params: any[] = [];

    const push = (condition: string, value: unknown) => {
      params.push(value);
      where.push(condition.replace('?', `$${params.length}`));
    };

    if (filter.id) push('id = ?', filter.id);
    if (filter.traceId) push('trace_id = ?', filter.traceId);
    if (filter.spanId) push('span_id = ?', filter.spanId);
    if (filter.runId) push('run_id = ?', filter.runId);
    if (filter.taskId) push('task_id = ?', filter.taskId);
    if (filter.kind) push('kind = ?', filter.kind);
    if (filter.status) push('status = ?', filter.status);
    if (filter.component) push('component = ?', filter.component);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT id, trace_id, span_id, parent_span_id, run_id, task_id, component, actor, kind, status, ts, duration_ms, payload, metadata
       FROM taskdb_events
       ${whereClause}
       ORDER BY ts DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return result.rows.map(fromPgRow);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function makePgTaskDB(connectionString?: string): PostgresTaskDB {
  const db = new PostgresTaskDB({ connectionString });
  void db.init();
  return db;
}
