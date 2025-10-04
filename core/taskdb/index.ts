import { DualTaskDB } from './dual.ts';
import { makeJsonlTaskDB } from './jsonl.ts';
import type { TaskDB } from './adapter.ts';
import { makePgTaskDB } from './pg.ts';
import { TaskDBQueue } from './queue.ts';
import { makeSqliteTaskDB } from './sqlite.ts';
import { setCurrentTaskDB } from './state.ts';

let cached: TaskDB | null = null;

function createBaseDriver(): TaskDB {
  const driver = (process.env.TASKDB_DRIVER ?? 'sqlite').toLowerCase();

  switch (driver) {
    case 'pg':
      return makePgTaskDB(process.env.TASKDB_PG_URL);
    case 'jsonl':
      return makeJsonlTaskDB(process.env.TASKDB_JSONL_PATH || './logs/taskdb-%Y-%m-%d.jsonl');
    case 'dual': {
      const primary = makePgTaskDB(process.env.TASKDB_PG_URL);
      const secondary = makeSqliteTaskDB(process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite');
      const strict = (process.env.TASKDB_DUAL_STRICT ?? 'false').toLowerCase() === 'true';
      const logMismatch = (process.env.TASKDB_DUAL_LOG_MISMATCH ?? 'true').toLowerCase() === 'true';
      return new DualTaskDB(primary, secondary, strict, logMismatch);
    }
    case 'sqlite':
    default:
      return makeSqliteTaskDB(process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite');
  }
}

export function makeTaskDBFromEnv(): TaskDB {
  if (cached) return cached;
  const base = createBaseDriver();
  const queueEnabled = (process.env.TASKDB_QUEUE ?? 'on').toLowerCase() !== 'off';
  cached = queueEnabled ? new TaskDBQueue(base) : base;
  setCurrentTaskDB(cached);
  return cached;
}

export function resetTaskDBCache(): void {
  cached = null;
}

export { makePgTaskDB } from './pg.ts';
export { makeSqliteTaskDB } from './sqlite.ts';
export { makeJsonlTaskDB } from './jsonl.ts';
export { DualTaskDB } from './dual.ts';
export { TaskDBQueue } from './queue.ts';
