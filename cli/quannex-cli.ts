#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { factcheck } from '../gates/detectors/factcheck.js';
import { consistency } from '../gates/detectors/consistency.js';
import { metrics as metricsCheck } from '../gates/detectors/metrics.js';
import { structure } from '../gates/detectors/structure.js';
import { ReviewIssue, ReviewReport, AppConfig } from './types.js';

const VERSION = '0.2.0';

function readTextSafe(p: string) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch (e: any) {
    console.error(`Error reading file: ${p} — ${e.message}`);
    process.exit(2);
  }
}

function parseJSONSafe(txt: string, label: string) {
  try {
    return JSON.parse(txt);
  } catch (e: any) {
    console.error(`Error parsing JSON (${label}): ${e.message}`);
    process.exit(2);
  }
}

function parseYAMLSafe(txt: string, label: string) {
  try {
    return YAML.parse(txt);
  } catch (e: any) {
    console.error(`Error parsing YAML (${label}): ${e.message}`);
    process.exit(2);
  }
}

function loadConfig(): AppConfig {
  const fallback = {
    metrics_file: 'testdata/metrics.json',
    default_policy: 'gates/review.reports.policy.yaml',
  };
  const cfgPath = path.resolve('quannex.config.yaml');
  if (!fs.existsSync(cfgPath)) return fallback;
  const raw = readTextSafe(cfgPath);
  const cfg = parseYAMLSafe(raw, 'quannex.config.yaml');
  return { ...fallback, ...cfg };
}

function findPolicyForFile(filePath: string, config: AppConfig, explicitPolicy?: string): string {
  // Check if policy is explicitly provided via CLI or parameter
  if (explicitPolicy) return explicitPolicy;

  // Use policy mapping to find appropriate policy
  if (config.policy_mapping) {
    for (const mapping of config.policy_mapping) {
      if (mapping.paths) {
        for (const pattern of mapping.paths) {
          // Simple pattern matching for common cases
          if (
            pattern === 'docs/**/*.md' &&
            filePath.startsWith('docs/') &&
            filePath.endsWith('.md')
          ) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
          if (
            pattern === 'reports/**/*.md' &&
            filePath.startsWith('reports/') &&
            filePath.endsWith('.md')
          ) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
          if (
            pattern === 'specs/**/*.md' &&
            filePath.startsWith('specs/') &&
            filePath.endsWith('.md')
          ) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
          if (
            pattern === 'requirements/**/*.md' &&
            filePath.startsWith('requirements/') &&
            filePath.endsWith('.md')
          ) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
          if (pattern === '**/README.md' && filePath.endsWith('/README.md')) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
          if (pattern === '**/CHANGELOG.md' && filePath.endsWith('/CHANGELOG.md')) {
            console.log(`📋 Using policy: ${mapping.policy} for ${filePath}`);
            return mapping.policy;
          }
        }
      }
    }
  }

  // Fallback to default policy
  console.log(`📋 Using default policy: ${config.default_policy} for ${filePath}`);
  return config.default_policy || 'gates/review.reports.policy.yaml';
}

function loadPolicy(policyPath: string) {
  const raw = readTextSafe(policyPath);
  return parseYAMLSafe(raw, policyPath);
}

function score(issues: ReviewIssue[], thresholds: any) {
  const base = 1.0;
  let penalty = 0;
  for (const it of issues) {
    if (it.severity === 'critical') penalty += 0.3;
    else if (it.severity === 'high') penalty += 0.2;
    else if (it.severity === 'medium') penalty += 0.1;
    else penalty += 0.05;
  }
  const conf = Math.max(0, +(base - penalty).toFixed(2));
  const min = thresholds?.min_confidence ?? 0.85;
  const status = conf >= min && !issues.some(i => i.severity === 'critical') ? 'PASS' : 'FAIL';
  return { conf, status };
}

function mdReport(report: ReviewReport) {
  const lines = [
    `# QuanNex Validation Report`,
    ``,
    `**Status:** ${report.status}  |  **Confidence:** ${(report.confidence * 100).toFixed(1)}%`,
    ``,
    `## Summary`,
    report.summary ||
      (report.status === 'PASS'
        ? 'Informe apto para publicar.'
        : 'Se encontraron problemas que requieren corrección.'),
    ``,
    `## Issues (${report.issues.length})`,
    ...report.issues.map(
      i =>
        `- [${i.severity.toUpperCase()}] **${i.id}** (${i.type}) — ${i.message}${i.where ? ` _(${i.where})_` : ''}${i.evidence ? ` — evidence: ${i.evidence}` : ''}`
    ),
    ``,
    `## Next step`,
    `\`${report.next_step}\``,
    ``,
    `---`,
    `*Generated at ${report.meta.generatedAt} by QuanNex ${report.meta.version}*`,
  ];
  return lines.join('\n');
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('quannex')
    .command('check', 'Checks a report file')
    .option('input', {
      alias: 'i',
      type: 'string',
      demandOption: true,
      describe: 'Path to input .md',
    })
    .option('policy', { alias: 'p', type: 'string', describe: 'Policy YAML path (override)' })
    .option('metrics', { type: 'string', describe: 'Metrics JSON path (override)' })
    .help()
    .parse();

  const cfg = loadConfig();
  const input = path.resolve(String((argv as any).input));
  const relativeInput = path.relative(process.cwd(), input);
  const explicitPolicy = (argv as any).policy;
  const policyPath = path.resolve(findPolicyForFile(relativeInput, cfg, explicitPolicy));
  const metricsPath = path.resolve(
    String((argv as any).metrics ?? cfg.metrics_file ?? 'testdata/metrics.json')
  );

  if (!fs.existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(2);
  }
  if (!fs.existsSync(policyPath)) {
    console.error(`Policy not found: ${policyPath}`);
    process.exit(2);
  }

  const doc = readTextSafe(input);
  const policy = loadPolicy(policyPath);
  const issues: ReviewIssue[] = [];

  // flags desde policy o config
  const rules = policy?.rules ?? {};
  const thresholds = policy?.thresholds ?? cfg?.thresholds ?? {};
  const detectorCfg = { ...(cfg?.detectors ?? {}), ...(policy?.detectors ?? {}) };

  if (rules.factcheck) issues.push(...factcheck(doc, detectorCfg));
  if (rules.consistency) issues.push(...consistency(doc, detectorCfg));
  if (rules.metrics) issues.push(...metricsCheck(doc, metricsPath));
  if (rules.structure) issues.push(...structure(doc, detectorCfg));

  const { conf, status } = score(issues, thresholds);
  const report: ReviewReport = {
    status: status as 'PASS' | 'FAIL',
    confidence: conf,
    issues,
    summary: '',
    next_step: status === 'PASS' ? 'publish' : 'fix',
    meta: {
      input,
      policy: policyPath,
      generatedAt: new Date().toISOString(),
      version: VERSION,
    },
  };

  if (process.env.QUANNEX_JSON === '1') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(mdReport(report));
  }

  process.exit(status === 'PASS' ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
