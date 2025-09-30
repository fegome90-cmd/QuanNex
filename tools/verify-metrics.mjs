#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const baselinePath = path.join(root, "out/baselines/agents-metrics.baseline.json");
const reportPath   = path.join(root, "out/reports/agents-metrics.latest.json");

// Gates (puedes parametrizar por env)
const SLAS = {
  context:   { p95_max: 0.82 * 1.2, success_min: 1.0 },     // +20%
  prompting: { p95_max: 0.74 * 1.2, success_min: 1.0 },
  rules:     { p95_max: 0.20 * 1.2, success_min: 1.0 }
};
const ISOLATION = { leaks: 0, temp_after_run: 0 };
const TESTS     = { min_pass: 11, max_fail: 0 };

function readJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }
function ok(msg)   { console.log(`✅ ${msg}`); }

const latest = readJSON(reportPath);
// Opcional: valida contra schemas/agents/metrics.schema.json con AJV si ya lo tienes
ok("Formato de métricas OK");

for (const agent of ["context","prompting","rules"]) {
  const a = latest.agents[agent];
  if (a.p95_s > SLAS[agent].p95_max) fail(`${agent}: p95 ${a.p95_s}s > ${SLAS[agent].p95_max}s`);
  if (a.success_rate < SLAS[agent].success_min) fail(`${agent}: success ${a.success_rate} < ${SLAS[agent].success_min}`);
  ok(`${agent}: p95=${a.p95_s}s, success=${a.success_rate}`);
}

if (latest.isolation.leaks !== ISOLATION.leaks) fail(`isolation.leaks=${latest.isolation.leaks} (esperado ${ISOLATION.leaks})`);
if (latest.isolation.temp_after_run !== ISOLATION.temp_after_run) fail(`isolation.temp_after_run=${latest.isolation.temp_after_run} (esperado ${ISOLATION.temp_after_run})`);
ok("Aislamiento OK (0 leaks, 0 residuos)");

if (latest.tests.passed < TESTS.min_pass) fail(`tests.passed=${latest.tests.passed} < ${TESTS.min_pass}`);
if (latest.tests.failed > TESTS.max_fail) fail(`tests.failed=${latest.tests.failed} > ${TESTS.max_fail}`);
ok(`Tests OK (passed=${latest.tests.passed})`);

ok("Gates de métricas satisfechos");
