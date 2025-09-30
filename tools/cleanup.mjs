#!/usr/bin/env node
/* eslint-env node */

import { existsSync, rmSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const TARGETS = ['tmp', '.reports', 'coverage/tmp'];
const root = process.cwd();
let removed = 0;

for (const target of TARGETS) {
  const abs = resolve(root, target);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    removed += 1;
    process.stdout.write(`Removed ${target}\n`);
  }
}

const entries = await readdir(root);
for (const entry of entries) {
  if (entry.endsWith('.log')) {
    rmSync(resolve(root, entry), { force: true });
    removed += 1;
    process.stdout.write(`Removed ${entry}\n`);
  }
}

if (removed === 0) {
  process.stdout.write('Nothing to clean.\n');
}
