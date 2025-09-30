#!/usr/bin/env node
import { readFileSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const AGENT_VERSION = '1.0.0';
const MAX_SOURCE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_SOURCES = 50;
const MIN_TOKENS = 256;
const DEFAULT_MAX_TOKENS = 512;
const ROOT = process.cwd();

const toWords = (value) => (value.trim() === '' ? [] : value.trim().split(/\s+/));

const ensureWithinRoot = (absPath, stats) => {
  const normalized = absPath.startsWith(ROOT) ? absPath : resolve(ROOT, absPath);
  if (!normalized.startsWith(ROOT + sep) && normalized !== ROOT) {
    throw new Error(`Path escapes workspace: ${absPath}`);
  }
  if (stats && stats.isSymbolicLink()) {
    const real = realpathSync(absPath);
    if (!real.startsWith(ROOT + sep) && real !== ROOT) {
      throw new Error(`Symlink escapes workspace: ${absPath}`);
    }
  }
  return normalized;
};

try {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  if (!Array.isArray(input.sources) || input.sources.length === 0) {
    throw new Error('sources array required');
  }
  if (input.sources.length > MAX_SOURCES) {
    throw new Error(`sources list exceeds ${MAX_SOURCES} entries`);
  }

  const selectors = Array.isArray(input.selectors) ? input.selectors : [];
  const selectorsLower = selectors.map((item) => item.toLowerCase());

  let effectiveMax = typeof input.max_tokens === 'number' ? input.max_tokens : DEFAULT_MAX_TOKENS;
  let adjusted = false;
  const trace = [];
  if (effectiveMax < MIN_TOKENS) {
    effectiveMax = MIN_TOKENS;
    adjusted = true;
    trace.push('context.server:adjusted_max_tokens');
  }

  const chunks = [];
  const provenance = [];
  let matchedCount = 0;

  for (const source of input.sources) {
    if (typeof source !== 'string' || source.trim() === '') {
      throw new Error('sources must contain non-empty strings');
    }
    if (source.includes('..')) {
      throw new Error(`parent directory traversal not allowed: ${source}`);
    }

    const absPath = resolve(ROOT, source);

    if (!absPath.startsWith(ROOT + sep) && absPath !== ROOT) {
      throw new Error(`Path escapes workspace: ${source}`);
    }

    if (!existsSync(absPath)) {
      provenance.push(`missing:${source}`);
      continue;
    }

    const stat = lstatSync(absPath);
    ensureWithinRoot(absPath, stat);

    if (stat.isDirectory()) {
      throw new Error(`Directories are not supported: ${source}`);
    }
    if (stat.size > MAX_SOURCE_SIZE) {
      throw new Error(`File exceeds 2MB limit: ${source}`);
    }

    const content = readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const matchedLines = selectorsLower.length
      ? lines.filter((line) =>
          selectorsLower.some((sel) => line.toLowerCase().includes(sel))
        )
      : lines;

    matchedCount += matchedLines.length;

    if (matchedLines.length === 0) {
      provenance.push(`empty:${source}`);
      continue;
    }

    provenance.push(`loaded:${source}`);
    chunks.push(`# Source: ${source}\n${matchedLines.join('\n')}`);
  }

  let bundle = chunks.join('\n\n');
  let truncated = false;

  const words = toWords(bundle);
  let tokensEstimated = Math.round(words.length * 1.2);
  if (Number.isNaN(tokensEstimated)) {
    tokensEstimated = 0;
  }

  if (tokensEstimated > effectiveMax) {
    truncated = true;
    tokensEstimated = effectiveMax;
  }

  if (words.length > 0 && tokensEstimated < MIN_TOKENS) {
    tokensEstimated = MIN_TOKENS;
  }

  if (words.length > effectiveMax) {
    bundle = words.slice(0, effectiveMax).join(' ');
  }

  const output = {
    schema_version: SCHEMA_VERSION,
    agent_version: AGENT_VERSION,
    context_bundle: bundle,
    provenance,
    stats: {
      tokens_estimated: tokensEstimated,
      chunks: chunks.length,
      matched: matchedCount,
      truncated,
      adjusted
    },
    trace: ['context.server:ok', ...trace]
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`context.server:error:${error.message}\n`);
  process.exit(1);
}
