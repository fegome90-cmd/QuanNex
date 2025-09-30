#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, extname, dirname, join } from 'node:path';

const ROOT = process.cwd();
const REPORTS_DIR = resolve(ROOT, '.reports');
const REPORT_PATH = join(REPORTS_DIR, 'path-lint.json');
const MAX_ENTRIES = 50;

const WATCH_EXTS = new Set(['.md', '.yaml', '.yml', '.json', '.js', '.ts', '.sh']);
const WATCH_BASENAMES = new Set(['Makefile']);
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.reports', 'tmp', 'coverage']);
const SCAN_DIRECTORIES = ['docs', 'orchestration', 'agents', 'scripts', 'tools', '.github', 'templates', 'plans', 'payloads'];
const ROOT_FILES = ['README.md', 'Makefile'];
const PREFIX_ALLOWLIST = ['docs/', 'agents/', 'scripts/', 'orchestration/', 'templates/', 'tools/', '.github/', 'plans/', 'payloads/', 'legacy/'];

const ALLOWED_SUFFIXES = new Set([
  '.md', '.mdx', '.yaml', '.yml', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.sh', '.txt'
]);

const PATH_REGEX = /(?:["'`\s\(=]|^)(\.\.\/[^\s"'`]+|\.\/[^\s"'`]+|[A-Za-z0-9_\-\.]+\/[A-Za-z0-9_\-\.\/]*[A-Za-z0-9_\-\.])/g;
const EXCLUDE_PREFIXES = ['http://', 'https://', 'git@', 'ssh://'];
const EXCLUDE_PATTERNS = ['${', '{{', '}}', '<', '>', '|', '*', '?'];

function loadLegacyMap() {
  const legacyFile = resolve(ROOT, 'legacy/paths.json');
  if (!existsSync(legacyFile)) return new Map();
  try {
    const data = JSON.parse(readFileSync(legacyFile, 'utf8'));
    const map = new Map();
    if (Array.isArray(data)) {
      for (const entry of data.slice(0, MAX_ENTRIES)) {
        if (entry && typeof entry === 'object' && entry.from && entry.to) {
          map.set(entry.from, entry.to);
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [from, to] of Object.entries(data)) {
        map.set(from, to);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

const LEGACY_MAP = loadLegacyMap();

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (shouldInspect(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldInspect(fileName) {
  if (WATCH_BASENAMES.has(fileName)) return true;
  const ext = extname(fileName);
  return WATCH_EXTS.has(ext);
}

function hasAllowedSuffix(candidate) {
  const base = candidate.split('#')[0];
  const ext = extname(base);
  if (ext) {
    return ALLOWED_SUFFIXES.has(ext);
  }
  const leaf = base.split('/').pop();
  return WATCH_BASENAMES.has(leaf || '');
}

function stripTraversal(path) {
  let value = path;
  while (value.startsWith('../')) {
    value = value.slice(3);
  }
  if (value.startsWith('./')) {
    value = value.slice(2);
  }
  return value;
}

function isInteresting(candidate) {
  const normalized = stripTraversal(candidate);
  return PREFIX_ALLOWLIST.some((prefix) => normalized.startsWith(prefix));
}

function normaliseCandidate(rawToken) {
  let token = rawToken.trim();
  if (!token) return null;
  token = token.replace(/^['"`\(]+/, '');
  token = token.replace(/[\),;:'"`]+$/, '');
  if (!token) return null;
  for (const prefix of EXCLUDE_PREFIXES) {
    if (token.startsWith(prefix)) return null;
  }
  for (const fragment of EXCLUDE_PATTERNS) {
    if (token.includes(fragment)) return null;
  }
  if (token.startsWith('#')) return null;
  if (token.startsWith('/')) return null;
  return token;
}

function resolveCandidate(candidate, sourceFile) {
  if (candidate.startsWith('./') || candidate.startsWith('../')) {
    const resolved = resolve(dirname(sourceFile), candidate);
    if (existsSync(resolved)) return resolved;
    const fallback = stripTraversal(candidate);
    return resolve(ROOT, fallback);
  }
  return resolve(ROOT, candidate);
}

async function scanFile(filePath) {
  const issues = [];
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(PATH_REGEX);
    if (!matches) continue;
    for (const raw of matches) {
      const candidate = normaliseCandidate(raw);
      if (!candidate) continue;
      const normalized = candidate.split('#')[0];
      if (!normalized.includes('/')) continue;
      if (!isInteresting(normalized)) continue;
      if (!hasAllowedSuffix(normalized)) continue;
      if (LEGACY_MAP.has(normalized)) continue;
      const target = resolveCandidate(normalized, filePath);
      if (!existsSync(target)) {
        issues.push({
          file: relativePath(filePath),
          line: i + 1,
          reference: normalized,
          reason: 'missing'
        });
      }
    }
  }
  return issues;
}

function relativePath(absPath) {
  return absPath.startsWith(ROOT) ? absPath.slice(ROOT.length + 1) : absPath;
}

async function gatherFiles() {
  const files = [];
  for (const dir of SCAN_DIRECTORIES) {
    const abs = resolve(ROOT, dir);
    if (!existsSync(abs)) continue;
    const statsFiles = await walk(abs);
    files.push(...statsFiles);
  }
  for (const fileName of ROOT_FILES) {
    const abs = resolve(ROOT, fileName);
    if (existsSync(abs) && shouldInspect(fileName)) {
      files.push(abs);
    }
  }
  return files;
}

async function main() {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const files = await gatherFiles();
  const issues = [];
  for (const file of files) {
    const rel = relativePath(file);
    if (rel.startsWith('.reports/') || rel.startsWith('tmp/')) continue;
    const fileIssues = await scanFile(file);
    issues.push(...fileIssues);
  }

  const report = {
    generated_at: new Date().toISOString(),
    total_files: files.length,
    issues
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (issues.length > 0) {
    console.error(`path-lint: ${issues.length} unresolved reference(s)`);
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
  console.error(`path-lint: ${error.message}`);
  process.exit(1);
});
