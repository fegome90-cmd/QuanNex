import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runVulnerabilityScan } from './agent.mjs';
import fs from 'fs';

// Mock fs and globby
vi.mock('fs');
vi.mock('globby', () => ({
  globby: vi.fn(),
}));

describe('security agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna archivos escaneados y vulnerabilidades', async () => {
    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        code: ['src/**/*.js'],
        configs: ['package.json'],
      })
    );

    // Mock globby
    const { globby } = await import('globby');
    vi.mocked(globby).mockResolvedValue(['src/test.js', 'package.json']);

    const result = await runVulnerabilityScan();

    expect(result.files_scanned).toBe(2);
    expect(result.vulnerabilities_found).toBe(0);
    expect(result.status).toBe('ok');
  });

  it('retorna 0 archivos si los globs no encuentran nada', async () => {
    // Mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        code: ['nonexistent/**/*.js'],
        configs: [],
      })
    );

    // Mock globby
    const { globby } = await import('globby');
    vi.mocked(globby).mockResolvedValue([]);

    const result = await runVulnerabilityScan();

    expect(result.files_scanned).toBe(0);
    expect(result.status).toBe('empty');
  });

  it('maneja archivo de configuración faltante', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await runVulnerabilityScan();

    expect(result.error).toMatch(/scan globs not found/);
    expect(result.files_scanned).toBe(0);
    expect(result.vulnerabilities_found).toBe(0);
  });

  it('maneja configuración JSON inválida', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

    const result = await runVulnerabilityScan();

    expect(result.files_scanned).toBe(0);
    expect(result.vulnerabilities_found).toBe(0);
  });

  it('maneja configuración con estructura incorrecta', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        invalid: 'structure',
      })
    );

    // Mock globby
    const { globby } = await import('globby');
    vi.mocked(globby).mockResolvedValue([]);

    const result = await runVulnerabilityScan();

    expect(result.files_scanned).toBe(0);
    expect(result.status).toBe('empty');
  });

  it('usa variable de entorno SCAN_GLOBS_PATH', async () => {
    const originalPath = process.env.SCAN_GLOBS_PATH;
    process.env.SCAN_GLOBS_PATH = 'custom/path.json';

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        code: ['src/**/*.js'],
        configs: ['package.json'],
      })
    );

    const { globby } = await import('globby');
    vi.mocked(globby).mockResolvedValue(['src/test.js']);

    const result = await runVulnerabilityScan();

    // El agente usa la variable de entorno correctamente
    expect(result.files_scanned).toBe(1);

    // Restore
    process.env.SCAN_GLOBS_PATH = originalPath;
  });

  it('maneja error de globby', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        code: ['src/**/*.js'],
        configs: ['package.json'],
      })
    );

    const { globby } = await import('globby');
    vi.mocked(globby).mockRejectedValue(new Error('Globby error'));

    const result = await runVulnerabilityScan();

    expect(result.files_scanned).toBe(0);
    expect(result.vulnerabilities_found).toBe(0);
  });

  it('valida estructura de respuesta exitosa', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        code: ['src/**/*.js'],
        configs: ['package.json'],
      })
    );

    const { globby } = await import('globby');
    vi.mocked(globby).mockResolvedValue(['src/test.js', 'package.json']);

    const result = await runVulnerabilityScan();

    expect(result).toHaveProperty('files_scanned');
    expect(result).toHaveProperty('vulnerabilities_found');
    expect(result).toHaveProperty('status');
    expect(typeof result.files_scanned).toBe('number');
    expect(typeof result.vulnerabilities_found).toBe('number');
    expect(['ok', 'empty']).toContain(result.status);
  });
});
