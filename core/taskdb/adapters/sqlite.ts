import sqlite3 from 'sqlite3';
import { TaskEvent, TaskContext } from '../types.js';

export class SQLiteAdapter {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private init() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS task_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        kind TEXT NOT NULL,
        context TEXT NOT NULL,
        payload TEXT NOT NULL
      )
    `;

    this.db.run(createTable);
  }

  async insert(event: TaskEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO task_events (id, timestamp, kind, context, payload)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        [
          event.id,
          event.timestamp,
          event.kind,
          JSON.stringify(event.context),
          JSON.stringify(event.payload),
        ],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async query(kind?: string, context?: TaskContext): Promise<TaskEvent[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM task_events WHERE 1=1';
      const params: any[] = [];

      if (kind) {
        sql += ' AND kind = ?';
        params.push(kind);
      }

      if (context) {
        sql += ' AND context LIKE ?';
        params.push(`%"${context.taskId}"%`);
      }

      sql += ' ORDER BY timestamp DESC';

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const events = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            kind: row.kind,
            context: JSON.parse(row.context),
            payload: JSON.parse(row.payload),
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
