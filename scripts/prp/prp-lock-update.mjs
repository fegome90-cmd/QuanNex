#!/usr/bin/env node
import fs from "fs"; 
import yaml from "yaml";
import { Client } from "pg";

const lockPath = "prp/PRP.lock.yml";
const lock = yaml.parse(fs.readFileSync(lockPath, "utf-8"));

const cfgPg = { 
  host: process.env.PGHOST || "localhost", 
  port: Number(process.env.PGPORT || 5433), 
  user: process.env.PGUSER || "rag", 
  password: process.env.PGPASSWORD || "ragpass", 
  database: process.env.PGDATABASE || "ragdb" 
};

const batchFetch = async (pg, pins) => {
  const uris = pins.map(p=>p.uri);
  const idxs = pins.map(p=>p.idx);
  const { rows } = await pg.query(`
    WITH t AS (
      SELECT unnest($1::text[]) AS uri, unnest($2::int[]) AS chunk_idx
    )
    SELECT t.uri, t.chunk_idx, c.hash
    FROM t LEFT JOIN rag_chunks c
      ON c.uri=t.uri AND c.chunk_idx=t.chunk_idx AND c.deleted_at IS NULL
  `,[uris, idxs]);
  const map = new Map(rows.map(r=>[`${r.uri}#${r.chunk_idx}`, r.hash]));
  return pins.map(p=> ({ ...p, new_hash: map.get(`${p.uri}#${p.idx}`)||null }));
};

(async ()=>{
  const pg = new Client(cfgPg); 
  await pg.connect();
  const pins = lock.evidence?.chunks_pinned ?? [];
  const enriched = await batchFetch(pg, pins);
  let changed = 0;

  for (const p of enriched) {
    if (p.policy === "strict") {
      // no tocar automáticamente: sólo reportar diff
      p.diff = (p.hash !== p.new_hash) ? "mismatch" : "ok";
    } else {
      // relaxed / ttl: actualiza hash para trazabilidad sin romper PRP
      if (p.new_hash && p.hash !== p.new_hash) {
        p.hash = p.new_hash; 
        changed++;
      }
    }
    delete p.new_hash;
  }
  lock.evidence.chunks_pinned = enriched;

  fs.writeFileSync(lockPath, yaml.stringify(lock));
  await pg.end();

  console.log(`PRP.lock actualizado. Cambios relajados/ttl: ${changed}`);
  if (enriched.some(p=>p.diff==="mismatch")) {
    console.warn("Atención: hay pines STRICT con mismatch. Revisión humana requerida.");
    process.exitCode = 3;
  }
})();
