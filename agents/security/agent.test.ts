import { describe, it, expect } from 'vitest';
import { runVulnerabilityScan } from './agent.mjs';

describe('security agent', () => {
  it('encuentra archivos para escanear', async () => {
    const r: any = await runVulnerabilityScan();

    // Debería encontrar archivos
    expect(r.files_scanned).toBeGreaterThan(0);
    expect(r.status).toBe('ok');
  });

  it('no retorna 0 archivos escaneados', async () => {
    const r: any = await runVulnerabilityScan();

    // No debería retornar 0 archivos
    expect(r.files_scanned).not.toBe(0);
  });

  it('incluye detalles del scan', async () => {
    const r: any = await runVulnerabilityScan();

    expect(r.scan_details).toBeDefined();
    expect(r.scan_details.code_files).toBeGreaterThan(0);
    expect(r.scan_details.config_files).toBeGreaterThan(0);
  });

  it('maneja archivos de configuración faltantes', async () => {
    // Simular archivo faltante
    const originalPath = process.env.SCAN_GLOBS_PATH;
    process.env.SCAN_GLOBS_PATH = 'config/nonexistent.json';

    const r: any = await runVulnerabilityScan();

    // Debería retornar error en lugar de crashear
    expect(r.error).toBeDefined();
    expect(r.files_scanned).toBe(0);

    // Restaurar path original
    process.env.SCAN_GLOBS_PATH = originalPath;
  });
});
