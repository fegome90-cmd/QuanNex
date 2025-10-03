#!/usr/bin/env node

import { execSync } from 'child_process';

const base = process.env.BASE_TAG || 'v0.2.0';

try {
  const diff = execSync(`git diff --stat ${base} HEAD core/taskdb/`, { encoding: 'utf8' });
  const m = diff.match(/(\d+) insertions.*?(\d+) deletions/);

  if (m) {
    const total = parseInt(m[1], 10) + parseInt(m[2], 10);
    if (total > 200) {
      console.warn(`⚠️ TaskDB churn since ${base}: ${total} LOC (budget may be exceeded).`);
      process.exit(1);
    } else {
      console.log(`✅ TaskDB churn since ${base}: ${total} LOC (within budget).`);
    }
  } else {
    console.log(`✅ No TaskDB changes since ${base}.`);
  }
} catch (error) {
  if (error.message.includes('unknown revision')) {
    console.log(`ℹ️ No base tag ${base} found, skipping budget check.`);
  } else {
    console.error('Error checking TaskDB budget:', error.message);
    process.exit(1);
  }
}
