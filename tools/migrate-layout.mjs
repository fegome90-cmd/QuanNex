#!/usr/bin/env node
import process from 'node:process';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node tools/migrate-layout.mjs [--dry-run]');
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
if (!dryRun) {
  console.log('migrate-layout: no-op (physical migration handled externally)');
} else {
  console.log('migrate-layout: dry-run completed (no changes applied)');
}

process.exit(0);
