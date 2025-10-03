#!/usr/bin/env node

/**
 * QuanNex AutoFix - Safe version with worktree isolation
 * Prevents destructive rollback by using temporary worktrees
 */

import fs from 'fs';
import cp from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
import { recordAutofixSuccess, recordAutofixFailure } from '../src/metrics/autofix-metrics.mjs';
import { createArtifact, generateCommitLabels } from './autofix-artifact.mjs';

const exec = promisify(cp.exec);
const policy = JSON.parse(fs.readFileSync('config/fixes.json', 'utf8'));

// V2 Handlers (behind AUTOFIX_V2 flag)
const AUTOFIX_V2 = process.env.AUTOFIX_V2 === '1';
let installTypes, updateScript, createTestBoiler;
if (AUTOFIX_V2) {
  ({ installTypes } = await import('./handlers/install_types.mjs'));
  ({ updateScript } = await import('./handlers/update_script.mjs'));
  ({ createTestBoiler } = await import('./handlers/create_test_boiler.mjs'));
}

// Safe clean flag - defaults to false (never clean untracked files)
const SAFE_CLEAN = process.env.SAFE_CLEAN === '1';

function risk(actions) {
  return actions.reduce((s, a) => s + (policy.risk_levels[a.type] ?? 2), 0);
}

function assertPolicy(actions) {
  for (const a of actions) {
    if (!policy.allowed.includes(a.type)) {
      throw new Error(`Fix no permitido: ${a.type}`);
    }
  }
  const total = risk(actions);
  if (total > policy.max_risk_total) {
    throw new Error(`Riesgo ${total} > max`);
  }
}

async function run(cmd) {
  const { stdout, stderr } = await exec(cmd);
  return { stdout, stderr };
}

async function checkCleanTree() {
  const { stdout } = await run('git status --porcelain');
  if (stdout.trim()) {
    throw new Error(
      `Árbol de trabajo no está limpio. Commit o stash los cambios primero:\n${stdout}`
    );
  }
}

async function createWorktree(branchName) {
  const worktreePath = path.join(process.cwd(), '.worktrees', branchName);

  // Clean up any existing worktree
  try {
    await run(`git worktree remove ${worktreePath} --force`);
  } catch (e) {
    // Ignore if worktree doesn't exist
  }

  // Create new worktree
  await run(`git worktree add ${worktreePath} -b ${branchName}`);

  return worktreePath;
}

async function removeWorktree(worktreePath) {
  try {
    await run(`git worktree remove ${worktreePath} --force`);
  } catch (e) {
    console.warn(`[AUTOFIX-SAFE] Warning: Could not remove worktree ${worktreePath}: ${e.message}`);
  }
}

const handlers = {
  async install_missing_dep({ name, dev = false }) {
    return run(`npm i ${dev ? '-D ' : ''}${name}`);
  },
  async fix_import_path({ file, from, to }) {
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(new RegExp(from, 'g'), to));
    return { stdout: `patched ${file}` };
  },
  async add_npm_script({ key, value }) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts ??= {};
    if (!pkg.scripts[key]) {
      pkg.scripts[key] = value;
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    }
    return { stdout: `script ${key} added` };
  },
  async apply_lint_fix() {
    return run(`npm run lint:fix`);
  },
  async format_fix() {
    return run(`npm run format:fix`);
  },
  async create_config_file({ path: filePath, content }) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return { stdout: `created ${filePath}` };
  },

  // V2 Handlers (behind AUTOFIX_V2 flag)
  ...(AUTOFIX_V2
    ? {
        async install_types({ packageName, dev = true }) {
          return installTypes({ packageName, dev });
        },
        async update_script({ scriptName, newValue, reason }) {
          return updateScript({ scriptName, newValue, reason });
        },
        async create_test_boiler({ filePath, testFramework = 'vitest' }) {
          return createTestBoiler({ filePath, testFramework });
        },
      }
    : {}),
};

export async function autoFixSafe({ actions = [], dryRun = true, branch = 'autofix/quannex' }) {
  assertPolicy(actions);
  const log = [];
  const startTime = Date.now();
  let worktreePath = null;
  let baseCommit = null;

  try {
    if (!dryRun) {
      // Pre-check: ensure clean tree
      await checkCleanTree();

      // Get base commit
      baseCommit = (await run('git rev-parse HEAD')).stdout.trim();

      // Create isolated worktree
      worktreePath = await createWorktree(branch);
      console.log(`[AUTOFIX-SAFE] Created worktree: ${worktreePath}`);

      // Change to worktree directory
      process.chdir(worktreePath);
    }

    // Execute actions
    for (const a of actions) {
      const fn = handlers[a.type];
      if (!fn) {
        throw new Error(`Handler faltante: ${a.type}`);
      }

      log.push({ action: a, res: await fn(a) });
    }

    if (!dryRun) {
      // Commit changes in worktree
      await run(`git add -A`);

      // Generate labels and improved commit message
      const labels = generateCommitLabels(actions, risk(actions));
      const commitMessage = `autofix: ${actions.map(x => x.type).join(', ')} [${labels.join(', ')}]`;

      await run(`git commit -m "${commitMessage}"`);

      // Get final commit
      const finalCommit = (await run('git rev-parse HEAD')).stdout.trim();
      const duration = Date.now() - startTime;

      // Create artifact
      createArtifact({
        actions,
        risk: risk(actions),
        duration,
        result: { ok: true, dryRun, log },
        branch,
        baseCommit,
        finalCommit,
      });

      // Merge worktree back to main branch
      const mainDir = process
        .cwd()
        .replace(worktreePath, '')
        .replace('/.worktrees/' + branch, '');
      process.chdir(mainDir);
      await run(
        `git merge ${branch} --no-ff -m "Merge autofix: ${actions.map(x => x.type).join(', ')}"`
      );

      console.log(`[AUTOFIX-SAFE] Successfully merged ${branch} to main`);
    }

    // Record success metrics
    if (!dryRun) {
      for (const action of actions) {
        recordAutofixSuccess(action.type, policy.risk_levels[action.type] || 0);
      }
    }

    const duration = Date.now() - startTime;
    const secs = duration / 1000;

    // Log JSON de éxito + duración
    console.log(JSON.stringify({ autofix_success: true, duration_s: secs }, null, 2));

    return { ok: true, dryRun, risk: risk(actions), log, duration };
  } catch (error) {
    // Safe cleanup: just remove worktree, main branch is untouched
    if (!dryRun && worktreePath) {
      try {
        const mainDir = process
          .cwd()
          .replace(worktreePath, '')
          .replace('/.worktrees/' + branch, '');
        process.chdir(mainDir);
        await removeWorktree(worktreePath);
        console.log(`[AUTOFIX-SAFE] Cleaned up worktree: ${worktreePath}`);
      } catch (cleanupError) {
        console.error(`[AUTOFIX-SAFE] Error cleaning up worktree: ${cleanupError.message}`);
      }
    }

    // Record failure metrics
    for (const action of actions) {
      recordAutofixFailure(action.type, error.message);
    }
    throw error;
  }
}

if (process.argv[2]) {
  autoFixSafe(JSON.parse(process.argv[2]))
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
