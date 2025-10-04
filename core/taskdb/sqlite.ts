import sqlite3 from 'sqlite3';
import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter, TaskEventPayload } from './types.ts';

const INSERT_SQL = `INSERT INTO taskdb_events (
  trace_id,
  span_id,
  parent_span_id,
  run_id,
  task_id,
  component,
  actor,
  kind,
  status,
  ts,
  duration_ms,
  payload,
  metadata
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function validateEvent(evt: TaskEvent): void {
  if (!evt.ctx.traceId) throw new Error('TaskDB event missing traceId');
  if (!evt.ctx.spanId) throw new Error('TaskDB event missing spanId');
  if (!evt.ctx.runId || !evt.ctx.taskId) {
    throw new Error('TaskDB event missing runId/taskId');
  }
}

function toRow<T extends TaskEventPayload>(evt: TaskEvent<T>): any[] {
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

function fromRow(row: any): TaskEvent {
  return {
    id: row.id,
    kind: row.kind,
    ts: Number(row.ts),
    status: row.status ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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

export class SQLiteTaskDB implements TaskDB {
  private db: sqlite3.Database;

  constructor(private dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(this.dbPath);
    this.initSchema();
  }

  private initSchema() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS taskdb_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trace_id TEXT NOT NULL,
        span_id TEXT NOT NULL,
        parent_span_id TEXT,
        run_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        component TEXT NOT NULL,
        actor TEXT,
        kind TEXT NOT NULL,
        status TEXT,
        ts INTEGER NOT NULL,
        duration_ms INTEGER,
        payload TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_taskdb_events_ts ON taskdb_events(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_taskdb_events_run ON taskdb_events(run_id);
      CREATE INDEX IF NOT EXISTS idx_taskdb_events_task ON taskdb_events(task_id);
      CREATE INDEX IF NOT EXISTS idx_taskdb_events_kind ON taskdb_events(kind);
      CREATE INDEX IF NOT EXISTS idx_taskdb_events_component ON taskdb_events(component);
    `;

    this.db.exec(createTable);
  }

  async insert<T extends TaskEventPayload>(evt: TaskEvent<T>): Promise<void> {
    await this.run(INSERT_SQL, toRow(evt));
  }

  async bulkInsert<T extends TaskEventPayload>(evts: TaskEvent<T>[]): Promise<void> {
    if (!evts.length) return;
    await this.withTransaction(async () => {
      for (const evt of evts) {
        await this.run(INSERT_SQL, toRow(evt));
      }
    });
  }

  async query(filter: TaskEventFilter, limit = 1000): Promise<TaskEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.id) {
      conditions.push('id = ?');
      params.push(filter.id);
    }
    if (filter.traceId) {
      conditions.push('trace_id = ?');
      params.push(filter.traceId);
    }
    if (filter.spanId) {
      conditions.push('span_id = ?');
      params.push(filter.spanId);
    }
    if (filter.runId) {
      conditions.push('run_id = ?');
      params.push(filter.runId);
    }
    if (filter.taskId) {
      conditions.push('task_id = ?');
      params.push(filter.taskId);
    }
    if (filter.kind) {
      conditions.push('kind = ?');
      params.push(filter.kind);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter.component) {
      conditions.push('component = ?');
      params.push(filter.component);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, trace_id, span_id, parent_span_id, run_id, task_id, component, actor, kind, status, ts, duration_ms, payload, metadata
      FROM taskdb_events
      ${whereClause}
      ORDER BY ts DESC
      LIMIT ?
    `;
    params.push(limit);

    const rows = await this.all(sql, params);
    return rows.map(fromRow);
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.db.close(err => (err ? reject(err) : resolve()));
    });
  }

  private async run(sql: string, params: any[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.db.run(sql, params, err => (err ? reject(err) : resolve()));
    });
  }

  private async all(sql: string, params: any[]): Promise<any[]> {
    return await new Promise<any[]>((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  }

  private async withTransaction(fn: () => Promise<void>): Promise<void> {
    await this.run('BEGIN', []);
    try {
      await fn();
      await this.run('COMMIT', []);
    } catch (err) {
      await this.run('ROLLBACK', []);
      throw err;
    }
  }
}

export function makeSqliteTaskDB(dbPath: string = process.env.TASKDB_SQLITE_PATH || ':memory:'): SQLiteTaskDB {
  return new SQLiteTaskDB(dbPath);
}
