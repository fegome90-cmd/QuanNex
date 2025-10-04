#!/usr/bin/env node
import fs from "fs"; 
import path from "path"; 
import yaml from "yaml";
import { Client } from "pg";
import crypto from "crypto";

const args = new Set(process.argv.slice(2));
const DRY = !args.has("--force");                 // 🔒 por defecto
const THRESHOLD = Number(process.env.RAG_PURGE_THRESHOLD ?? 20); // %
const RUN_ID = crypto.randomBytes(6).toString("hex");
const ACTOR = process.env.CI_JOB_NAME || process.env.USER || "unknown";
const REASON = "not_in_source";

const cfg = yaml.parse(fs.readFileSync("config/rag.yaml","utf-8"));
const SRC_DIR = cfg.source?.glob?.split("/**/")[0] || "docs";

function listFiles(dir) {
  const acc=[]; 
  (function walk(d){ 
    for (const f of fs.readdirSync(d)){
      const p = path.join(d,f); 
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p); 
      else if (p.endsWith(".md")) acc.push(p);
    }
  })(dir); 
  return new Set(acc);
}

(async ()=>{
  // sanity checks
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ SRC_DIR no existe: ${SRC_DIR}. Abortando.`);
    process.exit(2);
  }

  const present = listFiles(SRC_DIR);
  const pg = new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5433),
    user: process.env.PGUSER || "rag",
    password: process.env.PGPASSWORD || "ragpass",
    database: process.env.PGDATABASE || "ragdb"
  });
  await pg.connect();

  const { rows: krows } = await pg.query("SELECT DISTINCT uri FROM rag_chunks WHERE deleted_at IS NULL");
  const known = krows.map(r=>r.uri);
  const toPurge = known.filter(u=>!present.has(u));
  const pct = known.length ? Math.round(100 * (toPurge.length/known.length)) : 0;

  console.log(`🧹 Reindex (run=${RUN_ID}) known=${known.length} missing=${toPurge.length} (${pct}%) DRY=${DRY}`);

  // hard safety
  if (pct > THRESHOLD) {
    console.error(`❌ Umbral excedido: ${pct}% > ${THRESHOLD}% — abortando.`);
    process.exit(3);
  }

  // registrar auditoría
  await pg.query(
    "INSERT INTO rag_purge_audit(run_id, actor, reason, uris, dry_run, affected_count, threshold) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [RUN_ID, ACTOR, REASON, JSON.stringify(toPurge), DRY, toPurge.length, THRESHOLD]
  );

  if (toPurge.length && !DRY) {
    // soft delete con transacción
    await pg.query("BEGIN");
    await pg.query("SET LOCAL statement_timeout = '30s'");
    await pg.query("UPDATE rag_chunks SET deleted_at = now() WHERE deleted_at IS NULL AND uri = ANY($1)", [toPurge]);
    await pg.query("COMMIT");
    console.log(`✅ Soft-deleted ${toPurge.length} URIs.`);
  } else if (toPurge.length && DRY) {
    console.log(`(dry-run) URIs a purgar:\n- ${toPurge.join("\n- ")}`);
  } else {
    console.log("Nada que purgar.");
  }

  await pg.end();
})();
