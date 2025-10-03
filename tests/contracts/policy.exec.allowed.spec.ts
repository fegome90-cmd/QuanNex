import { describe, it, expect } from 'vitest';
import { findForbiddenAPIs } from '../../scripts/policy-ast-parser.mjs';

describe('Policy Contracts - Exec Allowed', () => {
  it('should allow child_process.exec in scripts/autofix.mjs', () => {
    const code = `
      import { exec } from 'child_process';
      exec('npm install');
    `;

    const violations = findForbiddenAPIs('scripts/autofix.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.exec in scripts/e2e-autofix-simple.mjs', () => {
    const code = `
      import { exec } from 'child_process';
      exec('npm run test');
    `;

    const violations = findForbiddenAPIs('scripts/e2e-autofix-simple.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.exec in src/workflow/run.mjs', () => {
    const code = `
      import { exec } from 'child_process';
      exec('npm run verify');
    `;

    const violations = findForbiddenAPIs('src/workflow/run.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.exec in scripts/policy-check.mjs', () => {
    const code = `
      import { exec } from 'child_process';
      exec('git status');
    `;

    const violations = findForbiddenAPIs('scripts/policy-check.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.execSync in scripts/autofix.mjs', () => {
    const code = `
      import { execSync } from 'child_process';
      execSync('git add -A');
    `;

    const violations = findForbiddenAPIs('scripts/autofix.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.execSync in scripts/e2e-autofix-simple.mjs', () => {
    const code = `
      import { execSync } from 'child_process';
      execSync('npm run test');
    `;

    const violations = findForbiddenAPIs('scripts/e2e-autofix-simple.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow child_process.execSync in scripts/anti-tamper.mjs', () => {
    const code = `
      import { execSync } from 'child_process';
      execSync('git status --porcelain');
    `;

    const violations = findForbiddenAPIs('scripts/anti-tamper.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should deny child_process.exec in non-whitelisted files', () => {
    const code = `
      import { exec } from 'child_process';
      exec('ls');
    `;

    const violations = findForbiddenAPIs('src/utils/helper.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('child_process.exec');
  });

  it('should deny child_process.execSync in non-whitelisted files', () => {
    const code = `
      import { execSync } from 'child_process';
      execSync('pwd');
    `;

    const violations = findForbiddenAPIs('src/build/installer.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('child_process.execSync');
  });

  it('should handle wildcard patterns in allowed paths', () => {
    const code = `
      import { exec } from 'child_process';
      exec('npm run test');
    `;

    // Test that e2e-*.mjs pattern works
    const violations = findForbiddenAPIs('scripts/e2e-test-runner.mjs', code);

    expect(violations).toHaveLength(0);
  });

  it('should allow mixed allowed and forbidden APIs in whitelisted files', () => {
    const code = `
      import { exec } from 'child_process';
      exec('npm install'); // This should be allowed
      eval('1+1'); // This should still be forbidden
    `;

    const violations = findForbiddenAPIs('scripts/autofix.mjs', code);

    // Should only detect eval, not exec
    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('eval');
  });
});
