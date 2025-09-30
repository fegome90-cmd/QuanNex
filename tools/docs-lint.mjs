#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join, extname, basename } from 'node:path';

const ROOT = process.cwd();
const REPORTS_DIR = resolve(ROOT, '.reports');
const REPORT_PATH = join(REPORTS_DIR, 'docs-lint.json');

function loadLegacyMap() {
  const legacyFile = resolve(ROOT, 'legacy/paths.json');
  if (!existsSync(legacyFile)) return [];
  try {
    const data = JSON.parse(readFileSync(legacyFile, 'utf8'));
    if (Array.isArray(data)) {
      return data
        .filter((entry) => entry && typeof entry === 'object' && entry.from)
        .map((entry) => entry.from);
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data);
    }
  } catch {
    // ignore malformed legacy mappings
  }
  return [];
}

async function gatherDocs(dir) {
  const absDir = resolve(ROOT, dir);
  if (!existsSync(absDir)) return [];
  const entries = await readdir(absDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = await gatherDocs(join(dir, entry.name));
      files.push(...nested);
    } else if (extname(entry.name).toLowerCase() === '.md') {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function slugFor(file) {
  return basename(file, extname(file)).toLowerCase();
}

async function detectDuplicates() {
  const publicDocs = await gatherDocs('docs');
  const internalDocs = await gatherDocs('internal/docs');
  const slugMap = new Map();

  for (const file of publicDocs) {
    const slug = slugFor(file);
    const entry = slugMap.get(slug) || { slug, public: [], internal: [] };
    entry.public.push(file);
    slugMap.set(slug, entry);
  }

  for (const file of internalDocs) {
    const slug = slugFor(file);
    const entry = slugMap.get(slug) || { slug, public: [], internal: [] };
    entry.internal.push(file);
    slugMap.set(slug, entry);
  }

  return Array.from(slugMap.values()).filter((entry) => entry.public.length > 0 && entry.internal.length > 0);
}

async function detectLegacyReferences(legacyPaths) {
  if (legacyPaths.length === 0) return [];
  const docs = [...await gatherDocs('docs'), ...await gatherDocs('internal/docs')];
  const issues = [];
  for (const relativePath of docs) {
    const abs = resolve(ROOT, relativePath);
    const content = await readFile(abs, 'utf8');
    for (const legacy of legacyPaths) {
      if (content.includes(legacy)) {
        issues.push({ file: relativePath, legacy_reference: legacy });
      }
    }
  }
  return issues;
}

async function main() {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const duplicates = await detectDuplicates();
  const legacyPaths = loadLegacyMap();
  const legacyRefs = await detectLegacyReferences(legacyPaths);

  const report = {
    generated_at: new Date().toISOString(),
    duplicates,
    legacy_references: legacyRefs
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (duplicates.length > 0 || legacyRefs.length > 0) {
    const messages = [];
    if (duplicates.length > 0) messages.push(`${duplicates.length} duplicate slug(s)`);
    if (legacyRefs.length > 0) messages.push(`${legacyRefs.length} legacy reference(s)`);
    console.error(`docs-lint: ${messages.join(', ')}`);
    process.exit(1);
  }
}

main().catch((error) => {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
  writeFileSync(REPORT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    error: error.message
  }, null, 2));
  console.error(`docs-lint: ${error.message}`);
  process.exit(1);
});
