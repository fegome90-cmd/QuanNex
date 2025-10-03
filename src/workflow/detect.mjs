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
  const scores = { react: 0, express: 0, fastapi: 0, mixed: 0 };

  // React detection
  if (hasDep(pkg, 'react')) scores.react += 0.6;
  if (any(['src/**/*.tsx'], cwd)) scores.react += 0.3;
  if (any(['next.config.*', 'vite.config.*'], cwd)) scores.react += 0.2;
  if (any(['src/**/*.jsx'], cwd)) scores.react += 0.1;
  if (any(['public/index.html'], cwd)) scores.react += 0.1;

  // Express detection
  if (hasDep(pkg, 'express')) scores.express += 0.6;
  if (any(['src/**/server.*', 'src/**/*.mjs'], cwd)) scores.express += 0.3;
  if (any(['src/**/app.*', 'src/**/index.*'], cwd)) scores.express += 0.1;

  // FastAPI detection
  if (any(['pyproject.toml'], cwd)) scores.fastapi += 0.6;
  if (any(['app/main.py'], cwd)) scores.fastapi += 0.3;
  if (any(['requirements.txt'], cwd)) scores.fastapi += 0.1;
  if (any(['app/**/*.py'], cwd)) scores.fastapi += 0.1;

  // Mixed detection (React + Express)
  if (hasDep(pkg, 'react') && hasDep(pkg, 'express')) scores.mixed += 0.8;
  if (any(['src/**/*.tsx'], cwd) && any(['src/**/server.*'], cwd)) scores.mixed += 0.4;

  const weighted = Object.entries(scores).map(([k, v]) => [k, v * (cfg.weights?.[k] ?? 1)]);
  weighted.sort((a, b) => b[1] - a[1]);

  // Log decision if there's a tie
  const [top, score] = weighted[0] ?? ['fallback', 0];
  const [second, secondScore] = weighted[1] ?? ['none', 0];

  if (Math.abs(score - secondScore) < 0.1 && score > 0) {
    console.log(
      `[PROFILE-DETECT] Empate detectado: ${top}(${score.toFixed(2)}) vs ${second}(${secondScore.toFixed(2)})`
    );
    console.log(`[PROFILE-DETECT] Ganador por peso: ${top} (peso: ${cfg.weights?.[top] ?? 1})`);
  }

  return score >= (cfg.threshold ?? 0.5) ? { profile: top, score } : { profile: 'fallback', score };
}
