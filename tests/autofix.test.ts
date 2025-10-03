import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { autoFix } from '../scripts/autofix.mjs';
import type { AutofixAction } from '../types/autofix';

// Mock fs para tests
vi.mock('fs');
vi.mock('node:child_process');

describe('AutoFix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('valida política de acciones permitidas', async () => {
    const mockActions: AutofixAction[] = [
      { type: 'install_missing_dep', name: 'vitest', dev: true },
      { type: 'add_npm_script', key: 'test:new', value: 'vitest' },
    ];

    // Mock fs.readFileSync para config/fixes.json
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        allowed: ['install_missing_dep', 'add_npm_script'],
        risk_levels: { install_missing_dep: 1, add_npm_script: 1 },
        max_risk_total: 3,
      })
    );

    const result = await (autoFix as any)({ actions: mockActions, dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.risk).toBe(2);
    expect(result.log).toHaveLength(2);
  });

  it('rechaza acciones no permitidas', async () => {
    const mockActions = [{ type: 'dangerous_action', name: 'test' }];

    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        allowed: ['install_missing_dep'],
        risk_levels: { install_missing_dep: 1 },
        max_risk_total: 3,
      })
    );

    await expect((autoFix as any)({ actions: mockActions, dryRun: true })).rejects.toThrow(
      'Fix no permitido: dangerous_action'
    );
  });

  it('rechaza acciones con riesgo excesivo', async () => {
    const mockActions: AutofixAction[] = [
      { type: 'install_missing_dep', name: 'dep1' },
      { type: 'install_missing_dep', name: 'dep2' },
      { type: 'install_missing_dep', name: 'dep3' },
      { type: 'install_missing_dep', name: 'dep4' },
    ];

    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        allowed: ['install_missing_dep'],
        risk_levels: { install_missing_dep: 1 },
        max_risk_total: 3,
      })
    );

    await expect((autoFix as any)({ actions: mockActions, dryRun: true })).rejects.toThrow(
      'Riesgo 4 > max'
    );
  });

  it('ejecuta dry-run sin crear rama', async () => {
    const mockActions: AutofixAction[] = [
      { type: 'add_npm_script', key: 'test:dry', value: 'echo test' },
    ];

    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        allowed: ['add_npm_script'],
        risk_levels: { add_npm_script: 1 },
        max_risk_total: 3,
      })
    );

    const result = await (autoFix as any)({ actions: mockActions, dryRun: true });

    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.log).toHaveLength(1);
  });
});
