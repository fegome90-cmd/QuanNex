import { describe, it, expect } from 'vitest';
import { findForbiddenAPIs } from '../../scripts/policy-ast-parser.mjs';

describe('Policy Contracts - Exec Denied', () => {
  it('should detect child_process.exec in regular files', () => {
    const code = `
      import { exec } from 'child_process';
      exec('ls -la');
    `;

    const violations = findForbiddenAPIs('src/utils/helper.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('child_process.exec');
    expect(violations[0].file).toBe('src/utils/helper.js');
    expect(violations[0].severity).toBe('error');
  });

  it('should detect child_process.execSync in regular files', () => {
    const code = `
      import { execSync } from 'child_process';
      execSync('npm install');
    `;

    const violations = findForbiddenAPIs('src/build/installer.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('child_process.execSync');
    expect(violations[0].file).toBe('src/build/installer.js');
  });

  it('should detect eval() calls', () => {
    const code = `
      const result = eval('2 + 2');
    `;

    const violations = findForbiddenAPIs('src/calculator.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('eval');
    expect(violations[0].type).toBe('Identifier');
  });

  it('should detect new Function() calls', () => {
    const code = `
      const fn = new Function('return 42');
    `;

    const violations = findForbiddenAPIs('src/dynamic.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('Function');
    expect(violations[0].type).toBe('NewExpression');
  });

  it('should detect setTimeout calls', () => {
    const code = `
      setTimeout(() => console.log('hello'), 1000);
    `;

    const violations = findForbiddenAPIs('src/timer.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('setTimeout');
  });

  it('should detect setInterval calls', () => {
    const code = `
      setInterval(() => console.log('tick'), 1000);
    `;

    const violations = findForbiddenAPIs('src/interval.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('setInterval');
  });

  it('should detect fs.rmSync calls', () => {
    const code = `
      import { rmSync } from 'fs';
      rmSync('/tmp/file');
    `;

    const violations = findForbiddenAPIs('src/cleanup.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].api).toBe('fs.rmSync');
  });

  it('should detect multiple violations in same file', () => {
    const code = `
      import { exec, execSync } from 'child_process';
      exec('ls');
      execSync('pwd');
      eval('1+1');
    `;

    const violations = findForbiddenAPIs('src/multiple.js', code);

    expect(violations).toHaveLength(3);
    expect(violations.map(v => v.api)).toContain('child_process.exec');
    expect(violations.map(v => v.api)).toContain('child_process.execSync');
    expect(violations.map(v => v.api)).toContain('eval');
  });

  it('should provide accurate line and column information', () => {
    const code = `
      import { exec } from 'child_process';
      
      function test() {
        exec('ls -la');
      }
    `;

    const violations = findForbiddenAPIs('src/test.js', code);

    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBeGreaterThan(0);
    expect(violations[0].column).toBeGreaterThan(0);
  });
});
