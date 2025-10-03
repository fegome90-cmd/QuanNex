import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';

// Mock execSync
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('Diff Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pasa cuando todos los cambios están en zonas permitidas', () => {
    const mockDiff = 'src/file1.ts\nconfig/settings.json\npackage.json\n';
    vi.mocked(execSync).mockReturnValue(mockDiff);

    // No debería lanzar error
    expect(() => {
      require('../scripts/diff-gate.mjs');
    }).not.toThrow();
  });

  it('falla cuando hay cambios fuera de zonas permitidas', () => {
    const mockDiff = 'src/file1.ts\nforbidden/file.txt\npackage.json\n';
    vi.mocked(execSync).mockReturnValue(mockDiff);

    // Mock process.exit para evitar que termine el proceso
    const originalExit = process.exit;
    const mockExit = vi.fn();
    process.exit = mockExit;

    try {
      require('../scripts/diff-gate.mjs');
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = originalExit;
    }
  });

  it('maneja diff vacío correctamente', () => {
    const mockDiff = '';
    vi.mocked(execSync).mockReturnValue(mockDiff);

    expect(() => {
      require('../scripts/diff-gate.mjs');
    }).not.toThrow();
  });

  it('maneja diff con solo espacios en blanco', () => {
    const mockDiff = '\n  \n\t\n';
    vi.mocked(execSync).mockReturnValue(mockDiff);

    expect(() => {
      require('../scripts/diff-gate.mjs');
    }).not.toThrow();
  });
});
