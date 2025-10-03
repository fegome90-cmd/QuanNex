import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createArtifact } from '../../scripts/autofix-artifact.mjs';

describe('AutoFix Artifacts Contract', () => {
  const artifactsDir = path.join(process.cwd(), 'artifacts', 'autofix');
  
  beforeEach(() => {
    // Clean up any existing artifacts
    if (fs.existsSync(artifactsDir)) {
      fs.rmSync(artifactsDir, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(artifactsDir)) {
      fs.rmSync(artifactsDir, { recursive: true, force: true });
    }
  });

  it('should create artifact directory if it does not exist', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    expect(fs.existsSync(artifactsDir)).toBe(true);
  });

  it('should create artifact file with correct naming pattern', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { filepath } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test-branch',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    // Check file exists
    expect(fs.existsSync(filepath)).toBe(true);
    
    // Check naming pattern: timestamp-branch.json
    const filename = path.basename(filepath);
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-autofix-test-branch\.json$/);
  });

  it('should create artifact with required fields', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { artifact } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    // Check required fields
    expect(artifact).toHaveProperty('timestamp');
    expect(artifact).toHaveProperty('branch', 'autofix/test');
    expect(artifact).toHaveProperty('baseCommit', 'abc123');
    expect(artifact).toHaveProperty('finalCommit', 'def456');
    expect(artifact).toHaveProperty('actions');
    expect(artifact).toHaveProperty('riskTotal', 1);
    expect(artifact).toHaveProperty('durationMs', 1000);
    expect(artifact).toHaveProperty('durationSeconds', 1);
    expect(artifact).toHaveProperty('result');
    expect(artifact).toHaveProperty('verifyResult', null);
    expect(artifact).toHaveProperty('costAvoided');
    expect(artifact).toHaveProperty('metadata');
  });

  it('should calculate cost avoided correctly', () => {
    const mockActions = [
      { type: 'add_npm_script', key: 'test1', value: 'echo test1' },
      { type: 'add_npm_script', key: 'test2', value: 'echo test2' }
    ];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { artifact } = createArtifact({
      actions: mockActions,
      risk: 2,
      duration: 30000, // 30 seconds
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    // 2 actions * 5 minutes = 10 minutes = 600 seconds
    // Duration: 30 seconds
    // Minutes saved: 600 - 0.5 = 599.5 minutes
    expect(artifact.costAvoided.actionsCount).toBe(2);
    expect(artifact.costAvoided.avgManualFixMinutes).toBe(5);
    expect(artifact.costAvoided.durationMinutes).toBe(0.5);
    expect(artifact.costAvoided.minutesSaved).toBe(9.5);
    expect(artifact.costAvoided.estimatedCostAvoided).toBe('9.5 minutes');
  });

  it('should include metadata about system', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { artifact } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    expect(artifact.metadata).toHaveProperty('nodeVersion');
    expect(artifact.metadata).toHaveProperty('platform');
    expect(artifact.metadata).toHaveProperty('arch');
    expect(artifact.metadata).toHaveProperty('cwd');
    expect(artifact.metadata.cwd).toBe(process.cwd());
  });

  it('should handle atomic write correctly', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { filepath } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    // Verify no .tmp file exists
    expect(fs.existsSync(filepath + '.tmp')).toBe(false);
    
    // Verify final file exists and is valid JSON
    expect(fs.existsSync(filepath)).toBe(true);
    const content = fs.readFileSync(filepath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should create valid JSON artifact', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    const { filepath } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    const content = fs.readFileSync(filepath, 'utf8');
    const parsed = JSON.parse(content);
    
    // Verify it's a valid artifact structure
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('branch');
    expect(parsed).toHaveProperty('actions');
    expect(parsed).toHaveProperty('result');
    expect(parsed).toHaveProperty('costAvoided');
    expect(parsed).toHaveProperty('metadata');
  });

  it('should handle multiple artifacts in same directory', () => {
    const mockActions = [{ type: 'add_npm_script', key: 'test', value: 'echo test' }];
    const mockResult = { ok: true, dryRun: false, log: [] };
    
    // Create first artifact
    const { filepath: filepath1 } = createArtifact({
      actions: mockActions,
      risk: 1,
      duration: 1000,
      result: mockResult,
      branch: 'autofix/test1',
      baseCommit: 'abc123',
      finalCommit: 'def456'
    });
    
    // Wait a bit to ensure different timestamps
    setTimeout(() => {
      // Create second artifact
      const { filepath: filepath2 } = createArtifact({
        actions: mockActions,
        risk: 1,
        duration: 2000,
        result: mockResult,
        branch: 'autofix/test2',
        baseCommit: 'abc123',
        finalCommit: 'def456'
      });
      
      // Both files should exist
      expect(fs.existsSync(filepath1)).toBe(true);
      expect(fs.existsSync(filepath2)).toBe(true);
      
      // Files should be different
      expect(filepath1).not.toBe(filepath2);
    }, 10);
  });
});
