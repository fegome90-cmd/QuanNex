import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('AutoFix Rollback Safety', () => {
  const originalCwd = process.cwd();
  const testBranch = 'autofix/test-rollback-safety';

  beforeEach(async () => {
    // Ensure we start with a clean state
    try {
      execSync('git checkout main', { stdio: 'pipe' });
      execSync(`git branch -D ${testBranch}`, { stdio: 'pipe' });
    } catch (e) {
      // Ignore if branch doesn't exist
    }

    // Create a test file to ensure it's not touched during rollback
    fs.writeFileSync('test-untracked-file.txt', 'This should not be deleted');
  });

  afterEach(async () => {
    // Cleanup
    try {
      execSync('git checkout main', { stdio: 'pipe' });
      execSync(`git branch -D ${testBranch}`, { stdio: 'pipe' });
      execSync('git worktree prune', { stdio: 'pipe' });
    } catch (e) {
      // Ignore cleanup errors
    }

    // Remove test files
    try {
      fs.unlinkSync('test-untracked-file.txt');
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  it('should not touch main branch when autofix fails', async () => {
    // Create a test file in main branch
    const testFile = 'main-branch-test.txt';
    fs.writeFileSync(testFile, 'Original content');
    execSync('git add .', { stdio: 'pipe' });
    execSync('git commit -m "Add test file"', { stdio: 'pipe' });

    const originalCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

    // Simulate autofix failure by providing invalid action
    const autofixPayload = JSON.stringify({
      actions: [{ type: 'invalid_action', param: 'value' }],
      dryRun: false,
      branch: testBranch,
    });

    try {
      execSync(`node scripts/autofix-safe.mjs '${autofixPayload}'`, { stdio: 'pipe' });
      expect.fail('AutoFix should have failed');
    } catch (error) {
      // Expected to fail
    }

    // Verify main branch is unchanged
    const finalCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    expect(finalCommit).toBe(originalCommit);

    // Verify test file still exists and is unchanged
    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.readFileSync(testFile, 'utf8')).toBe('Original content');

    // Verify untracked file is still there
    expect(fs.existsSync('test-untracked-file.txt')).toBe(true);

    // Cleanup
    fs.unlinkSync(testFile);
    execSync('git reset --hard HEAD~1', { stdio: 'pipe' });
  });

  it('should not clean untracked files when SAFE_CLEAN=0', async () => {
    // Create untracked files
    const untrackedFile1 = 'untracked-1.txt';
    const untrackedFile2 = 'untracked-2.txt';
    fs.writeFileSync(untrackedFile1, 'Untracked content 1');
    fs.writeFileSync(untrackedFile2, 'Untracked content 2');

    // Simulate autofix failure
    const autofixPayload = JSON.stringify({
      actions: [{ type: 'invalid_action', param: 'value' }],
      dryRun: false,
      branch: testBranch,
    });

    try {
      execSync(`SAFE_CLEAN=0 node scripts/autofix-safe.mjs '${autofixPayload}'`, { stdio: 'pipe' });
      expect.fail('AutoFix should have failed');
    } catch (error) {
      // Expected to fail
    }

    // Verify untracked files are still there
    expect(fs.existsSync(untrackedFile1)).toBe(true);
    expect(fs.existsSync(untrackedFile2)).toBe(true);
    expect(fs.readFileSync(untrackedFile1, 'utf8')).toBe('Untracked content 1');
    expect(fs.readFileSync(untrackedFile2, 'utf8')).toBe('Untracked content 2');

    // Cleanup
    fs.unlinkSync(untrackedFile1);
    fs.unlinkSync(untrackedFile2);
  });

  it('should fail if main branch is not clean before autofix', async () => {
    // Create uncommitted changes
    const testFile = 'uncommitted-test.txt';
    fs.writeFileSync(testFile, 'Uncommitted content');
    execSync('git add .', { stdio: 'pipe' });
    // Don't commit - leave it staged

    const autofixPayload = JSON.stringify({
      actions: [{ type: 'add_npm_script', key: 'test:safe', value: 'echo safe test' }],
      dryRun: false,
      branch: testBranch,
    });

    try {
      execSync(`node scripts/autofix-safe.mjs '${autofixPayload}'`, { stdio: 'pipe' });
      expect.fail('AutoFix should have failed due to unclean tree');
    } catch (error: any) {
      // Expected to fail
      expect(error.message).toContain('Árbol de trabajo no está limpio');
    }

    // Cleanup
    execSync('git reset HEAD', { stdio: 'pipe' });
    fs.unlinkSync(testFile);
  });

  it('should successfully apply autofix and merge back to main', async () => {
    const autofixPayload = JSON.stringify({
      actions: [{ type: 'add_npm_script', key: 'test:safe-success', value: 'echo safe success' }],
      dryRun: false,
      branch: testBranch,
    });

    // Execute autofix
    const result = execSync(`node scripts/autofix-safe.mjs '${autofixPayload}'`, {
      encoding: 'utf8',
    });

    // Verify the script was added to package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['test:safe-success']).toBe('echo safe success');

    // Verify branch was merged
    const branches = execSync('git branch', { encoding: 'utf8' });
    expect(branches).toContain(testBranch);

    // Cleanup
    execSync(`git branch -D ${testBranch}`, { stdio: 'pipe' });
    delete packageJson.scripts['test:safe-success'];
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    execSync('git add package.json && git commit -m "Remove test script"', { stdio: 'pipe' });
  });
});
