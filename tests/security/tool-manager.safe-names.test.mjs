import { describe, it, expect, beforeEach, vi } from 'vitest';

const spawnMock = vi.fn();
const spawnSyncMock = vi.fn(() => ({ status: 0 }));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
}));

const { isSafeBinaryName, safeWhich } = await import('../../tools/tool-manager.js');

describe('isSafeBinaryName', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    spawnSyncMock.mockReturnValue({ status: 0 });
  });

  it('accepts common valid binary names', () => {
    const valid = ['node', 'npm', 'pnpm', 'vite', 'eslint', 'my-tool_1.2'];
    for (const name of valid) {
      expect(isSafeBinaryName(name)).toBe(true);
    }
  });

  const ZERO_WIDTH_SPACE = '\u200b';

  it('rejects malicious or malformed names', () => {
    const invalid = [
      '../node',
      '/usr/bin/node',
      'C\\Windows\\cmd.exe',
      'node --inspect',
      'node;rm -rf /',
      '`whoami`',
      '$(id)',
      'a b',
      'a*b',
      'node.',
      '-node',
      `node${ZERO_WIDTH_SPACE}`,
    ];

    for (const name of invalid) {
      expect(isSafeBinaryName(name)).toBe(false);
    }
  });

  it('enforces maximum length', () => {
    const longName = 'a'.repeat(65);
    expect(isSafeBinaryName(longName)).toBe(false);
  });
});

describe('safeWhich', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    spawnSyncMock.mockReturnValue({ status: 0 });
  });

  it('skips execution and flags invalid names', () => {
    const result = safeWhich('node --inspect');
    expect(result).toEqual({ found: false, reason: 'invalid_name' });
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });

  it('uses command -v on POSIX systems', () => {
    const result = safeWhich('node', { platform: 'linux' });
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'command',
      ['-v', 'node'],
      expect.objectContaining({
        shell: false,
        env: expect.objectContaining({ PATH: '/usr/bin:/bin' }),
      })
    );
    expect(result).toEqual({ found: true, reason: 'ok' });
  });

  it('uses where on Windows systems', () => {
    safeWhich('npm', { platform: 'win32' });
    const fallbackRoot = process.env.SystemRoot || 'C\\Windows';
    const expectedPath = `${fallbackRoot}\\System32`;
    expect(spawnSyncMock).toHaveBeenCalledWith(
      'where',
      ['npm'],
      expect.objectContaining({
        shell: false,
        env: expect.objectContaining({ PATH: expectedPath }),
      })
    );
  });

  it('returns not_found when binary is missing', () => {
    spawnSyncMock.mockReturnValueOnce({ status: 1 });
    const result = safeWhich('nonexistent', { platform: 'linux' });
    expect(result).toEqual({ found: false, reason: 'not_found' });
  });

  it('returns timeout when execution exceeds limit', () => {
    spawnSyncMock.mockReturnValueOnce({ status: null, error: { code: 'ETIMEDOUT' } });
    const result = safeWhich('npm', { platform: 'linux' });
    expect(result).toEqual({ found: false, reason: 'timeout' });
  });
});
