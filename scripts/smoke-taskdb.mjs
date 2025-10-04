#!/usr/bin/env node
/* eslint-env node */

import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';

const PG_URL = process.env.TASKDB_PG_URL || 'postgres://taskdb:taskdb@localhost:5432/taskdb';
const SQLITE_PATH = process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite';

async function queryPostgres() {
  const client = new PgClient({ connectionString: PG_URL });
  await client.connect();
  const { rows } = await client.query(
    `SELECT kind, status, COUNT(*)::int AS total
       FROM taskdb_events
       WHERE ts > EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000
       GROUP BY kind, status`
  );
  await client.end();
  return rows;
}

function querySqlite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY, err => {
      if (err) {
        reject(err);
        return;
      }
      db.all(
        `SELECT kind, status, COUNT(*) AS total
           FROM taskdb_events
           WHERE ts > (strftime('%s','now') * 1000) - 86400000
           GROUP BY kind, status`,
        (queryErr, rows) => {
          if (queryErr) reject(queryErr);
          else resolve(rows);
          db.close();
        }
      );
    });
  });
}

async function main() {
  console.log('🔥 TaskDB smoke test');

  const pgRows = await queryPostgres();
  const sqliteRows = await querySqlite();

  const haveRunStart = pgRows.some(row => row.kind === 'run.start');
  const haveRunFinish = pgRows.some(row => row.kind === 'run.finish');

  if (!haveRunStart || !haveRunFinish) {
    throw new Error('Run start/finish events not found in PostgreSQL');
  }

  const pgTotal = pgRows.reduce((acc, row) => acc + Number(row.total), 0);
  const sqliteTotal = sqliteRows.reduce((acc, row) => acc + Number(row.total), 0);

  const delta = Math.abs(pgTotal - sqliteTotal);
  if (delta > 0) {
    console.log(`ℹ️  Delta Postgres vs SQLite: ${delta} eventos`);
  }

  console.log('✅ TaskDB smoke test passed');
  console.table(pgRows);
}

main().catch(err => {
  console.error('❌ TaskDB smoke test failed:', err.message);
  process.exit(1);
});
