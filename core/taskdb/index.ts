import { DualTaskDB } from './dual';
import { makePgTaskDB } from './pg';         // ya existente en tu v2
import { makeSqliteTaskDB } from './sqlite'; // ya existente en tu v2
import { makeJsonlTaskDB } from './jsonl';   // ya existente en tu v2

export function makeTaskDBFromEnv() {
  const drv = process.env.TASKDB_DRIVER ?? 'sqlite';
  if (drv === 'pg') return makePgTaskDB(process.env.TASKDB_PG_URL!);
  if (drv === 'sqlite') return makeSqliteTaskDB(process.env.TASKDB_SQLITE_PATH!);
  if (drv === 'jsonl') return makeJsonlTaskDB('./logs/taskdb-%Y-%m-%d.jsonl');

  if (drv === 'dual') {
    const pg = makePgTaskDB(process.env.TASKDB_PG_URL!);
    const sqlite = makeSqliteTaskDB(process.env.TASKDB_SQLITE_PATH!);
    const strict = (process.env.TASKDB_DUAL_STRICT ?? 'false') === 'true';
    const logMismatch = (process.env.TASKDB_DUAL_LOG_MISMATCH ?? 'true') === 'true';
    return new DualTaskDB(pg, sqlite, strict, logMismatch, console);
  }
  throw new Error(`Unknown TASKDB_DRIVER=${drv}`);
}

// Re-export existing adapters
export { makePgTaskDB, makeSqliteTaskDB, makeJsonlTaskDB } from './adapters';
export { DualTaskDB } from './dual';
