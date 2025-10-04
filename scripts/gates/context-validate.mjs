#!/usr/bin/env node
import fs from "fs"; 
import yaml from "yaml"; 
import { Client } from "pg";

const lock = yaml.parse(fs.readFileSync("prp/PRP.lock.yml","utf-8"));
const PINS = (lock.evidence?.chunks_pinned ?? []).slice(0, Number(process.env.MAX_PINS || 200));

const cfgPg = {
  host: process.env.PGREAD_HOST || "localhost",
  port: Number(process.env.PGREAD_PORT || 5433),
  user: process.env.PGREAD_USER || "rag_read",
  password: process.env.PGREAD_PASSWORD || "rag_read_only",
  database: process.env.PGREAD_DB || "ragdb",
  ssl: process.env.PGREAD_SSL === "true" ? { rejectUnauthorized: false } : undefined
};

(async ()=>{
  const pg = new Client(cfgPg);
  await pg.connect();
  await pg.query("SET statement_timeout = '15s'");

  const uris = PINS.map(p=>p.uri);
  const idxs = PINS.map(p=>p.idx);

  const { rows } = await pg.query(`
    WITH t AS (
      SELECT unnest($1::text[]) AS uri, unnest($2::int[]) AS chunk_idx
    )
    SELECT t.uri, t.chunk_idx, c.hash
    FROM t LEFT JOIN rag_chunks c
      ON c.uri=t.uri AND c.chunk_idx=t.chunk_idx AND c.deleted_at IS NULL
  `,[uris, idxs]);

  const map = new Map(rows.map(r=>[`${r.uri}#${r.chunk_idx}`, r.hash]));
  const drift = [];

  for (const p of PINS) {
    const h = map.get(`${p.uri}#${p.idx}`) || null;
    if (p.policy === "strict") {
      if (!h) drift.push({ id:p.id, reason:"missing" });
      else if (h !== p.hash) drift.push({ id:p.id, reason:"hash_mismatch" });
    } else {
      // relaxed/ttl: sólo warn si falta
      if (!h) drift.push({ id:p.id, reason:"missing_relaxed" });
    }
  }

  await pg.end();

  if (drift.length) {
    console.error("❌ Context drift:", JSON.stringify(drift,null,2));
    process.exit(2);
  }
  console.log("✅ Contexto validado contra réplica/snapshot.");
})();
