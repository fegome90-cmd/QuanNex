#!/usr/bin/env node
import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const AGENT_VERSION = '1.0.0';
const MAX_POLICY_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_POLICIES = 50;
const ROOT = process.cwd();
const ALLOWED_TONES = ['neutral', 'formal', 'friendly', 'assertive'];
const COMPLIANCE_ADVICE = {
  none: 'Review policies at your discretion.',
  basic: 'Ensure primary policies are acknowledged.',
  strict: 'All policies must be enforced with audits.'
};

const ensureWithinRoot = (absPath, stats) => {
  const normalized = absPath.startsWith(ROOT) ?
    absPath :
    resolve(ROOT, absPath);
  if (!normalized.startsWith(ROOT + sep) && normalized !== ROOT) {
    throw new Error(`Path escapes workspace: ${absPath}`);
  }
  if (stats && stats.isSymbolicLink()) {
    const real = realpathSync(absPath);
    if (!real.startsWith(ROOT + sep) && real !== ROOT) {
      throw new Error(`Symlink escapes workspace: ${absPath}`);
    }
  }
};

try {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  if (!Array.isArray(input.policy_refs) || input.policy_refs.length === 0) {
    throw new Error('policy_refs array required');
  }
  if (input.policy_refs.length > MAX_POLICIES) {
    throw new Error(`policy_refs list exceeds ${MAX_POLICIES} entries`);
  }

  const tone =
    typeof input.tone === 'string' && ALLOWED_TONES.includes(input.tone) ?
      input.tone :
      'neutral';
  const domain =
    typeof input.domain === 'string' && input.domain.trim() !== '' ?
      input.domain :
      'general';
  const compliance =
    typeof input.compliance_level === 'string' &&
    ['none', 'basic', 'strict'].includes(input.compliance_level) ?
      input.compliance_level :
      'basic';

  const compiled = [];
  const violations = [];

  for (const ref of input.policy_refs) {
    if (typeof ref !== 'string' || ref.trim() === '') {
      throw new Error('policy_refs must contain non-empty strings');
    }
    if (ref.includes('..')) {
      throw new Error(`parent directory traversal not allowed: ${ref}`);
    }
    const absPath = resolve(ROOT, ref);
    if (!absPath.startsWith(ROOT + sep) && absPath !== ROOT) {
      throw new Error(`Path escapes workspace: ${ref}`);
    }
    if (!existsSync(absPath)) {
      violations.push(`missing:${ref}`);
      continue;
    }
    const stat = lstatSync(absPath);
    ensureWithinRoot(absPath, stat);
    if (stat.isDirectory()) {
      throw new Error(`Directories are not supported: ${ref}`);
    }
    if (stat.size > MAX_POLICY_SIZE) {
      throw new Error(`Policy exceeds 2MB limit: ${ref}`);
    }
    const content = readFileSync(absPath, 'utf8').trim();
    if (content.length === 0) {
      violations.push(`empty:${ref}`);
      continue;
    }
    const firstLines = content.split(/\r?\n/).slice(0, 5).join(' ');
    compiled.push(`[${ref}] ${firstLines}`);
  }

  if (compiled.length === 0) {
    violations.push('no_valid_policies');
  }

  const advice = [
    `tone:${tone}`,
    `domain:${domain}`,
    COMPLIANCE_ADVICE[compliance] || COMPLIANCE_ADVICE.basic
  ];

  const output = {
    schema_version: SCHEMA_VERSION,
    agent_version: AGENT_VERSION,
    rules_compiled: compiled,
    violations,
    advice,
    trace: ['rules.server:ok']
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`rules.server:error:${error.message}\n`);
  process.exit(1);
}
