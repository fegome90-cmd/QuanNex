import fs from 'fs';
import cp from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
import { recordAutofixSuccess, recordAutofixFailure } from '../src/metrics/autofix-metrics.mjs';

const exec = promisify(cp.exec);
const policy = JSON.parse(fs.readFileSync('config/fixes.json', 'utf8'));

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
};

export async function autoFix({ actions = [], dryRun = true, branch = 'autofix/quannex' }) {
  assertPolicy(actions);
  const log = [];
  const startTime = Date.now();

  try {
    if (!dryRun) {
      await run(`git checkout -b ${branch}`);
    }
    for (const a of actions) {
      const fn = handlers[a.type];
      if (!fn) {
        throw new Error(`Handler faltante: ${a.type}`);
      }
      log.push({ action: a, res: await fn(a) });
    }
    if (!dryRun) {
      await run(`git add -A`);
      await run(`git commit -m "autofix: ${actions.map(x => x.type).join(', ')}"`);
    }

    // Record success metrics
    if (!dryRun) {
      for (const action of actions) {
        recordAutofixSuccess(action.type, policy.risk_levels[action.type] || 0);
      }
    }

    return { ok: true, dryRun, risk: risk(actions), log, duration: Date.now() - startTime };
  } catch (error) {
    // Record failure metrics
    for (const action of actions) {
      recordAutofixFailure(action.type, error.message);
    }
    throw error;
  }
}

if (process.argv[2]) {
  autoFix(JSON.parse(process.argv[2]))
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
