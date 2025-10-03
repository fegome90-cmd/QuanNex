import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import yaml from 'yaml';

const cfg = yaml.parse(fs.readFileSync('config/profiles.yaml', 'utf8'));

function loadPkg(cwd = process.cwd()) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
}

function hasDep(pkg, name) {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

function any(patterns, cwd = process.cwd()) {
  return patterns.some(p => glob.sync(p, { cwd, nodir: true }).length > 0);
}

export function detectProfile(cwd = process.cwd()) {
  const pkg = loadPkg(cwd);
  const scores = { react: 0, express: 0, fastapi: 0 };

  // React detection
  if (hasDep(pkg, 'react')) scores.react += 0.6;
  if (any(['src/**/*.tsx'], cwd)) scores.react += 0.3;
  if (any(['next.config.*', 'vite.config.*'], cwd)) scores.react += 0.2;

  // Express detection
  if (hasDep(pkg, 'express')) scores.express += 0.6;
  if (any(['src/**/server.*', 'src/**/*.mjs'], cwd)) scores.express += 0.3;

  // FastAPI detection
  if (any(['pyproject.toml'], cwd)) scores.fastapi += 0.6;
  if (any(['app/main.py'], cwd)) scores.fastapi += 0.3;

  const weighted = Object.entries(scores).map(([k, v]) => [k, v * (cfg.weights?.[k] ?? 1)]);
  weighted.sort((a, b) => b[1] - a[1]);
  const [top, score] = weighted[0] ?? ['fallback', 0];

  return score >= (cfg.threshold ?? 0.5) ? { profile: top, score } : { profile: 'fallback', score };
}
