import sqlite3 from 'sqlite3';
import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';

export class SQLiteTaskDB implements TaskDB {
  private db: sqlite3.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS task_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        run_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        span_id TEXT NOT NULL,
        parent_span_id TEXT,
        component TEXT NOT NULL,
        actor TEXT,
        ts INTEGER NOT NULL,
        status TEXT,
        duration_ms INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_task_events_ts ON task_events(ts);
      CREATE INDEX IF NOT EXISTS idx_task_events_run_id ON task_events(run_id);
      CREATE INDEX IF NOT EXISTS idx_task_events_kind ON task_events(kind);
    `;

    this.db.run(createTable);
  }

  async insert<T = any>(evt: TaskEvent<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO task_events 
        (kind, run_id, task_id, span_id, parent_span_id, component, actor, ts, status, duration_ms, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
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
        ],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async bulkInsert<T = any>(evts: TaskEvent<T>[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO task_events 
        (kind, run_id, task_id, span_id, parent_span_id, component, actor, ts, status, duration_ms, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let completed = 0;
      let hasError = false;

      for (const evt of evts) {
        stmt.run(
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
          ],
          err => {
            if (err && !hasError) {
              hasError = true;
              reject(err);
              return;
            }

            completed++;
            if (completed === evts.length && !hasError) {
              resolve();
            }
          }
        );
      }
    });
  }

  async query(filter: Partial<TaskEvent>, limit: number = 1000): Promise<TaskEvent[]> {
    return new Promise((resolve, reject) => {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter.kind) {
        conditions.push('kind = ?');
        params.push(filter.kind);
      }
      if (filter.ctx?.runId) {
        conditions.push('run_id = ?');
        params.push(filter.ctx.runId);
      }
      if (filter.ctx?.taskId) {
        conditions.push('task_id = ?');
        params.push(filter.ctx.taskId);
      }
      if (filter.status) {
        conditions.push('status = ?');
        params.push(filter.status);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT * FROM task_events 
        ${whereClause}
        ORDER BY ts DESC 
        LIMIT ?
      `;

      this.db.all(query, [...params, limit], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const events = rows.map(row => ({
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
            details: row.details ? JSON.parse(row.details) : undefined,
          }));
          resolve(events);
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}
