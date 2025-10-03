import { Pool, PoolClient } from 'pg';
import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';

export class PostgresTaskDB implements TaskDB {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.initSchema();
  }

  private async initSchema() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_events (
          id BIGSERIAL PRIMARY KEY,
          kind TEXT NOT NULL,
          run_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          span_id TEXT NOT NULL,
          parent_span_id TEXT,
          component TEXT NOT NULL,
          actor TEXT,
          ts BIGINT NOT NULL,
          status TEXT,
          duration_ms INTEGER,
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_task_events_ts ON task_events(ts);
        CREATE INDEX IF NOT EXISTS idx_task_events_run_id ON task_events(run_id);
        CREATE INDEX IF NOT EXISTS idx_task_events_kind ON task_events(kind);
        CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
      `);
    } finally {
      client.release();
    }
  }

  async insert<T = any>(evt: TaskEvent<T>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO task_events 
         (kind, run_id, task_id, span_id, parent_span_id, component, actor, ts, status, duration_ms, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          evt.kind,
          evt.ctx.runId,
          evt.ctx.taskId,
          evt.ctx.spanId,
          evt.ctx.parentSpanId || null,
          evt.ctx.component,
          evt.ctx.actor || null,
          evt.ts,
          evt.status || null,
          evt.durationMs || null,
          evt.details ? JSON.stringify(evt.details) : null,
        ]
      );
    } finally {
      client.release();
    }
  }

  async bulkInsert<T = any>(evts: TaskEvent<T>[]): Promise<void> {
    if (evts.length === 0) return;

    const client = await this.pool.connect();
    try {
      const values = evts
        .map(
          (evt, i) =>
            `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
        )
        .join(',');

      const params: any[] = [];
      evts.forEach(evt => {
        params.push(
          evt.kind,
          evt.ctx.runId,
          evt.ctx.taskId,
          evt.ctx.spanId,
          evt.ctx.parentSpanId || null,
          evt.ctx.component,
          evt.ctx.actor || null,
          evt.ts,
          evt.status || null,
          evt.durationMs || null,
          evt.details ? JSON.stringify(evt.details) : null
        );
      });

      await client.query(
        `INSERT INTO task_events 
         (kind, run_id, task_id, span_id, parent_span_id, component, actor, ts, status, duration_ms, details)
         VALUES ${values}`,
        params
      );
    } finally {
      client.release();
    }
  }

  async query(filter: Partial<TaskEvent>, limit: number = 1000): Promise<TaskEvent[]> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (filter.kind) {
        conditions.push(`kind = $${paramCount++}`);
        params.push(filter.kind);
      }
      if (filter.ctx?.runId) {
        conditions.push(`run_id = $${paramCount++}`);
        params.push(filter.ctx.runId);
      }
      if (filter.ctx?.taskId) {
        conditions.push(`task_id = $${paramCount++}`);
        params.push(filter.ctx.taskId);
      }
      if (filter.status) {
        conditions.push(`status = $${paramCount++}`);
        params.push(filter.status);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT * FROM task_events 
        ${whereClause}
        ORDER BY ts DESC 
        LIMIT $${paramCount}
      `;
      params.push(limit);

      const result = await client.query(query, params);
      return result.rows.map((row: any) => ({
        kind: row.kind,
        ctx: {
          runId: row.run_id,
          taskId: row.task_id,
          spanId: row.span_id,
          parentSpanId: row.parent_span_id,
          component: row.component,
          actor: row.actor,
        },
        ts: row.ts,
        status: row.status,
        durationMs: row.duration_ms,
        details: row.details,
      }));
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
